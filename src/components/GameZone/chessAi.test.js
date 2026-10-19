import { describe, it, expect } from 'vitest';
import {
  evaluateBoard,
  getAllLegalMovesForColor,
  getBestMove,
} from './chessAi';
import { INITIAL_CHESS_BOARD, cloneBoard, executeMove } from './chessLogic';

describe('Chess AI Engine (chessAi.js)', () => {
  it('evaluates initial board position equally (score 0)', () => {
    const score = evaluateBoard(INITIAL_CHESS_BOARD);
    expect(score).toBe(0);
  });

  it('evaluates material advantage correctly when white captures a piece', () => {
    const board = cloneBoard(INITIAL_CHESS_BOARD);
    board[1][4] = null; // Remove black pawn at e7
    const score = evaluateBoard(board);
    expect(score).toBeGreaterThan(0);
  });

  it('generates 20 initial legal moves for white', () => {
    const moves = getAllLegalMovesForColor(INITIAL_CHESS_BOARD, 'w');
    // 16 pawn moves (8 single + 8 double) + 4 knight moves
    expect(moves.length).toBe(20);
  });

  it('finds best move on easy difficulty', () => {
    const move = getBestMove(INITIAL_CHESS_BOARD, 'b', 'easy');
    expect(move).not.toBeNull();
    expect(move.fromR).toBeDefined();
    expect(move.toR).toBeDefined();
  });

  it('finds best move on medium difficulty', () => {
    const move = getBestMove(INITIAL_CHESS_BOARD, 'b', 'medium');
    expect(move).not.toBeNull();
    expect(move.piece).toMatch(/^b/);
  });

  it('chooses immediate free capture when available', () => {
    const board = cloneBoard(INITIAL_CHESS_BOARD);
    // Put an undefended white queen on e5
    board[3][4] = 'wQ';
    // Black pawn at d6 can capture e5
    board[2][3] = 'bP';
    const move = getBestMove(board, 'b', 'hard');
    expect(move).not.toBeNull();
    // Black should take the queen at e5 (row 3, col 4)
    expect(move.toR).toBe(3);
    expect(move.toC).toBe(4);
  });

  it('detects immediate checkmate move when available', () => {
    // Scholar's Mate setup: White queen at h5, Bishop at c4, Black f7 undefended
    const board = [
      ['bR', 'bN', 'bB', 'bQ', 'bK', 'bB', 'bN', 'bR'],
      ['bP', 'bP', 'bP', 'bP', null, 'bP', 'bP', 'bP'],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, 'bP', null, null, 'wQ'],
      [null, null, 'wB', null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      ['wP', 'wP', 'wP', 'wP', null, 'wP', 'wP', 'wP'],
      ['wR', 'wN', 'wB', null, 'wK', null, 'wN', 'wR'],
    ];

    const move = getBestMove(board, 'w', 'hard');
    expect(move).not.toBeNull();
    // Queen from h5 (row 3, col 7) captures f7 (row 1, col 5) delivering checkmate
    expect(move.fromR).toBe(3);
    expect(move.fromC).toBe(7);
    expect(move.toR).toBe(1);
    expect(move.toC).toBe(5);
  });
});
