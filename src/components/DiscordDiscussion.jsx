import React, { useState, useEffect, useRef } from 'react';
import { newId, setTypingStatus, subscribeTyping } from '../services/tourStore';
import { useBackHandler } from '../utils/backNavigation';
import { localISODate } from '../utils/date';
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
  Pencil,
  Trash2,
  Check,
  X,
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

const BN_MONTHS = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

function formatMessageDateLabel(dateStr) {
  if (!dateStr) return null;
  const today = localISODate();
  const yesterday = localISODate(new Date(Date.now() - 86400000));

  if (dateStr === today) return 'আজ';
  if (dateStr === yesterday) return 'গতকাল';

  const parts = String(dateStr).split('-');
  if (parts.length === 3) {
    const year = parts[0];
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const monthName = BN_MONTHS[month] || parts[1];
    return `${toBnNum(day)} ${monthName}, ${toBnNum(year)}`;
  }
  return dateStr;
}

const ROLE_BADGE_STYLES = {
  'অ্যাডমিন': 'bg-rose-50 text-rose-700 border-rose-200',
  'কো-অর্ডিনেটর': 'bg-amber-50 text-amber-800 border-amber-200',
  'ফটোগ্রাফার': 'bg-sky-50 text-sky-700 border-sky-200',
  'ইয়ংস্টার': 'bg-purple-50 text-purple-700 border-purple-200',
  'সদস্য': 'bg-slate-100 text-slate-700 border-slate-200',
};

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
  isAdmin = false,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onAddReaction,
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
  const [activeActionMsgId, setActiveActionMsgId] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);

  const inputRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const lastHeartbeatRef = useRef(0);

  // Phone back button handlers
  useBackHandler(Boolean(editingMessage), () => {
    setEditingMessage(null);
    setInputText('');
  }, 15);
  useBackHandler(showQuickPrompts, () => setShowQuickPrompts(false), 20);
  useBackHandler(Boolean(activeActionMsgId), () => setActiveActionMsgId(null), 22);
  useBackHandler(Boolean(reactionPickerMsgId), () => setReactionPickerMsgId(null), 25);

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
        setActiveActionMsgId(null);
        if (editingMessage) {
          setEditingMessage(null);
          setInputText('');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingMessage]);

  // Persist channel selection and draft text (only if not editing)
  useEffect(() => {
    try {
      localStorage.setItem('tour_discussion_channel', activeChannelId);
    } catch {}
  }, [activeChannelId]);

  useEffect(() => {
    try {
      if (inputText && !editingMessage) {
        localStorage.setItem('tour_discussion_draft', inputText);
      } else if (!inputText && !editingMessage) {
        localStorage.removeItem('tour_discussion_draft');
      }
    } catch {}
  }, [inputText, editingMessage]);

  const activeChannel = CHANNELS.find((c) => c.id === activeChannelId) || CHANNELS[0];
  const channelMessages = discussions[activeChannelId] || [];

  // Helper to report current typing status
  const reportTyping = (isTyping) => {
    const myId = (
      currentUser?.email ||
      currentProfile?.displayName ||
      currentUser?.displayName ||
      'user'
    ).toLowerCase();
    const myName = currentProfile?.displayName || currentUser?.displayName || 'সদস্য';
    setTypingStatus(activeChannelId, myId, myName, isTyping);
  };

  // Subscribe to typing updates for the active channel
  useEffect(() => {
    const myId = (
      currentUser?.email ||
      currentProfile?.displayName ||
      currentUser?.displayName ||
      'user'
    ).toLowerCase().replace(/[.#$[\]/]/g, '_');

    const unsubscribe = subscribeTyping(activeChannelId, (users) => {
      const others = (users || []).filter((u) => u.id !== myId);
      setTypingUsers(others);
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [activeChannelId, currentUser, currentProfile]);

  // Clear typing on channel switch or unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      reportTyping(false);
    };
  }, [activeChannelId]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputText(val);

    if (!val.trim()) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      reportTyping(false);
      return;
    }

    const now = Date.now();
    if (now - lastHeartbeatRef.current > 2500) {
      reportTyping(true);
      lastHeartbeatRef.current = now;
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      reportTyping(false);
    }, 3500);
  };

  // Scroll only the internal messages container to bottom (never hijacks page window)
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [activeChannelId, channelMessages.length]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText || !inputText.trim()) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    reportTyping(false);

    if (editingMessage) {
      if (onEditMessage) {
        onEditMessage(activeChannelId, editingMessage.id, inputText.trim());
      }
      setEditingMessage(null);
      setInputText('');
      try {
        localStorage.removeItem('tour_discussion_draft');
      } catch {}
      return;
    }

    const authorName = currentProfile?.displayName || currentUser?.displayName || 'পরিবারের সদস্য';
    const authorRole = currentProfile?.role || 'সদস্য';
    const authorAvatar = currentProfile?.avatarEmoji || '👑';

    const now = new Date();
    const newMessage = {
      id: newId(),
      author: authorName,
      authorEmail: currentUser?.email?.toLowerCase() ?? null,
      authorPhoto: currentUser?.photoURL || currentProfile?.customPhotoURL || null,
      authorRole: authorRole,
      authorEmoji: authorAvatar,
      text: inputText.trim(),
      time: now.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
      timestamp: now.getTime(),
      date: localISODate(now),
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

      {/* 2. SLEEK HORIZONTAL CHANNEL SELECTOR (Scrollable with full Bengali titles, no truncation!) */}
      <div className="shrink-0 flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5 px-0.5">
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
              className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 border whitespace-nowrap select-none ${
                isActive
                  ? 'bg-gradient-to-r from-teal-800 to-indigo-800 text-white shadow-xs border-teal-500 ring-2 ring-teal-400/40'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200/90 shadow-2xs hover:border-indigo-300'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-amber-300 shrink-0' : 'text-slate-500 shrink-0'} />
              <span className="text-xs sm:text-[13px]">{ch.title}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono font-bold shrink-0 ${
                  isActive ? 'bg-black/35 text-amber-200' : 'bg-slate-100 text-slate-600'
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
        <div className="shrink-0 px-3 py-2 sm:px-4 sm:py-2.5 bg-white/95 backdrop-blur-xs flex items-center justify-between gap-2 border-b border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              <Hash size={13} />
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

          <span className="text-[10px] sm:text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 shrink-0">
            {toBnNum(channelMessages.length)} বার্তা
          </span>
        </div>

        {/* Messages Feed */}
        <div
          ref={messagesContainerRef}
          onClick={() => {
            setActiveActionMsgId(null);
            setReactionPickerMsgId(null);
          }}
          className="flex-1 min-h-0 overflow-y-auto p-2.5 sm:p-4 pt-3 sm:pt-4 space-y-1 sm:space-y-1.5 bg-slate-100/75 overscroll-contain"
        >
          {(() => {
            const processedMessages = channelMessages.map((msg, index) => {
              const myEmail = currentUser?.email?.toLowerCase();
              const isMe =
                (msg.senderEmail ?? msg.authorEmail) === myEmail ||
                (!msg.senderEmail && !msg.authorEmail && msg.author === currentUser?.displayName);

              const prevMsg = channelMessages[index - 1];
              const nextMsg = channelMessages[index + 1];

              const msgDate = msg.date || (msg.timestamp ? localISODate(new Date(msg.timestamp)) : null);
              const prevDate = prevMsg?.date || (prevMsg?.timestamp ? localISODate(new Date(prevMsg.timestamp)) : null);
              const nextDate = nextMsg?.date || (nextMsg?.timestamp ? localISODate(new Date(nextMsg.timestamp)) : null);

              const showDateDivider = Boolean(msgDate && (!prevDate || msgDate !== prevDate));

              const senderKey = (msg.senderEmail ?? msg.authorEmail ?? msg.author ?? '').toLowerCase();
              const prevSenderKey = (prevMsg?.senderEmail ?? prevMsg?.authorEmail ?? prevMsg?.author ?? '').toLowerCase();
              const nextSenderKey = (nextMsg?.senderEmail ?? nextMsg?.authorEmail ?? nextMsg?.author ?? '').toLowerCase();

              const isFirstInCluster = index === 0 || showDateDivider || senderKey !== prevSenderKey;
              const isLastInCluster = index === channelMessages.length - 1 || (msgDate && nextDate && msgDate !== nextDate) || senderKey !== nextSenderKey;

              const activeReactions = EMOJI_REACTIONS.filter((emoji) => {
                const voters = Array.isArray(msg.reactions?.[emoji]) ? msg.reactions[emoji] : [];
                return voters.length > 0;
              });

              return {
                ...msg,
                isMe,
                showDateDivider,
                dateLabel: msgDate ? formatMessageDateLabel(msgDate) : null,
                isFirstInCluster,
                isLastInCluster,
                activeReactions,
              };
            });

            if (processedMessages.length === 0) {
              return (
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
              );
            }

            return processedMessages.map((msg) => {
              const isMe = msg.isMe;
              const isFirst = msg.isFirstInCluster;
              const isLast = msg.isLastInCluster;
              const showActions = activeActionMsgId === msg.id;

              return (
                <React.Fragment key={msg.id}>
                  {/* Date Divider */}
                  {msg.showDateDivider && msg.dateLabel && (
                    <div className="flex items-center justify-center my-3 sm:my-3.5 select-none">
                      <div className="h-px bg-slate-200 flex-1 max-w-[50px] sm:max-w-[80px]" />
                      <span className="mx-2 px-3 py-0.5 rounded-full bg-slate-200/90 text-slate-700 text-[10px] font-bold shadow-2xs border border-slate-300/60">
                        📅 {msg.dateLabel}
                      </span>
                      <div className="h-px bg-slate-200 flex-1 max-w-[50px] sm:max-w-[80px]" />
                    </div>
                  )}

                  {/* Message Item */}
                  <div
                    className={`flex items-end gap-1.5 sm:gap-2 transition-all ${
                      isMe ? 'flex-row-reverse' : ''
                    } ${isFirst ? 'mt-2.5 sm:mt-3' : 'mt-0.5'}`}
                  >
                    {/* User Avatar: Show on last in cluster for incoming messages */}
                    {!isMe && (
                      <div className="w-7 sm:w-8 shrink-0 flex flex-col justify-end">
                        {isLast ? (
                          <UserAvatar
                            photoUrl={msg.authorPhoto}
                            name={msg.author}
                            size="w-7 h-7 sm:w-8 sm:h-8"
                            ring="ring-2 ring-indigo-200"
                            fallbackEmoji={msg.authorEmoji || '👑'}
                            textClass="text-[9px]"
                          />
                        ) : (
                          <div className="w-7 sm:w-8 h-7 sm:h-8" aria-hidden="true" />
                        )}
                      </div>
                    )}

                    {/* Message Bubble Container */}
                    <div className={`relative group max-w-[85%] sm:max-w-[75%] ${isMe ? 'items-end' : ''}`}>
                      {/* Author Header: Show ONLY on first in cluster for incoming messages */}
                      {!isMe && isFirst && (
                        <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] leading-none mb-1 pl-1">
                          <span className="font-bold text-slate-800">{msg.author}</span>
                          {msg.authorRole && (
                            <span
                              className={`text-[8px] sm:text-[9px] px-1.5 py-0.2 rounded-md font-semibold border ${
                                ROLE_BADGE_STYLES[msg.authorRole] || 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              }`}
                            >
                              {msg.authorRole}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Popover Emoji Reaction Picker */}
                      {reactionPickerMsgId === msg.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className={`absolute -top-9 z-20 flex items-center gap-1 bg-white/95 backdrop-blur-md rounded-full shadow-lg border border-slate-200 px-2 py-1 ${
                            isMe ? 'right-0' : 'left-0'
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
                              className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-amber-100 hover:scale-130 active:scale-120 transition text-sm cursor-pointer"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Anchored Action Toolbar on Hover / Active Tap */}
                      <div
                        className={`absolute -top-3.5 z-10 ${
                          isMe ? 'left-2' : 'right-2'
                        } ${
                          showActions ? 'flex' : 'hidden group-hover:flex'
                        } items-center gap-0.5 bg-white/95 backdrop-blur-md rounded-full shadow-md border border-slate-200 px-1 py-0.5 transition-all select-none`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => setReactionPickerMsgId(reactionPickerMsgId === msg.id ? null : msg.id)}
                          className="p-1 rounded-full text-slate-500 hover:text-amber-500 hover:bg-slate-100 transition cursor-pointer"
                          title="ইমোজি রিঅ্যাকশন দিন"
                          aria-label="ইমোজি রিঅ্যাকশন দিন"
                        >
                          <Smile size={12} />
                        </button>
                        {(isMe || isAdmin) && onEditMessage && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMessage({ id: msg.id, text: msg.text });
                              setInputText(msg.text);
                              inputRef.current?.focus();
                              setActiveActionMsgId(null);
                            }}
                            className="p-1 rounded-full text-slate-500 hover:text-teal-600 hover:bg-slate-100 transition cursor-pointer"
                            title="বার্তা সম্পাদনা করুন"
                            aria-label="বার্তা সম্পাদনা করুন"
                          >
                            <Pencil size={11} />
                          </button>
                        )}
                        {(isMe || isAdmin) && onDeleteMessage && (
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteMessage(activeChannelId, msg.id);
                              setActiveActionMsgId(null);
                            }}
                            className="p-1 rounded-full text-slate-500 hover:text-red-500 hover:bg-slate-100 transition cursor-pointer"
                            title="বার্তা মুছে ফেলুন"
                            aria-label="বার্তা মুছে ফেলুন"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>

                      {/* Message Bubble */}
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveActionMsgId(showActions ? null : msg.id);
                        }}
                        className={`px-3.5 py-2 text-xs sm:text-[13px] leading-relaxed transition-all cursor-pointer select-text ${
                          isMe
                            ? `bg-gradient-to-br from-teal-700 via-teal-800 to-teal-900 text-white shadow-xs border border-teal-600/30 ${
                                isFirst && isLast
                                  ? 'rounded-2xl'
                                  : isFirst
                                    ? 'rounded-2xl rounded-br-sm'
                                    : isLast
                                      ? 'rounded-2xl rounded-tr-sm'
                                      : 'rounded-l-2xl rounded-r-sm'
                              }`
                            : `bg-white text-slate-800 border border-slate-200/90 shadow-2xs ${
                                isFirst && isLast
                                  ? 'rounded-2xl'
                                  : isFirst
                                    ? 'rounded-2xl rounded-bl-sm'
                                    : isLast
                                      ? 'rounded-2xl rounded-tl-sm'
                                      : 'rounded-r-2xl rounded-l-sm'
                              }`
                        }`}
                      >
                        {/* Text Content */}
                        <p className="break-words whitespace-pre-wrap">{msg.text}</p>

                        {/* Bubble Footer: Time & Micro Emoji Trigger */}
                        <div
                          className={`flex items-center gap-1.5 mt-1 text-[9px] font-mono leading-none select-none ${
                            isMe ? 'justify-end text-teal-200/90' : 'justify-end text-slate-400'
                          }`}
                        >
                          {msg.edited && (
                            <span className="italic font-sans text-[8px] opacity-80">(সম্পাদিত)</span>
                          )}
                          <span>{msg.time}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setReactionPickerMsgId(reactionPickerMsgId === msg.id ? null : msg.id);
                            }}
                            className={`p-0.5 rounded-full transition cursor-pointer ${
                              isMe
                                ? 'hover:text-amber-300 text-teal-200/70 hover:bg-teal-900/50'
                                : 'hover:text-amber-500 text-slate-400 hover:bg-slate-100'
                            }`}
                            title="ইমোজি রিঅ্যাকশন দিন"
                          >
                            <Smile size={10} />
                          </button>
                        </div>

                        {/* Dedicated Reactions Row (Anchored neatly at the bottom of the bubble) */}
                        {msg.activeReactions.length > 0 && (
                          <div
                            className={`flex flex-wrap items-center gap-1 mt-1.5 pt-1 border-t select-none ${
                              isMe ? 'border-teal-700/60' : 'border-slate-100'
                            }`}
                          >
                            {msg.activeReactions.map((emoji) => {
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
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onAddReaction(activeChannelId, msg.id, emoji);
                                  }}
                                  className={`px-1.5 py-0.5 rounded-md text-[10px] inline-flex items-center gap-1 transition-all cursor-pointer border ${
                                    isMe
                                      ? reactedByMe
                                        ? 'bg-amber-400 text-teal-950 border-amber-300 font-bold shadow-2xs'
                                        : 'bg-teal-900/70 text-teal-100 border-teal-600/60 hover:bg-teal-900'
                                      : reactedByMe
                                        ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold shadow-2xs'
                                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
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
                              className={`w-4 h-4 rounded-md text-[9px] transition cursor-pointer inline-flex items-center justify-center border ${
                                isMe
                                  ? 'text-teal-200 hover:text-white bg-teal-900/60 border-teal-600/50 hover:bg-teal-900'
                                  : 'text-slate-400 hover:text-slate-700 bg-slate-50 border-slate-200 hover:bg-slate-100'
                              }`}
                              title="আরো রিঅ্যাকশন যুক্ত করুন"
                            >
                              <Plus size={10} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* User Avatar for Outgoing Message: Show on last in cluster */}
                    {isMe && (
                      <div className="w-7 sm:w-8 shrink-0 flex flex-col justify-end">
                        {isLast ? (
                          <UserAvatar
                            photoUrl={currentUser?.photoURL || currentProfile?.customPhotoURL}
                            name={currentProfile?.displayName || currentUser?.displayName || 'আমি'}
                            size="w-7 h-7 sm:w-8 sm:h-8"
                            ring="ring-2 ring-teal-500"
                            fallbackEmoji={currentProfile?.avatarEmoji || '👑'}
                            textClass="text-[9px]"
                          />
                        ) : (
                          <div className="w-7 sm:w-8 h-7 sm:h-8" aria-hidden="true" />
                        )}
                      </div>
                    )}
                  </div>
                </React.Fragment>
              );
            });
          })()}
        </div>

        {/* Message Input & Quick Shortcuts (Seamlessly docked at the card's bottom - ZERO GAP!) */}
        <div className="shrink-0 bg-white border-t border-slate-200 p-2 sm:p-2.5">
          <div className="space-y-1.5">
            {/* Live Typing Indicator */}
            {typingUsers.length > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] text-teal-800 bg-teal-50/70 border border-teal-100 rounded-lg animate-in fade-in duration-150">
                <span className="flex items-center gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
                <span className="font-medium truncate">
                  {typingUsers.map((u) => u.name).join(', ')} টাইপ করছেন...
                </span>
              </div>
            )}

            {/* Editing Message Banner */}
            {editingMessage && (
              <div className="flex items-center justify-between gap-2 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 animate-in fade-in duration-150">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Pencil size={12} className="text-amber-600 shrink-0" />
                  <span className="font-bold text-[11px] shrink-0">বার্তা সম্পাদনা:</span>
                  <span className="truncate italic text-[11px] text-slate-600">"{editingMessage.text}"</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingMessage(null);
                    setInputText('');
                  }}
                  className="px-2 py-0.5 bg-white hover:bg-amber-100 text-amber-800 text-[10px] font-bold rounded-lg border border-amber-300 transition cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <X size={11} />
                  বাতিল
                </button>
              </div>
            )}

            {/* Quick Prompts Bar */}
            {showQuickPrompts && !editingMessage && (
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1 animate-in fade-in duration-150">
                <span className="text-[10px] text-slate-400 font-semibold shrink-0">দ্রুত বার্তা:</span>
                {QUICK_PROMPTS.map((shortcut, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setInputText(shortcut);
                      setShowQuickPrompts(false);
                      inputRef.current?.focus();
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
                disabled={Boolean(editingMessage)}
                onClick={() => setShowQuickPrompts(!showQuickPrompts)}
                className={`p-2 rounded-xl transition cursor-pointer shrink-0 border ${
                  showQuickPrompts
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-200 disabled:opacity-40'
                }`}
                title="দ্রুত বার্তা নির্বাচন করুন"
                aria-label="দ্রুত শর্টকাট বার্তা"
              >
                <Zap size={16} className={showQuickPrompts ? 'fill-amber-400' : ''} />
              </button>

              <input
                ref={inputRef}
                type="text"
                placeholder={
                  editingMessage
                    ? 'সম্পাদিত নতুন বার্তাটি লিখুন...'
                    : `#${activeChannel.name} চ্যানেলে বার্তা লিখুন...`
                }
                value={inputText}
                onChange={handleInputChange}
                className={`flex-1 px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border rounded-xl sm:rounded-2xl focus:outline-none text-slate-800 placeholder-slate-400 transition ${
                  editingMessage
                    ? 'border-amber-400 focus:border-amber-500 focus:bg-amber-50/20 ring-1 ring-amber-300/40'
                    : 'border-slate-200 focus:border-teal-600 focus:bg-white'
                }`}
              />

              <button
                type="submit"
                disabled={!inputText.trim()}
                className={`px-3.5 sm:px-4 py-2 disabled:opacity-40 font-bold text-xs sm:text-sm rounded-xl sm:rounded-2xl flex items-center gap-1.5 transition cursor-pointer shadow-sm shrink-0 active:scale-95 ${
                  editingMessage
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white'
                    : 'bg-gradient-to-r from-teal-700 to-teal-800 hover:from-teal-800 hover:to-teal-900 text-white'
                }`}
              >
                {editingMessage ? (
                  <>
                    <Check size={15} />
                    <span>আপডেট</span>
                  </>
                ) : (
                  <>
                    <Send size={15} />
                    <span className="hidden sm:inline">পাঠান</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
