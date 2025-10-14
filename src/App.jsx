import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

// Auth
import Login from "./components/auth/Login";
import Register from "./components/auth/Register";
import VerifyEmail from "./components/auth/VerifyEmail";
import CompleteProfile from "./components/auth/CompleteProfile";

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
import StudentReport from "./components/teachers/StudentReport";
import PublicQuizzes from "./components/teachers/PublicQuizzes";

// Student components
import StudentQuiz from "./components/students/StudentQuiz";

// Settings
import Settings from "./components/settings/Settings";

export default function QuizApp() {
  // Clear any corrupted sessionStorage data on app load
  useEffect(() => {
    try {
      // Check for corrupted data and clear it
      const keys = ['quizapp_view', 'quizapp_selectedQuizId', 'quizapp_selectedSessionId'];
      keys.forEach(key => {
        const value = sessionStorage.getItem(key);
        if (value === 'undefined' || value === 'null') {
          console.log('[Session Persistence] Clearing corrupted storage key:', key);
          sessionStorage.removeItem(key);
        }
      });
    } catch (err) {
      console.error('[Session Persistence] Error clearing corrupted storage:', err);
    }
  }, []);

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
    try {
      const savedView = sessionStorage.getItem('quizapp_view');
      console.log('[Session Persistence] Initializing view from sessionStorage:', savedView);
      if (savedView && savedView !== 'undefined' && savedView !== 'null') {
        return savedView;
      }
    } catch (err) {
      console.error('[Session Persistence] Error reading view from sessionStorage:', err);
      sessionStorage.removeItem('quizapp_view');
    }
    return "login";
  });

  const [selectedQuizId, setSelectedQuizId] = useState(() => {
    try {
      const saved = sessionStorage.getItem('quizapp_selectedQuizId');
      console.log('[Session Persistence] Initializing selectedQuizId:', saved);
      if (saved && saved !== 'undefined' && saved !== 'null') {
        return JSON.parse(saved);
      }
    } catch (err) {
      console.error('[Session Persistence] Error reading selectedQuizId from sessionStorage:', err);
      sessionStorage.removeItem('quizapp_selectedQuizId');
    }
    return null;
  });

  const [selectedSessionId, setSelectedSessionId] = useState(() => {
    try {
      const saved = sessionStorage.getItem('quizapp_selectedSessionId');
      console.log('[Session Persistence] Initializing selectedSessionId:', saved);
      if (saved && saved !== 'undefined' && saved !== 'null') {
        return JSON.parse(saved);
      }
    } catch (err) {
      console.error('[Session Persistence] Error reading selectedSessionId from sessionStorage:', err);
      sessionStorage.removeItem('quizapp_selectedSessionId');
    }
    return null;
  });
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [formData, setFormData] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Persist view and IDs to sessionStorage whenever they change
  useEffect(() => {
    console.log('[Session Persistence] Saving view to sessionStorage:', view);
    try {
      if (view && view !== 'undefined') {
        sessionStorage.setItem('quizapp_view', view);
      } else {
        sessionStorage.removeItem('quizapp_view');
      }
    } catch (err) {
      console.error('[Session Persistence] Error saving view:', err);
    }
  }, [view]);

  useEffect(() => {
    console.log('[Session Persistence] Saving selectedQuizId:', selectedQuizId);
    try {
      if (selectedQuizId !== null && selectedQuizId !== undefined) {
        sessionStorage.setItem('quizapp_selectedQuizId', JSON.stringify(selectedQuizId));
      } else {
        sessionStorage.removeItem('quizapp_selectedQuizId');
      }
    } catch (err) {
      console.error('[Session Persistence] Error saving selectedQuizId:', err);
    }
  }, [selectedQuizId]);

  useEffect(() => {
    console.log('[Session Persistence] Saving selectedSessionId:', selectedSessionId);
    try {
      if (selectedSessionId !== null && selectedSessionId !== undefined) {
        sessionStorage.setItem('quizapp_selectedSessionId', JSON.stringify(selectedSessionId));
      } else {
        sessionStorage.removeItem('quizapp_selectedSessionId');
      }
    } catch (err) {
      console.error('[Session Persistence] Error saving selectedSessionId:', err);
    }
  }, [selectedSessionId]);

  // Bootstrap session on initial load & on auth state changes
  useEffect(() => {
    let ignore = false;

    const routeByRole = (role) => {
      // Check if there's a saved view in sessionStorage (active session)
      const savedView = sessionStorage.getItem('quizapp_view');

      // All views that should not trigger redirect to dashboard
      const activeViews = [
        'teacher-control', 'student-quiz', 'edit-quiz', 'preview-quiz',
        'manage-students', 'manage-quizzes', 'reports', 'settings',
        'teacher-dashboard', 'student-dashboard', 'superadmin-dashboard',
        'create-quiz', 'complete-profile', 'student-report', 'public-quizzes'
      ];

      console.log('[routeByRole] Current view state:', view);
      console.log('[routeByRole] Saved view from storage:', savedView);
      console.log('[routeByRole] User role:', role);

      // CRITICAL: Don't redirect if user has an active session or is already on a valid page
      // Check both the current view state AND sessionStorage for maximum safety
      if ((view && activeViews.includes(view)) || (savedView && activeViews.includes(savedView))) {
        console.log('[routeByRole] Preserving current view, not redirecting');
        return;
      }

      // Only redirect if we're sure user is on login/register/verify page
      console.log('[routeByRole] No active view found, routing to dashboard');
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

      const sessionInfo = sessionRes.session;
      const appMetadata = sessionInfo.user?.app_metadata || {};
      const providers = Array.isArray(appMetadata.providers) ? appMetadata.providers : [];
      const primaryProvider = appMetadata.provider;
      const isGoogleUser = providers.includes("google") || primaryProvider === "google";

      const userId = sessionInfo.user.id;
      console.log('Session found for user:', userId);

      const { data: profile, error: pErr } = await supabase
        .from("users")
        .select("id, email, name, role, approved, verified, teacher_code, teacher_id, teacher_invite_code")
        .eq("id", userId)
        .maybeSingle();

      if (ignore) return;

      if (pErr) {
        console.error('Profile fetch error:', pErr);
        if (pErr.message?.includes('teacher_invite_code')) {
          setError("Database schema is missing the teacher_invite_code column. Run add-teacher-invite-code-column.sql in Supabase.");
        } else {
          setError(`Failed to load profile: ${pErr.message}`);
        }
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

      const hasInviteOrLink =
        profile.teacher_invite_code ||
        profile.teacher_id ||
        (profile.role === "teacher" && profile.teacher_code);
      const needsProfileCompletion = isGoogleUser && (!profile.role || !hasInviteOrLink);

      if (needsProfileCompletion) {
        setAppState((s) => ({ ...s, currentUser: profile }));
        setView("complete-profile");
        return;
      }

      // Check approval and verification gates (unless superadmin)
      if (profile.role !== "superadmin") {
        if (!profile.approved) {
          console.warn('User not approved:', profile.email);
          setError("Your account is awaiting approval. Please wait for a teacher or admin to approve your account.");
          await supabase.auth.signOut();
          setView("login");
          return;
        }
        if (!profile.verified) {
          console.warn('User email not verified:', profile.email);
          setError("Please verify your email before logging in. Check your inbox for a verification link.");
          await supabase.auth.signOut();
          setView("login");
          return;
        }
      }

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
            .select("id, role, email, name, approved, verified, teacher_code, teacher_id, teacher_invite_code")
            .eq("id", session.user.id)
            .maybeSingle();

          if (profileError) {
            console.error('Profile fetch error on auth change:', profileError);
            if (profileError.message?.includes('teacher_invite_code')) {
              setError("Database schema is missing the teacher_invite_code column. Run add-teacher-invite-code-column.sql in Supabase.");
            } else {
              setError(`Failed to load profile: ${profileError.message}`);
            }
            setView("login");
            return;
          }

          if (profile) {
            console.log('[onAuthStateChange] Profile loaded:', profile.email, 'Event:', event);
            const appMetadata = session.user?.app_metadata || {};
            const providers = Array.isArray(appMetadata.providers) ? appMetadata.providers : [];
            const primaryProvider = appMetadata.provider;
            const isGoogleUser = providers.includes("google") || primaryProvider === "google";

            // Sync email verification status from Supabase Auth to our users table
            const supabaseEmailConfirmed = session.user.email_confirmed_at !== null;
            if (supabaseEmailConfirmed && !profile.verified) {
              console.log('[onAuthStateChange] Email verified in Supabase, updating users table');
              const { error: updateError } = await supabase
                .from("users")
                .update({ verified: true })
                .eq("id", session.user.id);

              if (updateError) {
                console.error('Failed to update verified status:', updateError);
              } else {
                console.log('✅ User verified status synced to database');
                // Update local profile state
                profile.verified = true;
                setSuccess("Email verified successfully!");
              }
            }

            const hasInviteOrLink =
              profile.teacher_invite_code ||
              profile.teacher_id ||
              (profile.role === "teacher" && profile.teacher_code);
            const needsProfileCompletion = isGoogleUser && (!profile.role || !hasInviteOrLink);

            if (needsProfileCompletion) {
              console.log('[onAuthStateChange] Profile incomplete, redirecting to completion flow');
              setAppState((s) => ({ ...s, currentUser: profile }));
              setView("complete-profile");
              return;
            }

            // Check approval and verification gates (unless superadmin)
            if (profile.role !== "superadmin") {
              if (!profile.approved) {
                console.warn('[onAuthStateChange] User not approved:', profile.email);
                setError("Your account is awaiting approval. Please wait for a teacher or admin to approve your account.");
                await supabase.auth.signOut();
                setView("login");
                return;
              }
              if (!profile.verified) {
                console.warn('[onAuthStateChange] User email not verified:', profile.email);
                setError("Please verify your email before logging in. Check your inbox for a verification link.");
                await supabase.auth.signOut();
                setView("login");
                return;
              }
            }

            setAppState((s) => ({ ...s, currentUser: profile }));

            // Check if there's an active session saved
            const savedView = sessionStorage.getItem('quizapp_view');

            // All views that should not trigger redirect to dashboard
            const activeViews = [
              'teacher-control', 'student-quiz', 'edit-quiz', 'preview-quiz',
              'manage-students', 'manage-quizzes', 'reports', 'settings',
              'teacher-dashboard', 'student-dashboard', 'superadmin-dashboard',
              'create-quiz', 'complete-profile', 'student-report', 'public-quizzes'
            ];

            console.log('[onAuthStateChange] Current view:', view);
            console.log('[onAuthStateChange] Saved view:', savedView);
            console.log('[onAuthStateChange] Event type:', event);

            // CRITICAL: Only redirect if explicitly a new sign-in AND no active session/valid view
            // Never redirect for token refreshes, initial sessions, or if user has active view
            const hasActiveView = (view && activeViews.includes(view)) || (savedView && activeViews.includes(savedView));

            if (event === "SIGNED_IN" && !hasActiveView) {
              console.log('[onAuthStateChange] Fresh sign-in detected, routing to dashboard');
              if (profile.role === "teacher") setView("teacher-dashboard");
              else if (profile.role === "superadmin") setView("superadmin-dashboard");
              else setView("student-dashboard");
            } else {
              console.log('[onAuthStateChange] Preserving current view (event:', event, ', hasActiveView:', hasActiveView, ')');
            }
          } else {
            // No profile exists - this is a new OAuth user
            console.log('No profile found for OAuth user:', session.user.id);
            console.log('User metadata:', session.user.user_metadata);

            // Create a basic profile for OAuth user
            const email = session.user.email;
            const name = session.user.user_metadata?.full_name || session.user.user_metadata?.name || email.split('@')[0];

            console.log('Creating profile for new OAuth user:', email);

            // Create a minimal profile and collect required details afterwards
            const { data: newProfile, error: createError } = await supabase
              .from("users")
              .insert([{
                id: session.user.id,
                email: email,
                name: name,
                role: null,
                teacher_invite_code: null,
                teacher_id: null,
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
            setAppState((s) => ({ ...s, currentUser: newProfile }));
            setSuccess("Welcome! Almost done — please complete your profile.");
            setView("complete-profile");
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
        setView={setView}
        setError={setError}
        setSuccess={setSuccess}
      />
    );

  if (view === "complete-profile")
    return (
      <CompleteProfile
        user={appState.currentUser}
        setAppState={setAppState}
        setView={setView}
        setError={setError}
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
  if (view === "reports") return <Reports setView={(v, data) => { if (data?.studentId) { setSelectedStudentId(data.studentId); } setView(v); }} appState={appState} />;
  if (view === 'student-report') return <StudentReport setView={setView} studentId={selectedStudentId} appState={appState} />;
  if (view === "public-quizzes") return <PublicQuizzes setView={(v, id) => { if (v === "preview-quiz") setSelectedQuizId(id); setView(v); }} appState={appState} />;
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
