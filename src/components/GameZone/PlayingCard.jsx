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
  S: 'text-slate-900',
  H: 'text-rose-600',
  D: 'text-rose-600',
  C: 'text-slate-900',
  spades: 'text-slate-900',
  hearts: 'text-rose-600',
  diamonds: 'text-rose-600',
  clubs: 'text-slate-900',
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
  const colorClass = SUIT_COLORS[suit] || 'text-slate-800';

  const sizeClasses = {
    sm: 'w-10 h-14 sm:w-11 sm:h-16 text-[10px] rounded-lg',
    md: 'w-13 h-18 sm:w-16 sm:h-23 text-xs sm:text-sm rounded-xl',
    lg: 'w-18 h-26 sm:w-22 sm:h-32 text-sm sm:text-base rounded-2xl',
  }[size] || 'w-14 h-20 text-xs rounded-xl';

  if (isFaceDown || !card) {
    return (
      <div
        onClick={!disabled && onClick ? onClick : undefined}
        className={`${sizeClasses} ${className} shrink-0 relative bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-950 border-2 border-amber-400/80 shadow-md flex items-center justify-center select-none overflow-hidden transition-all transform ${
          selected ? '-translate-y-2 ring-2 ring-amber-400' : ''
        } ${onClick && !disabled ? 'cursor-pointer hover:scale-105 active:scale-95' : ''}`}
      >
        {/* Intricate card back pattern */}
        <div className="absolute inset-1 border border-indigo-400/40 rounded-lg flex items-center justify-center bg-[radial-gradient(#ffffff15_1px,transparent_1px)] [background-size:6px_6px]">
          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-amber-400/60 flex items-center justify-center text-amber-300 font-bold text-[9px] sm:text-[11px] bg-indigo-950/80 shadow-xs">
            ♠
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={!disabled && onClick ? onClick : undefined}
      className={`${sizeClasses} ${className} shrink-0 relative bg-white border border-slate-300 shadow-md flex flex-col justify-between p-1 sm:p-1.5 select-none transition-all transform font-bold font-mono ${
        selected ? '-translate-y-2.5 ring-2 ring-teal-500 shadow-lg border-teal-500' : ''
      } ${
        onClick && !disabled ? 'cursor-pointer hover:scale-105 active:scale-95' : ''
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {/* Top Left Corner */}
      <div className={`flex flex-col items-center leading-none ${colorClass}`}>
        <span className="font-extrabold">{rank}</span>
        <span className="text-[10px] sm:text-xs">{symbol}</span>
      </div>

      {/* Center Big Symbol */}
      <div className={`absolute inset-0 flex items-center justify-center ${colorClass} opacity-90 pointer-events-none`}>
        <span className={size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-3xl' : 'text-xl sm:text-2xl'}>
          {symbol}
        </span>
      </div>

      {/* Bottom Right Corner (Inverted) */}
      <div className={`flex flex-col items-center leading-none rotate-180 self-end ${colorClass}`}>
        <span className="font-extrabold">{rank}</span>
        <span className="text-[10px] sm:text-xs">{symbol}</span>
      </div>
    </div>
  );
}
