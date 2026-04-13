import { Link } from 'react-router-dom';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export function Navbar() {
  return (
    <nav className="navbar bg-base-200 border-b border-gray-800 px-4">
      <div className="flex-1 gap-3">
        <Link to="/" className="text-xl font-bold text-rug tracking-wider">
          RUG<span className="text-legit">ROULETTE</span>
        </Link>
        <Link to="/" className="btn btn-ghost btn-sm text-xs">Markets</Link>
        <Link to="/profile" className="btn btn-ghost btn-sm text-xs">Profile</Link>
      </div>
      <div className="flex-none">
        <WalletMultiButton className="!bg-rug hover:!bg-red-600 !text-xs !h-9" />
      </div>
    </nav>
  );
}
