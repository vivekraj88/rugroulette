import { Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { LandingPage } from './pages/LandingPage';
import { MarketsPage } from './pages/MarketsPage';
import { MarketDetailPage } from './pages/MarketDetailPage';
import { ProfilePage } from './pages/ProfilePage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { HistoryPage } from './pages/HistoryPage';
import { NotFoundPage } from './pages/NotFoundPage';

function AppLayout() {
  return (
    <div className="min-h-screen bg-base-100 font-mono relative" data-theme="rugroulette">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(239,68,68,0.06),transparent_50%)] pointer-events-none" />
      <Navbar />
      <main role="main" className="relative z-0">
        <Routes>
          <Route path="/" element={<MarketsPage />} />
          <Route path="/market/:pubkey" element={<MarketDetailPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/app/*" element={<AppLayout />} />
    </Routes>
  );
}
