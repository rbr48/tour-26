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

    setFloatingReaction(payload);

    updateGameRoom(room.id, {
      state: {
        ...(room.state || {}),
        lastReaction: payload,
      },
    });
  };

  return (
    <>
      {/* Floating Reaction Overlay Animation - fixed top-24 left-1/2 z-[100] so it's never clipped */}
      {floatingReaction && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] pointer-events-none flex flex-col items-center animate-in fade-in zoom-in-90 duration-300">
          <div className="bg-slate-900/95 backdrop-blur-md border-2 border-amber-400/60 text-white px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce">
            <span className="text-3xl filter drop-shadow">{floatingReaction.emoji}</span>
            <div className="flex flex-col text-left">
              <span className="text-[11px] text-amber-300 font-extrabold tracking-wide">
                {floatingReaction.senderName}
              </span>
              {floatingReaction.text && (
                <span className="text-xs font-bold text-white leading-snug">
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

        {/* Backdrop for tapping outside */}
        {isOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setIsOpen(false)}
          />
        )}

        {/* Reaction Popover - drops down below the top bar (top-full mt-2) */}
        {isOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute top-full right-0 mt-2 w-72 max-w-[calc(100vw-24px)] bg-slate-900/98 backdrop-blur-md rounded-2xl border border-slate-700 shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-2.5 text-white"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <span className="text-[11px] font-bold text-slate-300">
                লাইভ রিঅ্যাকশন ও ডায়ালগ
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Quick Emojis */}
            <div className="grid grid-cols-6 gap-1.5">
              {GAME_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleSendReaction(emoji)}
                  className="w-9 h-9 rounded-xl bg-slate-800/90 hover:bg-slate-700 hover:scale-110 flex items-center justify-center text-xl active:scale-95 transition cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Quick Banter Texts */}
            <div className="space-y-1 pt-1.5 border-t border-slate-800/80 max-h-40 overflow-y-auto pr-0.5 scrollbar-thin">
              {GAME_BANTER.map((banter) => (
                <button
                  key={banter}
                  type="button"
                  onClick={() => handleSendReaction('💬', banter)}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg bg-slate-800/70 hover:bg-slate-700 text-xs text-slate-200 font-medium transition cursor-pointer truncate active:scale-98"
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
