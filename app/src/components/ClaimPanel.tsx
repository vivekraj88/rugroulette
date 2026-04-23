import { useState, useEffect, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { useRugProgram } from '../hooks/useRugProgram';
import { deriveFactoryPda, deriveMarketPda, deriveBetPda, deriveProfilePda } from '../lib/pda';
import { parseBetAccount } from '../lib/format';
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

  useEffect(() => {
    if (!publicKey || !connection) { setUserBet(null); return; }
    let cancelled = false;
    const mintKey = new PublicKey(market.tokenMint);
    const [marketPda] = deriveMarketPda(mintKey);
    const [betPda] = deriveBetPda(marketPda, publicKey);
    connection.getAccountInfo(betPda).then((info) => {
      if (cancelled) return;
      if (!info) { setUserBet(null); return; }
      const parsed = parseBetAccount(info.data);
      if (parsed) {
        setUserBet({ side: parsed.side, amount: parsed.amount, claimed: parsed.claimed });
      } else {
        setUserBet(null);
      }
    }).catch(() => { if (!cancelled) setUserBet(null); });
    return () => { cancelled = true; };
  }, [publicKey, connection, market.pubkey, market.tokenMint]);

  const handleClaim = useCallback(async () => {
    if (!program || !publicKey) return;
    setClaiming(true);
    setError('');
    setSuccess('');

    try {
      const mintKey = new PublicKey(market.tokenMint);
      const [factory] = deriveFactoryPda();
      const [marketPda] = deriveMarketPda(mintKey);
      const [betPda] = deriveBetPda(marketPda, publicKey);
      const [profilePda] = deriveProfilePda(publicKey);

      const isCancelledMarket = market.status === 'Cancelled';

      if (isCancelledMarket) {
        await program.methods.claimRefund()
          .accountsPartial({
            market: marketPda,
            userBet: betPda,
            bettor: publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
      } else {
        await program.methods.claimWinnings()
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

      setSuccess(isCancelledMarket ? 'Refund claimed!' : 'Winnings claimed!');
      setUserBet((prev) => prev ? { ...prev, claimed: true } : prev);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
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
  }, [program, publicKey, market.tokenMint, market.status]);

  if (!publicKey) return null;

  if (userBet === undefined) {
    return (
      <div className="glass-panel rounded-xl p-4 flex justify-center">
        <span className="loading loading-spinner loading-sm text-error" aria-label="Loading bet data" />
      </div>
    );
  }

  if (userBet === null) return null;

  const isWinner = market.status === 'Resolved' && (
    (market.result === true && userBet.side === 'rug') ||
    (market.result === false && userBet.side === 'legit')
  );
  const isCancelled = market.status === 'Cancelled';
  const canClaim = (isWinner || isCancelled) && !userBet.claimed;

  const betAmountSol = (userBet.amount / 1e9).toFixed(3);

  return (
    <div className={`glass-panel rounded-xl p-4 space-y-3 ${isWinner && !userBet.claimed ? 'glow-green' : ''}`} role="region" aria-label="Your bet status">
      <h3 className="font-bold text-sm">Your Bet</h3>
      <div className="flex justify-between items-center text-sm">
        <span>
          <span className={userBet.side === 'rug' ? 'text-error font-bold' : 'text-success font-bold'}>
            {userBet.side === 'rug' ? '\u2620' : '\u2713'} {userBet.side.toUpperCase()}
          </span>
          {' '}&mdash;{' '}{betAmountSol} SOL
        </span>
        {userBet.claimed && (
          <span className="badge badge-ghost badge-xs">claimed</span>
        )}
      </div>
      {isWinner && !userBet.claimed && (
        <div className="bg-success/10 border border-success/20 rounded-lg px-3 py-2 text-center" role="status">
          <span className="text-success font-bold text-lg text-glow-green">{'\u{1F389}'} You won!</span>
        </div>
      )}
      {market.status === 'Resolved' && !isWinner && (
        <div className="text-sm text-error/70">Better luck next time</div>
      )}
      {canClaim && (
        <button
          className={`btn w-full transition-all duration-200 ${
            isCancelled
              ? 'btn-warning'
              : 'btn-success animate-pulse-glow hover:shadow-[0_0_25px_rgba(34,197,94,0.4)]'
          }`}
          onClick={handleClaim}
          disabled={claiming}
          aria-busy={claiming}
        >
          {claiming ? (
            <span className="loading loading-spinner loading-sm" />
          ) : isCancelled ? 'Claim Refund' : 'Claim Winnings'}
        </button>
      )}
      {error && (
        <div className="bg-error/10 border border-error/20 rounded-lg px-3 py-2" role="alert">
          <p className="text-error text-xs">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-success/10 border border-success/20 rounded-lg px-3 py-2" role="status">
          <p className="text-success text-xs font-bold">{success}</p>
        </div>
      )}
    </div>
  );
}
