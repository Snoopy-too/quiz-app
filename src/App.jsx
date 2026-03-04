import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

// Auth
import Login from "./components/auth/Login";
import Register from "./components/auth/Register";
import VerifyEmail from "./components/auth/VerifyEmail";
import CompleteProfile from "./components/auth/CompleteProfile";
import ForgotPassword from "./components/auth/ForgotPassword";
import ResetPassword from "./components/auth/ResetPassword";
import RegistrationSuccess from "./components/auth/RegistrationSuccess";

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
import AssignedQuizzes from "./components/students/AssignedQuizzes";
import AssignedQuizTaking from "./components/students/AssignedQuizTaking";

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
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(null);
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
    let oauthProfileCreationHandled = false; // Prevent double-fire from SIGNED_IN + INITIAL_SESSION

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

      // Check for password recovery URL (from email reset link)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const urlParams = new URLSearchParams(window.location.search);
      const isRecovery = hashParams.get('type') === 'recovery' || urlParams.get('type') === 'recovery';

      if (isRecovery) {
        console.log('[load] Password recovery detected, redirecting to reset-password');
        setView("reset-password");
        // Clean up URL without reloading the page
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      // Check if logout was just initiated - don't auto-login
      const logoutInitiated = sessionStorage.getItem('quizapp_logout_initiated');
      if (logoutInitiated) {
        console.log('[load] Logout was initiated, clearing flag and skipping session check');
        sessionStorage.removeItem('quizapp_logout_initiated');
        sessionStorage.removeItem('quizapp_view');
        sessionStorage.removeItem('quizapp_selectedQuizId');
        sessionStorage.removeItem('quizapp_selectedSessionId');
        setAppState((s) => ({ ...s, currentUser: null }));
        setView("login");
        return;
      }

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
        .select("id, email, name, role, approved, verified, teacher_code, teacher_id, teacher_invite_code, avatar_url, school_id")
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
        // Profile might not exist yet (OAuth user, being created by onAuthStateChange)
        // Wait for onAuthStateChange to handle it instead of showing an error
        console.log('[load] No profile yet for user, waiting for onAuthStateChange to handle it');
        return;
      }

      console.log('Profile loaded:', profile.email, 'Role:', profile.role, 'isGoogleUser:', isGoogleUser);

      // Any user without a role needs to complete their profile
      // This catches Google OAuth users AND any edge case where role is missing
      if (!profile.role) {
        console.log('[load] No role set, redirecting to complete-profile');
        setAppState((s) => ({ ...s, currentUser: profile }));
        setView("complete-profile");
        return;
      }

      const hasInviteOrLink =
        profile.teacher_invite_code ||
        profile.teacher_id ||
        (profile.role === "teacher" && profile.teacher_code);
      const needsProfileCompletion = isGoogleUser && !hasInviteOrLink;

      if (needsProfileCompletion) {
        console.log('[load] Google user missing teacher link, redirecting to complete-profile');
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

      // Check if user just initiated logout - prevent auto re-login
      const logoutInitiated = sessionStorage.getItem('quizapp_logout_initiated');
      if (logoutInitiated && event === 'SIGNED_IN') {
        console.log('[onAuthStateChange] Ignoring SIGNED_IN event - logout was just initiated');
        // Sign out again to ensure clean logout
        supabase.auth.signOut({ scope: 'global' });
        return;
      }

      // Don't interfere while registration is in progress
      const registrationInProgress = sessionStorage.getItem('quizapp_registration_in_progress');
      if (registrationInProgress) {
        console.log('[onAuthStateChange] Registration in progress, skipping');
        return;
      }

      if (!session) {
        setAppState((s) => ({ ...s, currentUser: null }));
        // Clear saved session data when signed out
        sessionStorage.removeItem('quizapp_view');
        sessionStorage.removeItem('quizapp_selectedQuizId');
        sessionStorage.removeItem('quizapp_selectedSessionId');
        // Clear the logout flag once we're fully signed out
        sessionStorage.removeItem('quizapp_logout_initiated');
        setView("login");
      } else {
        // When session changes (login/OAuth callback), fetch profile and route
        (async () => {
          const { data: profile, error: profileError } = await supabase
            .from("users")
            .select("id, role, email, name, approved, verified, teacher_code, teacher_id, teacher_invite_code, avatar_url, school_id")
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

            // Any user without a role needs to complete their profile
            if (!profile.role) {
              console.log('[onAuthStateChange] No role set, redirecting to complete-profile');
              setAppState((s) => ({ ...s, currentUser: profile }));
              setView("complete-profile");
              return;
            }

            const hasInviteOrLink =
              profile.teacher_invite_code ||
              profile.teacher_id ||
              (profile.role === "teacher" && profile.teacher_code);
            // Superadmins don't need teacher links, so skip profile completion check for them
            const needsProfileCompletion = isGoogleUser && profile.role !== "superadmin" && !hasInviteOrLink;

            if (needsProfileCompletion) {
              console.log('[onAuthStateChange] Google user missing teacher link, redirecting to completion flow');
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
            // NOTE: 'complete-profile' is NOT included here - if user lands here with complete profile, redirect them
            const activeViews = [
              'teacher-control', 'student-quiz', 'edit-quiz', 'preview-quiz',
              'manage-students', 'manage-quizzes', 'reports', 'settings',
              'teacher-dashboard', 'student-dashboard', 'superadmin-dashboard',
              'create-quiz', 'student-report', 'public-quizzes'
            ];

            console.log('[onAuthStateChange] Current view:', view);
            console.log('[onAuthStateChange] Saved view:', savedView);
            console.log('[onAuthStateChange] Event type:', event);

            // Check if user is stuck on complete-profile but has a complete profile
            const isStuckOnCompleteProfile = view === 'complete-profile' || savedView === 'complete-profile';

            // CRITICAL: Only redirect if explicitly a new sign-in AND no active session/valid view
            // OR if user is stuck on complete-profile with a complete profile
            const hasActiveView = (view && activeViews.includes(view)) || (savedView && activeViews.includes(savedView));

            if ((event === "SIGNED_IN" && !hasActiveView) || isStuckOnCompleteProfile) {
              console.log('[onAuthStateChange] Routing to dashboard (fresh sign-in or stuck on complete-profile)');
              if (profile.role === "teacher") setView("teacher-dashboard");
              else if (profile.role === "superadmin") setView("superadmin-dashboard");
              else setView("student-dashboard");
            } else {
              console.log('[onAuthStateChange] Preserving current view (event:', event, ', hasActiveView:', hasActiveView, ')');
            }
          } else {
            // No profile exists - this is a new OAuth user
            // Guard against double-fire (SIGNED_IN + INITIAL_SESSION both race here)
            if (oauthProfileCreationHandled) {
              console.log('[onAuthStateChange] Profile creation already in progress, skipping duplicate');
              return;
            }
            oauthProfileCreationHandled = true;

            console.log('No profile found for OAuth user:', session.user.id);

            const email = session.user.email;
            const name = session.user.user_metadata?.full_name || session.user.user_metadata?.name || email.split('@')[0];

            console.log('Creating profile for new OAuth user:', email);

            const { data: newProfile, error: createError } = await supabase
              .from("users")
              .insert({
                id: session.user.id,
                email: email,
                name: name,
                role: null,
                teacher_invite_code: null,
                teacher_id: null,
                verified: true,
                approved: false,
              })
              .select()
              .single();

            if (createError) {
              console.error('Failed to create profile for OAuth user:', createError);

              // Could be an orphaned row from a previous auth user with same email
              // (user was deleted from auth but not from users table)
              // Try to find by email and update the id to match the new auth user
              const { data: orphanedProfile } = await supabase
                .from("users")
                .select("id, role, email, name, approved, verified, teacher_code, teacher_id, teacher_invite_code, avatar_url, school_id")
                .eq("email", email)
                .maybeSingle();

              if (orphanedProfile && orphanedProfile.id !== session.user.id) {
                console.log('Found orphaned profile with old id:', orphanedProfile.id, '— deleting and re-creating with new auth id:', session.user.id);
                // Delete the orphaned row then re-insert with correct id
                await supabase
                  .from("users")
                  .delete()
                  .eq("id", orphanedProfile.id);

                const { data: freshProfile, error: reinsertError } = await supabase
                  .from("users")
                  .insert({
                    id: session.user.id,
                    email: email,
                    name: name,
                    role: null,
                    teacher_invite_code: null,
                    teacher_id: null,
                    verified: true,
                    approved: false,
                  })
                  .select()
                  .single();

                if (reinsertError) {
                  console.error('Failed to re-create profile:', reinsertError);
                  setError('Failed to set up your account. Please contact support.');
                  await supabase.auth.signOut();
                  setView("login");
                  return;
                }

                console.log('Profile re-created successfully');
                setAppState((s) => ({ ...s, currentUser: freshProfile }));
                setView("complete-profile");
                return;
              } else if (orphanedProfile) {
                // Same id, just redirect
                setAppState((s) => ({ ...s, currentUser: orphanedProfile }));
                if (!orphanedProfile.role) {
                  setView("complete-profile");
                }
                return;
              }

              setError(`Failed to create user profile. Please try again.`);
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

  if (view === "registration-success")
    return <RegistrationSuccess setView={setView} />;

  if (view === "verify")
    return (
      <VerifyEmail
        setView={setView}
        setError={setError}
        setSuccess={setSuccess}
      />
    );

  if (view === "forgot-password")
    return <ForgotPassword setView={setView} />;

  if (view === "reset-password")
    return (
      <ResetPassword
        setView={setView}
        setSuccess={setSuccess}
      />
    );

  if (view === "complete-profile") {
    console.log('[App] Rendering CompleteProfile, user:', appState.currentUser?.email, 'role:', appState.currentUser?.role);
    return (
      <CompleteProfile
        user={appState.currentUser}
        setAppState={setAppState}
        setView={setView}
        setError={setError}
        setSuccess={setSuccess}
      />
    );
  }

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

  if (view === "assigned-quizzes")
    return (
      <AssignedQuizzes
        setView={setView}
        appState={appState}
        onStartAssignment={(assignmentId, viewResultsOnly = false) => {
          setSelectedAssignmentId(assignmentId);
          setView("assigned-quiz-taking");
        }}
      />
    );

  if (view === "assigned-quiz-taking")
    return (
      <AssignedQuizTaking
        assignmentId={selectedAssignmentId}
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

  if (view === "create-quiz") return (
    <CreateQuiz
      setView={(v, id) => {
        if (v === "edit-quiz") setSelectedQuizId(id);
        setView(v);
      }}
      appState={appState}
    />
  );

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
