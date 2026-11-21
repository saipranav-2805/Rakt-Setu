import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function DonorOnboardingPage() {
  const navigate = useNavigate();

  const [phone, setPhone] = useState('+919876543210');
  const [otpCode, setOtpCode] = useState('123456');
  const [name, setName] = useState('Sai Pranav');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [dob, setDob] = useState('2000-01-15');
  const [weightKg, setWeightKg] = useState<number>(68);
  const [city, setCity] = useState('Hyderabad');
  const [pincode, setPincode] = useState('500033');
  const [maxTravelKm, setMaxTravelKm] = useState(15);
  const [lastDonationAt, setLastDonationAt] = useState('');

  // DPDP Act 2023 Consent Toggles
  const [contactConsent, setContactConsent] = useState(true);
  const [whatsappConsent, setWhatsappConsent] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 1. Verify OTP & get JWT
      const verifyRes = await fetch('/api/v1/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: otpCode, name, role: 'donor' })
      });
      const verifyData = await verifyRes.json();
      const token = verifyData.accessToken;

      // 2. Register donor profile
      const donorRes = await fetch('/api/v1/donors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          bloodGroup,
          gender,
          dob,
          weightKg,
          location: { type: 'Point', coordinates: [78.486, 17.385] }, // Hyderabad
          city,
          pincode,
          maxTravelKm,
          lastDonationAt: lastDonationAt ? new Date(lastDonationAt).toISOString() : undefined,
          consent: {
            contact: contactConsent,
            whatsapp: whatsappConsent,
            version: '1.0'
          }
        })
      });

      const donorData = await donorRes.json();
      if (donorData.success) {
        setSuccess(true);
      } else {
        alert(donorData.error || 'Failed to register donor');
      }
    } catch (err: any) {
      alert(err.message || 'Error communicating with server');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center max-w-lg mx-auto space-y-4 shadow-sm">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">You are Registered!</h2>
        <p className="text-slate-600 text-sm">
          Thank you for joining RaktSetu as a voluntary donor. When an emergency matching request is raised near your
          location, you will receive an alert on WhatsApp.
        </p>
        <button
          onClick={() => navigate('/')}
          className="bg-blood-600 hover:bg-blood-700 text-white font-bold py-3 px-6 rounded-xl transition-colors"
        >
          Return to Home
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-slate-800 flex items-center space-x-2">
          <Heart className="w-7 h-7 text-blood-600 fill-blood-600" />
          <span>Become a Voluntary Blood Donor</span>
        </h1>
        <p className="text-slate-600 text-sm mt-1">
          Your details are protected under the DPDP Act 2023. We only notify you when someone nearby is in genuine need.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Phone Number (WhatsApp)</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Blood Group</label>
            <select
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-bold"
            >
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                <option key={bg} value={bg}>
                  {bg}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as any)}
              className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm"
            >
              <option value="male">Male (3-mo cooldown)</option>
              <option value="female">Female (4-mo cooldown)</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Date of Birth</label>
            <input
              type="date"
              required
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Weight (Kg)</label>
            <input
              type="number"
              min="45"
              max="200"
              value={weightKg}
              onChange={(e) => setWeightKg(parseInt(e.target.value, 10))}
              className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">City</label>
            <input
              type="text"
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Pincode</label>
            <input
              type="text"
              required
              maxLength={6}
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm"
            />
          </div>
        </div>

        {/* DPDP Act 2023 Explicit Consent Checkboxes */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 pt-3">
          <label className="flex items-start space-x-2.5 cursor-pointer text-xs text-slate-700">
            <input
              type="checkbox"
              required
              checked={contactConsent}
              onChange={(e) => setContactConsent(e.target.checked)}
              className="mt-0.5 rounded text-blood-600 focus:ring-blood-500"
            />
            <span>
              I consent to being contacted by RaktSetu exclusively for verified emergency blood donation requests.
            </span>
          </label>

          <label className="flex items-start space-x-2.5 cursor-pointer text-xs text-slate-700">
            <input
              type="checkbox"
              required
              checked={whatsappConsent}
              onChange={(e) => setWhatsappConsent(e.target.checked)}
              className="mt-0.5 rounded text-blood-600 focus:ring-blood-500"
            />
            <span>I consent to receiving WhatsApp notifications for matching urgent requests.</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blood-600 hover:bg-blood-700 text-white font-bold py-4 rounded-xl shadow-lg transition-colors"
        >
          {isSubmitting ? 'Registering...' : 'Complete Voluntary Donor Registration'}
        </button>
      </form>
    </div>
  );
}
