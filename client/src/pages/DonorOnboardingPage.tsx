import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Heart, CheckCircle2, ChevronRight, ChevronLeft,
  User, Droplets, MapPin, ShieldCheck, AlertTriangle
} from 'lucide-react';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

function StepIndicator({ step }: { step: number }) {
  const steps = ['Identity', 'Profile', 'Consent & Submit'];
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((label, i) => {
        const isActive = i + 1 === step;
        const isDone = i + 1 < step;
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2 ${
                isDone ? 'bg-emerald-500 border-emerald-500 text-white'
                : isActive ? 'bg-blood-700 border-blood-700 text-white'
                : 'bg-white border-slate-300 text-slate-400'
              }`}>
                {isDone ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-[10px] font-semibold mt-1 ${isActive ? 'text-blood-700' : 'text-slate-400'}`}>{label}</span>
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

export default function DonorOnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  // Form state
  const [phone, setPhone] = useState('+919876543210');
  const [otpCode, setOtpCode] = useState('123456');
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [name, setName] = useState('Sai Pranav');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [dob, setDob] = useState('2000-01-15');
  const [weightKg, setWeightKg] = useState<number>(68);
  const [city, setCity] = useState('Hyderabad');
  const [pincode, setPincode] = useState('500033');
  const [maxTravelKm, setMaxTravelKm] = useState(15);
  const [lastDonationAt, setLastDonationAt] = useState('');
  const [contactConsent, setContactConsent] = useState(true);
  const [whatsappConsent, setWhatsappConsent] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

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
      if (data.success) setOtpSent(true);
      else setError(data.error || 'Failed to send OTP');
    } catch {
      setOtpSent(true); // demo fallback
    } finally {
      setOtpSending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const verifyRes = await fetch('/api/v1/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: otpCode, name, role: 'donor' }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyData.accessToken) throw new Error(verifyData.error || 'OTP verification failed');
      const token = verifyData.accessToken;
      localStorage.setItem('raktsetu_token', token);

      const donorRes = await fetch('/api/v1/donors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          bloodGroup, gender, dob, weightKg,
          location: { type: 'Point', coordinates: [78.4867, 17.3850] },
          city, pincode, maxTravelKm,
          lastDonationAt: lastDonationAt ? new Date(lastDonationAt).toISOString() : undefined,
          consent: { contact: contactConsent, whatsapp: whatsappConsent, version: '1.0' },
        }),
      });

      const donorData = await donorRes.json();
      if (donorData.success) {
        setSuccess(true);
      } else {
        throw new Error(donorData.error || 'Failed to register donor');
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with server');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-lg mx-auto text-center space-y-6">
        <div className="bg-white rounded-3xl shadow-sm border border-emerald-200 p-10">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">You're a RaktSetu Donor! 🩸</h2>
          <p className="text-slate-600 text-sm leading-relaxed mb-6">
            Thank you for joining as a voluntary donor. When an emergency matching request is raised
            near your location, you'll receive an instant WhatsApp notification.
          </p>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-800 text-left space-y-1 mb-6">
            <div className="font-bold text-emerald-700 mb-2">What happens next?</div>
            <div>✓ Your profile is indexed in our geospatial database</div>
            <div>✓ Emergency requests within {maxTravelKm} km will trigger your notification</div>
            <div>✓ You can respond directly from the WhatsApp message</div>
          </div>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-blood-700 hover:bg-blood-800 text-white font-black py-3.5 rounded-xl shadow-lg"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Page Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center space-x-2 bg-blood-100 text-blood-800 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-3">
          <Heart className="w-3.5 h-3.5 fill-blood-600" />
          <span>Become a Voluntary Donor</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">Join the RaktSetu Network</h1>
        <p className="text-slate-500 text-sm mt-1">Your details are protected under DPDP Act 2023. Zero spam.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
        <StepIndicator step={step} />

        <form onSubmit={handleSubmit}>

          {/* ── STEP 1: Identity & OTP ── */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="font-black text-slate-800 text-base flex items-center space-x-2">
                <User className="w-4 h-4 text-blood-600" />
                <span>Your Identity</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Full Name</label>
                  <input
                    type="text" required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blood-500 bg-white"
                    placeholder="Your full name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Blood Group</label>
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blood-500 bg-white"
                  >
                    {BLOOD_GROUPS.map((bg) => <option key={bg} value={bg}>{bg}</option>)}
                  </select>
                </div>
              </div>

              {/* Blood Group visual selector */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Your Blood Group</label>
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

              {/* Phone & OTP */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">WhatsApp Number</label>
                <div className="flex gap-2">
                  <input
                    type="tel" required
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
                      placeholder="123456"
                      className="w-36 border border-slate-300 rounded-xl px-4 py-3 text-lg font-mono tracking-widest text-slate-800 text-center focus:outline-none focus:ring-2 focus:ring-blood-500 bg-white"
                    />
                    <span className="text-xs text-emerald-700 font-semibold flex items-center space-x-1.5 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Demo: 123456</span>
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

              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full bg-blood-700 hover:bg-blood-800 text-white font-black py-4 rounded-xl flex items-center justify-center space-x-2 shadow-lg"
              >
                <span>Continue to Profile Details</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* ── STEP 2: Donor Profile ── */}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="font-black text-slate-800 text-base flex items-center space-x-2">
                <Droplets className="w-4 h-4 text-blood-600" />
                <span>Donor Profile</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blood-500 bg-white"
                  >
                    <option value="male">Male (90-day cooldown)</option>
                    <option value="female">Female (120-day cooldown)</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Date of Birth</label>
                  <input
                    type="date" required
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blood-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Weight (kg)</label>
                  <input
                    type="number" min="45" max="200"
                    value={weightKg}
                    onChange={(e) => setWeightKg(parseInt(e.target.value, 10))}
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blood-500 bg-white"
                  />
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 font-medium flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>Minimum weight to donate blood is 45 kg (NBTC guidelines).</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">City</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                    <input
                      type="text" required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl pl-9 pr-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blood-500 bg-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Pincode</label>
                  <input
                    type="text" required maxLength={6}
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blood-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Max Travel (km)</label>
                  <input
                    type="number" min="1" max="50"
                    value={maxTravelKm}
                    onChange={(e) => setMaxTravelKm(parseInt(e.target.value, 10) || 15)}
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blood-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Last Donation Date (optional)</label>
                <input
                  type="date"
                  value={lastDonationAt}
                  onChange={(e) => setLastDonationAt(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blood-500 bg-white"
                />
                <p className="text-xs text-slate-500 mt-1">Used to enforce NBTC cooldown eligibility rules automatically.</p>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)} className="flex items-center space-x-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-5 py-3.5 rounded-xl border border-slate-200 text-sm">
                  <ChevronLeft className="w-4 h-4" /><span>Back</span>
                </button>
                <button type="button" onClick={() => setStep(3)} className="flex-1 bg-blood-700 hover:bg-blood-800 text-white font-black py-3.5 rounded-xl flex items-center justify-center space-x-2 shadow-lg text-sm">
                  <span>Review & Submit</span><ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Consent & Submit ── */}
          {step === 3 && (
            <div className="space-y-5">
              <h2 className="font-black text-slate-800 text-base flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>DPDP Act 2023 Consent</span>
              </h2>

              {/* Summary */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Your Profile Summary</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                  <div><span className="text-slate-500">Name:</span> <strong className="text-slate-800">{name}</strong></div>
                  <div><span className="text-slate-500">Blood:</span> <strong className="text-blood-700">{bloodGroup}</strong></div>
                  <div><span className="text-slate-500">Gender:</span> <strong className="text-slate-800 capitalize">{gender}</strong></div>
                  <div><span className="text-slate-500">Weight:</span> <strong className="text-slate-800">{weightKg} kg</strong></div>
                  <div><span className="text-slate-500">City:</span> <strong className="text-slate-800">{city}</strong></div>
                  <div><span className="text-slate-500">Max travel:</span> <strong className="text-slate-800">{maxTravelKm} km</strong></div>
                </div>
              </div>

              {/* Consent checkboxes */}
              <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 space-y-3">
                <h3 className="text-xs font-bold text-blue-800 uppercase tracking-wide">Required Consents</h3>
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox" required
                    checked={contactConsent}
                    onChange={(e) => setContactConsent(e.target.checked)}
                    className="mt-0.5 rounded text-blood-600 focus:ring-blood-500"
                  />
                  <span className="text-xs text-slate-700 leading-relaxed">
                    I consent to being contacted by RaktSetu exclusively for verified emergency blood donation requests near my location.
                  </span>
                </label>
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox" required
                    checked={whatsappConsent}
                    onChange={(e) => setWhatsappConsent(e.target.checked)}
                    className="mt-0.5 rounded text-blood-600 focus:ring-blood-500"
                  />
                  <span className="text-xs text-slate-700 leading-relaxed">
                    I consent to receiving WhatsApp notifications for matching urgent blood requests. I understand I can withdraw consent at any time.
                  </span>
                </label>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 text-xs font-medium px-4 py-3 rounded-xl flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(2)} className="flex items-center space-x-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-5 py-3.5 rounded-xl border border-slate-200 text-sm">
                  <ChevronLeft className="w-4 h-4" /><span>Back</span>
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !otpSent}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black py-3.5 rounded-xl flex items-center justify-center space-x-2 shadow-lg text-sm"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Registering...</span>
                    </>
                  ) : (
                    <>
                      <Heart className="w-4 h-4 fill-white" />
                      <span>Complete Donor Registration</span>
                    </>
                  )}
                </button>
              </div>

              {!otpSent && (
                <p className="text-xs text-amber-700 text-center bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
                  ⚠️ Please send and verify your OTP in Step 1 before submitting.
                </p>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
