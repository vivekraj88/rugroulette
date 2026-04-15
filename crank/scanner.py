"""Token scanner — discovers trending Solana tokens via GeckoTerminal API.

Uses the free GeckoTerminal API (no key needed) to find trending pools
on Solana, then filters for tokens with real market cap and liquidity
that are interesting candidates for rug prediction markets.
"""

import asyncio
import httpx
from config import (
    MAX_MARKETS_PER_DAY,
    MAX_RETRIES, RETRY_BASE_DELAY, get_logger,
)

log = get_logger('scanner')

GECKO_TRENDING = "https://api.geckoterminal.com/api/v2/networks/solana/trending_pools"
GECKO_TOP_POOLS = "https://api.geckoterminal.com/api/v2/networks/solana/pools"
DEXSCREENER_PROFILES = "https://api.dexscreener.com/token-profiles/latest/v1"
BIRDEYE_OVERVIEW = "https://public-api.birdeye.so/defi/token_overview"

# Minimum thresholds for a market-worthy token
MIN_MCAP_USD = 300_000       # $300K+ market cap — survived initial pump
MIN_LIQUIDITY_USD = 10_000   # $10K liquidity — real pool exists
MAX_MCAP_USD = 50_000_000    # $50M — skip established tokens that won't rug

# Skip stablecoins, wrapped assets, LP tokens
SKIP_SYMBOLS = {
    "SOL", "WSOL", "USDC", "USDT", "USDH", "USH", "USDS", "USDG", "USD1",
    "mSOL", "stSOL", "jitoSOL", "bSOL", "JitoSOL",
    "WETH", "WBTC", "cbBTC", "tBTC",
    "JLP", "JupUSD", "jlUSDC", "USDY",
}


def _parse_pool(pool: dict) -> dict | None:
    """Extract token info from a GeckoTerminal pool object."""
    attr = pool.get("attributes", {})
    rels = pool.get("relationships", {})

    name_pair = attr.get("name", "")
    base_name = name_pair.split(" / ")[0].strip() if " / " in name_pair else name_pair

    # get mint from relationship ID (format: solana_<address>)
    base_id = rels.get("base_token", {}).get("data", {}).get("id", "")
    mint = base_id.replace("solana_", "") if base_id.startswith("solana_") else ""
    if not mint:
        return None

    mc = float(attr.get("market_cap_usd") or attr.get("fdv_usd") or 0)
    liq = float(attr.get("reserve_in_usd") or 0)
    vol = float((attr.get("volume_usd") or {}).get("h24", 0))
    price = float(attr.get("base_token_price_usd") or 0)
    created = attr.get("pool_created_at", "")[:10]

    # extract symbol from base_token_price_native_currency name if available
    # GeckoTerminal doesn't always give symbol directly, use name
    symbol = base_name.upper()[:10]

    return {
        "mint": mint,
        "name": base_name[:32],
        "symbol": symbol,
        "liquidity": liq,
        "price": price,
        "mcap": mc,
        "volume_24h": vol,
        "created": created,
    }


async def fetch_new_tokens(limit: int = 50) -> list[dict]:
    """Fetch tokens from GeckoTerminal trending + DexScreener new profiles.

    Two sources combined:
    1. GeckoTerminal trending — established tokens with volume
    2. DexScreener latest profiles — freshly launched tokens (pump.fun etc.)
       enriched with Birdeye price/liquidity data
    """
    tokens = []
    seen_mints = set()

    # Source 1: GeckoTerminal trending
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(GECKO_TRENDING, params={"page": "1"})
                resp.raise_for_status()
                data = resp.json()

            pools = data.get("data", [])
            log.info("fetched %d trending pools from GeckoTerminal", len(pools))

            for pool in pools:
                parsed = _parse_pool(pool)
                if parsed and parsed["mint"] not in seen_mints:
                    seen_mints.add(parsed["mint"])
                    tokens.append(parsed)
            break
        except (httpx.HTTPError, httpx.TimeoutException) as exc:
            if attempt < MAX_RETRIES:
                await asyncio.sleep(RETRY_BASE_DELAY * attempt)
            else:
                log.warning("GeckoTerminal trending failed: %s", exc)

    await asyncio.sleep(2.0)

    # Source 2: DexScreener latest profiles — freshly created tokens
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(DEXSCREENER_PROFILES)
            resp.raise_for_status()
            profiles = resp.json()

        sol_profiles = [p for p in profiles if p.get("chainId") == "solana"]
        log.info("fetched %d fresh Solana profiles from DexScreener", len(sol_profiles))

        # enrich with Birdeye data
        from config import BIRDEYE_API_KEY
        headers = {"X-API-KEY": BIRDEYE_API_KEY, "x-chain": "solana"} if BIRDEYE_API_KEY else {}

        for profile in sol_profiles[:20]:
            mint = profile.get("tokenAddress", "")
            if not mint or mint in seen_mints:
                continue

            token_data = {"mint": mint, "name": "???", "symbol": "???",
                          "liquidity": 0, "price": 0, "mcap": 0}

            if BIRDEYE_API_KEY:
                try:
                    async with httpx.AsyncClient(timeout=8.0) as c:
                        r = await c.get(BIRDEYE_OVERVIEW,
                                        params={"address": mint}, headers=headers)
                        if r.status_code == 200:
                            d = r.json().get("data", {})
                            token_data["name"] = (d.get("name") or "???")[:32]
                            token_data["symbol"] = (d.get("symbol") or "???")[:10]
                            token_data["liquidity"] = d.get("liquidity", 0) or 0
                            token_data["price"] = d.get("price", 0) or 0
                            token_data["mcap"] = d.get("mc", 0) or 0
                    await asyncio.sleep(0.3)
                except Exception:
                    pass

            if token_data["name"] != "???" and token_data["liquidity"] > 0:
                seen_mints.add(mint)
                tokens.append(token_data)

    except (httpx.HTTPError, httpx.TimeoutException) as exc:
        log.warning("DexScreener profiles failed: %s", exc)

    log.info("total unique tokens discovered: %d", len(tokens))
    return tokens[:limit]


def filter_eligible(tokens: list[dict]) -> list[dict]:
    """Filter for tokens with real mcap, liquidity, and not stablecoins/spam."""
    eligible = []
    seen_names = set()

    for t in tokens:
        symbol = t.get("symbol", "")
        name = t.get("name", "").strip()
        mc = t.get("mcap", 0)
        liq = t.get("liquidity", 0)

        # skip known non-targets
        if symbol in SKIP_SYMBOLS:
            continue

        # skip empty names
        if not name or len(name) < 2:
            continue

        # hard filters
        if mc < MIN_MCAP_USD:
            continue
        if liq < MIN_LIQUIDITY_USD:
            continue
        if mc > MAX_MCAP_USD:
            continue

        # deduplicate by name
        key = name.lower()
        if key in seen_names:
            continue
        seen_names.add(key)

        eligible.append(t)

    log.info(
        "filtered %d eligible tokens (mcap $%dK-$%dM, liq>$%dK)",
        len(eligible),
        MIN_MCAP_USD // 1000,
        MAX_MCAP_USD // 1_000_000,
        MIN_LIQUIDITY_USD // 1000,
    )
    return eligible[:MAX_MARKETS_PER_DAY]
