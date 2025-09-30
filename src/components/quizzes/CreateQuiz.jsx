import React from "react";

export default function CreateQuiz({ setView }) {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="container mx-auto max-w-4xl">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-3xl font-bold mb-6">Create Quiz</h2>
          <p className="text-gray-600 mb-4">Quiz creation interface - Full implementation coming soon</p>
          <button
            onClick={() => setView("teacher-dashboard")}
            className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
