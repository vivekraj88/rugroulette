import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
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

export function ProfilePage() {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!publicKey) return;

    async function loadProfile() {
      setLoading(true);
      try {
        const [profilePda] = PublicKey.findProgramAddressSync(
          [PROFILE_SEED, publicKey!.toBuffer()],
          PROGRAM_ID
        );
        const info = await connection.getAccountInfo(profilePda);
        if (!info) {
          setProfile(null);
          return;
        }
        const data = info.data;
        let offset = 8 + 32; // disc + user pubkey
        const totalBets = Number(data.readBigUInt64LE(offset)); offset += 8;
        const correctPredictions = Number(data.readBigUInt64LE(offset)); offset += 8;
        const totalVolume = Number(data.readBigUInt64LE(offset)); offset += 8;
        const currentStreak = data.readUInt16LE(offset); offset += 2;
        const bestStreak = data.readUInt16LE(offset); offset += 2;
        const earnings = Number(data.readBigUInt64LE(offset));
        setProfile({ totalBets, correctPredictions, totalVolume, currentStreak, bestStreak, earnings });
      } catch {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [publicKey, connection]);

  if (!publicKey) {
    return (
      <div className="p-4 text-center py-20 text-gray-500">
        <p className="text-lg">Connect your wallet to see your profile</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <span className="loading loading-spinner loading-lg text-rug" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-4 text-center py-20 text-gray-500">
        <p className="text-lg">No bets yet</p>
        <p className="text-xs mt-2">Place your first bet to create your profile</p>
      </div>
    );
  }

  const winRate = profile.totalBets > 0
    ? Math.round((profile.correctPredictions / profile.totalBets) * 100)
    : 0;

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <h1 className="text-xl font-bold">Your <span className="text-rug">Profile</span></h1>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="card bg-base-300 border border-gray-800 p-4 text-center">
          <div className="text-2xl font-bold text-white">{profile.totalBets}</div>
          <div className="text-[10px] text-gray-500">Total Bets</div>
        </div>
        <div className="card bg-base-300 border border-gray-800 p-4 text-center">
          <div className="text-2xl font-bold text-legit">{winRate}%</div>
          <div className="text-[10px] text-gray-500">Win Rate</div>
        </div>
        <div className="card bg-base-300 border border-gray-800 p-4 text-center">
          <div className="text-2xl font-bold text-yellow-400">{profile.currentStreak}</div>
          <div className="text-[10px] text-gray-500">Current Streak</div>
        </div>
        <div className="card bg-base-300 border border-gray-800 p-4 text-center">
          <div className="text-2xl font-bold text-white">{profile.bestStreak}</div>
          <div className="text-[10px] text-gray-500">Best Streak</div>
        </div>
        <div className="card bg-base-300 border border-gray-800 p-4 text-center">
          <div className="text-2xl font-bold text-white">
            {(profile.totalVolume / 1e9).toFixed(2)}
          </div>
          <div className="text-[10px] text-gray-500">Volume (SOL)</div>
        </div>
        <div className="card bg-base-300 border border-gray-800 p-4 text-center">
          <div className="text-2xl font-bold text-legit">
            {(profile.earnings / 1e9).toFixed(3)}
          </div>
          <div className="text-[10px] text-gray-500">Earnings (SOL)</div>
        </div>
      </div>
    </div>
  );
}
