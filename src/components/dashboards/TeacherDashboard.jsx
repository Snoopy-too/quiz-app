import React from "react";
import { Users, Plus, Play, LogOut } from "lucide-react";

export default function TeacherDashboard({ appState, setAppState, setView }) {
  const myQuizzes = appState.quizzes.filter((q) => q.createdBy === appState.currentUser.id);

  const startQuiz = (quiz, isTeamMode) => {
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    const session = {
      id: Date.now(),
      quizId: quiz.id,
      quiz: quiz,
      pin: pin,
      isTeamMode: isTeamMode,
      participants: [],
      currentQuestion: 0,
      responses: [],
      started: false,
      teacherId: appState.currentUser.id,
    };
    setAppState((prev) => ({
      ...prev,
      activeSessions: [...prev.activeSessions, session],
    }));
    setView("teacher-control");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-md p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-purple-600">QuizMaster Teacher</h1>
        <div className="flex gap-4 items-center">
          <span className="text-gray-600">{appState.currentUser.name}</span>
          <button
            onClick={() => {
              setAppState((prev) => ({ ...prev, currentUser: null }));
              setView("login");
            }}
            className="text-red-600 hover:text-red-700"
          >
            <LogOut size={20} />
          </button>
        </div>
      </nav>

      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold">My Quizzes</h2>
          <button
            onClick={() => setView("create-quiz")}
            className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 flex items-center gap-2"
          >
            <Plus size={20} /> Create Quiz
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {myQuizzes.map((quiz) => (
            <div
              key={quiz.id}
              className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition border-l-4 border-blue-600"
            >
              <h3 className="text-xl font-bold text-blue-600 mb-4">{quiz.title}</h3>
              <p className="text-gray-600 mb-4">
                {quiz.category} • {quiz.questions.length} questions
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => startQuiz(quiz, false)}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <Play size={16} /> Solo
                </button>
                <button
                  onClick={() => startQuiz(quiz, true)}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                >
                  <Users size={16} /> Team
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
