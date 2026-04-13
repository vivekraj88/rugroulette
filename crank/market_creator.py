"""Market creator crank — scans tokens, AI scores them, creates on-chain markets."""

import struct
from pathlib import Path

from solders.pubkey import Pubkey
from solders.system_program import ID as SYSTEM_PROGRAM_ID
from solders.instruction import AccountMeta
from solana.rpc.async_api import AsyncClient

from config import PROGRAM_ID, RPC_URL, WALLET_PATH
from scanner import fetch_new_tokens, filter_eligible
from ai_scorer import score_token
from solana_utils import (
    load_keypair,
    derive_factory_pda,
    derive_market_pda,
    send_and_confirm_tx,
    atomic_json_write,
    atomic_json_read,
)

CREATE_MARKET_DISC = bytes([103, 226, 97, 235, 200, 188, 251, 254])

TRACKING_FILE = Path(__file__).parent / "created_markets.json"


def encode_create_market_data(
    token_mint: Pubkey, token_name: str, ai_score: int
) -> bytes:
    """Borsh-serialize the create_market instruction arguments."""
    name_bytes = token_name.encode("utf-8")[:32]
    buf = bytearray(CREATE_MARKET_DISC)
    buf += bytes(token_mint)
    buf += struct.pack("<I", len(name_bytes))
    buf += name_bytes
    buf += struct.pack("<B", ai_score)
    return bytes(buf)


def load_tracking() -> dict:
    """Load tracked markets from disk. Returns {mint_str: {price, name, ...}}."""
    return atomic_json_read(TRACKING_FILE, default={})


def save_tracking(tracking: dict):
    """Persist tracked markets to disk atomically."""
    atomic_json_write(TRACKING_FILE, tracking)


async def create_markets():
    """Main crank cycle: scan for new tokens, score them, create on-chain markets."""
    if not PROGRAM_ID:
        print("[creator] PROGRAM_ID not configured, skipping")
        return

    program_id = Pubkey.from_string(PROGRAM_ID)
    authority = load_keypair(WALLET_PATH)
    client = AsyncClient(RPC_URL)
    tracking = load_tracking()

    try:
        print("[creator] scanning for new tokens...")
        raw_tokens = await fetch_new_tokens()
        eligible = filter_eligible(raw_tokens)
        print(f"[creator] {len(eligible)} eligible tokens found")

        factory_pda, _ = derive_factory_pda(program_id)

        for token in eligible:
            mint_str = token["mint"]
            if mint_str in tracking:
                print(f"[creator] skip {token['symbol']} — market exists")
                continue

            ai_score = await score_token(token)
            print(f"[creator] {token['name']} ({token['symbol']}) → score {ai_score}/100")

            try:
                token_mint = Pubkey.from_string(mint_str)
                market_pda, _ = derive_market_pda(token_mint, program_id)
                ix_data = encode_create_market_data(
                    token_mint, token["name"][:32], ai_score
                )

                accounts = [
                    AccountMeta(factory_pda, is_signer=False, is_writable=True),
                    AccountMeta(market_pda, is_signer=False, is_writable=True),
                    AccountMeta(authority.pubkey(), is_signer=True, is_writable=True),
                    AccountMeta(SYSTEM_PROGRAM_ID, is_signer=False, is_writable=False),
                ]

                sig = await send_and_confirm_tx(
                    client, program_id, accounts, ix_data, authority
                )
                print(f"[creator] market created + confirmed: {sig}")

                tracking[mint_str] = {
                    "name": token["name"],
                    "symbol": token["symbol"],
                    "price": token.get("price", 0),
                    "liquidity": token.get("liquidity", 0),
                    "ai_score": ai_score,
                }
                save_tracking(tracking)

            except Exception as exc:
                print(f"[creator] tx failed for {token['symbol']}: {exc}")

    finally:
        await client.close()

    print(f"[creator] cycle complete — {len(tracking)} total markets tracked")
