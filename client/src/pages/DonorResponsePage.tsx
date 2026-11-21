import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, ShieldCheck, Heart, AlertTriangle, Droplets } from 'lucide-react';

const SCREENING_ITEMS = [
  { key: 'feelingWell',  label: 'I am feeling well today and physically fit to donate blood.' },
  { key: 'noFever',     label: 'I have had no fever, cough, or infections in the last 48 hours.' },
  { key: 'noMeds',      label: 'I am not taking disqualifying antibiotics or medications.' },
  { key: 'weightOk',    label: 'My current body weight is above 45 kg.' },
] as const;

type ScreeningKey = typeof SCREENING_ITEMS[number]['key'];

export default function DonorResponsePage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  const [screening, setScreening] = useState<Record<ScreeningKey, boolean>>({
    feelingWell: true,
    noFever: true,
    noMeds: true,
    weightOk: true,
  });
  const [loading, setLoading] = useState(false);
  const [responseResult, setResponseResult] = useState<any>(null);

  const allChecked = Object.values(screening).every(Boolean);

  const handleAccept = async () => {
    if (!allChecked) {
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('raktsetu_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/v1/requests/${code}/accept${window.location.search}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ screeningAnswers: screening }),
      });
      const data = await res.json();
      setResponseResult(data);
    } catch {
      setResponseResult({ status: 'ERROR', message: 'Could not reach the server. Please check your connection.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = () => {
    setResponseResult({ status: 'DECLINED', message: 'You have declined this request. Thank you for your honesty — we will notify other eligible donors.' });
  };

  if (responseResult) {
    const isAccepted = responseResult.status === 'ACCEPTED';
    const isWaitlisted = responseResult.status === 'WAITLISTED';
    const isDeclined = responseResult.status === 'DECLINED';

    return (
      <div className="max-w-md mx-auto">
        <div className={`rounded-3xl shadow-lg border p-10 text-center space-y-5 ${
          isAccepted   ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200' :
          isWaitlisted ? 'bg-amber-50 border-amber-200' :
          isDeclined   ? 'bg-slate-50 border-slate-200' :
                         'bg-red-50 border-red-200'
        }`}>
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-lg ${
            isAccepted ? 'bg-emerald-500' : isWaitlisted ? 'bg-amber-400' : 'bg-slate-400'
          }`}>
            {isAccepted ? (
              <CheckCircle2 className="w-10 h-10 text-white" />
            ) : isWaitlisted ? (
              <ShieldCheck className="w-10 h-10 text-white" />
            ) : isDeclined ? (
              <XCircle className="w-10 h-10 text-white" />
            ) : (
              <AlertTriangle className="w-10 h-10 text-white" />
            )}
          </div>

          <div>
            <h2 className="text-2xl font-black text-slate-800 mb-2">
              {isAccepted ? '🩸 Commitment Confirmed!' :
               isWaitlisted ? 'You\'re on Standby' :
               isDeclined ? 'Request Declined' : 'Error'}
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">{responseResult.message}</p>
          </div>

          {isAccepted && (
            <div className="bg-white rounded-xl border border-emerald-200 p-4 text-xs text-emerald-800 text-left space-y-1">
              <div className="font-bold text-emerald-700 mb-2">Next steps:</div>
              <div>✓ The hospital team will contact you shortly</div>
              <div>✓ Bring a valid photo ID when you arrive</div>
              <div>✓ Eat a light meal and stay hydrated before donating</div>
            </div>
          )}

          <button
            onClick={() => navigate('/')}
            className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3.5 rounded-xl"
          >
            {isDeclined ? 'Back to Home' : 'Done'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-5">
      {/* Hero */}
      <div className="bg-gradient-to-br from-blood-800 to-blood-950 rounded-2xl p-6 text-center text-white space-y-3">
        <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center mx-auto">
          <Droplets className="w-7 h-7 text-blood-200 heartbeat" />
        </div>
        <div>
          <span className="text-xs bg-white/10 text-blood-200 font-bold px-3 py-1 rounded-full uppercase tracking-wide border border-white/10">
            Emergency Donor Action
          </span>
          <h1 className="text-2xl font-black mt-3">Blood Needed Nearby</h1>
          <p className="text-blood-200 text-sm mt-1">Request <strong className="text-white">#{code}</strong></p>
        </div>
        <p className="text-blood-200 text-xs leading-relaxed">
          Please confirm your availability and complete the quick same-day health check below.
        </p>
      </div>

      {/* Screening checklist */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
        <h2 className="font-black text-slate-800 flex items-center space-x-2">
          <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <span>Same-Day Health Checklist</span>
        </h2>
        <p className="text-xs text-slate-500">All 4 checks are required to accept (NBTC same-day screening guidelines)</p>

        <div className="space-y-3">
          {SCREENING_ITEMS.map(({ key, label }) => (
            <label
              key={key}
              className={`flex items-start space-x-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                screening[key]
                  ? 'bg-emerald-50 border-emerald-300'
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="mt-0.5">
                <input
                  type="checkbox"
                  checked={screening[key]}
                  onChange={(e) => setScreening((prev) => ({ ...prev, [key]: e.target.checked }))}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
              </div>
              <span className="text-sm text-slate-700 leading-relaxed">{label}</span>
              {screening[key] && <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0 ml-auto" />}
            </label>
          ))}
        </div>

        {!allChecked && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 font-medium flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>All health checks must be confirmed before you can accept.</span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleAccept}
          disabled={loading || !allChecked}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:cursor-not-allowed text-white font-black py-4 rounded-2xl shadow-lg flex items-center justify-center space-x-2 text-sm"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Confirming...</span>
            </>
          ) : (
            <>
              <Heart className="w-4 h-4 fill-white" />
              <span>Yes, I Can Donate</span>
            </>
          )}
        </button>
        <button
          onClick={handleDecline}
          disabled={loading}
          className="bg-slate-100 hover:bg-red-50 hover:border-red-200 hover:text-red-700 text-slate-600 font-semibold px-5 py-4 rounded-2xl border border-slate-200 text-sm transition-all"
        >
          Decline
        </button>
      </div>

      <p className="text-center text-xs text-slate-400">
        Your decision is completely voluntary. Declining has no negative consequences.
      </p>
    </div>
  );
}
