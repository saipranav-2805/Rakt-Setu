import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, AlertCircle, ShieldCheck } from 'lucide-react';

export default function DonorResponsePage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  // Same-day self-declared screening answers (Blueprint Section 5.2 Step 3)
  const [feelingWell, setFeelingWell] = useState(true);
  const [noFever, setNoFever] = useState(true);
  const [noMeds, setNoMeds] = useState(true);
  const [weightOk, setWeightOk] = useState(true);

  const [loading, setLoading] = useState(false);
  const [responseResult, setResponseResult] = useState<any>(null);

  const handleAccept = async () => {
    if (!feelingWell || !noFever || !noMeds || !weightOk) {
      alert('You must satisfy all same-day health checks to proceed with donation.');
      return;
    }

    setLoading(true);
    try {
      // In production, token is retrieved from auth cookie/state
      const res = await fetch(`/api/v1/requests/${code}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          screeningAnswers: { feelingWell, noFever, noMeds, weightOk }
        })
      });
      const data = await res.json();
      setResponseResult(data);
    } catch (err: any) {
      alert('Failed to submit acceptance');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm max-w-xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <span className="text-xs bg-blood-100 text-blood-800 font-bold px-3 py-1 rounded-full uppercase">
          Emergency Donor Action
        </span>
        <h1 className="text-2xl font-black text-slate-800">Matching Request #{code}</h1>
        <p className="text-xs text-slate-500">
          Please confirm your availability and complete the quick same-day screening.
        </p>
      </div>

      {responseResult ? (
        <div
          className={`p-6 rounded-2xl text-center space-y-3 ${
            responseResult.status === 'ACCEPTED'
              ? 'bg-emerald-50 border border-emerald-200'
              : 'bg-amber-50 border border-amber-200'
          }`}
        >
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto bg-white shadow-sm">
            {responseResult.status === 'ACCEPTED' ? (
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            ) : (
              <AlertCircle className="w-8 h-8 text-amber-600" />
            )}
          </div>
          <h2 className="text-lg font-bold text-slate-800">
            {responseResult.status === 'ACCEPTED' ? 'Commitment Confirmed!' : 'Placed on Standby'}
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">{responseResult.message}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-lg mt-2"
          >
            Done
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Same-day Screening Checklist (Blueprint Section 5.2 Step 3) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Same-Day Health Checklist</span>
            </h3>

            <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={feelingWell}
                onChange={(e) => setFeelingWell(e.target.checked)}
                className="rounded text-blood-600"
              />
              <span>I am feeling well today and fit to donate.</span>
            </label>

            <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={noFever}
                onChange={(e) => setNoFever(e.target.checked)}
                className="rounded text-blood-600"
              />
              <span>I have had no fever, cough, or infections in the last 48 hours.</span>
            </label>

            <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={noMeds}
                onChange={(e) => setNoMeds(e.target.checked)}
                className="rounded text-blood-600"
              />
              <span>I am not currently taking disqualifying antibiotics or medications.</span>
            </label>

            <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={weightOk}
                onChange={(e) => setWeightOk(e.target.checked)}
                className="rounded text-blood-600"
              />
              <span>My weight is currently above 45 kg.</span>
            </label>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleAccept}
              disabled={loading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl shadow-md flex items-center justify-center space-x-2 transition-colors text-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'Confirming...' : 'I Can Donate (Accept)'}</span>
            </button>
            <button
              onClick={() => navigate('/')}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-5 py-3.5 rounded-xl border border-slate-200 text-sm transition-colors"
            >
              Decline
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
