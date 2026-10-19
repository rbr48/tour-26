import React, { useState, useEffect } from 'react';
import {
  PLAYER_COLORS,
  initializeLudoTokens,
  canMoveToken,
  getMovableTokens,
  executeTokenMove,
  hasPlayerWon,
  rollDice,
  getTokenBoardPosition,
  SAFE_SQUARES,
  getGlobalTrackIndex,
} from './ludoLogic';
import { updateGameRoom } from '../../services/tourStore';
import { gameAudio } from '../../utils/gameAudio';
import { triggerHaptic } from '../../utils/haptics';
import GameReactions from './GameReactions';
import GameTurnTimer from './GameTurnTimer';
import UserAvatar from '../UserAvatar';
import {
  Crown,
  Dices,
  LogOut,
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';

const toBnNum = (n) => String(n ?? 0).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);

// 15x15 grid generation helper
const GRID_SIZE = 15;

export default function LudoGame({
  room,
  currentUser,
  currentProfile,
  onLeave,
}) {
  const [isRolling, setIsRolling] = useState(false);
  const myEmail = (currentUser?.email || '').toLowerCase();
  const myName = currentProfile?.displayName || currentUser?.displayName || 'খেলোয়াড়';

  const myIndex = (room.players || []).findIndex(
    (p) => (p.email || '').toLowerCase() === myEmail
  );
  const myPlayer = myIndex !== -1 ? room.players[myIndex] : null;
  const isHost = (room.hostEmail || '').toLowerCase() === myEmail;

  const gameState = room.state || {};
  const currentTurn = gameState.turnIndex ?? 0;
  const isMyTurn = room.status === 'playing' && currentTurn === myIndex;
  const diceValue = gameState.diceValue || 6;
  const hasRolled = gameState.hasRolled || false;
  const tokens = gameState.tokens || initializeLudoTokens(room.players?.length || 4);

  const [isMuted, setIsMuted] = useState(gameAudio.getMuted());

  // Sound cue on my turn
  useEffect(() => {
    if (isMyTurn) {
      gameAudio.playTurn();
      triggerHaptic('light');
    }
  }, [isMyTurn]);

  // Start Ludo Game (Host only)
  const handleStartGame = () => {
    const playerCount = Math.max(2, Math.min(4, (room.players || []).length));
    const initTokens = initializeLudoTokens(playerCount);

    gameAudio.playDice();
    triggerHaptic('medium');
    updateGameRoom(room.id, {
      status: 'playing',
      state: {
        turnIndex: 0,
        diceValue: 6,
        hasRolled: false,
        consecutiveSixes: 0,
        tokens: initTokens,
        winners: [],
        lastAction: `লুডো খেলা শুরু হয়েছে! ${room.players[0]?.name || 'লাল'}-এর চাল।`,
      },
    });
  };

  // Roll Dice Action
  const handleRollDice = () => {
    if (!isMyTurn || hasRolled || isRolling) return;

    gameAudio.playDice();
    triggerHaptic('medium');
    setIsRolling(true);
    setTimeout(() => {
      const roll = rollDice();
      setIsRolling(false);

      const prevSixes = gameState.consecutiveSixes || 0;
      const newSixes = roll === 6 ? prevSixes + 1 : 0;

      // Rule: 3 consecutive sixes forfeits the turn!
      if (newSixes >= 3) {
        const nextTurn = (currentTurn + 1) % (room.players?.length || 4);
        triggerHaptic('heavy');
        updateGameRoom(room.id, {
          state: {
            ...gameState,
            diceValue: 6,
            hasRolled: false,
            consecutiveSixes: 0,
            turnIndex: nextTurn,
            lastAction: `⚠️ ${myName} পরপর ৩টি ছক্কা পেয়েছেন! নিয়ম অনুযায়ী চাল বাতিল। এখন ${room.players[nextTurn]?.name}-এর চাল।`,
          },
        });
        return;
      }

      const myTokens = tokens[myIndex] || [-1, -1, -1, -1];
      const movable = getMovableTokens(myIndex, myTokens, roll);

      // If no tokens can move, pass turn to next player
      if (movable.length === 0) {
        const nextTurn = (currentTurn + 1) % (room.players?.length || 4);
        updateGameRoom(room.id, {
          state: {
            ...gameState,
            diceValue: roll,
            hasRolled: false,
            consecutiveSixes: 0,
            turnIndex: nextTurn,
            lastAction: `${myName} ${toBnNum(roll)} রোল করেছেন (কোনো গুটি চালার সুযোগ নেই)। এখন ${room.players[nextTurn]?.name}-এর চাল।`,
          },
        });
        return;
      }

      // If tokens can move, wait for player to tap token
      updateGameRoom(room.id, {
        state: {
          ...gameState,
          diceValue: roll,
          hasRolled: true,
          consecutiveSixes: newSixes,
          lastAction: `${myName} ${toBnNum(roll)} রোল করেছেন! গুটিতে ট্যাপ করে চাল দিন।`,
        },
      });
    }, 400);
  };

  // Move Token Action
  const handleMoveToken = (tokenIndex) => {
    if (!isMyTurn || !hasRolled) return;

    const myTokens = tokens[myIndex] || [-1, -1, -1, -1];
    if (!canMoveToken(myIndex, myTokens[tokenIndex], diceValue)) return;

    const { newTokens, capturedToken, reachedHome } = executeTokenMove(
      tokens,
      myIndex,
      tokenIndex,
      diceValue
    );

    // Audio & haptic feedback for token action
    if (capturedToken) {
      gameAudio.playCapture();
      triggerHaptic('medium');
    } else if (reachedHome) {
      gameAudio.playWin();
      triggerHaptic('medium');
    } else {
      gameAudio.playCard();
      triggerHaptic('light');
    }

    // Check if player has won!
    const won = hasPlayerWon(newTokens[myIndex]);
    let winners = [...(gameState.winners || [])];
    if (won && !winners.includes(myIndex)) {
      winners.push(myIndex);
      gameAudio.playWin();
    }

    // Grant bonus turn on rolling a 6, capturing, or reaching home
    const getsBonus = diceValue === 6 || Boolean(capturedToken) || reachedHome;
    const nextTurn = getsBonus
      ? currentTurn
      : (currentTurn + 1) % (room.players?.length || 4);

    let actionText = `${myName} গুটি চেলেছেন।`;
    if (capturedToken) {
      const opponentName = room.players[capturedToken.playerIndex]?.name || 'প্রতিপক্ষ';
      actionText = `${myName} ${opponentName}-এর গুটি কেটেছেন! এবং বোনাস চাল পেয়েছেন! 🎉`;
    } else if (reachedHome) {
      actionText = `${myName}-এর একটি গুটি হোমে পৌঁছেছে! 🏆`;
    } else if (diceValue === 6) {
      actionText = `${myName} ৬ পেয়েছেন এবং আরেকটি চাল পেয়েছেন!`;
    } else {
      actionText = `এখন ${room.players[nextTurn]?.name}-এর চাল।`;
    }

    // Check game over (if 1 player remains or first player won in 2-player)
    const isGameOver = winners.length >= (room.players?.length || 4) - 1;

    updateGameRoom(room.id, {
      status: isGameOver ? 'round_ended' : 'playing',
      state: {
        ...gameState,
        tokens: newTokens,
        hasRolled: false,
        consecutiveSixes: diceValue === 6 ? (gameState.consecutiveSixes || 0) : 0,
        turnIndex: nextTurn,
        winners,
        lastAction: actionText,
      },
    });
  };

  // Auto-pass on timer expiry
  const handleAutoPass = () => {
    if (!isMyTurn) return;
    const nextTurn = (currentTurn + 1) % (room.players?.length || 4);
    updateGameRoom(room.id, {
      state: {
        ...gameState,
        hasRolled: false,
        consecutiveSixes: 0,
        turnIndex: nextTurn,
        lastAction: `সময় পার হওয়ায় ${myName}-এর চাল পাস হয়েছে।`,
      },
    });
  };

  // Movable token indices for current player
  const movableTokenIndices =
    isMyTurn && hasRolled
      ? getMovableTokens(myIndex, tokens[myIndex] || [], diceValue)
      : [];

  // Render individual cell on 15x15 Ludo Board
  const renderCell = (row, col) => {
    // 1. Red Base (Top-Left 6x6)
    if (row < 6 && col < 6) return null;
    // 2. Green Base (Top-Right 6x6)
    if (row < 6 && col >= 9) return null;
    // 3. Blue Base (Bottom-Left 6x6)
    if (row >= 9 && col < 6) return null;
    // 4. Yellow Base (Bottom-Right 6x6)
    if (row >= 9 && col >= 9) return null;
    // 5. Center 3x3 Goal (Center)
    if (row >= 6 && row <= 8 && col >= 6 && col <= 8) return null;

    // Check Home Run columns
    let cellBg = 'bg-white';
    let isStar = false;
    let label = '';

    // Red home column (Row 7, Col 1..5) & start (Row 6, Col 1)
    if (row === 7 && col >= 1 && col <= 5) cellBg = 'bg-rose-400';
    if (row === 6 && col === 1) cellBg = 'bg-rose-200';

    // Green home column (Col 7, Row 1..5) & start (Row 1, Col 8)
    if (col === 7 && row >= 1 && row <= 5) cellBg = 'bg-emerald-400';
    if (row === 1 && col === 8) cellBg = 'bg-emerald-200';

    // Yellow home column (Row 7, Col 9..13) & start (Row 8, Col 13)
    if (row === 7 && col >= 9 && col <= 13) cellBg = 'bg-amber-300';
    if (row === 8 && col === 13) cellBg = 'bg-amber-200';

    // Blue home column (Col 7, Row 9..13) & start (Row 13, Col 6)
    if (col === 7 && row >= 9 && row <= 13) cellBg = 'bg-sky-400';
    if (row === 13 && col === 6) cellBg = 'bg-sky-200';

    // Star Squares (Safe)
    if (
      (row === 2 && col === 6) ||
      (row === 6 && col === 12) ||
      (row === 12 && col === 8) ||
      (row === 8 && col === 2)
    ) {
      isStar = true;
    }

    return (
      <div
        key={`${row}-${col}`}
        style={{ gridRow: row + 1, gridColumn: col + 1 }}
        className={`w-full h-full border border-slate-200/80 flex items-center justify-center relative select-none ${cellBg}`}
      >
        {isStar && <span className="text-[9px] sm:text-xs">⭐</span>}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-white rounded-3xl overflow-hidden border border-slate-800 shadow-2xl relative select-none">
      {/* 1. Header Bar */}
      <div className="shrink-0 bg-slate-900/90 border-b border-slate-800 px-3 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-teal-950 font-black text-xs flex items-center justify-center shadow-md shrink-0">
            🎲
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-extrabold text-xs sm:text-sm text-emerald-300 truncate">
                {room.title || 'লুডো ক্লাব টেবিল'}
              </h3>
              <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded border border-slate-700">
                {room.id}
              </span>
              {isMyTurn && (
                <GameTurnTimer isMyTurn={isMyTurn} turnKey={`${currentTurn}_${hasRolled}`} onTimeout={handleAutoPass} />
              )}
            </div>
            <p className="text-[10px] text-slate-400">
              {toBnNum(room.players?.length || 0)} জন খেলোয়াড় •{' '}
              {room.status === 'playing' ? `${room.players?.[currentTurn]?.name}-এর চাল` : 'অপেক্ষমাণ'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => setIsMuted(gameAudio.toggleMute())}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title={isMuted ? 'সাউন্ড আনমিউট করুন' : 'সাউন্ড মিউট করুন'}
          >
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>

          {/* Floating Reactions */}
          <GameReactions room={room} currentUser={currentUser} currentProfile={currentProfile} />

          {/* Leave Button */}
          <button
            type="button"
            onClick={onLeave}
            className="px-2.5 py-1 bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800/80 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
          >
            <LogOut size={13} />
            <span className="hidden sm:inline">বের হন</span>
          </button>
        </div>
      </div>

      {/* 2. Main Game Arena */}
      <div className="flex-1 min-h-[380px] p-2 sm:p-4 flex flex-col items-center justify-center relative bg-gradient-to-b from-slate-900 via-slate-950 to-black">
        {/* Ludo Board (Fixed Aspect Ratio Square) */}
        <div className="w-full max-w-[360px] sm:max-w-[420px] aspect-square bg-white rounded-2xl shadow-2xl border-4 border-slate-800 relative overflow-hidden select-none">
          {/* Base 1: Red Base (Top-Left) */}
          <div className="absolute top-0 left-0 w-[40%] h-[40%] bg-rose-500 p-2 sm:p-3 flex items-center justify-center">
            <div className="w-full h-full bg-white rounded-xl shadow-inner grid grid-cols-2 gap-2 p-2">
              {[0, 1, 2, 3].map((slotIdx) => {
                const isPresent = tokens[0]?.[slotIdx] === -1;
                const canMove = 0 === myIndex && movableTokenIndices.includes(slotIdx);
                return (
                  <div
                    key={slotIdx}
                    onClick={() => canMove && handleMoveToken(slotIdx)}
                    className={`w-full h-full rounded-full border-2 border-rose-300 flex items-center justify-center ${
                      isPresent ? 'bg-rose-500 shadow-md' : 'bg-rose-50'
                    } ${canMove ? 'ring-4 ring-amber-400 animate-bounce cursor-pointer' : ''}`}
                  >
                    {isPresent && <span className="text-white text-[10px] font-bold">🔴</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Base 2: Green Base (Top-Right) */}
          <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-emerald-500 p-2 sm:p-3 flex items-center justify-center">
            <div className="w-full h-full bg-white rounded-xl shadow-inner grid grid-cols-2 gap-2 p-2">
              {[0, 1, 2, 3].map((slotIdx) => {
                const isPresent = tokens[1]?.[slotIdx] === -1;
                const canMove = 1 === myIndex && movableTokenIndices.includes(slotIdx);
                return (
                  <div
                    key={slotIdx}
                    onClick={() => canMove && handleMoveToken(slotIdx)}
                    className={`w-full h-full rounded-full border-2 border-emerald-300 flex items-center justify-center ${
                      isPresent ? 'bg-emerald-500 shadow-md' : 'bg-emerald-50'
                    } ${canMove ? 'ring-4 ring-amber-400 animate-bounce cursor-pointer' : ''}`}
                  >
                    {isPresent && <span className="text-white text-[10px] font-bold">🟢</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Base 3: Yellow Base (Bottom-Right) */}
          <div className="absolute bottom-0 right-0 w-[40%] h-[40%] bg-amber-400 p-2 sm:p-3 flex items-center justify-center">
            <div className="w-full h-full bg-white rounded-xl shadow-inner grid grid-cols-2 gap-2 p-2">
              {[0, 1, 2, 3].map((slotIdx) => {
                const isPresent = tokens[2]?.[slotIdx] === -1;
                const canMove = 2 === myIndex && movableTokenIndices.includes(slotIdx);
                return (
                  <div
                    key={slotIdx}
                    onClick={() => canMove && handleMoveToken(slotIdx)}
                    className={`w-full h-full rounded-full border-2 border-amber-300 flex items-center justify-center ${
                      isPresent ? 'bg-amber-400 shadow-md' : 'bg-amber-50'
                    } ${canMove ? 'ring-4 ring-amber-400 animate-bounce cursor-pointer' : ''}`}
                  >
                    {isPresent && <span className="text-white text-[10px] font-bold">🟡</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Base 4: Blue Base (Bottom-Left) */}
          <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-sky-500 p-2 sm:p-3 flex items-center justify-center">
            <div className="w-full h-full bg-white rounded-xl shadow-inner grid grid-cols-2 gap-2 p-2">
              {[0, 1, 2, 3].map((slotIdx) => {
                const isPresent = tokens[3]?.[slotIdx] === -1;
                const canMove = 3 === myIndex && movableTokenIndices.includes(slotIdx);
                return (
                  <div
                    key={slotIdx}
                    onClick={() => canMove && handleMoveToken(slotIdx)}
                    className={`w-full h-full rounded-full border-2 border-sky-300 flex items-center justify-center ${
                      isPresent ? 'bg-sky-500 shadow-md' : 'bg-sky-50'
                    } ${canMove ? 'ring-4 ring-amber-400 animate-bounce cursor-pointer' : ''}`}
                  >
                    {isPresent && <span className="text-white text-[10px] font-bold">🔵</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Center 3x3 Home Triangle Goal */}
          <div className="absolute top-[40%] left-[40%] w-[20%] h-[20%] bg-slate-900 flex items-center justify-center shadow-inner overflow-hidden border border-slate-700">
            <div className="relative w-full h-full flex items-center justify-center">
              <Trophy size={18} className="text-amber-400 animate-pulse" />
            </div>
          </div>

          {/* 15x15 Track Cells Grid */}
          <div className="w-full h-full grid grid-cols-15 grid-rows-15 pointer-events-none">
            {Array.from({ length: GRID_SIZE }).map((_, r) =>
              Array.from({ length: GRID_SIZE }).map((_, c) => renderCell(r, c))
            )}
          </div>

          {/* Dynamic Active Tokens on Board */}
          {Object.entries(tokens).map(([pStr, playerTokens]) => {
            const pIdx = Number(pStr);
            const color = PLAYER_COLORS[pIdx] || PLAYER_COLORS[0];

            return playerTokens.map((step, tIdx) => {
              if (step === -1) return null; // In base handled above

              const [row, col] = getTokenBoardPosition(pIdx, tIdx, step);
              const isMovable = pIdx === myIndex && movableTokenIndices.includes(tIdx);

              // Percentage offsets inside 15x15
              const topPct = (row / 15) * 100;
              const leftPct = (col / 15) * 100;

              return (
                <div
                  key={`${pIdx}-${tIdx}`}
                  onClick={() => isMovable && handleMoveToken(tIdx)}
                  style={{
                    top: `${topPct}%`,
                    left: `${leftPct}%`,
                    width: `${100 / 15}%`,
                    height: `${100 / 15}%`,
                  }}
                  className={`absolute flex items-center justify-center z-20 transition-all duration-300 ${
                    isMovable ? 'cursor-pointer pointer-events-auto' : 'pointer-events-none'
                  }`}
                >
                  <div
                    className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full ${color.colorClass} border-2 border-white shadow-lg flex items-center justify-center text-[9px] font-black text-white ${
                      isMovable ? 'ring-4 ring-amber-400 animate-bounce scale-110' : ''
                    }`}
                  >
                    {tIdx + 1}
                  </div>
                </div>
              );
            });
          })}
        </div>

        {/* Status Action Banner */}
        <div className="mt-3 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-xl border border-white/10 max-w-sm text-center">
          <p className="text-xs text-amber-300 font-semibold">
            {gameState.lastAction || 'খেলোয়াড়দের জন্য অপেক্ষা করা হচ্ছে...'}
          </p>
        </div>
      </div>

      {/* 3. Bottom Controls Bar */}
      <div className="shrink-0 bg-slate-900 border-t border-slate-800 p-2 sm:p-3 flex items-center justify-between gap-2 flex-wrap">
        {/* Players Chips / Turn Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {(room.players || []).map((p, idx) => {
            const color = PLAYER_COLORS[idx] || PLAYER_COLORS[0];
            const isTurn = room.status === 'playing' && currentTurn === idx;
            return (
              <div
                key={p.email || idx}
                className={`px-2 py-1 rounded-xl flex items-center gap-1.5 text-xs font-bold transition border ${
                  isTurn
                    ? 'bg-amber-400 text-teal-950 border-amber-300 shadow-md scale-105'
                    : 'bg-black/30 text-slate-300 border-white/10'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${color.colorClass}`} />
                <span className="truncate max-w-[65px]">{p.name}</span>
              </div>
            );
          })}
        </div>

        {/* Dice & Turn Actions */}
        <div className="flex items-center gap-2 ml-auto">
          {room.status === 'waiting' && (
            <button
              type="button"
              disabled={!isHost || (room.players || []).length < 2}
              onClick={handleStartGame}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-40 text-teal-950 font-black text-xs sm:text-sm rounded-xl shadow-md transition flex items-center gap-1 cursor-pointer"
            >
              <Play size={14} />
              খেলা শুরু করুন ({toBnNum(room.players?.length || 0)} জন)
            </button>
          )}

          {room.status === 'playing' && (
            <div className="flex items-center gap-2">
              {/* Animated Dice */}
              <div
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white text-slate-950 font-black text-xl flex items-center justify-center shadow-lg border-2 border-slate-300 ${
                  isRolling ? 'animate-spin' : ''
                }`}
              >
                {toBnNum(diceValue)}
              </div>

              {isMyTurn && !hasRolled && (
                <button
                  type="button"
                  onClick={handleRollDice}
                  disabled={isRolling}
                  className="px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-teal-950 font-black text-xs sm:text-sm rounded-xl shadow-lg transition cursor-pointer active:scale-95 flex items-center gap-1"
                >
                  <Dices size={16} />
                  ডাইস রোল করুন
                </button>
              )}

              {isMyTurn && hasRolled && (
                <span className="text-xs text-amber-300 font-bold animate-pulse">
                  👉 গুটিতে ট্যাপ করে চাল দিন
                </span>
              )}

              {!isMyTurn && (
                <span className="text-xs text-slate-400 font-medium">
                  {room.players?.[currentTurn]?.name}-এর চাল...
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
