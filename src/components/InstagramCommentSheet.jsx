import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Heart, Smile } from 'lucide-react';
import { useBackHandler } from '../utils/backNavigation';
import { triggerHaptic } from '../utils/haptics';
import UserAvatar from './UserAvatar';
import { toBnNum } from './InstagramFeed';

const QUICK_EMOJIS = ['❤️', '🙌', '🔥', '👏', '😂', '😍', '🎉', '🏖️'];
const COMMENT_REACTIONS = ['❤️', '👍', '😂', '🔥', '👏'];

export default function InstagramCommentSheet({
  isOpen,
  post,
  currentUser,
  currentProfile,
  onClose,
  onAddComment,
  onCommentReaction,
}) {
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef(null);
  const commentsEndRef = useRef(null);

  // Hardware back button integration (higher priority than feed navigation)
  useBackHandler(isOpen, onClose, 28);

  useEffect(() => {
    if (isOpen) {
      setCommentText('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 250);
    }
  }, [isOpen]);

  if (!isOpen || !post) return null;

  const comments = Array.isArray(post.comments) ? post.comments : [];
  const myIdentifier = (
    currentUser?.email ||
    currentProfile?.displayName ||
    currentUser?.displayName ||
    'user'
  ).toLowerCase();

  const handleSubmit = (e) => {
    e?.preventDefault();
    const trimmed = commentText.trim();
    if (!trimmed || isSubmitting || !onAddComment) return;

    triggerHaptic('success');
    setIsSubmitting(true);
    const authorName = currentProfile?.displayName || currentUser?.displayName || 'পরিবারের সদস্য';
    const profilePhoto = currentProfile?.customPhotoURL;
    const newCommentObj = {
      id: Date.now(),
      user: authorName,
      authorEmail: currentUser?.email || 'member@tour.family',
      userPhoto: typeof profilePhoto === 'string' && !profilePhoto.startsWith('data:') ? profilePhoto : (currentUser?.photoURL || null),
      text: trimmed,
      time: 'এইমাত্র',
      createdAt: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
    };
    onAddComment(post.id, newCommentObj);
    setCommentText('');
    setIsSubmitting(false);

    // Auto scroll to latest comment
    setTimeout(() => {
      commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 150);
  };

  const handleQuickEmoji = (emoji) => {
    triggerHaptic('light');
    setCommentText((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center animate-in fade-in duration-200">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Main Sliding Sheet */}
      <div
        className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl max-h-[85vh] sm:max-h-[80vh] flex flex-col shadow-2xl overflow-hidden z-10 animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Drag Indicator */}
        <div className="pt-2 pb-1 flex justify-center cursor-grab active:cursor-grabbing">
          <div className="w-10 h-1 bg-slate-300 rounded-full" />
        </div>

        {/* Sheet Header */}
        <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-extrabold text-sm text-slate-800">
            মন্তব্যসমূহ {comments.length > 0 && <span className="text-slate-400 font-normal">({toBnNum(comments.length)})</span>}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition cursor-pointer"
            title="বন্ধ করুন"
          >
            <X size={18} />
          </button>
        </div>

        {/* Post Caption Snippet */}
        {post.caption && (
          <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-100 flex items-start gap-3">
            <UserAvatar
              photoUrl={post.authorPhoto}
              name={post.author}
              size="w-8 h-8"
              ring="ring-1 ring-slate-200"
            />
            <div className="text-xs text-slate-800 leading-relaxed">
              <span className="font-bold text-slate-900 mr-1.5">{post.author}</span>
              <span>{post.caption}</span>
              <p className="text-[10px] text-slate-400 mt-0.5">{post.createdAt || 'পোস্ট'}</p>
            </div>
          </div>
        )}

        {/* Scrollable Comments Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {comments.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Smile size={36} className="mx-auto text-slate-300 stroke-1" />
              <p className="font-bold text-slate-600">এখনও কোনো মন্তব্য নেই</p>
              <p className="text-[11px]">পরিবারের এই সুন্দর পোস্টে প্রথম মন্তব্যকারী হোন! 🎉</p>
            </div>
          ) : (
            comments.map((c, idx) => {
              const commentId = (c && typeof c === 'object' && c.id !== undefined && c.id !== null) ? c.id : idx;
              const userName = typeof c === 'string' ? 'পরিবারের সদস্য' : (c.user || c.author || 'পরিবারের সদস্য');
              const commentText = typeof c === 'string' ? c : (c.text || c.comment || c.message || c.body || '');
              const userAvatar = typeof c === 'object' ? c.userPhoto : null;
              const timeDisplay = (typeof c === 'object' && (c.time || c.createdAt)) ? (c.time || c.createdAt) : 'এইমাত্র';
              const reactions = (typeof c === 'object' && c.reactions) ? c.reactions : {};

              return (
                <div key={commentId} className="flex items-start gap-3 group">
                  <UserAvatar
                    photoUrl={userAvatar}
                    name={userName}
                    size="w-8 h-8"
                    ring="ring-1 ring-slate-200"
                  />
                  <div className="flex-1 space-y-1">
                    <div className="text-xs text-slate-800 leading-relaxed">
                      <span className="font-bold text-slate-900 mr-1.5">{userName}</span>
                      <span>{commentText}</span>
                    </div>

                    <div className="flex items-center gap-3 text-[10px] text-slate-400">
                      <span>{timeDisplay}</span>

                      {/* Emoji Reactions for this comment */}
                      <div className="flex items-center gap-1">
                        {COMMENT_REACTIONS.map((emoji) => {
                          const voters = Array.isArray(reactions[emoji]) ? reactions[emoji] : [];
                          const count = voters.length;
                          const hasVoted = voters.some((v) => String(v).toLowerCase() === myIdentifier);

                          return (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => {
                                triggerHaptic('light');
                                onCommentReaction?.(post.id, commentId, emoji);
                              }}
                              className={`px-1.5 py-0.2 rounded-full text-[10px] flex items-center gap-0.5 transition cursor-pointer select-none ${
                                hasVoted
                                  ? 'bg-rose-100 text-rose-700 border border-rose-300 font-bold scale-105'
                                  : count > 0
                                  ? 'bg-slate-100 text-slate-700 border border-slate-200'
                                  : 'text-slate-300 hover:text-slate-600 opacity-50 hover:opacity-100'
                              }`}
                              title={`${emoji} দিয়ে প্রতিক্রিয়া জানান`}
                            >
                              <span>{emoji}</span>
                              {count > 0 && <span className="font-mono text-[9px]">{toBnNum(count)}</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={commentsEndRef} />
        </div>

        {/* Quick Emoji Insertion Ribbon */}
        <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 flex items-center justify-between overflow-x-auto gap-2">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleQuickEmoji(emoji)}
              className="text-lg hover:scale-125 active:scale-95 transition transform cursor-pointer p-0.5"
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Sticky Bottom Comment Input Bar */}
        <form onSubmit={handleSubmit} className="p-3 border-t border-slate-100 bg-white flex items-center gap-2.5">
          <UserAvatar
            photoUrl={currentUser?.photoURL || currentProfile?.photoURL}
            name={currentUser?.displayName || currentProfile?.displayName || 'আমি'}
            size="w-8 h-8"
          />

          <input
            ref={inputRef}
            type="text"
            placeholder="একটি মন্তব্য লিখুন..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            className="flex-1 px-3.5 py-2 text-xs bg-slate-100 focus:bg-white border border-transparent focus:border-blue-500 rounded-full focus:outline-none transition"
          />

          <button
            type="submit"
            disabled={!commentText.trim() || isSubmitting}
            className="font-bold text-xs text-blue-600 hover:text-blue-700 disabled:text-blue-300 disabled:cursor-not-allowed px-2 transition cursor-pointer select-none active:scale-95"
          >
            পোস্ট
          </button>
        </form>
      </div>
    </div>
  );
}
