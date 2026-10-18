import React, { useState, useEffect, useRef } from 'react';
import PlayingCard from './PlayingCard';
import {
  createDeck,
  shuffleDeck,
  evaluateHand,
  getWinner,
  HAND_NAMES_BN,
} from './pokerEvaluator';
import { updateGameRoom } from '../../services/tourStore';
import UserAvatar from '../UserAvatar';
import {
  Coins,
  Crown,
  Eye,
  LogOut,
  Play,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';

const toBnNum = (n) => String(n ?? 0).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);

const DEFAULT_BOOT = 20;

export default function TeenPattiGame({
  room,
  currentUser,
  currentProfile,
  onLeave,
}) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const myEmail = (currentUser?.email || '').toLowerCase();
  const myName = currentProfile?.displayName || currentUser?.displayName || 'খেলোয়াড়';

  // Find current user's player object in the room
  const myPlayer = (room.players || []).find(
    (p) => (p.email || '').toLowerCase() === myEmail
  );

  const isHost = (room.hostEmail || '').toLowerCase() === myEmail;
  const isMyTurn =
    room.status === 'playing' &&
    room.state?.turnIndex !== undefined &&
    room.players?.[room.state.turnIndex]?.email?.toLowerCase() === myEmail;

  // Local state for seeing cards (can also persist in room player state)
  const [hasSeenCardsLocally, setHasSeenCardsLocally] = useState(false);

  useEffect(() => {
    if (myPlayer?.seen) {
      setHasSeenCardsLocally(true);
    }
  }, [myPlayer?.seen]);

  // Handle Starting a New Hand (Host only)
  const handleStartHand = () => {
    const activePlayers = (room.players || []).filter((p) => (p.chips || 0) >= DEFAULT_BOOT);
    if (activePlayers.length < 2) {
      alert('খেলা শুরু করতে অন্তত ২ জন খেলোয়াড় প্রয়োজন যাদের অন্তত ২০ চিপস আছে!');
      return;
    }

    // Shuffle and deal 3 cards to each player
    const deck = shuffleDeck(createDeck());
    const hands = {};
    const updatedPlayers = room.players.map((p, idx) => {
      const cards = [deck.pop(), deck.pop(), deck.pop()];
      hands[p.email.toLowerCase()] = cards;
      return {
        ...p,
        cards,
        seen: false,
        folded: false,
        chips: Math.max(0, (p.chips || 1000) - DEFAULT_BOOT),
        currentBet: DEFAULT_BOOT,
      };
    });

    const pot = activePlayers.length * DEFAULT_BOOT;
    const dealerIndex = ((room.state?.dealerIndex ?? -1) + 1) % updatedPlayers.length;
    const firstTurnIndex = (dealerIndex + 1) % updatedPlayers.length;

    updateGameRoom(room.id, {
      status: 'playing',
      state: {
        dealerIndex,
        turnIndex: firstTurnIndex,
        pot,
        currentStake: DEFAULT_BOOT,
        lastAction: `খেলা শুরু হয়েছে! সবার কাছ থেকে ${toBnNum(DEFAULT_BOOT)} চিপস বুট নেওয়া হয়েছে।`,
        winner: null,
      },
      players: updatedPlayers,
    });
    setHasSeenCardsLocally(false);
  };

  // See Cards Action
  const handleSeeCards = () => {
    setHasSeenCardsLocally(true);
    const updatedPlayers = (room.players || []).map((p) =>
      p.email?.toLowerCase() === myEmail ? { ...p, seen: true } : p
    );
    updateGameRoom(room.id, {
      players: updatedPlayers,
      state: {
        ...room.state,
        lastAction: `${myName} নিজের কার্ড দেখেছেন।`,
      },
    });
  };

  // Find next active player turn
  const getNextTurnIndex = (players, currentIndex) => {
    const total = players.length;
    for (let i = 1; i < total; i++) {
      const nextIdx = (currentIndex + i) % total;
      if (!players[nextIdx].folded && (players[nextIdx].chips || 0) > 0) {
        return nextIdx;
      }
    }
    return currentIndex;
  };

  // Check remaining active players
  const getRemainingActivePlayers = (players) => {
    return players.filter((p) => !p.folded);
  };

  // Chaal / Bet Action
  const handleBet = (isDouble = false) => {
    if (!isMyTurn) return;

    const isSeen = hasSeenCardsLocally || myPlayer?.seen;
    let betAmount = room.state?.currentStake || DEFAULT_BOOT;

    if (isSeen) {
      betAmount = betAmount * 2; // Seen players pay 2x blind
    }
    if (isDouble) {
      betAmount = betAmount * 2;
    }

    if ((myPlayer.chips || 0) < betAmount) {
      betAmount = myPlayer.chips || 0; // All-in
    }

    const newPot = (room.state?.pot || 0) + betAmount;
    const updatedPlayers = room.players.map((p) =>
      p.email?.toLowerCase() === myEmail
        ? {
            ...p,
            chips: (p.chips || 0) - betAmount,
            currentBet: (p.currentBet || 0) + betAmount,
          }
        : p
    );

    const nextTurn = getNextTurnIndex(updatedPlayers, room.state.turnIndex);

    updateGameRoom(room.id, {
      players: updatedPlayers,
      state: {
        ...room.state,
        pot: newPot,
        currentStake: isSeen ? betAmount / 2 : betAmount,
        turnIndex: nextTurn,
        lastAction: `${myName} ${isSeen ? 'চাল' : 'ব্লাইন্ড'} দিয়েছেন (${toBnNum(betAmount)} চিপস)`,
      },
    });
  };

  // Fold / Pack Action
  const handleFold = () => {
    if (!isMyTurn) return;

    const updatedPlayers = room.players.map((p) =>
      p.email?.toLowerCase() === myEmail ? { ...p, folded: true } : p
    );

    const remaining = getRemainingActivePlayers(updatedPlayers);

    // If only 1 player remains, they win immediately!
    if (remaining.length === 1) {
      const winner = remaining[0];
      const winPot = room.state?.pot || 0;
      const finalPlayers = updatedPlayers.map((p) =>
        p.email === winner.email ? { ...p, chips: (p.chips || 0) + winPot } : p
      );

      updateGameRoom(room.id, {
        status: 'round_ended',
        players: finalPlayers,
        state: {
          ...room.state,
          winner: {
            name: winner.name,
            email: winner.email,
            handName: 'অন্য সবাই প্যাক করায় জয়ী!',
            amount: winPot,
          },
          lastAction: `${myName} প্যাক করায় ${winner.name} জয়ী হয়েছেন! (${toBnNum(winPot)} চিপস)`,
        },
      });
      return;
    }

    const nextTurn = getNextTurnIndex(updatedPlayers, room.state.turnIndex);
    updateGameRoom(room.id, {
      players: updatedPlayers,
      state: {
        ...room.state,
        turnIndex: nextTurn,
        lastAction: `${myName} প্যাক করেছেন।`,
      },
    });
  };

  // Showdown Action (When 2 players remain)
  const handleShowdown = () => {
    if (!isMyTurn) return;

    const remaining = getRemainingActivePlayers(room.players || []);
    if (remaining.length !== 2) return;

    const showCost = (room.state?.currentStake || DEFAULT_BOOT) * (myPlayer?.seen ? 2 : 1);
    const newPot = (room.state?.pot || 0) + showCost;

    const updatedPlayers = room.players.map((p) =>
      p.email?.toLowerCase() === myEmail
        ? { ...p, chips: Math.max(0, (p.chips || 0) - showCost) }
        : p
    );

    // Evaluate hands between the two players
    const winnerData = getWinner(remaining);
    const winner = winnerData?.player;
    const handName = winnerData?.evaluation?.name || 'উচ্চ কার্ড';

    const finalPlayers = updatedPlayers.map((p) =>
      p.email === winner.email ? { ...p, chips: (p.chips || 0) + newPot } : p
    );

    updateGameRoom(room.id, {
      status: 'round_ended',
      players: finalPlayers,
      state: {
        ...room.state,
        pot: newPot,
        winner: {
          name: winner.name,
          email: winner.email,
          handName,
          amount: newPot,
        },
        lastAction: `শোডাউন! ${winner.name} ${handName}-এ বিজয়ী হয়েছেন এবং ${toBnNum(newPot)} চিপস জিতেছেন!`,
      },
    });
  };

  // Replenish free chips if user is broke
  const handleFreeChips = () => {
    const updatedPlayers = (room.players || []).map((p) =>
      p.email?.toLowerCase() === myEmail ? { ...p, chips: (p.chips || 0) + 1000 } : p
    );
    updateGameRoom(room.id, {
      players: updatedPlayers,
    });
  };

  const remainingActiveCount = getRemainingActivePlayers(room.players || []).length;
  const canShow = isMyTurn && remainingActiveCount === 2;

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-white rounded-3xl overflow-hidden border border-slate-800 shadow-2xl relative select-none">
      {/* 1. Header Bar */}
      <div className="shrink-0 bg-slate-900/90 border-b border-slate-800 px-3 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 text-teal-950 font-black text-xs flex items-center justify-center shadow-md shrink-0">
            🃏
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-extrabold text-xs sm:text-sm text-amber-300 truncate">
                {room.title || '৩ পাত্তি টেবিল'}
              </h3>
              <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded border border-slate-700">
                {room.id}
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              হোস্ট: {room.hostName || 'পরিবার'} • {toBnNum(room.players?.length || 0)} জন খেলোয়াড়
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
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

      {/* 2. Casino Table Felt Canvas */}
      <div className="flex-1 min-h-[360px] p-2 sm:p-4 flex flex-col justify-between relative overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-teal-900 via-emerald-950 to-slate-950">
        {/* Table Felt Inner Border */}
        <div className="absolute inset-2 sm:inset-4 rounded-[40px] sm:rounded-[60px] border-4 border-amber-600/40 pointer-events-none shadow-[inset_0_0_80px_rgba(0,0,0,0.8)]" />

        {/* Top/Other Players Area */}
        <div className="relative z-10 flex items-center justify-center gap-2 sm:gap-4 flex-wrap pt-1">
          {(room.players || [])
            .filter((p) => p.email?.toLowerCase() !== myEmail)
            .map((p, idx) => {
              const isCurrentTurn =
                room.status === 'playing' &&
                room.players?.[room.state?.turnIndex]?.email?.toLowerCase() === p.email?.toLowerCase();
              const isRoundEnded = room.status === 'round_ended';

              return (
                <div
                  key={p.email || idx}
                  className={`flex flex-col items-center p-2 rounded-2xl transition-all ${
                    isCurrentTurn
                      ? 'bg-amber-500/20 ring-2 ring-amber-400 shadow-lg scale-105'
                      : p.folded
                        ? 'opacity-40 grayscale'
                        : 'bg-black/30 border border-white/10'
                  }`}
                >
                  <div className="relative">
                    <UserAvatar
                      photoUrl={p.photoURL}
                      name={p.name}
                      size="w-8 h-8 sm:w-10 sm:h-10"
                      ring={isCurrentTurn ? 'ring-2 ring-amber-400' : 'ring-1 ring-white/20'}
                    />
                    {p.seen && !p.folded && (
                      <span className="absolute -bottom-1 -right-1 bg-teal-600 text-[8px] font-bold px-1 rounded-full text-white shadow-xs">
                        সিন
                      </span>
                    )}
                  </div>
                  <span className="font-bold text-[10px] sm:text-xs text-slate-200 mt-1 truncate max-w-[75px]">
                    {p.name}
                  </span>
                  <div className="flex items-center gap-0.5 text-amber-300 font-mono text-[9px] sm:text-[10px]">
                    <Coins size={10} />
                    <span>{toBnNum(p.chips || 0)}</span>
                  </div>

                  {/* Opponent's Cards */}
                  <div className="flex items-center -space-x-4 sm:-space-x-5 mt-1">
                    {(p.cards || ['??', '??', '??']).map((c, cIdx) => (
                      <PlayingCard
                        key={cIdx}
                        card={c}
                        size="sm"
                        isFaceDown={!isRoundEnded || p.folded}
                      />
                    ))}
                  </div>

                  {p.folded && (
                    <span className="text-[9px] text-red-400 font-bold mt-0.5">প্যাকড</span>
                  )}
                </div>
              );
            })}
        </div>

        {/* Center Table: Pot & Game Status Banner */}
        <div className="relative z-10 flex flex-col items-center justify-center my-auto py-2 text-center">
          {/* Pot Pill */}
          <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 text-teal-950 font-black px-4 py-1.5 rounded-full shadow-xl border-2 border-amber-300 flex items-center gap-2 transform hover:scale-105 transition">
            <Coins size={18} className="animate-spin" style={{ animationDuration: '4s' }} />
            <span className="text-xs sm:text-sm tracking-wide">
              মোট পট: {toBnNum(room.state?.pot || 0)} চিপস
            </span>
          </div>

          {/* Last action / Dealer note */}
          <div className="mt-2 px-3 py-1 bg-black/50 backdrop-blur-md rounded-xl border border-white/10 max-w-xs sm:max-w-md">
            <p className="text-[11px] sm:text-xs text-amber-200 font-medium">
              {room.state?.lastAction || 'খেলোয়াড়দের জন্য অপেক্ষা করা হচ্ছে...'}
            </p>
          </div>

          {/* Winner Showcase Banner */}
          {room.status === 'round_ended' && room.state?.winner && (
            <div className="mt-3 p-3 bg-gradient-to-r from-amber-500/90 to-yellow-500/90 text-teal-950 rounded-2xl shadow-2xl border-2 border-amber-200 animate-in zoom-in duration-200 text-center space-y-1">
              <div className="flex items-center justify-center gap-1 font-black text-sm">
                <Crown size={18} className="text-teal-950 fill-teal-950" />
                <span>{room.state.winner.name} জয়ী!</span>
              </div>
              <p className="text-xs font-bold text-teal-900">
                {room.state.winner.handName} • পেয়েছেন {toBnNum(room.state.winner.amount)} চিপস
              </p>
              {isHost && (
                <button
                  type="button"
                  onClick={handleStartHand}
                  className="mt-1 px-4 py-1.5 bg-teal-950 hover:bg-teal-900 text-amber-300 font-extrabold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center gap-1 mx-auto"
                >
                  <RotateCcw size={13} />
                  পরবর্তী রাউন্ড শুরু করুন
                </button>
              )}
            </div>
          )}

          {/* Waiting for Players Banner */}
          {room.status === 'waiting' && (
            <div className="mt-3 text-center space-y-2">
              <p className="text-xs text-teal-200">
                টেবিলে অন্তত ২ জন খেলোয়াড় যুক্ত হলে খেলা শুরু করা যাবে।
              </p>
              {isHost ? (
                <button
                  type="button"
                  onClick={handleStartHand}
                  disabled={(room.players || []).length < 2}
                  className="px-5 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 disabled:opacity-40 text-teal-950 font-black text-xs sm:text-sm rounded-2xl shadow-lg transition flex items-center gap-1.5 mx-auto cursor-pointer"
                >
                  <Play size={16} />
                  খেলা শুরু করুন
                </button>
              ) : (
                <span className="text-xs text-amber-300 font-semibold italic">
                  হোস্ট খেলা শুরু করার জন্য অপেক্ষা করুন...
                </span>
              )}
            </div>
          )}
        </div>

        {/* Bottom / Current User Area */}
        <div className="relative z-10 flex flex-col items-center">
          {/* User's Hand Cards */}
          {myPlayer && (
            <div className="flex flex-col items-center space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-amber-300">আপনার কার্ড:</span>
                {myPlayer.cards && myPlayer.cards.length === 3 && (
                  <span className="text-[10px] px-2 py-0.2 rounded-full font-semibold bg-black/40 border border-white/10 text-teal-200">
                    {hasSeenCardsLocally
                      ? evaluateHand(myPlayer.cards).name
                      : 'ব্লাইন্ড (কার্ড দেখা হয়নি)'}
                  </span>
                )}
              </div>

              <div className="flex items-center -space-x-3 sm:-space-x-4">
                {(myPlayer.cards || ['??', '??', '??']).map((c, idx) => (
                  <PlayingCard
                    key={idx}
                    card={c}
                    size="md"
                    isFaceDown={!hasSeenCardsLocally && room.status !== 'round_ended'}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-slate-300 font-bold">{myName}</span>
                <span className="flex items-center gap-0.5 text-amber-400 font-bold bg-black/40 px-2 py-0.5 rounded-lg border border-white/10">
                  <Coins size={12} />
                  {toBnNum(myPlayer.chips || 0)} চিপস
                </span>
                {(myPlayer.chips || 0) < 50 && (
                  <button
                    type="button"
                    onClick={handleFreeChips}
                    className="px-2 py-0.5 bg-amber-400 text-teal-950 font-bold text-[10px] rounded-lg shadow-xs hover:bg-amber-300 transition cursor-pointer"
                  >
                    +১০০০ ফ্রি চিপস
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Action Controls Bottom Bar */}
      <div className="shrink-0 bg-slate-900 border-t border-slate-800 p-2 sm:p-3 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {!hasSeenCardsLocally && room.status === 'playing' && !myPlayer?.folded && (
            <button
              type="button"
              onClick={handleSeeCards}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1 cursor-pointer"
            >
              <Eye size={14} />
              কার্ড দেখুন (Seen)
            </button>
          )}

          {myPlayer?.folded && (
            <span className="text-xs text-red-400 font-bold bg-red-950/60 px-2.5 py-1.5 rounded-xl border border-red-800/60">
              আপনি এই রাউন্ডে প্যাক করেছেন
            </span>
          )}
        </div>

        {/* Turn Actions */}
        {isMyTurn && !myPlayer?.folded && (
          <div className="flex items-center gap-1.5 sm:gap-2 ml-auto animate-in fade-in duration-150">
            <button
              type="button"
              onClick={handleFold}
              className="px-3.5 py-2 bg-red-800 hover:bg-red-900 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
            >
              প্যাক (Pack)
            </button>

            <button
              type="button"
              onClick={() => handleBet(false)}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-teal-950 font-black text-xs sm:text-sm rounded-xl shadow-lg transition cursor-pointer active:scale-95 flex items-center gap-1"
            >
              <Coins size={14} />
              {hasSeenCardsLocally ? 'চাল' : 'ব্লাইন্ড'} (
              {toBnNum(
                (room.state?.currentStake || DEFAULT_BOOT) * (hasSeenCardsLocally ? 2 : 1)
              )}
              )
            </button>

            <button
              type="button"
              onClick={() => handleBet(true)}
              className="px-3 py-2 bg-teal-800 hover:bg-teal-700 text-teal-100 font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
              title="ডাবল চাল দিন"
            >
              ২x চাল
            </button>

            {canShow && (
              <button
                type="button"
                onClick={handleShowdown}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg transition cursor-pointer active:scale-95 flex items-center gap-1"
              >
                <Sparkles size={14} />
                শো (Show)
              </button>
            )}
          </div>
        )}

        {!isMyTurn && room.status === 'playing' && !myPlayer?.folded && (
          <span className="text-xs text-amber-300/80 font-medium ml-auto flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            {room.players?.[room.state?.turnIndex]?.name || 'অন্য খেলোয়াড়'}-এর চাল...
          </span>
        )}
      </div>
    </div>
  );
}
