import { describe, it, expect } from 'vitest';
import {
  create29Deck,
  parse29Card,
  CARD_29_POINTS,
  determineTrickWinner,
  hasSuit,
  isMoveLegal,
} from './card29Logic';

describe('29 Card Game Logic', () => {
  it('creates standard 32-card deck for 29 game', () => {
    const deck = create29Deck();
    expect(deck.length).toBe(32);
    expect(new Set(deck).size).toBe(32);
  });

  it('assigns correct 29 point values to cards', () => {
    expect(CARD_29_POINTS['J']).toBe(3);
    expect(CARD_29_POINTS['9']).toBe(2);
    expect(CARD_29_POINTS['A']).toBe(1);
    expect(CARD_29_POINTS['10']).toBe(1);
    expect(CARD_29_POINTS['K']).toBe(0);
    expect(CARD_29_POINTS['Q']).toBe(0);
    expect(CARD_29_POINTS['8']).toBe(0);
    expect(CARD_29_POINTS['7']).toBe(0);

    // Total points in deck must be 28
    const totalPoints = create29Deck().reduce(
      (sum, c) => sum + (parse29Card(c)?.points || 0),
      0
    );
    expect(totalPoints).toBe(28);
  });

  it('correctly determines trick winner following lead suit', () => {
    const trick = [
      { playerIndex: 0, card: '10S' },
      { playerIndex: 1, card: '9S' }, // 9 beats 10 in 29!
      { playerIndex: 2, card: 'JS' }, // Jack beats 9!
      { playerIndex: 3, card: 'KS' },
    ];
    const res = determineTrickWinner(trick, 'H', false);
    expect(res.winnerIndex).toBe(2);
    expect(res.winningCard).toBe('JS');
    expect(res.trickPoints).toBe(6); // 10 (1) + 9 (2) + J (3) + K (0) = 6
  });

  it('trump beats non-trump when trump is revealed', () => {
    const trick = [
      { playerIndex: 0, card: 'JS' }, // High lead card
      { playerIndex: 1, card: '7H' }, // Trump card!
      { playerIndex: 2, card: 'AS' },
      { playerIndex: 3, card: 'KS' },
    ];
    const res = determineTrickWinner(trick, 'H', true);
    expect(res.winnerIndex).toBe(1);
    expect(res.winningCard).toBe('7H');
  });

  it('validates legal moves according to suit following rules', () => {
    const hand = ['JS', '10S', 'AH', '7D'];
    // Must follow Spades if player has it
    expect(isMoveLegal('JS', hand, 'S', false)).toBe(true);
    expect(isMoveLegal('AH', hand, 'S', false)).toBe(false);

    // If player has no Spades, any card can be played
    const noSpadeHand = ['AH', '7D', 'KC'];
    expect(isMoveLegal('AH', noSpadeHand, 'S', false)).toBe(true);
  });
});
