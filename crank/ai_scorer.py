"""AI scorer — uses Claude API to analyze token rug probability."""

import anthropic
from config import ANTHROPIC_API_KEY

SCORING_PROMPT = """You are a Solana token analyst. Analyze this token and give a rug probability score from 0-100.

Token: {name} ({symbol})
Mint: {mint}
Liquidity: ${liquidity:,.0f}
Price: ${price:.6f}

Consider:
- Extremely low price = likely memecoin/scam
- Low liquidity = easy to rug
- Name contains "moon", "safe", "elon", etc = higher rug risk

Return ONLY a number 0-100. Nothing else."""


async def score_token(token: dict) -> int:
    """Score a token's rug probability using Claude API."""
    if not ANTHROPIC_API_KEY:
        print("ANTHROPIC_API_KEY not set, using heuristic scoring")
        return _heuristic_score(token)

    client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)

    prompt = SCORING_PROMPT.format(**token)

    message = await client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=10,
        messages=[{"role": "user", "content": prompt}],
    )

    try:
        score = int(message.content[0].text.strip())
        return max(0, min(100, score))
    except (ValueError, IndexError):
        return _heuristic_score(token)


def _heuristic_score(token: dict) -> int:
    """Fallback heuristic scoring when Claude API is unavailable."""
    score = 50
    liq = token.get("liquidity", 0)
    name = token.get("name", "").lower()

    if liq < 10000:
        score += 20
    if liq < 5000:
        score += 15

    sus_words = ["safe", "moon", "elon", "doge", "pepe", "inu", "baby"]
    for w in sus_words:
        if w in name:
            score += 10
            break

    return max(0, min(100, score))
