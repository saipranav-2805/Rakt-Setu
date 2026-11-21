import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Heart, Users, ShieldCheck, Zap, Droplets,
  MapPin, Clock, Waves, ChevronRight, Ambulance
} from 'lucide-react';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

const BLOOD_COLORS: Record<string, string> = {
  'A+': 'from-rose-500 to-blood-700',
  'A-': 'from-rose-600 to-blood-800',
  'B+': 'from-orange-500 to-rose-600',
  'B-': 'from-orange-600 to-rose-700',
  'AB+': 'from-purple-500 to-blood-700',
  'AB-': 'from-purple-600 to-blood-800',
  'O+': 'from-blood-500 to-blood-800',
  'O-': 'from-blood-600 to-blood-950',
};

const STATS = [
  { label: 'Donors Ready', value: '5,000+', icon: Users, color: 'text-emerald-500' },
  { label: 'Avg Dispatch', value: '<60s', icon: Clock, color: 'text-amber-500' },
  { label: 'Search Radius', value: '50 km', icon: MapPin, color: 'text-blue-500' },
  { label: 'Wave Layers', value: '4 Waves', icon: Waves, color: 'text-purple-500' },
];

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Privacy by Design',
    desc: 'DPDP Act 2023 compliant. Donor phone numbers are masked until acceptance. No spam broadcasts.',
    color: 'bg-emerald-50 border-emerald-200',
    iconBg: 'bg-emerald-100 text-emerald-600',
  },
  {
    icon: Zap,
    title: 'Escalating Wave Scheduler',
    desc: 'BullMQ queues automatically expand search radius: 5 km → 15 km → 30 km → 50 km if unanswered.',
    color: 'bg-blue-50 border-blue-200',
    iconBg: 'bg-blue-100 text-blue-600',
  },
  {
    icon: Droplets,
    title: 'Atomic Concurrency Control',
    desc: 'Atomic conditional updates prevent over-allocation. Excess donors placed on ordered standby.',
    color: 'bg-blood-50 border-blood-200',
    iconBg: 'bg-blood-100 text-blood-700',
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [selectedGroup, setSelectedGroup] = useState<string>('');

  const handleStartRequest = () => {
    navigate(selectedGroup ? `/request/new?bloodGroup=${encodeURIComponent(selectedGroup)}` : '/request/new');
  };

  return (
    <div className="space-y-8">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blood-800 via-blood-900 to-slate-900 rounded-3xl shadow-2xl">
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-blood-700/20 rounded-full -translate-y-1/3 translate-x-1/3 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-blood-500/10 rounded-full translate-y-1/2 -translate-x-1/4 blur-2xl pointer-events-none" />

        <div className="relative px-6 py-10 sm:px-12 sm:py-14 text-center sm:text-left flex flex-col sm:flex-row items-center gap-8">
          <div className="flex-1 space-y-5">
            {/* Badge */}
            <div className="inline-flex items-center space-x-2 bg-blood-700/40 backdrop-blur border border-blood-500/30 px-3 py-1.5 rounded-full text-xs font-bold text-blood-200 uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-400 live-dot" />
              <span>Under 60-Second Dispatch</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight tracking-tight">
              Emergency Blood<br />
              <span className="text-blood-300">Donor Matching</span>
            </h1>
            <p className="text-blood-200 text-base leading-relaxed max-w-lg">
              Find eligible, verified voluntary donors nearby via automated WhatsApp wave dispatch.
              Never wait on chaotic social media groups again.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handleStartRequest}
                className="flex items-center justify-center space-x-2 bg-white text-blood-800 font-black px-6 py-3.5 rounded-xl shadow-lg hover:bg-blood-50 text-sm"
              >
                <Ambulance className="w-5 h-5" />
                <span>Request Blood Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate('/register-donor')}
                className="flex items-center justify-center space-x-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-6 py-3.5 rounded-xl text-sm"
              >
                <Heart className="w-4 h-4 text-blood-300" />
                <span>Become a Donor</span>
              </button>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 sm:min-w-[220px]">
            {STATS.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white/8 backdrop-blur border border-white/10 rounded-2xl p-4 text-center">
                <Icon className={`w-5 h-5 mx-auto mb-1 ${color}`} />
                <div className="text-xl font-black text-white">{value}</div>
                <div className="text-[10px] text-blood-300 font-medium mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Blood Group Selector ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-black text-slate-800 flex items-center space-x-2">
              <Droplets className="w-5 h-5 text-blood-600" />
              <span>Select Patient's Blood Group</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Tap to pre-fill the emergency request</p>
          </div>
          {selectedGroup && (
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-500">Selected:</span>
              <span className={`bg-gradient-to-br ${BLOOD_COLORS[selectedGroup]} text-white font-black text-sm px-3 py-1 rounded-lg shadow-sm`}>
                {selectedGroup}
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 mb-6">
          {BLOOD_GROUPS.map((group) => {
            const isSelected = selectedGroup === group;
            return (
              <button
                key={group}
                type="button"
                onClick={() => setSelectedGroup(isSelected ? '' : group)}
                className={`relative py-5 sm:py-6 rounded-2xl font-black text-lg flex flex-col items-center justify-center border-2 card-lift ${
                  isSelected
                    ? `blood-btn-selected bg-gradient-to-br ${BLOOD_COLORS[group]} text-white border-transparent`
                    : 'bg-slate-50 hover:bg-blood-50 hover:border-blood-300 text-slate-700 border-slate-200'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-white rounded-full opacity-80" />
                )}
                <span className="leading-none">{group}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleStartRequest}
            className="flex-1 bg-blood-700 hover:bg-blood-800 text-white font-black py-4 px-8 rounded-xl shadow-lg flex items-center justify-center space-x-2 text-sm"
          >
            <Ambulance className="w-5 h-5" />
            <span>Find Blood — Start Emergency Request</span>
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/register-donor')}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-4 px-6 rounded-xl flex items-center justify-center space-x-2 text-sm border border-slate-200"
          >
            <Users className="w-4 h-4 text-slate-500" />
            <span>Register as Voluntary Donor</span>
          </button>
        </div>
      </div>

      {/* ── Wave Process Steps ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
        <h2 className="text-base font-black text-slate-800 mb-5 flex items-center space-x-2">
          <Waves className="w-4 h-4 text-blue-500" />
          <span>How the 4-Wave Escalation Works</span>
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { wave: 1, radius: '5 km', delay: '0 min', label: 'Hyperlocal', color: 'bg-blue-50 border-blue-200 text-blue-700' },
            { wave: 2, radius: '15 km', delay: '+15 min', label: 'District', color: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
            { wave: 3, radius: '30 km', delay: '+30 min', label: 'City-wide', color: 'bg-purple-50 border-purple-200 text-purple-700' },
            { wave: 4, radius: '50 km', delay: '+60 min', label: 'Regional', color: 'bg-blood-50 border-blood-200 text-blood-700' },
          ].map(({ wave, radius, delay, label, color }) => (
            <div key={wave} className={`rounded-xl border p-4 text-center ${color}`}>
              <div className="text-2xl font-black mb-1">W{wave}</div>
              <div className="text-sm font-bold">{radius}</div>
              <div className="text-[10px] font-semibold uppercase tracking-wider opacity-70 mt-1">{label}</div>
              <div className="text-[10px] opacity-60 mt-0.5">{delay}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-4 text-center">
          If unfulfilled after Wave 1, BullMQ automatically escalates to the next wave radius. All 4 waves complete within 2 hours.
        </p>
      </div>

      {/* ── Feature Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {FEATURES.map(({ icon: Icon, title, desc, color, iconBg }) => (
          <div key={title} className={`bg-white p-6 rounded-2xl border shadow-sm card-lift ${color}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${iconBg}`}>
              <Icon className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm mb-2">{title}</h3>
            <p className="text-xs text-slate-600 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
