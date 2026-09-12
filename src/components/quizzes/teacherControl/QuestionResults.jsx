import React from "react";
import { SkipForward, Trophy, X, AlertTriangle, ShieldCheck, Zap, Clock } from "lucide-react";
import MediaDisplay from "./MediaDisplay";
import AnswerOptionsGrid from "./AnswerOptionsGrid";
import Leaderboard from "./Leaderboard";
import BombDevice from "../../common/BombDevice";
import ExplosionAnimation from "../../common/ExplosionAnimation";
import { buildAnswerShuffleMap } from "../../../utils/answerShuffle";

export default function QuestionResults({
  quiz,
  session,
  currentQuestion,
  questions,
  questionResults,
  participants,
  teams,
  nextQuestion,
  endQuiz,
  endingQuiz,
  closeSession,
  isTransitioning,
  bombTotalTime = 300,
  bombTimeRemaining = 0,
  bombPenaltyInfo = null,
  bombExploded = false,
  isThinkingTime = false,
  countdownValue = 5,
}) {
  const isDefuseMode = session?.mode === "defuse";

  // Build answer counts keyed by ORIGINAL option index (as stored in the DB)
  const originalAnswerCounts = {};
  currentQuestion.options?.forEach((_, idx) => {
    originalAnswerCounts[idx] = 0;
  });
  questionResults.forEach((answer) => {
    if (answer.selected_option_index !== null) {
      originalAnswerCounts[answer.selected_option_index] =
        (originalAnswerCounts[answer.selected_option_index] || 0) + 1;
    }
  });

  // When answers were shuffled, display options in the shuffled order and
  // remap counts so each tile shows the count for the answer it actually displays.
  let displayOptions = currentQuestion.options;
  let answerCounts = originalAnswerCounts; // default: 1-to-1 mapping

  if (session?.randomize_answers && currentQuestion?.options) {
    const { shuffledOptions, originalToShuffled } = buildAnswerShuffleMap(
      currentQuestion.options,
      session.id,
      currentQuestion.id
    );
    displayOptions = shuffledOptions;

    // Remap: answerCounts[displayIdx] = count of students who picked that display slot
    answerCounts = {};
    currentQuestion.options.forEach((_, originalIdx) => {
      const displayIdx = originalToShuffled[originalIdx];
      answerCounts[displayIdx] = originalAnswerCounts[originalIdx] || 0;
    });
  }

  const hasPenalty = bombPenaltyInfo && bombPenaltyInfo.incurred && bombPenaltyInfo.penaltyPct > 0;

  return (
    <>
      {bombExploded && <ExplosionAnimation />}
      <nav className="bg-white shadow-md p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-700">{quiz.title}</h1>
        <button
          onClick={closeSession}
          className="text-red-600 hover:text-red-700"
        >
          <X size={24} />
        </button>
      </nav>

      <div className="flex-1">
        <div className="container mx-auto p-6">
          {/* Defuse Mode Crisis Alert Screen */}
          {isDefuseMode && (
            <div className="mb-8 space-y-6">
              <div
                className={`relative overflow-hidden rounded-2xl border-4 shadow-2xl ${
                  hasPenalty
                    ? "border-red-600 bg-gradient-to-br from-red-950 via-neutral-900 to-red-900/80 shadow-red-950/70"
                    : "border-emerald-500 bg-gradient-to-br from-emerald-950 via-neutral-900 to-neutral-950 shadow-emerald-950/40"
                }`}
              >
                {/* Diagonal hazard stripes */}
                <div
                  className="h-3 w-full opacity-75"
                  style={{
                    backgroundImage: hasPenalty
                      ? "repeating-linear-gradient(45deg, #dc2626, #dc2626 12px, #000 12px, #000 24px)"
                      : "repeating-linear-gradient(45deg, #059669, #059669 12px, #000 12px, #000 24px)",
                  }}
                />

                <div className="p-6 text-center text-white">
                  {hasPenalty ? (
                    <>
                      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-600/30 border border-red-500 text-red-300 font-mono text-sm font-bold tracking-wider mb-3 animate-pulse">
                        <AlertTriangle size={18} className="text-red-400" />
                        CRISIS ALERT // TIME PENALTY INCURRED
                      </div>
                      <h3 className="text-3xl sm:text-4xl font-black text-red-400 mb-2">
                        -{bombPenaltyInfo.penaltyPct}% TIME DEDUCTED (-{bombPenaltyInfo.deductionSeconds}s)
                      </h3>
                      <p className="text-neutral-200 text-base sm:text-lg mb-4">
                        <span className="font-bold text-red-300">{bombPenaltyInfo.incorrectCount} of {bombPenaltyInfo.totalQuizTakers}</span> players ({bombPenaltyInfo.incorrectPct}%) answered incorrectly.
                      </p>
                      <div className="inline-flex items-center gap-4 bg-black/60 rounded-xl px-6 py-2.5 border border-red-800 text-amber-300 font-mono">
                        <Clock size={18} />
                        <span className="text-sm font-semibold uppercase">Updated Bomb Clock:</span>
                        <span className="text-xl font-bold">{bombTimeRemaining}s remaining</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-600/30 border border-emerald-500 text-emerald-300 font-mono text-sm font-bold tracking-wider mb-3">
                        <ShieldCheck size={18} className="text-emerald-400" />
                        DEFENSE HOLDING // NO PENALTY
                      </div>
                      <h3 className="text-3xl sm:text-4xl font-black text-emerald-400 mb-2">
                        NO TIME PENALTY!
                      </h3>
                      <p className="text-neutral-200 text-base sm:text-lg mb-4">
                        Less than 25% answered incorrectly ({bombPenaltyInfo?.incorrectCount || 0} of {bombPenaltyInfo?.totalQuizTakers || participants.length}, {bombPenaltyInfo?.incorrectPct || 0}%).
                      </p>
                      <div className="inline-flex items-center gap-4 bg-black/60 rounded-xl px-6 py-2.5 border border-emerald-800 text-emerald-300 font-mono">
                        <ShieldCheck size={18} />
                        <span className="text-sm font-semibold uppercase">Bomb Clock Preserved:</span>
                        <span className="text-xl font-bold">{bombTimeRemaining}s remaining</span>
                      </div>
                    </>
                  )}

                  {isThinkingTime && (
                    <div className="mt-4 inline-flex items-center gap-2 bg-amber-500/20 border border-amber-400/60 rounded-xl px-5 py-2 text-amber-300 font-bold animate-pulse">
                      <Clock size={18} />
                      <span>Next question starting in {countdownValue}s...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Paused Bomb Device */}
              <div className="flex justify-center">
                <BombDevice
                  timeRemaining={bombTimeRemaining}
                  totalTime={bombTotalTime}
                  isPaused={true}
                  size="md"
                />
              </div>
            </div>
          )}

          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 mb-6">
            <h2 className="text-3xl font-bold text-center mb-6">
              {currentQuestion.question_text}
            </h2>

            {/* Media Display in Results */}
            <MediaDisplay question={currentQuestion} className="max-w-md mx-auto rounded-lg shadow-lg mb-6" />

            <div className="mb-8">
              <AnswerOptionsGrid options={displayOptions} mode="results" answerCounts={answerCounts} isSurvey={quiz?.is_survey} />
            </div>

            <div className="flex justify-center">
              {session.current_question_index < questions.length - 1 ? (
                <button
                  onClick={nextQuestion}
                  disabled={isTransitioning}
                  className="bg-blue-600 text-white px-12 py-4 rounded-xl hover:bg-blue-700 text-xl font-bold flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isTransitioning ? 'Loading Q' + (session.current_question_index + 2) + '...' : 'Next Question'}
                  {!isTransitioning && <SkipForward size={24} />}
                </button>
              ) : (
                <button
                  onClick={() => endQuiz()}
                  disabled={endingQuiz}
                  className="bg-blue-700 text-white px-12 py-4 rounded-xl hover:bg-blue-800 text-xl font-bold flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trophy size={24} />
                  {endingQuiz ? 'Finishing...' : (quiz?.is_survey ? 'Finish Survey' : 'Show Final Results')}
                </button>
              )}
            </div>
          </div>

          {/* Leaderboard */}
          {!quiz?.is_survey && (
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-6">
              <Leaderboard participants={participants} teams={teams} mode={session.mode} limit={5} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
