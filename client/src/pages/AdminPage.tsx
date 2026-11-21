import { useEffect, useState } from 'react';
import { ShieldAlert, UserX, CheckCircle } from 'lucide-react';

export default function AdminPage() {
  const [flaggedRequests, setFlaggedRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFlagged = async () => {
    try {
      const res = await fetch('/api/v1/admin/requests?flagged=true');
      const data = await res.json();
      if (data.success) {
        setFlaggedRequests(data.requests || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlagged();
  }, []);

  const handleBanUser = async (userId: string) => {
    if (!confirm('Are you sure you want to ban this user?')) return;
    try {
      const res = await fetch(`/api/v1/admin/users/${userId}/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Flagged for suspicious or abusive activity' })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchFlagged();
      }
    } catch (err) {
      alert('Failed to ban user');
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center space-x-2">
            <ShieldAlert className="w-6 h-6 text-blood-700" />
            <span>Platform Moderation & Risk Queue</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review high risk score requests, duplicate submissions, and donor fraud reports.
          </p>
        </div>
        <button
          onClick={fetchFlagged}
          className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3 py-1.5 rounded-lg border border-slate-200"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-xs text-slate-400">Loading moderation records...</div>
      ) : flaggedRequests.length === 0 ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center text-xs text-emerald-800 flex flex-col items-center space-y-2">
          <CheckCircle className="w-8 h-8 text-emerald-600" />
          <span className="font-bold">Queue is Clear</span>
          <span className="text-emerald-700">No active requests currently exceed the risk threshold.</span>
        </div>
      ) : (
        <div className="space-y-3">
          {flaggedRequests.map((req) => (
            <div key={req._id} className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 flex justify-between items-center">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-800 text-sm">#{req.code}</span>
                  <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full">
                    Risk Score: {req.riskScore}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Requester: {req.requesterId?.name} ({req.requesterId?.phone}) · Units: {req.unitsNeeded} of {req.patient?.bloodGroup}
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleBanUser(req.requesterId?._id)}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1"
                >
                  <UserX className="w-3.5 h-3.5" />
                  <span>Ban User</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
