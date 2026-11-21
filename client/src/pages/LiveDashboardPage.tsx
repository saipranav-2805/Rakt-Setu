import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useEventSource } from '../hooks/useEventSource';
import {
  Radio, Phone, MessageSquare, Clock, ShieldCheck,
  Copy, Check, ChevronLeft, Droplets, Users, Ambulance,
  Waves, MapPin, Zap
} from 'lucide-react';

const WAVE_CONFIG = [
  { wave: 1, radius: '5 km',  label: 'Hyperlocal', color: 'bg-blue-500' },
  { wave: 2, radius: '15 km', label: 'District',   color: 'bg-indigo-500' },
  { wave: 3, radius: '30 km', label: 'City-wide',  color: 'bg-purple-500' },
  { wave: 4, radius: '50 km', label: 'Regional',   color: 'bg-blood-600' },
];

function LivePulse({ connected }: { connected: boolean }) {
  return (
    <div className={`flex items-center space-x-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border ${
      connected
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : 'bg-slate-50 text-slate-500 border-slate-200'
    }`}>
      <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500 live-dot' : 'bg-slate-400'}`} />
      <Radio className="w-3.5 h-3.5" />
      <span>{connected ? 'Live Stream' : 'Syncing'}</span>
    </div>
  );
}

function WaveProgressBar({ currentWave, radiusKm }: { currentWave: number; radiusKm: number }) {
  const percent = Math.min(100, (currentWave / 4) * 100);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-2 font-bold text-slate-700">
          <Waves className="w-4 h-4 text-blue-500" />
          <span>Wave {currentWave || 1} of 4 Active</span>
        </div>
        <div className="flex items-center space-x-1.5 text-blood-700 font-bold">
          <MapPin className="w-3.5 h-3.5" />
          <span>~{radiusKm || 5} km radius</span>
        </div>
      </div>

      {/* Segmented bar */}
      <div className="flex gap-1.5">
        {WAVE_CONFIG.map(({ wave, radius, label, color }) => (
          <div key={wave} className="flex-1">
            <div className={`h-2.5 rounded-full transition-all duration-500 ${
              wave <= (currentWave || 1) ? color : 'bg-slate-200'
            }`} />
            <div className="text-[10px] text-slate-500 font-semibold mt-1 text-center hidden sm:block">
              W{wave} · {radius}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between text-[10px] text-slate-400 font-medium sm:hidden">
        <span>W1 (5km)</span>
        <span>W2 (15km)</span>
        <span>W3 (30km)</span>
        <span>W4 (50km)</span>
      </div>

      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-gradient-to-r from-blue-400 to-blood-600 h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function DonorCard({ acc }: { acc: any }) {
  const isAccepted = acc.status === 'ACCEPTED';
  return (
    <div className={`rounded-2xl border p-4 space-y-3 card-lift ${
      isAccepted
        ? 'bg-emerald-50 border-emerald-200'
        : 'bg-amber-50 border-amber-200'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm ${
            isAccepted ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-white'
          }`}>
            {(acc.donorFirstName || 'D')[0]}
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">{acc.donorFirstName || 'Anonymous'} (Verified)</h3>
            <div className="flex items-center space-x-2 mt-0.5">
              <span className="text-xs text-slate-500">Blood:</span>
              <span className="text-xs font-black text-blood-700 bg-blood-100 px-1.5 py-0.5 rounded">
                {acc.bloodGroup}
              </span>
            </div>
          </div>
        </div>
        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wide ${
          isAccepted ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
        }`}>
          {acc.status}
        </span>
      </div>

      {acc.contactUnlocked && acc.phone ? (
        <div className="flex gap-2 pt-1">
          <a
            href={`tel:${acc.phone}`}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-colors"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Call Donor</span>
          </a>
          <a
            href={`https://wa.me/${acc.phone.replace(/\D/g, '')}`}
            target="_blank"
            rel="noreferrer"
            className="flex-1 bg-[#25D366] hover:bg-[#1db954] text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </a>
        </div>
      ) : (
        <p className="text-[11px] text-slate-400 italic bg-white/60 px-3 py-2 rounded-lg border border-slate-200">
          🔒 Contact masked for privacy. Unlocked upon verified acceptance.
        </p>
      )}
    </div>
  );
}

export default function LiveDashboardPage() {
  const { code } = useParams<{ code: string }>();
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [simulating, setSimulating] = useState(false);

  const fetchRequest = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/requests/${code}`);
      const data = await res.json();
      if (data.success) setRequest(data.request);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [code]);

  // Initial fetch
  useEffect(() => {
    fetchRequest();
  }, [fetchRequest]);

  // Continuous fallback polling every 2s while search is active
  useEffect(() => {
    if (!request) return;
    const isTerminal = request.state === 'FULFILLED' || request.state === 'CANCELLED' || request.state === 'EXPIRED';
    if (isTerminal) return;

    const interval = setInterval(() => {
      fetchRequest();
    }, 2000);

    return () => clearInterval(interval);
  }, [request?.state, fetchRequest]);

  // SSE Stream
  const sseUrl = request?.id ? `/api/v1/requests/${request.id}/stream` : null;
  const { data: sseEvent, connected } = useEventSource(sseUrl);

  useEffect(() => {
    if (!sseEvent) return;
    if (sseEvent.type === 'WAVE_ADVANCED') {
      setRequest((prev: any) =>
        prev ? { ...prev, currentWave: sseEvent.payload.wave, radiusKm: sseEvent.payload.radiusKm } : prev
      );
    } else if (sseEvent.type === 'DONOR_ACCEPTED' || sseEvent.type === 'DONOR_WAITLISTED') {
      fetchRequest();
    }
  }, [sseEvent, fetchRequest]);

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSimulateDonorResponse = async () => {
    setSimulating(true);
    try {
      const res = await fetch(`/api/v1/requests/${code}/simulate-accept`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        await fetchRequest();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSimulating(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 pt-2">
        <div className="bg-white rounded-2xl p-8 border border-slate-200 animate-pulse">
          <div className="h-6 bg-slate-200 rounded-xl w-1/3 mb-3" />
          <div className="h-4 bg-slate-100 rounded-xl w-1/2 mb-6" />
          <div className="h-3 bg-slate-200 rounded-full" />
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="max-w-xl mx-auto bg-white rounded-2xl p-10 border border-slate-200 text-center space-y-4 pt-4">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
          <Droplets className="w-8 h-8 text-slate-400" />
        </div>
        <h2 className="text-xl font-black text-slate-800">Request Not Found</h2>
        <p className="text-sm text-slate-500">
          The request code <strong>#{code}</strong> does not exist or has expired.
        </p>
        <Link to="/" className="inline-flex items-center space-x-2 text-blood-700 font-bold text-sm hover:underline">
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
      </div>
    );
  }

  const isFulfilled = request.state === 'FULFILLED';
  const confirmedCount = request.unitsConfirmed ?? 0;
  const neededCount = request.unitsNeeded ?? 0;
  const fillPercent = neededCount > 0 ? Math.min(100, (confirmedCount / neededCount) * 100) : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-5 pt-2">

      {/* ── Main Status Card ── */}
      <div className={`rounded-2xl shadow-sm border p-6 sm:p-8 ${
        isFulfilled
          ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200'
          : 'bg-white border-slate-200'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${
              isFulfilled ? 'bg-emerald-500' : 'bg-blood-700'
            }`}>
              <Ambulance className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                <h1 className="text-xl sm:text-2xl font-black text-slate-800">Request #{request.code}</h1>
                <span className={`text-xs px-2.5 py-1 rounded-full font-black uppercase tracking-wide ${
                  isFulfilled
                    ? 'bg-emerald-100 text-emerald-800'
                    : request.state === 'MATCHING'
                    ? 'bg-blood-100 text-blood-800'
                    : 'bg-slate-100 text-slate-700'
                }`}>
                  {request.state}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                {request.hospital?.name} · Patient Blood: <strong className="text-blood-700 font-black">{request.patient?.bloodGroup}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <LivePulse connected={connected} />
            <button
              onClick={copyShareLink}
              className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied!' : 'Share'}</span>
            </button>
          </div>
        </div>

        {/* Units progress */}
        <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center space-x-2 text-sm font-bold text-slate-700">
              <Droplets className="w-4 h-4 text-blood-600" />
              <span>Units Confirmed</span>
            </div>
            <span className="text-sm font-black">
              <span className={isFulfilled ? 'text-emerald-600' : 'text-blood-700'}>{confirmedCount}</span>
              <span className="text-slate-400"> / {neededCount}</span>
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${isFulfilled ? 'bg-emerald-500' : 'bg-blood-600'}`}
              style={{ width: `${fillPercent}%` }}
            />
          </div>
        </div>

        {/* Wave progress */}
        <WaveProgressBar currentWave={request.currentWave || 1} radiusKm={request.radiusKm || 5} />
      </div>

      {/* ── Demo Acceleration Banner ── */}
      {!isFulfilled && (
        <div className="bg-gradient-to-r from-amber-500/10 via-blood-500/10 to-emerald-500/10 border border-amber-300/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-sm">
          <div className="flex items-center space-x-2.5 text-slate-700">
            <Zap className="w-4 h-4 text-amber-500 flex-shrink-0 animate-bounce" />
            <div>
              <span className="font-bold text-slate-800">Fast Wave Search Active:</span>
              <span className="text-slate-600 ml-1">Expanding wave radius every 6 seconds. You can also simulate an immediate donor response:</span>
            </div>
          </div>
          <button
            onClick={handleSimulateDonorResponse}
            disabled={simulating}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-2.5 rounded-xl flex items-center space-x-1.5 shadow-md transition-all whitespace-nowrap disabled:opacity-60"
          >
            <Zap className="w-3.5 h-3.5 fill-white" />
            <span>{simulating ? 'Processing...' : '⚡ Accept as Donor Now'}</span>
          </button>
        </div>
      )}

      {/* ── Responding Donors Card ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-black text-slate-800 flex items-center space-x-2">
            <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <span>Responding Donors</span>
          </h2>
          <span className="text-sm font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
            {request.acceptances?.length || 0} responded
          </span>
        </div>

        {!request.acceptances || request.acceptances.length === 0 ? (
          <div className="text-center py-10 space-y-4">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
              <Users className="w-8 h-8 text-blood-500 animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700">Dispatching Waves & Scanning nearby donors...</p>
              <p className="text-xs text-slate-400 mt-1">
                WhatsApp alerts dispatched to voluntary donors within {request.radiusKm || 5} km.
              </p>
            </div>
            <div className="flex items-center justify-center space-x-2 text-xs text-slate-500">
              <Clock className="w-4 h-4 text-amber-500 animate-spin" style={{ animationDuration: '2s' }} />
              <span>Auto-escalating wave radius every 6 seconds</span>
            </div>
            <button
              onClick={handleSimulateDonorResponse}
              disabled={simulating}
              className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all mt-2"
            >
              <Zap className="w-3.5 h-3.5 fill-white" />
              <span>{simulating ? 'Processing Acceptance...' : '⚡ Simulate Instant Donor Response'}</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {request.acceptances.map((acc: any) => (
              <DonorCard key={acc.id} acc={acc} />
            ))}
          </div>
        )}
      </div>

      {/* Back link */}
      <div className="text-center pt-2">
        <Link to="/" className="inline-flex items-center space-x-1.5 text-sm text-slate-500 hover:text-blood-700 font-medium">
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
      </div>
    </div>
  );
}
