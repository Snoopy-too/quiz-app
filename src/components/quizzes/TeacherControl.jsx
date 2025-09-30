import React from "react";

export default function TeacherControl({ appState, setView }) {
  const session = appState.activeSessions[appState.activeSessions.length - 1];

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl mb-4">No active session</p>
          <button
            onClick={() => setView("teacher-dashboard")}
            className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-blue-600 text-white p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">{session.quiz.title}</h1>
        <div className="text-xl font-mono">PIN: {session.pin}</div>
      </nav>

      <div className="container mx-auto p-6">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Waiting for students...</h2>
          <p className="text-xl text-gray-600 mb-6">
            Share PIN: <span className="font-bold text-3xl">{session.pin}</span>
          </p>
          <p className="text-gray-600 mb-8">{session.participants.length} students joined</p>
          <button
            onClick={() => setView("teacher-dashboard")}
            className="bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 text-xl"
          >
            End Session
          </button>
        </div>
      </div>
    </div>
  );
}
