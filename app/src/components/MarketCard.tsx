import { Link } from 'react-router-dom';
import type { MarketAccount } from '../hooks/useMarkets';
import { Countdown } from './Countdown';

function lamportsToSol(lamports: number): string {
  return (lamports / 1e9).toFixed(2);
}

function scoreColor(score: number): string {
  if (score >= 70) return 'text-rug';
  if (score >= 40) return 'text-yellow-400';
  return 'text-legit';
}

export function MarketCard({ market }: { market: MarketAccount }) {
  const totalPool = market.totalRugPool + market.totalLegitPool;
  const rugPct = totalPool > 0 ? Math.round((market.totalRugPool / totalPool) * 100) : 50;

  return (
    <Link
      to={`/market/${market.pubkey}`}
      className="card bg-base-300 border border-gray-800 hover:border-rug/50 transition-colors"
    >
      <div className="card-body p-4 gap-3">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold text-sm text-white">{market.tokenName}</h3>
            <p className="text-[10px] text-gray-500 font-mono">
              {market.tokenMint.slice(0, 8)}...
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`text-lg font-bold ${scoreColor(market.aiScore)}`}>
              {market.aiScore}%
            </span>
            <span className="text-[10px] text-gray-500">AI Score</span>
          </div>
        </div>

        {/* Pool bar */}
        <div>
          <div className="flex justify-between text-[10px] mb-1">
            <span className="text-rug">RUG {rugPct}%</span>
            <span className="text-legit">LEGIT {100 - rugPct}%</span>
          </div>
          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden flex">
            <div className="bg-rug h-full" style={{ width: `${rugPct}%` }} />
            <div className="bg-legit h-full flex-1" />
          </div>
        </div>

        <div className="flex justify-between text-[10px] text-gray-400">
          <span>{lamportsToSol(totalPool)} SOL pool</span>
          <span>{market.totalBettors} bettors</span>
          <span>
            {market.status === 'Open' ? (
              <Countdown resolveAt={market.resolveAt} />
            ) : market.status}
          </span>
        </div>

        {market.status === 'Resolved' && (
          <div className={`badge ${market.result ? 'badge-error' : 'badge-success'} badge-sm`}>
            {market.result ? 'RUGGED' : 'LEGIT'}
          </div>
        )}
      </div>
    </Link>
  );
}
