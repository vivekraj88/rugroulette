import { useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMarkets } from '../hooks/useMarkets';
import { BetPanel } from '../components/BetPanel';
import { ClaimPanel } from '../components/ClaimPanel';
import { Countdown } from '../components/Countdown';
import { TokenInfo } from '../components/TokenInfo';

function solFmt(l: number): string {
  return (l / 1e9).toFixed(2);
}

function dateFmt(ts: number): string {
  return new Date(ts * 1000).toLocaleString();
}

function TokenChart({ mint }: { mint: string }) {
  const chartUrl = `https://dexscreener.com/solana/${mint}?embed=1&theme=dark&info=0&trades=0`;
  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-base-300 to-base-300/80 border border-base-content/10 rounded-xl overflow-hidden shadow-lg shadow-black/20">
      <div className="flex items-center justify-between px-3 pt-2 pb-1 shrink-0">
        <span className="font-bold text-xs">Chart</span>
        <a
          href={`https://dexscreener.com/solana/${mint}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-base-content/40 hover:text-error"
        >
          DexScreener &#x2197;
        </a>
      </div>
      <iframe
        src={chartUrl}
        className="w-full border-0 flex-1 min-h-0"
        title="Token price chart"
        loading="lazy"
        sandbox="allow-scripts allow-same-origin allow-popups"
      />
    </div>
  );
}

export function MarketDetailPage() {
  const { pubkey } = useParams<{ pubkey: string }>();
  const { markets, loading } = useMarkets();
  const market = markets.find((m) => m.pubkey === pubkey);
  const [copied, setCopied] = useState(false);
  const mintAddr = market?.tokenMint || '';
  const copyMint = useCallback(() => {
    navigator.clipboard.writeText(mintAddr);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [mintAddr]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <span className="loading loading-spinner loading-lg text-error" aria-label="Loading market" />
      </div>
    );
  }

  if (!market) {
    return (
      <div className="text-center py-20 text-base-content/40 space-y-3">
        <p className="text-lg">Market not found</p>
        <Link to="/app" className="btn btn-error btn-sm">Back to Markets</Link>
      </div>
    );
  }

  const totalPool = market.totalRugPool + market.totalLegitPool;
  const rugPct = totalPool > 0 ? Math.round((market.totalRugPool / totalPool) * 100) : 50;

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col p-3 gap-2 max-w-[1400px] mx-auto overflow-hidden">
      {/* Compact header */}
      <div className="flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/app" className="btn btn-ghost btn-xs text-base-content/50 hover:text-error">&larr; Back</Link>
          <div>
            <h1 className="text-lg font-bold text-base-content leading-tight">{market.tokenName}</h1>
            <button
              className="text-[10px] text-base-content/30 font-mono hover:text-base-content/60 transition-colors flex items-center gap-1.5 cursor-pointer group"
              onClick={copyMint}
              title="Copy contract address"
            >
              <span className={copied ? 'opacity-40' : ''}>{market.tokenMint}</span>
              <span className={`shrink-0 transition-all duration-300 ${copied ? 'text-success scale-110' : 'opacity-40 group-hover:opacity-70'}`}>
                {copied ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                    <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                    <path d="M5.5 3.5A1.5 1.5 0 0 1 7 2h5.5A1.5 1.5 0 0 1 14 3.5V11a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 11V3.5ZM2 5.5A1.5 1.5 0 0 1 3.5 4v.5H10v7H3.5A1.5 1.5 0 0 1 2 10V5.5Z"/>
                  </svg>
                )}
              </span>
              {copied && <span className="text-success text-[9px] font-sans animate-pulse">Copied!</span>}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {market.status === 'Resolved' && (
            <span className={`badge badge-sm ${market.result ? 'badge-error' : 'badge-success'}`}>
              {market.result ? 'RUGGED' : 'SURVIVED'}
            </span>
          )}
          {market.status === 'Cancelled' && (
            <span className="badge badge-sm badge-warning">Cancelled</span>
          )}
          <div className="text-right">
            <div className={`text-2xl font-bold leading-tight ${
              market.aiScore >= 70 ? 'text-error' : market.aiScore >= 40 ? 'text-warning' : 'text-success'
            }`}>
              {market.aiScore}%
            </div>
            <div className="text-[10px] text-base-content/30" title="AI-estimated probability that this token will rug">Rug Score</div>
          </div>
        </div>
      </div>

      {/* Main 2-column layout: left info | right chart */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-2 min-h-0">

        {/* Left column: Pool + Bet + Token Info */}
        <div className="flex flex-col gap-2 overflow-y-auto">
          {/* Pool breakdown */}
          <div className="glass-panel rounded-xl p-3 space-y-2">
            <h3 className="font-bold text-xs">Pool Breakdown</h3>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-error font-bold">RUG</span>
                <span>{solFmt(market.totalRugPool)} SOL ({rugPct}%)</span>
              </div>
              <div className="w-full h-2.5 bg-base-100 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-red-600 to-error h-full rounded-full shadow-[0_0_8px_rgba(239,68,68,0.3)]" style={{ width: `${rugPct}%` }} />
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-success font-bold">LEGIT</span>
                <span>{solFmt(market.totalLegitPool)} SOL ({100 - rugPct}%)</span>
              </div>
              <div className="w-full h-2.5 bg-base-100 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-success to-green-600 h-full rounded-full shadow-[0_0_8px_rgba(34,197,94,0.3)]" style={{ width: `${100 - rugPct}%` }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[10px] text-base-content/50 pt-1">
              <div>
                <span className="block text-base-content/30">Pool</span>
                <span className="text-base-content font-bold">{solFmt(totalPool)} SOL</span>
              </div>
              <div>
                <span className="block text-base-content/30">Bettors</span>
                <span className="text-base-content font-bold">{market.totalBettors}</span>
              </div>
              <div>
                <span className="block text-base-content/30">Created</span>
                <span>{dateFmt(market.createdAt)}</span>
              </div>
              <div>
                <span className="block text-base-content/30">Resolves</span>
                {market.status === 'Open' ? (
                  <Countdown resolveAt={market.resolveAt} />
                ) : (
                  <span>{dateFmt(market.resolveAt)}</span>
                )}
              </div>
            </div>
          </div>

          {/* Bet + Claim */}
          {market.status === 'Open' && (
            <BetPanel tokenMint={market.tokenMint} />
          )}
          <ClaimPanel market={market} />

          {/* Token info below bet panel */}
          <TokenInfo mint={market.tokenMint} />
        </div>

        {/* Right: Chart */}
        <TokenChart mint={market.tokenMint} />
      </div>
    </div>
  );
}
