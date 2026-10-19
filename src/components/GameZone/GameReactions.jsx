import React, { useState, useEffect } from 'react';
import { updateGameRoom } from '../../services/tourStore';
import { triggerHaptic } from '../../utils/haptics';
import { gameAudio } from '../../utils/gameAudio';
import { MessageSquarePlus, Smile, X } from 'lucide-react';

export const GAME_EMOJIS = ['😂', '🔥', '👏', '😱', '🎲', '🏆'];

export const GAME_BANTER = [
  'দারুণ চাল! 👌',
  'ছক্কা মারলাম! 🎲',
  'এবার কোথায় যাবি? 😈',
  'খেলার বাঘ এসে গেছে! 🐯',
  'একটু দেখে খেলেন! 🧐',
  'হেরে গেলি তো! 🤣',
];

export default function GameReactions({
  room,
  currentUser,
  currentProfile,
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [floatingReaction, setFloatingReaction] = useState(null);

  const myEmail = (currentUser?.email || '').toLowerCase();
  const myName = currentProfile?.displayName || currentUser?.displayName || 'খেলোয়াড়';

  // Listen to incoming lastReaction from room state
  useEffect(() => {
    const rx = room?.state?.lastReaction;
    if (!rx || !rx.id) return;

    // Show floating animation
    setFloatingReaction(rx);
    if (rx.senderEmail !== myEmail) {
      gameAudio.playTurn();
      triggerHaptic('light');
    }

    const timer = setTimeout(() => {
      setFloatingReaction(null);
    }, 2800);

    return () => clearTimeout(timer);
  }, [room?.state?.lastReaction?.id]);

  const handleSendReaction = (emoji, text = '') => {
    if (!room?.id) return;
    triggerHaptic('medium');
    setIsOpen(false);

    const payload = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      emoji,
      text,
      senderName: myName,
      senderEmail: myEmail,
    };

    updateGameRoom(room.id, {
      state: {
        ...(room.state || {}),
        lastReaction: payload,
      },
    });
  };

  return (
    <>
      {/* Floating Reaction Overlay Animation */}
      {floatingReaction && (
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 z-40 pointer-events-none flex flex-col items-center animate-in fade-in zoom-in-75 slide-out-to-top-12 duration-500">
          <div className="bg-slate-900/90 backdrop-blur-md border border-white/20 text-white px-3.5 py-1.5 rounded-full shadow-2xl flex items-center gap-2">
            <span className="text-2xl animate-bounce">{floatingReaction.emoji}</span>
            <div className="flex flex-col">
              <span className="text-[10px] text-amber-300 font-bold">
                {floatingReaction.senderName}
              </span>
              {floatingReaction.text && (
                <span className="text-xs font-black text-white">
                  {floatingReaction.text}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Trigger Button */}
      <div className={`relative ${className}`}>
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setIsOpen((prev) => !prev);
          }}
          className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-amber-300 border border-slate-700 shadow-md transition flex items-center gap-1 cursor-pointer"
          title="ইমোজি ও আড্ডা দিন"
        >
          <Smile size={16} />
          <span className="text-[10px] font-bold hidden sm:inline">রিঅ্যাকশন</span>
        </button>

        {/* Reaction Popover */}
        {isOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-full right-0 mb-2 w-64 bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-700 shadow-2xl p-2.5 z-50 animate-in zoom-in-95 duration-150 space-y-2 text-white"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <span className="text-[11px] font-bold text-slate-300">
                লাইভ রিঅ্যাকশন ও ডায়ালগ
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-0.5"
              >
                <X size={14} />
              </button>
            </div>

            {/* Quick Emojis */}
            <div className="grid grid-cols-6 gap-1">
              {GAME_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleSendReaction(emoji)}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-lg active:scale-90 transition cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Quick Banter Texts */}
            <div className="space-y-1 pt-1 border-t border-slate-800/60 max-h-36 overflow-y-auto pr-0.5 scrollbar-thin">
              {GAME_BANTER.map((banter) => (
                <button
                  key={banter}
                  type="button"
                  onClick={() => handleSendReaction('💬', banter)}
                  className="w-full text-left px-2 py-1 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 text-[11px] text-slate-200 font-medium transition cursor-pointer truncate active:scale-98"
                >
                  {banter}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
