import React, { useState } from "react";
import { LogOut, BookOpen, Users, BarChart3, Copy, Check } from "lucide-react";
import VerticalNav from "../layout/VerticalNav";
import { formatTeacherCode } from "../../utils/teacherCode";

export default function TeacherDashboard({ appState, setAppState, setView }) {
  const teacher = appState.currentUser;
  const [copied, setCopied] = useState(false);

  const handleNavigation = (section) => {
    if (section === "Manage Quizzes") setView("manage-quizzes");
    if (section === "Manage Students") setView("manage-students");
    if (section === "Reports") setView("reports");
  };

  const copyTeacherCode = () => {
    if (teacher?.teacher_code) {
      navigator.clipboard.writeText(teacher.teacher_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Vertical Navigation */}
      <VerticalNav currentView="teacher-dashboard" setView={setView} appState={appState} />

      {/* Main Content */}
      <div className="flex-1 ml-64">
        {/* Top Bar */}
        <nav className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <h1 className="text-2xl font-bold text-purple-600">Teacher Dashboard</h1>
        </nav>

      {/* Dashboard Content */}
      <div className="container mx-auto p-6">
        <h2 className="text-3xl font-bold mb-6">Teacher Dashboard</h2>

        {/* Teacher Invitation Code */}
        {teacher?.teacher_code && (
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 rounded-xl shadow-lg mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div className="mb-4 md:mb-0">
                <h3 className="text-lg font-semibold mb-2">Your Teacher Invitation Code</h3>
                <p className="text-sm text-purple-100 mb-3">
                  Share this code with your students so they can register under your account
                </p>
                <div className="flex items-center gap-3">
                  <div className="bg-white text-purple-900 px-6 py-3 rounded-lg font-mono text-2xl font-bold tracking-wider">
                    {formatTeacherCode(teacher.teacher_code)}
                  </div>
                  <button
                    onClick={copyTeacherCode}
                    className="bg-white/20 hover:bg-white/30 text-white px-4 py-3 rounded-lg transition flex items-center gap-2 font-medium"
                  >
                    {copied ? (
                      <>
                        <Check size={20} />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy size={20} />
                        Copy Code
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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
    </div>
  );
}
