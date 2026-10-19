import React, { useState, useEffect, useMemo } from 'react';
import ChessPieceSvg from './ChessPieceSvg';
import {
  INITIAL_CHESS_BOARD,
  INITIAL_CHESS_FLAT,
  serializeBoard,
  deserializeBoard,
  getColor,
  getType,
  getLegalMoves,
  getCastlingRightsFromHistory,
  executeMove,
  findKing,
  isInCheck,
  FILES,
  RANKS,
} from './chessLogic';
import { getBestMove } from './chessAi';
import { updateGameRoom } from '../../services/tourStore';
import { gameAudio } from '../../utils/gameAudio';
import { triggerHaptic } from '../../utils/haptics';
import GameReactions from './GameReactions';
import GameTurnTimer from './GameTurnTimer';
import UserAvatar from '../UserAvatar';
import {
  ArrowLeft,
  Award,
  Bot,
  Crown,
  Flag,
  RotateCcw,
  Smartphone,
  Sparkles,
  Swords,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';

const toBnNum = (n) => String(n ?? 0).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);

const DIFFICULTY_CONFIG = {
  easy: { label: 'সহজ', desc: 'শিশু ও শিক্ষানবিস', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  medium: { label: 'মাঝারি', desc: 'কৌশলগত খেলা', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  hard: { label: 'কঠিন', desc: 'মাস্টার অ্যালগরিদম', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
};

export default function ChessGame({
  room,
  currentUser = null,
  currentProfile = {},
  onLeave,
}) {
  const [selectedCoord, setSelectedCoord] = useState(null); // { r, c }
  const [flipBoard, setFlipBoard] = useState(false);
  const [difficulty, setDifficulty] = useState('medium'); // 'easy' | 'medium' | 'hard'
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [localOverride, setLocalOverride] = useState(null);

  const myEmail = (currentUser?.email || '').toLowerCase();
  const myName = currentProfile?.displayName || currentUser?.displayName || 'খেলোয়াড়';

  const players = room?.players || [];
  const whitePlayer = players[0] || null;
  const blackPlayer = players[1] || null;

  // Default mode: if 1 player in room, enable AI bot by default so play is instantaneous!
  const [playMode, setPlayMode] = useState(players.length >= 2 ? 'online' : 'ai');

  const isWhite = whitePlayer && (whitePlayer.email || '').toLowerCase() === myEmail;
  const isBlack = blackPlayer && (blackPlayer.email || '').toLowerCase() === myEmail;
  const myColor = isWhite ? 'w' : isBlack ? 'b' : (playMode === 'ai' ? 'w' : null);

  // Active state: prefer local override if present, else room state
  const activeState = localOverride || room?.state || {};

  const board = useMemo(() => {
    return deserializeBoard(activeState.board);
  }, [activeState.board]);

  const turn = activeState.turn || 'w';
  const status = activeState.status || 'waiting'; // 'waiting', 'active', 'checkmate', 'stalemate', 'resigned'
  const winner = activeState.winner || null;
  const lastMove = activeState.lastMove || null;
  const history = activeState.history || [];
  const captured = activeState.captured || { w: [], b: [] };

  const isGameOver = status === 'checkmate' || status === 'stalemate' || status === 'resigned';

  // Determine whose turn it is from user's perspective
  const isMyTurn = useMemo(() => {
    if (isGameOver) return false;
    if (playMode === 'ai') {
      return turn === 'w' && !isAiThinking;
    }
    if (playMode === 'pass_play') {
      return true;
    }
    // Online multiplayer
    return myColor === turn && (status === 'active' || (status === 'waiting' && players.length >= 2));
  }, [isGameOver, playMode, turn, isAiThinking, myColor, status, players.length]);

  const [isMuted, setIsMuted] = useState(gameAudio.getMuted());

  // Sound cue on turn
  useEffect(() => {
    if (isMyTurn && !isGameOver) {
      gameAudio.playTurn();
      triggerHaptic('light');
    }
  }, [isMyTurn, isGameOver]);

  // Determine if King is in check
  const kingInCheck = useMemo(() => {
    return {
      w: isInCheck(board, 'w'),
      b: isInCheck(board, 'b'),
    };
  }, [board]);

  // Determine legal pieces current player can pick
  const selectableColor = useMemo(() => {
    if (playMode === 'ai') return 'w';
    if (playMode === 'pass_play') return turn;
    return myColor;
  }, [playMode, turn, myColor]);

  // Calculate legal moves for selected piece
  const legalMoves = useMemo(() => {
    if (!selectedCoord) return [];
    if (!isMyTurn) return [];
    const piece = board[selectedCoord.r][selectedCoord.c];
    if (!piece || getColor(piece) !== selectableColor) return [];
    const rights = getCastlingRightsFromHistory(history);
    return getLegalMoves(board, selectedCoord.r, selectedCoord.c, rights);
  }, [selectedCoord, board, isMyTurn, selectableColor, history]);

  // Push state to room (safely handles offline/single player)
  const syncGameState = async (nextState, newStatus) => {
    setLocalOverride(nextState);
    if (room?.id) {
      try {
        await updateGameRoom(room.id, {
          status: newStatus,
          state: {
            ...(room.state || {}),
            ...nextState,
          },
        });
      } catch (err) {
        console.warn('GameZone: room state synced locally (offline resilient):', err);
      }
    }
  };

  // AI Automatic Move Execution Loop
  useEffect(() => {
    if (playMode !== 'ai') return;
    if (turn !== 'b') return;
    if (isGameOver) return;

    setIsAiThinking(true);
    const delay = difficulty === 'hard' ? 450 : difficulty === 'medium' ? 350 : 250;

    const timer = setTimeout(async () => {
      try {
        const bestMove = getBestMove(board, 'b', difficulty, history);
        if (!bestMove) {
          setIsAiThinking(false);
          return;
        }

        const moveResult = executeMove(board, bestMove.fromR, bestMove.fromC, bestMove.toR, bestMove.toC);
        if (!moveResult) {
          setIsAiThinking(false);
          return;
        }

        // Sound cues for AI moves
        if (moveResult.isCheckmate) {
          gameAudio.playWin();
          triggerHaptic('heavy');
        } else if (moveResult.inCheck) {
          gameAudio.playCheck();
          triggerHaptic('medium');
        } else if (moveResult.capturedPiece) {
          gameAudio.playCapture();
          triggerHaptic('medium');
        } else {
          gameAudio.playCard();
          triggerHaptic('light');
        }

        let newStatus = 'active';
        let newWinner = null;
        if (moveResult.isCheckmate) {
          newStatus = 'checkmate';
          newWinner = 'b';
        } else if (moveResult.isStalemate) {
          newStatus = 'stalemate';
          newWinner = 'draw';
        }

        const newCaptured = { ...captured };
        if (moveResult.capturedPiece) {
          const capColor = getColor(moveResult.capturedPiece);
          newCaptured[capColor] = [...(newCaptured[capColor] || []), moveResult.capturedPiece];
        }

        const newHistory = [
          ...history,
          {
            turn: 'b',
            from: moveResult.fromSq,
            to: moveResult.toSq,
            notation: moveResult.notation,
            player: `🤖 রোবট (${DIFFICULTY_CONFIG[difficulty]?.label || 'মাঝারি'})`,
          },
        ];

        const nextState = {
          board: serializeBoard(moveResult.board),
          turn: 'w',
          status: newStatus,
          winner: newWinner,
          lastMove: { fromR: bestMove.fromR, fromC: bestMove.fromC, toR: bestMove.toR, toC: bestMove.toC },
          history: newHistory,
          captured: newCaptured,
          lastAction: `🤖 রোবট চাল দিল: ${moveResult.notation}`,
        };

        await syncGameState(nextState, newStatus);
      } finally {
        setIsAiThinking(false);
      }
    }, delay + Math.floor(Math.random() * 200));

    return () => clearTimeout(timer);
  }, [playMode, turn, isGameOver, board, difficulty, history, captured]);

  // Handle Square Click
  const handleSquareClick = async (r, c) => {
    if (isGameOver) return;
    if (playMode === 'ai' && isAiThinking) return;
    if (!isMyTurn) return;

    const clickedPiece = board[r][c];

    // If already selected a piece, check if clicked square is a legal move
    if (selectedCoord) {
      const isTargetLegal = legalMoves.some((m) => m.r === r && m.c === c);

      if (isTargetLegal) {
        // Execute the move
        const moveResult = executeMove(board, selectedCoord.r, selectedCoord.c, r, c);
        if (!moveResult) return;

        // Sound cues for human actions
        if (moveResult.isCheckmate) {
          gameAudio.playWin();
          triggerHaptic('heavy');
        } else if (moveResult.inCheck) {
          gameAudio.playCheck();
          triggerHaptic('medium');
        } else if (moveResult.capturedPiece) {
          gameAudio.playCapture();
          triggerHaptic('medium');
        } else {
          gameAudio.playCard();
          triggerHaptic('light');
        }

        const nextTurn = turn === 'w' ? 'b' : 'w';
        const newCaptured = { ...captured };
        if (moveResult.capturedPiece) {
          const capColor = getColor(moveResult.capturedPiece);
          newCaptured[capColor] = [...(newCaptured[capColor] || []), moveResult.capturedPiece];
        }

        const moverName =
          playMode === 'pass_play'
            ? turn === 'w'
              ? 'খেলোয়াড় ১ (সাদা)'
              : 'খেলোয়াড় ২ (কালো)'
            : myName;

        const newHistory = [
          ...history,
          {
            turn,
            from: moveResult.fromSq,
            to: moveResult.toSq,
            notation: moveResult.notation,
            player: moverName,
          },
        ];

        let newStatus = 'active';
        let newWinner = null;

        if (moveResult.isCheckmate) {
          newStatus = 'checkmate';
          newWinner = turn; // Current player wins
        } else if (moveResult.isStalemate) {
          newStatus = 'stalemate';
          newWinner = 'draw';
        }

        setSelectedCoord(null);

        const nextState = {
          board: serializeBoard(moveResult.board),
          turn: nextTurn,
          status: newStatus,
          winner: newWinner,
          lastMove: { fromR: selectedCoord.r, fromC: selectedCoord.c, toR: r, toC: c },
          history: newHistory,
          captured: newCaptured,
          lastAction: `${moverName} চাল দিল: ${moveResult.notation}`,
        };

        await syncGameState(nextState, newStatus);
        return;
      }
    }

    // Select piece if it belongs to current player's selectable color
    if (clickedPiece && getColor(clickedPiece) === selectableColor) {
      setSelectedCoord({ r, c });
    } else {
      setSelectedCoord(null);
    }
  };

  // Resign handler
  const handleResign = async () => {
    if (!window.confirm('আপনি কি নিশ্চিত যে পদত্যাগ (Resign) করতে চান?')) return;
    const opponentColor = turn === 'w' ? 'b' : 'w';
    const nextState = {
      ...(room?.state || {}),
      status: 'resigned',
      winner: opponentColor,
      lastAction: `${myName} পদত্যাগ করেছেন।`,
    };
    await syncGameState(nextState, 'resigned');
  };

  // Rematch / Reset handler
  const handleRematch = async () => {
    const nextState = {
      board: INITIAL_CHESS_FLAT,
      turn: 'w',
      status: 'active',
      winner: null,
      lastMove: null,
      history: [],
      captured: { w: [], b: [] },
      lastAction: 'নতুন খেলা শুরু হয়েছে! সাদার প্রথম চাল।',
    };
    setSelectedCoord(null);
    await syncGameState(nextState, 'active');
  };

  // Calculate board display order based on orientation
  const isBoardFlipped = flipBoard || (playMode === 'online' && isBlack);
  const rows = isBoardFlipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const cols = isBoardFlipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

  // Active top & bottom players based on orientation
  const topColor = isBoardFlipped ? 'w' : 'b';
  const bottomColor = isBoardFlipped ? 'b' : 'w';

  return (
    <div className="flex-1 flex flex-col max-w-lg mx-auto w-full space-y-2.5 pb-8">
      {/* 1. Header Bar */}
      <div className="bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl border border-slate-800 shadow-md flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={onLeave}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="লবিতে ফিরে যান"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-base font-black text-amber-300">♟️ দাবার আসর</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-amber-400/20 text-amber-300 rounded border border-amber-400/30">
                {room.id}
              </span>
              {isMyTurn && playMode === 'online' && (
                <GameTurnTimer isMyTurn={isMyTurn} duration={60} turnKey={`${turn}_${history.length}`} />
              )}
            </div>
            <p className="text-[11px] text-slate-400 truncate max-w-[170px] sm:max-w-xs">
              {playMode === 'ai' ? 'বট চ্যালেঞ্জ (Solo AI)' : playMode === 'pass_play' ? 'এক ফোনে ২ জন (Pass & Play)' : room.title || 'অনলাইন দাবা ম্যাচ'}
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

          {/* Flip Board */}
          <button
            onClick={() => setFlipBoard(!flipBoard)}
            className="p-1.5 sm:px-2 sm:py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 flex items-center gap-1"
            title="বোর্ড ঘোরান"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">ঘোরান</span>
          </button>

          {/* Resign Button */}
          {!isGameOver && (
            <button
              onClick={handleResign}
              className="p-1.5 sm:px-2 sm:py-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold border border-rose-500/30 flex items-center gap-1"
              title="পদত্যাগ"
            >
              <Flag className="w-4 h-4" />
              <span className="hidden sm:inline">পদত্যাগ</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Play Mode & AI Difficulty Controls */}
      <div className="bg-slate-800/80 p-2 rounded-2xl border border-slate-700/70 shadow-sm flex flex-col gap-2">
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1 overflow-x-auto py-0.5">
            <button
              onClick={() => setPlayMode('ai')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                playMode === 'ai'
                  ? 'bg-amber-400 text-slate-950 shadow-md font-extrabold'
                  : 'bg-slate-900/60 text-slate-300 hover:bg-slate-700/60'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>রোবট (AI)</span>
            </button>

            <button
              onClick={() => setPlayMode('pass_play')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                playMode === 'pass_play'
                  ? 'bg-teal-400 text-slate-950 shadow-md font-extrabold'
                  : 'bg-slate-900/60 text-slate-300 hover:bg-slate-700/60'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>এক ফোনে ২ জন</span>
            </button>

            <button
              onClick={() => setPlayMode('online')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                playMode === 'online'
                  ? 'bg-indigo-400 text-slate-950 shadow-md font-extrabold'
                  : 'bg-slate-900/60 text-slate-300 hover:bg-slate-700/60'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>অনলাইন ({toBnNum(players.length)}/২)</span>
            </button>
          </div>

          <button
            onClick={handleRematch}
            className="px-2 py-1 rounded-xl bg-slate-900/70 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 flex items-center gap-1 shrink-0"
            title="নতুন ম্যাচ শুরু করুন"
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span className="hidden sm:inline">রিসেট</span>
          </button>
        </div>

        {/* AI Difficulty Selector (Visible when AI mode is active) */}
        {playMode === 'ai' && (
          <div className="flex items-center justify-between pt-1 border-t border-slate-700/50 text-[11px]">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" /> বটের লেভেল:
            </span>
            <div className="flex items-center gap-1">
              {['easy', 'medium', 'hard'].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setDifficulty(lvl)}
                  className={`px-2 py-0.5 rounded-lg font-bold border transition ${
                    difficulty === lvl
                      ? DIFFICULTY_CONFIG[lvl].color + ' shadow-sm'
                      : 'bg-slate-900/40 text-slate-400 border-transparent hover:text-slate-200'
                  }`}
                >
                  {DIFFICULTY_CONFIG[lvl].label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. Winner / Game Over Alert Banner */}
      {isGameOver && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-slate-950 font-black shadow-lg flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2.5">
            <Trophy className="w-6 h-6 text-yellow-200 shrink-0 animate-bounce" />
            <div>
              <div className="text-sm font-extrabold">
                {status === 'checkmate' && `চেকমেট! ${winner === 'w' ? 'সাদা' : 'কালো'} বিজয়ী! 🏆`}
                {status === 'resigned' && `খেলা সমাপ্ত! ${winner === 'w' ? 'সাদা' : 'কালো'} বিজয়ী (প্রতিপক্ষ পদত্যাগ করেছেন)।`}
                {status === 'stalemate' && 'ড্র! স্টেলমেট হয়েছে (কোনো চাল নেই)। 🤝'}
              </div>
              <div className="text-[11px] opacity-90 font-medium">
                অভিনন্দন! অসাধারণ একটি খেলা উপহার দেওয়ার জন্য।
              </div>
            </div>
          </div>
          <button
            onClick={handleRematch}
            className="px-3 py-1.5 rounded-xl bg-slate-950 text-amber-300 text-xs font-bold shadow hover:bg-slate-900 shrink-0"
          >
            নতুন খেলা
          </button>
        </div>
      )}

      {/* 4. Turn & Status Sub-header */}
      <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span
            className={`w-3.5 h-3.5 rounded-full border ${
              turn === 'w'
                ? 'bg-white border-slate-300 shadow-[0_0_8px_rgba(255,255,255,0.8)]'
                : 'bg-slate-950 border-slate-600 shadow-[0_0_8px_rgba(0,0,0,0.8)]'
            }`}
          />
          <span className="font-bold text-slate-200">
            {turn === 'w' ? 'সাদার চাল (White)' : 'কালোর চাল (Black)'}
          </span>
          {isMyTurn && !isGameOver && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-extrabold text-[10px] border border-emerald-500/40 animate-pulse">
              আপনার চাল!
            </span>
          )}
          {isAiThinking && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-extrabold text-[10px] border border-amber-500/40 animate-pulse flex items-center gap-1">
              <Bot className="w-3 h-3 animate-spin" /> বট ভাবছে...
            </span>
          )}
        </div>

        {kingInCheck[turn] && !isGameOver && (
          <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white font-extrabold text-[10px] animate-bounce shadow">
            ⚠️ চেক! রাজা বিপদে!
          </span>
        )}
      </div>

      {/* 5. Top Player Card (Opponent or AI) */}
      <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            {playMode === 'ai' ? (
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-600 to-indigo-600 flex items-center justify-center text-lg shadow">
                🤖
              </div>
            ) : playMode === 'pass_play' ? (
              <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-200 shadow">
                খ-২
              </div>
            ) : (
              <UserAvatar
                user={{ displayName: (topColor === 'w' ? whitePlayer : blackPlayer)?.name || 'অপেক্ষা করা হচ্ছে...' }}
                photoURL={(topColor === 'w' ? whitePlayer : blackPlayer)?.photoURL}
                size="w-9 h-9"
              />
            )}
            <span
              className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border border-slate-900 ${
                topColor === 'w' ? 'bg-white' : 'bg-slate-950'
              }`}
            />
          </div>
          <div>
            <div className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
              <span>
                {playMode === 'ai'
                  ? `এআই রোবট (${DIFFICULTY_CONFIG[difficulty]?.label})`
                  : playMode === 'pass_play'
                    ? topColor === 'w'
                      ? 'খেলোয়াড় ১ (সাদা)'
                      : 'খেলোয়াড় ২ (কালো)'
                    : (topColor === 'w' ? whitePlayer : blackPlayer)?.name || 'অনলাইন খেলোয়াড়ের অপেক্ষায়...'}
              </span>
              {playMode === 'ai' && (
                <span className="text-[9px] px-1.5 py-0.2 bg-amber-400/20 text-amber-300 rounded font-semibold">
                  BOT
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-400">
              {topColor === 'w' ? 'সাদা গুটি (White)' : 'কালো গুটি (Black)'}
              {playMode === 'ai' && isAiThinking && ' • চাল গণনা চলছে...'}
            </div>
          </div>
        </div>

        {/* Captured by Top Player */}
        <div className="flex items-center gap-0.5 max-w-[120px] overflow-x-auto py-0.5">
          {(captured[topColor === 'w' ? 'b' : 'w'] || []).map((p, idx) => (
            <div key={idx} className="w-5 h-5 shrink-0 opacity-80">
              <ChessPieceSvg piece={p} />
            </div>
          ))}
        </div>
      </div>

      {/* 6. The Chess Board with Luxury Tournament Wood Rim */}
      <div className="relative mx-auto w-full aspect-square max-w-[430px] bg-gradient-to-br from-stone-900 via-amber-950 to-stone-950 p-2.5 sm:p-3.5 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.85),inset_0_2px_4px_rgba(255,255,255,0.15)] border-4 border-amber-800/70 select-none">
        <div className="w-full h-full grid grid-cols-8 grid-rows-8 rounded-xl overflow-hidden border-2 border-stone-800/90 shadow-2xl">
          {rows.map((r) =>
            cols.map((c) => {
              const isDark = (r + c) % 2 === 1;
              const piece = board[r][c];
              const isSelected = selectedCoord && selectedCoord.r === r && selectedCoord.c === c;
              const isLegal = legalMoves.some((m) => m.r === r && m.c === c);
              const isLastMoveFrom = lastMove && lastMove.fromR === r && lastMove.fromC === c;
              const isLastMoveTo = lastMove && lastMove.toR === r && lastMove.toC === c;
              const isKingChecked =
                piece &&
                getType(piece) === 'K' &&
                kingInCheck[getColor(piece)];

              // Base square colors (rich tournament emerald & maple buff with subtle gradient)
              let squareBg = isDark
                ? 'bg-gradient-to-br from-[#779556] to-[#637d45]'
                : 'bg-gradient-to-br from-[#f2f3df] to-[#e4e5ce]';

              if (isSelected) {
                squareBg = 'bg-gradient-to-br from-[#c9db4d] to-[#b3c437] ring-2 ring-amber-400 ring-inset shadow-[inset_0_0_12px_rgba(245,158,11,0.5)]';
              } else if (isLastMoveFrom || isLastMoveTo) {
                squareBg = isDark ? 'bg-[#b6c747]' : 'bg-[#e9ebb2]';
              } else if (isKingChecked) {
                squareBg = 'bg-gradient-to-br from-rose-600 to-red-700 text-white animate-pulse shadow-[inset_0_0_15px_rgba(225,29,72,0.8)]';
              }

              return (
                <div
                  key={`${r}-${c}`}
                  onClick={() => handleSquareClick(r, c)}
                  className={`relative flex items-center justify-center cursor-pointer transition-colors duration-150 ${squareBg}`}
                >
                  {/* File & Rank Coordinates for outer edges */}
                  {(isBoardFlipped ? r === 0 : r === 7) && (
                    <span
                      className={`absolute bottom-0.5 right-1 text-[8px] font-black pointer-events-none select-none opacity-80 ${
                        isDark ? 'text-[#f2f3df]' : 'text-[#637d45]'
                      }`}
                    >
                      {FILES[c]}
                    </span>
                  )}
                  {(isBoardFlipped ? c === 7 : c === 0) && (
                    <span
                      className={`absolute top-0.5 left-1 text-[8px] font-black pointer-events-none select-none opacity-80 ${
                        isDark ? 'text-[#f2f3df]' : 'text-[#637d45]'
                      }`}
                    >
                      {RANKS[r]}
                    </span>
                  )}

                  {/* Piece */}
                  {piece && (
                    <div className="w-[86%] h-[86%] relative z-10 transition-transform hover:scale-105 active:scale-95 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                      <ChessPieceSvg piece={piece} />
                    </div>
                  )}

                  {/* Legal Move Indicators */}
                  {isLegal && !piece && (
                    <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-slate-900/30 border border-slate-900/40 shadow-inner pointer-events-none z-20 backdrop-blur-xs" />
                  )}
                  {isLegal && piece && (
                    <div className="absolute inset-1 rounded-full border-4 border-rose-500/80 shadow-[0_0_10px_rgba(244,63,94,0.5)] pointer-events-none z-20 animate-pulse" />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 7. Bottom Player Card (User) */}
      <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            {playMode === 'pass_play' ? (
              <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-200 shadow">
                খ-১
              </div>
            ) : (
              <UserAvatar
                user={{ displayName: (bottomColor === 'w' ? whitePlayer : blackPlayer)?.name || myName }}
                photoURL={(bottomColor === 'w' ? whitePlayer : blackPlayer)?.photoURL}
                size="w-9 h-9"
              />
            )}
            <span
              className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border border-slate-900 ${
                bottomColor === 'w' ? 'bg-white' : 'bg-slate-950'
              }`}
            />
          </div>
          <div>
            <div className="font-bold text-slate-200 text-xs">
              {playMode === 'pass_play'
                ? bottomColor === 'w'
                  ? 'খেলোয়াড় ১ (সাদা)'
                  : 'খেলোয়াড় ২ (কালো)'
                : `${myName} (আপনি)`}
            </div>
            <div className="text-[10px] text-slate-400">
              {bottomColor === 'w' ? 'সাদা গুটি (White)' : 'কালো গুটি (Black)'}
            </div>
          </div>
        </div>

        {/* Captured by Bottom Player */}
        <div className="flex items-center gap-0.5 max-w-[120px] overflow-x-auto py-0.5">
          {(captured[bottomColor === 'w' ? 'b' : 'w'] || []).map((p, idx) => (
            <div key={idx} className="w-5 h-5 shrink-0 opacity-80">
              <ChessPieceSvg piece={p} />
            </div>
          ))}
        </div>
      </div>

      {/* 8. Last Move & History Strip */}
      {history.length > 0 && (
        <div className="bg-slate-900/70 p-2.5 rounded-xl border border-slate-800 flex items-center gap-2 overflow-x-auto text-[11px] font-mono">
          <span className="text-slate-400 font-bold shrink-0">চালসমূহ:</span>
          {history.slice(-8).map((h, i) => (
            <span
              key={i}
              className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 shrink-0 border border-slate-700"
            >
              {h.notation}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
