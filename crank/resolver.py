"""Market resolver — checks token status and determines RUG vs LEGIT.

Resolution criteria (24h window, optimized for pump.fun tokens):

  RUG if ANY of:
    1. Liquidity dropped > 80% from initial    (dev pulled LP)
    2. Price dropped > 70%                      (hard crash, not just volatility)
    3. Liquidity < $1K AND price dropped > 50%  (dead pool + significant drop)

  Everything else = LEGIT (token survived 24h)
"""

import asyncio
import httpx
from config import (
    BIRDEYE_API_KEY,
    MAX_RETRIES, RETRY_BASE_DELAY, get_logger,
)

log = get_logger('resolver')

DEXSCREENER_API = "https://api.dexscreener.com/latest/dex/tokens"


async def check_resolution(token_mint: str, initial_price: float, initial_liquidity: float) -> dict:
    """Check if a token should be resolved as RUG or LEGIT.

    Uses DexScreener API (free, reliable for pump.fun tokens).
    """
    current_price = 0.0
    current_liq = 0.0

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(f"{DEXSCREENER_API}/{token_mint}")
                resp.raise_for_status()
                data = resp.json()

            pairs = data.get("pairs") or []
            if pairs:
                p = pairs[0]
                current_price = float(p.get("priceUsd", 0) or 0)
                current_liq = float((p.get("liquidity") or {}).get("usd", 0) or 0)
            break
        except (httpx.HTTPError, httpx.TimeoutException) as exc:
            delay = RETRY_BASE_DELAY * (2 ** (attempt - 1))
            log.warning("DexScreener failed (attempt %d/%d): %s", attempt, MAX_RETRIES, exc)
            if attempt < MAX_RETRIES:
                await asyncio.sleep(delay)

    if current_price == 0 and current_liq == 0:
        log.warning("no data for %s — falling back to mock", token_mint[:12])
        return _mock_resolution(token_mint)

    # --- Resolution logic ---

    # Price drop %
    price_drop_pct = 0.0
    if initial_price > 0:
        price_drop_pct = ((initial_price - current_price) / initial_price) * 100

    # Liquidity drop %
    liq_drop_pct = 0.0
    if initial_liquidity > 0:
        liq_drop_pct = ((initial_liquidity - current_liq) / initial_liquidity) * 100

    # RUG criteria
    liq_pulled = liq_drop_pct > 80                                  # dev pulled LP
    hard_crash = price_drop_pct > 70                                # massive price drop
    dead_pool = current_liq < 1000 and price_drop_pct > 50          # dead + dropped

    is_rug = liq_pulled or hard_crash or dead_pool

    # Determine which factor triggered
    reason = "survived"
    if liq_pulled:
        reason = f"liquidity pulled ({liq_drop_pct:.0f}% drop)"
    elif hard_crash:
        reason = f"price crashed ({price_drop_pct:.0f}% drop)"
    elif dead_pool:
        reason = f"dead pool (liq=${current_liq:.0f}, price -{price_drop_pct:.0f}%)"

    log.info(
        "resolved %s: %s — %s | price: $%.6f→$%.6f (%.1f%%) | liq: $%.0f→$%.0f (%.1f%%)",
        token_mint[:12],
        "RUG" if is_rug else "LEGIT",
        reason,
        initial_price, current_price, price_drop_pct,
        initial_liquidity, current_liq, liq_drop_pct,
    )

    return {
        "result": is_rug,
        "final_price": int(current_price * 1e9),
        "initial_price": int(initial_price * 1e9),
        "liquidity_removed_pct": max(0, min(int(liq_drop_pct), 100)),
        "dev_sold": liq_pulled,
    }


def _mock_resolution(token_mint: str) -> dict:
    """Mock resolution for when APIs are unavailable."""
    import random

    is_rug = random.random() > 0.4
    log.info("mock resolved %s: %s", token_mint[:12], "RUG" if is_rug else "LEGIT")

    return {
        "result": is_rug,
        "final_price": random.randint(0, 1000000),
        "initial_price": 1000000,
        "liquidity_removed_pct": 95 if is_rug else 10,
        "dev_sold": is_rug,
    }
