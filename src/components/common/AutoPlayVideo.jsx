import { useEffect, useRef } from "react";

export default function AutoPlayVideo({ src, className, controls = true, reloadKey, muted, ...rest }) {
  const videoRef = useRef(null);
  const allowFallbackMute = muted === undefined;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) {
      return;
    }

    let cancelled = false;

    const tryPlay = () => {
      if (cancelled) {
        return;
      }

      if (muted !== undefined) {
        video.muted = muted;
      } else {
        video.muted = false;
      }

      const playPromise = video.play();

      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {
          if (!allowFallbackMute || cancelled) {
            return;
          }

          video.muted = true;
          video.play().catch(() => {
            // Ignore further autoplay errors; the user can start playback manually.
          });
        });
      }
    };

    const handleCanPlay = () => {
      video.removeEventListener("canplay", handleCanPlay);
      tryPlay();
    };

    video.pause();
    try {
      video.currentTime = 0;
      video.load();
    } catch {
      // Ignore load errors; the browser will handle unsupported sources.
    }

    if (video.readyState >= 2) {
      tryPlay();
    } else {
      video.addEventListener("canplay", handleCanPlay);
    }

    return () => {
      cancelled = true;
      video.removeEventListener("canplay", handleCanPlay);
      video.pause();
    };
  }, [src, reloadKey, muted]);

  return (
    <video
      ref={videoRef}
      src={src}
      className={className}
      controls={controls}
      autoPlay
      playsInline
      muted={muted}
      {...rest}
    />
  );
}
