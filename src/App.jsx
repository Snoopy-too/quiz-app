import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Outlet, RouterProvider, useLocation, useNavigate } from "react-router";
import { ToastProvider } from "./components/ui";
import { evaluateProfileGate, sanitizeNextPath } from "./domain/auth";
import { AppAuthProvider } from "./routes/authContext";
import { createAppRouter } from "./routes/router";
import { supabase } from "./supabaseClient";

const PROFILE_SELECT =
  "id, email, name, role, approved, verified, teacher_code, teacher_id, teacher_invite_code, avatar_url, school_id, student_id";

const GUEST_PATHS = new Set([
  "/",
  "/login",
  "/register",
  "/register/success",
  "/verify",
  "/forgot-password",
]);

function isGoogleProviderSession(session) {
  const appMetadata = session?.user?.app_metadata || {};
  const providers = Array.isArray(appMetadata.providers) ? appMetadata.providers : [];
  const primaryProvider = appMetadata.provider;
  return providers.includes("google") || primaryProvider === "google";
}

function AppBootstrapShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationRef = useRef(location);
  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  const [appState, setAppState] = useState({
    users: [],
    quizzes: [],
    categories: [],
    currentUser: null,
    pendingVerifications: [],
    activeSessions: [],
  });
  const [authReady, setAuthReady] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState(() => {
    try {
      const saved = sessionStorage.getItem("quizapp_selectedTeacherId");
      if (saved && saved !== "undefined" && saved !== "null") {
        return JSON.parse(saved);
      }
    } catch {
      sessionStorage.removeItem("quizapp_selectedTeacherId");
    }
    return null;
  });
  const [formData, setFormData] = useState({});
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    try {
      if (selectedTeacherId !== null && selectedTeacherId !== undefined) {
        sessionStorage.setItem("quizapp_selectedTeacherId", JSON.stringify(selectedTeacherId));
      } else {
        sessionStorage.removeItem("quizapp_selectedTeacherId");
      }
    } catch {
      // Ignore storage errors
    }
  }, [selectedTeacherId]);

  const refreshProfile = useCallback(async () => {
    const { data: sessionRes } = await supabase.auth.getSession();
    const userId = sessionRes?.session?.user?.id;
    if (!userId) return null;

    const { data: profile, error: pErr } = await supabase
      .from("users")
      .select(PROFILE_SELECT)
      .eq("id", userId)
      .maybeSingle();

    if (!pErr && profile) {
      setAppState((s) => ({ ...s, currentUser: profile }));
      return profile;
    }
    return null;
  }, []);

  useEffect(() => {
    let ignore = false;
    let oauthProfileCreationHandled = false;

    const clearSessionOnSignOut = () => {
      sessionStorage.removeItem("quizapp_activeFolder");
      sessionStorage.removeItem("quizapp_selectedTeacherId");
      setSelectedTeacherId(null);
      setAppState((s) => ({ ...s, currentUser: null }));
    };

    const load = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const urlParams = new URLSearchParams(window.location.search);
      const isRecovery =
        hashParams.get("type") === "recovery" || urlParams.get("type") === "recovery";

      if (isRecovery) {
        window.history.replaceState({}, document.title, "/reset-password");
        setAuthReady(true);
        navigate("/reset-password", { replace: true });
        return;
      }

      const logoutInitiated = sessionStorage.getItem("quizapp_logout_initiated");
      if (logoutInitiated) {
        sessionStorage.removeItem("quizapp_logout_initiated");
        clearSessionOnSignOut();
        setAuthReady(true);
        navigate("/login", { replace: true });
        return;
      }

      const { data: sessionRes, error: sessErr } = await supabase.auth.getSession();
      if (ignore) return;

      if (sessErr) {
        setError(`Session error: ${sessErr.message}`);
        clearSessionOnSignOut();
        setAuthReady(true);
        navigate("/login", { replace: true });
        return;
      }

      if (!sessionRes?.session) {
        clearSessionOnSignOut();
        setAuthReady(true);
        return;
      }

      const sessionInfo = sessionRes.session;
      const isGoogleUser = isGoogleProviderSession(sessionInfo);

      const { data: profile, error: pErr } = await supabase
        .from("users")
        .select(PROFILE_SELECT)
        .eq("id", sessionInfo.user.id)
        .maybeSingle();

      if (ignore) return;

      if (pErr) {
        if (pErr.message?.includes("teacher_invite_code")) {
          setError(
            "Database schema is missing the teacher_invite_code column. Run add-teacher-invite-code-column.sql in Supabase.",
          );
        } else {
          setError(`Failed to load profile: ${pErr.message}`);
        }
        setAuthReady(true);
        navigate("/login", { replace: true });
        return;
      }

      if (!profile) {
        // OAuth profile creation is handled by onAuthStateChange
        return;
      }

      const gate = evaluateProfileGate(profile, { isGoogleUser });

      if (gate.status === "complete-profile") {
        setAppState((s) => ({ ...s, currentUser: profile }));
        setAuthReady(true);
        if (locationRef.current.pathname !== "/complete-profile") {
          navigate("/complete-profile", { replace: true });
        }
        return;
      }

      if (gate.status === "blocked") {
        setError(
          gate.reason === "unapproved"
            ? "Your account is awaiting approval. Please wait for a teacher or admin to approve your account."
            : "Please verify your email before logging in. Check your inbox for a verification link.",
        );
        await supabase.auth.signOut();
        clearSessionOnSignOut();
        setAuthReady(true);
        navigate("/login", { replace: true });
        return;
      }

      setAppState((s) => ({ ...s, currentUser: profile }));
      setAuthReady(true);

      const curPath = locationRef.current.pathname;
      if (GUEST_PATHS.has(curPath) || curPath === "/complete-profile") {
        const next = sanitizeNextPath(new URLSearchParams(locationRef.current.search).get("next"));
        navigate(next || gate.landingPath, { replace: true });
      }
    };

    load();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const logoutInitiated = sessionStorage.getItem("quizapp_logout_initiated");
      if (logoutInitiated && event === "SIGNED_IN") {
        supabase.auth.signOut({ scope: "global" });
        return;
      }

      if (sessionStorage.getItem("quizapp_registration_in_progress")) {
        return;
      }

      if (!session) {
        clearSessionOnSignOut();
        sessionStorage.removeItem("quizapp_logout_initiated");
        setAuthReady(true);
        return;
      }

      (async () => {
        const { data: profile, error: profileError } = await supabase
          .from("users")
          .select(PROFILE_SELECT)
          .eq("id", session.user.id)
          .maybeSingle();

        if (ignore) return;

        if (profileError) {
          if (profileError.message?.includes("teacher_invite_code")) {
            setError(
              "Database schema is missing the teacher_invite_code column. Run add-teacher-invite-code-column.sql in Supabase.",
            );
          } else {
            setError(`Failed to load profile: ${profileError.message}`);
          }
          setAuthReady(true);
          navigate("/login", { replace: true });
          return;
        }

        if (profile) {
          const isGoogleUser = isGoogleProviderSession(session);
          const supabaseEmailConfirmed = session.user.email_confirmed_at !== null;

          if (supabaseEmailConfirmed && !profile.verified) {
            const { error: updateError } = await supabase
              .from("users")
              .update({ verified: true })
              .eq("id", session.user.id);
            if (!updateError) {
              profile.verified = true;
              setSuccess("Email verified successfully!");
            }
          }

          const gate = evaluateProfileGate(profile, { isGoogleUser });

          if (gate.status === "complete-profile") {
            setAppState((s) => ({ ...s, currentUser: profile }));
            setAuthReady(true);
            if (locationRef.current.pathname !== "/complete-profile") {
              navigate("/complete-profile", { replace: true });
            }
            return;
          }

          if (gate.status === "blocked") {
            setError(
              gate.reason === "unapproved"
                ? "Your account is awaiting approval. Please wait for a teacher or admin to approve your account."
                : "Please verify your email before logging in. Check your inbox for a verification link.",
            );
            await supabase.auth.signOut();
            clearSessionOnSignOut();
            setAuthReady(true);
            navigate("/login", { replace: true });
            return;
          }

          setAppState((s) => ({ ...s, currentUser: profile }));
          setAuthReady(true);

          const curPath = locationRef.current.pathname;
          const isOnGuestOrComplete = GUEST_PATHS.has(curPath) || curPath === "/complete-profile";
          if ((event === "SIGNED_IN" && isOnGuestOrComplete) || curPath === "/complete-profile") {
            const next = sanitizeNextPath(
              new URLSearchParams(locationRef.current.search).get("next"),
            );
            navigate(next || gate.landingPath, { replace: true });
          }
        } else {
          if (oauthProfileCreationHandled) return;
          oauthProfileCreationHandled = true;

          const email = session.user.email;
          const name =
            session.user.user_metadata?.full_name ||
            session.user.user_metadata?.name ||
            email.split("@")[0];

          const { data: newProfile, error: createError } = await supabase
            .from("users")
            .insert({
              id: session.user.id,
              email,
              name,
              role: null,
              teacher_invite_code: null,
              teacher_id: null,
              verified: true,
              approved: false,
            })
            .select()
            .single();

          if (createError) {
            const { data: orphanedProfile } = await supabase
              .from("users")
              .select(PROFILE_SELECT)
              .eq("email", email)
              .maybeSingle();

            if (orphanedProfile && orphanedProfile.id !== session.user.id) {
              await supabase.from("users").delete().eq("id", orphanedProfile.id);

              const { data: freshProfile, error: reinsertError } = await supabase
                .from("users")
                .insert({
                  id: session.user.id,
                  email,
                  name,
                  role: null,
                  teacher_invite_code: null,
                  teacher_id: null,
                  verified: true,
                  approved: false,
                })
                .select()
                .single();

              if (reinsertError) {
                setError("Failed to set up your account. Please contact support.");
                await supabase.auth.signOut();
                setAuthReady(true);
                navigate("/login", { replace: true });
                return;
              }

              setAppState((s) => ({ ...s, currentUser: freshProfile }));
              setAuthReady(true);
              navigate("/complete-profile", { replace: true });
              return;
            } else if (orphanedProfile) {
              setAppState((s) => ({ ...s, currentUser: orphanedProfile }));
              setAuthReady(true);
              if (!orphanedProfile.role) {
                navigate("/complete-profile", { replace: true });
              }
              return;
            }

            setError("Failed to create user profile. Please try again.");
            await supabase.auth.signOut();
            setAuthReady(true);
            navigate("/login", { replace: true });
            return;
          }

          setAppState((s) => ({ ...s, currentUser: newProfile }));
          setSuccess("Welcome! Almost done — please complete your profile.");
          setAuthReady(true);
          navigate("/complete-profile", { replace: true });
        }
      })();
    });

    return () => {
      ignore = true;
      sub?.subscription?.unsubscribe?.();
    };
  }, [navigate]);

  const contextValue = useMemo(
    () => ({
      appState,
      setAppState,
      authReady,
      error,
      setError,
      success,
      setSuccess,
      formData,
      setFormData,
      selectedTeacherId,
      setSelectedTeacherId,
      refreshProfile,
    }),
    [appState, authReady, error, success, formData, selectedTeacherId, refreshProfile],
  );

  return (
    <AppAuthProvider value={contextValue}>
      <Outlet />
    </AppAuthProvider>
  );
}

export default function QuizApp() {
  const router = useMemo(() => createAppRouter(AppBootstrapShell), []);

  return (
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>
  );
}
