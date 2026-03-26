import React from "react";

export default function Leaderboard({ participants, teams, mode, limit }) {
  const displayParticipants = limit ? participants.slice(0, limit) : participants;

  return (
    <div>
      {mode === "team" && (
        <div className="mb-8">
          <h3 className="text-2xl font-bold mb-4 text-center">Team Leaderboard</h3>
          <div className="space-y-2">
            {[...teams].sort((a, b) => b.score - a.score).map((team, idx) => (
              <div
                key={team.name}
                className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-4"
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl font-bold text-gray-400">#{idx + 1}</span>
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold border-2 border-blue-200">
                    {team.name.substring(0, 2).toUpperCase()}
                  </div>
                  <span className="text-lg font-semibold text-gray-800">{team.name}</span>
                </div>
                <span className="text-xl font-bold text-blue-700">{team.score} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <h3 className="text-2xl font-bold mb-4 text-center">
        {mode === "team" ? "Individual Leaderboard" : "Leaderboard"}
      </h3>
      <div className="space-y-2">
        {displayParticipants.map((p, idx) => (
          <div key={p.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-4">
              <span className="text-2xl font-bold text-gray-400">#{idx + 1}</span>
              {p.users?.avatar_url && (
                <img
                  src={p.users.avatar_url}
                  alt={p.users?.name || "Avatar"}
                  className="w-10 h-10 rounded-full object-cover"
                />
              )}
              <span className="text-lg font-semibold">{p.users?.name || "Anonymous"}</span>
            </div>
            <span className="text-xl font-bold text-blue-700">{p.score} pts</span>
          </div>
        ))}
      </div>
    </div>
  );
}
