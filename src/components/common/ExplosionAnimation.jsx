import React, { useEffect, useState } from "react";
import { Flame, AlertOctagon } from "lucide-react";

/**
 * ExplosionAnimation component
 * Renders a dramatic full-screen detonation animation when the countdown reaches 0.
 * 
 * @param {object} props
 * @param {Function} [props.onAnimationComplete] Optional callback after explosion peak
 */
export default function ExplosionAnimation({ onAnimationComplete }) {
  const [phase, setPhase] = useState("flash"); // flash -> blast -> smoke -> done

  useEffect(() => {
    // 0-300ms: blinding flash
    // 300-1500ms: fire blast & shockwave
    // 1500ms+: smoke & failure state
    const t1 = setTimeout(() => setPhase("blast"), 250);
    const t2 = setTimeout(() => {
      setPhase("smoke");
      if (onAnimationComplete) onAnimationComplete();
    }, 1600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onAnimationComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black select-none">
      <style>{`
        @keyframes shockwave {
          0% { transform: scale(0.1); opacity: 1; }
          60% { transform: scale(3.5); opacity: 0.8; }
          100% { transform: scale(5); opacity: 0; }
        }
        @keyframes fireball {
          0% { transform: scale(0.2) rotate(0deg); opacity: 1; }
          50% { transform: scale(1.6) rotate(15deg); opacity: 0.95; }
          100% { transform: scale(2.2) rotate(-10deg); opacity: 0.8; }
        }
        @keyframes screenshake {
          0%, 100% { transform: translate(0, 0); }
          10%, 30%, 50%, 70%, 90% { transform: translate(-10px, 8px) rotate(-1deg); }
          20%, 40%, 60%, 80% { transform: translate(10px, -8px) rotate(1deg); }
        }
        @keyframes emberFloat {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-120px) scale(0.3); opacity: 0; }
        }
        .anim-shake {
          animation: screenshake 0.8s ease-in-out;
        }
        .anim-shockwave {
          animation: shockwave 1.4s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
        }
        .anim-fireball {
          animation: fireball 1.2s ease-out forwards;
        }
      `}</style>

      {/* Screen Shake Container */}
      <div className="absolute inset-0 flex items-center justify-center anim-shake pointer-events-none">
        {/* Blinding Flash Phase */}
        {phase === "flash" && (
          <div className="absolute inset-0 bg-white transition-opacity duration-200" />
        )}

        {/* Expanding Shockwaves */}
        <div className="absolute h-96 w-96 rounded-full border-8 border-orange-400 bg-red-600/40 anim-shockwave blur-md" />
        <div
          className="absolute h-80 w-80 rounded-full border-8 border-yellow-300 bg-orange-500/50 anim-shockwave blur-sm"
          style={{ animationDelay: "150ms" }}
        />

        {/* Fireball Core */}
        <div className="relative flex items-center justify-center anim-fireball">
          <div className="h-72 w-72 sm:h-96 sm:w-96 rounded-full bg-gradient-to-r from-red-600 via-orange-500 to-yellow-400 blur-xl opacity-90" />
          <div className="absolute h-48 w-48 sm:h-64 sm:w-64 rounded-full bg-yellow-200 blur-lg opacity-95" />
          <div className="absolute text-8xl sm:text-9xl drop-shadow-[0_0_30px_rgba(255,255,255,1)]">
            💥
          </div>
        </div>

        {/* Floating Debris / Embers */}
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute h-3 w-3 rounded-full bg-amber-400 shadow-[0_0_10px_#f59e0b]"
            style={{
              left: `${15 + (i * 7)}%`,
              top: `${40 + (i % 5) * 8}%`,
              animation: `emberFloat ${0.8 + (i % 4) * 0.3}s ease-out infinite`,
              animationDelay: `${i * 100}ms`,
            }}
          />
        ))}
      </div>

      {/* Dramatic Overlay Text */}
      <div className="relative z-10 text-center px-4 max-w-xl animate-fade-in">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-950/90 border-2 border-red-500 text-red-400 text-sm sm:text-base font-mono font-bold tracking-wider mb-4 shadow-[0_0_20px_rgba(239,68,68,0.5)]">
          <AlertOctagon size={20} className="animate-spin" />
          DETONATION CONFIRMED
        </div>

        <h1 className="text-5xl sm:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-orange-400 to-red-600 mb-4 drop-shadow-[0_4px_16px_rgba(0,0,0,1)] tracking-tight">
          BOOM!
        </h1>

        <p className="text-2xl sm:text-3xl font-bold text-white mb-2 drop-shadow-md">
          Defusal Failed!
        </p>

        <p className="text-base sm:text-lg text-neutral-300 font-medium">
          The countdown reached zero. The bomb detonated.
        </p>

        <div className="mt-8 flex justify-center items-center gap-2 text-red-400">
          <Flame className="animate-pulse" size={24} />
          <span className="font-mono text-sm tracking-widest uppercase">
            Mission Terminated
          </span>
          <Flame className="animate-pulse" size={24} />
        </div>
      </div>
    </div>
  );
}
