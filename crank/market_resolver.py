"""Market resolver crank — checks expired markets and resolves them on-chain."""

import struct
import time
from pathlib import Path

from solders.pubkey import Pubkey
from solders.system_program import ID as SYSTEM_PROGRAM_ID
from solders.instruction import AccountMeta
from solana.rpc.async_api import AsyncClient
from solana.rpc.commitment import Confirmed

from config import PROGRAM_ID, RPC_URL, WALLET_PATH
from resolver import check_resolution
from solana_utils import (
    load_keypair,
    derive_factory_pda,
    send_and_confirm_tx,
    atomic_json_read,
)

RESOLVE_MARKET_DISC = bytes([155, 23, 80, 173, 46, 74, 23, 239])

MARKET_ACCOUNT_DISC = bytes([117, 150, 97, 152, 119, 58, 51, 58])

TRACKING_FILE = Path(__file__).parent / "created_markets.json"


def parse_market_account(data: bytes) -> dict | None:
    """Parse a PredictionMarket account from raw on-chain bytes.

    Walks the Anchor-serialised layout field by field. Discriminator
    is checked first, then bounds are validated before every field
    read so a truncated or corrupt account returns ``None`` instead of
    raising ``IndexError``.

    Args:
        data: Raw account data including the 8-byte Anchor discriminator.

    Returns:
        Dict with keys ``token_mint``, ``token_name``, ``created_at``,
        ``resolve_at``, ``total_rug_pool``, ``total_legit_pool``,
        ``total_bettors``, ``ai_score``, ``status`` — or ``None`` if
        the bytes don't match the PredictionMarket layout.
    """
    if len(data) < 8 or data[:8] != MARKET_ACCOUNT_DISC:
        return None

    off = 8
    if off + 32 > len(data):
        return None
    token_mint = Pubkey.from_bytes(data[off : off + 32])
    off += 32

    if off + 4 > len(data):
        return None
    name_len = struct.unpack_from("<I", data, off)[0]
    off += 4

    if name_len > 32 or off + name_len > len(data):
        return None
    token_name = data[off : off + name_len].decode("utf-8", errors="replace")
    off += name_len

    remaining_fixed = 8 + 8 + 8 + 8 + 4 + 1 + 1  # created+resolve+rug+legit+bettors+ai+status
    if off + remaining_fixed > len(data):
        return None

    created_at = struct.unpack_from("<q", data, off)[0]
    off += 8
    resolve_at = struct.unpack_from("<q", data, off)[0]
    off += 8
    total_rug_pool = struct.unpack_from("<Q", data, off)[0]
    off += 8
    total_legit_pool = struct.unpack_from("<Q", data, off)[0]
    off += 8
    total_bettors = struct.unpack_from("<I", data, off)[0]
    off += 4
    ai_score = data[off]
    off += 1
    status = data[off]

    return {
        "token_mint": token_mint,
        "token_name": token_name,
        "created_at": created_at,
        "resolve_at": resolve_at,
        "total_rug_pool": total_rug_pool,
        "total_legit_pool": total_legit_pool,
        "total_bettors": total_bettors,
        "ai_score": ai_score,
        "status": status,
    }


def parse_factory_treasury(data: bytes) -> Pubkey:
    """Extract the treasury pubkey from a MarketFactory account.

    Layout after 8-byte discriminator:
      authority      32 bytes (offset  8)
      total_markets   8 bytes (offset 40)
      market_fee_bps  2 bytes (offset 48)
      min_bet         8 bytes (offset 50)
      treasury       32 bytes (offset 58)
    """
    return Pubkey.from_bytes(data[58:90])


def encode_resolve_data(
    result: bool, resolution: dict, resolver_pk: Pubkey
) -> bytes:
    """Borsh-serialize the resolve_market instruction arguments."""
    buf = bytearray(RESOLVE_MARKET_DISC)
    buf += struct.pack("<B", 1 if result else 0)
    buf += struct.pack("<Q", resolution["final_price"])
    buf += struct.pack("<Q", resolution["initial_price"])
    buf += struct.pack("<B", resolution["liquidity_removed_pct"])
    buf += struct.pack("<B", 1 if resolution["dev_sold"] else 0)
    buf += bytes(resolver_pk)
    return bytes(buf)


def get_initial_data(token_mint_str: str) -> tuple[float, float]:
    """Look up initial price and liquidity from the tracking file."""
    tracking = atomic_json_read(TRACKING_FILE, default={})
    entry = tracking.get(token_mint_str, {})
    return entry.get("price", 0.001), entry.get("liquidity", 0)


async def fetch_open_markets(
    client: AsyncClient, program_id: Pubkey
) -> list[tuple[Pubkey, dict]]:
    """Fetch all PredictionMarket accounts and return those with status=Open."""
    resp = await client.get_program_accounts(program_id, commitment=Confirmed)

    markets = []
    for acct in resp.value:
        parsed = parse_market_account(bytes(acct.account.data))
        if parsed and parsed["status"] == 0:
            markets.append((acct.pubkey, parsed))

    return markets


async def resolve_markets():
    """Main resolver cycle: fetch open markets, check expiry, resolve on-chain."""
    if not PROGRAM_ID:
        print("[resolver] PROGRAM_ID not configured, skipping")
        return

    program_id = Pubkey.from_string(PROGRAM_ID)
    authority = load_keypair(WALLET_PATH)
    client = AsyncClient(RPC_URL)

    try:
        factory_pda, _ = derive_factory_pda(program_id)

        factory_info = await client.get_account_info(factory_pda, commitment=Confirmed)
        if not factory_info.value:
            print("[resolver] factory not found on-chain, skipping")
            return

        treasury = parse_factory_treasury(bytes(factory_info.value.data))
        now = int(time.time())
        print(f"[resolver] checking open markets (ts={now})...")

        open_markets = await fetch_open_markets(client, program_id)
        print(f"[resolver] {len(open_markets)} open market(s)")

        resolved_count = 0
        for market_pk, market in open_markets:
            if now < market["resolve_at"]:
                remaining_h = (market["resolve_at"] - now) / 3600
                print(f"[resolver] {market['token_name']} — {remaining_h:.1f}h left")
                continue

            print(f"[resolver] resolving {market['token_name']}...")

            try:
                mint_str = str(market["token_mint"])
                initial_price, initial_liq = get_initial_data(mint_str)

                resolution = await check_resolution(mint_str, initial_price, initial_liq)
                is_rug = resolution["result"]

                ix_data = encode_resolve_data(is_rug, resolution, authority.pubkey())

                accounts = [
                    AccountMeta(factory_pda, is_signer=False, is_writable=False),
                    AccountMeta(market_pk, is_signer=False, is_writable=True),
                    AccountMeta(treasury, is_signer=False, is_writable=True),
                    AccountMeta(authority.pubkey(), is_signer=True, is_writable=False),
                    AccountMeta(SYSTEM_PROGRAM_ID, is_signer=False, is_writable=False),
                ]

                sig = await send_and_confirm_tx(
                    client, program_id, accounts, ix_data, authority
                )

                verdict = "RUG" if is_rug else "LEGIT"
                print(f"[resolver] {market['token_name']} → {verdict}: {sig}")
                resolved_count += 1

            except Exception as exc:
                print(f"[resolver] failed {market['token_name']}: {exc}")

    finally:
        await client.close()

    print(f"[resolver] cycle complete — resolved {resolved_count} market(s)")
