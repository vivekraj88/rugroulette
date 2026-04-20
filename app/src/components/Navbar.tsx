import { Link } from 'react-router-dom';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export function Navbar() {
  return (
    <nav className="navbar bg-base-200 border-b border-base-content/10 px-4" role="navigation" aria-label="Main navigation">
      <div className="flex-1 gap-2 sm:gap-3">
        <Link to="/" className="text-xl font-bold text-error tracking-wider" aria-label="RugRoulette home">
          RUG<span className="text-success">ROULETTE</span>
        </Link>
        <Link to="/" className="btn btn-ghost btn-sm text-xs">Markets</Link>
        <Link to="/history" className="btn btn-ghost btn-sm text-xs">History</Link>
        <Link to="/leaderboard" className="btn btn-ghost btn-sm text-xs">Leaderboard</Link>
        <Link to="/profile" className="btn btn-ghost btn-sm text-xs">Profile</Link>
      </div>
      <div className="flex-none">
        <WalletMultiButton className="!bg-error hover:!bg-red-600 !text-xs !h-9 !rounded-lg" />
      </div>
    </nav>
  );
}
