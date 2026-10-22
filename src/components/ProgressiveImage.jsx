import React, { useState, useEffect } from 'react';
import { resolveMediaUrl } from '../utils/videoHelper';

/**
 * Progressive Blur-Up Image Loader with 4-Tier Waterfall Fallback.
 *
 * Instagram-style progressive image rendering:
 * 1. Instantly renders the ultra-fast blurred thumbnail (base64 or local cache)
 * 2. Preloads and fades in the full-resolution HD photo once loaded
 * 3. Gracefully cycles through a 4-tier waterfall if any source fails:
 *    [1] High-speed VPS URL (/uploads/photo_xxx.jpg)
 *    [2] Google Drive Thumbnail (https://drive.google.com/thumbnail?id=xxx&sz=w1600)
 *    [3] Google Drive Direct Stream (https://lh3.googleusercontent.com/d/xxx or /uc?export=download)
 *    [4] Firestore Base64 Thumbnail
 *    [5] Branded SVG Beach Placeholder
 */
export default function ProgressiveImage({
  src,
  thumb,
  alt = 'Tour media',
  className = '',
  style = {},
  fallbackSrcs = [],
  driveFileId = null,
  loading = 'lazy',
  onClick,
  onLoad,
  onError,
}) {
  // Construct the comprehensive waterfall candidate list
  const candidates = React.useMemo(() => {
    const list = [];
    if (src) list.push(src);

    if (Array.isArray(fallbackSrcs)) {
      list.push(...fallbackSrcs.filter(Boolean));
    }

    if (driveFileId) {
      list.push(`https://drive.google.com/thumbnail?id=${driveFileId}&sz=w1600`);
      list.push(`https://lh3.googleusercontent.com/d/${driveFileId}`);
      list.push(`https://drive.google.com/uc?export=download&id=${driveFileId}`);
    }

    if (thumb && !list.includes(thumb)) {
      list.push(thumb);
    }

    // Deduplicate while preserving sequence order
    return Array.from(new Set(list));
  }, [src, fallbackSrcs, driveFileId, thumb]);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [allFailed, setAllFailed] = useState(false);

  // Reset states whenever candidate list changes
  useEffect(() => {
    setCurrentIdx(0);
    setIsLoaded(false);
    setAllFailed(false);
  }, [candidates]);

  const activeSrc = candidates[currentIdx] || null;

  const handleImageLoad = (e) => {
    setIsLoaded(true);
    setAllFailed(false);
    onLoad?.(e);
  };

  const handleImageError = (e) => {
    if (currentIdx + 1 < candidates.length) {
      // Step to next waterfall source
      setCurrentIdx((prev) => prev + 1);
    } else {
      // All sources in waterfall exhausted
      setAllFailed(true);
      onError?.(e);
    }
  };

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden flex items-center justify-center select-none ${className}`}
    >
      {/* 1. Instant Blurred Thumbnail Placeholder */}
      {thumb && !allFailed && (
        <img
          src={thumb}
          alt={alt}
          aria-hidden="true"
          className={`absolute inset-0 w-full h-full object-cover filter blur-md scale-105 transition-opacity duration-500 ease-out pointer-events-none ${
            isLoaded ? 'opacity-0' : 'opacity-100'
          }`}
          style={style}
        />
      )}

      {/* 2. Full-Resolution HD Image with Smooth Fade-In */}
      {activeSrc && !allFailed && (
        <img
          src={activeSrc}
          alt={alt}
          loading={loading}
          onLoad={handleImageLoad}
          onError={handleImageError}
          className={`w-full h-full object-cover transition-opacity duration-300 ease-in-out ${
            isLoaded ? 'opacity-100' : (thumb ? 'opacity-0' : 'opacity-100')
          }`}
          style={style}
        />
      )}

      {/* 3. Branded SVG Beach Placeholder if all fallback tiers failed */}
      {allFailed && (
        <div className="w-full h-full min-h-[160px] flex flex-col items-center justify-center bg-gradient-to-br from-neutral-900 to-neutral-800 text-neutral-400 p-4 text-center">
          <svg
            className="w-12 h-12 mb-2 text-neutral-500 animate-pulse"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="text-xs font-medium text-neutral-300">ছবি লোড হতে পারেনি</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setAllFailed(false);
              setCurrentIdx(0);
              setIsLoaded(false);
            }}
            className="mt-2 text-[11px] bg-neutral-700 hover:bg-neutral-600 active:scale-95 text-white px-3 py-1 rounded-full border border-neutral-600 transition"
          >
            পুনরায় চেষ্টা করুন 🔄
          </button>
        </div>
      )}
    </div>
  );
}
