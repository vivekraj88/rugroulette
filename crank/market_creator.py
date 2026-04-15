"""Market creator crank — scans tokens, AI scores them, creates on-chain markets.

Tokens are added randomly throughout the day:
- Daily target: random 1-5 markets
- Each 5-minute cycle: random chance to trigger (based on remaining budget and time of day)
- When triggered: creates 1-2 markets from trending/new tokens
"""

import struct
import random
import hashlib
from datetime import date, datetime
from pathlib import Path

from solders.pubkey import Pubkey
from solders.system_program import ID as SYSTEM_PROGRAM_ID
from solders.instruction import AccountMeta
from solana.rpc.async_api import AsyncClient

from config import PROGRAM_ID, RPC_URL, WALLET_PATH, get_logger
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

log = get_logger('creator')

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
    return atomic_json_read(TRACKING_FILE, default={})


def save_tracking(tracking: dict):
    atomic_json_write(TRACKING_FILE, tracking)


def _count_created_today(tracking: dict) -> int:
    today = date.today().isoformat()
    return sum(
        1 for v in tracking.values()
        if isinstance(v, dict) and v.get("created_date") == today
    )


def _daily_target() -> int:
    """Deterministic random daily target (1-5) based on date.
    Same seed per day so it's consistent across crank restarts."""
    seed = hashlib.md5(date.today().isoformat().encode()).hexdigest()
    return (int(seed[:8], 16) % 5) + 1


def _should_create_now(created_today: int, daily_target: int) -> int:
    """Decide if we should create markets this cycle, and how many.

    Logic: spread creation randomly across the day.
    - Each 5-min cycle = 1/288 of the day
    - Remaining budget = daily_target - created_today
    - Higher chance later in the day if behind schedule
    - Returns 0 (skip) or 1-2 (create this many)
    """
    remaining = daily_target - created_today
    if remaining <= 0:
        return 0

    hour = datetime.now().hour
    # more activity during 8:00-22:00, less at night
    if hour < 8 or hour >= 23:
        return 0

    # active hours: 8-22 = 14 hours = 168 five-minute cycles
    cycles_left = max(1, (22 - hour) * 12)
    # probability per cycle = remaining / cycles_left, with some randomness
    prob = remaining / cycles_left
    # boost probability slightly so we don't always create at the last moment
    prob = min(prob * 1.5, 0.8)

    if random.random() > prob:
        log.info("skip this cycle (prob=%.1f%%, %d/%d done, target=%d)",
                 prob * 100, created_today, daily_target, daily_target)
        return 0

    # create 1 or 2 (never more than remaining)
    batch = random.randint(1, min(2, remaining))
    return batch


async def create_markets():
    """Main crank cycle: maybe create markets based on random schedule."""
    if not PROGRAM_ID:
        log.warning("PROGRAM_ID not configured, skipping")
        return

    tracking = load_tracking()
    created_today = _count_created_today(tracking)
    daily_target = _daily_target()

    batch_size = _should_create_now(created_today, daily_target)
    if batch_size == 0:
        return

    log.info("creating %d market(s) this cycle (today: %d/%d)",
             batch_size, created_today, daily_target)

    program_id = Pubkey.from_string(PROGRAM_ID)
    authority = load_keypair(WALLET_PATH)
    client = AsyncClient(RPC_URL)

    try:
        raw_tokens = await fetch_new_tokens()
        eligible = filter_eligible(raw_tokens)
        new_tokens = [t for t in eligible if t["mint"] not in tracking]

        if not new_tokens:
            log.info("no new tokens available")
            return

        # check on-chain which PDAs are free
        factory_pda, _ = derive_factory_pda(program_id)
        available = []
        for token in new_tokens:
            token_mint = Pubkey.from_string(token["mint"])
            market_pda, _ = derive_market_pda(token_mint, program_id)
            existing = await client.get_account_info(market_pda)
            if existing.value is None:
                available.append(token)
            else:
                tracking[token["mint"]] = {"name": token["name"], "skipped": True}

        if not available:
            log.info("no available PDAs")
            save_tracking(tracking)
            return

        random.shuffle(available)
        batch = available[:batch_size]
        created_count = 0

        for token in batch:
            mint_str = token["mint"]
            ai_score = await score_token(token)
            log.info("%s (%s) — AI score %d/100", token["name"], token["symbol"], ai_score)

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
                log.info("market created: %s — tx: %s", token["name"], sig[:20])

                tracking[mint_str] = {
                    "name": token["name"],
                    "symbol": token["symbol"],
                    "price": token.get("price", 0),
                    "liquidity": token.get("liquidity", 0),
                    "mcap": token.get("mcap", 0),
                    "ai_score": ai_score,
                    "created_date": date.today().isoformat(),
                }
                save_tracking(tracking)
                created_count += 1

            except Exception as exc:
                log.error("tx failed for %s: %s", token["symbol"], str(exc)[:120])

        log.info("cycle done — created %d (today total: %d/%d)",
                 created_count, created_today + created_count, daily_target)

    finally:
        await client.close()
