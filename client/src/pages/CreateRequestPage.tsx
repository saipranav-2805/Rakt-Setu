import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Heart, MapPin, Building, AlertTriangle, CheckCircle2, PhoneCall } from 'lucide-react';

const COMPATIBILITY_MAP: Record<string, string[]> = {
  'O-': ['O-'],
  'O+': ['O-', 'O+'],
  'A-': ['O-', 'A-'],
  'A+': ['O-', 'O+', 'A-', 'A+'],
  'B-': ['O-', 'B-'],
  'B+': ['O-', 'O+', 'B-', 'B+'],
  'AB-': ['O-', 'A-', 'B-', 'AB-'],
  'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']
};

export default function CreateRequestPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Form states
  const [bloodGroup, setBloodGroup] = useState<string>(searchParams.get('bloodGroup') || 'O+');
  const [unitsNeeded, setUnitsNeeded] = useState<number>(2);
  const [age, setAge] = useState<number>(35);
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [hospitalName, setHospitalName] = useState<string>('Apollo Hospital');
  const [hospitalAddress, setHospitalAddress] = useState<string>('Jubilee Hills, Hyderabad');
  const [urgency, setUrgency] = useState<'critical' | 'urgent' | 'planned'>('critical');
  const [exactMatchOnly, setExactMatchOnly] = useState<boolean>(false);

  // Requester OTP auth state
  const [phone, setPhone] = useState<string>('+919876543210');
  const [otpCode, setOtpCode] = useState<string>('123456');
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Compatible groups chips
  const compatibleGroups = exactMatchOnly
    ? [bloodGroup]
    : COMPATIBILITY_MAP[bloodGroup] || [bloodGroup];

  // Auto-generated message preview (Blueprint Section 5.1 Step 6)
  const messagePreview = `URGENT: ${unitsNeeded} unit(s) of ${bloodGroup} blood required immediately for a ${age}-year-old ${gender} patient at ${hospitalName || '[Hospital]'}, ${hospitalAddress || '[Address]'}. If you can donate, please click to confirm.`;

  const handleSendOtp = async () => {
    try {
      const res = await fetch('/api/v1/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      const data = await res.json();
      if (data.success) {
        setOtpSent(true);
      }
    } catch {
      setOtpSent(true);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 1. Verify OTP & get JWT
      const verifyRes = await fetch('/api/v1/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: otpCode, role: 'requester' })
      });
      const verifyData = await verifyRes.json();
      const token = verifyData.accessToken;

      // 2. Submit emergency request
      const reqRes = await fetch('/api/v1/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          patient: { age, gender, bloodGroup },
          unitsNeeded,
          hospital: {
            name: hospitalName,
            address: hospitalAddress,
            location: { type: 'Point', coordinates: [78.411, 17.432] } // Hyderabad sample
          },
          urgency,
          exactMatchOnly
        })
      });

      const reqData = await reqRes.json();
      if (reqData.success) {
        navigate(`/r/${reqData.request.code}`);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to submit request. Ensure the backend server is running.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-800 flex items-center space-x-2">
          <Heart className="w-7 h-7 text-blood-600 fill-blood-600" />
          <span>Raise Emergency Blood Request</span>
        </h1>
        <p className="text-slate-600 text-sm mt-1">
          Complete the details below to dispatch wave notifications immediately to matching donors.
        </p>
      </div>

      <form onSubmit={handleSubmitRequest} className="space-y-6">
        {/* Patient Details */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Blood Group Needed</label>
            <select
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-4 py-3 font-bold text-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blood-500"
            >
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                <option key={bg} value={bg}>
                  {bg}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Units Needed</label>
            <input
              type="number"
              min="1"
              max="10"
              value={unitsNeeded}
              onChange={(e) => setUnitsNeeded(parseInt(e.target.value, 10))}
              className="w-full border border-slate-300 rounded-xl px-4 py-3 font-bold text-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blood-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Urgency Level</label>
            <select
              value={urgency}
              onChange={(e) => setUrgency(e.target.value as any)}
              className="w-full border border-slate-300 rounded-xl px-4 py-3 font-bold text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-blood-500"
            >
              <option value="critical">Critical (Immediate dispatch, 6h expiry)</option>
              <option value="urgent">Urgent (24h expiry)</option>
              <option value="planned">Planned (Scheduled)</option>
            </select>
          </div>
        </div>

        {/* Patient Demographics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Patient Age</label>
            <input
              type="number"
              min="0"
              max="120"
              value={age}
              onChange={(e) => setAge(parseInt(e.target.value, 10) || 0)}
              className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Patient Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as any)}
              className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        {/* Compatible Blood Groups Preview Chips */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase">Compatible Donor Groups:</span>
            <label className="flex items-center space-x-2 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={exactMatchOnly}
                onChange={(e) => setExactMatchOnly(e.target.checked)}
                className="rounded text-blood-600 focus:ring-blood-500"
              />
              <span>Exact Match Only</span>
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            {compatibleGroups.map((g) => (
              <span
                key={g}
                className="px-3 py-1 bg-blood-100 text-blood-800 font-bold rounded-lg text-sm border border-blood-200"
              >
                {g}
              </span>
            ))}
          </div>
        </div>

        {/* Hospital & Location */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Hospital Name</label>
            <div className="relative">
              <Building className="w-5 h-5 absolute left-3 top-3.5 text-slate-400" />
              <input
                type="text"
                required
                value={hospitalName}
                onChange={(e) => setHospitalName(e.target.value)}
                placeholder="e.g. Apollo Hospital"
                className="w-full border border-slate-300 rounded-xl pl-10 pr-4 py-3 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blood-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Hospital Address / Area</label>
            <div className="relative">
              <MapPin className="w-5 h-5 absolute left-3 top-3.5 text-slate-400" />
              <input
                type="text"
                required
                value={hospitalAddress}
                onChange={(e) => setHospitalAddress(e.target.value)}
                placeholder="e.g. Jubilee Hills, Hyderabad"
                className="w-full border border-slate-300 rounded-xl pl-10 pr-4 py-3 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blood-500"
              />
            </div>
          </div>
        </div>

        {/* Auto-Generated Message Preview (Blueprint Section 5.1 Step 6) */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-1">
          <div className="flex items-center space-x-1.5 text-amber-800 font-bold text-xs uppercase">
            <AlertTriangle className="w-4 h-4" />
            <span>Generated Notification Message Preview</span>
          </div>
          <p className="text-xs text-amber-900 italic font-mono bg-white/70 p-2.5 rounded-lg border border-amber-100">
            "{messagePreview}"
          </p>
        </div>

        {/* Requester Phone & OTP Verification */}
        <div className="border-t border-slate-200 pt-4 space-y-3">
          <h3 className="font-bold text-slate-800 text-sm flex items-center space-x-2">
            <PhoneCall className="w-4 h-4 text-blood-600" />
            <span>Requester Verification</span>
          </h3>

          <div className="flex gap-2">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+919876543210"
              className="flex-1 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-800"
            />
            <button
              type="button"
              onClick={handleSendOtp}
              className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-colors"
            >
              {otpSent ? 'Resend OTP' : 'Send OTP'}
            </button>
          </div>

          {otpSent && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="Enter 6-digit OTP"
                className="w-40 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-mono tracking-widest text-slate-800"
              />
              <span className="text-xs text-emerald-700 font-semibold flex items-center space-x-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Demo OTP: 123456</span>
              </span>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blood-600 hover:bg-blood-700 text-white font-bold py-4 rounded-xl shadow-lg text-base transition-colors flex items-center justify-center space-x-2"
        >
          {isSubmitting ? <span>Dispatching Waves...</span> : <span>Confirm & Start Escalation Waves</span>}
        </button>
      </form>
    </div>
  );
}
