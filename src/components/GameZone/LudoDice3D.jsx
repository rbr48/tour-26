import React from 'react';

/**
 * High-Definition 3D Ludo Dice
 * Features authentic pip arrangements, specular highlights, and rolling physics animation.
 */
export default function LudoDice3D({
  value = 6,
  isRolling = false,
  isMyTurn = false,
  disabled = false,
  onClick = null,
  size = 'md', // 'sm' | 'md' | 'lg'
}) {
  const sizeMap = {
    sm: 'w-10 h-10 rounded-xl text-xs',
    md: 'w-13 h-13 sm:w-14 sm:h-14 rounded-2xl text-sm',
    lg: 'w-16 h-16 sm:w-20 sm:h-20 rounded-3xl text-base',
  };

  const pipSize = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5 sm:w-3 sm:h-3',
    lg: 'w-3.5 h-3.5 sm:w-4 sm:h-4',
  }[size] || 'w-2.5 h-2.5';

  const dotClass = (isCenter = false) =>
    `${pipSize} rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)] ${
      value === 1 || (value === 6 && isCenter) ? 'bg-rose-600' : 'bg-slate-900'
    }`;

  // Authentic Pip layouts for dice faces 1 to 6
  const renderPips = () => {
    switch (value) {
      case 1:
        return (
          <div className="w-full h-full flex items-center justify-center">
            <div className={`${pipSize} w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-rose-600 shadow-[inset_0_1px_3px_rgba(0,0,0,0.7)] animate-pulse`} />
          </div>
        );
      case 2:
        return (
          <div className="w-full h-full flex justify-between p-1.5 sm:p-2">
            <div className={`${dotClass()} self-start`} />
            <div className={`${dotClass()} self-end`} />
          </div>
        );
      case 3:
        return (
          <div className="w-full h-full flex justify-between p-1.5 sm:p-2">
            <div className={`${dotClass()} self-start`} />
            <div className={`${dotClass()} self-center`} />
            <div className={`${dotClass()} self-end`} />
          </div>
        );
      case 4:
        return (
          <div className="w-full h-full grid grid-cols-2 grid-rows-2 p-1.5 sm:p-2 gap-1 place-items-center">
            <div className={dotClass()} />
            <div className={dotClass()} />
            <div className={dotClass()} />
            <div className={dotClass()} />
          </div>
        );
      case 5:
        return (
          <div className="w-full h-full relative p-1.5 sm:p-2">
            <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-1 place-items-center">
              <div className={dotClass()} />
              <div className={dotClass()} />
              <div className={dotClass()} />
              <div className={dotClass()} />
            </div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className={dotClass(true)} />
            </div>
          </div>
        );
      case 6:
      default:
        return (
          <div className="w-full h-full grid grid-cols-2 grid-rows-3 p-1.5 sm:p-2 gap-0.5 sm:gap-1 place-items-center">
            <div className={dotClass()} />
            <div className={dotClass()} />
            <div className={dotClass()} />
            <div className={dotClass()} />
            <div className={dotClass()} />
            <div className={dotClass()} />
          </div>
        );
    }
  };

  return (
    <div
      onClick={!disabled && onClick ? onClick : undefined}
      className={`relative select-none transition-all duration-200 transform ${
        sizeMap[size] || sizeMap.md
      } ${
        isMyTurn && !isRolling && !disabled
          ? 'cursor-pointer hover:scale-110 active:scale-95 ring-4 ring-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.8)]'
          : 'shadow-[0_8px_20px_rgba(0,0,0,0.5)]'
      } ${isRolling ? 'animate-spin scale-110' : ''}`}
      style={{
        perspective: '600px',
        animationDuration: isRolling ? '0.4s' : undefined,
      }}
    >
      {/* 3D Dice Body with Ivory Gradient and Beveled Frame */}
      <div className="w-full h-full rounded-2xl bg-gradient-to-br from-white via-slate-100 to-amber-50/80 border-2 border-slate-300/80 shadow-[inset_0_2px_4px_rgba(255,255,255,1),inset_0_-3px_6px_rgba(0,0,0,0.15)] flex items-center justify-center relative overflow-hidden">
        {/* Specular Diagonal Reflection */}
        <div className="pointer-events-none absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/70 to-transparent rounded-t-xl" />

        {/* Pips */}
        <div className="relative z-10 w-full h-full">
          {renderPips()}
        </div>
      </div>
    </div>
  );
}
