import { describe, it, expect } from 'vitest';
import {
  initializeLudoTokens,
  getGlobalTrackIndex,
  canMoveToken,
  getMovableTokens,
  executeTokenMove,
  hasPlayerWon,
  rollDice,
  WINNING_STEP,
  SAFE_SQUARES,
} from './ludoLogic';

describe('Ludo Game Logic Engine', () => {
  it('initializes tokens in base (-1) for players', () => {
    const tokens = initializeLudoTokens(4);
    expect(tokens[0]).toEqual([-1, -1, -1, -1]);
    expect(tokens[1]).toEqual([-1, -1, -1, -1]);
    expect(tokens[2]).toEqual([-1, -1, -1, -1]);
    expect(tokens[3]).toEqual([-1, -1, -1, -1]);
  });

  it('calculates global track positions correctly', () => {
    // Red (player 0) start offset = 0
    expect(getGlobalTrackIndex(0, 0)).toBe(0);
    expect(getGlobalTrackIndex(0, 10)).toBe(10);

    // Green (player 1) start offset = 13
    expect(getGlobalTrackIndex(1, 0)).toBe(13);

    // Yellow (player 2) start offset = 26
    expect(getGlobalTrackIndex(2, 0)).toBe(26);

    // Blue (player 3) start offset = 39
    expect(getGlobalTrackIndex(3, 0)).toBe(39);
    expect(getGlobalTrackIndex(3, 15)).toBe((39 + 15) % 52); // 2
  });

  it('allows token exit from base only on 6', () => {
    expect(canMoveToken(0, -1, 6)).toBe(true);
    expect(canMoveToken(0, -1, 5)).toBe(false);
    expect(canMoveToken(0, -1, 1)).toBe(false);
  });

  it('respects exact count to enter home', () => {
    expect(canMoveToken(0, 54, 2)).toBe(true); // 54 + 2 = 56
    expect(canMoveToken(0, 54, 3)).toBe(false); // 54 + 3 = 57 > 56
    expect(canMoveToken(0, 56, 1)).toBe(false); // already home
  });

  it('moves token out of base to starting square on 6', () => {
    const tokens = initializeLudoTokens(4);
    const result = executeTokenMove(tokens, 0, 0, 6);
    expect(result.newTokens[0][0]).toBe(0);
    expect(result.reachedHome).toBe(false);
    expect(result.capturedToken).toBeNull();
  });

  it('captures opponent token on non-safe square and sends it back to base', () => {
    const tokens = initializeLudoTokens(4);
    // Red token is at step 5 (global square: 5)
    tokens[0][0] = 5;
    // Green (offset 13) token is at step 44 (global square: (13 + 44) % 52 = 57 % 52 = 5)
    tokens[1][0] = 44;

    // Red moves from step 3 to step 5 on dice roll 2
    tokens[0][0] = 3;
    const result = executeTokenMove(tokens, 0, 0, 2);

    expect(result.newTokens[0][0]).toBe(5);
    // Green token got captured! Sent to -1
    expect(result.newTokens[1][0]).toBe(-1);
    expect(result.capturedToken).toEqual({ playerIndex: 1, tokenIndex: 0 });
  });

  it('cannot capture opponent on safe star square', () => {
    const tokens = initializeLudoTokens(4);
    // Star square 8: Red at step 8
    tokens[0][0] = 6;
    tokens[1][0] = 47; // (13 + 47) % 52 = 8

    const result = executeTokenMove(tokens, 0, 0, 2);
    expect(result.newTokens[0][0]).toBe(8);
    // Green is safe, NOT captured!
    expect(result.newTokens[1][0]).toBe(47);
    expect(result.capturedToken).toBeNull();
  });

  it('detects win when all 4 tokens reach home', () => {
    expect(hasPlayerWon([56, 56, 56, 56])).toBe(true);
    expect(hasPlayerWon([56, 56, 56, 55])).toBe(false);
  });

  it('generates dice rolls between 1 and 6', () => {
    for (let i = 0; i < 50; i++) {
      const roll = rollDice();
      expect(roll).toBeGreaterThanOrEqual(1);
      expect(roll).toBeLessThanOrEqual(6);
    }
  });
});
