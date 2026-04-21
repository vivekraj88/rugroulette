import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

const navItems = [
  { to: '/app', label: 'Markets' },
  { to: '/app/history', label: 'History' },
  { to: '/app/leaderboard', label: 'Leaderboard' },
  { to: '/app/profile', label: 'Profile' },
];

function linkClass({ isActive }: { isActive: boolean }) {
  return `btn btn-ghost btn-sm text-xs transition-colors ${
    isActive ? 'text-error border-b-2 border-error' : 'text-base-content/60 hover:text-base-content'
  }`;
}

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav
      className="navbar bg-base-200/80 backdrop-blur-md border-b border-base-content/10 px-4 sticky top-0 z-50 shadow-[0_1px_20px_rgba(239,68,68,0.08)]"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex-1 gap-2 sm:gap-3">
        <NavLink to="/app" className="text-xl font-bold tracking-wider flex items-center gap-1" aria-label="RugRoulette home">
          <span className="text-error text-glow-red">RUG</span>
          <span className="text-success text-glow-green">ROULETTE</span>
        </NavLink>

        {/* Desktop nav */}
        <div className="hidden sm:flex gap-1">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={linkClass} end={item.to === '/app'}>
              {item.label}
            </NavLink>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="badge badge-xs badge-outline text-[9px] text-base-content/30 border-base-content/15 hidden sm:inline-flex">
          devnet
        </span>
        <WalletMultiButton className="!bg-error hover:!bg-red-600 !text-xs !h-9 !rounded-lg !font-mono" />

        {/* Mobile hamburger */}
        <button
          className="btn btn-ghost btn-sm sm:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="absolute top-full left-0 right-0 bg-base-200/95 backdrop-blur-md border-b border-base-content/10 sm:hidden flex flex-col p-2 gap-1 shadow-lg">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/app'}
              className={({ isActive }) =>
                `btn btn-ghost btn-sm justify-start text-xs ${isActive ? 'text-error' : 'text-base-content/60'}`
              }
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      )}
    </nav>
  );
}
