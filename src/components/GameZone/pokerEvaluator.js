/**
 * Teen Patti Hand Evaluator (৩ পাত্তি হ্যান্ড ক্যালকুলেটর)
 * 
 * Hand hierarchy (Highest to Lowest):
 * 1. Trail / Trio (ট্রিও / ট্রেল)
 * 2. Pure Sequence (পিওর সিকোয়েন্স / স্ট্রেট ফ্লাশ)
 * 3. Sequence / Run (সাধারণ রান)
 * 4. Color / Flush (কালার / ফ্লাশ)
 * 5. Pair (জোড়া)
 * 6. High Card (হাই কার্ড)
 */

const RANK_VALUES = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  'J': 11,
  'Q': 12,
  'K': 13,
  'A': 14,
};

export const HAND_TYPES = {
  TRAIL: 6,
  PURE_SEQUENCE: 5,
  SEQUENCE: 4,
  COLOR: 3,
  PAIR: 2,
  HIGH_CARD: 1,
};

export const HAND_NAMES_BN = {
  [HAND_TYPES.TRAIL]: 'ট্রিও (Trail / Trio)',
  [HAND_TYPES.PURE_SEQUENCE]: 'পিওর সিকোয়েন্স (Pure Run)',
  [HAND_TYPES.SEQUENCE]: 'সাধারণ রান (Sequence)',
  [HAND_TYPES.COLOR]: 'কালার (Flush)',
  [HAND_TYPES.PAIR]: 'জোড়া (Pair)',
  [HAND_TYPES.HIGH_CARD]: 'হাই কার্ড (High Card)',
};

/**
 * Normalizes card representation into { rank, suit, value }
 * Accepts: 'AS', '10H', or { rank: 'A', suit: 'S' }
 */
export function parseCard(card) {
  if (!card) return null;
  let rank = '';
  let suit = '';

  if (typeof card === 'string') {
    const trimmed = card.trim();
    suit = trimmed.slice(-1).toUpperCase();
    rank = trimmed.slice(0, -1).toUpperCase();
  } else if (typeof card === 'object') {
    rank = String(card.rank || '').toUpperCase();
    suit = String(card.suit || '').slice(0, 1).toUpperCase();
  }

  const value = RANK_VALUES[rank] || 0;
  return { rank, suit, value };
}

/**
 * Generates a full standard 52-card deck
 */
export function createDeck() {
  const suits = ['S', 'H', 'D', 'C'];
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const deck = [];
  for (const s of suits) {
    for (const r of ranks) {
      deck.push(`${r}${s}`);
    }
  }
  return deck;
}

/**
 * Shuffles deck using Fisher-Yates algorithm
 */
export function shuffleDeck(deck) {
  const copy = [...deck];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Evaluates a 3-card hand and returns score metadata
 */
export function evaluateHand(cards) {
  if (!Array.isArray(cards) || cards.length < 3) {
    return { type: HAND_TYPES.HIGH_CARD, name: 'হাই কার্ড', score: 0, ranks: [] };
  }

  const parsed = cards.map(parseCard).filter(Boolean);
  if (parsed.length !== 3) {
    return { type: HAND_TYPES.HIGH_CARD, name: 'হাই কার্ড', score: 0, ranks: [] };
  }

  // Sort descending by value
  parsed.sort((a, b) => b.value - a.value);

  const [c1, c2, c3] = parsed;
  const isFlush = c1.suit === c2.suit && c2.suit === c3.suit;

  // Check Trail (Three of a kind)
  if (c1.value === c2.value && c2.value === c3.value) {
    return {
      type: HAND_TYPES.TRAIL,
      name: HAND_NAMES_BN[HAND_TYPES.TRAIL],
      ranks: [c1.value, c2.value, c3.value],
      score: HAND_TYPES.TRAIL * 1000000 + c1.value * 10000,
    };
  }

  // Check Sequence / Run
  // Normal sequences: (c1 - c2 === 1 && c2 - c3 === 1) e.g. K-Q-J (13,12,11), 8-7-6 (8,7,6)
  // Ace special cases: A-K-Q (14, 13, 12) is top.
  // Traditional Teen Patti rules: A-2-3 (14, 3, 2) is the 2nd highest sequence!
  let isSequence = false;
  let seqRankScore = 0;

  if (c1.value === 14 && c2.value === 13 && c3.value === 12) {
    isSequence = true;
    seqRankScore = 14; // A-K-Q
  } else if (c1.value === 14 && c2.value === 3 && c3.value === 2) {
    isSequence = true;
    seqRankScore = 13.5; // A-2-3 (ranks above K-Q-J in traditional Teen Patti)
  } else if (c1.value - c2.value === 1 && c2.value - c3.value === 1) {
    isSequence = true;
    seqRankScore = c1.value;
  }

  // Pure Sequence (Straight Flush)
  if (isSequence && isFlush) {
    return {
      type: HAND_TYPES.PURE_SEQUENCE,
      name: HAND_NAMES_BN[HAND_TYPES.PURE_SEQUENCE],
      ranks: [seqRankScore, c2.value, c3.value],
      score: HAND_TYPES.PURE_SEQUENCE * 1000000 + seqRankScore * 10000,
    };
  }

  // Normal Sequence
  if (isSequence) {
    return {
      type: HAND_TYPES.SEQUENCE,
      name: HAND_NAMES_BN[HAND_TYPES.SEQUENCE],
      ranks: [seqRankScore, c2.value, c3.value],
      score: HAND_TYPES.SEQUENCE * 1000000 + seqRankScore * 10000,
    };
  }

  // Color / Flush
  if (isFlush) {
    return {
      type: HAND_TYPES.COLOR,
      name: HAND_NAMES_BN[HAND_TYPES.COLOR],
      ranks: [c1.value, c2.value, c3.value],
      score: HAND_TYPES.COLOR * 1000000 + c1.value * 10000 + c2.value * 100 + c3.value,
    };
  }

  // Pair (Two of a kind)
  if (c1.value === c2.value || c2.value === c3.value || c1.value === c3.value) {
    let pairValue = 0;
    let kicker = 0;
    if (c1.value === c2.value) {
      pairValue = c1.value;
      kicker = c3.value;
    } else if (c2.value === c3.value) {
      pairValue = c2.value;
      kicker = c1.value;
    } else {
      pairValue = c1.value;
      kicker = c2.value;
    }

    return {
      type: HAND_TYPES.PAIR,
      name: HAND_NAMES_BN[HAND_TYPES.PAIR],
      ranks: [pairValue, kicker],
      score: HAND_TYPES.PAIR * 1000000 + pairValue * 10000 + kicker * 100,
    };
  }

  // High Card
  return {
    type: HAND_TYPES.HIGH_CARD,
    name: HAND_NAMES_BN[HAND_TYPES.HIGH_CARD],
    ranks: [c1.value, c2.value, c3.value],
    score: HAND_TYPES.HIGH_CARD * 1000000 + c1.value * 10000 + c2.value * 100 + c3.value,
  };
}

/**
 * Compares two hands.
 * Returns > 0 if handA wins, < 0 if handB wins, 0 if tie.
 */
export function compareHands(cardsA, cardsB) {
  const evalA = evaluateHand(cardsA);
  const evalB = evaluateHand(cardsB);
  return evalA.score - evalB.score;
}

/**
 * Finds the winner among an array of active players.
 * Each item in activePlayers: { email, name, cards: [...] }
 * If challengerEmail is provided and hands tie, the defender wins!
 */
export function getWinner(activePlayers, challengerEmail = null) {
  if (!activePlayers || activePlayers.length === 0) return null;
  if (activePlayers.length === 1) {
    return {
      player: activePlayers[0],
      evaluation: evaluateHand(activePlayers[0].cards || []),
    };
  }

  let best = activePlayers[0];
  let bestEval = evaluateHand(best.cards || []);

  for (let i = 1; i < activePlayers.length; i++) {
    const cur = activePlayers[i];
    const curEval = evaluateHand(cur.cards || []);
    if (curEval.score > bestEval.score) {
      best = cur;
      bestEval = curEval;
    } else if (curEval.score === bestEval.score && challengerEmail) {
      // In Teen Patti, if the show is a tie, the non-challenger (defender) wins
      const isCurChallenger = (cur.email || '').toLowerCase() === challengerEmail.toLowerCase();
      const isBestChallenger = (best.email || '').toLowerCase() === challengerEmail.toLowerCase();
      if (isBestChallenger && !isCurChallenger) {
        best = cur;
        bestEval = curEval;
      }
    }
  }

  return { player: best, evaluation: bestEval };
}

