import React, { useState } from "react";

// Import components
import Login from "./components/auth/Login";
import Register from "./components/auth/Register";
import VerifyEmail from "./components/auth/VerifyEmail";
import StudentDashboard from "./components/dashboards/StudentDashboard";
import TeacherDashboard from "./components/dashboards/TeacherDashboard";
import SuperAdminDashboard from "./components/dashboards/SuperAdminDashboard"; // ✅ NEW
import CreateQuiz from "./components/quizzes/CreateQuiz";
import TeacherControl from "./components/quizzes/TeacherControl";

// ✅ Placeholder components for new teacher sections
function ManageQuizzes({ setView }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
      <h2 className="text-3xl font-bold mb-4">📘 Manage Quizzes</h2>
      <p className="text-gray-600 mb-6">Feature coming soon...</p>
      <button
        onClick={() => setView("teacher-dashboard")}
        className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700"
      >
        Back to Dashboard
      </button>
    </div>
  );
}

function ManageStudents({ setView }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
      <h2 className="text-3xl font-bold mb-4">👥 Manage Students</h2>
      <p className="text-gray-600 mb-6">Feature coming soon...</p>
      <button
        onClick={() => setView("teacher-dashboard")}
        className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700"
      >
        Back to Dashboard
      </button>
    </div>
  );
}

function Reports({ setView }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
      <h2 className="text-3xl font-bold mb-4">📊 Reports</h2>
      <p className="text-gray-600 mb-6">Feature coming soon...</p>
      <button
        onClick={() => setView("teacher-dashboard")}
        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
      >
        Back to Dashboard
      </button>
    </div>
  );
}

export default function QuizApp() {
  const [appState, setAppState] = useState({
    users: [], // now handled by Supabase
    quizzes: [],
    categories: [],
    currentUser: null,
    pendingVerifications: [],
    activeSessions: [],
  });

  const [view, setView] = useState("login");
  const [formData, setFormData] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (view === "login")
    return (
      <Login
        appState={appState}
        setAppState={setAppState}
        setView={setView}
        formData={formData}
        setFormData={setFormData}
        error={error}
        setError={setError}
        success={success}
        setSuccess={setSuccess}
      />
    );

  if (view === "register")
    return (
      <Register
        appState={appState}
        setAppState={setAppState}
        setView={setView}
        formData={formData}
        setFormData={setFormData}
        error={error}
        setError={setError}
        success={success}
        setSuccess={setSuccess}
      />
    );

  if (view === "verify")
    return (
      <VerifyEmail
        appState={appState}
        setAppState={setAppState}
        setView={setView}
        formData={formData}
        setFormData={setFormData}
        error={error}
        setError={setError}
        success={success}
        setSuccess={setSuccess}
      />
    );

  if (view === "student-dashboard")
    return (
      <StudentDashboard
        appState={appState}
        setAppState={setAppState}
        setView={setView}
        error={error}
        setError={setError}
      />
    );

  if (view === "teacher-dashboard")
    return (
      <TeacherDashboard
        appState={appState}
        setAppState={setAppState}
        setView={setView}
      />
    );

  if (view === "superadmin-dashboard")
    return (
      <SuperAdminDashboard
        appState={appState}
        setAppState={setAppState}
        setView={setView}
      />
    );

  if (view === "create-quiz") return <CreateQuiz setView={setView} />;

  if (view === "teacher-control")
    return <TeacherControl appState={appState} setView={setView} />;

  // ✅ new teacher sections
  if (view === "manage-quizzes") return <ManageQuizzes setView={setView} />;
  if (view === "manage-students") return <ManageStudents setView={setView} />;
  if (view === "reports") return <Reports setView={setView} />;

  // fallback (default to login)
  return (
    <Login
      appState={appState}
      setAppState={setAppState}
      setView={setView}
      formData={formData}
      setFormData={setFormData}
      error={error}
      setError={setError}
      success={success}
      setSuccess={setSuccess}
    />
  );
}
