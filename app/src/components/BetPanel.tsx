import { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { useRugProgram } from '../hooks/useProgram';
import { PROGRAM_ID, FACTORY_SEED, MARKET_SEED, BET_SEED, PROFILE_SEED } from '../lib/constants';

interface BetPanelProps {
  marketPubkey: string;
  tokenMint: string;
  disabled?: boolean;
}

export function BetPanel({ marketPubkey: _market, tokenMint, disabled }: BetPanelProps) {
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

  // Check if user already has a bet on this market
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

  async function placeBet() {
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

      // Check if bet already exists before sending tx
      const existingBet = await program.provider.connection.getAccountInfo(userBet);
      if (existingBet) {
        setError('You already have a bet on this market');
        setAlreadyBet(true);
        setPlacing(false);
        return;
      }

      const sig = await program.methods
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
      console.log('Bet tx:', sig);

      setSuccess(`Bet placed! ${amount} SOL on ${side.toUpperCase()}`);
      setAlreadyBet(true);
    } catch (err) {
      const msg = (err as any)?.message || 'Bet failed — try again';
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
  }

  if (!publicKey) {
    return (
      <div className="card bg-base-300 border border-gray-800 p-4">
        <p className="text-center text-gray-500 text-sm">Connect wallet to bet</p>
      </div>
    );
  }

  if (checking) return null;

  if (alreadyBet && !success) return null;

  return (
    <div className="card bg-base-300 border border-gray-800 p-4 space-y-3">
      <h3 className="font-bold text-sm">Place Your Bet</h3>

      {/* Side selector */}
      <div className="flex gap-2">
        <button
          className={`btn flex-1 btn-sm ${side === 'rug' ? 'btn-error' : 'btn-ghost border-gray-700'}`}
          onClick={() => setSide('rug')}
        >
          RUG
        </button>
        <button
          className={`btn flex-1 btn-sm ${side === 'legit' ? 'btn-success' : 'btn-ghost border-gray-700'}`}
          onClick={() => setSide('legit')}
        >
          LEGIT
        </button>
      </div>

      {/* Amount input */}
      <div className="form-control">
        <label className="label py-1">
          <span className="label-text text-[10px]">Amount (SOL)</span>
        </label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="input input-bordered input-sm bg-base-200 w-full font-mono"
        />
        <div className="flex gap-1 mt-1">
          {['0.05', '0.1', '0.25', '0.5', '1'].map((v) => (
            <button
              key={v}
              className="btn btn-xs btn-ghost text-[10px]"
              onClick={() => setAmount(v)}
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
      >
        {placing ? (
          <span className="loading loading-spinner loading-sm" />
        ) : (
          `Bet ${amount} SOL on ${side.toUpperCase()}`
        )}
      </button>

      {error && <p className="text-error text-xs">{error}</p>}
      {success && <p className="text-success text-xs">{success}</p>}
    </div>
  );
}
