import React from 'react';

/**
 * Realistic 3D Jewel-toned Ludo Pawn
 * Features radial specular lighting, beveled pedestal base, and golden selection halo.
 */
export default function LudoPawn3D({
  colorIndex = 0, // 0: Red, 1: Green, 2: Yellow, 3: Blue
  tokenNumber = 1,
  isMovable = false,
  onClick = null,
  size = 'md', // 'sm' | 'md'
}) {
  const COLOR_THEMES = [
    {
      // 0: Red
      bodyGrad: 'from-rose-400 via-rose-600 to-red-950',
      headGrad: 'from-rose-300 via-red-500 to-rose-800',
      glow: 'shadow-[0_4px_12px_rgba(225,29,72,0.6)]',
      border: 'border-rose-200/90',
      ring: 'ring-rose-400',
    },
    {
      // 1: Green
      bodyGrad: 'from-emerald-300 via-emerald-600 to-emerald-950',
      headGrad: 'from-emerald-200 via-emerald-500 to-teal-800',
      glow: 'shadow-[0_4px_12px_rgba(16,185,129,0.6)]',
      border: 'border-emerald-200/90',
      ring: 'ring-emerald-400',
    },
    {
      // 2: Yellow
      bodyGrad: 'from-amber-200 via-amber-500 to-amber-900',
      headGrad: 'from-yellow-200 via-amber-400 to-amber-700',
      glow: 'shadow-[0_4px_12px_rgba(245,158,11,0.6)]',
      border: 'border-amber-100',
      ring: 'ring-amber-400',
    },
    {
      // 3: Blue
      bodyGrad: 'from-sky-300 via-sky-600 to-blue-950',
      headGrad: 'from-sky-200 via-blue-500 to-indigo-800',
      glow: 'shadow-[0_4px_12px_rgba(14,165,233,0.6)]',
      border: 'border-sky-200/90',
      ring: 'ring-sky-400',
    },
  ];

  const theme = COLOR_THEMES[colorIndex] || COLOR_THEMES[0];

  return (
    <div
      onClick={isMovable && onClick ? onClick : undefined}
      className={`relative flex flex-col items-center justify-center transition-all duration-200 select-none ${
        isMovable
          ? 'cursor-pointer hover:scale-125 animate-bounce z-30'
          : 'z-20'
      }`}
    >
      {/* 3D Pawn Container */}
      <div
        className={`relative flex flex-col items-center justify-center rounded-full ${
          size === 'sm' ? 'w-5 h-5 sm:w-6 sm:h-6' : 'w-6 h-6 sm:w-7 sm:h-7'
        } ${theme.glow} ${
          isMovable
            ? 'ring-4 ring-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.9)] scale-110'
            : ''
        }`}
      >
        {/* Specular 3D Dome Body */}
        <div
          className={`w-full h-full rounded-full bg-gradient-to-br ${theme.bodyGrad} border-2 ${theme.border} shadow-[inset_0_2px_4px_rgba(255,255,255,0.7),inset_0_-2px_4px_rgba(0,0,0,0.6)] flex items-center justify-center relative overflow-hidden`}
        >
          {/* Specular White Highlight Dot */}
          <div className="absolute top-0.5 left-1 w-1.5 h-1.5 rounded-full bg-white/80 filter blur-[0.3px]" />

          {/* Central Token Number */}
          <span className="relative z-10 text-[9px] sm:text-[10px] font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] leading-none">
            {tokenNumber}
          </span>
        </div>
      </div>
    </div>
  );
}
