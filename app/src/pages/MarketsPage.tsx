import { useState } from 'react';
import { useMarkets } from '../hooks/useMarkets';
import { useMarketStore } from '../store/marketStore';
import { MarketCard } from '../components/MarketCard';

type Filter = 'all' | 'open' | 'resolved';

export function MarketsPage() {
  const { markets, loading } = useMarkets();
  const storeLoading = useMarketStore((s) => s.loading);
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = markets.filter((m) => {
    if (filter === 'open') return m.status === 'Open';
    if (filter === 'resolved') return m.status === 'Resolved';
    return true;
  });

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">
          <span className="text-rug">Active</span> Markets
        </h1>
        <div className="btn-group">
          {(['all', 'open', 'resolved'] as Filter[]).map((f) => (
            <button
              key={f}
              className={`btn btn-xs ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <span className="loading loading-spinner loading-lg text-rug" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg">No markets found</p>
          <p className="text-xs mt-2">Markets are created automatically by the crank scanner</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((m) => (
            <MarketCard key={m.pubkey} market={m} />
          ))}
        </div>
      )}
    </div>
  );
}
