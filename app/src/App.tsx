import { Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { MarketsPage } from './pages/MarketsPage';
import { MarketDetailPage } from './pages/MarketDetailPage';
import { ProfilePage } from './pages/ProfilePage';

export default function App() {
  return (
    <div className="min-h-screen bg-base-100 font-mono" data-theme="rugroulette">
      <Navbar />
      <Routes>
        <Route path="/" element={<MarketsPage />} />
        <Route path="/market/:pubkey" element={<MarketDetailPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>
    </div>
  );
}
