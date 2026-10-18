import React, { useState } from 'react';
import PlayingCard, { SUIT_NAMES, SUIT_SYMBOLS } from './PlayingCard';
import {
  create29Deck,
  parse29Card,
  determineTrickWinner,
  isMoveLegal,
} from './card29Logic';
import { shuffleDeck } from './pokerEvaluator';
import { updateGameRoom } from '../../services/tourStore';
import UserAvatar from '../UserAvatar';
import {
  Crown,
  Eye,
  LogOut,
  Play,
  RotateCcw,
  Shield,
  Trophy,
  Users,
} from 'lucide-react';

const toBnNum = (n) => String(n ?? 0).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);

export default function Card29Game({
  room,
  currentUser,
  currentProfile,
  onLeave,
}) {
  const myEmail = (currentUser?.email || '').toLowerCase();
  const myName = currentProfile?.displayName || currentUser?.displayName || 'খেলোয়াড়';

  const myIndex = (room.players || []).findIndex(
    (p) => (p.email || '').toLowerCase() === myEmail
  );
  const myPlayer = myIndex !== -1 ? room.players[myIndex] : null;
  const isHost = (room.hostEmail || '').toLowerCase() === myEmail;

  const gameState = room.state || {};
  const phase = gameState.phase || 'waiting'; // 'waiting' | 'bidding' | 'select_trump' | 'playing' | 'round_ended'
  const isMyTurn = phase === 'playing' && gameState.turnIndex === myIndex;
  const isMyBidTurn = phase === 'bidding' && gameState.bidTurnIndex === myIndex;

  // Local state for bidding input
  const [customBid, setCustomBid] = useState(16);

  // Start 29 Hand
  const handleStartHand = () => {
    if ((room.players || []).length !== 4) {
      alert('২৯ কার্ড গেম খেলতে ৪ জন খেলোয়াড় প্রয়োজন (২ জন বনাম ২ জন পার্টনারশিপ)!');
      return;
    }

    const deck = shuffleDeck(create29Deck());
    // Deal first 4 cards to each player
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
        currentTrick: [], // array of { playerIndex, card }
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

    const nextBidder = (gameState.bidTurnIndex + 1) % 4;
    const passes = bidVal === 'pass' ? (gameState.consecutivePasses || 0) + 1 : 0;
    const newHighestBid = bidVal === 'pass' ? gameState.highestBid : bidVal;
    const newHighestBidder = bidVal === 'pass' ? gameState.highestBidderIndex : myIndex;

    // If 3 players pass after at least 1 bid, or 4 pass
    if (passes >= 3 && newHighestBidder !== -1) {
      // Bidding finished! Highest bidder selects trump
      updateGameRoom(room.id, {
        state: {
          ...gameState,
          phase: 'select_trump',
          highestBid: newHighestBid,
          highestBidderIndex: newHighestBidder,
          lastAction: `${room.players[newHighestBidder].name} ${toBnNum(newHighestBid)} পয়েন্টে বিড জিতেছেন! এখন তুরুপ (Trump) নির্বাচন করুন।`,
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
        leadSuit: null,
        tricksPlayed: 0,
        lastAction: `${myName} তুরুপ নির্বাচন করেছেন এবং সবার মাঝে বাকি ৪টি কার্ড বণ্টন হয়েছে। খেলা শুরু!`,
      },
    });
  };

  // Play a card into the current trick
  const handlePlayCard = (cardStr) => {
    if (!isMyTurn) return;

    const currentTrick = gameState.currentTrick || [];
    const leadSuit = currentTrick.length === 0 ? parse29Card(cardStr).suit : gameState.leadSuit;

    // Validate move legality
    if (!isMoveLegal(cardStr, myPlayer.cards, gameState.leadSuit, gameState.isTrumpRevealed)) {
      alert(`আপনাকে অবশ্যই লিড স্যুটের (${SUIT_NAMES[gameState.leadSuit] || gameState.leadSuit}) কার্ড খেলতে হবে!`);
      return;
    }

    // Remove card from player hand
    const remainingCards = myPlayer.cards.filter((c) => c !== cardStr);
    const updatedPlayers = room.players.map((p, idx) =>
      idx === myIndex ? { ...p, cards: remainingCards } : p
    );

    const newTrick = [...currentTrick, { playerIndex: myIndex, card: cardStr }];

    // If trick is complete (4 cards played)
    if (newTrick.length === 4) {
      const trickResult = determineTrickWinner(
        newTrick,
        gameState.trumpSuit,
        gameState.isTrumpRevealed
      );
      const winnerIdx = trickResult.winnerIndex;
      const winnerPlayer = room.players[winnerIdx];
      const isTeam1 = winnerIdx === 0 || winnerIdx === 2;

      const tricksPlayed = (gameState.tricksPlayed || 0) + 1;
      let extraPoint = tricksPlayed === 8 ? 1 : 0; // 1 extra point for 8th trick

      const newTeam1Points = (gameState.team1Points || 0) + (isTeam1 ? trickResult.trickPoints + extraPoint : 0);
      const newTeam2Points = (gameState.team2Points || 0) + (!isTeam1 ? trickResult.trickPoints + extraPoint : 0);

      // Check if all 8 tricks are done
      if (tricksPlayed === 8) {
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
          players: updatedPlayers,
          status: 'round_ended',
          state: {
            ...gameState,
            phase: 'round_ended',
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
            lastAction: `৮ম হাত সম্পন্ন! রাউন্ড শেষ।`,
          },
        });
        return;
      }

      // Next trick starts with winner
      updateGameRoom(room.id, {
        players: updatedPlayers,
        state: {
          ...gameState,
          currentTrick: [],
          leadSuit: null,
          turnIndex: winnerIdx,
          tricksPlayed,
          team1Points: newTeam1Points,
          team2Points: newTeam2Points,
          lastAction: `${winnerPlayer.name} এই হাত জিতেছেন (${toBnNum(trickResult.trickPoints)} পয়েন্ট)।`,
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
    updateGameRoom(room.id, {
      state: {
        ...gameState,
        isTrumpRevealed: true,
        lastAction: `তুরুপ উন্মোচিত হয়েছে! তুরুপ স্যুট হলো: ${SUIT_NAMES[gameState.trumpSuit] || gameState.trumpSuit} (${SUIT_SYMBOLS[gameState.trumpSuit]})`,
      },
    });
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
            <div className="flex items-center gap-1.5">
              <h3 className="font-extrabold text-xs sm:text-sm text-indigo-300 truncate">
                {room.title || '২৯ কার্ড গেম টেবিল'}
              </h3>
              <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded border border-slate-700">
                {room.id}
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              টিম ১ (সাউথ-নর্থ): {toBnNum(gameState.team1Points || 0)} পয়েন্ট • টিম ২ (ইস্ট-ওয়েস্ট): {toBnNum(gameState.team2Points || 0)} পয়েন্ট
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onLeave}
          className="px-2.5 py-1 bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800/80 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
        >
          <LogOut size={13} />
          <span className="hidden sm:inline">বের হন</span>
        </button>
      </div>

      {/* 2. Playing Arena (4-Seat Cross Partnership Table) */}
      <div className="flex-1 min-h-[380px] p-2 sm:p-4 flex flex-col justify-between relative bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-950 via-slate-900 to-slate-950 overflow-hidden">
        {/* Table Oval Border */}
        <div className="absolute inset-2 sm:inset-4 rounded-[40px] sm:rounded-[60px] border-4 border-indigo-500/20 pointer-events-none shadow-[inset_0_0_80px_rgba(0,0,0,0.8)]" />

        {/* Top Player (North - Partner of South) */}
        <div className="relative z-10 flex flex-col items-center">
          {room.players?.[2] ? (
            <div className="flex flex-col items-center p-1.5 bg-black/40 rounded-xl border border-white/10">
              <UserAvatar
                photoUrl={room.players[2].photoURL}
                name={room.players[2].name}
                size="w-7 h-7 sm:w-8 sm:h-8"
              />
              <span className="text-[10px] font-bold text-slate-200 mt-0.5">
                {room.players[2].name} (নর্থ)
              </span>
              <span className="text-[9px] text-indigo-300">
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
          {/* Left Player (West) */}
          <div className="flex flex-col items-center">
            {room.players?.[3] ? (
              <div className="flex flex-col items-center p-1.5 bg-black/40 rounded-xl border border-white/10">
                <UserAvatar
                  photoUrl={room.players[3].photoURL}
                  name={room.players[3].name}
                  size="w-7 h-7 sm:w-8 sm:h-8"
                />
                <span className="text-[10px] font-bold text-slate-200 mt-0.5 truncate max-w-[60px]">
                  {room.players[3].name}
                </span>
                <span className="text-[9px] text-indigo-300">
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
          <div className="flex flex-col items-center justify-center p-2 rounded-2xl bg-black/40 border border-white/10 min-w-[160px] sm:min-w-[220px] text-center space-y-1.5">
            {/* Trump Box */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700">
              <span className="text-[10px] font-bold text-amber-300">তুরুপ (Trump):</span>
              {gameState.trumpCard ? (
                gameState.isTrumpRevealed ? (
                  <span className="text-xs font-black text-rose-400">
                    {SUIT_NAMES[gameState.trumpSuit]} {SUIT_SYMBOLS[gameState.trumpSuit]}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 italic">গোপন 🔒</span>
                )
              ) : (
                <span className="text-[10px] text-slate-500">নির্বাচন হয়নি</span>
              )}

              {!gameState.isTrumpRevealed && gameState.trumpCard && (
                <button
                  type="button"
                  onClick={handleRevealTrump}
                  className="px-1.5 py-0.2 bg-amber-500 text-teal-950 text-[9px] font-bold rounded hover:bg-amber-400 transition cursor-pointer"
                >
                  উন্মোচন
                </button>
              )}
            </div>

            {/* Current Trick Cards */}
            <div className="flex items-center gap-1 min-h-[60px] justify-center">
              {(gameState.currentTrick || []).length > 0 ? (
                gameState.currentTrick.map((play, idx) => (
                  <div key={idx} className="flex flex-col items-center">
                    <PlayingCard card={play.card} size="sm" />
                    <span className="text-[8px] text-slate-400 mt-0.5">
                      {room.players?.[play.playerIndex]?.name}
                    </span>
                  </div>
                ))
              ) : (
                <span className="text-[10px] text-slate-500 italic py-3">
                  কার্ড চালার জন্য অপেক্ষা...
                </span>
              )}
            </div>

            <p className="text-[10px] text-amber-200/90 font-medium">
              {gameState.lastAction || 'খেলার জন্য প্রস্তুত'}
            </p>
          </div>

          {/* Right Player (East) */}
          <div className="flex flex-col items-center">
            {room.players?.[1] ? (
              <div className="flex flex-col items-center p-1.5 bg-black/40 rounded-xl border border-white/10">
                <UserAvatar
                  photoUrl={room.players[1].photoURL}
                  name={room.players[1].name}
                  size="w-7 h-7 sm:w-8 sm:h-8"
                />
                <span className="text-[10px] font-bold text-slate-200 mt-0.5 truncate max-w-[60px]">
                  {room.players[1].name}
                </span>
                <span className="text-[9px] text-indigo-300">
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
              <span className="text-[10px] font-bold text-indigo-300">
                আপনার কার্ড ({myName} - সাউথ):
              </span>
              <div className="flex items-center -space-x-3 sm:-space-x-4 flex-wrap justify-center">
                {(myPlayer.cards || []).map((c, idx) => (
                  <PlayingCard
                    key={idx}
                    card={c}
                    size="md"
                    onClick={() => {
                      if (phase === 'select_trump' && gameState.highestBidderIndex === myIndex) {
                        handleSelectTrump(c);
                      } else if (phase === 'playing' && isMyTurn) {
                        handlePlayCard(c);
                      }
                    }}
                    className={
                      (phase === 'select_trump' && gameState.highestBidderIndex === myIndex) ||
                      (phase === 'playing' && isMyTurn)
                        ? 'cursor-pointer hover:-translate-y-3'
                        : ''
                    }
                  />
                ))}
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
    </div>
  );
}
