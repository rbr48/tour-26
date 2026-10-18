import React from 'react';

/**
 * High-definition SVG Chess Pieces
 * Scalable, high-contrast pieces that render with pristine clarity on all mobile screens.
 */
export default function ChessPieceSvg({ piece, className = 'w-full h-full' }) {
  if (!piece) return null;
  const color = piece[0]; // 'w' or 'b'
  const type = piece[1]; // 'P', 'R', 'N', 'B', 'Q', 'K'

  const isWhite = color === 'w';
  const fillColor = isWhite ? '#ffffff' : '#1e293b';
  const strokeColor = isWhite ? '#0f172a' : '#f8fafc';
  const accentColor = isWhite ? '#cbd5e1' : '#475569';

  switch (type) {
    case 'P': // Pawn
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <path
            d="m 22.5,9 c -2.21,0 -4,1.79 -4,4 0,0.89 0.29,1.71 0.78,2.38 C 17.33,16.5 16,18.59 16,21 c 0,2.03 0.94,3.84 2.41,5.03 C 15.41,27.09 11,31.58 11,39.5 l 23,0 c 0,-7.92 -4.41,-12.41 -7.41,-13.47 1.47,-1.19 2.41,-3 2.41,-5.03 0,-2.41 -1.33,-4.5 -3.28,-5.62 C 26.21,14.71 26.5,13.89 26.5,13 c 0,-2.21 -1.79,-4 -4,-4 z"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="m 12,36 c 7,-1 14,-1 21,0"
            fill="none"
            stroke={strokeColor}
            strokeWidth="1.2"
          />
        </svg>
      );

    case 'R': // Rook
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <g
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M 9,39 L 36,39 L 36,36 L 9,36 z" />
            <path d="M 12,36 L 12,32 L 33,32 L 33,36 z" />
            <path d="M 11,14 L 11,9 L 15,9 L 15,11 L 20,11 L 20,9 L 25,9 L 25,11 L 30,11 L 30,9 L 34,9 L 34,14" />
            <path d="M 34,14 L 31,17 L 14,17 L 11,14" />
            <path d="M 31,17 L 31,29.5 L 14,29.5 L 14,17" />
            <path d="M 14,29.5 L 12,32 L 33,32 L 31,29.5" />
            <path d="M 14,16.5 L 31,16.5" fill="none" stroke={accentColor} strokeWidth="1" />
            <path d="M 13,31.5 L 32,31.5" fill="none" stroke={accentColor} strokeWidth="1" />
          </g>
        </svg>
      );

    case 'N': // Knight
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <g
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M 22,10 C 32.5,11 38.5,18 38,39 L 15,39 C 15,30 25,32.5 23,18" />
            <path d="M 24,18 C 24.38,20.91 18.45,25.37 16,27 C 13,29 13.18,31.34 11,31 C 9.958,30.06 12.41,27.96 11,28 C 10,28 11.19,29.23 10,30 C 9,30 5.997,31 6,26 C 6,24 12,14 12,14 C 12,14 13.89,12.1 14,10.5 C 13.27,7.4 17.5,7 17.5,7 C 17.5,7 19.5,8 20,10.5 L 22,10 z" />
            <circle cx="15" cy="14" r="1.5" fill={isWhite ? '#0f172a' : '#ffffff'} />
          </g>
        </svg>
      );

    case 'B': // Bishop
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <g
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M 9,36 C 12.39,35.03 19.11,36.43 22.5,34 C 25.89,36.43 32.61,35.03 36,36 C 36,36 37.65,36.54 39,38 C 38.32,38.97 37.35,38.99 36,38.5 C 32.61,37.53 25.89,38.96 22.5,37.5 C 19.11,38.96 12.39,37.53 9,38.5 C 7.646,38.99 6.677,38.97 6,38 C 7.354,36.54 9,36 9,36 z" />
            <path d="M 15,32 C 17.5,34.5 27.5,34.5 30,32 C 30.5,30.5 30,30 30,30 C 30,27.5 27.5,26 27.5,26 C 33,24.5 33.5,14.5 22.5,10.5 C 11.5,14.5 12,24.5 17.5,26 C 17.5,26 15,27.5 15,30 C 15,30 14.5,30.5 15,32 z" />
            <circle cx="22.5" cy="8" r="1.8" />
            <path d="M 17.5,26 L 27.5,26" fill="none" stroke={accentColor} strokeWidth="1" />
            <path d="M 22.5,15.5 L 22.5,20.5 M 20,18 L 25,18" fill="none" stroke={strokeColor} strokeWidth="1.2" />
          </g>
        </svg>
      );

    case 'Q': // Queen
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <g
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M 9,26 C 17.5,24.5 30,24.5 36,26 L 38.5,13.5 L 31,25 L 22.5,10 L 14,25 L 6.5,13.5 L 9,26 z" />
            <path d="M 9,26 C 9,28 10.5,28 11.5,30 C 12.5,31.5 12.5,31 12,33.5 C 10.5,34.5 11,36 11,36 C 9.5,37.5 11,38.5 11,38.5 L 34,38.5 C 34,38.5 35.5,37.5 34,36 C 34,36 34.5,34.5 33,33.5 C 32.5,31 32.5,31.5 33.5,30 C 34.5,28 36,28 36,26" />
            <circle cx="6" cy="12" r="1.8" />
            <circle cx="14" cy="9" r="1.8" />
            <circle cx="22.5" cy="8" r="1.8" />
            <circle cx="31" cy="9" r="1.8" />
            <circle cx="39" cy="12" r="1.8" />
            <path d="M 12,33.5 L 33,33.5" fill="none" stroke={accentColor} strokeWidth="1" />
          </g>
        </svg>
      );

    case 'K': // King
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <g
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Cross */}
            <path d="M 22.5,11.5 L 22.5,4.5 M 19,8 L 26,8" stroke={strokeColor} strokeWidth="1.5" />
            {/* Crown */}
            <path d="M 11.5,37 C 17,40.5 28,40.5 33.5,37 C 36.5,32 38.5,25 36.5,18 C 30,17 28.5,23.5 22.5,23.5 C 16.5,23.5 15,17 8.5,18 C 6.5,25 8.5,32 11.5,37 z" />
            <path d="M 11.5,30 C 17,27 28,27 33.5,30" fill="none" stroke={accentColor} strokeWidth="1" />
            <path d="M 11.5,33.5 C 17,30.5 28,30.5 33.5,33.5" fill="none" stroke={accentColor} strokeWidth="1" />
          </g>
        </svg>
      );

    default:
      return null;
  }
}
