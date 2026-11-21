import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Heart, MapPin, Building, AlertTriangle, CheckCircle2,
  PhoneCall, ChevronRight, ChevronLeft, Ambulance, Droplets, User
} from 'lucide-react';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

const COMPATIBILITY_MAP: Record<string, string[]> = {
  'O-': ['O-'],
  'O+': ['O-', 'O+'],
  'A-': ['O-', 'A-'],
  'A+': ['O-', 'O+', 'A-', 'A+'],
  'B-': ['O-', 'B-'],
  'B+': ['O-', 'O+', 'B-', 'B+'],
  'AB-': ['O-', 'A-', 'B-', 'AB-'],
  'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
};

function StepIndicator({ step, total }: { step: number; total: number }) {
  const steps = ['Patient Info', 'Hospital', 'Verify & Dispatch'];
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((label, i) => {
        const isActive = i + 1 === step;
        const isDone = i + 1 < step;
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2 ${
                  isDone
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : isActive
                    ? 'bg-blood-700 border-blood-700 text-white'
                    : 'bg-white border-slate-300 text-slate-400'
                }`}
              >
                {isDone ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-[10px] font-semibold mt-1 ${isActive ? 'text-blood-700' : 'text-slate-400'}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-10 sm:w-16 h-0.5 mx-2 mb-4 ${isDone ? 'bg-emerald-400' : 'bg-slate-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function CreateRequestPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);

  // Form state
  const [bloodGroup, setBloodGroup] = useState<string>(searchParams.get('bloodGroup') || 'O+');
  const [unitsNeeded, setUnitsNeeded] = useState<number>(2);
  const [age, setAge] = useState<number>(35);
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [urgency, setUrgency] = useState<'critical' | 'urgent' | 'planned'>('critical');
  const [exactMatchOnly, setExactMatchOnly] = useState<boolean>(false);
  const [hospitalName, setHospitalName] = useState<string>('Apollo Hospital');
  const [hospitalAddress, setHospitalAddress] = useState<string>('Jubilee Hills, Hyderabad');

  // OTP state
  const [phone, setPhone] = useState<string>('+919876543210');
  const [otpCode, setOtpCode] = useState<string>('123456');
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [otpSending, setOtpSending] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const compatibleGroups = exactMatchOnly ? [bloodGroup] : (COMPATIBILITY_MAP[bloodGroup] || [bloodGroup]);

  const messagePreview = `URGENT: ${unitsNeeded} unit(s) of ${bloodGroup} blood required immediately for a ${age}-year-old ${gender} patient at ${hospitalName || '[Hospital]'}, ${hospitalAddress || '[Address]'}. If you can donate, please click to confirm.`;

  const handleSendOtp = async () => {
    setOtpSending(true);
    setError('');
    try {
      const res = await fetch('/api/v1/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (data.success) {
        setOtpSent(true);
      } else {
        setError(data.error || 'Failed to send OTP');
      }
    } catch {
      setOtpSent(true); // in demo/offline mode, still let through
    } finally {
      setOtpSending(false);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpSent) {
      setError('Please send and verify OTP first.');
      return;
    }
    setIsSubmitting(true);
    setError('');

    try {
      // 1. Verify OTP & get JWT
      const verifyRes = await fetch('/api/v1/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: otpCode, role: 'requester' }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyData.accessToken) throw new Error(verifyData.error || 'OTP verification failed');
      const token = verifyData.accessToken;
      localStorage.setItem('raktsetu_token', token);

      // 2. Submit emergency request
      const reqRes = await fetch('/api/v1/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          patient: { age, gender, bloodGroup },
          unitsNeeded,
          hospital: {
            name: hospitalName,
            address: hospitalAddress,
            location: { type: 'Point', coordinates: [78.4867, 17.3850] }, // Hyderabad
          },
          urgency,
          exactMatchOnly,
        }),
      });
      const reqData = await reqRes.json();
      if (reqData.success) {
        navigate(`/r/${reqData.request.code}`);
      } else {
        throw new Error(reqData.error || 'Failed to create request');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const urgencyConfig = {
    critical: { label: 'Critical', sublabel: '6-hour window · Immediate dispatch', color: 'border-red-400 bg-red-50 text-red-800' },
    urgent:   { label: 'Urgent',   sublabel: '24-hour window',                     color: 'border-orange-400 bg-orange-50 text-orange-800' },
    planned:  { label: 'Planned',  sublabel: 'Scheduled donation',                 color: 'border-blue-400 bg-blue-50 text-blue-800' },
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Page Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center space-x-2 bg-blood-100 text-blood-800 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-3">
          <Ambulance className="w-3.5 h-3.5" />
          <span>Emergency Blood Request</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">Raise an Emergency Request</h1>
        <p className="text-slate-500 text-sm mt-1">Donors will be notified by wave radius across WhatsApp</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
        <StepIndicator step={step} total={3} />

        <form onSubmit={handleSubmitRequest}>

          {/* ── STEP 1: Patient Info ── */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="font-black text-slate-800 text-base flex items-center space-x-2">
                <User className="w-4 h-4 text-blood-600" />
                <span>Patient Information</span>
              </h2>

              {/* Blood Group */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Blood Group Required</label>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {BLOOD_GROUPS.map((bg) => (
                    <button
                      key={bg}
                      type="button"
                      onClick={() => setBloodGroup(bg)}
                      className={`py-3 rounded-xl font-black text-sm border-2 transition-all ${
                        bloodGroup === bg
                          ? 'bg-blood-700 text-white border-blood-700 shadow-md'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-blood-300 hover:bg-blood-50'
                      }`}
                    >
                      {bg}
                    </button>
                  ))}
                </div>
              </div>

              {/* Compatible Groups */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Compatible Donor Groups</span>
                  <label className="flex items-center space-x-2 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exactMatchOnly}
                      onChange={(e) => setExactMatchOnly(e.target.checked)}
                      className="rounded text-blood-600"
                    />
                    <span>Exact match only</span>
                  </label>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {compatibleGroups.map((g) => (
                    <span key={g} className="px-2.5 py-1 bg-blood-100 text-blood-800 font-bold rounded-lg text-xs border border-blood-200">
                      {g}
                    </span>
                  ))}
                </div>
              </div>

              {/* Units, Age, Gender, Urgency */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Units Needed</label>
                  <input
                    type="number" min="1" max="10"
                    value={unitsNeeded}
                    onChange={(e) => setUnitsNeeded(parseInt(e.target.value, 10))}
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 font-bold text-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blood-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Patient Age</label>
                  <input
                    type="number" min="0" max="120"
                    value={age}
                    onChange={(e) => setAge(parseInt(e.target.value, 10) || 0)}
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 font-bold text-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blood-500 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Patient Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blood-500 bg-white"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Urgency</label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value as any)}
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blood-500 bg-white"
                  >
                    <option value="critical">🚨 Critical</option>
                    <option value="urgent">⚠️ Urgent</option>
                    <option value="planned">📅 Planned</option>
                  </select>
                </div>
              </div>

              {/* Urgency badge */}
              <div className={`flex items-center space-x-2 p-3 rounded-xl border text-xs font-semibold ${urgencyConfig[urgency].color}`}>
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <div>
                  <strong>{urgencyConfig[urgency].label}</strong> — {urgencyConfig[urgency].sublabel}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full bg-blood-700 hover:bg-blood-800 text-white font-black py-4 rounded-xl flex items-center justify-center space-x-2 shadow-lg"
              >
                <span>Continue to Hospital Details</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* ── STEP 2: Hospital ── */}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="font-black text-slate-800 text-base flex items-center space-x-2">
                <Building className="w-4 h-4 text-blood-600" />
                <span>Hospital & Location</span>
              </h2>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Hospital Name</label>
                <div className="relative">
                  <Building className="w-5 h-5 absolute left-3 top-3.5 text-slate-400" />
                  <input
                    type="text" required
                    value={hospitalName}
                    onChange={(e) => setHospitalName(e.target.value)}
                    placeholder="e.g. Apollo Hospital"
                    className="w-full border border-slate-300 rounded-xl pl-10 pr-4 py-3 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blood-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Hospital Address / Area</label>
                <div className="relative">
                  <MapPin className="w-5 h-5 absolute left-3 top-3.5 text-slate-400" />
                  <input
                    type="text" required
                    value={hospitalAddress}
                    onChange={(e) => setHospitalAddress(e.target.value)}
                    placeholder="e.g. Jubilee Hills, Hyderabad"
                    className="w-full border border-slate-300 rounded-xl pl-10 pr-4 py-3 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blood-500 bg-white"
                  />
                </div>
              </div>

              {/* Auto-generated WhatsApp message preview */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold text-amber-800 uppercase tracking-wide">WhatsApp Message Preview</span>
                </div>
                <p className="text-xs text-amber-900 font-mono bg-white/70 p-3 rounded-lg border border-amber-100 leading-relaxed">
                  "{messagePreview}"
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center space-x-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-5 py-3.5 rounded-xl border border-slate-200 text-sm"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex-1 bg-blood-700 hover:bg-blood-800 text-white font-black py-3.5 rounded-xl flex items-center justify-center space-x-2 shadow-lg text-sm"
                >
                  <span>Continue to Verification</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: OTP & Submit ── */}
          {step === 3 && (
            <div className="space-y-5">
              <h2 className="font-black text-slate-800 text-base flex items-center space-x-2">
                <PhoneCall className="w-4 h-4 text-blood-600" />
                <span>Requester Verification</span>
              </h2>

              {/* Summary card */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Request Summary</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <Droplets className="w-4 h-4 text-blood-500" />
                    <span className="text-slate-600">Blood Group:</span>
                    <strong className="text-blood-700">{bloodGroup}</strong>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Heart className="w-4 h-4 text-rose-500" />
                    <span className="text-slate-600">Units:</span>
                    <strong className="text-slate-800">{unitsNeeded}</strong>
                  </div>
                  <div className="flex items-center space-x-2 col-span-2">
                    <Building className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600 text-xs">{hospitalName}, {hospitalAddress}</span>
                  </div>
                </div>
              </div>

              {/* Phone input */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Your Mobile Number (WhatsApp)</label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+919876543210"
                    className="flex-1 border border-slate-300 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blood-500 bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={otpSending}
                    className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-5 py-3 rounded-xl text-sm disabled:opacity-60 whitespace-nowrap"
                  >
                    {otpSending ? '...' : otpSent ? 'Resend' : 'Send OTP'}
                  </button>
                </div>
              </div>

              {otpSent && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Enter OTP</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="6-digit OTP"
                      className="w-36 border border-slate-300 rounded-xl px-4 py-3 text-lg font-mono tracking-widest text-slate-800 text-center focus:outline-none focus:ring-2 focus:ring-blood-500 bg-white"
                    />
                    <span className="text-xs text-emerald-700 font-semibold flex items-center space-x-1.5 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Demo OTP is 123456</span>
                    </span>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 text-xs font-medium px-4 py-3 rounded-xl flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex items-center space-x-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-5 py-3.5 rounded-xl border border-slate-200 text-sm"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !otpSent}
                  className="flex-1 bg-blood-700 hover:bg-blood-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black py-3.5 rounded-xl flex items-center justify-center space-x-2 shadow-lg text-sm"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Dispatching Waves...</span>
                    </>
                  ) : (
                    <>
                      <Ambulance className="w-4 h-4" />
                      <span>Confirm & Start Escalation Waves</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
