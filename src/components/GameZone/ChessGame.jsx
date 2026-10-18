import React, { useState, useMemo } from 'react';
import ChessPieceSvg from './ChessPieceSvg';
import {
  INITIAL_CHESS_BOARD,
  getColor,
  getType,
  getLegalMoves,
  executeMove,
  findKing,
  isInCheck,
  FILES,
  RANKS,
} from './chessLogic';
import { updateGameRoom } from '../../services/tourStore';
import UserAvatar from '../UserAvatar';
import {
  ArrowLeft,
  Award,
  Crown,
  Flag,
  RotateCcw,
  Sparkles,
  Swords,
  Trophy,
  Users,
} from 'lucide-react';

const toBnNum = (n) => String(n ?? 0).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);

export default function ChessGame({
  room,
  currentUser = null,
  currentProfile = {},
  onLeave,
}) {
  const [selectedCoord, setSelectedCoord] = useState(null); // { r, c }
  const [flipBoard, setFlipBoard] = useState(false);

  const myEmail = (currentUser?.email || '').toLowerCase();
  const myName = currentProfile?.displayName || currentUser?.displayName || 'খেলোয়াড়';

  const players = room?.players || [];
  // Player 0 is White ('w'), Player 1 is Black ('b')
  const whitePlayer = players[0] || null;
  const blackPlayer = players[1] || null;

  const isWhite = whitePlayer && (whitePlayer.email || '').toLowerCase() === myEmail;
  const isBlack = blackPlayer && (blackPlayer.email || '').toLowerCase() === myEmail;
  const myColor = isWhite ? 'w' : isBlack ? 'b' : null;

  // Board state from Firestore or default to initial
  const board = room?.state?.board || INITIAL_CHESS_BOARD;
  const turn = room?.state?.turn || 'w'; // 'w' starts
  const status = room?.state?.status || 'waiting'; // 'waiting', 'active', 'checkmate', 'stalemate', 'resigned'
  const winner = room?.state?.winner || null; // 'w', 'b', 'draw'
  const lastMove = room?.state?.lastMove || null; // { fromR, fromC, toR, toC }
  const history = room?.state?.history || [];
  const captured = room?.state?.captured || { w: [], b: [] }; // w: white pieces captured by black, b: black pieces captured by white

  const isMyTurn = myColor === turn && (status === 'active' || (status === 'waiting' && players.length >= 2));

  // Determine if King is in check
  const kingInCheck = useMemo(() => {
    return {
      w: isInCheck(board, 'w'),
      b: isInCheck(board, 'b'),
    };
  }, [board]);

  // Calculate legal moves for selected piece
  const legalMoves = useMemo(() => {
    if (!selectedCoord) return [];
    if (!isMyTurn) return [];
    const piece = board[selectedCoord.r][selectedCoord.c];
    if (!piece || getColor(piece) !== myColor) return [];
    return getLegalMoves(board, selectedCoord.r, selectedCoord.c);
  }, [selectedCoord, board, isMyTurn, myColor]);

  // Handle Square Click
  const handleSquareClick = async (r, c) => {
    if (status === 'checkmate' || status === 'stalemate' || status === 'resigned') {
      return;
    }

    // Must have at least 2 players to play
    if (players.length < 2) {
      alert('খেলার জন্য অন্তত ২ জন খেলোয়াড় প্রয়োজন!');
      return;
    }

    if (!isMyTurn) return;

    const clickedPiece = board[r][c];

    // If already selected a piece, check if clicked square is a legal move
    if (selectedCoord) {
      const isTargetLegal = legalMoves.some((m) => m.r === r && m.c === c);

      if (isTargetLegal) {
        // Execute the move
        const moveResult = executeMove(board, selectedCoord.r, selectedCoord.c, r, c);
        if (!moveResult) return;

        const nextTurn = turn === 'w' ? 'b' : 'w';
        const newCaptured = { ...captured };
        if (moveResult.capturedPiece) {
          const capColor = getColor(moveResult.capturedPiece);
          newCaptured[capColor] = [...(newCaptured[capColor] || []), moveResult.capturedPiece];
        }

        const newHistory = [
          ...history,
          {
            turn,
            from: moveResult.fromSq,
            to: moveResult.toSq,
            notation: moveResult.notation,
            player: myName,
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

        await updateGameRoom(room.id, {
          status: newStatus,
          state: {
            ...room.state,
            board: moveResult.board,
            turn: nextTurn,
            status: newStatus,
            winner: newWinner,
            lastMove: { fromR: selectedCoord.r, fromC: selectedCoord.c, toR: r, toC: c },
            history: newHistory,
            captured: newCaptured,
            lastAction: `${myName} (${turn === 'w' ? 'সাদা' : 'কালো'}) চাল দিল: ${moveResult.notation}`,
          },
        });
        return;
      }
    }

    // Select piece if it belongs to current user
    if (clickedPiece && getColor(clickedPiece) === myColor) {
      setSelectedCoord({ r, c });
    } else {
      setSelectedCoord(null);
    }
  };

  // Resign handler
  const handleResign = async () => {
    if (!myColor) return;
    if (!window.confirm('আপনি কি নিশ্চিত যে পদত্যাগ (Resign) করতে চান?')) return;
    const opponentColor = myColor === 'w' ? 'b' : 'w';
    await updateGameRoom(room.id, {
      status: 'resigned',
      state: {
        ...room.state,
        status: 'resigned',
        winner: opponentColor,
        lastAction: `${myName} (${myColor === 'w' ? 'সাদা' : 'কালো'}) পদত্যাগ করেছেন।`,
      },
    });
  };

  // Rematch / Reset handler
  const handleRematch = async () => {
    await updateGameRoom(room.id, {
      status: 'active',
      state: {
        board: INITIAL_CHESS_BOARD,
        turn: 'w',
        status: 'active',
        winner: null,
        lastMove: null,
        history: [],
        captured: { w: [], b: [] },
        lastAction: 'নতুন খেলা শুরু হয়েছে! সাদার প্রথম চাল।',
      },
    });
    setSelectedCoord(null);
  };

  // Calculate board display order based on orientation
  // If playing Black or manual flip, display row 7 to 0 and col 7 to 0
  const isBoardFlipped = flipBoard || isBlack;
  const rows = isBoardFlipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const cols = isBoardFlipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

  // Active top & bottom players based on orientation
  const topPlayer = isBoardFlipped ? whitePlayer : blackPlayer;
  const topColor = isBoardFlipped ? 'w' : 'b';
  const bottomPlayer = isBoardFlipped ? blackPlayer : whitePlayer;
  const bottomColor = isBoardFlipped ? 'b' : 'w';

  return (
    <div className="flex-1 flex flex-col max-w-lg mx-auto w-full space-y-3 pb-8">
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
            <div className="flex items-center gap-1.5">
              <span className="text-base font-black text-amber-300">♟️ দাবার আসর</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-amber-400/20 text-amber-300 rounded border border-amber-400/30">
                {room.id}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate max-w-[180px] sm:max-w-xs">
              {room.title || 'অনলাইন দাবা ম্যাচ'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setFlipBoard(!flipBoard)}
            className="px-2 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 flex items-center gap-1"
            title="বোর্ড ঘোরান"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ঘোরান</span>
          </button>
          {myColor && status === 'active' && (
            <button
              onClick={handleResign}
              className="px-2 py-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold border border-rose-500/30 flex items-center gap-1"
            >
              <Flag className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">পদত্যাগ</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Winner / Game Over Alert Banner */}
      {(status === 'checkmate' || status === 'resigned' || status === 'stalemate') && (
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

      {/* 3. Turn & Status Sub-header */}
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
          {isMyTurn && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-extrabold text-[10px] border border-emerald-500/40 animate-pulse">
              আপনার চাল!
            </span>
          )}
        </div>

        {kingInCheck[turn] && status === 'active' && (
          <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white font-extrabold text-[10px] animate-bounce shadow">
            ⚠️ চেক! রাজা বিপদে!
          </span>
        )}
      </div>

      {/* 4. Top Player Card (Opponent) */}
      <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <UserAvatar
              user={{ displayName: topPlayer?.name || 'অপেক্ষা করা হচ্ছে...' }}
              photoURL={topPlayer?.photoURL}
              size="w-9 h-9"
            />
            <span
              className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border border-slate-900 ${
                topColor === 'w' ? 'bg-white' : 'bg-slate-950'
              }`}
            />
          </div>
          <div>
            <div className="font-bold text-slate-200 text-xs">
              {topPlayer?.name || 'খেলোয়াড়ের অপেক্ষায়...'}
            </div>
            <div className="text-[10px] text-slate-400">
              {topColor === 'w' ? 'সাদা গুটি (White)' : 'কালো গুটি (Black)'}
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

      {/* 5. The Chess Board */}
      <div className="relative mx-auto w-full aspect-square max-w-[420px] bg-slate-950 p-2 rounded-2xl shadow-2xl border-4 border-slate-800 select-none">
        <div className="w-full h-full grid grid-cols-8 grid-rows-8 rounded-lg overflow-hidden border border-slate-700/60">
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

              // Base square colors (wood/emerald theme)
              let squareBg = isDark ? 'bg-[#779556]' : 'bg-[#ebecd0]';

              if (isSelected) {
                squareBg = 'bg-[#baca44] ring-2 ring-amber-400 ring-inset';
              } else if (isLastMoveFrom || isLastMoveTo) {
                squareBg = isDark ? 'bg-[#baca44]' : 'bg-[#f5f682]';
              } else if (isKingChecked) {
                squareBg = 'bg-rose-500/90 animate-pulse';
              }

              return (
                <div
                  key={`${r}-${c}`}
                  onClick={() => handleSquareClick(r, c)}
                  className={`relative flex items-center justify-center cursor-pointer transition-colors ${squareBg}`}
                >
                  {/* File & Rank Coordinates for outer edges */}
                  {(isBoardFlipped ? r === 0 : r === 7) && (
                    <span
                      className={`absolute bottom-0.5 right-1 text-[8px] font-bold pointer-events-none select-none ${
                        isDark ? 'text-[#ebecd0]' : 'text-[#779556]'
                      }`}
                    >
                      {FILES[c]}
                    </span>
                  )}
                  {(isBoardFlipped ? c === 7 : c === 0) && (
                    <span
                      className={`absolute top-0.5 left-1 text-[8px] font-bold pointer-events-none select-none ${
                        isDark ? 'text-[#ebecd0]' : 'text-[#779556]'
                      }`}
                    >
                      {RANKS[r]}
                    </span>
                  )}

                  {/* Piece */}
                  {piece && (
                    <div className="w-[82%] h-[82%] relative z-10 transition-transform active:scale-95 drop-shadow">
                      <ChessPieceSvg piece={piece} />
                    </div>
                  )}

                  {/* Legal Move Indicators */}
                  {isLegal && !piece && (
                    <div className="w-3.5 h-3.5 rounded-full bg-slate-900/35 pointer-events-none z-20 shadow-sm" />
                  )}
                  {isLegal && piece && (
                    <div className="absolute inset-0 ring-4 ring-rose-500/70 ring-inset rounded-sm pointer-events-none z-20" />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 6. Bottom Player Card (User) */}
      <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <UserAvatar
              user={{ displayName: bottomPlayer?.name || myName }}
              photoURL={bottomPlayer?.photoURL}
              size="w-9 h-9"
            />
            <span
              className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border border-slate-900 ${
                bottomColor === 'w' ? 'bg-white' : 'bg-slate-950'
              }`}
            />
          </div>
          <div>
            <div className="font-bold text-slate-200 text-xs">
              {bottomPlayer?.name || myName} {isWhite || isBlack ? '(আপনি)' : ''}
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

      {/* 7. Last Move & History Strip */}
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
