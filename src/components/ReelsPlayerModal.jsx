import React, { useState, useRef, useEffect } from 'react';
import {
  Heart,
  MessageCircle,
  Share2,
  Download,
  X,
  Volume2,
  VolumeX,
  Play,
  Pause,
  ChevronUp,
  ChevronDown,
  MapPin,
  Send,
  Sparkles,
  Music,
  Eye,
} from 'lucide-react';
import { formatDuration, toBnNum } from '../utils/videoHelper';
import { getLocalVideoUrl } from '../utils/localVideoCache';

const COMMENT_REACTIONS = ['❤️', '👍', '😂', '🔥', '👏'];

export default function ReelsPlayerModal({
  reels = [],
  initialIndex = 0,
  isOpen,
  currentUser,
  currentProfile,
  onClose,
  onLikePost,
  onAddComment,
  onViewPost,
  onCommentReaction,
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isCaptionExpanded, setIsCaptionExpanded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoLoadError, setVideoLoadError] = useState(false);
  const [localVideoUrl, setLocalVideoUrl] = useState(null);

  const videoRef = useRef(null);
  const touchStartY = useRef(null);
  const lastTapRef = useRef(0);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, isOpen]);

  const currentReel = reels[currentIndex] || null;

  // Resolve local IndexedDB video if available on this device
  useEffect(() => {
    let active = true;
    let objectUrl = null;

    if (currentReel?.id) {
      getLocalVideoUrl(currentReel.id).then((url) => {
        if (!active) {
          if (url) URL.revokeObjectURL(url);
          return;
        }
        if (url) {
          objectUrl = url;
          setLocalVideoUrl(url);
        } else {
          setLocalVideoUrl(null);
        }
      });
    } else {
      setLocalVideoUrl(null);
    }

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [currentReel?.id]);

  // Video source resolution: prioritize local device cache, then server/cloud URL
  const rawVideoSource = currentReel?.videoUrl || currentReel?.video || currentReel?.driveViewUrl || null;
  const videoSource = localVideoUrl || rawVideoSource;
  const isGoogleDriveEmbed = videoSource && videoSource.includes('drive.google.com/file/d/') && !videoSource.includes('preview');
  const embedUrl = isGoogleDriveEmbed
    ? videoSource.replace('/view', '/preview')
    : (currentReel?.driveFileId ? `https://drive.google.com/file/d/${currentReel.driveFileId}/preview` : null);

  const startTime = Number(currentReel?.startTime) || 0;
  const endTime = Number(currentReel?.endTime) || (Number(currentReel?.duration) || 0);
  const segmentDuration = Math.max(0.1, endTime > startTime ? endTime - startTime : (Number(currentReel?.duration) || 1));

  // Trigger view count increment when reel is opened/viewed
  useEffect(() => {
    if (isOpen && currentReel?.id) {
      onViewPost?.(currentReel.id);
    }
  }, [isOpen, currentReel?.id, onViewPost]);

  // Initialize playback at startTime whenever reel changes
  useEffect(() => {
    if (!isOpen || !videoRef.current) return;
    setVideoLoadError(false);
    setProgress(0);
    setIsCaptionExpanded(false);

    const vid = videoRef.current;
    vid.currentTime = startTime;
    vid.muted = isMuted;

    const playPromise = vid.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => setIsPlaying(true))
        .catch(() => {
          // Autoplay policy might require mute
          vid.muted = true;
          setIsMuted(true);
          vid.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
        });
    }
  }, [currentIndex, isOpen, startTime]);

  // Keep playback looped within [startTime, endTime]
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;

    if (endTime > startTime) {
      if (cur >= endTime || cur < startTime) {
        videoRef.current.currentTime = startTime;
      }
      const played = Math.max(0, cur - startTime);
      setProgress(Math.min(100, (played / segmentDuration) * 100));
    } else {
      if (videoRef.current.duration) {
        setProgress((cur / videoRef.current.duration) * 100);
      }
    }
  };

  // Keyboard navigation (ArrowUp, ArrowDown, Space, Escape)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showComments) setShowComments(false);
        else onClose?.();
      } else if (e.key === 'ArrowDown') {
        handleNext();
      } else if (e.key === 'ArrowUp') {
        handlePrev();
      } else if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, reels.length, showComments]);

  const handleNext = () => {
    if (currentIndex < reels.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Loop back to first reel
      setCurrentIndex(0);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    } else {
      setCurrentIndex(reels.length - 1);
    }
  };

  // Touch Swipe for mobile gestures
  const handleTouchStart = (e) => {
    if (!e.touches?.[0]) return;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (touchStartY.current === null || !e.changedTouches?.[0]) return;
    const diff = touchStartY.current - e.changedTouches[0].clientY;
    touchStartY.current = null;

    if (diff > 50) {
      // Swiped UP -> Next reel
      handleNext();
    } else if (diff < -50) {
      // Swiped DOWN -> Prev reel
      handlePrev();
    }
  };

  // Tap video to play/pause or double-tap to like
  const handleVideoTap = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double tap!
      handleLike();
      setShowHeartAnim(true);
      setTimeout(() => setShowHeartAnim(false), 900);
    } else {
      togglePlay();
    }
    lastTapRef.current = now;
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const next = !isMuted;
    videoRef.current.muted = next;
    setIsMuted(next);
  };

  const handleLike = () => {
    if (!currentReel) return;
    const authorName = currentProfile?.displayName || currentUser?.displayName || 'পরিবারের সদস্য';
    onLikePost?.(currentReel.id, authorName);
  };

  const handleSendComment = (e) => {
    e?.preventDefault();
    if (!commentText.trim() || !currentReel) return;

    const authorName = currentProfile?.displayName || currentUser?.displayName || 'পরিবারের সদস্য';
    onAddComment?.(currentReel.id, {
      id: Date.now(),
      user: authorName,
      text: commentText.trim(),
      time: 'এইমাত্র',
    });

    setCommentText('');
  };

  const handleShare = async () => {
    if (!currentReel) return;
    const shareData = {
      title: 'কক্সবাজার ফ্যামিলি ট্যুর ২০২৬ - রিলস',
      text: `${currentReel.author || 'সদস্য'} এর রিলস: "${currentReel.caption || 'আনন্দঘন মুহূর্ত'}" 🏖️`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
        alert('রিলস লিংক ক্লিপবোর্ডে কপি হয়েছে! 📋');
      } catch {}
    }
  };

  if (!isOpen || !currentReel) return null;

  const myName = (currentProfile?.displayName || currentUser?.displayName || '').trim();
  const isLiked = (currentReel.likes || []).includes(myName);
  const likesCount = (currentReel.likes || []).length;
  const commentsList = currentReel.comments || [];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-lg flex items-center justify-center select-none sm:gap-4 p-0 sm:p-4"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Container: 9:16 vertical Reels player */}
      <div className="relative w-full h-full max-w-md max-h-[100dvh] sm:max-h-[92vh] sm:rounded-3xl overflow-hidden bg-black flex flex-col justify-between shadow-2xl border border-white/10 shrink-0">
        
        {/* Top Header Bar */}
        <div className="absolute top-0 inset-x-0 z-30 p-4 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-auto">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-black/50 text-white/90 hover:text-white hover:bg-black/80 backdrop-blur-md transition cursor-pointer"
            >
              <X size={20} />
            </button>
            <span className="text-xs font-bold text-white/90 tracking-wide bg-black/40 px-2.5 py-1 rounded-full border border-white/10">
              🎬 রিলস {toBnNum(currentIndex + 1)} / {toBnNum(reels.length)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="p-2 rounded-full bg-black/50 text-white/90 hover:text-white hover:bg-black/80 backdrop-blur-md transition cursor-pointer"
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
          </div>
        </div>

        {/* Video Surface Area */}
        <div
          className="relative w-full h-full flex items-center justify-center bg-black cursor-pointer overflow-hidden"
          onClick={handleVideoTap}
        >
          {(videoSource && !videoLoadError) ? (
            <video
              ref={videoRef}
              src={videoSource}
              poster={currentReel.thumb || undefined}
              playsInline
              loop={endTime <= startTime}
              onTimeUpdate={handleTimeUpdate}
              onError={() => {
                setVideoLoadError(true);
              }}
              className="w-full h-full object-cover sm:object-contain"
            />
          ) : (
            <div className="text-center p-6 text-white/80 max-w-sm flex flex-col items-center select-none">
              {currentReel.thumb ? (
                <img
                  src={currentReel.thumb}
                  alt="Reel preview"
                  className="w-full max-h-72 object-cover rounded-2xl mb-4 opacity-75 shadow-lg"
                />
              ) : null}
              <p className="text-sm font-medium text-amber-300 mb-1">ভিডিওটি প্রস্তুত হচ্ছে</p>
              <p className="text-xs text-white/60">ক্লিপটি ডিভাইসে সংরক্ষিত থাকলে স্বয়ংক্রিয়ভাবে প্লে হবে</p>
            </div>
          )}

          {/* Animated Heart pop on double tap */}
          {showHeartAnim && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 animate-ping">
              <Heart size={100} className="fill-rose-500 text-rose-500 drop-shadow-2xl" />
            </div>
          )}

          {/* Play / Pause toggle overlay badge */}
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
              <div className="w-16 h-16 rounded-full bg-black/60 text-white flex items-center justify-center backdrop-blur-md shadow-2xl">
                <Play size={32} className="ml-1" />
              </div>
            </div>
          )}
        </div>

        {/* Right Floating Actions (Instagram Style) */}
        <div className="absolute right-3 bottom-20 z-20 flex flex-col items-center gap-4 text-white pointer-events-auto">
          {/* Like Button */}
          <button
            onClick={handleLike}
            className="flex flex-col items-center gap-1 group cursor-pointer"
          >
            <div className={`p-3 rounded-full backdrop-blur-md transition transform active:scale-75 ${
              isLiked ? 'bg-rose-500/30 text-rose-500' : 'bg-black/50 text-white hover:bg-black/70'
            }`}>
              <Heart size={26} className={isLiked ? 'fill-rose-500' : ''} />
            </div>
            <span className="text-[11px] font-bold font-mono drop-shadow">
              {toBnNum(likesCount)}
            </span>
          </button>

          {/* Comment Button */}
          <button
            onClick={() => setShowComments(true)}
            className="flex flex-col items-center gap-1 cursor-pointer"
          >
            <div className="p-3 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-md transition transform active:scale-75">
              <MessageCircle size={26} />
            </div>
            <span className="text-[11px] font-bold font-mono drop-shadow">
              {toBnNum(commentsList.length)}
            </span>
          </button>

          {/* Share Button */}
          <button
            onClick={handleShare}
            className="flex flex-col items-center gap-1 cursor-pointer"
          >
            <div className="p-3 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-md transition transform active:scale-75">
              <Share2 size={24} />
            </div>
            <span className="text-[10px] font-semibold drop-shadow">শেয়ার</span>
          </button>

          {/* Views Indicator */}
          <div
            className="flex flex-col items-center gap-1 cursor-default select-none"
            title="মোট ভিউ সংখ্যা"
          >
            <div className="p-2.5 rounded-full bg-black/50 text-teal-300 backdrop-blur-md">
              <Eye size={22} />
            </div>
            <span className="text-[11px] font-bold font-mono drop-shadow text-white/95">
              {toBnNum(currentReel.views || 0)}
            </span>
          </div>

          {/* Download / Direct Link */}
          {videoSource && (
            <a
              href={videoSource}
              download={`Tour2026_Reel_${currentReel.id}.mp4`}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col items-center gap-1 cursor-pointer"
            >
              <div className="p-3 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-md transition transform active:scale-75">
                <Download size={22} />
              </div>
              <span className="text-[10px] font-semibold drop-shadow">সেভ</span>
            </a>
          )}
        </div>

        {/* Bottom Details Overlay (Left side) */}
        <div className="absolute bottom-3 inset-x-0 z-20 p-4 pr-16 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-auto">
          {/* Author Badge */}
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-pink-500 to-amber-500 p-0.5 shrink-0 shadow-md">
              {currentReel.authorPhoto ? (
                <img
                  src={currentReel.authorPhoto}
                  alt={currentReel.author}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-teal-800 text-amber-300 font-bold text-xs flex items-center justify-center">
                  {(currentReel.author || 'মে')[0]}
                </div>
              )}
            </div>

            <div className="min-w-0">
              <h4 className="text-sm font-bold text-white drop-shadow truncate">
                {currentReel.author || 'পরিবারের সদস্য'}
              </h4>
              {currentReel.location && (
                <div className="flex items-center gap-1 text-[11px] text-pink-300 drop-shadow">
                  <MapPin size={11} className="shrink-0" />
                  <span className="truncate">{currentReel.location}</span>
                </div>
              )}
            </div>
          </div>

          {/* Caption */}
          {currentReel.caption && (
            <div className="text-xs text-white/95 leading-relaxed drop-shadow mb-2.5">
              <p className={isCaptionExpanded ? '' : 'line-clamp-2'}>
                {currentReel.caption}
              </p>
              {currentReel.caption.length > 70 && (
                <button
                  onClick={() => setIsCaptionExpanded(!isCaptionExpanded)}
                  className="text-[11px] text-pink-300 font-bold ml-1 hover:underline cursor-pointer"
                >
                  {isCaptionExpanded ? 'কম দেখুন' : '...আরো দেখুন'}
                </button>
              )}
            </div>
          )}

          {/* Reel Music / Tour Tag Pill */}
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[10px] text-white/90">
              <Music size={11} className="text-pink-400 animate-spin" />
              <span>রংপুর ➔ কক্সবাজার ট্যুর ২০২৬</span>
            </div>

            <span className="text-[10px] text-white/70 font-mono">
              ⏱️ {formatDuration(segmentDuration, { bengali: true })}
            </span>
          </div>
        </div>

        {/* Bottom Progress Scrubber */}
        <div className="absolute bottom-0 inset-x-0 z-30 h-1 bg-white/20">
          <div
            className="h-full bg-gradient-to-r from-pink-500 via-rose-500 to-purple-500 transition-all duration-150"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Slide-up Comments Drawer */}
        {showComments && (
          <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-xs flex flex-col justify-end">
            <div className="bg-slate-900 border-t border-slate-700 rounded-t-3xl p-4 max-h-[65%] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <MessageCircle size={16} className="text-pink-400" />
                  মন্তব্য ({toBnNum(commentsList.length)})
                </h4>
                <button
                  onClick={() => setShowComments(false)}
                  className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Comment list */}
              <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
                {commentsList.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">
                    এখনও কোনো মন্তব্য নেই। প্রথম মন্তব্যটি করুন! ✨
                  </p>
                ) : (
                  commentsList.map((c, idx) => {
                    const commentId = c.id !== undefined && c.id !== null ? c.id : idx;
                    const myIdentifier = (currentUser?.email || currentProfile?.displayName || currentUser?.displayName || 'user').toLowerCase();
                    return (
                      <div key={c.id || idx} className="text-xs bg-slate-800/60 p-2.5 rounded-xl border border-slate-750 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-pink-300">{c.user || 'পরিবারের সদস্য'}</span>
                          <span className="text-[10px] text-slate-500">{c.time || 'এইমাত্র'}</span>
                        </div>
                        <p className="text-slate-200 leading-relaxed">{c.text}</p>

                        {/* Comment Reactions */}
                        <div className="flex items-center flex-wrap gap-1 pt-1 border-t border-slate-700/40">
                          {COMMENT_REACTIONS.map((emoji) => {
                            const voters = Array.isArray(c.reactions?.[emoji]) ? c.reactions[emoji] : [];
                            const count = voters.length;
                            const hasVoted = voters.some((v) => String(v).toLowerCase() === myIdentifier);
                            return (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => onCommentReaction?.(currentReel.id, commentId, emoji)}
                                className={`px-2 py-0.5 rounded-full text-[11px] flex items-center gap-1 transition cursor-pointer select-none ${
                                  hasVoted
                                    ? 'bg-pink-900/60 text-pink-200 border border-pink-500/50 font-bold scale-105'
                                    : count > 0
                                    ? 'bg-slate-700/60 text-slate-200 border border-slate-600/50'
                                    : 'bg-slate-800/40 hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 opacity-60 hover:opacity-100'
                                }`}
                                title={`${emoji} রিঅ্যাক্ট করুন`}
                              >
                                <span>{emoji}</span>
                                {count > 0 && <span className="text-[10px] font-mono">{toBnNum(count)}</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add Comment Input */}
              <form onSubmit={handleSendComment} className="pt-2 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="একটি সুন্দর মন্তব্য লিখুন..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="flex-1 bg-slate-800 border border-slate-700 text-white placeholder-slate-400 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-pink-500"
                />
                <button
                  type="submit"
                  disabled={!commentText.trim()}
                  className="p-2.5 bg-pink-600 hover:bg-pink-500 text-white rounded-xl disabled:opacity-40 transition cursor-pointer"
                >
                  <Send size={16} />
                </button>
              </form>
            </div>
          </div>
        )}

      </div>

      {/* Desktop External Next/Prev Navigation Buttons (Floating outside player on PC - Zero overlap!) */}
      <div className="hidden sm:flex flex-col gap-3 shrink-0 z-50">
        <button
          onClick={handlePrev}
          className="w-12 h-12 rounded-full bg-slate-900/90 hover:bg-slate-800 active:scale-90 text-white backdrop-blur-md flex items-center justify-center transition cursor-pointer border border-white/20 shadow-2xl group hover:border-pink-500/50"
          title="পূর্ববর্তী রিলস (Up Arrow)"
        >
          <ChevronUp size={24} className="group-hover:-translate-y-0.5 transition-transform text-slate-200 group-hover:text-white" />
        </button>
        <button
          onClick={handleNext}
          className="w-12 h-12 rounded-full bg-slate-900/90 hover:bg-slate-800 active:scale-90 text-white backdrop-blur-md flex items-center justify-center transition cursor-pointer border border-white/20 shadow-2xl group hover:border-pink-500/50"
          title="পরবর্তী রিলস (Down Arrow)"
        >
          <ChevronDown size={24} className="group-hover:translate-y-0.5 transition-transform text-slate-200 group-hover:text-white" />
        </button>
      </div>
    </div>
  );
}
