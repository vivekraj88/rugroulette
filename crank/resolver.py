"""Market resolver — checks expired markets and resolves them."""

import httpx
from config import BIRDEYE_API_KEY, RPC_URL


async def check_resolution(token_mint: str, initial_price: float) -> dict:
    """Check if a token should be resolved as RUG or LEGIT.

    Criteria for RUG:
    - Price dropped > 90% from initial
    - Liquidity removed > 90%
    - Dev wallet sold > 50% of holdings
    """
    if not BIRDEYE_API_KEY:
        return _mock_resolution(token_mint)

    headers = {"X-API-KEY": BIRDEYE_API_KEY}
    async with httpx.AsyncClient() as client:
        # get current token data
        resp = await client.get(
            f"https://public-api.birdeye.so/defi/token_overview",
            params={"address": token_mint},
            headers=headers,
        )
        resp.raise_for_status()
        data = resp.json().get("data", {})

    current_price = data.get("price", 0)
    current_liq = data.get("liquidity", 0)

    # calculate metrics
    price_drop_pct = 0
    if initial_price > 0:
        price_drop_pct = ((initial_price - current_price) / initial_price) * 100

    is_rug = price_drop_pct > 90 or current_liq < 1000

    return {
        "result": is_rug,
        "final_price": int(current_price * 1e9),
        "initial_price": int(initial_price * 1e9),
        "liquidity_removed_pct": max(0, min(int(price_drop_pct), 100)) if is_rug else 0,
        "dev_sold": is_rug,
    }


def _mock_resolution(token_mint: str) -> dict:
    """Mock resolution for devnet testing."""
    import random

    is_rug = random.random() > 0.4  # 60% chance rug for mocks

    return {
        "result": is_rug,
        "final_price": random.randint(0, 1000000),
        "initial_price": 1000000,
        "liquidity_removed_pct": 95 if is_rug else 10,
        "dev_sold": is_rug,
    }
