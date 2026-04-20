import { useState, useMemo } from 'react';
import { useMarkets } from '../hooks/useMarkets';
import { MarketCard } from '../components/MarketCard';

type SortKey = 'newest' | 'pool' | 'bettors' | 'score';

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className="text-xl font-bold">
          <span className="text-error">Active</span> Markets
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="Search token..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input input-sm input-bordered bg-base-200 w-40 text-xs"
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
            <option value="score">AI Score</option>
          </select>
          <button
            className="btn btn-xs btn-ghost"
            onClick={refresh}
            aria-label="Refresh markets"
            title="Refresh"
          >
            &#x21BB;
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <span className="loading loading-spinner loading-lg text-error" aria-label="Loading markets" />
        </div>
      ) : fetchError ? (
        <div className="text-center py-16 text-base-content/40">
          <p className="text-error">{fetchError}</p>
          <p className="text-xs mt-2">Check your connection and refresh</p>
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-16 text-base-content/40">
          <p className="text-lg">No active markets</p>
          <p className="text-xs mt-2">
            {search ? 'Try a different search term' : 'New markets are added daily — check back soon'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {displayed.map((m) => (
            <MarketCard key={m.pubkey} market={m} />
          ))}
        </div>
      )}
    </div>
  );
}
