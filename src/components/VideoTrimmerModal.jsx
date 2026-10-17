import React, { useState, useRef, useEffect } from 'react';
import {
  Scissors,
  Play,
  Pause,
  RotateCcw,
  Check,
  X,
  Clock,
  Film,
  Camera,
  AlertCircle,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  MAX_REEL_DURATION,
  formatDuration,
  toBnNum,
  clampSegmentBounds,
  captureVideoFrame,
} from '../utils/videoHelper';

export default function VideoTrimmerModal({
  videoSource, // File, Blob, or URL string
  isOpen,
  onClose,
  onConfirm,
}) {
  const videoRef = useRef(null);
  const [totalDuration, setTotalDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [coverThumb, setCoverThumb] = useState(null);
  const [isCapturingThumb, setIsCapturingThumb] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [loadError, setLoadError] = useState('');
  const isConfirmedRef = useRef(false);

  // Setup video URL from File/Blob or string
  useEffect(() => {
    if (!videoSource) return;
    setLoadError('');
    isConfirmedRef.current = false;

    let url = '';
    if (typeof videoSource === 'string') {
      url = videoSource;
    } else if (videoSource instanceof Blob || videoSource instanceof File) {
      url = URL.createObjectURL(videoSource);
    }

    setVideoUrl(url);

    return () => {
      // Only revoke if user cancelled or closed without confirming
      if (!isConfirmedRef.current && typeof videoSource !== 'string' && url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [videoSource]);

  // Handle video loadedmetadata
  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    const dur = Number(videoRef.current.duration) || 0;
    setTotalDuration(dur);

    const initialEnd = Math.min(dur, MAX_REEL_DURATION);
    setStartTime(0);
    setEndTime(initialEnd);
    setCurrentTime(0);
    videoRef.current.currentTime = 0;

    // Capture initial thumbnail
    captureThumbAt(Math.min(0.5, dur));
  };

  // Keep playback within [startTime, endTime]
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;
    setCurrentTime(cur);

    if (cur >= endTime) {
      videoRef.current.currentTime = startTime;
      setCurrentTime(startTime);
    } else if (cur < startTime) {
      videoRef.current.currentTime = startTime;
      setCurrentTime(startTime);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      if (videoRef.current.currentTime < startTime || videoRef.current.currentTime >= endTime) {
        videoRef.current.currentTime = startTime;
      }
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleStartChange = (val) => {
    const s = Math.max(0, Math.min(Number(val), Math.max(0, totalDuration - 0.5)));
    let e = endTime;

    if (e - s > MAX_REEL_DURATION) {
      e = s + MAX_REEL_DURATION;
    } else if (e <= s) {
      e = Math.min(totalDuration, s + Math.min(MAX_REEL_DURATION, 10));
    }

    const clamped = clampSegmentBounds(s, e, totalDuration);
    setStartTime(clamped.startTime);
    setEndTime(clamped.endTime);

    if (videoRef.current) {
      videoRef.current.currentTime = clamped.startTime;
      setCurrentTime(clamped.startTime);
    }
  };

  const handleEndChange = (val) => {
    const e = Math.min(totalDuration, Math.max(Number(val), startTime + 0.5));
    let s = startTime;

    if (e - s > MAX_REEL_DURATION) {
      s = Math.max(0, e - MAX_REEL_DURATION);
    }

    const clamped = clampSegmentBounds(s, e, totalDuration);
    setStartTime(clamped.startTime);
    setEndTime(clamped.endTime);

    if (videoRef.current && videoRef.current.currentTime > clamped.endTime) {
      videoRef.current.currentTime = clamped.startTime;
      setCurrentTime(clamped.startTime);
    }
  };

  // Set start / end to current playback position
  const setStartToCurrent = () => {
    if (!videoRef.current) return;
    handleStartChange(videoRef.current.currentTime);
  };

  const setEndToCurrent = () => {
    if (!videoRef.current) return;
    handleEndChange(videoRef.current.currentTime);
  };

  // Capture frame as cover thumbnail
  const captureThumbAt = async (timeSec) => {
    if (!videoRef.current) return;
    setIsCapturingThumb(true);
    try {
      const thumb = await captureVideoFrame(videoSource, timeSec, {
        maxWidth: 640,
        maxHeight: 640,
        quality: 0.72,
      });
      setCoverThumb(thumb);
    } catch (e) {
      console.warn('Frame capture failed:', e);
    } finally {
      setIsCapturingThumb(false);
    }
  };

  const handleConfirm = () => {
    isConfirmedRef.current = true;
    const selectedDuration = Math.max(0, endTime - startTime);
    onConfirm?.({
      videoSource,
      videoUrl,
      startTime,
      endTime,
      duration: selectedDuration,
      totalDuration,
      thumb: coverThumb,
    });
    onClose?.();
  };

  if (!isOpen) return null;

  const selectedDuration = Math.max(0, endTime - startTime);
  const isCapped = selectedDuration >= MAX_REEL_DURATION;
  const isLongVideo = totalDuration > MAX_REEL_DURATION;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 text-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center">
              <Scissors size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">রিলস ক্লিপ ট্রিম ও এডিট</h3>
              <p className="text-[11px] text-slate-400">সর্বোচ্চ ৩ মিনিট (১৮০ সেকেন্ড) পর্যন্ত অংশ নির্বাচন করুন</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Video Preview Box */}
        <div className="relative bg-black flex items-center justify-center aspect-[9/12] max-h-[46vh] sm:max-h-[50vh] overflow-hidden select-none">
          {videoUrl ? (
            <video
              ref={videoRef}
              src={videoUrl}
              playsInline
              muted={isMuted}
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onError={() => setLoadError('ভিডিও লোড হতে সমস্যা হয়েছে।')}
              className="w-full h-full object-contain cursor-pointer"
              onClick={togglePlay}
            />
          ) : (
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <Film size={20} /> ভিডিও লোড হচ্ছে...
            </div>
          )}

          {loadError && (
            <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-4 text-center">
              <AlertCircle size={32} className="text-rose-500 mb-2" />
              <p className="text-sm font-semibold text-rose-300">{loadError}</p>
            </div>
          )}

          {/* Central Play/Pause Watermark */}
          {!isPlaying && !loadError && (
            <button
              onClick={togglePlay}
              className="absolute w-14 h-14 rounded-full bg-pink-600/80 hover:bg-pink-500 text-white flex items-center justify-center shadow-2xl backdrop-blur-xs transition transform hover:scale-110 active:scale-95 cursor-pointer"
            >
              <Play size={26} className="ml-1" />
            </button>
          )}

          {/* Top Video Overlays */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-xs font-mono pointer-events-none">
            <span className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-pink-300 border border-white/10">
              ⏱️ {formatDuration(currentTime, { bengali: true })} / {formatDuration(totalDuration, { bengali: true })}
            </span>
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="pointer-events-auto p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition"
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
          </div>
        </div>

        {/* Trimmer Controls & Scrubber */}
        <div className="p-4 space-y-4 overflow-y-auto bg-slate-900 flex-1">
          {/* Duration Summary Pill */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-xs">
            <div className="flex items-center gap-1.5">
              <Clock size={15} className="text-pink-400" />
              <span className="text-slate-300">নির্বাচিত ক্লিপ:</span>
              <span className="font-bold text-pink-400 font-mono text-sm">
                {formatDuration(selectedDuration, { bengali: true })}
              </span>
              <span className="text-[10px] text-slate-400">
                ({formatDuration(startTime, { bengali: true })} ➔ {formatDuration(endTime, { bengali: true })})
              </span>
            </div>

            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isCapped ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}`}>
              সর্বোচ্চ ৩ মিনিট (১৮০ সে)
            </span>
          </div>

          {/* Long video tip */}
          {isLongVideo && (
            <div className="text-[11px] bg-sky-950/60 border border-sky-800/80 text-sky-200 p-2.5 rounded-xl flex items-start gap-2">
              <AlertCircle size={15} className="text-sky-400 shrink-0 mt-0.5" />
              <span>
                ভিডিওর মোট দৈর্ঘ্য <strong>{formatDuration(totalDuration, { bengali: true })}</strong>।
                নিচের স্লাইডার দিয়ে পছন্দের যেকোনো ৩ মিনিটের অংশ কেটে নিন।
              </span>
            </div>
          )}

          {/* Scrubbers / Sliders */}
          <div className="space-y-3 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
            {/* Start time scrubber */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">শুরুর পয়েন্ট:</span>
                <span className="font-mono font-bold text-pink-300">{formatDuration(startTime, { bengali: true })}</span>
              </div>
              <input
                type="range"
                min="0"
                max={Math.max(0, totalDuration - 0.5)}
                step="0.5"
                value={startTime}
                onChange={(e) => handleStartChange(e.target.value)}
                className="w-full accent-pink-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* End time scrubber */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">শেষের পয়েন্ট:</span>
                <span className="font-mono font-bold text-pink-300">{formatDuration(endTime, { bengali: true })}</span>
              </div>
              <input
                type="range"
                min={startTime + 0.5}
                max={Math.min(totalDuration, startTime + MAX_REEL_DURATION)}
                step="0.5"
                value={endTime}
                onChange={(e) => handleEndChange(e.target.value)}
                className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Quick Set Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
              <button
                type="button"
                onClick={setStartToCurrent}
                className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl flex items-center justify-center gap-1 transition cursor-pointer"
              >
                📌 বর্তমান ফ্রেমে শুরু
              </button>
              <button
                type="button"
                onClick={setEndToCurrent}
                className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl flex items-center justify-center gap-1 transition cursor-pointer"
              >
                📌 বর্তমান ফ্রেমে শেষ
              </button>
            </div>
          </div>

          {/* Cover Thumbnail Selection */}
          <div className="flex items-center justify-between gap-3 p-3 bg-slate-800/60 rounded-2xl border border-slate-700/60">
            <div className="flex items-center gap-2.5">
              <div className="w-12 h-16 bg-black rounded-lg overflow-hidden border border-slate-600 shrink-0 flex items-center justify-center">
                {coverThumb ? (
                  <img src={coverThumb} alt="Cover" className="w-full h-full object-cover" />
                ) : (
                  <Camera size={18} className="text-slate-500" />
                )}
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-200 block">কভার ছবি (Thumbnail)</span>
                <span className="text-[10px] text-slate-400 block">রিলস ফিডে এই ছবিটি প্রথমে দেখা যাবে</span>
              </div>
            </div>

            <button
              type="button"
              disabled={isCapturingThumb}
              onClick={() => captureThumbAt(currentTime)}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-pink-300 rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
            >
              <Camera size={14} />
              {isCapturingThumb ? 'ক্যাপচার হচ্ছে...' : 'এই ফ্রেমটি নিন'}
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 sm:p-4 border-t border-slate-800 bg-slate-900 flex items-center justify-end gap-2.5 sticky bottom-0 z-10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-semibold rounded-2xl transition cursor-pointer"
          >
            বাতিল
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            className="px-5 py-2.5 bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-xs sm:text-sm font-bold rounded-2xl flex items-center gap-1.5 shadow-lg shadow-pink-600/30 transition transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Check size={16} /> ক্লিপ কনফার্ম করুন
          </button>
        </div>
      </div>
    </div>
  );
}
