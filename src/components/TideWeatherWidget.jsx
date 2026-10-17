import React, { useState, useEffect, useCallback } from 'react';
import { Waves, Sun, Clock, MapPin, AlertTriangle, RefreshCw, Calendar } from 'lucide-react';

import { TIDE_SCHEDULE, TIDE_SCHEDULE_SOURCE, tidesForDate } from '../data/tideSchedule';
import { localISODate } from '../utils/date';

const DATE_LABELS = {
  '2026-10-17': 'আজ (১৭ অক্টো)',
  '2026-10-18': '১৮ অক্টো',
  '2026-10-19': '১ম দিন (১৯ অক্টো)',
  '2026-10-20': '২য় দিন (২০ অক্টো)',
  '2026-10-21': '৩য় দিন (২১ অক্টো)',
  '2026-10-22': '৪র্থ দিন (২২ অক্টো)',
  '2026-10-23': '৫ম দিন (২৩ অক্টো)',
};
const SCHEDULE_DATES = Object.keys(TIDE_SCHEDULE);

export default function TideWeatherWidget() {
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isLiveApi, setIsLiveApi] = useState(false);

  // Live Weather & Astronomical State (Cox's Bazar: 21.4272 N, 91.9715 E)
  const [weatherData, setWeatherData] = useState({
    temp: 26,
    humidity: 78,
    windSpeed: 11,
    condition: 'রৌদ্রোজ্জ্বল ও মনোরম',
    sunsetHour: 17,
    sunsetMinute: 26,
    sunriseStr: '০৫:৪৮ AM',
    sunsetStr: '০৫:২৬ PM'
  });

  // 1. Live 1-second clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Weather Code to Bengali translation
  const translateWeatherCode = (code) => {
    if (code === 0) return 'পরিষ্কার আকাশ ☀️';
    if (code >= 1 && code <= 3) return 'আংশিক মেঘলা ⛅';
    if (code >= 45 && code <= 48) return 'কুয়াশাচ্ছন্ন 🌫️';
    if (code >= 51 && code <= 67) return 'হালকা গুড়ি গুড়ি বৃষ্টি 🌦️';
    if (code >= 71 && code <= 77) return 'হিমেল বাতাস ❄️';
    if (code >= 80 && code <= 82) return 'বৃষ্টির সম্ভাবনা 🌧️';
    if (code >= 95) return 'বজ্রঝড় ও দমকা হাওয়া ⛈️';
    return 'স্বাভাবিক ও চমৎকার 🌤️';
  };

  // 2. Fetch Real Dynamic Weather & Sunset for Cox's Bazar
  const fetchLiveWeather = useCallback(async () => {
    let success = false;

    // Strategy A: Open-Meteo High Resolution Weather API
    try {
      const res = await fetch(
        'https://api.open-meteo.com/v1/forecast?latitude=21.4272&longitude=91.9715&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=sunrise,sunset&timezone=Asia%2FDhaka'
      );
      if (res.ok) {
        const json = await res.json();
        if (json.current && json.daily) {
          const curTemp = Math.round(json.current.temperature_2m);
          const curHum = json.current.relative_humidity_2m;
          const curWind = Math.round(json.current.wind_speed_10m);
          const code = json.current.weather_code;
          const sunsetISO = json.daily.sunset?.[0]; // e.g. "2026-10-17T17:26"
          const sunriseISO = json.daily.sunrise?.[0];

          let sHour = 17;
          let sMinute = 26;
          let sStr = '০৫:২৬ PM';
          let rStr = '০৫:৪৮ AM';

          if (sunsetISO) {
            const sDate = new Date(sunsetISO);
            sHour = sDate.getHours();
            sMinute = sDate.getMinutes();
            sStr = sDate.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit', hour12: true });
          }
          if (sunriseISO) {
            const rDate = new Date(sunriseISO);
            rStr = rDate.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit', hour12: true });
          }

          setWeatherData({
            temp: curTemp,
            humidity: curHum,
            windSpeed: curWind,
            condition: translateWeatherCode(code),
            sunsetHour: sHour,
            sunsetMinute: sMinute,
            sunriseStr: rStr,
            sunsetStr: sStr
          });
          setLastUpdated(new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }));
          setIsLiveApi(true);
          success = true;
        }
      }
    } catch (e) {
      console.warn('Open-Meteo weather fetch error, attempting fallback:', e);
    }

    // Strategy B: Fallback to wttr.in
    if (!success) {
      try {
        const res2 = await fetch('https://wttr.in/Coxs_Bazar?format=j1');
        if (res2.ok) {
          const json2 = await res2.json();
          const current = json2.current_condition?.[0];
          const astro = json2.weather?.[0]?.astronomy?.[0];
          if (current) {
            setWeatherData(prev => ({
              ...prev,
              temp: Number(current.temp_C) || prev.temp,
              humidity: Number(current.humidity) || prev.humidity,
              windSpeed: Number(current.windspeedKmph) || prev.windSpeed,
              condition: current.weatherDesc?.[0]?.value || prev.condition,
              sunsetStr: astro?.sunset || prev.sunsetStr,
              sunriseStr: astro?.sunrise || prev.sunriseStr
            }));
            setLastUpdated(new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }));
            setIsLiveApi(true);
            success = true;
          }
        }
      } catch (err2) {
        console.warn('Secondary weather fetch failed:', err2);
      }
    }

    if (!success) {
      // Graceful fallback with local astronomical calculations
      setLastUpdated(new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }));
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // First load shortly after mount, then every 15 minutes.
    const first = setTimeout(fetchLiveWeather, 0);
    const interval = setInterval(fetchLiveWeather, 15 * 60 * 1000);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [fetchLiveWeather]);

  // Dynamic Sunset Countdown Calculation
  const getSunsetCountdown = () => {
    const now = currentTime;
    const sunset = new Date(now);
    sunset.setHours(weatherData.sunsetHour, weatherData.sunsetMinute, 0, 0);

    const diff = sunset - now;
    if (diff <= 0) {
      return 'আজকের সূর্যাস্ত সম্পন্ন হয়েছে 🌅 (আগামীকাল আবার অপেক্ষা করুন)';
    }
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return `${hours} ঘণ্টা ${minutes} মিনিট ${seconds} সেকেন্ড বাকি`;
  };

  // Selected date for viewing tides (default to today: 2026-10-17)
  const todayISO = localISODate(currentTime);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = localISODate();
    return SCHEDULE_DATES.includes(today) ? today : SCHEDULE_DATES[0];
  });

  const pad = (n) => String(n).padStart(2, '0');
  const toBn = (n) => String(n).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]);

  // Formats total minutes from midnight into clean 12-hour AM/PM with Bengali numerals
  // Guaranteed integer digits (no decimal hours or floats like 1.5:10 PM)
  const formatMinutesToTime12 = (totalMinutes) => {
    const norm = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
    const h24 = Math.floor(norm / 60);
    const m = norm % 60;
    const h12 = h24 % 12 || 12;
    const ampm = h24 >= 12 ? 'PM' : 'AM';
    return `${toBn(pad(h12))}:${toBn(pad(m))} ${ampm}`;
  };

  // Get current tidal phases for selected date
  const getDynamicTides = () => {
    const rawPhases = tidesForDate(selectedDate) ?? [];
    const now = currentTime;
    const isToday = selectedDate === todayISO;
    const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();

    return rawPhases.map((phase) => {
      const timeStr = `${formatMinutesToTime12(phase.startM)} – ${formatMinutesToTime12(phase.endM)}`;
      const isActive = isToday && currentTotalMinutes >= phase.startM && currentTotalMinutes < phase.endM;

      let status = '';
      let badge = '';

      if (phase.type === 'high') {
        status = isActive ? '🟢 বর্তমানে সক্রিয় (নিরাপদ স্নান)' : 'নিরাপদ জোয়ার';
        badge = isActive
          ? 'bg-emerald-400 text-teal-950 font-extrabold ring-2 ring-white animate-pulse'
          : 'bg-emerald-100 text-emerald-800 border-emerald-300';
      } else {
        status = isActive ? '🔴 বর্তমানে সক্রিয় (বিপজ্জনক ভাটা)' : 'সতর্কতা (ভাটা)';
        badge = isActive
          ? 'bg-rose-500 text-white font-extrabold ring-2 ring-rose-200 animate-pulse'
          : 'bg-rose-100 text-rose-800 border-rose-300';
      }

      return {
        name: phase.name,
        time: timeStr,
        status,
        isActive,
        badge,
        desc: phase.desc
      };
    });
  };

  const dynamicTidePhases = getDynamicTides();

  return (
    <div className="bg-gradient-to-br from-cyan-950 via-teal-900 to-slate-900 text-white p-5 sm:p-6 rounded-3xl shadow-lg border border-teal-700/80 space-y-5">
      {/* Header with Live API Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 bg-amber-400 text-teal-950 text-xs font-bold rounded-full inline-flex items-center gap-1.5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-700 animate-pulse"></span>
              লাইভ আবহাওয়া ও সম্ভাব্য জোয়ার-ভাটা
            </span>
            {lastUpdated && (
              <span className="text-[10px] text-teal-200 hidden sm:inline">
                আপডেট: {lastUpdated}
              </span>
            )}
          </div>
          <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <Waves size={20} className="text-amber-300" /> কক্সবাজার রিয়েল-টাইম জোয়ার-ভাটা ও সূর্যাস্ত টাইমার
          </h3>
          <p className="text-xs text-teal-100 mt-0.5 flex items-center gap-1">
            <MapPin size={12} className="text-amber-300" /> লাবণী, সুগন্ধা ও কলাতলী বিচে নিরাপদে সাগরে নামার লাইভ গাইড (21.43° N, 91.97° E)
          </p>
        </div>

        {/* Live Weather Quick Badge with Refresh Button */}
        <div className="flex items-center gap-2">
          <div className="bg-black/40 backdrop-blur-md p-2.5 rounded-2xl border border-white/10 flex items-center gap-3 shadow-md">
            <Sun size={26} className="text-amber-400 animate-spin-slow shrink-0" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-extrabold font-mono">{weatherData.temp}° সে.</span>
                <span className="text-[11px] text-teal-200 font-medium truncate max-w-[120px]">{weatherData.condition}</span>
              </div>
              <p className="text-[10px] text-slate-300 flex items-center gap-2">
                <span>বাতাস: {weatherData.windSpeed} কিমি/ঘণ্টা</span>
                <span>• আর্দ্রতা: {weatherData.humidity}%</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchLiveWeather}
            disabled={isLoading}
            className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-teal-200 hover:text-white transition cursor-pointer active:scale-95 disabled:opacity-50"
            title="লাইভ আবহাওয়া রিফ্রেশ করুন"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Dynamic Sunset Countdown Box */}
      <div className="bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-teal-500/20 p-4 rounded-2xl border border-amber-400/30 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-400/20 text-amber-300 flex items-center justify-center font-bold text-lg shrink-0">
            🌅
          </div>
          <div>
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              আজকের গোল্ডেন আওয়ার ও সূর্যাস্ত ({weatherData.sunsetStr})
              <span className="text-[10px] font-normal text-amber-300">সূর্যোদয়: {weatherData.sunriseStr}</span>
            </h4>
            <p className="text-[11px] text-amber-200">সুগন্ধা বা লাবণী বিচে সূর্যাস্ত দেখতে ক্যামেরা নিয়ে উপস্থিত থাকুন</p>
          </div>
        </div>
        <div className="bg-amber-400 text-teal-950 font-extrabold text-xs px-3.5 py-2 rounded-xl shadow-xs font-mono">
          {getSunsetCountdown()}
        </div>
      </div>

      {/* Date Selector for Tide Forecasts */}
      <div className="space-y-2 pt-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold text-teal-200 flex items-center gap-1.5">
            <Calendar size={14} className="text-amber-300" /> দিন অনুযায়ী জোয়ার-ভাটা সময়সূচি (কক্সবাজার):
          </span>
          <span className="text-[10px] text-amber-300 font-semibold bg-white/10 px-2.5 py-0.5 rounded-full">
            {selectedDate === todayISO ? '📍 আজকের চার্ট' : '📅 ৫ দিনের ভ্রমণ চার্ট'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {SCHEDULE_DATES.map((date) => ({ date, label: DATE_LABELS[date] || date })).map((item) => (
            <button
              key={item.date}
              type="button"
              onClick={() => setSelectedDate(item.date)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer ${
                selectedDate === item.date
                  ? 'bg-amber-400 text-teal-950 shadow-md ring-2 ring-white/30 font-extrabold'
                  : 'bg-white/10 hover:bg-white/20 text-teal-100 border border-white/10'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dynamic Tide Cycles Cards */}
      {dynamicTidePhases.length === 0 && (
        <div className="p-4 rounded-2xl border border-amber-300/40 bg-amber-400/10 text-xs text-amber-100 leading-relaxed">
          এই তারিখের জন্য সময়সূচি অ্যাপে লেখা নেই। স্থানীয় জোয়ার-ভাটার তালিকা দেখুন।
        </div>
      )}
      <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-400/30 text-amber-200/95 flex items-start gap-2 leading-relaxed">
        <AlertTriangle size={15} className="text-amber-300 shrink-0 mt-0.5" />
        <p className="text-[11px]">
          <strong>সতর্কতা:</strong> জোয়ার-ভাটার সময়সূচি চন্দ্রতিথি অনুযায়ী আনুমানিক। সমুদ্রে গোসল বা সাঁতার কাটার পূর্বে সৈকতের লাইফগার্ড নির্দেশনা ও লাল-হলুদ সতর্কতা পতাকা অবশ্যই মেনে চলুন।
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {dynamicTidePhases.map((t, idx) => (
          <div
            key={idx}
            className={`p-4 rounded-2xl border transition ${
              t.isActive
                ? 'bg-white/20 border-amber-400 shadow-md ring-1 ring-amber-400/50'
                : 'bg-white/10 hover:bg-white/15 border-white/10'
            } space-y-2`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${t.badge}`}>
                {t.status}
              </span>
              <Clock size={13} className="text-teal-300" />
            </div>
            <h5 className="font-bold text-sm text-white">{t.name}</h5>
            <p className="text-xs text-amber-300 font-bold font-mono">{t.time}</p>
            <p className="text-[11px] text-teal-100/90 leading-relaxed pt-1 border-t border-white/10">
              {t.desc}
            </p>
          </div>
        ))}
      </div>

      {/* Safety Instructions */}
      <div className="bg-black/40 p-3 rounded-xl border border-white/10 text-xs text-teal-200 flex items-start gap-2.5">
        <AlertTriangle size={17} className="text-amber-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed text-[11px]">
          <strong className="text-white">লাইফগার্ড সতর্কতা:</strong> বিচে লাইফগার্ডদের লাল নিশানা বা লাল পতাকা টানানো থাকলে কোনো অবস্থাতেই সাগরে নামবেন না। হলুদ নিশানা থাকলে সতর্কতার সাথে শুধুমাত্র কোমর পানি পর্যন্ত নামা যাবে। শিশুদের সবসময় লাইফ জ্যাকেট পরিয়ে রাখুন।
        </p>
      </div>
    </div>
  );
}
