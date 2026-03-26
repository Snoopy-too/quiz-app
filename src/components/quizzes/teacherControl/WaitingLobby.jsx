import React from "react";
import { useTranslation } from "react-i18next";
import { Users, Play, RefreshCw, X } from "lucide-react";

export default function WaitingLobby({
  quiz,
  session,
  participants,
  teams,
  startQuiz,
  closeSession,
  loadParticipants,
  startingQuiz,
}) {
  const { t } = useTranslation();
  const isTeamMode = session.mode === "team";

  return (
    <>
      <nav className="bg-white shadow-md p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-blue-700">{quiz.title}</h1>
        <div className="flex items-center gap-4">
          <span className={`px-4 py-2 rounded-lg font-semibold ${isTeamMode ? "bg-blue-100 text-blue-800" : "bg-blue-50 text-blue-800"
            }`}>
            {isTeamMode ? "Team Mode" : "Classic Mode"}
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
        <div className="container mx-auto p-6 flex flex-col items-center justify-center min-h-[80vh]">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-12 text-center max-w-2xl w-full">
            <h2 className="text-4xl font-bold mb-6">Join at QuizMaster</h2>
            <div className="bg-gray-100 rounded-xl p-8 mb-6">
              <p className="text-gray-600 text-xl mb-2">Game PIN:</p>
              <p className="text-7xl font-bold text-blue-700">{session.pin}</p>
            </div>

            {isTeamMode ? (
              <>
                <div className="flex items-center justify-center gap-3 mb-8">
                  <Users className="text-blue-600" size={32} />
                  <p className="text-3xl font-bold">{teams.length}</p>
                  <p className="text-xl text-gray-600">teams joined</p>
                  <button
                    onClick={loadParticipants}
                    className="ml-2 p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Refresh team count"
                  >
                    <RefreshCw size={24} />
                  </button>
                </div>

                {teams.length > 0 && (
                  <div className="mb-6 max-h-60 overflow-y-auto">
                    <div className="space-y-3">
                      {teams.map((team, idx) => (
                        <div
                          key={idx}
                          className="bg-blue-50 border border-blue-200 rounded-lg p-4"
                        >
                          <div className="font-bold text-lg text-blue-900 mb-2">
                            {team.name}
                          </div>
                          <div className="text-sm text-gray-600">
                            Members: {team.members.map(m => m.users?.name || m.player_name).join(", ")}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center justify-center gap-3 mb-8">
                  <Users className="text-blue-600" size={32} />
                  <p className="text-3xl font-bold">{participants.length}</p>
                  <p className="text-xl text-gray-600">
                    {participants.filter(p => p.is_team_entry === true).length > 0
                      ? "participants"
                      : "players"}
                  </p>
                  <button
                    onClick={loadParticipants}
                    className="ml-2 p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                    title={t("common.refresh", "Refresh")}
                  >
                    <RefreshCw size={24} />
                  </button>
                </div>

                {participants.length > 0 && (
                  <div className="mb-6 max-h-60 overflow-y-auto">
                    <div className="space-y-2">
                      {participants.map((p) => {
                        if (p.is_team_entry === true && p.teams) {
                          return (
                            <div
                              key={p.id}
                              className="bg-blue-50 border border-blue-200 rounded-lg p-3"
                            >
                              <div className="font-bold text-lg text-blue-900">
                                {p.teams.team_name}
                              </div>
                              <div className="ml-4 mt-1 space-y-0.5">
                                {p.teamMembers?.map((member, idx) => (
                                  <div key={idx} className="text-sm text-gray-600">
                                    - {member.users?.name || "Unknown"}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        } else {
                          return (
                            <div
                              key={p.id}
                              className="bg-gray-50 rounded-lg p-2 text-sm font-medium"
                            >
                              {p.users?.name || "Anonymous"}
                            </div>
                          );
                        }
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

            <button
              onClick={startQuiz}
              disabled={startingQuiz || (isTeamMode ? teams.length === 0 : participants.length === 0)}
              className="bg-green-600 text-white px-12 py-4 rounded-xl hover:bg-green-700 text-2xl font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 mx-auto"
            >
              <Play size={32} />
              {startingQuiz ? 'Starting...' : 'Start Quiz'}
            </button>
            {((isTeamMode && teams.length === 0) || (!isTeamMode && participants.length === 0)) && (
              <p className="text-gray-500 mt-4">
                Waiting for {isTeamMode ? "teams" : "players"} to join...
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
