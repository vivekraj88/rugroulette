import { useState, useEffect, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { useRugProgram } from '../hooks/useRugProgram';
import { PROGRAM_ID, FACTORY_SEED, MARKET_SEED, BET_SEED, PROFILE_SEED } from '../lib/constants';

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

  useEffect(() => {
    if (!publicKey || !connection) { setChecking(false); return; }

    const mintKey = new PublicKey(tokenMint);
    const [marketPda] = PublicKey.findProgramAddressSync(
      [MARKET_SEED, mintKey.toBuffer()],
      PROGRAM_ID
    );
    const [betPda] = PublicKey.findProgramAddressSync(
      [BET_SEED, marketPda.toBuffer(), publicKey.toBuffer()],
      PROGRAM_ID
    );

    connection.getAccountInfo(betPda).then((info) => {
      setAlreadyBet(!!info);
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

      const [factory] = PublicKey.findProgramAddressSync([FACTORY_SEED], PROGRAM_ID);
      const [marketPda] = PublicKey.findProgramAddressSync(
        [MARKET_SEED, mintKey.toBuffer()],
        PROGRAM_ID
      );
      const [userBet] = PublicKey.findProgramAddressSync(
        [BET_SEED, marketPda.toBuffer(), publicKey.toBuffer()],
        PROGRAM_ID
      );
      const [userProfile] = PublicKey.findProgramAddressSync(
        [PROFILE_SEED, publicKey.toBuffer()],
        PROGRAM_ID
      );

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
      <div className="card bg-base-300 border border-base-content/10 p-4" role="region" aria-label="Bet panel">
        <p className="text-center text-base-content/40 text-sm">Connect wallet to place bets</p>
      </div>
    );
  }

  if (checking) {
    return (
      <div className="card bg-base-300 border border-base-content/10 p-4 flex justify-center">
        <span className="loading loading-spinner loading-sm text-error" aria-label="Loading bet status" />
      </div>
    );
  }

  if (alreadyBet && !success) return null;

  return (
    <div className="card bg-base-300 border border-base-content/10 p-4 space-y-3" role="region" aria-label="Place your bet">
      <h3 className="font-bold text-sm">Place Your Bet</h3>

      <div className="flex gap-2" role="radiogroup" aria-label="Bet side">
        <button
          className={`btn flex-1 btn-sm ${side === 'rug' ? 'btn-error' : 'btn-ghost border-base-content/10'}`}
          onClick={() => setSide('rug')}
          aria-pressed={side === 'rug'}
        >
          RUG
        </button>
        <button
          className={`btn flex-1 btn-sm ${side === 'legit' ? 'btn-success' : 'btn-ghost border-base-content/10'}`}
          onClick={() => setSide('legit')}
          aria-pressed={side === 'legit'}
        >
          LEGIT
        </button>
      </div>

      <div className="form-control">
        <label className="label py-1" htmlFor="bet-amount">
          <span className="label-text text-[10px]">Amount (SOL)</span>
        </label>
        <input
          id="bet-amount"
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="input input-bordered input-sm bg-base-200 w-full font-mono"
          aria-label="Bet amount in SOL"
        />
        <div className="flex gap-1 mt-1">
          {['0.05', '0.1', '0.25', '0.5', '1'].map((v) => (
            <button
              key={v}
              className="btn btn-xs btn-ghost text-[10px]"
              onClick={() => setAmount(v)}
              aria-label={`Set bet to ${v} SOL`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <button
        className={`btn btn-sm w-full ${side === 'rug' ? 'btn-error' : 'btn-success'}`}
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

      {error && <p className="text-error text-xs" role="alert">{error}</p>}
      {success && <p className="text-success text-xs" role="status">{success}</p>}
    </div>
  );
}
