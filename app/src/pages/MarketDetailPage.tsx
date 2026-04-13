import { useParams, Link } from 'react-router-dom';
import { useMarkets } from '../hooks/useMarkets';
import { BetPanel } from '../components/BetPanel';
import { ClaimPanel } from '../components/ClaimPanel';
import { Countdown } from '../components/Countdown';

function lamportsToSol(l: number): string {
  return (l / 1e9).toFixed(3);
}

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleString();
}

export function MarketDetailPage() {
  const { pubkey } = useParams<{ pubkey: string }>();
  const { markets, loading } = useMarkets();
  const market = markets.find((m) => m.pubkey === pubkey);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <span className="loading loading-spinner loading-lg text-rug" />
      </div>
    );
  }

  if (!market) {
    return (
      <div className="text-center py-20 text-gray-500">
        <p>Market not found</p>
      </div>
    );
  }

  const totalPool = market.totalRugPool + market.totalLegitPool;
  const rugPct = totalPool > 0 ? Math.round((market.totalRugPool / totalPool) * 100) : 50;

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-white">{market.tokenName}</h1>
          <p className="text-xs text-gray-500 font-mono mt-1">{market.tokenMint}</p>
        </div>
        <div className="text-right">
          <div className={`text-3xl font-bold ${
            market.aiScore >= 70 ? 'text-rug' : market.aiScore >= 40 ? 'text-yellow-400' : 'text-legit'
          }`}>
            {market.aiScore}%
          </div>
          <div className="text-[10px] text-gray-500">Rug Probability</div>
        </div>
      </div>

      {/* Result banner */}
      {market.status === 'Resolved' && (
        <div className={`alert ${market.result ? 'alert-error' : 'alert-success'}`}>
          <span className="font-bold">
            {market.result ? 'RUGGED' : 'SURVIVED'} — Market resolved
          </span>
        </div>
      )}

      {market.status === 'Cancelled' && (
        <div className="alert alert-warning">
          <span className="font-bold">Market cancelled — refunds available</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pool info */}
        <div className="card bg-base-300 border border-gray-800 p-4 space-y-3">
          <h3 className="font-bold text-sm">Pool Breakdown</h3>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-rug font-bold">RUG Pool</span>
              <span>{lamportsToSol(market.totalRugPool)} SOL ({rugPct}%)</span>
            </div>
            <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
              <div className="bg-rug h-full rounded-full" style={{ width: `${rugPct}%` }} />
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-legit font-bold">LEGIT Pool</span>
              <span>{lamportsToSol(market.totalLegitPool)} SOL ({100 - rugPct}%)</span>
            </div>
            <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
              <div className="bg-legit h-full rounded-full" style={{ width: `${100 - rugPct}%` }} />
            </div>
          </div>

          <div className="divider my-1" />

          <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
            <div>
              <span className="block text-gray-500">Total Pool</span>
              <span className="text-white font-bold">{lamportsToSol(totalPool)} SOL</span>
            </div>
            <div>
              <span className="block text-gray-500">Bettors</span>
              <span className="text-white font-bold">{market.totalBettors}</span>
            </div>
            <div>
              <span className="block text-gray-500">Created</span>
              <span>{formatDate(market.createdAt)}</span>
            </div>
            <div>
              <span className="block text-gray-500">Resolves</span>
              {market.status === 'Open' ? (
                <Countdown resolveAt={market.resolveAt} />
              ) : (
                <span>{formatDate(market.resolveAt)}</span>
              )}
            </div>
          </div>
        </div>

        {/* Bet / Claim panel */}
        <div className="space-y-3">
          {market.status === 'Open' && (
            <BetPanel
              marketPubkey={market.pubkey}
              tokenMint={market.tokenMint}
              disabled={market.status !== 'Open'}
            />
          )}
          <ClaimPanel market={market} />
        </div>
      </div>

      <div className="mt-4">
        <Link to="/" className="text-xs text-gray-500 hover:text-rug transition-colors">
          &larr; back to markets
        </Link>
      </div>
    </div>
  );
}
