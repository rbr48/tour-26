import React, { useState } from 'react';
import {
  Bus, Users, PhoneCall, Sparkles, Check, Armchair,
  Info, Clock, MapPin, ChevronRight, X
} from 'lucide-react';

export default function BusSeatMap({ members = [] }) {
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [activeDeck, setActiveDeck] = useState('both'); // 'upper', 'lower', 'both'

  // Evergreen AC Bus seat configuration
  const UPPER_DECK_SLEEPERS = [
    { id: 'S1', type: 'sleeper', position: 'left-window', member: 'রাজু ভাই (ট্যুর অর্গানাইজার)', phone: '01711000000', label: 'স্লিপার S1', desc: 'আপার ডেক • বাম উইন্ডো' },
    { id: 'S2', type: 'sleeper', position: 'left-aisle', member: 'রাজু ভাই (ট্যুর অর্গানাইজার)', phone: '01711000000', label: 'স্লিপার S2', desc: 'আপার ডেক • বাম আইল' },
    { id: 'S3', type: 'sleeper', position: 'right-window', member: 'আশেক মো: আসিফ ভাই', phone: '01713000000', label: 'স্লিপার S3', desc: 'আপার ডেক • ডান উইন্ডো' },
    { id: 'S4', type: 'sleeper', position: 'right-aisle', member: 'আশেক মো: আসিফ ভাই', phone: '01713000000', label: 'স্লিপার S4', desc: 'আপার ডেক • ডান আইল' },
    { id: 'S5', type: 'sleeper', position: 'left-window', member: 'আশেক মো: আসিফ ভাই', phone: '01713000000', label: 'স্লিপার S5', desc: 'আপার ডেক • বাম উইন্ডো' },
    { id: 'S6', type: 'sleeper', position: 'left-aisle', member: 'আশেক মো: আসিফ ভাই', phone: '01713000000', label: 'স্লিপার S6', desc: 'আপার ডেক • বাম আইল' },
    { id: 'S7', type: 'sleeper', position: 'right-window', member: 'আলিম ভাই', phone: '01717000000', label: 'স্লিপার S7', desc: 'আপার ডেক • ডান উইন্ডো' },
    { id: 'S8', type: 'sleeper', position: 'right-aisle', member: 'আলিম ভাই', phone: '01717000000', label: 'স্লিপার S8', desc: 'আপার ডেক • ডান আইল' },
    { id: 'S9', type: 'sleeper', position: 'left-window', member: 'সাইফুল ভাই / জামাই', phone: '01718000000', label: 'স্লিপার S9', desc: 'আপার ডেক • বাম উইন্ডো' },
    { id: 'S10', type: 'sleeper', position: 'left-aisle', member: 'সাইফুল ভাই / জামাই', phone: '01718000000', label: 'স্লিপার S10', desc: 'আপার ডেক • বাম আইল' },
  ];

  const LOWER_DECK_BUSINESS = [
    { id: 'B1', type: 'business', position: 'left-single', member: 'মাসুদ ভাই (এসবিএল)', phone: '01712000000', label: 'বিজনেস B1', desc: 'লোয়ার ডেক • বিজনেস রিক্লাইনার' },
    { id: 'B2', type: 'business', position: 'right-aisle', member: 'মাসুদ ভাই (এসবিএল)', phone: '01712000000', label: 'বিজনেস B2', desc: 'লোয়ার ডেক • ডাবল রিক্লাইনার' },
    { id: 'B3', type: 'business', position: 'right-window', member: 'মাসুদ ভাই (এসবিএল)', phone: '01712000000', label: 'বিজনেস B3', desc: 'লোয়ার ডেক • ডাবল উইন্ডো' },
    { id: 'B4', type: 'business', position: 'left-single', member: 'শশি ভাই (সচিবুল ভাই)', phone: '01714000000', label: 'বিজনেস B4', desc: 'লোয়ার ডেক • বিজনেস রিক্লাইনার' },
    { id: 'B5', type: 'business', position: 'right-aisle', member: 'শশি ভাই (সচিবুল ভাই)', phone: '01714000000', label: 'বিজনেস B5', desc: 'লোয়ার ডেক • ডাবল রিক্লাইনার' },
    { id: 'B6', type: 'business', position: 'right-window', member: 'শশি ভাই (সচিবুল ভাই)', phone: '01714000000', label: 'বিজনেস B6', desc: 'লোয়ার ডেক • ডাবল উইন্ডো' },
    { id: 'B7', type: 'business', position: 'left-single', member: 'নুরুজ্জামান ভাই', phone: '01715000000', label: 'বিজনেস B7', desc: 'লোয়ার ডেক • বিজনেস রিক্লাইনার' },
    { id: 'B8', type: 'business', position: 'right-aisle', member: 'নুরুজ্জামান ভাই', phone: '01715000000', label: 'বিজনেস B8', desc: 'লোয়ার ডেক • ডাবল রিক্লাইনার' },
    { id: 'B9', type: 'business', position: 'right-window', member: 'নুরুজ্জামান ভাই', phone: '01715000000', label: 'বিজনেস B9', desc: 'লোয়ার ডেক • ডাবল উইন্ডো' },
    { id: 'B10', type: 'business', position: 'left-single', member: 'লতিফ ভাই / খালু (কুড়িগ্রাম)', phone: '01716000000', label: 'বিজনেস B10', desc: 'লোয়ার ডেক • বিজনেস রিক্লাইনার' },
    { id: 'B11', type: 'business', position: 'right-aisle', member: 'লতিফ ভাই / খালু (কুড়িগ্রাম)', phone: '01716000000', label: 'বিজনেস B11', desc: 'লোয়ার ডেক • ডাবল রিক্লাইনার' },
    { id: 'B12', type: 'business', position: 'right-window', member: 'এম এস রানা ভাই (বিকেবি)', phone: '01737910040', label: 'বিজনেস B12', desc: 'লোয়ার ডেক • ডাবল উইন্ডো' },
    { id: 'B13', type: 'business', position: 'back-row', member: 'আলমগীর ভাই (ফটোগ্রাফার)', phone: '01720000000', label: 'বিজনেস B13', desc: 'লোয়ার ডেক • ব্যাক রো' },
    { id: 'B14', type: 'business', position: 'back-row', member: 'অতিরিক্ত / ব্যাকআপ সিট', phone: null, label: 'বিজনেস B14', desc: 'লোয়ার ডেক • রিজার্ভ সিট' },
  ];

  // Helper colors for different families
  const getFamilyColor = (name) => {
    if (!name) return 'bg-slate-100 border-slate-200 text-slate-500';
    if (name.includes('রাজু')) return 'bg-teal-50 border-teal-300 text-teal-800 hover:bg-teal-100';
    if (name.includes('মাসুদ')) return 'bg-blue-50 border-blue-300 text-blue-800 hover:bg-blue-100';
    if (name.includes('আসিফ')) return 'bg-purple-50 border-purple-300 text-purple-800 hover:bg-purple-100';
    if (name.includes('শশি')) return 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100';
    if (name.includes('নুরুজ্জামান')) return 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100';
    if (name.includes('লতিফ')) return 'bg-indigo-50 border-indigo-300 text-indigo-800 hover:bg-indigo-100';
    if (name.includes('আলিম')) return 'bg-cyan-50 border-cyan-300 text-cyan-800 hover:bg-cyan-100';
    if (name.includes('সাইফুল')) return 'bg-rose-50 border-rose-300 text-rose-800 hover:bg-rose-100';
    if (name.includes('রানা')) return 'bg-sky-50 border-sky-300 text-sky-800 hover:bg-sky-100';
    if (name.includes('আলমগীর')) return 'bg-orange-50 border-orange-300 text-orange-800 hover:bg-orange-100';
    return 'bg-slate-100 border-slate-200 text-slate-700';
  };

  return (
    <div className="space-y-6">
      {/* Bus Header Card */}
      <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-cyan-900 text-white p-5 sm:p-6 rounded-3xl shadow-lg relative overflow-hidden border border-teal-700">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-amber-400 text-teal-950 text-xs font-bold rounded-full">
                Evergreen AC Bus
              </span>
              <span className="text-xs text-teal-200">স্লিপার ও বিজনেস ক্লাস</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Bus size={22} className="text-amber-300" /> এভারগ্রীন এসি বাসের ইন্টারেক্টিভ সিট ম্যাপ
            </h3>
            <p className="text-xs text-teal-100">
              রংপুর কামারপাড়া বাস স্ট্যান্ড (১৯ অক্টোবর, সন্ধ্যা ০৬:০০ টা) ➔ কক্সবাজার ডলফিন মোড়
            </p>
          </div>

          {/* Quick Deck Switcher */}
          <div className="flex items-center gap-1.5 bg-teal-950/60 p-1.5 rounded-2xl border border-teal-700">
            <button
              onClick={() => setActiveDeck('both')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeDeck === 'both' ? 'bg-amber-400 text-teal-950 shadow-sm' : 'text-teal-200 hover:bg-teal-800'
              }`}
            >
              উভয় ডেক
            </button>
            <button
              onClick={() => setActiveDeck('upper')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeDeck === 'upper' ? 'bg-amber-400 text-teal-950 shadow-sm' : 'text-teal-200 hover:bg-teal-800'
              }`}
            >
              আপার ডেক (স্লিপার)
            </button>
            <button
              onClick={() => setActiveDeck('lower')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeDeck === 'lower' ? 'bg-amber-400 text-teal-950 shadow-sm' : 'text-teal-200 hover:bg-teal-800'
              }`}
            >
              লোয়ার ডেক (বিজনেস)
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 pt-3 border-t border-teal-700/60 flex flex-wrap items-center justify-between text-xs text-teal-200 gap-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-purple-200 border border-purple-400"></span> স্লিপার বার্থ
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-blue-200 border border-blue-400"></span> বিজনেস ক্লাস
            </span>
            <span className="flex items-center gap-1.5 text-amber-300 font-medium">
              💡 সিটে ট্যাপ করে বিস্তারিত দেখুন
            </span>
          </div>
          <span className="text-xs bg-white/10 px-2 py-0.5 rounded-md font-mono">
            মোট সিট: ২৪টি • কনফার্মড: ২২টি
          </span>
        </div>
      </div>

      {/* Visual Bus Interior */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. UPPER DECK: SLEEPERS */}
        {(activeDeck === 'both' || activeDeck === 'upper') && (
          <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-xs border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-bold text-base text-slate-800 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span> আপার ডেক (Upper Deck Sleeper)
                </h4>
                <p className="text-[11px] text-slate-500">আরামদায়ক ডাবল ও সিঙ্গেল স্লিপার বার্থ</p>
              </div>
              <span className="text-xs bg-purple-50 text-purple-700 font-bold px-2.5 py-1 rounded-xl border border-purple-200">
                ১০টি স্লিপার বার্থ
              </span>
            </div>

            {/* Bus Front Indicator */}
            <div className="w-full py-1.5 bg-slate-100 text-slate-500 text-[11px] font-bold text-center rounded-xl uppercase tracking-wider flex items-center justify-center gap-2">
              <Bus size={14} /> বাসের সম্মুখভাগ (ড্রাইভার কেবিন)
            </div>

            {/* Sleeper Layout Grid */}
            <div className="grid grid-cols-2 gap-3.5 pt-2">
              {UPPER_DECK_SLEEPERS.map(s => {
                const colorClass = getFamilyColor(s.member);
                const isSelected = selectedSeat?.id === s.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => setSelectedSeat(s)}
                    className={`p-3.5 rounded-2xl border-2 transition transform hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between min-h-[90px] shadow-2xs ${colorClass} ${
                      isSelected ? 'ring-2 ring-teal-600 scale-[1.02]' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs bg-white/80 px-2 py-0.5 rounded-md shadow-2xs">
                        {s.id}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">স্লিপার</span>
                    </div>
                    <div>
                      <h5 className="font-bold text-xs leading-tight line-clamp-1">{s.member}</h5>
                      <p className="text-[10px] opacity-75">{s.desc.split('•')[1] || ''}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. LOWER DECK: BUSINESS CLASS */}
        {(activeDeck === 'both' || activeDeck === 'lower') && (
          <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-xs border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-bold text-base text-slate-800 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> লোয়ার ডেক (Lower Deck Business Class)
                </h4>
                <p className="text-[11px] text-slate-500">প্রশস্ত ও আরামদায়ক রিক্লাইনার সিট</p>
              </div>
              <span className="text-xs bg-blue-50 text-blue-700 font-bold px-2.5 py-1 rounded-xl border border-blue-200">
                ১৪টি বিজনেস সিট
              </span>
            </div>

            {/* Bus Front Indicator */}
            <div className="w-full py-1.5 bg-slate-100 text-slate-500 text-[11px] font-bold text-center rounded-xl uppercase tracking-wider flex items-center justify-center gap-2">
              <Bus size={14} /> বাসের সম্মুখভাগ (ড্রাইভার কেবিন)
            </div>

            {/* Business Layout Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              {LOWER_DECK_BUSINESS.map(s => {
                const colorClass = getFamilyColor(s.member);
                const isSelected = selectedSeat?.id === s.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => setSelectedSeat(s)}
                    className={`p-3 rounded-2xl border-2 transition transform hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between min-h-[85px] shadow-2xs ${colorClass} ${
                      isSelected ? 'ring-2 ring-teal-600 scale-[1.02]' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs bg-white/80 px-2 py-0.5 rounded-md shadow-2xs">
                        {s.id}
                      </span>
                      <Armchair size={14} className="opacity-60" />
                    </div>
                    <div>
                      <h5 className="font-bold text-xs leading-tight line-clamp-1">{s.member}</h5>
                      <p className="text-[10px] opacity-75">{s.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Selected Seat Detail Modal / Bottom Drawer */}
      {selectedSeat && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150 cursor-pointer"
          onClick={() => setSelectedSeat(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150 cursor-auto space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center font-mono font-bold text-sm">
                  {selectedSeat.id}
                </span>
                <div>
                  <h4 className="font-bold text-sm text-slate-800">{selectedSeat.label}</h4>
                  <p className="text-[11px] text-slate-500">{selectedSeat.desc}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSeat(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <p className="text-[11px] text-slate-400 font-medium">বরাদ্দকৃত সদস্য / পরিবার:</p>
                <h5 className="font-bold text-base text-slate-900">{selectedSeat.member}</h5>
              </div>

              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/80 text-xs text-amber-950 space-y-1 leading-relaxed">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <Info size={14} /> বাস জার্নি টিপস:
                </div>
                <p>• ছাড়ার সময়: ১৯ অক্টোবর, সন্ধ্যা ০৬:০০ টা (কামারপাড়া)</p>
                <p>• বাসে এসির কারণে হালকা চাদর ও ঘাড়ের বালিশ সাথে রাখবেন।</p>
              </div>

              {selectedSeat.phone && (
                <a
                  href={`tel:${selectedSeat.phone}`}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition"
                >
                  <PhoneCall size={14} /> সদস্যকে সরাসরি কল করুন
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
