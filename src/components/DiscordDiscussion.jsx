import React, { useState, useEffect, useRef } from 'react';
import { newId, setTypingStatus, subscribeTyping } from '../services/tourStore';
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
                      {msg.edited && (
                        <span className="text-[8px] text-slate-400 italic font-medium">(সম্পাদিত)</span>
                      )}
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
                        className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-2xl text-xs sm:text-[13px] leading-relaxed text-left inline-flex flex-wrap items-center gap-1.5 shadow-2xs max-w-full ${
                          isMe
                            ? 'bg-gradient-to-r from-teal-700 to-teal-800 text-white rounded-tr-xs'
                            : 'bg-white text-slate-800 rounded-tl-xs border border-slate-200/90'
                        }`}
                      >
                        <span className="break-words">{msg.text}</span>

                        {/* Active Reactions Inline at the Bottom Right of the Message */}
                        {activeReactions.length > 0 && (
                          <span className={`inline-flex items-center gap-1 ${isMe ? 'ml-auto' : ''}`}>
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
                                  className={`px-1.5 py-0.2 rounded-md text-[10px] inline-flex items-center gap-0.5 transition cursor-pointer select-none border ${
                                    isMe
                                      ? reactedByMe
                                        ? 'bg-amber-400 text-teal-950 border-amber-300 font-bold shadow-2xs'
                                        : 'bg-teal-900/80 text-teal-100 border-teal-600/70'
                                      : reactedByMe
                                        ? 'bg-amber-100 text-amber-900 border-amber-400 font-bold shadow-2xs'
                                        : 'bg-slate-100 text-slate-700 border-slate-200'
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
                          </span>
                        )}
                      </div>

                      {/* Action buttons (Emoji, Edit, Delete) */}
                      <div className={`flex items-center gap-0.5 ${isMe ? 'flex-row-reverse' : ''} opacity-70 sm:opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition shrink-0`}>
                        {/* Quick Reaction Trigger Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setReactionPickerMsgId(reactionPickerMsgId === msg.id ? null : msg.id);
                          }}
                          className="p-1 rounded-full text-slate-400 hover:text-amber-500 hover:bg-slate-100 transition cursor-pointer"
                          title="ইমোজি রিঅ্যাকশন দিন"
                          aria-label="ইমোজি রিঅ্যাকশন দিন"
                        >
                          <Smile size={13} />
                        </button>

                        {/* Edit Button (Author or Admin) */}
                        {(isMe || isAdmin) && onEditMessage && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingMessage({ id: msg.id, text: msg.text });
                              setInputText(msg.text);
                              inputRef.current?.focus();
                            }}
                            className="p-1 rounded-full text-slate-400 hover:text-teal-600 hover:bg-slate-100 transition cursor-pointer"
                            title="বার্তা সংশোধন করুন"
                            aria-label="বার্তা সংশোধন করুন"
                          >
                            <Pencil size={12} />
                          </button>
                        )}

                        {/* Delete Button (Author or Admin) */}
                        {(isMe || isAdmin) && onDeleteMessage && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteMessage(activeChannelId, msg.id);
                            }}
                            className="p-1 rounded-full text-slate-400 hover:text-red-500 hover:bg-slate-100 transition cursor-pointer"
                            title="বার্তা মুছে ফেলুন"
                            aria-label="বার্তা মুছে ফেলুন"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
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
