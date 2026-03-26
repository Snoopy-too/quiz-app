import React from "react";
import { useTranslation } from "react-i18next";
import { Clock, BrainCircuit, Users, X } from "lucide-react";
import MediaDisplay from "./MediaDisplay";
import AnswerOptionsGrid from "./AnswerOptionsGrid";
import { buildAnswerShuffleMap } from "../../../utils/answerShuffle";

export default function ActiveQuestion({
  quiz,
  session,
  currentQuestion,
  questions,
  participants,
  liveAnswers,
  isThinkingTime,
  questionTimeRemaining,
  allStudentsAnswered,
  showAnswers,
  answerRevealCountdown,
  closeSession,
}) {
  const { t } = useTranslation();

  // Mirror what students see: apply the same deterministic shuffle when randomize_answers is on
  const displayOptions = React.useMemo(() => {
    if (session?.randomize_answers && currentQuestion?.options) {
      const { shuffledOptions } = buildAnswerShuffleMap(
        currentQuestion.options,
        session.id,
        currentQuestion.id
      );
      return shuffledOptions;
    }
    return currentQuestion?.options;
  }, [session?.randomize_answers, session?.id, currentQuestion?.id, currentQuestion?.options]);

  return (
    <>
      <nav className="bg-white shadow-md p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-700">{quiz.title}</h1>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${isThinkingTime ? "bg-yellow-100 animate-pulse" :
              !showAnswers ? "bg-purple-100 animate-pulse" : "bg-blue-50"
            }`}>
            {isThinkingTime ? (
              <>
                <BrainCircuit size={20} className="text-yellow-700" />
                <span className="text-2xl font-bold text-yellow-700">
                  {t('teacher.thinking')}: {questionTimeRemaining}s
                </span>
              </>
            ) : !showAnswers ? (
              <>
                <Clock size={20} className="text-purple-700" />
                <span className="text-2xl font-bold text-purple-700">
                  {t('quiz.revealing')}: {answerRevealCountdown}s
                </span>
              </>
            ) : (
              <>
                <Clock size={20} className="text-blue-700" />
                <span className="text-2xl font-bold text-blue-700">
                  {questionTimeRemaining}s
                </span>
              </>
            )}
          </div>
          <span className="text-gray-600">
            Question {session.current_question_index + 1} of {questions.length}
          </span>
          <button
            onClick={closeSession}
            className="text-red-600 hover:text-red-700"
          >
            <X size={24} />
          </button>
        </div>
      </nav>

      <div className="flex-1">
        <div className="container mx-auto p-6">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 mb-6">
            <div className="text-center mb-8">
              <p className="text-gray-600 mb-4">Time: {currentQuestion.time_limit}s</p>
              <h2 className="text-4xl font-bold mb-6">{currentQuestion.question_text}</h2>

              {/* Media Display */}
              <MediaDisplay question={currentQuestion} />
            </div>

            {!showAnswers ? (
              /* 4-second countdown before revealing answers */
              <div className="flex flex-col items-center justify-center py-12">
                <p className="text-xl text-gray-600 mb-4">{t('quiz.revealingAnswersIn')}</p>
                <div className="relative">
                  <svg className="w-24 h-24" viewBox="0 0 100 100">
                    {/* Background circle */}
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="8"
                    />
                    {/* Animated progress circle */}
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray="283"
                      strokeDashoffset="283"
                      transform="rotate(-90 50 50)"
                      style={{
                        animation: 'circleProgress 4s linear forwards'
                      }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-4xl font-bold text-blue-600">{answerRevealCountdown}</span>
                  </div>
                </div>
                <p className="text-gray-500 mt-4">{t('quiz.getReady')}</p>
                <style>{`
                  @keyframes circleProgress {
                    from { stroke-dashoffset: 283; }
                    to { stroke-dashoffset: 0; }
                  }
                `}</style>
              </div>
            ) : (
              <AnswerOptionsGrid options={displayOptions} mode="display" />
            )}
          </div>

          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users size={24} />
                <span className="text-xl font-semibold">
                  {participants.filter((p) =>
                    liveAnswers.some((a) => a.participant_id === p.id)
                  ).length}{" "}
                  / {participants.length} answered
                </span>
              </div>
              {allStudentsAnswered ? (
                <div className="bg-green-100 text-green-800 px-6 py-3 rounded-lg font-semibold animate-pulse">
                  All answered! Showing results...
                </div>
              ) : (
                <div className="text-gray-600 text-sm">
                  Waiting for all students...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
