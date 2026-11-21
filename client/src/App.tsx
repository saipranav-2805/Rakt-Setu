import { Routes, Route, Link } from 'react-router-dom';
import HomePage from './pages/HomePage';
import CreateRequestPage from './pages/CreateRequestPage';
import LiveDashboardPage from './pages/LiveDashboardPage';
import DonorOnboardingPage from './pages/DonorOnboardingPage';
import DonorResponsePage from './pages/DonorResponsePage';
import AdminPage from './pages/AdminPage';
import { HeartHandshake, ShieldAlert } from 'lucide-react';

export default function App() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Emergency Header */}
      <header className="bg-blood-800 text-white px-4 py-3 shadow-md sticky top-0 z-50 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2 font-bold text-xl tracking-tight">
          <HeartHandshake className="w-6 h-6 text-blood-100" />
          <span>RaktSetu</span>
          <span className="text-xs bg-blood-600 px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">
            Emergency
          </span>
        </Link>
        <div className="flex items-center space-x-4 text-sm font-medium">
          <Link to="/register-donor" className="hover:text-blood-100">
            Donor Hub
          </Link>
          <Link to="/admin" className="hover:text-blood-100 text-xs flex items-center space-x-1 opacity-80">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Admin</span>
          </Link>
        </div>
      </header>

      {/* Main Content View */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/request/new" element={<CreateRequestPage />} />
          <Route path="/r/:code" element={<LiveDashboardPage />} />
          <Route path="/register-donor" element={<DonorOnboardingPage />} />
          <Route path="/respond/:code" element={<DonorResponsePage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </main>

      {/* Footer & NBTC Disclaimer */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-6 px-4 text-center border-t border-slate-800 space-y-2">
        <p className="max-w-xl mx-auto">
          ⚠️ <strong>Medical Disclaimer:</strong> RaktSetu is a voluntary coordination platform. We do not provide
          medical screening, diagnosis, or sell blood. Selling blood is illegal under Indian law. Final eligibility is
          determined solely by certified medical personnel.
        </p>
        <p className="text-slate-500">Adheres to DPDP Act 2023 & NBTC voluntary donation guidelines.</p>
      </footer>
    </div>
  );
}
