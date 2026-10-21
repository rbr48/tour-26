import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Heart, Send, MapPin, ChevronLeft, ChevronRight, Play, Pause, Volume2, VolumeX, Eye } from 'lucide-react';
import { useBackHandler } from '../utils/backNavigation';
import { triggerHaptic } from '../utils/haptics';
import { getTourDayById, getPostTourDay } from '../utils/tourSchedule';
import UserAvatar from './UserAvatar';
import { photoSource, toBnNum, getFilterCss } from './InstagramFeed';

const STORY_DURATION = 5000; // 5 seconds per story slide
const QUICK_EMOJI_REACTIONS = ['❤️', '🔥', '😂', '😍', '👏', '🏖️'];

export default function StoryViewerModal({
  isOpen,
  membersWithStories = [],
  initialMemberIndex = 0,
  onClose,
  onLikePost,
  onAddComment,
  onViewPost,
  currentUser,
  currentProfile,
  members = [],
  userProfiles = {},
}) {
  const [memberIndex, setMemberIndex] = useState(initialMemberIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [replyText, setReplyText] = useState('');
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [floatingParticles, setFloatingParticles] = useState([]);

  // Hardware back button support on Android
  useBackHandler(isOpen, onClose, 30);

  useEffect(() => {
    setMemberIndex(Math.min(initialMemberIndex, Math.max(0, membersWithStories.length - 1)));
    setStoryIndex(0);
    setProgress(0);
  }, [initialMemberIndex, isOpen, membersWithStories.length]);

  const currentMember = membersWithStories[memberIndex] || null;
  const currentStories = currentMember?.posts || [];
  const currentStory = currentStories[storyIndex] || null;

  // Auto-record story view
  useEffect(() => {
    if (isOpen && currentStory?.id && onViewPost) {
      onViewPost(currentStory.id);
    }
  }, [isOpen, currentStory?.id, onViewPost]);

  const handleNextStory = useCallback(() => {
    triggerHaptic('light');
    setProgress(0);
    if (storyIndex < currentStories.length - 1) {
      setStoryIndex((prev) => prev + 1);
    } else if (memberIndex < membersWithStories.length - 1) {
      setMemberIndex((prev) => prev + 1);
      setStoryIndex(0);
    } else {
      onClose();
    }
  }, [storyIndex, currentStories.length, memberIndex, membersWithStories.length, onClose]);

  const handlePrevStory = useCallback(() => {
    triggerHaptic('light');
    setProgress(0);
    if (storyIndex > 0) {
      setStoryIndex((prev) => prev - 1);
    } else if (memberIndex > 0) {
      const prevMember = membersWithStories[memberIndex - 1];
      setMemberIndex((prev) => prev - 1);
      setStoryIndex(Math.max(0, (prevMember?.posts?.length || 1) - 1));
    }
  }, [storyIndex, memberIndex, membersWithStories]);

  // Story Progress Timer Loop
  useEffect(() => {
    if (!isOpen || !currentStory || isPaused) return;

    const intervalTime = 50;
    const increment = (intervalTime / STORY_DURATION) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNextStory();
          return 0;
        }
        return prev + increment;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isOpen, currentStory, isPaused, handleNextStory]);

  if (!isOpen || !currentStory) return null;

  const storyLoc = String(currentStory.location || '').toLowerCase();
  const isOffTour = currentStory.tourDay === 'off_tour' || currentStory.tourDay === 'none' || storyLoc.includes('বান্দরবান') || storyLoc.includes('সাজেক') || storyLoc.includes('সিলেট');
  const tourDayId = isOffTour ? null : ((typeof currentStory.tourDay === 'object' ? currentStory.tourDay?.id : currentStory.tourDay) || getPostTourDay(currentStory));
  const tourDayInfo = tourDayId ? getTourDayById(tourDayId) : null;

  const mediaUrl = photoSource(currentStory);
  const isLiked =
    currentStory.likes?.includes(currentUser?.displayName || 'user') ||
    currentStory.likes?.includes(currentProfile?.displayName || '');

  const handleLike = (e) => {
    e?.stopPropagation();
    triggerHaptic('medium');
    setShowHeartAnim(true);
    setTimeout(() => setShowHeartAnim(false), 850);
    if (onLikePost) {
      onLikePost(currentStory.id, currentUser?.displayName || currentProfile?.displayName || 'User');
    }
  };

  const handleQuickEmojiReaction = (emoji) => {
    triggerHaptic('medium');
    const newId = `${Date.now()}_${Math.random()}`;
    const xPos = Math.floor(Math.random() * 60 + 20); // 20% to 80%
    setFloatingParticles((prev) => [...prev, { id: newId, emoji, x: xPos }]);
    setTimeout(() => {
      setFloatingParticles((prev) => prev.filter((p) => p.id !== newId));
    }, 1100);

    if (onAddComment && currentStory?.id) {
      const authorName = currentProfile?.displayName || currentUser?.displayName || 'পরিবারের সদস্য';
      const profilePhoto = currentProfile?.customPhotoURL || currentProfile?.photoURL || currentUser?.photoURL;
      const commentObj = {
        id: Date.now(),
        user: authorName,
        authorEmail: (currentUser?.email || '').toLowerCase() || 'member@tour.family',
        userPhoto: typeof profilePhoto === 'string' && !profilePhoto.startsWith('data:') ? profilePhoto : (currentUser?.photoURL || null),
        text: emoji,
        time: 'এইমাত্র',
        isReaction: true,
        createdAt: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
      };
      onAddComment(currentStory.id, commentObj);
    }
  };

  const handleSendReply = (e) => {
    e.preventDefault();
    const trimmed = replyText.trim();
    if (!trimmed || !onAddComment) return;
    triggerHaptic('success');
    const authorName = currentProfile?.displayName || currentUser?.displayName || 'পরিবারের সদস্য';
    const profilePhoto = currentProfile?.customPhotoURL || currentProfile?.photoURL || currentUser?.photoURL;
    const commentObj = {
      id: Date.now(),
      user: authorName,
      authorEmail: (currentUser?.email || '').toLowerCase() || 'member@tour.family',
      userPhoto: typeof profilePhoto === 'string' && !profilePhoto.startsWith('data:') ? profilePhoto : (currentUser?.photoURL || null),
      text: trimmed,
      time: 'এইমাত্র',
      createdAt: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
    };
    onAddComment(currentStory.id, commentObj);
    setReplyText('');
    setIsSent(true);
    setTimeout(() => setIsSent(false), 2000);
  };

  const handleTapScreen = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;

    if (clickX < width * 0.3) {
      handlePrevStory();
    } else {
      handleNextStory();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center select-none overflow-hidden animate-in fade-in duration-200">
      {/* Main Story Container (Authentic 9:16 mobile canvas) */}
      <div className="relative w-full h-full max-w-[430px] max-h-[92vh] sm:rounded-3xl bg-neutral-950 flex flex-col justify-between overflow-hidden shadow-2xl border border-white/10">
        
        {/* Top Segmented Progress Bars */}
        <div className="absolute top-0 inset-x-0 z-30 p-3 pt-3.5 space-y-2.5 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
          <div className="flex items-center gap-1.5 w-full">
            {currentStories.map((s, idx) => {
              let fillPercent = 0;
              if (idx < storyIndex) fillPercent = 100;
              else if (idx === storyIndex) fillPercent = progress;

              return (
                <div key={s.id || idx} className="h-1 flex-1 bg-white/25 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white transition-all duration-75 rounded-full"
                    style={{ width: `${fillPercent}%` }}
                  />
                </div>
              );
            })}
          </div>

          {/* Story Author & Meta Header */}
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-2.5">
              <div className="p-0.5 rounded-full bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888]">
                <div className="p-0.5 bg-black rounded-full">
                  <UserAvatar
                    photoUrl={currentStory.authorPhoto}
                    name={currentStory.author}
                    size="w-8 h-8"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-xs text-white drop-shadow-md">
                    {currentStory.author}
                  </h4>
                  <span className="text-[10px] text-white/70">
                    • {currentStory.createdAt || 'এইমাত্র'}
                  </span>
                </div>
                {currentStory.location && (
                  <p className="text-[10px] text-white/80 flex items-center gap-0.5 font-medium drop-shadow-xs">
                    <MapPin size={9} className="text-pink-400" />
                    <span>{currentStory.location}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div
                className="flex items-center gap-1 text-[11px] font-mono text-white/95 bg-black/45 px-2.5 py-1 rounded-full backdrop-blur-xs border border-white/15 shadow-xs"
                title="মোট ভিউ"
              >
                <Eye size={12} className="text-teal-300" />
                <span>{toBnNum(currentStory.views || 0)}</span>
              </div>

              <button
                type="button"
                onClick={() => setIsPaused(!isPaused)}
                className="p-1.5 rounded-full bg-black/40 hover:bg-black/70 text-white/90 transition cursor-pointer"
                title={isPaused ? 'চালিয়ে যান' : 'থামুন'}
              >
                {isPaused ? <Play size={16} /> : <Pause size={16} />}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full bg-black/40 hover:bg-black/70 text-white transition cursor-pointer"
                title="বন্ধ করুন"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Media Canvas with Tap & Hold to Pause Gestures */}
        <div
          className="relative flex-1 w-full flex items-center justify-center bg-black cursor-pointer overflow-hidden"
          onClick={handleTapScreen}
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          {mediaUrl ? (
            <img
              src={mediaUrl}
              alt={currentStory.caption || 'Story'}
              className="w-full h-full object-cover select-none pointer-events-none"
              style={{ filter: getFilterCss(currentStory.filter) }}
              loading="eager"
              onError={(e) => {
                if (currentStory?.thumb && e.currentTarget.src !== currentStory.thumb) {
                  e.currentTarget.src = currentStory.thumb;
                } else if (currentStory?.driveFileId) {
                  e.currentTarget.src = `https://drive.google.com/thumbnail?id=${currentStory.driveFileId}&sz=w1600`;
                } else {
                  e.currentTarget.onerror = null;
                }
              }}
            />
          ) : (
            <div className="p-6 text-center text-white/60 text-xs">ছবি লোড হতে পারেনি</div>
          )}

          {/* Location Sticker on Story Canvas */}
          {currentStory.location && (
            <div className="absolute top-20 left-3.5 z-20 pointer-events-none animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="bg-white/90 backdrop-blur-md text-slate-900 text-[11px] font-extrabold px-3 py-1.5 rounded-xl shadow-2xl border border-white/60 flex items-center gap-1.5 -rotate-2">
                <MapPin size={12} className="text-pink-600 shrink-0" />
                <span className="truncate max-w-[190px]">{currentStory.location}</span>
              </div>
            </div>
          )}

          {/* Tour Day Sticker on Story Canvas */}
          {tourDayInfo && (
            <div className="absolute top-20 right-3.5 z-20 pointer-events-none animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="bg-gradient-to-r from-pink-500/95 to-purple-600/95 backdrop-blur-md text-white text-[11px] font-black px-3 py-1.5 rounded-xl shadow-2xl border border-white/40 flex items-center gap-1.5 rotate-3">
                <span>{tourDayInfo.emoji}</span>
                <span>{tourDayInfo.shortLabel || tourDayInfo.name}</span>
              </div>
            </div>
          )}

          {/* Double-Tap Heart Popup Animation */}
          {showHeartAnim && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
              <Heart className="w-24 h-24 fill-white text-white drop-shadow-2xl animate-ig-heart" />
            </div>
          )}

          {/* Floating Flying Emoji Particles */}
          {floatingParticles.map((particle) => (
            <div
              key={particle.id}
              className="absolute bottom-28 pointer-events-none z-40 text-3xl animate-ig-float"
              style={{ left: `${particle.x}%` }}
            >
              {particle.emoji}
            </div>
          ))}

          {/* Bottom Caption Overlay (if caption present) */}
          {currentStory.caption && (
            <div className="absolute bottom-20 inset-x-0 p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-20 pointer-events-none">
              <p className="text-xs text-white font-medium leading-relaxed drop-shadow-md line-clamp-3">
                {currentStory.caption}
              </p>
            </div>
          )}
        </div>

        {/* Story Bottom Reply & Reaction Bar */}
        <div className="relative z-30 p-3 pt-2 bg-gradient-to-t from-black via-black/85 to-transparent space-y-2">
          {/* Quick Story Emoji Reaction Tray */}
          <div className="flex items-center justify-between px-1">
            {QUICK_EMOJI_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleQuickEmojiReaction(emoji)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/25 active:scale-125 transition flex items-center justify-center text-lg cursor-pointer backdrop-blur-xs shadow-xs"
                title={`${emoji} রিঅ্যাক্ট করুন`}
              >
                {emoji}
              </button>
            ))}
          </div>

          <form onSubmit={handleSendReply} className="flex items-center gap-2">
            <input
              type="text"
              placeholder={`${currentStory.author}-কে মেসেজ পাঠান...`}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onFocus={() => setIsPaused(true)}
              onBlur={() => setIsPaused(false)}
              className="flex-1 px-4 py-2 text-xs bg-white/15 hover:bg-white/20 focus:bg-white/25 text-white placeholder-white/60 border border-white/25 rounded-full focus:outline-none focus:border-white transition backdrop-blur-md"
            />

            {replyText.trim() ? (
              <button
                type="submit"
                className="p-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-full hover:scale-105 active:scale-95 transition cursor-pointer shadow-md"
                title="মেসেজ পাঠান"
              >
                <Send size={15} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleLike}
                className={`p-2 rounded-full transition cursor-pointer active:scale-75 ${
                  isLiked ? 'text-[#ff3040] scale-110' : 'text-white/80 hover:text-white'
                }`}
                title="লাইক করুন"
              >
                <Heart size={24} className={isLiked ? 'fill-[#ff3040] animate-ig-like' : ''} />
              </button>
            )}
          </form>

          {isSent && (
            <div className="text-[11px] text-emerald-400 font-bold text-center pt-1 animate-in fade-in">
              ✓ মেসেজ পাঠানো হয়েছে!
            </div>
          )}
        </div>

        {/* Desktop Left/Right Navigation Arrows */}
        {storyIndex > 0 || memberIndex > 0 ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePrevStory();
            }}
            className="hidden md:flex absolute -left-14 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/35 text-white items-center justify-center backdrop-blur-md transition cursor-pointer"
            title="পূর্ববর্তী স্টোরি"
          >
            <ChevronLeft size={24} />
          </button>
        ) : null}

        {storyIndex < currentStories.length - 1 || memberIndex < membersWithStories.length - 1 ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNextStory();
            }}
            className="hidden md:flex absolute -right-14 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/35 text-white items-center justify-center backdrop-blur-md transition cursor-pointer"
            title="পরবর্তী স্টোরি"
          >
            <ChevronRight size={24} />
          </button>
        ) : null}

      </div>
    </div>
  );
}
