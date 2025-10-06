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

// Settings
import Settings from "./components/settings/Settings";

export default function QuizApp() {
  const [appState, setAppState] = useState({
    users: [],
    quizzes: [],
    categories: [],
    currentUser: null,
    pendingVerifications: [],
    activeSessions: [],
  });

  // Initialize state from sessionStorage to persist across tab switches
  const [view, setView] = useState(() => {
    return sessionStorage.getItem('quizapp_view') || "login";
  });
  const [selectedQuizId, setSelectedQuizId] = useState(() => {
    const saved = sessionStorage.getItem('quizapp_selectedQuizId');
    return saved ? JSON.parse(saved) : null;
  });
  const [selectedSessionId, setSelectedSessionId] = useState(() => {
    const saved = sessionStorage.getItem('quizapp_selectedSessionId');
    return saved ? JSON.parse(saved) : null;
  });
  const [formData, setFormData] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Persist view and IDs to sessionStorage whenever they change
  useEffect(() => {
    sessionStorage.setItem('quizapp_view', view);
  }, [view]);

  useEffect(() => {
    sessionStorage.setItem('quizapp_selectedQuizId', JSON.stringify(selectedQuizId));
  }, [selectedQuizId]);

  useEffect(() => {
    sessionStorage.setItem('quizapp_selectedSessionId', JSON.stringify(selectedSessionId));
  }, [selectedSessionId]);

  // Bootstrap session on initial load & on auth state changes
  useEffect(() => {
    let ignore = false;

    const routeByRole = (role) => {
      // Check if there's a saved view in sessionStorage (active session)
      const savedView = sessionStorage.getItem('quizapp_view');
      const activeViews = ['teacher-control', 'student-quiz', 'edit-quiz', 'preview-quiz'];

      // If user has an active session, don't redirect them
      if (savedView && activeViews.includes(savedView)) {
        console.log('Preserving active view:', savedView);
        return;
      }

      // Otherwise, route to default dashboard for their role
      if (role === "teacher") setView("teacher-dashboard");
      else if (role === "superadmin") setView("superadmin-dashboard");
      else if (role === "student") setView("student-dashboard");
      else setView("login");
    };

    const load = async () => {
      console.log('Loading initial session...');
      const { data: sessionRes, error: sessErr } = await supabase.auth.getSession();

      if (sessErr) {
        console.error('Session error:', sessErr);
        setError(`Session error: ${sessErr.message}`);
        setAppState((s) => ({ ...s, currentUser: null }));
        // Clear saved session data on error
        sessionStorage.removeItem('quizapp_view');
        sessionStorage.removeItem('quizapp_selectedQuizId');
        sessionStorage.removeItem('quizapp_selectedSessionId');
        setView("login");
        return;
      }

      if (!sessionRes?.session) {
        console.log('No active session found');
        setAppState((s) => ({ ...s, currentUser: null }));
        // Clear saved session data when logged out
        sessionStorage.removeItem('quizapp_view');
        sessionStorage.removeItem('quizapp_selectedQuizId');
        sessionStorage.removeItem('quizapp_selectedSessionId');
        setView("login");
        return;
      }

      const userId = sessionRes.session.user.id;
      console.log('Session found for user:', userId);

      const { data: profile, error: pErr } = await supabase
        .from("users")
        .select("id, email, name, role, approved, verified")
        .eq("id", userId)
        .maybeSingle();

      if (ignore) return;

      if (pErr) {
        console.error('Profile fetch error:', pErr);
        setError(`Failed to load profile: ${pErr.message}`);
        setView("login");
        return;
      }

      if (!profile) {
        console.warn('No profile found for user:', userId);
        setError("User profile not found. Please contact support.");
        setView("login");
        return;
      }

      console.log('Profile loaded:', profile.email, 'Role:', profile.role);
      setAppState((s) => ({ ...s, currentUser: profile }));
      routeByRole(profile.role);
    };

    load();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);

      if (!session) {
        setAppState((s) => ({ ...s, currentUser: null }));
        // Clear saved session data when signed out
        sessionStorage.removeItem('quizapp_view');
        sessionStorage.removeItem('quizapp_selectedQuizId');
        sessionStorage.removeItem('quizapp_selectedSessionId');
        setView("login");
      } else {
        // When session changes (login/OAuth callback), fetch profile and route
        (async () => {
          const { data: profile, error: profileError } = await supabase
            .from("users")
            .select("id, role, email, name, approved, verified")
            .eq("id", session.user.id)
            .maybeSingle();

          if (profileError) {
            console.error('Profile fetch error on auth change:', profileError);
            setError(`Failed to load profile: ${profileError.message}`);
            setView("login");
            return;
          }

          if (profile) {
            console.log('Profile loaded after auth change:', profile.email);
            setAppState((s) => ({ ...s, currentUser: profile }));

            // Check if there's an active session saved
            const savedView = sessionStorage.getItem('quizapp_view');
            const activeViews = ['teacher-control', 'student-quiz', 'edit-quiz', 'preview-quiz'];

            // Only redirect to dashboard if:
            // 1. User is signing in (SIGNED_IN event)
            // 2. User doesn't have an active session
            // 3. User is on login/register/verify pages
            if (event === "SIGNED_IN" && (!savedView || !activeViews.includes(savedView))) {
              if (profile.role === "teacher") setView("teacher-dashboard");
              else if (profile.role === "superadmin") setView("superadmin-dashboard");
              else setView("student-dashboard");
            }
            // For TOKEN_REFRESHED events, don't change the view - keep user where they are
          } else {
            // No profile exists - this is a new OAuth user
            console.log('No profile found for OAuth user:', session.user.id);
            console.log('User metadata:', session.user.user_metadata);

            // Create a basic profile for OAuth user
            const email = session.user.email;
            const name = session.user.user_metadata?.full_name || session.user.user_metadata?.name || email.split('@')[0];

            console.log('Creating profile for new OAuth user:', email);

            // Create profile with student role by default (they can be upgraded by admin)
            const { data: newProfile, error: createError } = await supabase
              .from("users")
              .insert([{
                id: session.user.id,
                email: email,
                name: name,
                role: "student",
                verified: true, // OAuth users are pre-verified via Google
                approved: false, // Needs teacher/admin approval
              }])
              .select()
              .single();

            if (createError) {
              console.error('Failed to create profile for OAuth user:', createError);
              setError(`Failed to create user profile: ${createError.message}. Please contact support.`);
              await supabase.auth.signOut();
              setView("login");
              return;
            }

            console.log('Profile created successfully for OAuth user');
            setSuccess("Welcome! Your account has been created. A teacher must approve your account before you can access quizzes.");
            setAppState((s) => ({ ...s, currentUser: newProfile }));

            // Show them they need approval
            setTimeout(() => {
              setView("login");
              setError("Your account is awaiting teacher approval. You will receive an email when approved.");
            }, 3000);
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
  if (view === "settings") return <Settings setView={setView} appState={appState} setAppState={setAppState} />;

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
