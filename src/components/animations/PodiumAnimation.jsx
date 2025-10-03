export default function PodiumAnimation({ winners }) {
  if (!winners || winners.length === 0) return null;

  // Ensure we have exactly 3 winners (or fewer)
  const first = winners[0];
  const second = winners[1];
  const third = winners[2];

  return (
    <div className="flex items-end justify-center gap-8 h-96 mb-8">
      {/* 2nd Place */}
      {second && (
        <div
          className="text-center animate-bounce-in"
          style={{ animationDelay: "0.2s" }}
        >
          <div className="text-6xl mb-4">🥈</div>
          <div
            className="bg-gray-300 rounded-t-lg p-8 flex flex-col justify-end"
            style={{ height: "200px", minWidth: "150px" }}
          >
            <p className="text-2xl font-bold mb-2">{second.users?.name || "Anonymous"}</p>
            <p className="text-xl text-gray-700">{second.score} pts</p>
          </div>
          <div className="bg-gray-400 text-white font-bold py-2 rounded-b-lg">
            2nd
          </div>
        </div>
      )}

      {/* 1st Place */}
      {first && (
        <div
          className="text-center animate-bounce-in"
          style={{ animationDelay: "0s" }}
        >
          <div className="text-8xl mb-4">🥇</div>
          <div
            className="bg-yellow-400 rounded-t-lg p-8 flex flex-col justify-end"
            style={{ height: "280px", minWidth: "150px" }}
          >
            <p className="text-3xl font-bold mb-2">{first.users?.name || "Anonymous"}</p>
            <p className="text-2xl text-gray-800">{first.score} pts</p>
          </div>
          <div className="bg-yellow-500 text-white font-bold py-2 rounded-b-lg">
            1st
          </div>
        </div>
      )}

      {/* 3rd Place */}
      {third && (
        <div
          className="text-center animate-bounce-in"
          style={{ animationDelay: "0.4s" }}
        >
          <div className="text-6xl mb-4">🥉</div>
          <div
            className="bg-orange-300 rounded-t-lg p-8 flex flex-col justify-end"
            style={{ height: "150px", minWidth: "150px" }}
          >
            <p className="text-2xl font-bold mb-2">{third.users?.name || "Anonymous"}</p>
            <p className="text-xl text-gray-700">{third.score} pts</p>
          </div>
          <div className="bg-orange-400 text-white font-bold py-2 rounded-b-lg">
            3rd
          </div>
        </div>
      )}
    </div>
  );
}
