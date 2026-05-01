import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useMarkets, type MarketAccount } from '../hooks/useMarkets';
import { MarketCard } from '../components/MarketCard';

type SortKey = 'newest' | 'pool' | 'bettors' | 'score';

function HeroStats({ markets }: { markets: MarketAccount[] }) {
  const open = markets.filter((m) => m.status === 'Open');
  const resolved = markets.filter((m) => m.status === 'Resolved');
  const totalPool = open.reduce((s, m) => s + m.totalRugPool + m.totalLegitPool, 0);
  const totalBettors = open.reduce((s, m) => s + m.totalBettors, 0);
  const ruggedCount = resolved.filter((m) => m.result === true).length;

  const stats = [
    { label: 'Active Markets', value: String(open.length), color: 'text-error' },
    { label: 'Total Pool', value: `${(totalPool / 1e9).toFixed(1)} SOL`, color: 'text-warning' },
    { label: 'Bettors', value: String(totalBettors), color: 'text-info' },
    { label: 'Resolved', value: String(resolved.length), color: 'text-success' },
  ];

  return (
    <div className="flex flex-col justify-between gap-3">
      <div className="grid grid-cols-2 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="bg-base-100/60 rounded-lg px-3 py-2 border border-base-content/5">
            <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-base-content/30 uppercase tracking-wider">{s.label}</div>
          </div>
        ))}
      </div>
      {resolved.length > 0 && (
        <div className="bg-base-100/40 rounded-lg px-3 py-2 border border-base-content/5">
          <div className="flex justify-between items-center text-[11px] mb-1.5">
            <span className="text-error">Rugged {ruggedCount}</span>
            <span className="text-success">Survived {resolved.length - ruggedCount}</span>
          </div>
          <div className="w-full h-2 bg-base-100 rounded-full overflow-hidden flex">
            <div
              className="bg-gradient-to-r from-red-600 to-error h-full rounded-l-full"
              style={{ width: resolved.length > 0 ? `${(ruggedCount / resolved.length) * 100}%` : '50%' }}
            />
            <div className="bg-gradient-to-r from-success to-green-600 h-full flex-1 rounded-r-full" />
          </div>
          <div className="text-[10px] text-base-content/25 mt-1 text-center">historical rug rate</div>
        </div>
      )}
    </div>
  );
}

function HeroBanner({ markets }: { markets: MarketAccount[] }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-base-300 via-base-300 to-error/5 border border-base-content/10 p-6 mb-2">
      <div className="absolute top-0 right-0 w-64 h-64 bg-error/5 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4 pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 w-48 h-48 bg-success/3 rounded-full blur-3xl translate-y-1/2 pointer-events-none" />
      <div className="relative z-10 flex flex-col lg:flex-row gap-6 lg:gap-10 items-start">
        {/* Left — text */}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">
            <span className="text-error text-glow-red">RUG</span>{' '}
            <span className="text-base-content/60">or</span>{' '}
            <span className="text-success text-glow-green">LEGIT</span>
            <span className="text-base-content/60">?</span>
          </h1>
          <p className="text-sm text-base-content/50 max-w-md mb-4">
            Bet on whether new pump.fun tokens will rug or survive. AI-scored prediction markets resolve in 24 hours. Pick a side. Win SOL.
          </p>
          <div className="flex flex-wrap gap-4 text-[11px] text-base-content/40">
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-base-100 flex items-center justify-center text-error text-[10px] font-bold">1</span>
              <span>Pick a market</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-base-100 flex items-center justify-center text-warning text-[10px] font-bold">2</span>
              <span>Bet RUG or LEGIT</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-base-100 flex items-center justify-center text-success text-[10px] font-bold">3</span>
              <span>Claim winnings</span>
            </div>
          </div>
        </div>
        {/* Right — live stats */}
        <div className="w-full lg:w-64 shrink-0">
          <HeroStats markets={markets} />
        </div>
      </div>
    </div>
  );
}

export function MarketsPage() {
  const { markets, loading, fetchError, refresh } = useMarkets();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('newest');

  const displayed = useMemo(() => {
    let list = markets.filter((m) => m.status === 'Open');

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((m) =>
        m.tokenName.toLowerCase().includes(q) || m.tokenMint.toLowerCase().includes(q)
      );
    }

    const sorted = [...list];
    if (sortKey === 'pool') sorted.sort((a, b) => (b.totalRugPool + b.totalLegitPool) - (a.totalRugPool + a.totalLegitPool));
    else if (sortKey === 'bettors') sorted.sort((a, b) => b.totalBettors - a.totalBettors);
    else if (sortKey === 'score') sorted.sort((a, b) => b.aiScore - a.aiScore);

    return sorted;
  }, [markets, search, sortKey]);

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-4">
      <HeroBanner markets={markets} />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <span className="text-error">Active</span> Markets
          {!loading && displayed.length > 0 && (
            <span className="badge badge-sm badge-ghost text-[10px]">{displayed.length}</span>
          )}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="Search token..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input input-sm input-bordered bg-base-200 w-40 text-xs focus:border-error/50 transition-colors"
            aria-label="Search markets by token name or mint"
          />
          <select
            className="select select-sm select-bordered bg-base-200 text-xs"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            aria-label="Sort markets"
          >
            <option value="newest">Newest</option>
            <option value="pool">Pool size</option>
            <option value="bettors">Bettors</option>
            <option value="score">Rug Score</option>
          </select>
          <button
            className="btn btn-xs btn-ghost hover:text-error transition-colors"
            onClick={refresh}
            aria-label="Refresh markets"
            title="Refresh"
          >
            &#x21BB;
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card bg-base-300/50 border border-base-content/5 animate-pulse">
              <div className="card-body p-4 gap-3">
                <div className="flex justify-between">
                  <div className="space-y-2">
                    <div className="h-4 w-24 bg-base-content/10 rounded" />
                    <div className="h-3 w-16 bg-base-content/5 rounded" />
                  </div>
                  <div className="w-12 h-12 rounded-full bg-base-content/5" />
                </div>
                <div className="h-2.5 w-full bg-base-content/5 rounded-full" />
                <div className="flex justify-between">
                  <div className="h-3 w-14 bg-base-content/5 rounded" />
                  <div className="h-3 w-14 bg-base-content/5 rounded" />
                  <div className="h-3 w-14 bg-base-content/5 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : fetchError ? (
        <div className="text-center py-16 text-base-content/40">
          <p className="text-error">{fetchError}</p>
          <p className="text-xs mt-2">Check your connection and refresh</p>
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-16 text-base-content/60">
          <div className="text-5xl mb-3 opacity-30">{'\u{1F3B2}'}</div>
          <p className="text-lg font-bold">No active markets</p>
          <p className="text-xs mt-2 mb-5">
            {search ? 'Try a different search term — or browse resolved markets below' : 'Scanner is spinning up — fresh markets land daily.'}
          </p>
          <Link to="/app/history" className="btn btn-error btn-sm btn-outline">
            See resolved markets
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {displayed.map((m, i) => (
            <MarketCard key={m.pubkey} market={m} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
