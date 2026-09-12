import React from "react";
import { formatBombTime } from "../../utils/defuseMode";
import { AlertTriangle, PauseCircle, Flame } from "lucide-react";

/**
 * BombDevice component
 * Displays a tactical bomb prop with looped red and blue wires,
 * blinking LED indicators, and a high-visibility digital countdown clock.
 * 
 * @param {object} props
 * @param {number} props.timeRemaining Current remaining seconds
 * @param {number} props.totalTime Original starting seconds
 * @param {boolean} [props.isPaused=false] Whether the timer is currently paused
 * @param {string} [props.size="md"] "sm" | "md" | "lg"
 * @param {string} [props.className=""] Additional CSS classes
 */
export default function BombDevice({
  timeRemaining = 0,
  totalTime = 300,
  isPaused = false,
  size = "md",
  className = "",
}) {
  const percentRemaining = totalTime > 0 ? (timeRemaining / totalTime) * 100 : 0;
  const isCritical = timeRemaining <= 30 || percentRemaining <= 20;
  const isEmergency = timeRemaining <= 10;

  const formattedTime = formatBombTime(timeRemaining);

  // Size scale factors
  const isSmall = size === "sm";
  const isLarge = size === "lg";

  return (
    <div
      className={`relative select-none transition-all duration-300 ${
        isEmergency ? "animate-bounce" : ""
      } ${className}`}
    >
      {/* Outer Tactical Device Frame */}
      <div
        className={`relative mx-auto rounded-2xl border-4 bg-gradient-to-b from-neutral-900 via-neutral-800 to-neutral-950 p-4 sm:p-6 shadow-2xl ${
          isCritical
            ? "border-red-600 shadow-red-900/50"
            : isPaused
            ? "border-amber-500 shadow-amber-900/30"
            : "border-neutral-700 shadow-black/80"
        } ${isSmall ? "max-w-xs" : isLarge ? "max-w-2xl" : "max-w-lg"}`}
      >
        {/* Top Wire Bundle Anchor Screws */}
        <div className="flex items-center justify-between px-2 pb-3">
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full bg-neutral-600 border border-neutral-400 shadow-inner" />
            <span className="text-[10px] sm:text-xs font-mono tracking-widest text-neutral-400 font-bold uppercase">
              DEFUSE-SYS // MK-IV
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Blinking Status LED */}
            <div className="flex items-center gap-1.5 bg-neutral-950/80 px-2.5 py-1 rounded-full border border-neutral-700">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  isPaused
                    ? "bg-amber-400 animate-pulse"
                    : isCritical
                    ? "bg-red-500 animate-ping"
                    : "bg-emerald-400 animate-pulse"
                }`}
              />
              <span
                className={`text-[10px] font-mono font-bold tracking-wider ${
                  isPaused
                    ? "text-amber-400"
                    : isCritical
                    ? "text-red-400 animate-pulse"
                    : "text-emerald-400"
                }`}
              >
                {isPaused ? "PAUSED" : isCritical ? "CRITICAL" : "ARMED"}
              </span>
            </div>
            <span className="inline-block h-3 w-3 rounded-full bg-neutral-600 border border-neutral-400 shadow-inner" />
          </div>
        </div>

        {/* Decorative Wires Container (SVG Overlay) */}
        <div className="relative mb-3 flex items-center justify-center overflow-hidden rounded-xl bg-neutral-950/90 py-1.5 border border-neutral-800">
          <svg
            className="w-full h-10 sm:h-12"
            viewBox="0 0 400 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Blue Wire (curved loop) */}
            <path
              d="M 20,12 C 100,-4 140,48 220,16 C 280,-6 340,40 380,24"
              stroke="#2563EB"
              strokeWidth="5"
              strokeLinecap="round"
              className="drop-shadow-[0_2px_4px_rgba(37,99,235,0.6)]"
            />
            {/* Red Wire (curved loop) */}
            <path
              d="M 20,36 C 80,48 160,-2 240,32 C 300,52 340,8 380,24"
              stroke="#DC2626"
              strokeWidth="5"
              strokeLinecap="round"
              className="drop-shadow-[0_2px_4px_rgba(220,38,38,0.6)]"
            />
            {/* Yellow Ground Wire */}
            <path
              d="M 40,24 C 120,32 180,12 280,36 C 330,46 360,20 375,24"
              stroke="#EAB308"
              strokeWidth="3"
              strokeDasharray="8 4"
              strokeLinecap="round"
              className="opacity-70"
            />
            {/* Wire Clips */}
            <rect x="70" y="8" width="8" height="32" rx="2" fill="#404040" stroke="#737373" strokeWidth="1" />
            <rect x="200" y="8" width="8" height="32" rx="2" fill="#404040" stroke="#737373" strokeWidth="1" />
            <rect x="330" y="8" width="8" height="32" rx="2" fill="#404040" stroke="#737373" strokeWidth="1" />
          </svg>
        </div>

        {/* Digital LED Timer Display */}
        <div
          className={`relative overflow-hidden rounded-xl border-2 bg-black/95 p-4 sm:p-6 text-center shadow-inner ${
            isCritical
              ? "border-red-600/80 shadow-red-950"
              : isPaused
              ? "border-amber-600/60 shadow-amber-950"
              : "border-neutral-700 shadow-black"
          }`}
        >
          {/* Faint 88:88:88 background segments for authentic digital LED look */}
          <div
            className="absolute inset-0 flex items-center justify-center font-mono font-black text-neutral-900 select-none opacity-20 pointer-events-none"
            style={{
              fontSize: isSmall ? "2.5rem" : isLarge ? "5rem" : "3.75rem",
              letterSpacing: "0.15em",
            }}
          >
            88:88
          </div>

          {/* Glowing Active LED Countdown Digits */}
          <div
            className={`relative font-mono font-black tracking-widest transition-colors ${
              isCritical
                ? "text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]"
                : isPaused
                ? "text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.7)]"
                : "text-red-400 drop-shadow-[0_0_10px_rgba(248,113,113,0.6)]"
            }`}
            style={{
              fontSize: isSmall ? "2.5rem" : isLarge ? "5rem" : "3.75rem",
              lineHeight: 1,
            }}
          >
            {formattedTime}
          </div>

          {/* Sub-label showing State / Status */}
          <div className="mt-3 flex items-center justify-center gap-2">
            {isPaused ? (
              <span className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-amber-400">
                <PauseCircle size={16} /> CLOCK PAUSED
              </span>
            ) : isCritical ? (
              <span className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-red-500 animate-pulse">
                <Flame size={16} /> DETONATION IMMINENT
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs sm:text-sm text-neutral-400 font-mono">
                <AlertTriangle size={14} className="text-amber-400" /> TICKING DOWN
              </span>
            )}
          </div>
        </div>

        {/* Bottom Time-Remaining Progress Bar */}
        <div className="mt-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-950 border border-neutral-800">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                isCritical
                  ? "bg-red-600 animate-pulse"
                  : isPaused
                  ? "bg-amber-500"
                  : "bg-gradient-to-r from-red-600 via-amber-500 to-emerald-500"
              }`}
              style={{ width: `${Math.max(0, Math.min(100, percentRemaining))}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
