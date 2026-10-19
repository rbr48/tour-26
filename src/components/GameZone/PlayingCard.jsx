import React from 'react';

const SUIT_SYMBOLS = {
  S: '♠',
  H: '♥',
  D: '♦',
  C: '♣',
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

const SUIT_COLORS = {
  S: 'text-slate-900 drop-shadow-[0_1px_1px_rgba(15,23,42,0.25)]',
  H: 'text-rose-600 drop-shadow-[0_1px_1px_rgba(225,29,72,0.25)]',
  D: 'text-rose-600 drop-shadow-[0_1px_1px_rgba(225,29,72,0.25)]',
  C: 'text-slate-900 drop-shadow-[0_1px_1px_rgba(15,23,42,0.25)]',
  spades: 'text-slate-900 drop-shadow-[0_1px_1px_rgba(15,23,42,0.25)]',
  hearts: 'text-rose-600 drop-shadow-[0_1px_1px_rgba(225,29,72,0.25)]',
  diamonds: 'text-rose-600 drop-shadow-[0_1px_1px_rgba(225,29,72,0.25)]',
  clubs: 'text-slate-900 drop-shadow-[0_1px_1px_rgba(15,23,42,0.25)]',
};

const SUIT_NAMES = {
  S: 'ইস্কাপন',
  H: 'হরতান',
  D: 'রুইতন',
  C: 'চিড়িতন',
};

export { SUIT_SYMBOLS, SUIT_NAMES };

export default function PlayingCard({
  card = null, // e.g. { rank: 'A', suit: 'S' } or 'AS' or string
  isFaceDown = false,
  size = 'md', // 'sm' | 'md' | 'lg'
  selected = false,
  disabled = false,
  onClick = null,
  className = '',
}) {
  // Normalize card structure
  let rank = '';
  let suit = '';

  if (card) {
    if (typeof card === 'string') {
      const trimmed = card.trim();
      suit = trimmed.slice(-1).toUpperCase();
      rank = trimmed.slice(0, -1).toUpperCase();
    } else if (typeof card === 'object') {
      rank = String(card.rank || '').toUpperCase();
      suit = String(card.suit || '').slice(0, 1).toUpperCase();
    }
  }

  const symbol = SUIT_SYMBOLS[suit] || suit;
  const colorClass = SUIT_COLORS[suit] || 'text-slate-900';
  const isRed = suit === 'H' || suit === 'D' || suit === 'hearts' || suit === 'diamonds';

  const sizeClasses = {
    sm: 'w-10 h-14 sm:w-11 sm:h-16 text-[10px] rounded-lg',
    md: 'w-13 h-19 sm:w-16 sm:h-24 text-xs sm:text-sm rounded-xl',
    lg: 'w-18 h-26 sm:w-22 sm:h-32 text-sm sm:text-base rounded-2xl',
  }[size] || 'w-14 h-20 text-xs rounded-xl';

  // Royal Court card indicator helper
  const isCourt = rank === 'J' || rank === 'Q' || rank === 'K' || rank === 'A';

  if (isFaceDown || !card) {
    return (
      <div
        onClick={!disabled && onClick ? onClick : undefined}
        className={`${sizeClasses} ${className} shrink-0 relative bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 border-2 border-amber-400/90 shadow-[0_6px_16px_rgba(0,0,0,0.45)] flex items-center justify-center select-none overflow-hidden transition-all duration-200 transform ${
          selected ? '-translate-y-3 ring-4 ring-amber-400 shadow-[0_12px_24px_rgba(245,158,11,0.5)]' : ''
        } ${onClick && !disabled ? 'cursor-pointer hover:scale-105 active:scale-95 hover:-translate-y-1' : ''}`}
      >
        {/* Ornate Gold Filigree Inner Border */}
        <div className="absolute inset-1 rounded border border-amber-400/50 flex items-center justify-center bg-[radial-gradient(#fbbf2418_1px,transparent_1px)] [background-size:6px_6px]">
          {/* Subtle geometric crosshatch inner frame */}
          <div className="w-[82%] h-[82%] rounded border border-amber-400/30 flex items-center justify-center">
            {/* Center Royal Medallion */}
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 border-amber-400 bg-gradient-to-br from-amber-500 via-amber-600 to-yellow-600 flex items-center justify-center shadow-lg transform rotate-45">
              <span className="transform -rotate-45 text-teal-950 font-black text-[10px] sm:text-xs">
                ♠
              </span>
            </div>
          </div>
        </div>

        {/* Specular Diagonal Sheen */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent" />
      </div>
    );
  }

  return (
    <div
      onClick={!disabled && onClick ? onClick : undefined}
      className={`${sizeClasses} ${className} shrink-0 relative bg-gradient-to-b from-white via-slate-50 to-amber-50/25 border border-slate-300 shadow-[0_6px_16px_rgba(0,0,0,0.35),0_1px_3px_rgba(0,0,0,0.1)] flex flex-col justify-between p-1 sm:p-1.5 select-none transition-all duration-200 transform font-bold font-mono overflow-hidden ${
        selected
          ? '-translate-y-3 ring-4 ring-amber-400 shadow-[0_12px_24px_rgba(245,158,11,0.5)] border-amber-400 scale-105'
          : ''
      } ${
        onClick && !disabled
          ? 'cursor-pointer hover:scale-105 active:scale-95 hover:-translate-y-1'
          : ''
      } ${disabled ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}
    >
      {/* Specular Top Glass Sheen */}
      <div className="pointer-events-none absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/60 to-transparent rounded-t-xl" />

      {/* Top Left Corner */}
      <div className={`relative z-10 flex flex-col items-center leading-none ${colorClass}`}>
        <span className="font-black text-xs sm:text-sm tracking-tight">{rank}</span>
        <span className="text-[10px] sm:text-xs">{symbol}</span>
      </div>

      {/* Center Art / Big Symbol with Court Emblem */}
      <div className={`absolute inset-0 flex flex-col items-center justify-center ${colorClass} pointer-events-none`}>
        {isCourt && size !== 'sm' && (
          <span className="text-[9px] font-black tracking-widest uppercase opacity-20 mb-0.5">
            {rank === 'A' ? 'ACE' : rank === 'K' ? 'KING' : rank === 'Q' ? 'QUEEN' : 'JACK'}
          </span>
        )}
        <span
          className={`${
            size === 'sm'
              ? 'text-xl'
              : size === 'lg'
              ? 'text-4xl'
              : 'text-2xl sm:text-3xl'
          } filter drop-shadow-sm transition-transform`}
        >
          {symbol}
        </span>
      </div>

      {/* Bottom Right Corner (Inverted) */}
      <div className={`relative z-10 flex flex-col items-center leading-none rotate-180 self-end ${colorClass}`}>
        <span className="font-black text-xs sm:text-sm tracking-tight">{rank}</span>
        <span className="text-[10px] sm:text-xs">{symbol}</span>
      </div>
    </div>
  );
}
