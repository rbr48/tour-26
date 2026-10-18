import { describe, it, expect } from 'vitest';
import {
  INITIAL_CHESS_BOARD,
  cloneBoard,
  coordsToSquare,
  squareToCoords,
  findKing,
  isSquareAttacked,
  isInCheck,
  getLegalMoves,
  hasLegalMoves,
  executeMove,
} from './chessLogic';

describe('chessLogic', () => {
  it('initializes standard 8x8 chess board with correct pieces', () => {
    expect(INITIAL_CHESS_BOARD.length).toBe(8);
    expect(INITIAL_CHESS_BOARD[0].length).toBe(8);

    // Rank 8 (Row 0): Black back rank
    expect(INITIAL_CHESS_BOARD[0]).toEqual(['bR', 'bN', 'bB', 'bQ', 'bK', 'bB', 'bN', 'bR']);
    // Rank 7 (Row 1): Black pawns
    expect(INITIAL_CHESS_BOARD[1].every((p) => p === 'bP')).toBe(true);
    // Rank 2 (Row 6): White pawns
    expect(INITIAL_CHESS_BOARD[6].every((p) => p === 'wP')).toBe(true);
    // Rank 1 (Row 7): White back rank
    expect(INITIAL_CHESS_BOARD[7]).toEqual(['wR', 'wN', 'wB', 'wQ', 'wK', 'wB', 'wN', 'wR']);
  });

  it('translates square coordinates accurately', () => {
    expect(squareToCoords('e4')).toEqual({ r: 4, c: 4 });
    expect(coordsToSquare(4, 4)).toBe('e4');
    expect(squareToCoords('a8')).toEqual({ r: 0, c: 0 });
    expect(coordsToSquare(0, 0)).toBe('a8');
    expect(squareToCoords('h1')).toEqual({ r: 7, c: 7 });
    expect(coordsToSquare(7, 7)).toBe('h1');
  });

  it('locates kings correctly on initial board', () => {
    const whiteKing = findKing(INITIAL_CHESS_BOARD, 'w');
    const blackKing = findKing(INITIAL_CHESS_BOARD, 'b');

    expect(whiteKing).toEqual({ r: 7, c: 4 }); // e1
    expect(blackKing).toEqual({ r: 0, c: 4 }); // e8
  });

  it('generates valid pawn opening moves (1 or 2 steps)', () => {
    // White e2 pawn is at row 6, col 4
    const moves = getLegalMoves(INITIAL_CHESS_BOARD, 6, 4);
    expect(moves.length).toBe(2);
    expect(moves).toContainEqual({ r: 5, c: 4 }); // e3
    expect(moves).toContainEqual({ r: 4, c: 4 }); // e4
  });

  it('generates valid knight jumping moves', () => {
    // White b1 knight is at row 7, col 1
    const moves = getLegalMoves(INITIAL_CHESS_BOARD, 7, 1);
    expect(moves.length).toBe(2);
    expect(moves).toContainEqual({ r: 5, c: 0 }); // a3
    expect(moves).toContainEqual({ r: 5, c: 2 }); // c3
  });

  it('executes move and updates board state with correct notation', () => {
    // Move e2 (6, 4) to e4 (4, 4)
    const result = executeMove(INITIAL_CHESS_BOARD, 6, 4, 4, 4);
    expect(result).not.toBeNull();
    expect(result.board[6][4]).toBeNull();
    expect(result.board[4][4]).toBe('wP');
    expect(result.fromSq).toBe('e2');
    expect(result.toSq).toBe('e4');
    expect(result.capturedPiece).toBeNull();
  });

  it('handles capture and updates capturedPiece', () => {
    const board = cloneBoard(INITIAL_CHESS_BOARD);
    // Put white pawn at e4, black pawn at d5
    board[4][4] = 'wP';
    board[6][4] = null;
    board[3][3] = 'bP';
    board[1][3] = null;

    const moves = getLegalMoves(board, 4, 4);
    // e4 can advance to e5 or capture d5
    expect(moves).toContainEqual({ r: 3, c: 3, capture: true });

    const result = executeMove(board, 4, 4, 3, 3);
    expect(result.capturedPiece).toBe('bP');
    expect(result.board[3][3]).toBe('wP');
    expect(result.board[4][4]).toBeNull();
  });

  it('promotes pawn to queen when reaching the last rank', () => {
    const board = [
      [null, null, null, null, 'bK', null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      ['wK', null, null, null, null, null, null, null],
    ];
    // Put white pawn at a7 (row 1, col 0)
    board[1][0] = 'wP';

    const result = executeMove(board, 1, 0, 0, 0);
    expect(result.isPawnPromotion).toBe(true);
    expect(result.board[0][0]).toBe('wQ'); // automatically promoted to Queen
  });

  it('detects check and fool mate / checkmate', () => {
    // Fool's mate setup:
    // 1. f3 e5 2. g4 Qh4#
    let board = cloneBoard(INITIAL_CHESS_BOARD);
    // 1. f2-f3
    board = executeMove(board, 6, 5, 5, 5).board;
    // 1... e7-e5
    board = executeMove(board, 1, 4, 3, 4).board;
    // 2. g2-g4
    board = executeMove(board, 6, 6, 4, 6).board;
    // 2... Qh4#
    const mateResult = executeMove(board, 0, 3, 4, 7);

    expect(mateResult.inCheck).toBe(true);
    expect(mateResult.isCheckmate).toBe(true);
    expect(hasLegalMoves(mateResult.board, 'w')).toBe(false);
  });
});
