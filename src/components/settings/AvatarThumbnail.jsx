import React, { useState, useEffect, useRef } from "react";
import { User, Check, RefreshCw } from "lucide-react";

/**
 * AvatarThumbnail Component
 * Handles resilient avatar loading with:
 * - Animated placeholder / skeleton during load/retry
 * - Automatic exponential backoff retry for HTTP 429 / network failures
 * - Smooth transition when image is loaded
 * - Accessible selection state
 */
export default function AvatarThumbnail({
  src,
  alt,
  isSelected,
  onClick,
  maxRetries = 4,
}) {
  const [loadState, setLoadState] = useState("loading"); // 'loading' | 'loaded' | 'error'
  const [retryCount, setRetryCount] = useState(0);
  const [imgSrc, setImgSrc] = useState(src);
  const retryTimeoutRef = useRef(null);

  // Reset state if src changes
  useEffect(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    setImgSrc(src);
    setLoadState("loading");
    setRetryCount(0);

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [src]);

  const handleImageError = () => {
    if (retryCount < maxRetries) {
      // Exponential backoff with random jitter (e.g., 600ms, 1200ms, 2400ms, 4800ms)
      const baseDelay = 600 * Math.pow(1.8, retryCount);
      const jitter = Math.random() * 400;
      const delay = Math.min(baseDelay + jitter, 6000);

      setLoadState("loading");
      retryTimeoutRef.current = setTimeout(() => {
        setRetryCount((prev) => prev + 1);
        const separator = src.includes("?") ? "&" : "?";
        setImgSrc(`${src}${separator}_r=${retryCount + 1}`);
      }, delay);
    } else {
      setLoadState("error");
    }
  };

  const handleManualRetry = (e) => {
    e.stopPropagation();
    setRetryCount(0);
    setLoadState("loading");
    const separator = src.includes("?") ? "&" : "?";
    setImgSrc(`${src}${separator}_t=${Date.now()}`);
  };

  const handleClick = (e) => {
    if (loadState === "error") {
      handleManualRetry(e);
    } else if (onClick) {
      onClick(e);
    }
  };

  return (
    <button
      type="button"
      title={alt}
      aria-label={alt}
      aria-pressed={isSelected}
      onClick={handleClick}
      className={`relative w-full aspect-square rounded-lg overflow-hidden border-2 transition-all active:scale-95 md:hover:scale-105 bg-gray-100 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 ${
        isSelected
          ? "border-blue-700 shadow-md ring-2 ring-blue-400"
          : "border-gray-200 hover:border-cyan-400"
      }`}
    >
      {/* Loading Skeleton */}
      {loadState === "loading" && (
        <div
          data-testid="avatar-skeleton"
          className="absolute inset-0 flex items-center justify-center bg-gray-100 animate-pulse"
        >
          <User className="w-5 h-5 text-gray-300" />
        </div>
      )}

      {/* Fallback Error State after max retries */}
      {loadState === "error" ? (
        <div
          data-testid="avatar-error"
          className="flex flex-col items-center justify-center p-1 text-gray-400 text-center"
        >
          <User className="w-5 h-5 text-gray-400 mb-0.5" />
          <span className="text-[10px] text-blue-600 font-medium flex items-center gap-0.5">
            <RefreshCw size={10} />
            <span>Retry</span>
          </span>
        </div>
      ) : (
        <img
          src={imgSrc}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoadState("loaded")}
          onError={handleImageError}
          className={`w-full h-full object-cover transition-opacity duration-200 ${
            loadState === "loaded" ? "opacity-100" : "opacity-0"
          }`}
        />
      )}

      {/* Selection Checkmark Overlay */}
      {isSelected && (
        <div
          data-testid="avatar-selected"
          className="absolute inset-0 bg-blue-700 bg-opacity-20 flex items-center justify-center"
        >
          <Check className="text-blue-700 bg-white rounded-full p-1 shadow-sm" size={20} />
        </div>
      )}
    </button>
  );
}
