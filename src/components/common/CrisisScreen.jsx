import React from "react";
import { AlertTriangle, ShieldCheck, Zap, Clock, Flame } from "lucide-react";
import BombDevice from "./BombDevice";

/**
 * CrisisScreen component
 * Displayed during pauses between questions in Defuse Mode.
 * Explains whether and why time penalties were deducted, shows the paused bomb clock,
 * and maintains the classic question results feedback.
 * 
 * @param {object} props
 * @param {object} props.penaltyInfo Result from calculateDefusePenalty
 * @param {number} props.timeRemaining Updated remaining time in seconds
 * @param {number} props.totalTime Original starting time in seconds
 * @param {boolean} [props.isThinkingTime=false] Whether the 5s thinking countdown is active
 * @param {number} [props.thinkingSeconds=5] Remaining thinking seconds
 * @param {React.ReactNode} [props.children] Additional content (e.g. correct answer, leaderboard)
 */
export default function CrisisScreen({
  penaltyInfo,
  timeRemaining = 0,
  totalTime = 300,
  isThinkingTime = false,
  thinkingSeconds = 5,
  children,
}) {
  const hasPenalty = penaltyInfo && penaltyInfo.incurred && penaltyInfo.penaltyPct > 0;
  const incorrectPct = penaltyInfo?.incorrectPct ?? 0;
  const incorrectCount = penaltyInfo?.incorrectCount ?? 0;
  const totalCount = penaltyInfo?.totalQuizTakers ?? 0;
  const deductionSeconds = penaltyInfo?.deductionSeconds ?? 0;
  const penaltyPct = penaltyInfo?.penaltyPct ?? 0;

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Hazard / Crisis Alert Banner */}
      <div
        className={`relative overflow-hidden rounded-2xl border-4 shadow-2xl transition-all ${
          hasPenalty
            ? "border-red-600 bg-gradient-to-br from-red-950 via-neutral-900 to-red-900/80 shadow-red-950/70"
            : "border-emerald-500 bg-gradient-to-br from-emerald-950 via-neutral-900 to-neutral-950 shadow-emerald-950/40"
        }`}
      >
        {/* Top Hazard Diagonal Stripes */}
        <div
          className="h-3 w-full opacity-70"
          style={{
            backgroundImage: hasPenalty
              ? "repeating-linear-gradient(45deg, #dc2626, #dc2626 12px, #000 12px, #000 24px)"
              : "repeating-linear-gradient(45deg, #059669, #059669 12px, #000 12px, #000 24px)",
          }}
        />

        <div className="p-6 sm:p-8 text-center text-white">
          {hasPenalty ? (
            <>
              {/* Crisis Header */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-600/30 border border-red-500 text-red-300 font-mono text-xs sm:text-sm font-bold tracking-wider mb-4 animate-pulse">
                <AlertTriangle size={18} className="text-red-400" />
                CRISIS ALERT // TIME PENALTY INCURRED
              </div>

              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-red-400 mb-2 drop-shadow">
                -{penaltyPct}% TIME DEDUCTION!
              </h2>

              <p className="text-lg sm:text-xl font-medium text-neutral-200 mb-4">
                <span className="font-bold text-red-300">{incorrectCount} of {totalCount}</span> players ({incorrectPct}%) answered incorrectly.
              </p>

              {/* Penalty Stat Box */}
              <div className="inline-flex flex-wrap items-center justify-center gap-4 bg-black/60 rounded-xl px-6 py-3 border border-red-800/80">
                <div className="flex items-center gap-2 text-red-400">
                  <Zap size={20} className="fill-red-400" />
                  <span className="text-sm font-semibold uppercase tracking-wide">Deduction:</span>
                  <span className="text-2xl font-black font-mono">-{deductionSeconds}s</span>
                </div>
                <div className="h-6 w-px bg-neutral-700 hidden sm:block" />
                <div className="flex items-center gap-2 text-amber-300">
                  <Clock size={20} />
                  <span className="text-sm font-semibold uppercase tracking-wide">Remaining:</span>
                  <span className="text-2xl font-black font-mono">{timeRemaining}s</span>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Safe Header */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-600/30 border border-emerald-500 text-emerald-300 font-mono text-xs sm:text-sm font-bold tracking-wider mb-4">
                <ShieldCheck size={18} className="text-emerald-400" />
                SYSTEM SECURE // NO PENALTY
              </div>

              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-emerald-400 mb-2">
                DEFENSE HOLDING!
              </h2>

              <p className="text-lg sm:text-xl font-medium text-neutral-200 mb-4">
                Less than 25% incorrect answers ({incorrectCount} of {totalCount}, {incorrectPct}%). No time deducted!
              </p>

              <div className="inline-flex items-center gap-2 bg-black/60 rounded-xl px-6 py-3 border border-emerald-800/80 text-emerald-300">
                <ShieldCheck size={20} />
                <span className="text-sm font-semibold uppercase tracking-wide">Bomb Clock Preserved:</span>
                <span className="text-2xl font-black font-mono">{timeRemaining}s</span>
              </div>
            </>
          )}

          {/* Thinking Time Notice */}
          {isThinkingTime && (
            <div className="mt-6 inline-flex items-center gap-3 bg-amber-500/20 border border-amber-400/60 rounded-xl px-6 py-3 text-amber-300 font-bold animate-pulse">
              <Clock size={22} />
              <span className="text-lg">Next Question Starting in {thinkingSeconds}s...</span>
            </div>
          )}
        </div>
      </div>

      {/* Paused Bomb Device Display */}
      <BombDevice
        timeRemaining={timeRemaining}
        totalTime={totalTime}
        isPaused={true}
        size="md"
      />

      {/* Child elements (Individual student answer feedback, correct answer details) */}
      {children}
    </div>
  );
}
