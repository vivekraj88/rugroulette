import { useState, useEffect, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { useRugProgram } from '../hooks/useRugProgram';
import { deriveFactoryPda, deriveMarketPda, deriveBetPda, deriveProfilePda } from '../lib/pda';
import { parseBetAccount } from '../lib/format';

interface BetPanelProps {
  tokenMint: string;
  disabled?: boolean;
}

export function BetPanel({ tokenMint, disabled }: BetPanelProps) {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const { program } = useRugProgram();
  const [side, setSide] = useState<'rug' | 'legit'>('rug');
  const [amount, setAmount] = useState('0.1');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [alreadyBet, setAlreadyBet] = useState(false);
  const [checking, setChecking] = useState(true);
  const [existingBetSide, setExistingBetSide] = useState<'rug' | 'legit' | null>(null);
  const [existingBetAmount, setExistingBetAmount] = useState<number>(0);

  useEffect(() => {
    if (!publicKey || !connection) { setChecking(false); return; }

    const mintKey = new PublicKey(tokenMint);
    const [marketPda] = deriveMarketPda(mintKey);
    const [betPda] = deriveBetPda(marketPda, publicKey);

    connection.getAccountInfo(betPda).then((info) => {
      if (info) {
        setAlreadyBet(true);
        const parsed = parseBetAccount(info.data);
        if (parsed) {
          setExistingBetSide(parsed.side);
          setExistingBetAmount(parsed.amount);
        }
      }
      setChecking(false);
    }).catch(() => setChecking(false));
  }, [publicKey, connection, tokenMint, success]);

  const placeBet = useCallback(async () => {
    if (!program || !publicKey) return;
    setPlacing(true);
    setError('');
    setSuccess('');

    try {
      const mintKey = new PublicKey(tokenMint);

      const [factory] = deriveFactoryPda();
      const [marketPda] = deriveMarketPda(mintKey);
      const [userBet] = deriveBetPda(marketPda, publicKey);
      const [userProfile] = deriveProfilePda(publicKey);

      const parsed = parseFloat(amount.replace(',', '.'));
      if (isNaN(parsed) || parsed <= 0) {
        setError('Enter a valid bet amount');
        setPlacing(false);
        return;
      }
      const lamports = Math.floor(parsed * LAMPORTS_PER_SOL);
      const betSide = side === 'rug' ? { rug: {} } : { legit: {} };

      const existingBet = await program.provider.connection.getAccountInfo(userBet);
      if (existingBet) {
        setError('You already have a bet on this market');
        setAlreadyBet(true);
        setPlacing(false);
        return;
      }

      await program.methods
        .placeBet(betSide, new BN(lamports))
        .accountsPartial({
          factory,
          market: marketPda,
          userBet,
          userProfile,
          bettor: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc({ commitment: 'confirmed' });

      setSuccess(`Bet placed! ${amount} SOL on ${side.toUpperCase()}`);
      setAlreadyBet(true);
      setExistingBetSide(side);
      setExistingBetAmount(lamports);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Bet failed — try again';
      if (msg.includes('0x0') || msg.includes('already in use') || msg.includes('already been processed')) {
        setError('You already have a bet on this market');
        setAlreadyBet(true);
      } else if (msg.includes('User rejected') || msg.includes('Transaction cancelled')) {
        setError('Transaction rejected');
      } else if (msg.includes('insufficient lamports')) {
        setError('Insufficient SOL balance');
      } else {
        setError(msg.slice(0, 120));
      }
    } finally {
      setPlacing(false);
    }
  }, [program, publicKey, tokenMint, amount, side]);

  if (!publicKey) {
    return (
      <div className="glass-panel rounded-xl p-4" role="region" aria-label="Bet panel">
        <p className="text-center text-base-content/40 text-sm">Connect wallet to place bets</p>
      </div>
    );
  }

  if (checking) {
    return (
      <div className="glass-panel rounded-xl p-4 flex justify-center">
        <span className="loading loading-spinner loading-sm text-error" aria-label="Loading bet status" />
      </div>
    );
  }

  // Show existing bet summary instead of hiding completely
  if (alreadyBet && !success) {
    return (
      <div className="glass-panel rounded-xl p-4 space-y-2" role="region" aria-label="Your active bet">
        <h3 className="font-bold text-sm flex items-center gap-2">
          Your Active Bet
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
          </span>
        </h3>
        {existingBetSide && (
          <div className="flex justify-between items-center text-sm">
            <span className={`font-bold ${existingBetSide === 'rug' ? 'text-error' : 'text-success'}`}>
              {existingBetSide.toUpperCase()}
            </span>
            <span className="text-base-content/60">{(existingBetAmount / 1e9).toFixed(3)} SOL</span>
          </div>
        )}
        <p className="text-[11px] text-base-content/30">Waiting for market resolution...</p>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-xl p-4 space-y-3" role="region" aria-label="Place your bet">
      <h3 className="font-bold text-sm">Place Your Bet</h3>

      <div className="flex gap-2" role="radiogroup" aria-label="Bet side">
        <button
          className={`btn flex-1 transition-all duration-200 ${
            side === 'rug'
              ? 'btn-error shadow-[0_0_15px_rgba(239,68,68,0.25)]'
              : 'btn-ghost border-base-content/10 hover:border-error/30'
          }`}
          onClick={() => setSide('rug')}
          aria-pressed={side === 'rug'}
        >
          {'\u2620'} RUG
        </button>
        <button
          className={`btn flex-1 transition-all duration-200 ${
            side === 'legit'
              ? 'btn-success shadow-[0_0_15px_rgba(34,197,94,0.25)]'
              : 'btn-ghost border-base-content/10 hover:border-success/30'
          }`}
          onClick={() => setSide('legit')}
          aria-pressed={side === 'legit'}
        >
          {'\u2713'} LEGIT
        </button>
      </div>

      <div className="form-control">
        <label className="label py-1" htmlFor="bet-amount">
          <span className="label-text text-[11px]">Amount (SOL)</span>
        </label>
        <input
          id="bet-amount"
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="input input-bordered input-sm bg-base-200 w-full font-mono focus:border-error/50 transition-colors"
          aria-label="Bet amount in SOL"
        />
        <div className="flex gap-1.5 mt-1.5">
          {['0.05', '0.1', '0.25', '0.5', '1'].map((v) => (
            <button
              key={v}
              className={`btn btn-xs flex-1 text-[11px] transition-colors ${
                amount === v
                  ? 'btn-error btn-outline'
                  : 'bg-base-100 border border-base-content/10 hover:border-error/30'
              }`}
              onClick={() => setAmount(v)}
              aria-label={`Set bet to ${v} SOL`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <button
        className={`btn w-full transition-all duration-200 ${
          side === 'rug'
            ? 'btn-error hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]'
            : 'btn-success hover:shadow-[0_0_20px_rgba(34,197,94,0.3)]'
        }`}
        onClick={placeBet}
        disabled={disabled || placing}
        aria-busy={placing}
      >
        {placing ? (
          <span className="loading loading-spinner loading-sm" />
        ) : (
          `Bet ${amount} SOL on ${side.toUpperCase()}`
        )}
      </button>

      {error && (
        <div className="bg-error/10 border border-error/20 rounded-lg px-3 py-2" role="alert">
          <p className="text-error text-xs">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-success/10 border border-success/20 rounded-lg px-3 py-2 space-y-1" role="status">
          <p className="text-success text-xs font-bold">{success}</p>
          <p className="text-[11px] text-base-content/40">Track your bet in History when the market resolves</p>
        </div>
      )}
    </div>
  );
}
