import React from "react";
import { LogOut, BookOpen, Users, BarChart3 } from "lucide-react";

export default function TeacherDashboard({ appState, setAppState, setView }) {
  const teacher = appState.currentUser;

  const handleLogout = () => {
    setAppState((prev) => ({ ...prev, currentUser: null }));
    setView("login");
  };

  const handleNavigation = (section) => {
    if (section === "Manage Quizzes") setView("manage-quizzes");
    if (section === "Manage Students") setView("manage-students");
    if (section === "Reports") setView("reports");
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navbar */}
      <nav className="bg-white shadow-md p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-purple-600">QuizMaster Teacher</h1>
        <div className="flex gap-4 items-center">
          <span className="text-gray-600">{teacher?.name}</span>
          <button
            onClick={handleLogout}
            className="text-red-600 hover:text-red-700"
          >
            <LogOut size={20} />
          </button>
        </div>
      </nav>

      {/* Dashboard Content */}
      <div className="container mx-auto p-6">
        <h2 className="text-3xl font-bold mb-6">Teacher Dashboard</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Manage Quizzes */}
          <div
            onClick={() => handleNavigation("Manage Quizzes")}
            className="cursor-pointer bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition"
          >
            <BookOpen className="text-purple-600 mb-4" size={40} />
            <h3 className="text-xl font-bold mb-2">Manage Quizzes</h3>
            <p className="text-gray-600">
              Create, edit, and organize quizzes for your classes.
            </p>
          </div>

          {/* Manage Students */}
          <div
            onClick={() => handleNavigation("Manage Students")}
            className="cursor-pointer bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition"
          >
            <Users className="text-green-600 mb-4" size={40} />
            <h3 className="text-xl font-bold mb-2">Manage Students</h3>
            <p className="text-gray-600">
              View and manage student accounts, approvals, and progress.
            </p>
          </div>

          {/* Reports */}
          <div
            onClick={() => handleNavigation("Reports")}
            className="cursor-pointer bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition"
          >
            <BarChart3 className="text-blue-600 mb-4" size={40} />
            <h3 className="text-xl font-bold mb-2">Reports</h3>
            <p className="text-gray-600">
              View quiz performance and student progress reports.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
