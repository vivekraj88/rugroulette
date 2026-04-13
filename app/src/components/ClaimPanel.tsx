import { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { useRugProgram } from '../hooks/useProgram';
import { PROGRAM_ID, FACTORY_SEED, MARKET_SEED, BET_SEED, PROFILE_SEED } from '../lib/constants';
import type { MarketAccount } from '../hooks/useMarkets';

interface ClaimPanelProps {
  market: MarketAccount;
}

interface UserBetData {
  side: 'rug' | 'legit';
  amount: number;
  claimed: boolean;
}

export function ClaimPanel({ market }: ClaimPanelProps) {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const { program } = useRugProgram();
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userBet, setUserBet] = useState<UserBetData | null | undefined>(undefined);

  // Fetch user's bet for this market
  useEffect(() => {
    if (!publicKey || !connection) { setUserBet(null); return; }
    let cancelled = false;
    const mintKey = new PublicKey(market.tokenMint);
    const [marketPda] = PublicKey.findProgramAddressSync(
      [MARKET_SEED, mintKey.toBuffer()],
      PROGRAM_ID
    );
    const [betPda] = PublicKey.findProgramAddressSync(
      [BET_SEED, marketPda.toBuffer(), publicKey.toBuffer()],
      PROGRAM_ID
    );
    connection.getAccountInfo(betPda).then((info) => {
      if (cancelled) return;
      if (!info) { setUserBet(null); return; }
      try {
        const data = info.data;
        // skip 8 discriminator + 32 user + 32 market
        let offset = 72;
        const sideByte = data[offset]; offset += 1;
        const amount = Number(data.readBigUInt64LE(offset)); offset += 8;
        offset += 8; // placed_at
        const claimed = data[offset] === 1;
        setUserBet({ side: sideByte === 0 ? 'rug' : 'legit', amount, claimed });
      } catch {
        setUserBet(null);
      }
    }).catch(() => { if (!cancelled) setUserBet(null); });
    return () => { cancelled = true; };
  }, [publicKey, connection, market.pubkey]);

  if (!publicKey || userBet === undefined) return null;
  if (userBet === null) return null;

  const isWinner = market.status === 'Resolved' && (
    (market.result === true && userBet.side === 'rug') ||
    (market.result === false && userBet.side === 'legit')
  );
  const isCancelled = market.status === 'Cancelled';
  const canClaim = (isWinner || isCancelled) && !userBet.claimed;

  async function handleClaim() {
    if (!program || !publicKey) return;
    setClaiming(true);
    setError('');
    setSuccess('');

    try {
      const mintKey = new PublicKey(market.tokenMint);
      const [factory] = PublicKey.findProgramAddressSync([FACTORY_SEED], PROGRAM_ID);
      const [marketPda] = PublicKey.findProgramAddressSync(
        [MARKET_SEED, mintKey.toBuffer()],
        PROGRAM_ID
      );
      const [betPda] = PublicKey.findProgramAddressSync(
        [BET_SEED, marketPda.toBuffer(), publicKey.toBuffer()],
        PROGRAM_ID
      );
      const [profilePda] = PublicKey.findProgramAddressSync(
        [PROFILE_SEED, publicKey.toBuffer()],
        PROGRAM_ID
      );

      if (isCancelled) {
        // claimRefund only needs: market, userBet, bettor, systemProgram
        await (program.methods as any).claimRefund()
          .accountsPartial({
            market: marketPda,
            userBet: betPda,
            bettor: publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
      } else {
        // claimWinnings needs: factory, market, userBet, userProfile, bettor, systemProgram
        await (program.methods as any).claimWinnings()
          .accountsPartial({
            factory,
            market: marketPda,
            userBet: betPda,
            userProfile: profilePda,
            bettor: publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
      }

      setSuccess(isCancelled ? 'Refund claimed!' : 'Winnings claimed!');
      setUserBet((prev) => prev ? { ...prev, claimed: true } : prev);
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes('User rejected')) {
        setError('Transaction rejected');
      } else if (msg.includes('AlreadyClaimed')) {
        setError('Already claimed');
        setUserBet((prev) => prev ? { ...prev, claimed: true } : prev);
      } else {
        setError(msg.slice(0, 100));
      }
    } finally {
      setClaiming(false);
    }
  }

  const betAmountSol = (userBet.amount / 1e9).toFixed(3);

  return (
    <div className="card bg-base-300 border border-gray-800 p-4 space-y-3">
      <h3 className="font-bold text-sm">Your Bet</h3>
      <div className="flex justify-between items-center text-sm">
        <span>
          <span className={userBet.side === 'rug' ? 'text-rug font-bold' : 'text-legit font-bold'}>
            {userBet.side.toUpperCase()}
          </span>
          {' '}&mdash;{' '}{betAmountSol} SOL
        </span>
        {userBet.claimed && (
          <span className="badge badge-ghost badge-xs">claimed</span>
        )}
      </div>
      {isWinner && !userBet.claimed && (
        <div className="text-sm text-legit font-bold">You won!</div>
      )}
      {market.status === 'Resolved' && !isWinner && (
        <div className="text-sm text-rug">Better luck next time</div>
      )}
      {canClaim && (
        <button
          className={`btn btn-sm w-full ${isCancelled ? 'btn-warning' : 'btn-success'}`}
          onClick={handleClaim}
          disabled={claiming}
        >
          {claiming ? (
            <span className="loading loading-spinner loading-sm" />
          ) : isCancelled ? 'Claim Refund' : 'Claim Winnings'}
        </button>
      )}
      {error && <p className="text-error text-xs">{error}</p>}
      {success && <p className="text-success text-xs">{success}</p>}
    </div>
  );
}
