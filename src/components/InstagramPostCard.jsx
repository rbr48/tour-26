import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
  MapPin,
  Film,
  Play,
  Images,
  ChevronLeft,
  ChevronRight,
  Download,
  HardDrive,
  Trash2,
  Edit3,
  Share2,
  Check,
  Loader2,
  X,
  Eye,
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { formatDuration } from '../utils/videoHelper';
import UserAvatar from './UserAvatar';
import { toBnNum, getPostImages, photoSource, getFilterCss } from './InstagramFeed';

export default function InstagramPostCard({
  post,
  currentUser,
  currentProfile,
  onLikePost,
  onOpenComments,
  onShareMedia,
  onManualDriveBackup,
  onStartEditPost,
  onDeletePost,
  onOpenReel,
  onOpenFullscreenImage,
  onViewPost,
  manualDriveUploadId,
  hasStory = false,
  onOpenStory,
}) {
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const [isSaved, setIsSaved] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('tour_saved_posts') || '[]');
      return saved.includes(post.id);
    } catch {
      return false;
    }
  });
  const [isCaptionExpanded, setIsCaptionExpanded] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);

  const lastTapRef = useRef(0);
  const carouselRef = useRef(null);
  const cardRef = useRef(null);

  // Auto-record impression view when post is scrolled into view (authentic Instagram behavior)
  useEffect(() => {
    if (!onViewPost || !cardRef.current || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.45) {
            onViewPost(post.id);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.45 }
    );
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [post.id, onViewPost]);

  const postImages = getPostImages(post);
  const totalImages = postImages.length;
  const currentMediaSrc = postImages[activeImageIdx] || photoSource(post);
  const postIsReel = Boolean(post.isReel || post.reel || post.videoUrl || post.video || post.type === 'reel');

  const myIdentifier = (
    currentUser?.email ||
    currentProfile?.displayName ||
    currentUser?.displayName ||
    'user'
  ).toLowerCase();

  const isLiked =
    post.likes?.some((u) => String(u).toLowerCase() === myIdentifier) ||
    post.likes?.includes(currentUser?.displayName || '') ||
    post.likes?.includes(currentProfile?.displayName || '');

  const likeCount = (post.likes || []).length;
  const commentCount = (post.comments || []).length;

  const isAuthor = Boolean(
    (currentUser?.email && post.authorEmail && post.authorEmail.toLowerCase() === currentUser.email.toLowerCase()) ||
    (!post.authorEmail && (currentProfile?.displayName || currentUser?.displayName) && post.author === (currentProfile?.displayName || currentUser?.displayName))
  );

  // Toggle Save to Favorites
  const handleToggleSave = () => {
    triggerHaptic('light');
    setIsSaved((prev) => {
      const next = !prev;
      try {
        const saved = JSON.parse(localStorage.getItem('tour_saved_posts') || '[]');
        const updated = next ? [...saved, post.id] : saved.filter((id) => id !== post.id);
        localStorage.setItem('tour_saved_posts', JSON.stringify(updated));
        window.dispatchEvent(new Event('tour_saved_updated'));
      } catch {}
      return next;
    });
  };

  // Double Tap to Like & Single Tap to View Media
  const handleMediaTouchOrClick = (e) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double tap triggered
      triggerHaptic('medium');
      setShowHeartAnim(true);
      setTimeout(() => setShowHeartAnim(false), 850);
      if (!isLiked && onLikePost) {
        onLikePost(post.id, currentUser?.displayName || currentProfile?.displayName || 'User');
      }
    } else {
      // Single tap: record view and open media
      onViewPost?.(post.id);
      if (postIsReel && onOpenReel) {
        onOpenReel(post);
      } else if (!postIsReel && onOpenFullscreenImage) {
        onOpenFullscreenImage({ images: postImages, index: activeImageIdx, post });
      }
    }
    lastTapRef.current = now;
  };

  // Carousel horizontal scroll-snap position listener
  const handleCarouselScroll = useCallback(() => {
    if (!carouselRef.current) return;
    const { scrollLeft, clientWidth } = carouselRef.current;
    if (clientWidth > 0) {
      const newIndex = Math.round(scrollLeft / clientWidth);
      if (newIndex !== activeImageIdx && newIndex >= 0 && newIndex < totalImages) {
        setActiveImageIdx(newIndex);
      }
    }
  }, [activeImageIdx, totalImages]);

  const scrollToImage = (index) => {
    if (!carouselRef.current) return;
    triggerHaptic('light');
    const clientWidth = carouselRef.current.clientWidth;
    carouselRef.current.scrollTo({
      left: index * clientWidth,
      behavior: 'smooth',
    });
    setActiveImageIdx(index);
  };

  return (
    <article
      ref={cardRef}
      data-post-id={post.id}
      className="bg-white border-b border-slate-200/90 sm:border sm:rounded-2xl sm:shadow-2xs overflow-hidden max-w-[470px] mx-auto select-none"
    >
      {/* 1. Header (Avatar, Author, Location, 3-dots Menu) */}
      <div className="px-3.5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            onClick={hasStory && onOpenStory ? () => onOpenStory(post.author) : undefined}
            className={`cursor-pointer ${
              hasStory
                ? 'p-0.5 rounded-full bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888]'
                : ''
            }`}
          >
            <div className={hasStory ? 'p-0.5 bg-white rounded-full' : ''}>
              <UserAvatar
                photoUrl={post.authorPhoto}
                name={post.author}
                size="w-8 h-8"
              />
            </div>
          </div>

          <div className="leading-tight">
            <div className="flex items-center gap-1.5">
              <h4 className="font-extrabold text-[13px] text-slate-900 tracking-tight">
                {post.author}
              </h4>
              {postIsReel && (
                <span className="text-[9px] bg-pink-100 text-pink-700 font-bold px-1.5 py-0.2 rounded-full">
                  🎬 রিলস
                </span>
              )}
            </div>
            {post.location && (
              <p className="text-[11px] text-slate-500 font-medium flex items-center gap-0.5 pt-0.5">
                <MapPin size={10} className="text-slate-400" />
                <span>{post.location}</span>
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowOptionsMenu(true)}
          className="p-1 text-slate-600 hover:text-slate-900 transition cursor-pointer"
          title="অপশন মেনু"
        >
          <MoreHorizontal size={18} />
        </button>
      </div>

      {/* 2. Media Canvas (Authentic 4:5 Portrait Ratio + CSS Scroll Snap) */}
      <div className="relative w-full aspect-[4/5] bg-black overflow-hidden flex items-center justify-center">
        {/* Horizontal Snap Scroll Carousel */}
        <div
          ref={carouselRef}
          onScroll={handleCarouselScroll}
          onClick={handleMediaTouchOrClick}
          className="w-full h-full flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory scrollbar-none cursor-pointer"
        >
          {postImages.map((src, idx) => (
            <div
              key={idx}
              className="w-full h-full shrink-0 snap-center relative flex items-center justify-center bg-neutral-950"
            >
              <img
                src={src}
                alt={post.caption || 'Tour photo'}
                className="w-full h-full object-cover select-none pointer-events-none"
                style={{ filter: getFilterCss(post.filter) }}
                loading={idx === 0 ? 'eager' : 'lazy'}
              />
            </div>
          ))}
        </div>

        {/* Big Centered Heart Burst Animation on Double Tap */}
        {showHeartAnim && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <Heart className="w-24 h-24 fill-white text-white drop-shadow-2xl animate-ig-heart" />
          </div>
        )}

        {/* If Reel: Show Duration Badge & Center Play Button */}
        {postIsReel && (
          <>
            <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md border border-white/20 pointer-events-none z-10">
              <Film size={12} className="text-pink-400" />
              <span>{formatDuration(post.duration || 0, { bengali: true })}</span>
            </div>

            <div
              onClick={() => onOpenReel?.(post)}
              className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/35 transition cursor-pointer z-10 group"
            >
              <div className="w-16 h-16 rounded-full bg-pink-600/90 text-white flex items-center justify-center shadow-2xl backdrop-blur-xs group-hover:scale-110 transition duration-300 border border-white/20">
                <Play size={28} className="ml-1 fill-white" />
              </div>
            </div>
          </>
        )}

        {/* Multi-Photo Number Badge (e.g. 1/3) */}
        {!postIsReel && totalImages > 1 && (
          <div className="absolute top-3 right-3 bg-black/65 backdrop-blur-md text-white text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md border border-white/20 pointer-events-none z-10">
            <Images size={12} className="text-pink-300" />
            <span>
              {toBnNum(activeImageIdx + 1)}/{toBnNum(totalImages)}
            </span>
          </div>
        )}

        {/* Desktop Carousel Navigation Arrows */}
        {!postIsReel && totalImages > 1 && activeImageIdx > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              scrollToImage(activeImageIdx - 1);
            }}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/55 hover:bg-black/80 text-white flex items-center justify-center transition shadow-lg z-20 cursor-pointer backdrop-blur-xs active:scale-90"
            title="পূর্ববর্তী ছবি"
          >
            <ChevronLeft size={18} />
          </button>
        )}

        {!postIsReel && totalImages > 1 && activeImageIdx < totalImages - 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              scrollToImage(activeImageIdx + 1);
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/55 hover:bg-black/80 text-white flex items-center justify-center transition shadow-lg z-20 cursor-pointer backdrop-blur-xs active:scale-90"
            title="পরবর্তী ছবি"
          >
            <ChevronRight size={18} />
          </button>
        )}

        {/* Bottom Carousel Indicator Dots */}
        {!postIsReel && totalImages > 1 && (
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/45 backdrop-blur-xs z-10">
            {postImages.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  scrollToImage(idx);
                }}
                className={`transition-all duration-200 cursor-pointer rounded-full ${
                  idx === activeImageIdx
                    ? 'w-1.5 h-1.5 bg-blue-500 scale-125'
                    : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/80'
                }`}
              />
            ))}
          </div>
        )}

        {/* Drive Backup Indicator Pill */}
        {post.driveBackedUp ? (
          <div className="absolute top-3 left-3 bg-emerald-950/80 backdrop-blur-xs text-emerald-300 text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs border border-emerald-500/30 z-10 pointer-events-none">
            <HardDrive size={10} className="text-emerald-400" />
            <span>ড্রাইভে সংরক্ষিত</span>
          </div>
        ) : null}
      </div>

      {/* 3. Action Bar (Heart, Comment, Share, Bookmark) */}
      <div className="px-3.5 pt-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Like Button with Bounce */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onLikePost?.(post.id, currentUser?.displayName || currentProfile?.displayName || 'User');
            }}
            className="cursor-pointer active:scale-75 transition-transform duration-150"
            title="লাইক করুন"
          >
            <Heart
              size={25}
              className={
                isLiked
                  ? 'fill-[#ff3040] text-[#ff3040] scale-110 animate-ig-like'
                  : 'text-slate-800 hover:text-slate-600'
              }
            />
          </button>

          {/* Comment Bubble Icon (Opens Sliding Bottom Sheet) */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onOpenComments?.(post);
            }}
            className="cursor-pointer active:scale-75 transition-transform duration-150 text-slate-800 hover:text-slate-600"
            title="মন্তব্য করুন"
          >
            <MessageCircle size={25} className="-rotate-6" />
          </button>

          {/* Direct Share Paper Airplane */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onShareMedia?.(post, currentMediaSrc);
            }}
            className="cursor-pointer active:scale-75 transition-transform duration-150 text-slate-800 hover:text-slate-600"
            title="শেয়ার করুন"
          >
            <Send size={24} className="rotate-12" />
          </button>
        </div>

        {/* Bookmark Icon */}
        <button
          type="button"
          onClick={handleToggleSave}
          className="cursor-pointer active:scale-75 transition-transform duration-150 text-slate-800 hover:text-slate-600"
          title={isSaved ? 'সেভ করা থেকে সরান' : 'সেভ করুন'}
        >
          <Bookmark
            size={25}
            className={isSaved ? 'fill-slate-900 text-slate-900' : ''}
          />
        </button>
      </div>

      {/* 4. Engagement & Caption Details */}
      <div className="px-3.5 pb-3 space-y-1.5 text-xs">
        {/* Likes and Views Count Row */}
        <div className="flex items-center justify-between pt-0.5">
          <div className="flex items-center gap-2">
            {likeCount > 0 ? (
              <p className="font-extrabold text-[13px] text-slate-900">
                {toBnNum(likeCount)}টি লাইক
              </p>
            ) : (
              <p className="text-slate-400 font-medium text-[12px]">
                প্রথম লাইক দিন
              </p>
            )}
          </div>

          {/* View Count Badge */}
          <div
            className="flex items-center gap-1.5 text-slate-500 text-[11px] font-semibold bg-slate-50 hover:bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200/80 transition-colors select-none"
            title="মোট ভিউ সংখ্যা"
          >
            <Eye size={13} className="text-teal-600" />
            <span className="font-mono">{toBnNum(post.views || 0)} ভিউ</span>
          </div>
        </div>

        {/* If Reel: Display authentic Instagram "দেখা হয়েছে X বার" */}
        {postIsReel && (
          <p className="text-slate-600 font-medium text-[11px]">
            দেখা হয়েছে <span className="font-bold text-slate-900">{toBnNum(post.views || 0)}</span> বার
          </p>
        )}

        {/* Caption */}
        {post.caption && (
          <div className="text-[13px] text-slate-900 leading-snug">
            <span className="font-extrabold mr-1.5">{post.author}</span>
            <span>
              {isCaptionExpanded || post.caption.length <= 110
                ? post.caption
                : `${post.caption.slice(0, 110)}...`}
            </span>
            {post.caption.length > 110 && !isCaptionExpanded && (
              <button
                type="button"
                onClick={() => setIsCaptionExpanded(true)}
                className="text-slate-500 font-medium ml-1 hover:text-slate-800 cursor-pointer"
              >
                আরও
              </button>
            )}
          </div>
        )}

        {/* Recent Comments Preview (Authentic Instagram Style) */}
        {commentCount > 0 && (
          <div className="space-y-0.5 pt-0.5">
            {(Array.isArray(post.comments) ? post.comments : []).slice(-2).map((c, idx) => {
              const userName = typeof c === 'string' ? '' : (c.user || c.author || '');
              const commentText = typeof c === 'string' ? c : (c.text || c.comment || c.message || '');
              return (
                <div
                  key={idx}
                  onClick={() => onOpenComments?.(post)}
                  className="text-[12px] text-slate-800 leading-snug cursor-pointer line-clamp-2"
                >
                  {userName && <span className="font-bold mr-1.5">{userName}</span>}
                  <span className="text-slate-700">{commentText}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* View All Comments Trigger */}
        {commentCount > 0 ? (
          <button
            type="button"
            onClick={() => onOpenComments?.(post)}
            className="text-slate-500 text-[12px] font-medium pt-0.5 hover:text-slate-800 cursor-pointer block"
          >
            সবগুলো {toBnNum(commentCount)}টি মন্তব্য দেখুন
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onOpenComments?.(post)}
            className="text-slate-400 text-[12px] font-medium pt-0.5 hover:text-slate-600 cursor-pointer block"
          >
            একটি মন্তব্য লিখুন...
          </button>
        )}

        {/* Post Timestamp */}
        <p className="text-[10px] text-slate-400 uppercase tracking-wide pt-1">
          {post.createdAt || 'কক্সবাজার ২০২৬'}
        </p>
      </div>

      {/* 5. Instagram Options Modal / Action Sheet */}
      {showOptionsMenu && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowOptionsMenu(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl divide-y divide-slate-100 text-xs font-semibold text-center select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {isAuthor && onStartEditPost && (
              <button
                type="button"
                onClick={() => {
                  setShowOptionsMenu(false);
                  onStartEditPost(post);
                }}
                className="w-full py-3.5 text-slate-800 hover:bg-slate-50 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Edit3 size={15} />
                <span>ক্যাপশন ও স্থান পরিবর্তন করুন</span>
              </button>
            )}

            {isAuthor && onDeletePost && (
              <button
                type="button"
                onClick={() => {
                  setShowOptionsMenu(false);
                  if (confirm('আপনি কি নিশ্চিতভাবে এই পোস্টটি মুছে ফেলতে চান?')) {
                    onDeletePost(post.id);
                  }
                }}
                className="w-full py-3.5 text-rose-600 hover:bg-rose-50 transition cursor-pointer font-bold flex items-center justify-center gap-2"
              >
                <Trash2 size={15} />
                <span>পোস্ট মুছে ফেলুন</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setShowOptionsMenu(false);
                onShareMedia?.(post, currentMediaSrc);
              }}
              className="w-full py-3.5 text-slate-800 hover:bg-slate-50 transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Share2 size={15} />
              <span>ছবি শেয়ার করুন</span>
            </button>

            <a
              href={`https://wa.me/?text=${encodeURIComponent(`📸 *কক্সবাজার ট্যুর ২০২৬*\n${post.author}: "${post.caption || 'পারিবারিক আনন্দঘন মুহূর্ত'}"\n📍 ${post.location || 'কক্সবাজার'}\n\n👉 দেখুন: ${window.location.origin}/#feed`)}`}
              target="_blank"
              rel="noreferrer"
              onClick={() => setShowOptionsMenu(false)}
              className="w-full py-3.5 text-emerald-800 hover:bg-emerald-50 transition cursor-pointer flex items-center justify-center gap-2"
            >
              <MessageCircle size={15} className="text-emerald-600" />
              <span>হোয়াটসঅ্যাপে শেয়ার করুন</span>
            </a>

            <a
              href={currentMediaSrc}
              download={`Tour2026_${post.id}.jpg`}
              target="_blank"
              rel="noreferrer"
              onClick={() => setShowOptionsMenu(false)}
              className="w-full py-3.5 text-slate-800 hover:bg-slate-50 transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Download size={15} />
              <span>ছবি ডাউনলোড করুন</span>
            </a>

            {!post.driveBackedUp && onManualDriveBackup && (
              <button
                type="button"
                onClick={() => {
                  setShowOptionsMenu(false);
                  onManualDriveBackup(post);
                }}
                className="w-full py-3.5 text-emerald-700 hover:bg-emerald-50 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <HardDrive size={15} />
                <span>গুগল ড্রাইভে ব্যাকআপ পাঠান</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowOptionsMenu(false)}
              className="w-full py-3.5 text-slate-500 hover:bg-slate-50 transition cursor-pointer font-normal"
            >
              বাতিল
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
