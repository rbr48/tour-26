import React, { useState, useEffect } from 'react';
import { resolveMediaUrl } from '../utils/videoHelper';

/**
 * Robust UserAvatar component that:
 * 1. Resolves relative URLs to the production host in native Capacitor Android.
 * 2. Uses `referrerPolicy="no-referrer"` to prevent Google CDN (lh3.googleusercontent.com) 403 Forbidden.
 * 3. Gracefully catches image load errors (network, 403, 404) and falls back to a clean initial/emoji badge.
 * 4. Never displays broken image outlines or browser broken icons.
 */
export default function UserAvatar({
  photoUrl = null,
  name = '',
  size = 'w-9 h-9',
  ring = 'ring-2 ring-pink-400',
  fallbackEmoji = null,
  textClass = 'text-xs',
  className = '',
}) {
  const [hasError, setHasError] = useState(false);

  // Reset error state if the photo URL changes
  useEffect(() => {
    setHasError(false);
  }, [photoUrl]);

  const cleanUrl = typeof photoUrl === 'string' && photoUrl.trim() && photoUrl !== 'null' && photoUrl !== 'undefined'
    ? resolveMediaUrl(photoUrl.trim())
    : null;

  const getInitials = (n) => {
    if (!n) return 'ট্যু';
    const trimmed = String(n).trim();
    if (!trimmed) return 'ট্যু';
    return trimmed.slice(0, 2);
  };

  if (cleanUrl && !hasError) {
    return (
      <img
        src={cleanUrl}
        alt={name || 'Avatar'}
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
        loading="lazy"
        onError={() => setHasError(true)}
        className={`${size} rounded-full object-cover shrink-0 select-none ${ring} ${className}`}
      />
    );
  }

  return (
    <div
      className={`${size} rounded-full bg-gradient-to-tr from-teal-700 to-teal-900 text-white flex items-center justify-center font-bold ${textClass} ${ring} shrink-0 select-none ${className}`}
      title={name}
    >
      {fallbackEmoji || getInitials(name)}
    </div>
  );
}
