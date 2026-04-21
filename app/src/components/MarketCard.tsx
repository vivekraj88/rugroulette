import { Link } from 'react-router-dom';
import type { MarketAccount } from '../hooks/useMarkets';
import { Countdown } from './Countdown';

function lamportsToSol(lamports: number): string {
  return (lamports / 1e9).toFixed(2);
}

function scoreColor(score: number): string {
  if (score >= 70) return 'text-error';
  if (score >= 40) return 'text-warning';
  return 'text-success';
}

function scoreBg(score: number): string {
  if (score >= 70) return 'bg-error/10 border-error/20';
  if (score >= 40) return 'bg-warning/10 border-warning/20';
  return 'bg-success/10 border-success/20';
}

export function MarketCard({ market, index = 0 }: { market: MarketAccount; index?: number }) {
  const totalPool = market.totalRugPool + market.totalLegitPool;
  const rugPct = totalPool > 0 ? Math.round((market.totalRugPool / totalPool) * 100) : 50;

  return (
    <Link
      to={`/app/market/${market.pubkey}`}
      className="card bg-gradient-to-br from-base-300 to-base-300/80 border border-base-content/10 hover:border-error/40 hover:-translate-y-1 hover:shadow-lg hover:shadow-error/10 transition-all duration-200 animate-card-in"
      style={{ animationDelay: `${index * 60}ms` }}
      aria-label={`${market.tokenName} market — ${market.status}`}
    >
      <div className="card-body p-4 gap-3">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold text-sm text-base-content">{market.tokenName}</h3>
            <p className="text-[11px] text-base-content/40 font-mono">
              {market.tokenMint.slice(0, 8)}...
            </p>
          </div>
          <div className={`flex items-center justify-center w-12 h-12 rounded-full border ${scoreBg(market.aiScore)}`}>
            <div className="text-center">
              <span className={`text-base font-bold ${scoreColor(market.aiScore)}`}>
                {market.aiScore}
              </span>
              <span className={`text-[8px] block -mt-0.5 ${scoreColor(market.aiScore)} opacity-60`}>%</span>
            </div>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-[11px] mb-1.5">
            <span className="text-error font-medium">RUG {rugPct}%</span>
            <span className="text-success font-medium">LEGIT {100 - rugPct}%</span>
          </div>
          <div className="w-full h-2.5 bg-base-100 rounded-full overflow-hidden flex" role="progressbar" aria-valuenow={rugPct} aria-valuemin={0} aria-valuemax={100}>
            <div className="bg-gradient-to-r from-red-600 to-error h-full rounded-l-full shadow-[0_0_8px_rgba(239,68,68,0.3)]" style={{ width: `${rugPct}%` }} />
            <div className="bg-gradient-to-r from-success to-green-600 h-full flex-1 rounded-r-full" />
          </div>
        </div>

        <div className="flex justify-between text-[11px] text-base-content/50">
          <span>{lamportsToSol(totalPool)} SOL</span>
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
