import React, { useState } from "react";

// Import components
import Login from "./components/auth/Login";
import VerifyEmail from "./components/auth/VerifyEmail";
import StudentDashboard from "./components/dashboards/StudentDashboard";
import TeacherDashboard from "./components/dashboards/TeacherDashboard";
import CreateQuiz from "./components/quizzes/CreateQuiz";
import TeacherControl from "./components/quizzes/TeacherControl"; // ✅ now only imported

const mockData = {
  users: [
    { id: 1, email: "admin@school.com", password: "admin123", role: "admin", verified: true, approved: true, name: "Admin User" },
    { id: 2, email: "teacher@school.com", password: "teacher123", role: "teacher", verified: true, approved: true, name: "John Teacher" },
    { id: 3, email: "student@school.com", password: "student123", role: "student", verified: true, approved: true, name: "Jane Student", studentId: "S12345" },
  ],
  quizzes: [
    {
      id: 1,
      title: "Math Basics",
      category: "Mathematics",
      createdBy: 2,
      questions: [
        { id: 1, type: "multiple-choice", question: "What is 2 + 2?", options: ["3", "4", "5", "6"], correctAnswer: "4", timeLimit: 15 },
        { id: 2, type: "true-false", question: "The Earth is flat", correctAnswer: "false", timeLimit: 10 },
      ],
      theme: "blue",
    },
  ],
  categories: ["Mathematics", "Science", "History", "English", "Other"],
};

export default function QuizApp() {
  const [appState, setAppState] = useState({
    users: mockData.users,
    quizzes: mockData.quizzes,
    categories: mockData.categories,
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
    return <TeacherDashboard appState={appState} setAppState={setAppState} setView={setView} />;
  if (view === "create-quiz") return <CreateQuiz setView={setView} />;
  if (view === "teacher-control") return <TeacherControl appState={appState} setView={setView} />;

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
