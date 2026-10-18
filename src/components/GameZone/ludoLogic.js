/**
 * Ludo Game Logic & Mechanics (লুডো গেম ইঞ্জিন)
 * 
 * 4 Colors:
 * 0: Red (লাল) - Start offset: 0
 * 1: Green (সবুজ) - Start offset: 13
 * 2: Yellow (হলুদ) - Start offset: 26
 * 3: Blue (নীল) - Start offset: 39
 * 
 * Step System:
 * -1: In Base
 * 0: On Start square
 * 1..50: On Main track
 * 51..55: In Home Column (Safe, private to player)
 * 56: Home / Goal reached!
 */

export const PLAYER_COLORS = [
  { id: 0, name: 'Red', nameBn: 'লাল', startSquare: 0, colorClass: 'bg-rose-500', textClass: 'text-rose-500', hex: '#f43f5e' },
  { id: 1, name: 'Green', nameBn: 'সবুজ', startSquare: 13, colorClass: 'bg-emerald-500', textClass: 'text-emerald-500', hex: '#10b981' },
  { id: 2, name: 'Yellow', nameBn: 'হলুদ', startSquare: 26, colorClass: 'bg-amber-400', textClass: 'text-amber-500', hex: '#f59e0b' },
  { id: 3, name: 'Blue', nameBn: 'নীল', startSquare: 39, colorClass: 'bg-sky-500', textClass: 'text-sky-500', hex: '#0284c7' },
];

export const START_OFFSETS = [0, 13, 26, 39];

// Safe track indices where tokens cannot be captured
export const SAFE_SQUARES = [0, 8, 13, 21, 26, 34, 39, 47];

export const TOTAL_TRACK_SQUARES = 52;
export const WINNING_STEP = 56;

// 15x15 Board Grid Coordinates [row, col] for 52 track squares
export const TRACK_COORDINATES = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  [0, 7],
  [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  [7, 14],
  [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  [14, 7],
  [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  [7, 0],
  [6, 0],
];

// Home column coordinates for each player (steps 51 to 55)
export const HOME_COLUMN_COORDINATES = {
  0: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]], // Red
  1: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]], // Green
  2: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]], // Yellow
  3: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]], // Blue
};

// Base slots for each player
export const BASE_SLOT_COORDINATES = {
  0: [[2, 2], [2, 3], [3, 2], [3, 3]], // Red Base
  1: [[2, 11], [2, 12], [3, 11], [3, 12]], // Green Base
  2: [[11, 11], [11, 12], [12, 11], [12, 12]], // Yellow Base
  3: [[11, 2], [11, 3], [12, 2], [12, 3]], // Blue Base
};

export const CENTER_GOAL = [7, 7];

/**
 * Returns [row, col] position for a token given its step and player
 */
export function getTokenBoardPosition(playerIndex, tokenIndex, step) {
  if (step === -1) {
    return BASE_SLOT_COORDINATES[playerIndex]?.[tokenIndex] || [0, 0];
  }
  if (step === WINNING_STEP) {
    return CENTER_GOAL;
  }
  if (step >= 51 && step <= 55) {
    const colIdx = step - 51;
    return HOME_COLUMN_COORDINATES[playerIndex]?.[colIdx] || [7, 7];
  }
  const globalTrackIdx = getGlobalTrackIndex(playerIndex, step);
  return TRACK_COORDINATES[globalTrackIdx] || [7, 7];
}

/**
 * Initializes tokens for all 4 players (4 tokens each, in base: -1)
 */
export function initializeLudoTokens(playerCount = 4) {
  const tokens = {};
  for (let p = 0; p < playerCount; p++) {
    tokens[p] = [-1, -1, -1, -1]; // 4 tokens
  }
  return tokens;
}

/**
 * Calculates global track index for a token on the main track (0 <= step <= 50)
 */
export function getGlobalTrackIndex(playerIndex, step) {
  if (step < 0 || step > 50) return null;
  return (START_OFFSETS[playerIndex] + step) % TOTAL_TRACK_SQUARES;
}

/**
 * Checks if a move is valid for a token
 */
export function canMoveToken(playerIndex, tokenStep, diceRoll) {
  if (diceRoll < 1 || diceRoll > 6) return false;

  // In base: Can only exit on rolling a 6
  if (tokenStep === -1) {
    return diceRoll === 6;
  }

  // Already home: cannot move
  if (tokenStep === WINNING_STEP) {
    return false;
  }

  // Requires exact count to enter home (step 56)
  return tokenStep + diceRoll <= WINNING_STEP;
}

/**
 * Gets indices of all movable tokens for a player given the dice roll
 */
export function getMovableTokens(playerIndex, playerTokens, diceRoll) {
  if (!Array.isArray(playerTokens)) return [];
  const movable = [];
  for (let i = 0; i < playerTokens.length; i++) {
    if (canMoveToken(playerIndex, playerTokens[i], diceRoll)) {
      movable.push(i);
    }
  }
  return movable;
}

/**
 * Executes a token move, checking for captures and home reaches
 * Returns: { newTokens, capturedToken: { playerIndex, tokenIndex } | null, reachedHome: boolean }
 */
export function executeTokenMove(allTokens, playerIndex, tokenIndex, diceRoll) {
  const newTokens = { ...allTokens };
  newTokens[playerIndex] = [...newTokens[playerIndex]];

  const currentStep = newTokens[playerIndex][tokenIndex];
  let newStep = currentStep;

  if (currentStep === -1 && diceRoll === 6) {
    newStep = 0; // Exit base to start square
  } else if (currentStep >= 0 && currentStep + diceRoll <= WINNING_STEP) {
    newStep = currentStep + diceRoll;
  }

  newTokens[playerIndex][tokenIndex] = newStep;
  const reachedHome = newStep === WINNING_STEP;

  // Check capture if on main track (0 <= newStep <= 50)
  let capturedToken = null;
  if (newStep >= 0 && newStep <= 50) {
    const landingSquare = getGlobalTrackIndex(playerIndex, newStep);

    // Cannot capture on safe squares
    if (!SAFE_SQUARES.includes(landingSquare)) {
      for (const [pStr, tokens] of Object.entries(newTokens)) {
        const otherPlayerIdx = Number(pStr);
        if (otherPlayerIdx === playerIndex) continue;

        for (let tIdx = 0; tIdx < tokens.length; tIdx++) {
          const otherStep = tokens[tIdx];
          if (otherStep >= 0 && otherStep <= 50) {
            const otherSquare = getGlobalTrackIndex(otherPlayerIdx, otherStep);
            if (otherSquare === landingSquare) {
              // Capture opponent token! Send back to base (-1)
              newTokens[otherPlayerIdx] = [...newTokens[otherPlayerIdx]];
              newTokens[otherPlayerIdx][tIdx] = -1;
              capturedToken = { playerIndex: otherPlayerIdx, tokenIndex: tIdx };
              break;
            }
          }
        }
        if (capturedToken) break;
      }
    }
  }

  return {
    newTokens,
    capturedToken,
    reachedHome,
  };
}

/**
 * Checks if a player has won (all 4 tokens have reached WINNING_STEP)
 */
export function hasPlayerWon(playerTokens) {
  if (!Array.isArray(playerTokens) || playerTokens.length !== 4) return false;
  return playerTokens.every((step) => step === WINNING_STEP);
}

/**
 * Rolls a fair 6-sided die
 */
export function rollDice() {
  return Math.floor(Math.random() * 6) + 1;
}
