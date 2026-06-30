import React from "react";
import { Trophy } from "lucide-react";
import PodiumAnimation from "../../animations/PodiumAnimation";

export default function QuizCompleted({
  quiz,
  session,
  participants,
  teams,
  setView,
}) {
  if (quiz?.is_survey) {
    return (
      <>
        <nav className="bg-white shadow-md p-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-700">{quiz.title}</h1>
          <button
            onClick={() => setView("manage-quizzes")}
            className="bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800"
          >
            Back to Quizzes
          </button>
        </nav>

        <div className="flex-1">
          <div className="container mx-auto p-6">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-12 mb-6 text-center max-w-2xl mx-auto">
              <span className="text-6xl mb-6 block">📊</span>
              <h2 className="text-4xl font-bold mb-4 text-center">Survey Complete!</h2>
              <p className="text-gray-600 text-lg mb-8">
                Thank you for completing this survey.
              </p>
              <div className="bg-gray-50 rounded-xl p-6 mb-8 text-left border max-w-md mx-auto">
                <h3 className="font-semibold text-gray-800 mb-4 border-b pb-2">Survey Overview</h3>
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                  <div className="font-medium">Total Questions:</div>
                  <div className="font-bold text-gray-900 text-right">{quiz.questions?.length || 'N/A'}</div>
                  <div className="font-medium">Total Respondents:</div>
                  <div className="font-bold text-gray-900 text-right">{participants.length}</div>
                </div>
              </div>
              <button
                onClick={() => setView("manage-quizzes")}
                className="bg-blue-700 text-white px-8 py-3 rounded-lg hover:bg-blue-800 text-xl font-semibold max-w-md mx-auto block w-full"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  const sortedTeams = [...teams].sort((a, b) => b.score - a.score);

  // Determine top 3 based on mode
  const topThree = session.mode === 'team'
    ? sortedTeams.slice(0, 3).map(t => ({
      id: t.name,
      score: t.score,
      users: { name: t.name, avatar_url: null }
    }))
    : participants.slice(0, 3);

  return (
    <>
      <nav className="bg-white shadow-md p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-blue-700">{quiz.title}</h1>
        <button
          onClick={() => setView("manage-quizzes")}
          className="bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800"
        >
          Back to Quizzes
        </button>
      </nav>

      <div className="flex-1">
        <div className="container mx-auto p-6">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-12 mb-6">
            <Trophy className="mx-auto mb-6 text-yellow-500" size={80} />
            <h2 className="text-4xl font-bold mb-12 text-center">Quiz Complete!</h2>

            {/* Podium Animation */}
            {topThree.length >= 3 && <PodiumAnimation winners={topThree} />}

            {/* Full Leaderboard */}
            <div className="max-w-2xl mx-auto">
              <h3 className="text-2xl font-bold mb-4 text-center">Final Rankings</h3>
              <div className="space-y-3">
                {session.mode === 'team' ? (
                  // Team Rankings
                  sortedTeams.map((team, idx) => (
                    <div
                      key={team.name}
                      className={`flex items-center justify-between p-4 rounded-xl ${idx === 0
                        ? "bg-yellow-100 border-2 border-yellow-500"
                        : idx === 1
                          ? "bg-gray-100 border-2 border-gray-400"
                          : idx === 2
                            ? "bg-orange-100 border-2 border-orange-400"
                            : "bg-gray-50"
                        }`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-3xl font-bold">
                          {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                        </span>
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl border-2 ${idx === 0 ? "bg-yellow-200 border-yellow-500 text-yellow-800" :
                          idx === 1 ? "bg-gray-200 border-gray-500 text-gray-800" :
                            idx === 2 ? "bg-orange-200 border-orange-500 text-orange-800" :
                              "bg-blue-100 border-blue-300 text-blue-600"
                          }`}>
                          {team.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="text-xl font-semibold">
                            {team.name}
                          </span>
                          {team.memberCount != null && (
                            <span className="ml-2 text-xs text-gray-400">({team.memberCount} {team.memberCount === 1 ? 'member' : 'members'})</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-bold text-blue-700">
                          {team.score} pts
                        </span>
                        {team.scoringMode === 'average' && (
                          <span className="block text-[10px] text-gray-400 font-medium">avg</span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  // Individual Rankings
                  participants.map((p, idx) => (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between p-4 rounded-xl ${idx === 0
                        ? "bg-yellow-100 border-2 border-yellow-500"
                        : idx === 1
                          ? "bg-gray-100 border-2 border-gray-400"
                          : idx === 2
                            ? "bg-orange-100 border-2 border-orange-400"
                            : "bg-gray-50"
                        }`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-3xl font-bold">
                          {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                        </span>
                        {p.users?.avatar_url && (
                          <img
                            src={p.users.avatar_url}
                            alt={p.users?.name || "Avatar"}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        )}
                        <span className="text-xl font-semibold">
                          {p.users?.name || "Anonymous"}
                        </span>
                      </div>
                      <span className="text-2xl font-bold text-blue-700">
                        {p.score} pts
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-center mt-8">
              <button
                onClick={() => setView("manage-quizzes")}
                className="bg-blue-700 text-white px-8 py-3 rounded-lg hover:bg-blue-800 text-xl font-semibold"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
