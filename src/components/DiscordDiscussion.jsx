import React, { useState, useEffect, useRef } from 'react';
import { newId } from '../services/tourStore';
import { useBackHandler } from '../utils/backNavigation';
import UserAvatar from './UserAvatar';
import {
  Hash,
  MessageSquare,
  Send,
  Users,
  ShieldAlert,
  Utensils,
  Compass,
  Zap,
  Smile,
  Plus,
} from 'lucide-react';

const CHANNELS = [
  {
    id: 'general',
    name: 'সাধারণ-আড্ডা',
    title: 'সাধারণ আড্ডা',
    icon: MessageSquare,
    desc: 'ট্যুর সম্পর্কিত মুক্ত আড্ডা, কুশল বিনিময় ও খোশগল্প',
    badge: 'আড্ডা'
  },
  {
    id: 'sightseeing',
    name: 'দর্শনীয়-স্থান-ও-প্ল্যান',
    title: 'দর্শনীয় স্থান',
    icon: Compass,
    desc: 'প্রতিদিনের স্পট ভিজিট, ভ্রমণ পরিকল্পনা ও রুটিন',
    badge: 'প্ল্যান'
  },
  {
    id: 'food',
    name: 'খাবার-দাবার-রেস্টুরেন্ট',
    title: 'খাবার মেনু',
    icon: Utensils,
    desc: 'সি-ফুড, রূপচাঁদা ফ্রাই, বারবিকিউ ও রেস্টুরেন্ট পছন্দ',
    badge: 'খাবার'
  },
  {
    id: 'emergency',
    name: 'জরুরি-হেল্প-ও-লোকেশন',
    title: 'জরুরি হেল্প',
    icon: ShieldAlert,
    desc: 'মিটিং পয়েন্ট, লস্ট অ্যান্ড ফাউন্ড ও তাৎক্ষণিক সহায়তা',
    badge: 'জরুরি'
  }
];

const EMOJI_REACTIONS = ['👍', '❤️', '🔥', '🏖️', '🍤', '🚌'];
const toBnNum = (n) => String(n ?? 0).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);

const QUICK_PROMPTS = [
  'সবাই কি রেডি? 🏖️',
  'আমরা এখন লবিতে আছি 📍',
  'লাঞ্চ করতে যাচ্ছি 🍤',
  'ছবিগুলো দারুণ হয়েছে! 📸',
  'বাস ছাড়তে কতক্ষণ? 🚌',
  'বিচে নামার সময় হয়েছে 🌊'
];

export default function DiscordDiscussion({
  discussions = {},
  currentUser = null,
  currentProfile = {},
  members = [],
  onSendMessage,
  onAddReaction
}) {
  const [activeChannelId, setActiveChannelId] = useState(() => {
    try {
      const stored = localStorage.getItem('tour_discussion_channel');
      if (stored === 'plans') return 'sightseeing';
      if (CHANNELS.some((c) => c.id === stored)) return stored;
      return 'general';
    } catch {
      return 'general';
    }
  });

  const [inputText, setInputText] = useState(() => {
    try {
      return localStorage.getItem('tour_discussion_draft') || '';
    } catch {
      return '';
    }
  });

  const [showQuickPrompts, setShowQuickPrompts] = useState(false);
  const [reactionPickerMsgId, setReactionPickerMsgId] = useState(null);

  // Phone back button handlers
  useBackHandler(showQuickPrompts, () => setShowQuickPrompts(false), 20);
  useBackHandler(Boolean(reactionPickerMsgId), () => setReactionPickerMsgId(null), 25);

  const messagesContainerRef = useRef(null);

  // Ensure window starts at the top when entering discussion tab
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  // Close quick prompts or reaction picker on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowQuickPrompts(false);
        setReactionPickerMsgId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Persist channel selection and draft text
  useEffect(() => {
    try {
      localStorage.setItem('tour_discussion_channel', activeChannelId);
    } catch {}
  }, [activeChannelId]);

  useEffect(() => {
    try {
      if (inputText) {
        localStorage.setItem('tour_discussion_draft', inputText);
      } else {
        localStorage.removeItem('tour_discussion_draft');
      }
    } catch {}
  }, [inputText]);

  const activeChannel = CHANNELS.find((c) => c.id === activeChannelId) || CHANNELS[0];
  const channelMessages = discussions[activeChannelId] || [];

  // Scroll only the internal messages container to bottom (never hijacks page window)
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [activeChannelId, channelMessages.length]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText || !inputText.trim()) return;

    const authorName = currentProfile?.displayName || currentUser?.displayName || 'পরিবারের সদস্য';
    const authorRole = currentProfile?.role || 'সদস্য';
    const authorAvatar = currentProfile?.avatarEmoji || '👑';

    const newMessage = {
      id: newId(),
      author: authorName,
      authorEmail: currentUser?.email?.toLowerCase() ?? null,
      authorPhoto: currentUser?.photoURL || currentProfile?.customPhotoURL || null,
      authorRole: authorRole,
      authorEmoji: authorAvatar,
      text: inputText.trim(),
      time: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
      reactions: {}
    };

    onSendMessage(activeChannelId, newMessage);
    setInputText('');
    try {
      localStorage.removeItem('tour_discussion_draft');
    } catch {}

    // Scroll internal messages container to latest message
    setTimeout(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    }, 50);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-1.5 sm:gap-2">
      {/* 1. SLIM TOP BAR (Desktop only to preserve vertical space on mobile) */}
      <div className="hidden md:flex shrink-0 bg-gradient-to-r from-teal-900 via-indigo-900 to-slate-900 text-white px-3.5 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl shadow-xs border border-teal-700/60 items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-400 text-teal-950 rounded-full shrink-0">
            💬 ডিসকর্ড
          </span>
          <h3 className="text-xs sm:text-sm font-bold truncate">
            ট্যুর আলোচনা হাব
          </h3>
        </div>
        <div className="flex items-center gap-1.5 bg-black/25 px-2.5 py-0.5 rounded-xl border border-white/10 text-[10px] sm:text-xs text-teal-200 shrink-0">
          <Users size={12} className="text-amber-300" />
          <span>{toBnNum(members.length)} জন</span>
        </div>
      </div>

      {/* 2. COMPACT 4-CHANNEL SELECTOR (Single sleek row on mobile, maximum space for chat!) */}
      <div className="shrink-0 grid grid-cols-4 gap-1 sm:gap-2">
        {CHANNELS.map((ch) => {
          const Icon = ch.icon;
          const isActive = activeChannelId === ch.id;
          const count = (discussions[ch.id] || []).length;

          return (
            <button
              key={ch.id}
              type="button"
              onClick={() => setActiveChannelId(ch.id)}
              title={ch.desc}
              className={`px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center sm:justify-between gap-1 border ${
                isActive
                  ? 'bg-gradient-to-r from-teal-800 to-indigo-800 text-white shadow-xs border-teal-500 ring-1 ring-teal-400/40'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200/90 shadow-2xs hover:border-indigo-300'
              }`}
            >
              <div className="flex items-center gap-1 min-w-0 truncate">
                <Icon size={12} className={isActive ? 'text-amber-300 shrink-0' : 'text-slate-500 shrink-0'} />
                <span className="truncate text-[10px] sm:text-xs">{ch.title}</span>
              </div>
              <span
                className={`text-[9px] sm:text-[10px] px-1 py-0.2 rounded-md font-mono font-semibold shrink-0 ${
                  isActive ? 'bg-black/30 text-amber-200' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {toBnNum(count)}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. DISCUSSION STREAM & COMPOSER (SINGLE UNIFIED CARD - ZERO GAP!) */}
      <div className="flex-1 min-h-0 flex flex-col bg-white rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
        {/* Active Channel Header */}
        <div className="shrink-0 px-3 py-1.5 sm:px-4 sm:py-2 bg-slate-50/90 flex items-center justify-between gap-2 border-b border-slate-100">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              <Hash size={12} />
            </div>
            <div className="min-w-0 flex items-center gap-1.5">
              <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 truncate">
                #{activeChannel.name}
              </h4>
              <span className="text-[9px] sm:text-[10px] font-semibold bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded-full border border-indigo-200 shrink-0">
                {activeChannel.badge}
              </span>
            </div>
          </div>

          <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-lg border border-slate-200 shrink-0">
            {toBnNum(channelMessages.length)} বার্তা
          </span>
        </div>

        {/* Messages Feed */}
        <div
          ref={messagesContainerRef}
          className="flex-1 min-h-0 overflow-y-auto p-2 sm:p-3 space-y-1.5 sm:space-y-2 bg-slate-50/40 overscroll-contain"
        >
          {channelMessages.length > 0 ? (
            channelMessages.map((msg) => {
              const myEmail = currentUser?.email?.toLowerCase();
              const isMe =
                (msg.senderEmail ?? msg.authorEmail) === myEmail ||
                (!msg.senderEmail && !msg.authorEmail && msg.author === currentUser?.displayName);

              const activeReactions = EMOJI_REACTIONS.filter((emoji) => {
                const voters = Array.isArray(msg.reactions?.[emoji]) ? msg.reactions[emoji] : [];
                return voters.length > 0;
              });

              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2 sm:gap-2.5 transition ${
                    isMe ? 'flex-row-reverse' : ''
                  }`}
                >
                  {/* User Avatar */}
                  <UserAvatar
                    photoUrl={msg.authorPhoto}
                    name={msg.author}
                    size="w-7 h-7 sm:w-8 sm:h-8"
                    ring={isMe ? 'ring-2 ring-teal-500' : 'ring-2 ring-indigo-300'}
                    fallbackEmoji={msg.authorEmoji || '👑'}
                    textClass="text-[9px]"
                    className="shrink-0 mt-0.5"
                  />

                  {/* Message Bubble Container */}
                  <div className={`relative group max-w-[85%] sm:max-w-[75%] space-y-0.5 ${isMe ? 'items-end text-right' : ''}`}>
                    <div className={`flex items-center gap-1.5 text-[10px] sm:text-[11px] leading-none mb-0.5 ${isMe ? 'justify-end' : ''}`}>
                      <span className="font-bold text-slate-800">{msg.author}</span>
                      {msg.authorRole && (
                        <span className="text-[8px] sm:text-[9px] bg-indigo-50 text-indigo-700 px-1 py-0.2 rounded border border-indigo-200 font-medium">
                          {msg.authorRole}
                        </span>
                      )}
                      <span className="text-[9px] text-slate-400">{msg.time}</span>
                    </div>

                    {/* Popover Emoji Reaction Picker */}
                    {reactionPickerMsgId === msg.id && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className={`flex items-center gap-1 bg-white rounded-full shadow-md border border-slate-200 px-2 py-0.5 mb-1 ${
                          isMe ? 'justify-end ml-auto' : 'justify-start'
                        } animate-in fade-in zoom-in-95 duration-100`}
                      >
                        {EMOJI_REACTIONS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => {
                              onAddReaction(activeChannelId, msg.id, emoji);
                              setReactionPickerMsgId(null);
                            }}
                            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-amber-50 hover:scale-125 transition text-xs cursor-pointer"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className={`flex items-center gap-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                      <div
                        className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-2xl text-xs sm:text-[13px] leading-relaxed text-left inline-block shadow-2xs ${
                          isMe
                            ? 'bg-gradient-to-r from-teal-700 to-teal-800 text-white rounded-tr-xs'
                            : 'bg-white text-slate-800 rounded-tl-xs border border-slate-200/90'
                        }`}
                      >
                        {msg.text}
                      </div>

                      {/* Quick Reaction Trigger Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReactionPickerMsgId(reactionPickerMsgId === msg.id ? null : msg.id);
                        }}
                        className="p-1 rounded-full text-slate-400 hover:text-amber-500 hover:bg-slate-100 transition opacity-40 sm:opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0 cursor-pointer"
                        title="ইমোজি রিঅ্যাকশন দিন"
                        aria-label="ইমোজি রিঅ্যাকশন দিন"
                      >
                        <Smile size={13} />
                      </button>
                    </div>

                    {/* Active Reactions Pills Bar (Shown ONLY when count > 0) */}
                    {activeReactions.length > 0 && (
                      <div className={`flex items-center flex-wrap gap-1 pt-0.5 ${isMe ? 'justify-end' : ''}`}>
                        {activeReactions.map((emoji) => {
                          const voters = Array.isArray(msg.reactions?.[emoji]) ? msg.reactions[emoji] : [];
                          const count = voters.length;
                          const myIdentifier = (
                            currentUser?.email ||
                            currentProfile?.displayName ||
                            currentUser?.displayName ||
                            'user'
                          ).toLowerCase();
                          const reactedByMe =
                            Boolean(myIdentifier) && voters.some((v) => String(v).toLowerCase() === myIdentifier);

                          return (
                            <button
                              key={emoji}
                              type="button"
                              aria-pressed={reactedByMe}
                              onClick={() => onAddReaction(activeChannelId, msg.id, emoji)}
                              className={`px-1.5 py-0.2 rounded-md text-[10px] flex items-center gap-0.5 transition cursor-pointer select-none border ${
                                reactedByMe
                                  ? 'bg-amber-100 text-amber-900 border-amber-400 font-bold scale-105 shadow-2xs'
                                  : 'bg-indigo-50/80 text-indigo-900 border-indigo-200 font-medium'
                              }`}
                              title={reactedByMe ? `${emoji} রিঅ্যাকশন বাতিল করুন` : `${emoji} রিঅ্যাক্ট করুন`}
                            >
                              <span>{emoji}</span>
                              <span className="font-bold font-mono text-[9px]">{toBnNum(count)}</span>
                            </button>
                          );
                        })}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setReactionPickerMsgId(reactionPickerMsgId === msg.id ? null : msg.id);
                          }}
                          className="px-1 py-0.5 rounded-md text-[9px] text-slate-400 hover:text-slate-700 hover:bg-slate-100 border border-slate-200/60 transition cursor-pointer flex items-center justify-center"
                          title="আরো রিঅ্যাকশন যুক্ত করুন"
                        >
                          <Plus size={10} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-8 sm:py-10 flex flex-col items-center justify-center text-center p-6 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl border border-indigo-100">
                💬
              </div>
              <h4 className="font-bold text-sm text-slate-800">
                চ্যানেল #{activeChannel.name}-এ স্বাগতম!
              </h4>
              <p className="text-xs text-slate-500 max-w-sm">
                এই চ্যানেলে এখনো কোনো বার্তা নেই। ট্যুরের পরিবারের সবার সাথে প্রথম কথা শুরু করুন!
              </p>
            </div>
          )}
        </div>

        {/* Message Input & Quick Shortcuts (Seamlessly docked at the card's bottom - ZERO GAP!) */}
        <div className="shrink-0 bg-white border-t border-slate-200 p-2 sm:p-2.5">
          <div className="space-y-1.5">
            {/* Quick Prompts Bar */}
            {showQuickPrompts && (
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1 animate-in fade-in duration-150">
                <span className="text-[10px] text-slate-400 font-semibold shrink-0">দ্রুত বার্তা:</span>
                {QUICK_PROMPTS.map((shortcut, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setInputText(shortcut);
                      setShowQuickPrompts(false);
                    }}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 text-[11px] rounded-lg shrink-0 border border-slate-200 transition cursor-pointer"
                  >
                    {shortcut}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={handleSend} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowQuickPrompts(!showQuickPrompts)}
                className={`p-2 rounded-xl transition cursor-pointer shrink-0 border ${
                  showQuickPrompts
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-200'
                }`}
                title="দ্রুত বার্তা নির্বাচন করুন"
                aria-label="দ্রুত শর্টকাট বার্তা"
              >
                <Zap size={16} className={showQuickPrompts ? 'fill-amber-400' : ''} />
              </button>

              <input
                type="text"
                placeholder={`#${activeChannel.name} চ্যানেলে বার্তা লিখুন...`}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl focus:outline-none focus:border-teal-600 focus:bg-white text-slate-800 placeholder-slate-400 transition"
              />

              <button
                type="submit"
                disabled={!inputText.trim()}
                className="px-3.5 sm:px-4 py-2 bg-gradient-to-r from-teal-700 to-teal-800 hover:from-teal-800 hover:to-teal-900 disabled:opacity-40 text-white font-bold text-xs sm:text-sm rounded-xl sm:rounded-2xl flex items-center gap-1.5 transition cursor-pointer shadow-sm shrink-0 active:scale-95"
              >
                <Send size={15} />
                <span className="hidden sm:inline">পাঠান</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
