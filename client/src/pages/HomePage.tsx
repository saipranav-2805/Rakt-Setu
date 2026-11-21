import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Heart, Users, ShieldCheck, Zap } from 'lucide-react';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

export default function HomePage() {
  const navigate = useNavigate();
  const [selectedGroup, setSelectedGroup] = useState<string>('');

  const handleStartRequest = () => {
    if (selectedGroup) {
      navigate(`/request/new?bloodGroup=${encodeURIComponent(selectedGroup)}`);
    } else {
      navigate('/request/new');
    }
  };

  return (
    <div className="space-y-8 py-2">
      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-blood-700 to-blood-900 rounded-3xl p-6 sm:p-10 text-white shadow-xl text-center space-y-4">
        <div className="inline-flex items-center space-x-2 bg-white/10 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
          <Zap className="w-3.5 h-3.5 text-amber-300" />
          <span>Under 60-Second Dispatch</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
          Emergency Blood Donor Matching Platform
        </h1>
        <p className="text-blood-100 max-w-xl mx-auto text-sm sm:text-base">
          Find eligible, verified voluntary donors nearby in expanding waves via automated WhatsApp dispatch. Never
          wait on disorganized social media chats.
        </p>
      </div>

      {/* Screen 2: 8 Big Blood Group Buttons */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
            <Heart className="w-5 h-5 text-blood-600 fill-blood-600" />
            <span>Select Patient's Blood Group</span>
          </h2>
          {selectedGroup && (
            <span className="text-xs font-bold text-blood-700 bg-blood-50 px-2.5 py-1 rounded-md border border-blood-200">
              Selected: {selectedGroup}
            </span>
          )}
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
          {BLOOD_GROUPS.map((group) => {
            const isSelected = selectedGroup === group;
            return (
              <button
                key={group}
                type="button"
                onClick={() => setSelectedGroup(group)}
                className={`py-4 rounded-xl font-black text-xl transition-all duration-150 flex flex-col items-center justify-center border-2 ${
                  isSelected
                    ? 'bg-blood-700 text-white border-blood-800 shadow-lg scale-105'
                    : 'bg-slate-50 hover:bg-blood-50 hover:border-blood-300 text-slate-800 border-slate-200'
                }`}
              >
                <span>{group}</span>
              </button>
            );
          })}
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleStartRequest}
            className="flex-1 bg-blood-600 hover:bg-blood-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg flex items-center justify-center space-x-2 text-base transition-colors"
          >
            <span>Find Blood Now (Start Request)</span>
            <ArrowRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => navigate('/register-donor')}
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-4 px-6 rounded-xl flex items-center justify-center space-x-2 text-base border border-slate-200 transition-colors"
          >
            <Users className="w-5 h-5 text-slate-600" />
            <span>Become a Donor</span>
          </button>
        </div>
      </div>

      {/* Trust & Architecture Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-sm">Privacy by Design</h3>
          <p className="text-xs text-slate-600">
            DPDP Act 2023 aware. Donor phone numbers are masked until acceptance. No spam or public broadcasts.
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Zap className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-sm">Escalating Wave Scheduler</h3>
          <p className="text-xs text-slate-600">
            BullMQ job queues automatically expand the candidate search radius from 5 km to 50 km if unanswered.
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-sm">Atomic Concurrency</h3>
          <p className="text-xs text-slate-600">
            Atomic conditional updates prevent over-allocation. Excess donors are safely placed on ordered standby.
          </p>
        </div>
      </div>
    </div>
  );
}
