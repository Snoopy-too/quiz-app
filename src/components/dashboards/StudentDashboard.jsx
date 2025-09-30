import React, { useState } from "react";

export default function StudentDashboard({ appState, setAppState, setView, error, setError }) {
  const [joinPin, setJoinPin] = useState("");

  const joinQuiz = () => {
    const session = appState.activeSessions.find((s) => s.pin === joinPin);
    if (session) {
      setView("student-quiz");
    } else {
      setError("Invalid PIN");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-6">Join Quiz</h1>
        <p className="text-center text-gray-600 mb-6">Enter the PIN from your teacher</p>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        <input
          type="text"
          placeholder="Enter PIN"
          value={joinPin}
          onChange={(e) => setJoinPin(e.target.value)}
          className="w-full p-4 border-2 rounded-lg text-center text-2xl mb-4"
          maxLength="6"
        />
        <button
          onClick={joinQuiz}
          className="w-full bg-purple-600 text-white p-4 rounded-lg hover:bg-purple-700 text-xl"
        >
          Join Quiz
        </button>
        <button
          onClick={() => {
            setAppState((prev) => ({ ...prev, currentUser: null }));
            setView("login");
          }}
          className="w-full mt-4 text-red-600 hover:underline"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
