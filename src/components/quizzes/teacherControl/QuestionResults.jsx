import React from "react";
import { SkipForward, Trophy, X } from "lucide-react";
import MediaDisplay from "./MediaDisplay";
import AnswerOptionsGrid from "./AnswerOptionsGrid";
import Leaderboard from "./Leaderboard";

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
}) {
  const answerCounts = {};
  currentQuestion.options?.forEach((_, idx) => {
    answerCounts[idx] = 0;
  });
  questionResults.forEach((answer) => {
    if (answer.selected_option_index !== null) {
      answerCounts[answer.selected_option_index]++;
    }
  });

  return (
    <>
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
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 mb-6">
            <h2 className="text-3xl font-bold text-center mb-6">
              {currentQuestion.question_text}
            </h2>

            {/* Media Display in Results */}
            <MediaDisplay question={currentQuestion} className="max-w-md mx-auto rounded-lg shadow-lg mb-6" />

            <div className="mb-8">
              <AnswerOptionsGrid options={currentQuestion.options} mode="results" answerCounts={answerCounts} />
            </div>

            <div className="flex justify-center">
              {session.current_question_index < questions.length - 1 ? (
                <button
                  onClick={nextQuestion}
                  className="bg-blue-600 text-white px-12 py-4 rounded-xl hover:bg-blue-700 text-xl font-bold flex items-center gap-3"
                >
                  Next Question
                  <SkipForward size={24} />
                </button>
              ) : (
                <button
                  onClick={() => endQuiz()}
                  disabled={endingQuiz}
                  className="bg-blue-700 text-white px-12 py-4 rounded-xl hover:bg-blue-800 text-xl font-bold flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trophy size={24} />
                  {endingQuiz ? 'Finishing...' : 'Show Final Results'}
                </button>
              )}
            </div>
          </div>

          {/* Leaderboard */}
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-6">
            <Leaderboard participants={participants} teams={teams} mode={session.mode} limit={5} />
          </div>
        </div>
      </div>
    </>
  );
}
