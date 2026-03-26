import React from "react";
import { X } from "lucide-react";

export default function CountdownScreen({ quiz, countdownValue, closeSession }) {
  return (
    <>
      <nav className="bg-white shadow-md p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-blue-700">{quiz.title}</h1>
        <button onClick={closeSession} className="text-red-600 hover:text-red-700">
          <X size={24} />
        </button>
      </nav>
      <div className="flex-1">
        <div className="container mx-auto p-6 flex items-center justify-center min-h-[80vh]">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-12 text-center max-w-md w-full">
            <h2 className="text-4xl font-bold text-gray-800 mb-8">{quiz.title}</h2>
            <div className="mb-4">
              <p className="text-gray-600 mb-4">Starting in...</p>
              <div className="text-8xl font-bold text-blue-700 animate-pulse">
                {countdownValue}
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-6">
              Get ready! The first question will appear shortly.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
