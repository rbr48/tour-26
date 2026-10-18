/**
 * 29 Card Game Logic & Utilities (২৯ কার্ড গেম লজিক)
 * 
 * 32-card deck: J, 9, A, 10, K, Q, 8, 7 of each suit (S, H, D, C)
 * Points:
 * J = 3 points
 * 9 = 2 points
 * A = 1 point
 * 10 = 1 point
 * K, Q, 8, 7 = 0 points
 * Total = 28 points + 1 point for the last trick = 29 points!
 */

export const CARD_29_POINTS = {
  J: 3,
  '9': 2,
  A: 1,
  '10': 1,
  K: 0,
  Q: 0,
  '8': 0,
  '7': 0,
};

// Power rank within a trick (higher number beats lower)
export const CARD_29_POWER = {
  J: 8,
  '9': 7,
  A: 6,
  '10': 5,
  K: 4,
  Q: 3,
  '8': 2,
  '7': 1,
};

/**
 * Creates a standard 32-card 29 deck
 */
export function create29Deck() {
  const suits = ['S', 'H', 'D', 'C'];
  const ranks = ['J', '9', 'A', '10', 'K', 'Q', '8', '7'];
  const deck = [];
  for (const s of suits) {
    for (const r of ranks) {
      deck.push(`${r}${s}`);
    }
  }
  return deck;
}

/**
 * Parses card for 29 game: { rank, suit, points, power }
 */
export function parse29Card(cardStr) {
  if (!cardStr) return null;
  const s = cardStr.slice(-1).toUpperCase();
  const r = cardStr.slice(0, -1).toUpperCase();
  return {
    card: cardStr,
    rank: r,
    suit: s,
    points: CARD_29_POINTS[r] || 0,
    power: CARD_29_POWER[r] || 0,
  };
}

/**
 * Calculates trick winner among 4 played cards:
 * playedCards: array of { playerIndex, card: 'JS' }
 * leadSuit: suit of the first card played in the trick
 * trumpSuit: suit of trump (only active if trump is revealed)
 * isTrumpRevealed: boolean
 */
export function determineTrickWinner(playedCards, trumpSuit = null, isTrumpRevealed = false) {
  if (!playedCards || playedCards.length === 0) return null;

  const leadCard = parse29Card(playedCards[0].card);
  const leadSuit = leadCard.suit;

  let bestPlay = playedCards[0];
  let bestCard = leadCard;
  let highestTrumpPower = (isTrumpRevealed && leadCard.suit === trumpSuit) ? leadCard.power : -1;

  for (let i = 1; i < playedCards.length; i++) {
    const play = playedCards[i];
    const parsed = parse29Card(play.card);

    if (isTrumpRevealed && parsed.suit === trumpSuit) {
      // It's a trump card
      if (parsed.power > highestTrumpPower) {
        highestTrumpPower = parsed.power;
        bestPlay = play;
        bestCard = parsed;
      }
    } else if (highestTrumpPower === -1 && parsed.suit === leadSuit) {
      // Following lead suit and no trump has been played
      if (parsed.power > bestCard.power) {
        bestPlay = play;
        bestCard = parsed;
      }
    }
  }

  // Calculate total points in this trick
  let trickPoints = 0;
  for (const p of playedCards) {
    trickPoints += parse29Card(p.card)?.points || 0;
  }

  return {
    winnerIndex: bestPlay.playerIndex,
    winningCard: bestPlay.card,
    trickPoints,
  };
}

/**
 * Checks if a player has any cards of a given suit
 */
export function hasSuit(hand, targetSuit) {
  if (!Array.isArray(hand)) return false;
  return hand.some((c) => parse29Card(c)?.suit === targetSuit);
}

/**
 * Validates whether a move is legal
 */
export function isMoveLegal(playedCard, hand, leadSuit, isTrumpRevealed) {
  if (!leadSuit) return true; // First player can play any card
  const parsed = parse29Card(playedCard);
  if (parsed.suit === leadSuit) return true; // Followed lead suit

  // Player played a different suit. Is legal only if player has NO cards of leadSuit
  return !hasSuit(hand, leadSuit);
}
