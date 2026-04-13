"""Token scanner — finds new tokens with liquidity > $5K for market creation."""

import httpx
from config import BIRDEYE_API_KEY, MIN_LIQUIDITY_USD, MAX_MARKETS_PER_DAY


async def fetch_new_tokens(limit: int = 50) -> list[dict]:
    """Fetch recently created tokens from Birdeye API."""
    if not BIRDEYE_API_KEY:
        print("BIRDEYE_API_KEY not set, using mock data")
        return _mock_tokens()

    headers = {"X-API-KEY": BIRDEYE_API_KEY}
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://public-api.birdeye.so/defi/token_list",
            params={
                "sort_by": "created",
                "sort_type": "desc",
                "limit": limit,
            },
            headers=headers,
        )
        resp.raise_for_status()
        data = resp.json()
        return data.get("data", {}).get("tokens", [])


def filter_eligible(tokens: list[dict]) -> list[dict]:
    """Filter tokens that meet minimum liquidity requirements."""
    eligible = []
    for t in tokens:
        liq = t.get("liquidity", 0)
        if liq >= MIN_LIQUIDITY_USD:
            eligible.append({
                "mint": t.get("address", ""),
                "name": t.get("name", "unknown"),
                "symbol": t.get("symbol", "???"),
                "liquidity": liq,
                "price": t.get("price", 0),
            })
    return eligible[:MAX_MARKETS_PER_DAY]


def _mock_tokens() -> list[dict]:
    """Mock token data for devnet testing."""
    return [
        {
            "address": "So11111111111111111111111111111111111111112",
            "name": "Mock Token Alpha",
            "symbol": "MTALPHA",
            "liquidity": 15000,
            "price": 0.001,
        },
        {
            "address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
            "name": "Mock Token Beta",
            "symbol": "MTBETA",
            "liquidity": 8000,
            "price": 0.05,
        },
    ]
