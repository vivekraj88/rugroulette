"""AI scorer — uses Claude API to analyze token rug probability."""

import anthropic
from config import ANTHROPIC_API_KEY, ANTHROPIC_MODEL, get_logger

log = get_logger('ai_scorer')

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
    """Score a token's rug probability using Claude API.

    Sends a structured prompt to Claude with the token's name, symbol,
    mint, liquidity and price. The model is asked to return ONLY a
    0-100 integer where 0 means "almost certainly legit" and 100 means
    "almost certainly a rug".

    Args:
        token: Dict with at least the keys ``name``, ``symbol``, ``mint``,
            ``liquidity`` (USD) and ``price`` (USD per token).

    Returns:
        Integer 0-100 representing rug probability. Falls back to
        :func:`_heuristic_score` on missing API key, parse errors, or
        Anthropic API failures.
    """
    if not ANTHROPIC_API_KEY:
        log.info("no ANTHROPIC_API_KEY — heuristic scoring for %s", token.get('name', '?'))
        return _heuristic_score(token)

    client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)
    prompt = SCORING_PROMPT.format(**token)

    try:
        message = await client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=10,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = message.content[0].text.strip()
        score = int(raw)
        clamped = max(0, min(100, score))
        log.info("AI scored %s: %d (raw: %s)", token.get('name', '?'), clamped, raw)
        return clamped
    except (ValueError, IndexError) as exc:
        log.warning("AI response parse error: %s — falling back to heuristic", exc)
        return _heuristic_score(token)
    except anthropic.APIError as exc:
        log.error("Claude API error: %s — falling back to heuristic", exc)
        return _heuristic_score(token)


def _heuristic_score(token: dict) -> int:
    """Fallback heuristic scoring when Claude API is unavailable.

    Pure-function rules over the token dict — no network calls. Score
    starts at 50 (neutral) and is bumped up for low-liquidity pools and
    suspicious name patterns ("moon", "elon", "inu", etc). Result is
    clamped to [0, 100].

    Args:
        token: Same shape as :func:`score_token` input.

    Returns:
        Integer 0-100.
    """
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

    result = max(0, min(100, score))
    log.info("heuristic scored %s: %d", token.get('name', '?'), result)
    return result
