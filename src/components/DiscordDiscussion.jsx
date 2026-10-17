import React, { useState, useEffect, useRef } from 'react';
import { newId } from '../services/tourStore';
import { Hash, MessageSquare, Send, Users, ShieldAlert, Utensils, Compass } from 'lucide-react';

const CHANNELS = [
  {
    id: 'general',
    name: 'সাধারণ-আড্ডা',
    icon: MessageSquare,
    desc: 'ট্যুর সম্পর্কিত মুক্ত আড্ডা, কুশল বিনিময় ও আপডেট',
    badge: 'আড্ডা'
  },
  {
    id: 'sightseeing',
    name: 'দর্শনীয়-স্থান-ও-প্ল্যান',
    icon: Compass,
    desc: 'প্রতিদিনের স্পট ভিজিট, দর্শনীয় স্থান ও আলোচনা',
    badge: 'দর্শনীয় স্থান'
  },
  {
    id: 'food',
    name: 'খাবার-দাবার-রেস্টুরেন্ট',
    icon: Utensils,
    desc: 'সি-ফুড, বারবিকিউ, রূপচাঁদা ও রেস্টুরেন্ট পছন্দ',
    badge: 'খাবার'
  },
  {
    id: 'emergency',
    name: 'জরুরি-হেল্প-ও-লোকেশন',
    icon: ShieldAlert,
    desc: 'মিটিং পয়েন্ট, লস্ট অ্যান্ড ফাউন্ড ও তাৎক্ষণিক সহায়তা',
    badge: 'জরুরি'
  }
];

const EMOJI_REACTIONS = ['👍', '❤️', '🔥', '🏖️', '🍤', '🚌'];

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
      return stored || 'general';
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

  const messagesEndRef = useRef(null);

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

  const activeChannel = CHANNELS.find(c => c.id === activeChannelId) || CHANNELS[0];
  const channelMessages = discussions[activeChannelId] || [];

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [channelMessages.length, activeChannelId]);

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
      authorPhoto: currentUser?.photoURL || null,
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
  };

  return (
    <div className="bg-slate-900 text-white rounded-3xl shadow-xl overflow-hidden border border-slate-800 flex flex-col md:flex-row h-[78vh] min-h-[550px]">
      {/* Channels Sidebar */}
      <div className="w-full md:w-64 bg-slate-950 p-4 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col justify-between shrink-0">
        <div>
          {/* Header */}
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              DC
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white leading-tight">ফ্যামিলি ডিসকর্ড</h3>
              <p className="text-[10px] text-indigo-400">রংপুর ➔ কক্সবাজার ২০২৬</p>
            </div>
          </div>

          {/* Channel List */}
          <div className="mt-4 space-y-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 mb-1.5">
              চ্যাট চ্যানেলসমূহ
            </p>
            {CHANNELS.map(ch => {
              const Icon = ch.icon;
              const isActive = activeChannelId === ch.id;
              const count = (discussions[ch.id] || []).length;

              return (
                <button
                  key={ch.id}
                  onClick={() => setActiveChannelId(ch.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <Icon size={14} className={isActive ? 'text-amber-300' : 'text-slate-500'} />
                    <span className="truncate">{ch.name}</span>
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-indigo-800 text-amber-200' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Current User Pill in Discord Sidebar */}
        <div className="pt-3 border-t border-slate-800/80 mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg">{currentProfile?.avatarEmoji || '👑'}</span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">
                {currentProfile?.displayName || currentUser?.displayName || 'সদস্য'}
              </p>
              <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> অনলাইনে আছেন
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col justify-between bg-slate-900/90 overflow-hidden">
        {/* Chat Header */}
        <div className="p-3.5 px-4 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Hash size={18} className="text-indigo-400" />
            <div className="min-w-0">
              <h4 className="font-bold text-sm text-white truncate">{activeChannel.name}</h4>
              <p className="text-[10px] text-slate-400 truncate">{activeChannel.desc}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Users size={14} className="text-teal-400" />
            <span className="hidden sm:inline font-medium">{members.length} জন ফ্যামিলি মেম্বার</span>
          </div>
        </div>

        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {channelMessages.length > 0 ? (
            channelMessages.map(msg => {
              const myEmail = currentUser?.email?.toLowerCase();
              const isMe = (msg.senderEmail ?? msg.authorEmail) === myEmail || (!msg.senderEmail && !msg.authorEmail && msg.author === currentUser?.displayName);

              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 group transition ${
                    isMe ? 'flex-row-reverse' : ''
                  }`}
                >
                  {/* User Avatar */}
                  <div className="w-9 h-9 rounded-2xl bg-indigo-950 text-amber-300 border border-indigo-700/50 flex items-center justify-center font-bold text-base shrink-0">
                    {msg.authorEmoji || '👑'}
                  </div>

                  {/* Message Bubble Container */}
                  <div className={`max-w-[78%] space-y-1 ${isMe ? 'items-end text-right' : ''}`}>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="font-bold text-slate-200">{msg.author}</span>
                      {msg.authorRole && (
                        <span className="text-[9px] bg-indigo-900/80 text-indigo-300 px-1.5 py-0.2 rounded border border-indigo-700/40">
                          {msg.authorRole}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-500">{msg.time}</span>
                    </div>

                    <div className={`p-3 rounded-2xl text-xs leading-relaxed text-left inline-block ${
                      isMe
                        ? 'bg-indigo-600 text-white rounded-tr-xs'
                        : 'bg-slate-800 text-slate-100 rounded-tl-xs border border-slate-700/60'
                    }`}>
                      {msg.text}
                    </div>

                    {/* Emoji Reactions Bar */}
                    <div className="flex items-center gap-1 pt-0.5">
                      {EMOJI_REACTIONS.map(emoji => {
                        // One vote per person: the list holds the emails that reacted.
                        const voters = Array.isArray(msg.reactions?.[emoji]) ? msg.reactions[emoji] : [];
                        const count = voters.length;
                        const reactedByMe = Boolean(myEmail) && voters.includes(myEmail);
                        return (
                          <button
                            key={emoji}
                            type="button"
                            aria-pressed={reactedByMe}
                            onClick={() => onAddReaction(activeChannelId, msg.id, emoji)}
                            className={`px-1.5 py-0.5 rounded-lg text-[10px] flex items-center gap-0.5 transition cursor-pointer ${
                              reactedByMe
                                ? 'bg-indigo-900 text-amber-300 border border-amber-400'
                                : count > 0
                                  ? 'bg-indigo-950/80 text-amber-300 border border-indigo-700'
                                  : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 border border-transparent'
                            }`}
                          >
                            <span>{emoji}</span>
                            {count > 0 && <span className="font-bold">{count}</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-indigo-950 text-indigo-400 flex items-center justify-center text-xl">
                💬
              </div>
              <h4 className="font-bold text-sm text-slate-300">চ্যানেল #{activeChannel.name}-এ স্বাগতম!</h4>
              <p className="text-xs text-slate-500 max-w-xs">
                এই চ্যানেলে এখনো কোনো বার্তা নেই। ট্যুরের পরিবারের সবার সাথে প্রথম কথা শুরু করুন!
              </p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input Box */}
        <div className="p-3 bg-slate-950/80 border-t border-slate-800 space-y-2">
          {/* Quick Reaction Pill Shortcuts */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1">
            <span className="text-[10px] text-slate-500">দ্রুত বার্তা:</span>
            {[
              'সবাই কি রেডি? 🏖️',
              'আমরা এখন লবিতে আছি 📍',
              'লাঞ্চ করতে যাচ্ছি 🍤',
              'ছবিগুলো দারুণ হয়েছে! 📸',
              'বাস ছাড়তে কতক্ষণ? 🚌'
            ].map((shortcut, idx) => (
              <button
                key={idx}
                onClick={() => setInputText(shortcut)}
                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] rounded-lg shrink-0 border border-slate-700/50 transition cursor-pointer"
              >
                {shortcut}
              </button>
            ))}
          </div>

          <form onSubmit={handleSend} className="flex items-center gap-2">
            <input
              type="text"
              placeholder={`#${activeChannel.name} চ্যানেলে বার্তা পাঠান...`}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              className="flex-1 px-4 py-2.5 text-xs bg-slate-900 border border-slate-700 rounded-2xl focus:outline-none focus:border-indigo-500 text-white placeholder-slate-500"
            />
            <button
              type="submit"
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-2xl flex items-center gap-1.5 transition cursor-pointer shadow-md"
            >
              <Send size={14} />
              <span className="hidden sm:inline">পাঠান</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
