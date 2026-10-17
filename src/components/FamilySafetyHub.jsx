import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  Compass,
  MapPin,
  PhoneCall,
  AlertOctagon,
  Navigation,
  Share2,
  Volume2,
  VolumeX,
  X,
  Check,
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

// Preset Critical Tour Landmarks
const TOUR_LANDMARKS = [
  {
    id: 'hotel_sea_moon',
    name: 'হোটেল সি মুন (Hotel Sea Moon)',
    subtitle: 'আমাদের ট্যুর হোটেল ও থাকার রুম',
    lat: 21.4326,
    lng: 91.9774,
    color: 'from-amber-500 to-amber-700'
  },
  {
    id: 'evergreen_bus',
    name: 'এভারগ্রীন এসি বাস পার্কিং',
    subtitle: 'রংপুর ➔ কক্সবাজার প্রধান বাস পয়েন্ট',
    lat: 21.4385,
    lng: 91.9740,
    color: 'from-teal-600 to-teal-800'
  },
  {
    id: 'sugandha_beach',
    name: 'সুগন্ধা বিচ মেইন পয়েন্ট',
    subtitle: 'সন্ধ্যায় ফ্যামিলি আড্ডা ও মিলনমেলা',
    lat: 21.4298,
    lng: 91.9752,
    color: 'from-blue-600 to-indigo-800'
  },
  {
    id: 'laboni_beach',
    name: 'লাবণী বিচ পয়েন্ট ও ঝাউবন',
    subtitle: 'সকালে সূর্যাস্ত ও হাঁটাচলা',
    lat: 21.4390,
    lng: 91.9712,
    color: 'from-cyan-600 to-blue-700'
  }
];

// Emergency Hotline Contacts
const EMERGENCY_CONTACTS = [
  {
    name: 'কক্সবাজার ট্যুরিস্ট পুলিশ (হটলাইন)',
    phone: '01320-163599',
    role: 'ট্যুরিস্ট পুলিশ',
    priority: true
  },
  {
    name: 'জাতীয় জরুরি সেবা (পুলিশ / অ্যাম্বুলেন্স)',
    phone: '999',
    role: 'জরুরি সেবা',
    priority: true
  },
  {
    name: 'কক্সবাজার সদর হাসপাতাল ইমার্জেন্সি',
    phone: '01730-324785',
    role: 'হাসপাতাল',
    priority: false
  }
];

// Distance calculation using Haversine Formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c); // in metres
}

// Bearing calculation in degrees (0 = North, 90 = East, 180 = South, 270 = West)
function calculateBearing(lat1, lon1, lat2, lon2) {
  const y = Math.sin((lon2 - lon1) * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
            Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos((lon2 - lon1) * Math.PI / 180);
  const θ = Math.atan2(y, x);
  return (θ * 180 / Math.PI + 360) % 360;
}

export default function FamilySafetyHub({
  isOpen,
  onClose,
  currentUser = null,
  currentProfile = {},
  familyLocations = {},
  members = [],
  onShareLocation,
  onClearLocation
}) {
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState(TOUR_LANDMARKS[0]);
  const [locationNote, setLocationNote] = useState('');
  const [shareSuccess, setShareSuccess] = useState(false);

  // Siren audio synth state
  const [isSirenPlaying, setIsSirenPlaying] = useState(false);
  const audioCtxRef = useRef(null);
  const oscillatorRef = useRef(null);
  const sirenIntervalRef = useRef(null);

  // Get current GPS location (Native Android Geolocation + Web fallback)
  const handleGetCurrentLocation = async () => {
    setIsLocating(true);
    setLocationError('');

    if (Capacitor.isNativePlatform()) {
      try {
        const pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000
        });
        if (pos && pos.coords) {
          const coords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy || 10),
            timestamp: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })
          };
          setUserLocation(coords);
          setIsLocating(false);
          return;
        }
      } catch (nativeErr) {
        console.warn('Native geolocation failed, falling back to browser API:', nativeErr);
      }
    }

    if (!navigator.geolocation) {
      setLocationError('আপনার ডিভাইসে জিপিএস লোকেশন সমর্থিত নয়');
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
          timestamp: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })
        };
        setUserLocation(coords);
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        setLocationError('লোকেশন পাওয়া যায়নি। অনুগ্রহ করে ফোনের GPS চালু করুন।');
        console.warn('Geolocation error:', err);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  useEffect(() => {
    if (!isOpen) return undefined;
    const timer = setTimeout(() => handleGetCurrentLocation(), 0);
    return () => clearTimeout(timer);
  }, [isOpen]);

  // Share user location to tour family
  const handleBroadcastLocation = () => {
    if (!userLocation) {
      handleGetCurrentLocation();
      return;
    }

    const payload = {
      uid: currentUser?.uid ?? null,
      name: currentProfile?.displayName || currentUser?.displayName || 'পরিবারের সদস্য',
      role: currentProfile?.role || 'সদস্য',
      lat: userLocation.lat,
      lng: userLocation.lng,
      accuracy: userLocation.accuracy,
      note: locationNote.trim() || 'কক্সবাজার সমুদ্র সৈকত এলাকায় অবস্থান করছি',
      time: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })
    };

    if (onShareLocation) {
      onShareLocation(payload);
    }

    setShareSuccess(true);
    setTimeout(() => setShareSuccess(false), 3000);
  };

  // Web Audio Dual-Tone Police/Emergency Siren
  const toggleSiren = () => {
    if (isSirenPlaying) {
      // Stop siren
      if (oscillatorRef.current) {
        try { oscillatorRef.current.stop(); } catch {}
      }
      if (sirenIntervalRef.current) {
        clearInterval(sirenIntervalRef.current);
      }
      if (audioCtxRef.current) {
        try { audioCtxRef.current.close(); } catch {}
      }
      setIsSirenPlaying(false);
    } else {
      // Start siren
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        gain.gain.setValueAtTime(0.8, ctx.currentTime);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        oscillatorRef.current = osc;

        let high = false;
        sirenIntervalRef.current = setInterval(() => {
          if (oscillatorRef.current && ctx.state === 'running') {
            const freq = high ? 650 : 950;
            osc.frequency.exponentialRampToValueAtTime(freq, ctx.currentTime + 0.15);
            high = !high;
          }
        }, 250);

        setIsSirenPlaying(true);
      } catch (e) {
        console.error('Audio siren failed:', e);
        alert('অডিও সাইরেন চালু করতে সমস্যা হয়েছে।');
      }
    }
  };

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (sirenIntervalRef.current) clearInterval(sirenIntervalRef.current);
      if (oscillatorRef.current) {
        try { oscillatorRef.current.stop(); } catch {}
      }
      if (audioCtxRef.current) {
        try { audioCtxRef.current.close(); } catch {}
      }
    };
  }, []);

  if (!isOpen) return null;

  const coordinator = members.find((member) => member.role === 'coordinator');
  const contacts = [
    {
      name: coordinator ? `${coordinator.name}` : 'ট্যুর কো-অর্ডিনেটর',
      phone: coordinator?.phone || '',
      role: 'পরিচালক',
      priority: true,
    },
    ...EMERGENCY_CONTACTS,
  ];


  // Calculate distance and bearing to selected target
  let distanceText = 'লোকেশন লোড হচ্ছে...';
  let bearingDegrees = 0;
  if (userLocation && selectedTarget) {
    const dist = calculateDistance(userLocation.lat, userLocation.lng, selectedTarget.lat, selectedTarget.lng);
    distanceText = dist < 1000 ? `${dist} মিটার` : `${(dist / 1000).toFixed(2)} কি.মি.`;
    bearingDegrees = calculateBearing(userLocation.lat, userLocation.lng, selectedTarget.lat, selectedTarget.lng);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-rose-100">

        {/* Top Header */}
        <div className="bg-gradient-to-r from-rose-900 via-rose-800 to-red-950 p-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-rose-500 text-rose-950 flex items-center justify-center font-extrabold shadow-md">
              <ShieldAlert size={22} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-sm sm:text-base">পরিবার সুরক্ষা ও সৈকত কম্পাস</h3>
                <span className="text-[9px] bg-rose-500 text-white font-bold px-1.5 py-0.2 rounded-md">Safety Hub</span>
              </div>
              <p className="text-[10px] text-rose-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                কক্সবাজার সমুদ্র সৈকত লাইভ ন্যাভিগেশন ও ইমার্জেন্সি
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              if (isSirenPlaying) toggleSiren();
              onClose();
            }}
            className="p-2 text-rose-200 hover:text-white rounded-xl hover:bg-rose-700/60 transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/60 text-xs">

          {/* 1. COMPASS & RETURN TO BASE CARD */}
          <div className="bg-gradient-to-br from-teal-950 via-teal-900 to-slate-900 text-white p-4 sm:p-5 rounded-3xl shadow-md border border-teal-700/60 relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Compass className="text-amber-400" size={18} />
                <h4 className="font-extrabold text-xs sm:text-sm text-teal-100">সৈকত কম্পাস ও ফেরার পথ</h4>
              </div>

              <select
                value={selectedTarget.id}
                onChange={(e) => {
                  const found = TOUR_LANDMARKS.find(l => l.id === e.target.value);
                  if (found) setSelectedTarget(found);
                }}
                className="bg-teal-900/90 text-amber-300 font-bold text-[11px] px-2.5 py-1.5 rounded-xl border border-teal-600 focus:outline-none cursor-pointer"
              >
                {TOUR_LANDMARKS.map(lm => (
                  <option key={lm.id} value={lm.id}>{lm.name}</option>
                ))}
              </select>
            </div>

            {/* Compass Visual Pointer */}
            <div className="flex flex-col sm:flex-row items-center gap-4 py-2">
              <div className="relative w-28 h-28 rounded-full border-2 border-teal-500/40 bg-teal-950/80 flex items-center justify-center shrink-0 shadow-inner">
                {/* Dial Directions */}
                <span className="absolute top-1 text-[9px] font-bold text-amber-400">N</span>
                <span className="absolute right-1 text-[9px] font-bold text-teal-400">E</span>
                <span className="absolute bottom-1 text-[9px] font-bold text-teal-400">S</span>
                <span className="absolute left-1 text-[9px] font-bold text-teal-400">W</span>

                {/* Rotating Needle */}
                <div
                  className="w-1.5 h-20 bg-gradient-to-t from-transparent via-amber-400 to-rose-500 rounded-full transition-transform duration-700 transform origin-center shadow-lg"
                  style={{ transform: `rotate(${bearingDegrees}deg)` }}
                />
                <div className="absolute w-3 h-3 bg-amber-400 rounded-full ring-2 ring-white"></div>
              </div>

              <div className="space-y-1 text-center sm:text-left min-w-0">
                <span className="text-[10px] text-teal-300 uppercase tracking-wider font-semibold">
                  গন্তব্য: {selectedTarget.name}
                </span>
                <p className="text-xl sm:text-2xl font-black text-amber-300">
                  {userLocation ? distanceText : 'লোকেশন প্রয়োজন'}
                </p>
                <p className="text-[11px] text-teal-200/80 leading-tight">
                  {selectedTarget.subtitle}
                </p>

                <div className="pt-2 flex flex-wrap gap-2 justify-center sm:justify-start">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${selectedTarget.lat},${selectedTarget.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-teal-950 font-bold rounded-xl flex items-center gap-1.5 text-[11px] shadow-sm transition"
                  >
                    <Navigation size={12} /> ম্যাপে রুট দেখুন
                  </a>

                  <button
                    onClick={handleGetCurrentLocation}
                    disabled={isLocating}
                    className="px-2.5 py-1.5 bg-teal-800 hover:bg-teal-700 text-teal-100 font-semibold rounded-xl flex items-center gap-1 text-[10px] transition cursor-pointer"
                  >
                    <Compass size={11} className={isLocating ? 'animate-spin' : ''} />
                    {isLocating ? 'রিফ্রেশ হচ্ছে...' : 'লোকেশন রিফ্রেশ'}
                  </button>
                </div>
              </div>
            </div>

            {locationError && (
              <p className="text-[10px] text-rose-300 mt-2 bg-rose-950/60 p-2 rounded-xl border border-rose-800">
                ⚠️ {locationError}
              </p>
            )}
          </div>

          {/* 2. SHARE MY LIVE LOCATION WITH FAMILY */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="text-rose-600" size={17} />
                <h4 className="font-bold text-xs text-slate-800">পরিবারের সাথে অবস্থান শেয়ার করুন</h4>
              </div>
              {userLocation && (
                <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                  ✓ জিপিএস সক্রিয় (±{userLocation.accuracy}মি.)
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-500">
              সৈকতে দলছুট হলে বা আপনি কোথায় আছেন পরিবারকে জানাতে এই বাটনে চাপুন।
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="একটি নোট দিন (যেমন: সুগন্ধা বিচে ছাতার নিচে আছি)..."
                value={locationNote}
                onChange={(e) => setLocationNote(e.target.value)}
                className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-rose-600 bg-slate-50"
              />
              <button
                onClick={handleBroadcastLocation}
                disabled={isLocating}
                className="px-4 py-2 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition cursor-pointer shrink-0 text-xs"
              >
                <Share2 size={13} /> {shareSuccess ? 'শেয়ার হয়েছে!' : 'অবস্থান পাঠান'}
              </button>
            </div>

            {familyLocations[currentUser?.email?.toLowerCase()] && onClearLocation && (
              <button
                type="button"
                onClick={onClearLocation}
                className="text-[11px] font-semibold text-rose-700 hover:underline self-start"
              >
                আমার অবস্থান শেয়ার বন্ধ করুন
              </button>
            )}

            {shareSuccess && (
              <div className="p-2 bg-emerald-50 text-emerald-800 rounded-xl text-[11px] font-semibold flex items-center gap-1 border border-emerald-200 animate-in fade-in">
                <Check size={14} className="text-emerald-600" /> আপনার অবস্থান সফলভাবে ফ্যামিলি ড্যাশবোর্ডে পোস্ট হয়েছে!
              </div>
            )}
          </div>

          {/* 3. EMERGENCY SOS SIREN & HOTLINE DIALER */}
          <div className="bg-gradient-to-r from-red-50 to-rose-50 p-4 rounded-3xl border border-rose-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-900">
                <AlertOctagon size={18} className="text-rose-600 animate-pulse" />
                <h4 className="font-extrabold text-xs">🚨 জরুরি অ্যালার্ম ও লাইফগার্ড কল</h4>
              </div>

              {/* Siren Toggle Button */}
              <button
                onClick={toggleSiren}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer ${
                  isSirenPlaying
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-white hover:bg-rose-100 text-rose-700 border border-rose-300'
                }`}
              >
                {isSirenPlaying ? <VolumeX size={15} /> : <Volume2 size={15} />}
                <span>{isSirenPlaying ? 'সাইরেন বন্ধ করুন' : 'উচ্চ শব্দে সাইরেন বাজান'}</span>
              </button>
            </div>

            <p className="text-[10px] text-rose-800 leading-tight">
              * জরুরি পরিস্থিতিতে ভিড়ের মধ্যে দৃষ্টি আকর্ষণ করতে সাইরেন চালু করুন। নিচে ট্যুর লিডার ও জরুরি নম্বরে সরাসরি কল করার অপশন রয়েছে:
            </p>

            {/* Quick Emergency Dial Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {contacts.map((contact, idx) => (
                <a
                  key={idx}
                  href={contact.phone ? `tel:${contact.phone}` : undefined}
                  aria-disabled={!contact.phone}
                  className={`p-2.5 rounded-2xl flex items-center justify-between border transition shadow-2xs ${
                    contact.priority
                      ? 'bg-white hover:bg-rose-50 border-rose-200 text-rose-950 font-bold'
                      : 'bg-white/80 hover:bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-xs truncate">{contact.name}</p>
                    <p className="text-[10px] text-slate-500">{contact.phone || 'নম্বর যুক্ত করা হয়নি'}</p>
                  </div>
                  <div className="w-7 h-7 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <PhoneCall size={13} />
                  </div>
                </a>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
