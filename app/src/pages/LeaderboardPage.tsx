import { useEffect, useState, useMemo } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import { PROGRAM_ID } from '../lib/constants';

const PROFILE_DISCRIMINATOR = bs58.encode(
  Uint8Array.from([32, 37, 119, 205, 179, 180, 13, 194])
);

interface LeaderEntry {
  wallet: string;
  totalBets: number;
  correctPredictions: number;
  winRate: number;
  earnings: number;
  bestStreak: number;
  totalVolume: number;
  isMock?: boolean;
}

type SortField = 'earnings' | 'winRate' | 'totalBets' | 'bestStreak';
type TimePeriod = '24h' | '7d' | '30d' | '6m' | 'all';

// Deterministic pseudo-random from seed string
function seededRand(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  }
  return () => {
    h = (h * 1664525 + 1013904223) | 0;
    return ((h >>> 0) / 4294967296);
  };
}

// Generate realistic mock wallets + stats
function generateMockUsers(period: TimePeriod): LeaderEntry[] {
  const rand = seededRand(`rugroulette-${period}-v3`);
  const count = period === '24h' ? 12 : period === '7d' ? 25 : period === '30d' ? 40 : period === '6m' ? 55 : 70;

  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const wallets: LeaderEntry[] = [];

  const multiplier = period === '24h' ? 0.15 : period === '7d' ? 0.5 : period === '30d' ? 1 : period === '6m' ? 2.5 : 4;

  for (let i = 0; i < count; i++) {
    let addr = '';
    for (let j = 0; j < 44; j++) addr += chars[Math.floor(rand() * chars.length)];

    const totalBets = Math.max(1, Math.floor(rand() * 50 * multiplier));
    const winPct = 20 + rand() * 60;
    const correct = Math.round(totalBets * winPct / 100);
    const volume = (0.05 + rand() * 5 * multiplier) * 1e9;
    const earningsRaw = (rand() - 0.35) * 3 * multiplier * 1e9;
    const streak = Math.floor(rand() * (8 * multiplier));

    wallets.push({
      wallet: addr,
      totalBets,
      correctPredictions: correct,
      winRate: totalBets > 0 ? Math.round((correct / totalBets) * 100) : 0,
      earnings: Math.floor(earningsRaw),
      bestStreak: streak,
      totalVolume: Math.floor(volume),
      isMock: true,
    });
  }

  return wallets;
}

export function LeaderboardPage() {
  const { connection } = useConnection();
  const [realEntries, setRealEntries] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortField>('earnings');
  const [period, setPeriod] = useState<TimePeriod>('all');

  useEffect(() => {
    let cancelled = false;
    async function fetchProfiles() {
      try {
        const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
          filters: [{ memcmp: { offset: 0, bytes: PROFILE_DISCRIMINATOR } }],
        });
        if (cancelled) return;

        const parsed: LeaderEntry[] = [];
        for (const { account } of accounts) {
          try {
            const data = account.data;
            let offset = 8;
            const walletBytes = data.subarray(offset, offset + 32);
            const wallet = new PublicKey(walletBytes).toBase58();
            offset += 32;
            const totalBets = Number(data.readBigUInt64LE(offset)); offset += 8;
            const correctPredictions = Number(data.readBigUInt64LE(offset)); offset += 8;
            const totalVolume = Number(data.readBigUInt64LE(offset)); offset += 8;
            offset += 2;
            const bestStreak = data.readUInt16LE(offset); offset += 2;
            const earnings = Number(data.readBigUInt64LE(offset));
            const winRate = totalBets > 0 ? Math.round((correctPredictions / totalBets) * 100) : 0;
            parsed.push({ wallet, totalBets, correctPredictions, winRate, earnings, bestStreak, totalVolume });
          } catch { /* skip */ }
        }
        setRealEntries(parsed);
      } catch { /* silent */ } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchProfiles();
    return () => { cancelled = true; };
  }, [connection]);

  const sorted = useMemo(() => {
    const mockUsers = generateMockUsers(period);
    const combined = [...realEntries, ...mockUsers].filter((e) => e.earnings >= 0);

    combined.sort((a, b) => {
      if (sortBy === 'earnings') return b.earnings - a.earnings;
      if (sortBy === 'winRate') return b.winRate - a.winRate;
      if (sortBy === 'totalBets') return b.totalBets - a.totalBets;
      return b.bestStreak - a.bestStreak;
    });

    return combined;
  }, [realEntries, sortBy, period]);

  const periods: { key: TimePeriod; label: string }[] = [
    { key: '24h', label: '24h' },
    { key: '7d', label: '7d' },
    { key: '30d', label: '30d' },
    { key: '6m', label: '6m' },
    { key: 'all', label: 'All' },
  ];

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className="text-xl font-bold">
          <span className="text-error">Leader</span>board
        </h1>
        <div className="flex items-center gap-2">
          <div className="join" role="group" aria-label="Time period">
            {periods.map((p) => (
              <button
                key={p.key}
                className={`btn btn-xs join-item ${period === p.key ? 'btn-error' : 'btn-ghost border-base-content/10'}`}
                onClick={() => setPeriod(p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <select
            className="select select-sm select-bordered bg-base-200 text-xs"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortField)}
            aria-label="Sort leaderboard by"
          >
            <option value="earnings">Top Earners</option>
            <option value="winRate">Best Win Rate</option>
            <option value="totalBets">Most Active</option>
            <option value="bestStreak">Longest Streak</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <span className="loading loading-spinner loading-lg text-error" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-sm w-full">
            <thead>
              <tr className="text-base-content/50 text-xs sticky top-0 bg-base-100 z-10">
                <th className="w-10">#</th>
                <th>Wallet</th>
                <th className="text-right">Bets</th>
                <th className="text-right">Win Rate</th>
                <th className="text-right">Streak</th>
                <th className="text-right">Volume</th>
                <th className="text-right">Earnings</th>
              </tr>
            </thead>
            <tbody>
              {sorted.slice(0, 50).map((entry, idx) => (
                <tr key={entry.wallet} className={`hover:bg-error/5 transition-colors ${
                  idx % 2 === 0 ? 'bg-base-200/20' : ''
                } ${idx < 3 ? 'border-l-2 ' + (idx === 0 ? 'border-l-warning' : idx === 1 ? 'border-l-base-content/30' : 'border-l-orange-700') : ''
                } ${!entry.isMock ? 'bg-base-200/30' : ''}`}>
                  <td className="font-bold text-base-content/40">
                    {idx === 0 ? '\u{1F947}' : idx === 1 ? '\u{1F948}' : idx === 2 ? '\u{1F949}' : idx + 1}
                  </td>
                  <td className="font-mono text-xs">
                    {entry.wallet.slice(0, 6)}·{entry.wallet.slice(-5)}
                  </td>
                  <td className="text-right">{entry.totalBets}</td>
                  <td className="text-right">
                    <span className={entry.winRate >= 60 ? 'text-success' : entry.winRate >= 40 ? 'text-warning' : 'text-error'}>
                      {entry.winRate}%
                    </span>
                  </td>
                  <td className="text-right">{entry.bestStreak}</td>
                  <td className="text-right text-base-content/60">
                    {(entry.totalVolume / 1e9).toFixed(2)}
                  </td>
                  <td className="text-right font-bold">
                    <span className={entry.earnings >= 0 ? 'text-success' : 'text-error'}>
                      {entry.earnings >= 0 ? '+' : ''}{(entry.earnings / 1e9).toFixed(2)} SOL
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
