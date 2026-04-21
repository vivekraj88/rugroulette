import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { useMarkets, type MarketAccount } from '../hooks/useMarkets';
import { PROGRAM_ID, BET_SEED, MARKET_SEED } from '../lib/constants';

function solFmt(l: number): string {
  return (l / 1e9).toFixed(2);
}

function dateFmt(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString();
}

interface BetInfo {
  side: 'rug' | 'legit';
  amount: number;
  claimed: boolean;
}

function useUserBets(markets: MarketAccount[]) {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const [bets, setBets] = useState<Record<string, BetInfo | null>>({});

  useEffect(() => {
    if (!publicKey || markets.length === 0) return;
    let cancelled = false;

    async function fetchBets() {
      const result: Record<string, BetInfo | null> = {};
      for (const m of markets) {
        try {
          const mintKey = new PublicKey(m.tokenMint);
          const [marketPda] = PublicKey.findProgramAddressSync(
            [MARKET_SEED, mintKey.toBuffer()], PROGRAM_ID
          );
          const [betPda] = PublicKey.findProgramAddressSync(
            [BET_SEED, marketPda.toBuffer(), publicKey.toBuffer()], PROGRAM_ID
          );
          const info = await connection.getAccountInfo(betPda);
          if (!info) { result[m.pubkey] = null; continue; }
          const data = info.data;
          const sideByte = data[72];
          const amount = Number(data.readBigUInt64LE(73));
          const claimed = data[89] === 1;
          result[m.pubkey] = { side: sideByte === 0 ? 'rug' : 'legit', amount, claimed };
        } catch {
          result[m.pubkey] = null;
        }
      }
      if (!cancelled) setBets(result);
    }
    fetchBets();
    return () => { cancelled = true; };
  }, [publicKey, connection, markets]);

  return bets;
}

type SortKey = 'newest' | 'pool' | 'bettors';

export function HistoryPage() {
  const navigate = useNavigate();
  const { markets, loading } = useMarkets();
  const [sortKey, setSortKey] = useState<SortKey>('newest');

  const resolved = useMemo(() => {
    const list = markets.filter((m) => m.status === 'Resolved');
    const sorted = [...list];
    if (sortKey === 'pool') sorted.sort((a, b) => (b.totalRugPool + b.totalLegitPool) - (a.totalRugPool + a.totalLegitPool));
    else if (sortKey === 'bettors') sorted.sort((a, b) => b.totalBettors - a.totalBettors);
    return sorted;
  }, [markets, sortKey]);

  const userBets = useUserBets(resolved);

  function isWinner(market: MarketAccount, bet: BetInfo): boolean {
    if (market.result === null) return false;
    return (market.result && bet.side === 'rug') || (!market.result && bet.side === 'legit');
  }

  function estimatePayout(market: MarketAccount, bet: BetInfo): number {
    if (!isWinner(market, bet)) return 0;
    const [winPool, losePool] = market.result
      ? [market.totalRugPool, market.totalLegitPool]
      : [market.totalLegitPool, market.totalRugPool];
    const share = winPool > 0 ? (bet.amount / winPool) * losePool : 0;
    return bet.amount + share;
  }

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">
          <span className="text-error">Resolved</span> Markets
        </h1>
        <select
          className="select select-sm select-bordered bg-base-200 text-xs"
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          aria-label="Sort history"
        >
          <option value="newest">Newest</option>
          <option value="pool">Pool size</option>
          <option value="bettors">Bettors</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <span className="loading loading-spinner loading-lg text-error" />
        </div>
      ) : resolved.length === 0 ? (
        <div className="text-center py-16 text-base-content/40">
          <p className="text-lg">No resolved markets yet</p>
          <p className="text-xs mt-2">Markets resolve 24h after creation</p>
        </div>
      ) : (
        <div className="space-y-2">
          {resolved.map((m) => {
            const totalPool = m.totalRugPool + m.totalLegitPool;
            const rugPct = totalPool > 0 ? Math.round((m.totalRugPool / totalPool) * 100) : 50;
            const bet = userBets[m.pubkey];
            const won = bet && isWinner(m, bet);
            const unclaimed = won && !bet.claimed;
            const payout = bet && won ? estimatePayout(m, bet) : 0;

            return (
              <div
                key={m.pubkey}
                className={`card bg-gradient-to-r ${
                  m.result ? 'from-error/5' : 'from-success/5'
                } to-base-300 border p-3 cursor-pointer hover:bg-base-200/50 hover:-translate-x-0.5 transition-all duration-200 ${
                  unclaimed ? 'border-success/50 glow-green' : 'border-base-content/10'
                } border-l-2 ${m.result ? 'border-l-error' : 'border-l-success'}`}
                onClick={() => navigate(`/app/market/${m.pubkey}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/app/market/${m.pubkey}`)}
              >
                <div className="flex items-center gap-3">
                  {/* Unclaimed indicator */}
                  <div className="w-6 flex justify-center shrink-0">
                    {unclaimed && (
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-success" />
                      </span>
                    )}
                  </div>

                  {/* Token info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm truncate">{m.tokenName}</span>
                      <span className={`badge badge-sm font-bold ${m.result ? 'badge-error' : 'badge-success'}`}>
                        {m.result ? 'RUGGED' : 'LEGIT'}
                      </span>
                    </div>
                    <div className="text-[10px] text-base-content/30 font-mono">{m.tokenMint.slice(0, 16)}...</div>
                  </div>

                  {/* Pools */}
                  <div className="hidden sm:flex gap-4 text-xs text-base-content/60 shrink-0">
                    <div>
                      <span className="text-error">{solFmt(m.totalRugPool)}</span>
                      <span className="text-base-content/20 ml-1">({rugPct}%)</span>
                    </div>
                    <div>
                      <span className="text-success">{solFmt(m.totalLegitPool)}</span>
                      <span className="text-base-content/20 ml-1">({100 - rugPct}%)</span>
                    </div>
                  </div>

                  {/* AI score */}
                  <div className="shrink-0 text-right w-12">
                    <span className={`text-sm font-bold ${
                      m.aiScore >= 70 ? 'text-error' : m.aiScore >= 40 ? 'text-warning' : 'text-success'
                    }`}>
                      {m.aiScore}%
                    </span>
                  </div>

                  {/* Date */}
                  <div className="shrink-0 text-xs text-base-content/30 w-20 text-right hidden md:block">
                    {dateFmt(m.resolveAt)}
                  </div>

                  {/* Unclaimed reward */}
                  <div className="shrink-0 w-28 text-right">
                    {unclaimed ? (
                      <div className="badge badge-success badge-sm gap-1 font-bold animate-pulse">
                        +{solFmt(payout)} SOL
                      </div>
                    ) : bet && won && bet.claimed ? (
                      <span className="text-[10px] text-base-content/20">claimed</span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
