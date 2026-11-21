import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useEventSource } from '../hooks/useEventSource';
import {
  Radio,
  Phone,
  MessageSquare,
  Clock,
  ShieldCheck,
  Copy,
  Check
} from 'lucide-react';

export default function LiveDashboardPage() {
  const { code } = useParams<{ code: string }>();
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Fetch initial request snapshot
  const fetchRequest = async () => {
    try {
      const res = await fetch(`/api/v1/requests/${code}`);
      const data = await res.json();
      if (data.success) {
        setRequest(data.request);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequest();
  }, [code]);

  // Connect to SSE stream once request is loaded
  const sseUrl = request?.id ? `/api/v1/requests/${request.id}/stream` : null;
  const { data: sseEvent, connected } = useEventSource(sseUrl);

  // Handle incoming live events
  useEffect(() => {
    if (!sseEvent) return;

    if (sseEvent.type === 'WAVE_ADVANCED') {
      setRequest((prev: any) =>
        prev
          ? {
              ...prev,
              currentWave: sseEvent.payload.wave,
              radiusKm: sseEvent.payload.radiusKm
            }
          : prev
      );
    } else if (sseEvent.type === 'DONOR_ACCEPTED' || sseEvent.type === 'DONOR_WAITLISTED') {
      // Refresh request data to pull new acceptances
      fetchRequest();
    }
  }, [sseEvent]);

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center animate-pulse space-y-4">
        <div className="h-6 bg-slate-200 rounded w-1/3 mx-auto"></div>
        <div className="h-4 bg-slate-100 rounded w-1/2 mx-auto"></div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center space-y-2">
        <h2 className="text-xl font-bold text-slate-800">Request Not Found</h2>
        <p className="text-sm text-slate-500">The request code #{code} does not exist or has expired.</p>
      </div>
    );
  }

  const wavePercentages = [25, 50, 75, 100];
  const progressPercent = wavePercentages[(request.currentWave || 1) - 1] || 25;

  return (
    <div className="space-y-6">
      {/* Live Header Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></span>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-black text-slate-800">Request #{request.code}</h1>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    request.state === 'FULFILLED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-blood-100 text-blood-800'
                  }`}
                >
                  {request.state}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {request.unitsConfirmed} of {request.unitsNeeded} units confirmed · Hospital: {request.hospital.name}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={copyShareLink}
              className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Link Copied' : 'Share with Family'}</span>
            </button>
            <div className="flex items-center space-x-1 text-xs text-slate-500 bg-slate-50 px-2.5 py-2 rounded-xl border border-slate-200">
              <Radio className={`w-3.5 h-3.5 ${connected ? 'text-emerald-500' : 'text-slate-400'}`} />
              <span>{connected ? 'Live Stream' : 'Connecting'}</span>
            </div>
          </div>
        </div>

        {/* Wave Progression Bar (Section 12.3 & 17) */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex justify-between text-xs font-bold text-slate-700">
            <span>Escalation Wave {request.currentWave || 1} of 4</span>
            <span className="text-blood-700">Search Radius: ~{request.radiusKm || 5} km</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div
              className="bg-blood-600 h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 font-medium">
            <span>Wave 1 (5km)</span>
            <span>Wave 2 (15km)</span>
            <span>Wave 3 (30km)</span>
            <span>Wave 4 (50km)</span>
          </div>
        </div>
      </div>

      {/* Accepted Donors List (Live Acceptance Cards) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-800 flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <span>Responding Donors ({request.acceptances?.length || 0})</span>
        </h2>

        {request.acceptances?.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs space-y-2">
            <Clock className="w-8 h-8 text-slate-300 mx-auto animate-spin" />
            <p>Scanning matching donors in the active radius...</p>
            <p className="text-[11px] text-slate-400">
              When a donor accepts on WhatsApp, their card will appear here in real time.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {request.acceptances.map((acc: any) => (
              <div
                key={acc.id}
                className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 ${
                  acc.status === 'ACCEPTED'
                    ? 'bg-emerald-50/50 border-emerald-200'
                    : 'bg-amber-50/40 border-amber-200'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">{acc.donorFirstName} (Verified Donor)</h3>
                    <p className="text-xs text-slate-500">Blood Group: <strong>{acc.bloodGroup}</strong></p>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      acc.status === 'ACCEPTED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {acc.status}
                  </span>
                </div>

                {/* Direct Action Contact Buttons */}
                {acc.contactUnlocked && acc.phone ? (
                  <div className="flex gap-2 pt-1">
                    <a
                      href={`tel:${acc.phone}`}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg text-xs flex items-center justify-center space-x-1.5 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call Donor</span>
                    </a>
                    <a
                      href={`https://wa.me/${acc.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2 rounded-lg text-xs flex items-center justify-center space-x-1.5 transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">
                    Contact masked for privacy. Unlocked upon verified acceptance.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
