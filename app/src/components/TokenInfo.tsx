import { useEffect, useState } from 'react';

const DEXSCREENER_API = 'https://api.dexscreener.com/latest/dex/tokens';

interface TokenData {
  name: string;
  symbol: string;
  price: number;
  priceChange1h: number | null;
  priceChange6h: number | null;
  priceChange24h: number | null;
  marketCap: number;
  fdv: number;
  liquidity: number;
  volume24h: number;
  buys24h: number;
  sells24h: number;
  totalTxns24h: number;
  pairCreatedAt: string;
  dex: string;
  logoURI: string;
  sellPressure: number;
}

function usd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n > 0) return `$${n.toFixed(6)}`;
  return '$0';
}

function num(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function Pct({ value }: { value: number | null }) {
  if (value === null || value === undefined) return <span className="text-base-content/20">&mdash;</span>;
  const c = value > 0 ? 'text-success' : value < 0 ? 'text-error' : 'text-base-content/40';
  return <span className={`${c} font-bold`}>{value > 0 ? '+' : ''}{value.toFixed(1)}%</span>;
}

function Flag({ label, active }: { label: string; active: boolean }) {
  if (!active) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-error/15 text-error">
      {'\u26A0'} {label}
    </span>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-base-content/40">{label}</span>
      <span className="font-bold text-base-content">{children}</span>
    </div>
  );
}

export function TokenInfo({ mint }: { mint: string }) {
  const [data, setData] = useState<TokenData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      try {
        const resp = await fetch(`${DEXSCREENER_API}/${mint}`);
        const json = await resp.json();
        const pairs = json.pairs || [];
        if (cancelled || pairs.length === 0) return;

        const p = pairs[0];
        const buys = p.txns?.h24?.buys || 0;
        const sells = p.txns?.h24?.sells || 0;
        const total = buys + sells;
        const sellPressure = total > 0 ? (sells / total) * 100 : 50;

        setData({
          name: p.baseToken?.name || '???',
          symbol: p.baseToken?.symbol || '???',
          price: parseFloat(p.priceUsd) || 0,
          priceChange1h: p.priceChange?.h1 ?? null,
          priceChange6h: p.priceChange?.h6 ?? null,
          priceChange24h: p.priceChange?.h24 ?? null,
          marketCap: p.marketCap || 0,
          fdv: p.fdv || 0,
          liquidity: p.liquidity?.usd || 0,
          volume24h: p.volume?.h24 || 0,
          buys24h: buys,
          sells24h: sells,
          totalTxns24h: total,
          pairCreatedAt: p.pairCreatedAt ? new Date(p.pairCreatedAt).toLocaleDateString() : '',
          dex: p.dexId || '',
          logoURI: p.info?.imageUrl || '',
          sellPressure,
        });
      } catch { /* silent */ } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [mint]);

  if (loading) {
    return (
      <div className="bg-base-300 border border-base-content/10 rounded-xl p-3 flex justify-center">
        <span className="loading loading-spinner loading-sm text-error" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-base-300 border border-base-content/10 rounded-xl p-3 text-xs text-base-content/30 text-center">
        Token data unavailable
      </div>
    );
  }

  const buyRatio = data.totalTxns24h > 0 ? Math.round((data.buys24h / data.totalTxns24h) * 100) : 50;

  return (
    <div className="bg-base-300 border border-base-content/10 rounded-xl p-3 space-y-3 text-xs">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {data.logoURI && <img src={data.logoURI} alt="" className="w-4 h-4 rounded-full" />}
          <span className="font-bold">{data.symbol}</span>
          <span className="text-base-content/30">on {data.dex}</span>
        </div>
        <div>
          <span className="font-bold">{usd(data.price)}</span>
        </div>
      </div>

      {/* Price changes */}
      <div className="grid grid-cols-3 gap-1.5 text-center">
        <div className="bg-base-100 rounded px-2 py-1">
          <div className="text-[9px] text-base-content/30">1h</div>
          <Pct value={data.priceChange1h} />
        </div>
        <div className="bg-base-100 rounded px-2 py-1">
          <div className="text-[9px] text-base-content/30">6h</div>
          <Pct value={data.priceChange6h} />
        </div>
        <div className="bg-base-100 rounded px-2 py-1">
          <div className="text-[9px] text-base-content/30">24h</div>
          <Pct value={data.priceChange24h} />
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-1.5">
        <div className="bg-base-100 rounded px-2 py-1">
          <div className="text-[9px] text-base-content/30">Market Cap</div>
          <div className="font-bold">{usd(data.marketCap)}</div>
        </div>
        <div className="bg-base-100 rounded px-2 py-1">
          <div className="text-[9px] text-base-content/30">Liquidity</div>
          <div className="font-bold">{usd(data.liquidity)}</div>
        </div>
        <div className="bg-base-100 rounded px-2 py-1">
          <div className="text-[9px] text-base-content/30">FDV</div>
          <div className="font-bold">{usd(data.fdv)}</div>
        </div>
        <div className="bg-base-100 rounded px-2 py-1">
          <div className="text-[9px] text-base-content/30">24h Volume</div>
          <div className="font-bold">{usd(data.volume24h)}</div>
        </div>
      </div>

      {/* Trades buy/sell */}
      <div className="space-y-1">
        <Row label="24h Txns">{num(data.totalTxns24h)}</Row>
        <div className="flex justify-between text-[9px]">
          <span className="text-success">Buy {num(data.buys24h)} ({buyRatio}%)</span>
          <span className="text-error">Sell {num(data.sells24h)} ({100 - buyRatio}%)</span>
        </div>
        <div className="w-full h-1.5 bg-base-100 rounded-full overflow-hidden flex">
          <div className="bg-success h-full" style={{ width: `${buyRatio}%` }} />
          <div className="bg-error h-full flex-1" />
        </div>
      </div>

      {/* Meta */}
      <div className="space-y-1">
        {data.pairCreatedAt && <Row label="Listed">{data.pairCreatedAt}</Row>}
      </div>

      {/* Red flags */}
      {(() => {
        const flags = [
          { label: 'Low liquidity', active: data.liquidity < 50_000 },
          { label: 'High sell pressure', active: data.sellPressure > 60 },
          { label: 'Low market cap', active: data.marketCap > 0 && data.marketCap < 500_000 },
          { label: 'Price dump 24h', active: (data.priceChange24h ?? 0) < -30 },
          { label: 'Low volume', active: data.volume24h < 10_000 },
          { label: 'New token (<7d)', active: !!data.pairCreatedAt && (Date.now() - new Date(data.pairCreatedAt).getTime()) < 7 * 86400000 },
          { label: 'Liq/MCap ratio low', active: data.marketCap > 0 && (data.liquidity / data.marketCap) < 0.03 },
        ];
        const activeFlags = flags.filter((f) => f.active);
        return (
          <div className="space-y-1.5">
            <div className="text-[9px] font-bold text-base-content/30 uppercase">Risk Flags</div>
            {activeFlags.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {activeFlags.map((f) => <Flag key={f.label} label={f.label} active />)}
              </div>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-success/10 text-success">
                {'\u2713'} No risks detected
              </span>
            )}
          </div>
        );
      })()}
    </div>
  );
}
