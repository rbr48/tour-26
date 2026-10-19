import React, { useState, useEffect } from 'react';
import PlayingCard, { SUIT_NAMES, SUIT_SYMBOLS } from './PlayingCard';
import {
  create29Deck,
  parse29Card,
  determineTrickWinner,
  isMoveLegal,
} from './card29Logic';
import { shuffleDeck } from './pokerEvaluator';
import { updateGameRoom } from '../../services/tourStore';
import { gameAudio } from '../../utils/gameAudio';
import { triggerHaptic } from '../../utils/haptics';
import GameReactions from './GameReactions';
import GameTurnTimer from './GameTurnTimer';
import UserAvatar from '../UserAvatar';
import {
  Crown,
  Eye,
  History,
  LogOut,
  Play,
  RotateCcw,
  Shield,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';

const toBnNum = (n) => String(n ?? 0).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);

export default function Card29Game({
  room,
  currentUser,
  currentProfile,
  onLeave,
}) {
  const [showLastTrickModal, setShowLastTrickModal] = useState(false);
  const [isMuted, setIsMuted] = useState(gameAudio.getMuted());

  const myEmail = (currentUser?.email || '').toLowerCase();
  const myName = currentProfile?.displayName || currentUser?.displayName || 'খেলোয়াড়';

  const myIndex = (room.players || []).findIndex(
    (p) => (p.email || '').toLowerCase() === myEmail
  );
  const myPlayer = myIndex !== -1 ? room.players[myIndex] : null;
  const isHost = (room.hostEmail || '').toLowerCase() === myEmail;

  const gameState = room.state || {};
  const phase = gameState.phase || 'waiting'; // 'waiting' | 'bidding' | 'select_trump' | 'playing' | 'round_ended'
  const isMyTurn = phase === 'playing' && gameState.turnIndex === myIndex && !gameState.resolvingTrick;
  const isMyBidTurn = phase === 'bidding' && gameState.bidTurnIndex === myIndex;

  // Sound cue when it becomes my turn
  useEffect(() => {
    if (isMyTurn || isMyBidTurn) {
      gameAudio.playTurn();
      triggerHaptic('light');
    }
  }, [isMyTurn, isMyBidTurn]);

  // Host effect: 2.2-second pause after 4th card played before collecting the trick
  useEffect(() => {
    if (!isHost || !gameState.resolvingTrick || (gameState.currentTrick || []).length !== 4) return;

    const timer = setTimeout(() => {
      const currentTrick = gameState.currentTrick;
      const trickResult = determineTrickWinner(
        currentTrick,
        gameState.trumpSuit,
        gameState.isTrumpRevealed
      );
      const winnerIdx = trickResult.winnerIndex;
      const winnerPlayer = room.players[winnerIdx];
      const isTeam1 = winnerIdx === 0 || winnerIdx === 2;

      const tricksPlayed = (gameState.tricksPlayed || 0) + 1;
      const extraPoint = tricksPlayed === 8 ? 1 : 0; // 1 extra point for 8th trick

      const newTeam1Points = (gameState.team1Points || 0) + (isTeam1 ? trickResult.trickPoints + extraPoint : 0);
      const newTeam2Points = (gameState.team2Points || 0) + (!isTeam1 ? trickResult.trickPoints + extraPoint : 0);

      const lastTrickData = {
        cards: currentTrick,
        winnerIndex: winnerIdx,
        winnerName: winnerPlayer?.name || 'খেলোয়াড়',
        points: trickResult.trickPoints + extraPoint,
      };

      if (tricksPlayed === 8) {
        // Round ended
        gameAudio.playWin();
        const bidderTeamIs1 = gameState.highestBidderIndex === 0 || gameState.highestBidderIndex === 2;
        const bidderPoints = bidderTeamIs1 ? newTeam1Points : newTeam2Points;
        const bidTarget = gameState.highestBid || 16;
        const bidMade = bidderPoints >= bidTarget;

        let newMatchScore1 = gameState.matchScore1 || 0;
        let newMatchScore2 = gameState.matchScore2 || 0;

        if (bidderTeamIs1) {
          newMatchScore1 += bidMade ? 1 : -1;
        } else {
          newMatchScore2 += bidMade ? 1 : -1;
        }

        updateGameRoom(room.id, {
          status: 'round_ended',
          state: {
            ...gameState,
            phase: 'round_ended',
            resolvingTrick: false,
            lastTrick: lastTrickData,
            currentTrick: [],
            team1Points: newTeam1Points,
            team2Points: newTeam2Points,
            matchScore1: newMatchScore1,
            matchScore2: newMatchScore2,
            isTrumpRevealed: true,
            winner: {
              name: bidMade
                ? (bidderTeamIs1 ? 'টিম ১ (সাউথ ও নর্থ)' : 'টিম ২ (ইস্ট ও ওয়েস্ট)')
                : (bidderTeamIs1 ? 'টিম ২ (ইস্ট ও ওয়েস্ট)' : 'টিম ১ (সাউথ ও নর্থ)'),
              text: bidMade
                ? `বিডার টিম ${toBnNum(bidTarget)} পয়েন্টের লক্ষ্য অর্জন করেছে!`
                : `বিডার টিম লক্ষ্য অর্জনে ব্যর্থ হয়েছে!`,
            },
            lastAction: `৮ম হাত সম্পন্ন! রাউন্ড সমাপ্ত।`,
          },
        });
      } else {
        // Next trick begins
        updateGameRoom(room.id, {
          state: {
            ...gameState,
            resolvingTrick: false,
            lastTrick: lastTrickData,
            currentTrick: [],
            leadSuit: null,
            turnIndex: winnerIdx,
            tricksPlayed,
            team1Points: newTeam1Points,
            team2Points: newTeam2Points,
            lastAction: `${winnerPlayer?.name} হাতটি জিতেছেন (+${toBnNum(trickResult.trickPoints)} পয়েন্ট)। পরবর্তী হাত শুরু!`,
          },
        });
      }
    }, 2200);

    return () => clearTimeout(timer);
  }, [isHost, gameState.resolvingTrick, gameState.currentTrick]);

  // Start 29 Hand (Host only)
  const handleStartHand = () => {
    if ((room.players || []).length !== 4) {
      alert('২৯ কার্ড গেম খেলতে ঠিক ৪ জন খেলোয়াড় প্রয়োজন (২ জন বনাম ২ জন পার্টনারশিপ)!');
      return;
    }

    gameAudio.playCard();
    const deck = shuffleDeck(create29Deck());
    const updatedPlayers = room.players.map((p) => {
      const first4 = [deck.pop(), deck.pop(), deck.pop(), deck.pop()];
      return {
        ...p,
        cards: first4,
        pointsWon: 0,
        tricksWon: 0,
      };
    });

    const dealerIndex = ((gameState.dealerIndex ?? -1) + 1) % 4;
    const firstBidder = (dealerIndex + 1) % 4;

    updateGameRoom(room.id, {
      status: 'playing',
      state: {
        phase: 'bidding',
        remainingDeck: deck,
        dealerIndex,
        bidTurnIndex: firstBidder,
        highestBid: 15,
        highestBidderIndex: -1,
        consecutivePasses: 0,
        trumpCard: null,
        trumpSuit: null,
        isTrumpRevealed: false,
        leadSuit: null,
        currentTrick: [],
        resolvingTrick: false,
        lastTrick: null,
        team1Points: gameState.team1Points || 0,
        team2Points: gameState.team2Points || 0,
        matchScore1: gameState.matchScore1 || 0,
        matchScore2: gameState.matchScore2 || 0,
        lastAction: 'প্রথম ৪টি কার্ড বণ্টন হয়েছে। বিডিং শুরু হয়েছে!',
      },
      players: updatedPlayers,
    });
  };

  // Handle Bidding (Bid or Pass)
  const handleBid = (bidVal) => {
    if (!isMyBidTurn) return;
    triggerHaptic('light');

    const nextBidder = (gameState.bidTurnIndex + 1) % 4;
    const passes = bidVal === 'pass' ? (gameState.consecutivePasses || 0) + 1 : 0;
    const newHighestBid = bidVal === 'pass' ? gameState.highestBid : bidVal;
    const newHighestBidder = bidVal === 'pass' ? gameState.highestBidderIndex : myIndex;

    // If 3 players pass after at least 1 bid, or 4 pass
    if (passes >= 3 && newHighestBidder !== -1) {
      updateGameRoom(room.id, {
        state: {
          ...gameState,
          phase: 'select_trump',
          highestBid: newHighestBid,
          highestBidderIndex: newHighestBidder,
          lastAction: `${room.players[newHighestBidder]?.name} ${toBnNum(newHighestBid)} পয়েন্টে বিড জিতেছেন! এখন তুরুপ (Trump) নির্বাচন করুন।`,
        },
      });
      return;
    }

    updateGameRoom(room.id, {
      state: {
        ...gameState,
        bidTurnIndex: nextBidder,
        consecutivePasses: passes,
        highestBid: newHighestBid,
        highestBidderIndex: newHighestBidder,
        lastAction:
          bidVal === 'pass'
            ? `${myName} পাস দিয়েছেন।`
            : `${myName} ${toBnNum(bidVal)} পয়েন্ট ডাক দিয়েছেন।`,
      },
    });
  };

  // Highest bidder selects trump card from their hand
  const handleSelectTrump = (selectedCard) => {
    if (gameState.highestBidderIndex !== myIndex) return;
    gameAudio.playCard();
    triggerHaptic('medium');

    const parsed = parse29Card(selectedCard);
    const trumpSuit = parsed.suit;

    // Deal remaining 4 cards to everyone
    let deck = [...(gameState.remainingDeck || [])];
    const updatedPlayers = room.players.map((p) => {
      const remaining4 = [deck.pop(), deck.pop(), deck.pop(), deck.pop()];
      return {
        ...p,
        cards: [...(p.cards || []), ...remaining4],
      };
    });

    const leadPlayerIndex = (gameState.dealerIndex + 1) % 4;

    updateGameRoom(room.id, {
      players: updatedPlayers,
      state: {
        ...gameState,
        phase: 'playing',
        remainingDeck: [],
        trumpCard: selectedCard,
        trumpSuit: trumpSuit,
        isTrumpRevealed: false,
        turnIndex: leadPlayerIndex,
        currentTrick: [],
        resolvingTrick: false,
        leadSuit: null,
        tricksPlayed: 0,
        lastAction: `${myName} তুরুপ নির্বাচন করেছেন এবং সবার মাঝে বাকি ৪টি কার্ড বণ্টন হয়েছে। খেলা শুরু!`,
      },
    });
  };

  // Play a card into the current trick
  const handlePlayCard = (cardStr) => {
    if (!isMyTurn || gameState.resolvingTrick) return;

    const currentTrick = gameState.currentTrick || [];
    const leadSuit = currentTrick.length === 0 ? parse29Card(cardStr).suit : gameState.leadSuit;

    // Validate move legality
    if (!isMoveLegal(cardStr, myPlayer.cards, gameState.leadSuit, gameState.isTrumpRevealed)) {
      alert(`আপনাকে অবশ্যই লিড স্যুটের (${SUIT_NAMES[gameState.leadSuit] || gameState.leadSuit}) কার্ড খেলতে হবে!`);
      return;
    }

    gameAudio.playCard();
    triggerHaptic('light');

    // Remove card from player hand
    const remainingCards = myPlayer.cards.filter((c) => c !== cardStr);
    const updatedPlayers = room.players.map((p, idx) =>
      idx === myIndex ? { ...p, cards: remainingCards } : p
    );

    const newTrick = [...currentTrick, { playerIndex: myIndex, card: cardStr }];

    // If trick is complete (4 cards played) -> pause to let all players see the 4th card!
    if (newTrick.length === 4) {
      const trickResult = determineTrickWinner(
        newTrick,
        gameState.trumpSuit,
        gameState.isTrumpRevealed
      );
      const winnerPlayer = room.players[trickResult.winnerIndex];

      updateGameRoom(room.id, {
        players: updatedPlayers,
        state: {
          ...gameState,
          currentTrick: newTrick,
          leadSuit,
          resolvingTrick: true,
          trickWinnerIndex: trickResult.winnerIndex,
          trickPoints: trickResult.trickPoints,
          lastAction: `🎉 ${winnerPlayer?.name} এই হাত জিতেছেন (${toBnNum(trickResult.trickPoints)} পয়েন্ট)!`,
        },
      });
      return;
    }

    // Next turn in current trick
    const nextTurn = (myIndex + 1) % 4;
    updateGameRoom(room.id, {
      players: updatedPlayers,
      state: {
        ...gameState,
        currentTrick: newTrick,
        leadSuit,
        turnIndex: nextTurn,
        lastAction: `${myName} ${cardStr} খেলেছেন।`,
      },
    });
  };

  // Reveal Trump Card action
  const handleRevealTrump = () => {
    if (gameState.isTrumpRevealed) return;
    triggerHaptic('medium');
    gameAudio.playTurn();
    updateGameRoom(room.id, {
      state: {
        ...gameState,
        isTrumpRevealed: true,
        lastAction: `তুরুপ উন্মোচিত হয়েছে! তুরুপ স্যুট: ${SUIT_NAMES[gameState.trumpSuit] || gameState.trumpSuit} (${SUIT_SYMBOLS[gameState.trumpSuit]})`,
      },
    });
  };

  const handleToggleMute = () => {
    const nextMuted = gameAudio.toggleMute();
    setIsMuted(nextMuted);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-white rounded-3xl overflow-hidden border border-slate-800 shadow-2xl relative select-none">
      {/* 1. Header Bar */}
      <div className="shrink-0 bg-slate-900/90 border-b border-slate-800 px-3 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-black text-xs flex items-center justify-center shadow-md shrink-0">
            ♠️
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-extrabold text-xs sm:text-sm text-indigo-300 truncate">
                {room.title || '২৯ কার্ড গেম টেবিল'}
              </h3>
              <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded border border-slate-700">
                {room.id}
              </span>
              {isMyTurn && (
                <GameTurnTimer isMyTurn={isMyTurn} turnKey={`${gameState.tricksPlayed}_${gameState.currentTrick?.length}`} />
              )}
            </div>
            <div className="flex items-center gap-2 text-[10px] mt-0.5">
              <span className="px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-200 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                টিম ১ (সাউথ-নর্থ): {toBnNum(gameState.team1Points || 0)}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-200 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                টিম ২ (ইস্ট-ওয়েস্ট): {toBnNum(gameState.team2Points || 0)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Last Trick Review Button */}
          {gameState.lastTrick && (
            <button
              type="button"
              onClick={() => setShowLastTrickModal(true)}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 transition"
              title="পূর্ববর্তী হাত দেখুন"
            >
              <History size={15} />
            </button>
          )}

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={handleToggleMute}
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

      {/* 2. Playing Arena (4-Seat Cross Partnership Table) */}
      <div className="flex-1 min-h-[390px] p-2 sm:p-4 flex flex-col justify-between relative bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#0d1730] via-[#090d1a] to-[#04060b] overflow-hidden">
        {/* Table Felt Rail & Inset Gold Glow */}
        <div className="absolute inset-2 sm:inset-4 rounded-[40px] sm:rounded-[60px] border-2 border-amber-500/25 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.9),0_0_20px_rgba(30,58,138,0.3)] bg-radial from-transparent to-black/40" />

        {/* Center Watermark Pattern */}
        <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
          <span className="text-[120px] sm:text-[180px] font-black tracking-widest text-white select-none">♠♥♦♣</span>
        </div>

        {/* Top Player (North - Partner of South) */}
        <div className="relative z-10 flex flex-col items-center">
          {room.players?.[2] ? (
            <div className={`flex flex-col items-center px-3 py-1.5 rounded-2xl border transition-all duration-300 shadow-md ${
              gameState.turnIndex === 2
                ? 'bg-gradient-to-b from-cyan-950/80 to-slate-900/90 border-cyan-400 ring-4 ring-cyan-400/40 scale-105 shadow-[0_0_20px_rgba(34,211,238,0.4)]'
                : 'bg-black/50 border-cyan-500/30'
            }`}>
              <div className="relative">
                <UserAvatar
                  photoUrl={room.players[2].photoURL}
                  name={room.players[2].name}
                  size="w-8 h-8 sm:w-9 sm:h-9"
                  ring={gameState.turnIndex === 2 ? 'ring-2 ring-cyan-300' : 'ring-1 ring-cyan-500/40'}
                />
                <span className="absolute -bottom-1 -right-2 bg-cyan-600 text-white font-extrabold text-[8px] px-1 rounded-full shadow-xs">
                  পার্টনার
                </span>
              </div>
              <span className="text-[10px] sm:text-xs font-bold text-slate-200 mt-1">
                {room.players[2].name} (নর্থ)
              </span>
              <span className="text-[9px] text-cyan-300 font-mono">
                {toBnNum(room.players[2].cards?.length || 0)} কার্ড
              </span>
            </div>
          ) : (
            <div className="p-2 border border-dashed border-slate-700 rounded-xl text-[10px] text-slate-500">
              নর্থ সিট ফাঁকা
            </div>
          )}
        </div>

        {/* Center Field: East & West + Trick Table */}
        <div className="relative z-10 flex items-center justify-between my-auto px-1 sm:px-4">
          {/* Left Player (West - Team 2) */}
          <div className="flex flex-col items-center">
            {room.players?.[3] ? (
              <div className={`flex flex-col items-center px-2.5 py-1.5 rounded-2xl border transition-all duration-300 shadow-md ${
                gameState.turnIndex === 3
                  ? 'bg-gradient-to-b from-amber-950/80 to-slate-900/90 border-amber-400 ring-4 ring-amber-400/40 scale-105 shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                  : 'bg-black/50 border-amber-500/30'
              }`}>
                <div className="relative">
                  <UserAvatar
                    photoUrl={room.players[3].photoURL}
                    name={room.players[3].name}
                    size="w-8 h-8 sm:w-9 sm:h-9"
                    ring={gameState.turnIndex === 3 ? 'ring-2 ring-amber-300' : 'ring-1 ring-amber-500/40'}
                  />
                  <span className="absolute -bottom-1 -right-2 bg-amber-600 text-white font-extrabold text-[8px] px-1 rounded-full shadow-xs">
                    প্রতিপক্ষ
                  </span>
                </div>
                <span className="text-[10px] sm:text-xs font-bold text-slate-200 mt-1 truncate max-w-[65px]">
                  {room.players[3].name}
                </span>
                <span className="text-[9px] text-amber-300 font-mono">
                  {toBnNum(room.players[3].cards?.length || 0)} কার্ড
                </span>
              </div>
            ) : (
              <div className="p-2 border border-dashed border-slate-700 rounded-xl text-[10px] text-slate-500">
                ওয়েস্ট ফাঁকা
              </div>
            )}
          </div>

          {/* Central Trick Arena */}
          <div className="flex flex-col items-center justify-center p-3 rounded-3xl bg-slate-950/80 backdrop-blur-md border border-amber-500/30 min-w-[170px] sm:min-w-[240px] text-center space-y-2 shadow-[0_15px_35px_rgba(0,0,0,0.8)]">
            {/* Ornate Trump Box */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-950/70 via-slate-900 to-amber-950/70 border border-amber-400/60 shadow-inner">
              <span className="text-[10px] font-bold text-amber-300">তুরুপ (Trump):</span>
              {gameState.trumpCard ? (
                gameState.isTrumpRevealed ? (
                  <span className="text-xs font-black text-rose-400 flex items-center gap-1 drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]">
                    {SUIT_NAMES[gameState.trumpSuit]} {SUIT_SYMBOLS[gameState.trumpSuit]}
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-300/80 font-mono bg-black/40 px-1.5 py-0.5 rounded border border-amber-500/30 flex items-center gap-1">
                    🔒 গোপন তুরুপ
                  </span>
                )
              ) : (
                <span className="text-[10px] text-slate-500">নির্বাচন হয়নি</span>
              )}

              {!gameState.isTrumpRevealed && gameState.trumpCard && (
                <button
                  type="button"
                  onClick={handleRevealTrump}
                  className="px-2 py-0.5 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-teal-950 text-[10px] font-black rounded-lg shadow-md transition cursor-pointer"
                >
                  উন্মোচন
                </button>
              )}
            </div>

            {/* Current Trick Cards with Directional/Staggered Placement */}
            <div className="flex items-center gap-1.5 min-h-[70px] justify-center relative py-1">
              {(gameState.currentTrick || []).length > 0 ? (
                gameState.currentTrick.map((play, idx) => {
                  const isWinningCard = gameState.resolvingTrick && gameState.trickWinnerIndex === play.playerIndex;
                  return (
                    <div
                      key={idx}
                      className={`flex flex-col items-center transition-all duration-300 transform ${
                        isWinningCard
                          ? 'scale-115 -translate-y-2 z-20 drop-shadow-[0_10px_15px_rgba(245,158,11,0.5)]'
                          : idx === 0
                          ? '-rotate-3'
                          : idx === 1
                          ? 'rotate-1'
                          : idx === 2
                          ? '-rotate-1'
                          : 'rotate-3'
                      }`}
                    >
                      <PlayingCard
                        card={play.card}
                        size="sm"
                        className={isWinningCard ? 'ring-2 ring-amber-400' : ''}
                      />
                      <span className={`text-[8px] mt-1 font-bold ${isWinningCard ? 'text-amber-300 drop-shadow-md' : 'text-slate-400'}`}>
                        {room.players?.[play.playerIndex]?.name}
                        {isWinningCard ? ' 👑' : ''}
                      </span>
                    </div>
                  );
                })
              ) : (
                <span className="text-[10px] text-slate-500 italic py-3 font-mono">
                  কার্ড চালার জন্য অপেক্ষা...
                </span>
              )}
            </div>

            {/* Resolution Banner */}
            {gameState.resolvingTrick && (
              <div className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-teal-950 font-black text-[10px] shadow-[0_5px_15px_rgba(245,158,11,0.5)] animate-bounce">
                🎉 {room.players?.[gameState.trickWinnerIndex]?.name} এই হাত জিতেছেন!
              </div>
            )}

            <p className="text-[10px] text-amber-200/90 font-medium">
              {gameState.lastAction || 'খেলার জন্য প্রস্তুত'}
            </p>
          </div>

          {/* Right Player (East - Team 2) */}
          <div className="flex flex-col items-center">
            {room.players?.[1] ? (
              <div className={`flex flex-col items-center px-2.5 py-1.5 rounded-2xl border transition-all duration-300 shadow-md ${
                gameState.turnIndex === 1
                  ? 'bg-gradient-to-b from-amber-950/80 to-slate-900/90 border-amber-400 ring-4 ring-amber-400/40 scale-105 shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                  : 'bg-black/50 border-amber-500/30'
              }`}>
                <div className="relative">
                  <UserAvatar
                    photoUrl={room.players[1].photoURL}
                    name={room.players[1].name}
                    size="w-8 h-8 sm:w-9 sm:h-9"
                    ring={gameState.turnIndex === 1 ? 'ring-2 ring-amber-300' : 'ring-1 ring-amber-500/40'}
                  />
                  <span className="absolute -bottom-1 -right-2 bg-amber-600 text-white font-extrabold text-[8px] px-1 rounded-full shadow-xs">
                    প্রতিপক্ষ
                  </span>
                </div>
                <span className="text-[10px] sm:text-xs font-bold text-slate-200 mt-1 truncate max-w-[65px]">
                  {room.players[1].name}
                </span>
                <span className="text-[9px] text-amber-300 font-mono">
                  {toBnNum(room.players[1].cards?.length || 0)} কার্ড
                </span>
              </div>
            ) : (
              <div className="p-2 border border-dashed border-slate-700 rounded-xl text-[10px] text-slate-500">
                ইস্ট ফাঁকা
              </div>
            )}
          </div>
        </div>

        {/* Bottom Player (South - Current User) */}
        <div className="relative z-10 flex flex-col items-center space-y-1.5">
          {/* My Cards */}
          {myPlayer && (
            <div className="flex flex-col items-center space-y-1">
              <span className={`text-[10px] font-bold ${isMyTurn ? 'text-amber-300 animate-pulse' : 'text-indigo-300'}`}>
                {isMyTurn ? '👉 আপনার চাল দিন' : `আপনার কার্ড (${myName} - সাউথ)`}:
              </span>
              <div className="flex items-center -space-x-3 sm:-space-x-4 flex-wrap justify-center py-2">
                {(myPlayer.cards || []).map((c, idx) => {
                  const total = (myPlayer.cards || []).length;
                  const mid = (total - 1) / 2;
                  const angle = total > 1 ? (idx - mid) * 3.5 : 0;
                  const yOffset = total > 1 ? Math.abs(idx - mid) * 2 : 0;
                  const canClick =
                    (phase === 'select_trump' && gameState.highestBidderIndex === myIndex) ||
                    (phase === 'playing' && isMyTurn);

                  return (
                    <div
                      key={idx}
                      style={{
                        transform: `rotate(${angle}deg) translateY(${yOffset}px)`,
                      }}
                      className={`transition-all duration-200 transform ${
                        canClick ? 'cursor-pointer hover:-translate-y-4 hover:scale-105 hover:z-20' : ''
                      }`}
                    >
                      <PlayingCard
                        card={c}
                        size="md"
                        onClick={() => {
                          if (phase === 'select_trump' && gameState.highestBidderIndex === myIndex) {
                            handleSelectTrump(c);
                          } else if (phase === 'playing' && isMyTurn) {
                            handlePlayCard(c);
                          }
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Waiting or Setup Controls */}
          {phase === 'waiting' && (
            <div className="text-center pt-1">
              {isHost ? (
                <button
                  type="button"
                  onClick={handleStartHand}
                  disabled={(room.players || []).length !== 4}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Play size={14} />
                  কার্ড বণ্টন ও খেলা শুরু (৪ জন প্লেয়ার)
                </button>
              ) : (
                <span className="text-xs text-amber-300 italic">
                  হোস্ট খেলা শুরু করার জন্য অপেক্ষা করুন...
                </span>
              )}
            </div>
          )}

          {/* Bidding Controls Modal/Pill */}
          {phase === 'bidding' && isMyBidTurn && (
            <div className="flex items-center gap-1.5 p-2 bg-slate-900 border border-amber-400/80 rounded-2xl shadow-xl animate-in fade-in duration-150">
              <span className="text-xs font-bold text-amber-300">আপনার ডাক (Bid):</span>
              <button
                type="button"
                onClick={() => handleBid('pass')}
                className="px-3 py-1.5 bg-red-950 text-red-300 border border-red-800 rounded-xl text-xs font-bold hover:bg-red-900 cursor-pointer"
              >
                পাস
              </button>
              {[16, 17, 18, 19, 20, 21].map((b) => (
                <button
                  key={b}
                  type="button"
                  disabled={b <= (gameState.highestBid || 15)}
                  onClick={() => handleBid(b)}
                  className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white font-bold text-xs rounded-xl cursor-pointer"
                >
                  {toBnNum(b)}
                </button>
              ))}
            </div>
          )}

          {/* Trump Selection Prompt */}
          {phase === 'select_trump' && gameState.highestBidderIndex === myIndex && (
            <div className="px-3 py-1.5 bg-amber-500/20 border border-amber-400 rounded-xl text-amber-300 text-xs font-bold animate-pulse text-center">
              👉 আপনার হাতের কার্ডগুলো থেকে যেকোনো একটিতে ক্লিক করে গোপন তুরুপ (Trump) নির্বাচন করুন!
            </div>
          )}
        </div>
      </div>

      {/* Last Trick Review Modal */}
      {showLastTrickModal && gameState.lastTrick && (
        <div
          onClick={() => setShowLastTrickModal(false)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-700 rounded-3xl p-4 max-w-sm w-full space-y-3 text-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-1.5 font-bold text-sm text-indigo-300">
                <History size={16} />
                <span>পূর্ববর্তী হাত (Last Trick)</span>
              </div>
              <button
                type="button"
                onClick={() => setShowLastTrickModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex items-center justify-center gap-2 py-3">
              {(gameState.lastTrick.cards || []).map((c, i) => (
                <div key={i} className="flex flex-col items-center">
                  <PlayingCard card={c.card} size="sm" />
                  <span className="text-[9px] text-slate-300 mt-1">
                    {room.players?.[c.playerIndex]?.name}
                  </span>
                </div>
              ))}
            </div>

            <div className="p-2.5 rounded-xl bg-indigo-950/60 border border-indigo-700/60 text-center text-xs">
              <p className="font-bold text-amber-300">
                জয়ী: {gameState.lastTrick.winnerName}
              </p>
              <p className="text-[11px] text-slate-300 mt-0.5">
                অর্জিত পয়েন্ট: {toBnNum(gameState.lastTrick.points || 0)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
