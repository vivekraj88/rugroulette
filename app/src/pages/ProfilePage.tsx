import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { PROGRAM_ID, PROFILE_SEED } from '../lib/constants';

interface ProfileData {
  totalBets: number;
  correctPredictions: number;
  totalVolume: number;
  currentStreak: number;
  bestStreak: number;
  earnings: number;
}

function getRank(bets: number, winRate: number): { name: string; color: string; badgeBg: string; emoji: string } {
  if (bets >= 50 && winRate >= 70) return { name: 'DIAMOND', color: 'text-cyan-300', badgeBg: 'bg-cyan-400/10 border-cyan-400/30', emoji: '\u{1F48E}' };
  if (bets >= 30 && winRate >= 60) return { name: 'GOLD', color: 'text-yellow-400', badgeBg: 'bg-yellow-400/10 border-yellow-400/30', emoji: '\u{1F3C6}' };
  if (bets >= 15 && winRate >= 50) return { name: 'SILVER', color: 'text-gray-300', badgeBg: 'bg-gray-400/10 border-gray-400/30', emoji: '\u{1F948}' };
  if (bets >= 5) return { name: 'BRONZE', color: 'text-orange-400', badgeBg: 'bg-orange-400/10 border-orange-400/30', emoji: '\u{1F949}' };
  return { name: 'ROOKIE', color: 'text-base-content/50', badgeBg: 'bg-base-content/5 border-base-content/10', emoji: '\u{1F331}' };
}

function WinRateRing({ rate, size = 120 }: { rate: number; size?: number }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (rate / 100) * circ;
  const color = rate >= 60 ? '#22c55e' : rate >= 40 ? '#eab308' : '#ef4444';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-base-100" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold" style={{ color }}>{rate}%</span>
        <span className="text-[9px] text-base-content/30">WIN RATE</span>
      </div>
    </div>
  );
}


export function ProfilePage() {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!publicKey) return;
    async function loadProfile() {
      setLoading(true);
      setLoadError(null);
      try {
        const [profilePda] = PublicKey.findProgramAddressSync(
          [PROFILE_SEED, publicKey!.toBuffer()], PROGRAM_ID
        );
        const info = await connection.getAccountInfo(profilePda);
        if (!info) { setProfile(null); return; }
        const data = info.data;
        let offset = 8 + 32;
        const totalBets = Number(data.readBigUInt64LE(offset)); offset += 8;
        const correctPredictions = Number(data.readBigUInt64LE(offset)); offset += 8;
        const totalVolume = Number(data.readBigUInt64LE(offset)); offset += 8;
        const currentStreak = data.readUInt16LE(offset); offset += 2;
        const bestStreak = data.readUInt16LE(offset); offset += 2;
        const earnings = Number(data.readBigUInt64LE(offset));
        setProfile({ totalBets, correctPredictions, totalVolume, currentStreak, bestStreak, earnings });
      } catch {
        setLoadError('Failed to load profile');
        setProfile(null);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [publicKey, connection]);

  if (!publicKey) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center space-y-4">
        <div className="text-6xl">{'\u{1F3B0}'}</div>
        <h2 className="text-xl font-bold">Connect Your Wallet</h2>
        <p className="text-sm text-base-content/40 max-w-xs">Connect your Solana wallet to view your prediction stats and claim rewards</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <span className="loading loading-spinner loading-lg text-error" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="text-center py-20 text-base-content/40 space-y-2">
        <p className="text-error">{loadError}</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center space-y-4">
        <div className="text-6xl">{'\u{1F52E}'}</div>
        <h2 className="text-xl font-bold">No Bets Yet</h2>
        <p className="text-sm text-base-content/40 max-w-xs">Place your first prediction to start building your profile</p>
        <Link to="/app" className="btn btn-error btn-sm">Browse Markets</Link>
      </div>
    );
  }

  const winRate = profile.totalBets > 0 ? Math.round((profile.correctPredictions / profile.totalBets) * 100) : 0;
  const lossRate = profile.totalBets > 0 ? profile.totalBets - profile.correctPredictions : 0;
  const rank = getRank(profile.totalBets, winRate);
  const avgBet = profile.totalBets > 0 ? profile.totalVolume / profile.totalBets / 1e9 : 0;
  const addr = publicKey.toBase58();

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      {/* Header card */}
      <div className="glass-panel rounded-xl p-5">
        <div className="flex items-center gap-4">
          {/* Avatar from wallet */}
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-error to-success flex items-center justify-center text-2xl font-bold text-base-100 shrink-0">
            {addr.slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-base-content/70 truncate">{addr.slice(0, 6)}...{addr.slice(-4)}</span>
              <span className={`badge badge-sm ${rank.color} ${rank.badgeBg} font-bold gap-1 border`}>
                {rank.emoji} {rank.name}
              </span>
            </div>
            <div className="text-xs text-base-content/30 mt-1">
              {profile.totalBets} predictions made
            </div>
          </div>
          <div className="shrink-0">
            <WinRateRing rate={winRate} />
          </div>
        </div>
      </div>

      {/* Main stats */}
      <div className="grid grid-cols-2 gap-2">
        {/* Total Bets */}
        <div className="bg-base-200 rounded-xl p-3 space-y-2 border border-base-content/5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-base-content/30 uppercase">Total Bets</span>
            <span className="text-lg font-bold">{profile.totalBets}</span>
          </div>
          <div className="flex gap-1 h-1.5">
            {Array.from({ length: Math.min(profile.totalBets, 30) }).map((_, i) => (
              <div key={i} className={`flex-1 rounded-full ${i < profile.correctPredictions ? 'bg-success' : 'bg-error'}`} />
            ))}
            {profile.totalBets === 0 && <div className="flex-1 rounded-full bg-base-content/10" />}
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-success">{profile.correctPredictions}W</span>
            <span className="text-error">{lossRate}L</span>
          </div>
        </div>

        {/* Earnings */}
        <div className="bg-base-200 rounded-xl p-3 space-y-2 border border-base-content/5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-base-content/30 uppercase">Earnings</span>
            <span className={`text-lg font-bold ${profile.earnings >= 0 ? 'text-success' : 'text-error'}`}>
              {profile.earnings >= 0 ? '+' : ''}{(profile.earnings / 1e9).toFixed(2)} SOL
            </span>
          </div>
          <div className="w-full h-1.5 bg-base-content/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${profile.earnings >= 0 ? 'bg-success' : 'bg-error'}`}
              style={{ width: `${Math.min(100, Math.abs(profile.earnings / profile.totalVolume) * 100 + 50)}%` }}
            />
          </div>
          <div className="text-[10px] text-base-content/40">
            ROI: {profile.totalVolume > 0 ? ((profile.earnings / profile.totalVolume) * 100).toFixed(1) : '0'}%
          </div>
        </div>

        {/* Streak */}
        <div className="bg-base-200 rounded-xl p-3 space-y-2 border border-base-content/5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-base-content/30 uppercase">Streak</span>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-bold text-warning">{profile.currentStreak}</span>
              {profile.currentStreak >= 3 && <span className="text-sm">{'\u{1F525}'}</span>}
            </div>
          </div>
          <div className="flex gap-0.5">
            {Array.from({ length: Math.max(profile.bestStreak, 5) }).map((_, i) => (
              <div key={i} className={`h-4 flex-1 rounded-sm ${
                i < profile.currentStreak ? 'bg-warning' : i < profile.bestStreak ? 'bg-warning/20' : 'bg-base-content/5'
              }`} />
            ))}
          </div>
          <div className="text-[10px] text-base-content/40">
            Best: {profile.bestStreak} {profile.bestStreak >= 5 ? '\u{2B50}' : ''}
          </div>
        </div>

        {/* Volume */}
        <div className="bg-base-200 rounded-xl p-3 space-y-2 border border-base-content/5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-base-content/30 uppercase">Volume</span>
            <span className="text-lg font-bold">{(profile.totalVolume / 1e9).toFixed(2)} <span className="text-xs text-base-content/40">SOL</span></span>
          </div>
          <div className="flex items-end gap-0.5 h-5">
            {[0.2, 0.5, 0.3, 0.8, 0.6, 1.0, 0.4, 0.7].map((h, i) => (
              <div key={i} className="flex-1 bg-base-content/10 rounded-t-sm" style={{ height: `${h * 100}%` }} />
            ))}
          </div>
          <div className="text-[10px] text-base-content/40">
            Avg: {avgBet.toFixed(3)} SOL/bet &middot; {avgBet > 0.5 ? 'High Roller' : avgBet > 0.1 ? 'Moderate' : 'Conservative'}
          </div>
        </div>
      </div>

      {/* Win/Loss bar */}
      <div className="glass-panel rounded-xl p-4 space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-success font-bold">{profile.correctPredictions} Wins</span>
          <span className="text-error font-bold">{lossRate} Losses</span>
        </div>
        <div className="w-full h-3 bg-base-100 rounded-full overflow-hidden flex">
          <div className="bg-success h-full rounded-l-full" style={{ width: `${winRate}%` }} />
          <div className="bg-error h-full flex-1 rounded-r-full" />
        </div>
      </div>

      {/* Performance summary */}
      <div className="glass-panel rounded-xl p-4">
        <div className="text-xs text-base-content/40 uppercase font-bold mb-2">Performance</div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-base-content/50">Accuracy</span>
            <span className={winRate >= 50 ? 'text-success font-bold' : 'text-error font-bold'}>
              {winRate}% {winRate >= 60 ? '(Good)' : winRate >= 50 ? '(Average)' : winRate >= 30 ? '(Below avg)' : '(Needs work)'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-base-content/50">ROI</span>
            <span className={profile.earnings >= 0 ? 'text-success font-bold' : 'text-error font-bold'}>
              {profile.totalVolume > 0 ? ((profile.earnings / profile.totalVolume) * 100).toFixed(1) : '0'}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-base-content/50">Risk Level</span>
            <span className={avgBet > 0.5 ? 'text-error' : avgBet > 0.1 ? 'text-warning' : 'text-success'}>
              {avgBet > 0.5 ? 'High Roller' : avgBet > 0.1 ? 'Moderate' : 'Conservative'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
