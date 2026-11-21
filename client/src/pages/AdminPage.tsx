import { useEffect, useState } from 'react';
import { ShieldAlert, UserX, CheckCircle, RefreshCw, AlertTriangle, Droplets, Eye } from 'lucide-react';

export default function AdminPage() {
  const [flaggedRequests, setFlaggedRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const getAdminToken = async () => {
    let token = localStorage.getItem('raktsetu_admin_token');
    if (!token) {
      try {
        await fetch('/api/v1/auth/otp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: '+919999999999' })
        });
        const verifyRes = await fetch('/api/v1/auth/otp/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: '+919999999999', code: '123456', role: 'admin', name: 'Platform Admin' })
        });
        const verifyData = await verifyRes.json();
        if (verifyData.accessToken) {
          token = verifyData.accessToken;
          localStorage.setItem('raktsetu_admin_token', token as string);
        }
      } catch (e) {
        console.error('Failed to get demo admin token', e);
      }
    }
    return token;
  };

  const fetchFlagged = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const token = await getAdminToken();
      const res = await fetch('/api/v1/admin/requests?flagged=true', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (data.success) setFlaggedRequests(data.requests || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchFlagged(); }, []);

  const handleBanUser = async (userId: string, userName: string) => {
    if (!confirm(`Ban user "${userName}"? This action cannot be undone.`)) return;
    try {
      const token = await getAdminToken();
      const res = await fetch(`/api/v1/admin/users/${userId}/ban`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ reason: 'Flagged for suspicious or abusive activity' }),
      });
      const data = await res.json();
      if (data.success) fetchFlagged(true);
    } catch {
      alert('Failed to ban user');
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 0.8) return 'bg-red-100 text-red-800 border-red-200';
    if (score >= 0.5) return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  };

  const getRiskLabel = (score: number) => {
    if (score >= 0.8) return 'HIGH';
    if (score >= 0.5) return 'MEDIUM';
    return 'LOW';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center border border-white/15">
            <ShieldAlert className="w-6 h-6 text-rose-300" />
          </div>
          <div>
            <h1 className="text-xl font-black">Platform Moderation</h1>
            <p className="text-slate-400 text-xs mt-0.5">Review flagged requests and manage user bans</p>
          </div>
        </div>
        <button
          onClick={() => fetchFlagged(true)}
          disabled={refreshing}
          className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 border border-white/15 text-white font-semibold px-4 py-2 rounded-xl text-sm disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Flagged Requests', value: flaggedRequests.length, icon: AlertTriangle, color: 'text-rose-600 bg-rose-100' },
          { label: 'High Risk (≥0.8)', value: flaggedRequests.filter(r => r.riskScore >= 0.8).length, icon: ShieldAlert, color: 'text-red-600 bg-red-100' },
          { label: 'Under Review', value: flaggedRequests.filter(r => r.state === 'ACTIVE').length, icon: Eye, color: 'text-amber-600 bg-amber-100' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-slate-800">{value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Main queue */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h2 className="font-black text-slate-800 flex items-center space-x-2 mb-5">
          <AlertTriangle className="w-4 h-4 text-rose-500" />
          <span>Risk Queue</span>
          {flaggedRequests.length > 0 && (
            <span className="ml-auto text-xs bg-rose-100 text-rose-800 font-bold px-2.5 py-1 rounded-full border border-rose-200">
              {flaggedRequests.length} flagged
            </span>
          )}
        </h2>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-slate-100 rounded-xl h-20" />
            ))}
          </div>
        ) : flaggedRequests.length === 0 ? (
          <div className="text-center py-12 space-y-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-lg">Queue is Clear</h3>
              <p className="text-sm text-slate-500 mt-1">No requests currently exceed the risk threshold.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {flaggedRequests.map((req) => (
              <div
                key={req._id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-rose-200 bg-rose-50/30 gap-4"
              >
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Droplets className="w-5 h-5 text-rose-600" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span className="font-black text-slate-800">#{req.code}</span>
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${getRiskColor(req.riskScore)}`}>
                        {getRiskLabel(req.riskScore)} RISK · {(req.riskScore * 100).toFixed(0)}%
                      </span>
                      <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                        {req.state}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      <strong>{req.requesterId?.name || 'Unknown'}</strong>
                      {req.requesterId?.phone && ` · ${req.requesterId.phone}`}
                      {` · ${req.unitsNeeded} unit(s) of `}
                      <strong className="text-blood-700">{req.patient?.bloodGroup}</strong>
                    </p>
                    {req.hospital?.name && (
                      <p className="text-xs text-slate-400 mt-0.5">📍 {req.hospital.name}, {req.hospital.address}</p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleBanUser(req.requesterId?._id, req.requesterId?.name)}
                  className="flex items-center space-x-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-sm whitespace-nowrap"
                >
                  <UserX className="w-3.5 h-3.5" />
                  <span>Ban User</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
