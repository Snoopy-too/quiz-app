import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

// Auth
import Login from "./components/auth/Login";
import Register from "./components/auth/Register";
import VerifyEmail from "./components/auth/VerifyEmail";

// Dashboards
import StudentDashboard from "./components/dashboards/StudentDashboard";
import TeacherDashboard from "./components/dashboards/TeacherDashboard";
import SuperAdminDashboard from "./components/dashboards/SuperAdminDashboard";

// Quizzes
import CreateQuiz from "./components/quizzes/CreateQuiz";
import EditQuiz from "./components/quizzes/EditQuiz";
import TeacherControl from "./components/quizzes/TeacherControl";
import PreviewQuiz from "./components/quizzes/PreviewQuiz";

// Teacher components
import ManageQuizzes from "./components/teachers/ManageQuizzes";
import ManageStudents from "./components/teachers/ManageStudents";
import Reports from "./components/teachers/Reports";

// Student components
import StudentQuiz from "./components/students/StudentQuiz";

export default function QuizApp() {
  const [appState, setAppState] = useState({
    users: [],
    quizzes: [],
    categories: [],
    currentUser: null,
    pendingVerifications: [],
    activeSessions: [],
  });

  const [view, setView] = useState("login");
  const [selectedQuizId, setSelectedQuizId] = useState(null);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [formData, setFormData] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Bootstrap session on initial load & on auth state changes
  useEffect(() => {
    let ignore = false;

    const routeByRole = (role) => {
      if (role === "teacher") setView("teacher-dashboard");
      else if (role === "superadmin") setView("superadmin-dashboard");
      else if (role === "student") setView("student-dashboard");
      else setView("login");
    };

    const load = async () => {
      const { data: sessionRes, error: sessErr } = await supabase.auth.getSession();
      if (sessErr || !sessionRes?.session) {
        setAppState((s) => ({ ...s, currentUser: null }));
        setView("login");
        return;
      }
      const userId = sessionRes.session.user.id;

      const { data: profile, error: pErr } = await supabase
        .from("users")
        .select("id, email, name, role, approved, verified")
        .eq("id", userId)
        .maybeSingle();

      if (ignore) return;

      if (pErr || !profile) {
        setView("login");
        return;
      }

      setAppState((s) => ({ ...s, currentUser: profile }));
      routeByRole(profile.role);
    };

    load();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setAppState((s) => ({ ...s, currentUser: null }));
        setView("login");
      } else {
        // When session changes (login), fetch profile and route
        (async () => {
          const { data: profile } = await supabase
            .from("users")
            .select("id, role, email, name, approved, verified")
            .eq("id", session.user.id)
            .maybeSingle();
          if (profile) {
            setAppState((s) => ({ ...s, currentUser: profile }));
            if (profile.role === "teacher") setView("teacher-dashboard");
            else if (profile.role === "superadmin") setView("superadmin-dashboard");
            else setView("student-dashboard");
          } else {
            setView("login");
          }
        })();
      }
    });

    return () => {
      ignore = true;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  if (view === "login")
    return (
      <Login
        appState={appState}
        setAppState={setAppState}
        setView={setView}
        setError={setError}
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
        setView={(v, sessionId) => {
          setView(v);
          setSelectedSessionId(sessionId);
        }}
        error={error}
        setError={setError}
      />
    );

  if (view === "student-quiz")
    return (
      <StudentQuiz
        sessionId={selectedSessionId}
        appState={appState}
        setView={setView}
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

  if (view === "create-quiz") return <CreateQuiz setView={setView} appState={appState} />;

  if (view === "edit-quiz")
    return <EditQuiz setView={setView} quizId={selectedQuizId} appState={appState} />;

  if (view === "preview-quiz")
    return (
      <PreviewQuiz
        quizId={selectedQuizId}
        setView={(v) => {
          setView(v);
          if (v === "manage-quizzes") {
            // Clear selected quiz when going back
            setSelectedQuizId(null);
          }
        }}
        returnView="manage-quizzes"
      />
    );

  if (view === "teacher-control")
    return <TeacherControl sessionId={selectedSessionId} setView={setView} />;

  if (view === "manage-quizzes")
    return (
      <ManageQuizzes
        setView={(v, id) => {
          if (v === "edit-quiz") setSelectedQuizId(id);
          if (v === "preview-quiz") setSelectedQuizId(id);
          if (v === "teacher-control") setSelectedSessionId(id);
          setView(v);
        }}
        appState={appState}
      />
    );
  if (view === "manage-students") return <ManageStudents setView={setView} appState={appState} />;
  if (view === "reports") return <Reports setView={setView} appState={appState} />;

  return (
    <Login
      appState={appState}
      setAppState={setAppState}
      setView={setView}
      setError={setError}
      setSuccess={setSuccess}
    />
  );
}
