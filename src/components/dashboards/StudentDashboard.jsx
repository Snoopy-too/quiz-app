import { useState } from "react";
import { Users, Trophy, BookOpen, ShieldAlert } from "lucide-react";
import VerticalNav from "../layout/VerticalNav";
import JoinClassicQuiz from "../students/JoinClassicQuiz";
import CreateTeam from "../students/CreateTeam";

export default function StudentDashboard({ appState, setAppState, setView, error, setError }) {
  const [currentView, setCurrentView] = useState("dashboard"); // dashboard, join-classic, create-team
  const isApproved = appState.currentUser?.approved;

  const handleBackToDashboard = () => {
    setCurrentView("dashboard");
    setError(null);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Vertical Navigation */}
      <VerticalNav currentView="student-dashboard" setView={setView} appState={appState} />

      {/* Main Content */}
      <div className="flex-1 ml-64">
        {currentView === "dashboard" && (
          <div className="bg-gradient-to-br from-blue-500 to-purple-600 min-h-screen flex items-center justify-center p-8">
            <div className="max-w-6xl w-full">
              <h1 className="text-4xl font-bold text-white text-center mb-6">
                Welcome, {appState.currentUser?.name}!
              </h1>

              {!isApproved && (
                <div className="mb-10 mx-auto max-w-2xl rounded-2xl bg-white/15 border border-white/30 backdrop-blur-sm p-5 text-center text-white">
                  <div className="flex items-center justify-center gap-3 text-lg font-semibold">
                    <ShieldAlert size={24} />
                    Awaiting Teacher Approval
                  </div>
                  <p className="mt-2 text-sm text-white/80">
                    You can browse your dashboard, but quiz participation and team creation are disabled until your teacher approves your account.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Card 1: Join Quiz (Classic Mode) */}
                <div
                  onClick={isApproved ? () => setCurrentView("join-classic") : undefined}
                  className={`bg-white rounded-2xl shadow-2xl p-8 transition-transform duration-200 flex flex-col items-center text-center ${
                    isApproved
                      ? "cursor-pointer hover:scale-105"
                      : "cursor-not-allowed opacity-60"
                  }`}
                >
                  <div className="bg-purple-100 rounded-full p-6 mb-4">
                    <BookOpen size={48} className="text-purple-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-3">
                    Join Quiz
                  </h2>
                  <p className="text-gray-600 mb-4">
                    {isApproved
                      ? "Enter a PIN to join a quiz individually"
                      : "Disabled until your teacher approves your account"}
                  </p>
                  <div className="mt-auto">
                    <span
                      className={`inline-block px-6 py-2 rounded-lg font-semibold ${
                        isApproved
                          ? "bg-purple-600 text-white hover:bg-purple-700"
                          : "bg-gray-300 text-gray-600"
                      }`}
                    >
                      Start
                    </span>
                  </div>
                </div>

                {/* Card 2: Create Team */}
                <div
                  onClick={isApproved ? () => setCurrentView("create-team") : undefined}
                  className={`bg-white rounded-2xl shadow-2xl p-8 transition-transform duration-200 flex flex-col items-center text-center ${
                    isApproved
                      ? "cursor-pointer hover:scale-105"
                      : "cursor-not-allowed opacity-60"
                  }`}
                >
                  <div className="bg-blue-100 rounded-full p-6 mb-4">
                    <Users size={48} className="text-blue-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-3">
                    Create Team
                  </h2>
                  <p className="text-gray-600 mb-4">
                    {isApproved
                      ? "Form a team with your classmates"
                      : "Disabled until your teacher approves your account"}
                  </p>
                  <div className="mt-auto">
                    <span
                      className={`inline-block px-6 py-2 rounded-lg font-semibold ${
                        isApproved
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "bg-gray-300 text-gray-600"
                      }`}
                    >
                      Create
                    </span>
                  </div>
                </div>

                {/* Card 3: View My Results (Placeholder) */}
                <div
                  className="bg-white rounded-2xl shadow-2xl p-8 cursor-not-allowed opacity-75 flex flex-col items-center text-center"
                >
                  <div className="bg-green-100 rounded-full p-6 mb-4">
                    <Trophy size={48} className="text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-3">
                    View My Results
                  </h2>
                  <p className="text-gray-600 mb-4">
                    See your quiz history and scores
                  </p>
                  <div className="mt-auto">
                    <span className="inline-block bg-gray-400 text-white px-6 py-2 rounded-lg font-semibold">
                      Coming Soon
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentView === "join-classic" && (
          <JoinClassicQuiz
            appState={appState}
            setView={setView}
            error={error}
            setError={setError}
            onBack={handleBackToDashboard}
            isApproved={isApproved}
          />
        )}

        {currentView === "create-team" && (
          <CreateTeam
            appState={appState}
            setView={setView}
            error={error}
            setError={setError}
            onBack={handleBackToDashboard}
            isApproved={isApproved}
          />
        )}
      </div>
    </div>
  );
}
