import React, { useState, useMemo } from 'react';
import {
  VERIFIED_RESTAURANTS,
  SIGHTSEEING_SPOTS,
  getSwimSafetyStatus,
  getSunsetCountdown,
} from '../data/coxGuide';
import { triggerHaptic } from '../utils/haptics';
import {
  AlertOctagon,
  AlertTriangle,
  Compass,
  ExternalLink,
  Flame,
  LifeBuoy,
  MapPin,
  Navigation,
  Phone,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Sun,
  Sunset,
  Utensils,
  Waves,
  X,
} from 'lucide-react';

const toBn = (n) => String(n ?? 0).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);

export default function BeachGuideModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('food'); // 'food' | 'spots' | 'safety'
  const [searchQuery, setSearchQuery] = useState('');

  const now = useMemo(() => new Date(), []);
  const swimSafety = useMemo(() => getSwimSafetyStatus(now), [now]);
  const sunsetInfo = useMemo(() => getSunsetCountdown(now), [now]);

  // Filter restaurants by search query
  const filteredRestaurants = useMemo(() => {
    if (!searchQuery.trim()) return VERIFIED_RESTAURANTS;
    const q = searchQuery.toLowerCase();
    return VERIFIED_RESTAURANTS.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.specialties.some((s) => s.toLowerCase().includes(q)),
    );
  }, [searchQuery]);

  // Filter spots by search query
  const filteredSpots = useMemo(() => {
    if (!searchQuery.trim()) return SIGHTSEEING_SPOTS;
    const q = searchQuery.toLowerCase();
    return SIGHTSEEING_SPOTS.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.highlights.toLowerCase().includes(q) ||
        s.tips.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-xl max-h-[92vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100 animate-slide-up">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-teal-700 via-cyan-800 to-indigo-900 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl shadow-inner border border-white/20">
              🌊
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <span>কক্সবাজার সৈকত ও খাবার গাইড</span>
                <span className="text-[10px] bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full font-extrabold uppercase">
                  ভেরিফাইড
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-white/80">
                লাইভ জোয়ার-ভাটা সুইম সেফটি, সূর্যাস্ত ও সেরা রেস্তোরাঁ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-black/20 hover:bg-black/30 text-white/90 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* 1. Live Swim Safety Indicator Card */}
          <div
            className={`p-4 rounded-2xl border shadow-lg transition ${
              swimSafety.flag === 'green'
                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-100 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                : swimSafety.flag === 'red'
                  ? 'bg-rose-950/40 border-rose-500/60 text-rose-100 shadow-[0_0_15px_rgba(244,63,94,0.2)]'
                  : 'bg-amber-950/40 border-amber-500/50 text-amber-100'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl shrink-0 shadow ${
                    swimSafety.flag === 'green'
                      ? 'bg-emerald-500 text-slate-950'
                      : swimSafety.flag === 'red'
                        ? 'bg-rose-600 text-white animate-bounce'
                        : 'bg-amber-400 text-slate-950'
                  }`}
                >
                  {swimSafety.flag === 'green' ? '🟢' : swimSafety.flag === 'red' ? '🚩' : '🟡'}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm sm:text-base font-black">
                      {swimSafety.title}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-black/30 border border-white/10">
                      {swimSafety.badge}
                    </span>
                  </div>
                  <p className="text-xs mt-1 leading-relaxed opacity-90">
                    {swimSafety.desc}
                  </p>
                  <div className="text-[11px] font-bold mt-2 flex items-center gap-1.5 opacity-95">
                    <LifeBuoy className="w-3.5 h-3.5 shrink-0" />
                    <span>পরামর্শ: {swimSafety.tips}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Sunset & Golden Hour Radar */}
          <div className="bg-gradient-to-r from-amber-900/40 via-orange-950/40 to-slate-800/60 border border-amber-500/30 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center text-xl shrink-0">
                {sunsetInfo.isGoldenHour ? '🌅' : '🌇'}
              </div>
              <div>
                <div className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                  <span>{sunsetInfo.title}</span>
                  {sunsetInfo.isGoldenHour && (
                    <span className="text-[9px] px-1.5 py-0.2 bg-amber-400 text-slate-950 font-extrabold rounded animate-pulse">
                      PHOTO TIME
                    </span>
                  )}
                </div>
                <div className="text-sm font-extrabold text-slate-100">
                  {sunsetInfo.countdownText}
                </div>
                <p className="text-[11px] text-slate-400">
                  {sunsetInfo.subtext}
                </p>
              </div>
            </div>
          </div>

          {/* 3. Navigation Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-800/80 rounded-2xl border border-slate-700/60">
            <button
              onClick={() => {
                triggerHaptic('light');
                setActiveTab('food');
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition ${
                activeTab === 'food'
                  ? 'bg-teal-500 text-slate-950 shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>রেস্তোরাঁ ও খাবার</span>
            </button>

            <button
              onClick={() => {
                triggerHaptic('light');
                setActiveTab('spots');
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition ${
                activeTab === 'spots'
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>দর্শনীয় স্থান</span>
            </button>

            <button
              onClick={() => {
                triggerHaptic('light');
                setActiveTab('safety');
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition ${
                activeTab === 'safety'
                  ? 'bg-rose-500 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <LifeBuoy className="w-3.5 h-3.5" />
              <span>লাইফগার্ড</span>
            </button>
          </div>

          {/* Search Box for food / spots */}
          {activeTab !== 'safety' && (
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={activeTab === 'food' ? 'মাছ, ভর্তা বা রেস্তোরাঁর নাম খুঁজুন...' : 'স্থান বা বিচের নাম খুঁজুন...'}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-teal-500 transition"
              />
            </div>
          )}

          {/* TAB 1: Restaurants */}
          {activeTab === 'food' && (
            <div className="space-y-3">
              {filteredRestaurants.map((r) => (
                <div
                  key={r.id}
                  className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3.5 hover:border-slate-600 transition flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-100 text-sm">{r.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 font-bold border border-teal-500/30">
                          ⭐ {toBn(r.rating)}
                        </span>
                      </div>
                      <div className="text-[11px] text-amber-300/90 font-medium mt-0.5">
                        {r.category} • <span className="text-slate-300">{r.location}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        হোটেল থেকে দূরত্ব: {r.distanceFromHotel}
                      </div>
                    </div>

                    <a
                      href={r.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-slate-700/60 hover:bg-teal-600 hover:text-slate-950 text-slate-300 border border-slate-600 transition shrink-0"
                      title="গুগল ম্যাপসে দেখুন"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>

                  {/* Specialties Pills */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {r.specialties.map((spec, i) => (
                      <span
                        key={i}
                        className="text-[9px] px-2 py-0.5 rounded-md bg-slate-900/80 text-slate-200 border border-slate-700"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-700/50 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">
                      আনুমানিক খরচ: <strong className="text-emerald-400">{r.priceRange}</strong>
                    </span>
                    <span className="text-[10px] text-slate-400 italic">💡 {r.tip}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 2: Sightseeing Spots */}
          {activeTab === 'spots' && (
            <div className="space-y-3">
              {filteredSpots.map((s) => (
                <div
                  key={s.id}
                  className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3.5 hover:border-slate-600 transition flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-bold text-slate-100 text-sm">{s.name}</span>
                      <div className="text-[11px] text-amber-300 font-medium mt-0.5">
                        হোটেল সি মুন থেকে: {s.distanceFromHotel}
                      </div>
                      <div className="text-[10px] text-teal-400 font-semibold">
                        সেরা সময়: {s.bestTime}
                      </div>
                    </div>

                    <a
                      href={s.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-slate-700/60 hover:bg-amber-400 hover:text-slate-950 text-slate-300 border border-slate-600 transition shrink-0"
                      title="গুগল ম্যাপস নেভিগেশন"
                    >
                      <Navigation className="w-4 h-4" />
                    </a>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    ✨ {s.highlights}
                  </p>

                  <div className="text-[10px] text-slate-400 pt-1.5 border-t border-slate-700/50">
                    💡 <span className="font-semibold text-slate-300">পরামর্শ:</span> {s.tips}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: Lifeguard & Emergency Safety */}
          {activeTab === 'safety' && (
            <div className="space-y-3 text-xs">
              <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 space-y-2.5">
                <h4 className="font-bold text-slate-100 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>সৈকতে নিরাপদ থাকার ৬টি সুবর্ণ নিয়ম</span>
                </h4>
                <ul className="space-y-1.5 text-slate-300 list-disc list-inside text-[11px] leading-relaxed">
                  <li>ভাটার সময় পানিতে নামা সম্পূর্ণ পরিহার করুন (জোয়ারের সময় স্নান করুন)।</li>
                  <li>সবসময় যেখানে লাইফগার্ডের ওয়াচ-টাওয়ার আছে তার কাছাকাছি গোসল করুন।</li>
                  <li>বুক পানির বেশি গভীরে কখনো যাবেন না, সাগরে গুপ্ত গর্ত থাকে।</li>
                  <li>শিশুদের হাত ধরে রাখুন, কোনো অবস্থাতেই একা সৈকতে ছাড়বেন না।</li>
                  <li>চোরাস্রোতে পড়লে ভয় না পেয়ে তীরের সমান্তরালে সাঁতার কাটুন।</li>
                  <li>সূর্যাস্তের পর বা রাতে সাগরে স্নান করা কঠোরভাবে নিষিদ্ধ।</li>
                </ul>
              </div>

              {/* Direct Emergency Dials */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <a
                  href="tel:01320169999"
                  className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 flex items-center justify-between font-bold"
                >
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-teal-400" />
                    <div>
                      <div>ট্যুরিস্ট পুলিশ কন্ট্রোল</div>
                      <div className="text-[10px] text-slate-400 font-mono">01320-169999</div>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-teal-500/20 text-teal-300">কল করুন</span>
                </a>

                <a
                  href="tel:01819338800"
                  className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 flex items-center justify-between font-bold"
                >
                  <div className="flex items-center gap-2">
                    <LifeBuoy className="w-4 h-4 text-rose-400" />
                    <div>
                      <div>সি সেইফ লাইফগার্ড</div>
                      <div className="text-[10px] text-slate-400 font-mono">01819-338800</div>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">কল করুন</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
