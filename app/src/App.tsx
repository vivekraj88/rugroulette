import { Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { MarketsPage } from './pages/MarketsPage';
import { MarketDetailPage } from './pages/MarketDetailPage';
import { ProfilePage } from './pages/ProfilePage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { HistoryPage } from './pages/HistoryPage';
import { NotFoundPage } from './pages/NotFoundPage';

export default function App() {
  return (
    <div className="min-h-screen bg-base-100 font-mono" data-theme="rugroulette">
      <Navbar />
      <main role="main">
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
