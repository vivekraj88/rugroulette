# RugRoulette

[![Solana](https://img.shields.io/badge/Built_on-Solana-9945FF?style=for-the-badge&logo=solana)](https://solana.com)
[![Anchor](https://img.shields.io/badge/Smart_Contracts-Anchor-blueviolet?style=for-the-badge)](https://www.anchor-lang.com/)
[![Python](https://img.shields.io/badge/Crank-Python-3776AB?style=for-the-badge&logo=python)](https://python.org)

> **Prediction market on whether new tokens are rug pulls.**

---

## Overview

RugRoulette lets users bet on whether newly launched tokens will rug or survive. Markets are created automatically when suspicious tokens appear. Resolution happens after 7 days using on-chain data + AI scoring.

## Architecture

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│  React App  │───▶│ Anchor Prog  │◀───│ Python Crank│
│  (DaisyUI)  │    │  (Markets)   │    │ (Scanner+AI)│
└─────────────┘    └──────────────┘    └─────────────┘
```

## Screenshots

> Coming soon

## Features

- [ ] Auto-detect new token launches
- [ ] Create prediction markets (RUG vs LEGIT)
- [ ] AI rug score for each token
- [ ] 7-day resolution with on-chain proof
- [ ] Payout distribution to winners

## Getting Started

```bash
# Smart contracts
anchor build && anchor deploy

# Frontend
cd app && npm install && npm run dev

# Python crank
cd crank && pip install -r requirements.txt && python main.py
```

## License

MIT
