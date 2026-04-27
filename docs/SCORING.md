# Scoring rubric

How the AI scorer assigns rug-likelihood to a new token. Keep this in sync
with `crank/ai_scorer.py` — the rubric is also embedded in the LLM prompt.

## Inputs (per token)

| Signal                       | Source                  | Weight |
|------------------------------|-------------------------|-------:|
| Mint authority active        | RPC: `getMintAccount`  |   0.20 |
| Freeze authority active      | RPC: `getMintAccount`  |   0.10 |
| Top-10 holder concentration  | Birdeye / Helius        |   0.20 |
| Liquidity locked %           | DexScreener             |   0.15 |
| LP unlock time               | DexScreener             |   0.10 |
| Twitter / on-chain socials   | Birdeye token-overview  |   0.05 |
| Code review hash match       | known-rug fingerprints  |   0.10 |
| Age (under 7 days riskier)   | mint timestamp          |   0.10 |

Weights sum to 1.0; each signal returns a 0–1 score.

## Output

```json
{
  "token": "9aBc...",
  "rug_score": 0.78,
  "verdict": "likely_rug",
  "rationale": [
    "mint authority not revoked (+0.20)",
    "top-10 holders own 71% (+0.18)",
    "liquidity unlocked in 3 days (+0.10)",
    "no twitter or on-chain socials (+0.05)"
  ],
  "fetched_at": "2026-05-01T22:30:00Z"
}
```

## Verdict bands

| score      | verdict       | market default |
|------------|---------------|----------------|
| 0.00–0.30  | `legit`       | resolves LEGIT |
| 0.30–0.55  | `unclear`     | manual review  |
| 0.55–0.80  | `risky`       | resolves RUG   |
| 0.80–1.00  | `likely_rug`  | resolves RUG   |

The crank only auto-resolves when the score crosses 0.80 OR drops below 0.20
**and** the market window is past expiry. Otherwise the resolution is held
for an admin review pass.

## Calibration

Backtested against 142 known rugs (q1 2026): 87% precision, 71% recall at
the 0.80 threshold. Lowering threshold to 0.65 brings recall to 89% but
precision drops to 74%. We currently err on precision — false RUG verdicts
cost more user trust than false LEGITs.

## What it doesn't catch

- Slow-roll rugs (mint authority renounced, but team gradually drains LP)
- Honeypots that pass simulator but reject sells in production
- Cross-chain rugs (we only see Solana state)

These are flagged for human review when the score falls in 0.30–0.55.
