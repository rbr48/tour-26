import React, { useState, useEffect } from 'react';
import { Timer } from 'lucide-react';

const toBnNum = (n) => String(n ?? 0).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);

export default function GameTurnTimer({
  isMyTurn = false,
  turnKey = '', // Changes whenever turn advances
  duration = 30,
  onTimeout = null,
  className = '',
}) {
  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    setTimeLeft(duration);
  }, [turnKey, duration]);

  useEffect(() => {
    if (!isMyTurn) return;

    if (timeLeft <= 0) {
      if (typeof onTimeout === 'function') {
        onTimeout();
      }
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [isMyTurn, timeLeft, onTimeout]);

  if (!isMyTurn) return null;

  const isLow = timeLeft <= 8;

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-bold transition-colors ${
        isLow
          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
      } ${className}`}
      title="চাল দেওয়ার সময়"
    >
      <Timer size={12} className={isLow ? 'text-rose-400 animate-spin' : 'text-amber-400'} />
      <span>{toBnNum(timeLeft)} সে.</span>
    </div>
  );
}
