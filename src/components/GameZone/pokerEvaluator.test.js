import { describe, it, expect } from 'vitest';
import {
  parseCard,
  createDeck,
  shuffleDeck,
  evaluateHand,
  compareHands,
  HAND_TYPES,
  getWinner,
} from './pokerEvaluator';

describe('Teen Patti Poker Evaluator', () => {
  it('parses cards correctly', () => {
    const card = parseCard('AS');
    expect(card).toEqual({ rank: 'A', suit: 'S', value: 14 });
    const cardObj = parseCard({ rank: '10', suit: 'H' });
    expect(cardObj).toEqual({ rank: '10', suit: 'H', value: 10 });
  });

  it('generates a full 52-card deck', () => {
    const deck = createDeck();
    expect(deck.length).toBe(52);
    expect(new Set(deck).size).toBe(52);
  });

  it('shuffles deck properly', () => {
    const deck = createDeck();
    const shuffled = shuffleDeck(deck);
    expect(shuffled.length).toBe(52);
    expect(shuffled).not.toEqual(deck);
  });

  it('evaluates Trail / Trio (Three of a Kind)', () => {
    const hand = evaluateHand(['AS', 'AH', 'AD']);
    expect(hand.type).toBe(HAND_TYPES.TRAIL);
  });

  it('evaluates Pure Sequence (Straight Flush)', () => {
    const hand = evaluateHand(['AS', 'KS', 'QS']);
    expect(hand.type).toBe(HAND_TYPES.PURE_SEQUENCE);
  });

  it('evaluates Normal Sequence (Run)', () => {
    const hand = evaluateHand(['AS', 'KH', 'QD']);
    expect(hand.type).toBe(HAND_TYPES.SEQUENCE);
  });

  it('evaluates Color (Flush)', () => {
    const hand = evaluateHand(['AS', '8S', '2S']);
    expect(hand.type).toBe(HAND_TYPES.COLOR);
  });

  it('evaluates Pair', () => {
    const hand = evaluateHand(['AS', 'AH', '7D']);
    expect(hand.type).toBe(HAND_TYPES.PAIR);
  });

  it('evaluates High Card', () => {
    const hand = evaluateHand(['AS', '9H', '4D']);
    expect(hand.type).toBe(HAND_TYPES.HIGH_CARD);
  });

  it('correctly compares hands across hierarchy', () => {
    const trio = ['KS', 'KH', 'KD'];
    const pureSeq = ['AS', 'KS', 'QS'];
    const pair = ['10S', '10H', '2D'];
    const highCard = ['AS', 'JH', '4D'];

    expect(compareHands(trio, pureSeq)).toBeGreaterThan(0);
    expect(compareHands(pureSeq, pair)).toBeGreaterThan(0);
    expect(compareHands(pair, highCard)).toBeGreaterThan(0);
  });

  it('determines winner among multiple players', () => {
    const players = [
      { name: 'Player A', cards: ['7S', '8H', '9D'] }, // Sequence
      { name: 'Player B', cards: ['AS', 'AH', 'AD'] }, // Trail
      { name: 'Player C', cards: ['KS', 'KH', '2D'] }, // Pair
    ];
    const winnerData = getWinner(players);
    expect(winnerData.player.name).toBe('Player B');
  });

  it('gives victory to defender when hands are tied in showdown', () => {
    // Both players have identical High Card A-K-Q in different suits
    const players = [
      { email: 'challenger@test.com', name: 'Challenger', cards: ['AS', 'KH', 'QD'] },
      { email: 'defender@test.com', name: 'Defender', cards: ['AD', 'KC', 'QS'] },
    ];
    const winnerData = getWinner(players, 'challenger@test.com');
    expect(winnerData.player.name).toBe('Defender');
  });
});

