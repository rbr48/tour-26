import React, { useState, useEffect, useMemo } from 'react';
import {
  HIGHWAY_MILESTONES,
  TOTAL_DISTANCE_KM,
  calculateProgress,
  formatKm,
  findNearestMilestone,
} from '../data/journeyRoute';
import { saveJourneyMilestone, subscribeJourneyMilestone } from '../services/tourStore';
import { triggerHaptic } from '../utils/haptics';
import {
  AlertTriangle,
  ArrowRight,
  Bus,
  CheckCircle2,
  Clock,
  Compass,
  Gauge,
  MapPin,
  Navigation,
  Phone,
  RefreshCw,
  Sparkles,
  Utensils,
  X,
  Zap,
} from 'lucide-react';

const toBn = (n) => String(n ?? 0).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);

export default function JourneyTrackerModal({
  isOpen,
  onClose,
  currentUser = null,
  currentProfile = {},
  members = [],
  coordinatorPhone = '01712345678',
}) {
  const [currentMilestoneIndex, setCurrentMilestoneIndex] = useState(() => {
    const cached = localStorage.getItem('tour_current_milestone');
    return cached ? parseInt(cached, 10) : 0;
  });

  const [remoteData, setRemoteData] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsSpeed, setGpsSpeed] = useState(null); // km/h
  const [gpsLocation, setGpsLocation] = useState(null);
  const [gpsError, setGpsError] = useState(null);

  // Subscribe to live milestone updates from Firestore
  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribeJourneyMilestone((data) => {
      if (data && typeof data.milestoneIndex === 'number') {
        setRemoteData(data);
        setCurrentMilestoneIndex(data.milestoneIndex);
        localStorage.setItem('tour_current_milestone', String(data.milestoneIndex));
      }
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [isOpen]);

  const progress = useMemo(() => {
    return calculateProgress(currentMilestoneIndex);
  }, [currentMilestoneIndex]);

  // Handle milestone check-in
  const handleCheckin = async (idx) => {
    triggerHaptic('medium');
    setIsUpdating(true);
    setCurrentMilestoneIndex(idx);
    localStorage.setItem('tour_current_milestone', String(idx));

    try {
      await saveJourneyMilestone({
        milestoneIndex: idx,
        milestoneId: HIGHWAY_MILESTONES[idx].id,
        milestoneName: HIGHWAY_MILESTONES[idx].name,
        timestamp: Date.now(),
      });
      triggerHaptic('success');
    } catch (err) {
      console.warn('Local check-in saved, network sync failed:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  // On-demand battery-friendly GPS speed & nearest checkpoint check
  const measureGps = () => {
    if (!('geolocation' in navigator)) {
      setGpsError('আপনার ডিভাইসে GPS সুবিধা পাওয়া যায়নি');
      return;
    }
    setGpsLoading(true);
    setGpsError(null);
    triggerHaptic('light');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLoading(false);
        const coords = pos.coords;
        setGpsLocation({ lat: coords.latitude, lng: coords.longitude });

        // Speed is in meters/second, convert to km/h
        if (coords.speed !== null && coords.speed !== undefined && !isNaN(coords.speed)) {
          const kmh = Math.round(coords.speed * 3.6);
          setGpsSpeed(Math.max(0, kmh));
        } else {
          setGpsSpeed(0);
        }

        // Auto-detect nearest milestone
        const nearest = findNearestMilestone(coords.latitude, coords.longitude);
        if (nearest && nearest.distanceKm < 30) {
          // If within 30km, inform user or allow quick check-in
        }
        triggerHaptic('success');
      },
      (err) => {
        setGpsLoading(false);
        setGpsError('GPS লোকেশন পাওয়া যায়নি। অনুমতি সক্রিয় করুন।');
        triggerHaptic('warning');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 },
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-xl max-h-[92vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100 animate-slide-up">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-600 via-teal-700 to-indigo-800 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl shadow-inner border border-white/20">
              🛣️
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <span>হাইওয়ে জার্নি ট্র্যাকার</span>
                <span className="text-[10px] bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full font-extrabold uppercase">
                  লাইভ ৮২০ কিমি
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-white/80">
                রংপুর ➔ বগুড়া ➔ ঢাকা বাইপাস ➔ কুমিল্লা ➔ চট্টগ্রাম ➔ কক্সবাজার
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

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* 1. Main Progress Hero Card */}
          <div className="bg-gradient-to-br from-slate-800/90 to-slate-800/40 border border-slate-700/80 rounded-2xl p-4 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div>
                <span className="text-xs text-slate-400 font-medium">অগ্রগতি</span>
                <div className="text-2xl sm:text-3xl font-black text-amber-400">
                  {toBn(progress.percentage)}% সম্পন্ন
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 font-medium">দূরত্ব অতিক্রান্ত</span>
                <div className="text-base sm:text-lg font-bold text-slate-200">
                  {formatKm(progress.completedKm)}{' '}
                  <span className="text-xs text-slate-400">/ {formatKm(TOTAL_DISTANCE_KM)}</span>
                </div>
              </div>
            </div>

            {/* Visual Highway Track */}
            <div className="relative w-full h-4 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-700 my-3">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-teal-400 to-emerald-400 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${Math.max(5, progress.percentage)}%` }}
              />
              {/* Bus Indicator */}
              <div
                className="absolute top-1/2 -translate-y-1/2 text-sm transition-all duration-700"
                style={{ left: `calc(${Math.min(94, Math.max(2, progress.percentage))}% - 10px)` }}
              >
                🚌
              </div>
            </div>

            {/* Current & Next Quick Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-700/50 text-xs">
              <div className="flex items-start gap-2 bg-slate-900/50 p-2.5 rounded-xl border border-slate-800">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-[10px] text-slate-400 font-semibold">বর্তমান অবস্থান</div>
                  <div className="font-bold text-slate-100">{progress.currentMilestone.name}</div>
                  <div className="text-[10px] text-emerald-400">{progress.currentMilestone.highlight}</div>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-slate-900/50 p-2.5 rounded-xl border border-slate-800">
                <Navigation className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-[10px] text-slate-400 font-semibold">পরবর্তী চেকপয়েন্ট</div>
                  <div className="font-bold text-slate-100">
                    {progress.nextMilestone ? progress.nextMilestone.name : 'গন্তব্যে পৌঁছেছেন!'}
                  </div>
                  <div className="text-[10px] text-amber-400">
                    {progress.nextMilestone
                      ? `বাকি: ${formatKm(progress.nextMilestone.kmFromStart - progress.completedKm)}`
                      : 'আলহামদুলিল্লাহ!'}
                  </div>
                </div>
              </div>
            </div>

            {remoteData?.updatedBy && (
              <div className="text-[10px] text-slate-400 mt-2 text-right">
                সর্বশেষ আপডেট করেছেন: <span className="text-slate-200 font-bold">{remoteData.updatedBy}</span>
              </div>
            )}
          </div>

          {/* 2. On-Demand GPS Speedometer */}
          <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center justify-center">
                <Gauge className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <span>লাইভ স্পিডোমিটার (GPS)</span>
                  {gpsSpeed !== null && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded font-mono font-bold">
                      {toBn(gpsSpeed)} কিমি/ঘণ্টা
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  {gpsError ? (
                    <span className="text-rose-400">{gpsError}</span>
                  ) : gpsSpeed !== null ? (
                    'বাসের তাৎক্ষণিক গতি পরিমাপ করা হয়েছে'
                  ) : (
                    'ব্যাটারি সুরক্ষিত রাখতে এক ট্যাপে গতি মাপুন'
                  )}
                </p>
              </div>
            </div>

            <button
              onClick={measureGps}
              disabled={gpsLoading}
              className="px-3 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-slate-950 text-xs font-black shrink-0 flex items-center gap-1.5 shadow transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${gpsLoading ? 'animate-spin' : ''}`} />
              <span>{gpsLoading ? 'পরিমাপ হচ্ছে...' : 'গতি মাপুন'}</span>
            </button>
          </div>

          {/* 3. Milestone Timeline */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>মহাসড়ক চেকপয়েন্ট ও বিখ্যাত স্টপসমূহ</span>
                <span className="text-[10px] font-normal text-slate-400 font-mono">
                  ({toBn(HIGHWAY_MILESTONES.length)} টি)
                </span>
              </h3>
            </div>

            <div className="space-y-2.5">
              {HIGHWAY_MILESTONES.map((m, idx) => {
                const isPassed = idx < currentMilestoneIndex;
                const isCurrent = idx === currentMilestoneIndex;
                const isUpcoming = idx > currentMilestoneIndex;

                return (
                  <div
                    key={m.id}
                    className={`p-3 rounded-2xl border transition ${
                      isCurrent
                        ? 'bg-amber-950/30 border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                        : isPassed
                          ? 'bg-slate-800/40 border-slate-700/50 opacity-90'
                          : 'bg-slate-900/50 border-slate-800/80 opacity-75'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 border ${
                            isCurrent
                              ? 'bg-amber-400 text-slate-950 border-amber-300 font-black animate-pulse'
                              : isPassed
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {isPassed ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : m.icon}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs sm:text-sm font-bold text-slate-100">
                              {m.name}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              {formatKm(m.kmFromStart)}
                            </span>
                          </div>

                          <div className="text-[11px] text-amber-300/90 font-medium mt-0.5">
                            ✨ {m.highlight}
                          </div>

                          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                            {m.details}
                          </p>

                          {/* Amenities Tags */}
                          <div className="flex items-center gap-1.5 flex-wrap mt-2">
                            {m.amenities.map((a, i) => (
                              <span
                                key={i}
                                className="text-[9px] px-2 py-0.5 rounded-md bg-slate-800/90 text-slate-300 border border-slate-700/60"
                              >
                                {a}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Check-in Action Button */}
                      <div className="shrink-0">
                        {isCurrent ? (
                          <span className="px-2.5 py-1 rounded-xl bg-amber-400 text-slate-950 text-[10px] font-black border border-amber-300 shadow flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span>বর্তমান</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleCheckin(idx)}
                            disabled={isUpdating}
                            className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-bold border border-slate-700 transition"
                          >
                            চেক-ইন
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Emergency Highway Assistance */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5">
            <div className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-rose-400" />
              <span>হাইওয়ে জরুরি যোগাযোগ</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <a
                href={`tel:${coordinatorPhone}`}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 flex items-center justify-center gap-1.5 font-bold"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>কো-অর্ডিনেটর</span>
              </a>
              <a
                href="tel:999"
                className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 flex items-center justify-center gap-1.5 font-bold"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>জরুরি ৯৯৯</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
