/**
 * chessLogic.js
 * Clean, lightweight, self-contained Chess engine for online multiplayer in GameZone.
 *
 * Board representation: 8x8 2D array.
 * Rows 0 to 7 (Row 0 is rank 8, row 7 is rank 1).
 * Cols 0 to 7 (Col 0 is file a, col 7 is file h).
 * Pieces:
 *  'wP', 'wR', 'wN', 'wB', 'wQ', 'wK' (White)
 *  'bP', 'bR', 'bN', 'bB', 'bQ', 'bK' (Black)
 *  null (Empty square)
 */

export const INITIAL_CHESS_BOARD = [
  ['bR', 'bN', 'bB', 'bQ', 'bK', 'bB', 'bN', 'bR'],
  ['bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP'],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  ['wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP'],
  ['wR', 'wN', 'wB', 'wQ', 'wK', 'wB', 'wN', 'wR'],
];

export const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
export const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

export function isInside(r, c) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

export function getColor(piece) {
  if (!piece) return null;
  return piece[0]; // 'w' or 'b'
}

export function getType(piece) {
  if (!piece) return null;
  return piece[1]; // 'P', 'R', 'N', 'B', 'Q', 'K'
}

export function squareToCoords(square) {
  // e.g. "e4" -> { r: 4, c: 4 }
  if (!square || square.length !== 2) return null;
  const c = FILES.indexOf(square[0].toLowerCase());
  const r = RANKS.indexOf(square[1]);
  if (c === -1 || r === -1) return null;
  return { r, c };
}

export function coordsToSquare(r, c) {
  if (!isInside(r, c)) return '';
  return `${FILES[c]}${RANKS[r]}`;
}

export function cloneBoard(board) {
  return board.map((row) => [...row]);
}

/**
 * Finds the coordinates of the King for a given color.
 */
export function findKing(board, color) {
  const target = `${color}K`;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] === target) {
        return { r, c };
      }
    }
  }
  return null;
}

/**
 * Checks if a specific square (targetR, targetC) is under attack by any piece of attackerColor.
 */
export function isSquareAttacked(board, targetR, targetC, attackerColor) {
  const enemyPawn = `${attackerColor}P`;
  const pawnDir = attackerColor === 'w' ? -1 : 1; // white pawn attacks upwards (decreasing row)
  // Check pawn attacks on target: pawn at (targetR - pawnDir, targetC +/- 1)
  const pawnR = targetR - pawnDir;
  if (isInside(pawnR, targetC - 1) && board[pawnR][targetC - 1] === enemyPawn) return true;
  if (isInside(pawnR, targetC + 1) && board[pawnR][targetC + 1] === enemyPawn) return true;

  // Knight moves
  const knightOffsets = [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
    [1, -2], [1, 2], [2, -1], [2, 1],
  ];
  const enemyKnight = `${attackerColor}N`;
  for (const [dr, dc] of knightOffsets) {
    const nr = targetR + dr;
    const nc = targetC + dc;
    if (isInside(nr, nc) && board[nr][nc] === enemyKnight) return true;
  }

  // King moves
  const enemyKing = `${attackerColor}K`;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = targetR + dr;
      const nc = targetC + dc;
      if (isInside(nr, nc) && board[nr][nc] === enemyKing) return true;
    }
  }

  // Orthogonal rays (Rook, Queen)
  const orthoDirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dr, dc] of orthoDirs) {
    let nr = targetR + dr;
    let nc = targetC + dc;
    while (isInside(nr, nc)) {
      const p = board[nr][nc];
      if (p) {
        if (getColor(p) === attackerColor && (getType(p) === 'R' || getType(p) === 'Q')) {
          return true;
        }
        break; // Blocked by any piece
      }
      nr += dr;
      nc += dc;
    }
  }

  // Diagonal rays (Bishop, Queen)
  const diagDirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  for (const [dr, dc] of diagDirs) {
    let nr = targetR + dr;
    let nc = targetC + dc;
    while (isInside(nr, nc)) {
      const p = board[nr][nc];
      if (p) {
        if (getColor(p) === attackerColor && (getType(p) === 'B' || getType(p) === 'Q')) {
          return true;
        }
        break; // Blocked
      }
      nr += dr;
      nc += dc;
    }
  }

  return false;
}

/**
 * Checks if the King of the specified color is currently in check.
 */
export function isInCheck(board, color) {
  const kingPos = findKing(board, color);
  if (!kingPos) return false;
  const enemyColor = color === 'w' ? 'b' : 'w';
  return isSquareAttacked(board, kingPos.r, kingPos.c, enemyColor);
}

/**
 * Generates all pseudo-legal moves for a piece at (r, c).
 */
export function getPseudoLegalMoves(board, r, c) {
  const piece = board[r][c];
  if (!piece) return [];
  const color = getColor(piece);
  const type = getType(piece);
  const moves = [];

  const addMoveIfValid = (nr, nc) => {
    if (!isInside(nr, nc)) return false;
    const destPiece = board[nr][nc];
    if (!destPiece) {
      moves.push({ r: nr, c: nc });
      return true; // continue ray
    }
    if (getColor(destPiece) !== color) {
      moves.push({ r: nr, c: nc, capture: true });
    }
    return false; // hit a piece, stop ray
  };

  if (type === 'P') {
    const dir = color === 'w' ? -1 : 1;
    const startRow = color === 'w' ? 6 : 1;

    // 1 step forward
    const oneStepR = r + dir;
    if (isInside(oneStepR, c) && !board[oneStepR][c]) {
      moves.push({ r: oneStepR, c });
      // 2 steps forward from initial rank
      const twoStepsR = r + 2 * dir;
      if (r === startRow && !board[twoStepsR][c]) {
        moves.push({ r: twoStepsR, c });
      }
    }

    // Diagonal captures
    for (const dc of [-1, 1]) {
      const targetC = c + dc;
      if (isInside(oneStepR, targetC)) {
        const destPiece = board[oneStepR][targetC];
        if (destPiece && getColor(destPiece) !== color) {
          moves.push({ r: oneStepR, c: targetC, capture: true });
        }
      }
    }
  } else if (type === 'N') {
    const offsets = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1],
    ];
    for (const [dr, dc] of offsets) {
      addMoveIfValid(r + dr, c + dc);
    }
  } else if (type === 'B') {
    const dirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    for (const [dr, dc] of dirs) {
      let nr = r + dr;
      let nc = c + dc;
      while (addMoveIfValid(nr, nc)) {
        nr += dr;
        nc += dc;
      }
    }
  } else if (type === 'R') {
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of dirs) {
      let nr = r + dr;
      let nc = c + dc;
      while (addMoveIfValid(nr, nc)) {
        nr += dr;
        nc += dc;
      }
    }
  } else if (type === 'Q') {
    const dirs = [
      [-1, -1], [-1, 1], [1, -1], [1, 1],
      [-1, 0], [1, 0], [0, -1], [0, 1],
    ];
    for (const [dr, dc] of dirs) {
      let nr = r + dr;
      let nc = c + dc;
      while (addMoveIfValid(nr, nc)) {
        nr += dr;
        nc += dc;
      }
    }
  } else if (type === 'K') {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        addMoveIfValid(r + dr, c + dc);
      }
    }
  }

  return moves;
}

/**
 * Returns strictly legal moves (moves that do not result in King being in check).
 */
export function getLegalMoves(board, r, c) {
  const piece = board[r][c];
  if (!piece) return [];
  const color = getColor(piece);
  const pseudoMoves = getPseudoLegalMoves(board, r, c);

  return pseudoMoves.filter((move) => {
    // Simulate move
    const simulated = cloneBoard(board);
    simulated[move.r][move.c] = piece;
    simulated[r][c] = null;
    // Ensure king is not in check
    return !isInCheck(simulated, color);
  });
}

/**
 * Checks if the given color has ANY legal moves left.
 */
export function hasLegalMoves(board, color) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (getColor(board[r][c]) === color) {
        const moves = getLegalMoves(board, r, c);
        if (moves.length > 0) return true;
      }
    }
  }
  return false;
}

/**
 * Applies a move from (fromR, fromC) to (toR, toC).
 * Handles capture, pawn promotion (automatically to Queen), and returns the new board state.
 */
export function executeMove(board, fromR, fromC, toR, toC) {
  const piece = board[fromR][fromC];
  if (!piece) return null;
  const color = getColor(piece);
  const type = getType(piece);
  const captured = board[toR][toC];

  const newBoard = cloneBoard(board);
  newBoard[fromR][fromC] = null;

  // Pawn Promotion: reaches end row
  const isPawnPromotion = type === 'P' && (toR === 0 || toR === 7);
  const placedPiece = isPawnPromotion ? `${color}Q` : piece;
  newBoard[toR][toC] = placedPiece;

  const fromSq = coordsToSquare(fromR, fromC);
  const toSq = coordsToSquare(toR, toC);
  const nextColor = color === 'w' ? 'b' : 'w';
  const enemyInCheck = isInCheck(newBoard, nextColor);
  const enemyHasMoves = hasLegalMoves(newBoard, nextColor);

  let status = 'active';
  if (!enemyHasMoves) {
    status = enemyInCheck ? 'checkmate' : 'stalemate';
  }

  const notation = `${type !== 'P' ? type : ''}${captured ? 'x' : ''}${toSq}${enemyInCheck ? (status === 'checkmate' ? '#' : '+') : ''}`;

  return {
    board: newBoard,
    capturedPiece: captured,
    isPawnPromotion,
    notation,
    fromSq,
    toSq,
    inCheck: enemyInCheck,
    isCheckmate: status === 'checkmate',
    isStalemate: status === 'stalemate',
    status,
  };
}
