import React from "react";

export default function Reports({ setView }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-2xl text-center">
        <h2 className="text-3xl font-bold mb-4">Reports</h2>
        <p className="text-gray-600 mb-6">
          Here you will be able to see quiz performance and student progress reports. (Feature coming soon)
        </p>
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
