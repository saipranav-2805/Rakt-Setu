import { useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';
import CreateRequestPage from './pages/CreateRequestPage';
import LiveDashboardPage from './pages/LiveDashboardPage';
import DonorOnboardingPage from './pages/DonorOnboardingPage';
import DonorResponsePage from './pages/DonorResponsePage';
import AdminPage from './pages/AdminPage';
import { Heart, Users, ShieldAlert, Droplets, Zap } from 'lucide-react';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

function Header() {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <header className="bg-gradient-to-r from-blood-900 via-blood-800 to-blood-900 text-white sticky top-0 z-50 shadow-lg">
      <div className="max-w-6xl mx-auto px-4 py-0">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/20">
              <Droplets className="w-5 h-5 text-blood-200 heartbeat" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-black text-xl tracking-tight text-white">RaktSetu</span>
              <span className="text-[9px] text-blood-300 font-semibold uppercase tracking-widest -mt-0.5">
                Emergency Blood Platform
              </span>
            </div>
          </Link>

          {/* Center Demo Badge (compact & unobtrusive) */}
          <div className="hidden md:flex items-center space-x-2 bg-blood-950/70 border border-blood-700/60 px-3 py-1 rounded-full text-[11px] text-blood-200">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Fast Wave Dispatch (6s) · Demo OTP: <strong>123456</strong> · 5,000 Donors</span>
          </div>

          {/* Nav */}
          <nav className="flex items-center gap-1.5">
            {!isHome && (
              <Link
                to="/"
                className="hidden sm:flex items-center space-x-1.5 text-sm font-medium text-blood-200 hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg"
              >
                <Heart className="w-4 h-4" />
                <span>Home</span>
              </Link>
            )}
            <Link
              to="/register-donor"
              className="flex items-center space-x-1.5 text-sm font-semibold bg-white/10 hover:bg-white/20 text-white px-3.5 py-2 rounded-lg border border-white/15 transition-all"
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Become a Donor</span>
              <span className="sm:hidden">Donate</span>
            </Link>
            <Link
              to="/admin"
              className="flex items-center space-x-1 text-xs font-medium text-blood-300 hover:text-white px-2.5 py-2 rounded-lg opacity-80 hover:opacity-100"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Admin</span>
            </Link>
          </nav>
        </div>
      </div>

      {/* Slim mobile-only demo bar */}
      <div className="md:hidden bg-blood-950/90 border-t border-blood-800/80 py-1 px-3 text-center">
        <p className="text-[10px] text-blood-300 font-medium tracking-wide">
          ⚡ Demo Mode: Fast 6s Wave Schedule · OTP: 123456
        </p>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <ScrollToTop />
      <Header />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 pt-6 pb-12 sm:px-6 sm:pt-8 sm:pb-16">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/request/new" element={<CreateRequestPage />} />
          <Route path="/r/:code" element={<LiveDashboardPage />} />
          <Route path="/register-donor" element={<DonorOnboardingPage />} />
          <Route path="/respond/:code" element={<DonorResponsePage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </main>

      <footer className="bg-slate-900 border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Droplets className="w-4 h-4 text-blood-500" />
                <span className="font-bold text-white text-sm">RaktSetu</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Emergency blood donor matching via escalating wave notifications. Under 60-second dispatch to verified voluntary donors.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Compliance</h4>
              <ul className="text-xs text-slate-400 space-y-1">
                <li>DPDP Act 2023 — Data Privacy</li>
                <li>NBTC Voluntary Donation Guidelines</li>
                <li>Donor cooldown: 90-day (M) / 120-day (F)</li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Architecture</h4>
              <ul className="text-xs text-slate-400 space-y-1">
                <li>MongoDB 7.0 · Replica Set · $geoNear</li>
                <li>BullMQ Wave Scheduler · Redis 7.2 Pub/Sub</li>
                <li>Server-Sent Events · Atomic Locking</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-4 text-center">
            <p className="text-xs text-slate-500 leading-relaxed max-w-2xl mx-auto">
              ⚠️ <strong className="text-slate-400">Medical Disclaimer:</strong> RaktSetu is a voluntary coordination platform.
              We do not provide medical screening, diagnosis, or sell blood. Selling blood is illegal under Indian law.
              Final eligibility is determined solely by certified medical personnel.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
