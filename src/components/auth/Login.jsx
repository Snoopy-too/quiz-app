import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../../supabaseClient";
import { loginSchema } from "../../schemas/auth";
import AuthLayout, { PasswordToggleInput } from "./AuthLayout";
import { Button, Field, Icon, Input } from "../ui";

export default function Login({
  setView,
  appState,
  setAppState,
  setError: setGlobalError,
  setSuccess: setGlobalSuccess,
  globalError,
  globalSuccess,
}) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  // Check for existing session when component mounts (handles OAuth callback)
  useEffect(() => {
    const checkSession = async () => {
      const logoutInitiated = sessionStorage.getItem("quizapp_logout_initiated");
      if (logoutInitiated) return;

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        setErrorMsg(`Authentication error: ${sessionError.message}`);
        return;
      }

      if (session) {
        setLoading(true);
        const { data: profile, error: profileError } = await supabase
          .from("users")
          .select("id, email, name, role, approved, verified, teacher_code, teacher_id, teacher_invite_code, avatar_url, school_id, student_id")
          .eq("id", session.user.id)
          .maybeSingle();

        if (profileError) {
          setErrorMsg(`Failed to load profile: ${profileError.message}`);
          setLoading(false);
          return;
        }

        if (!profile) {
          return;
        }

        if (!profile.role) {
          setAppState?.({ ...appState, currentUser: profile });
          setView?.("complete-profile");
          setLoading(false);
          return;
        }

        if (profile.role !== "superadmin") {
          if (!profile.approved) {
            setErrorMsg(
              t("auth.teacherWillApprove") ||
                "Your account is awaiting teacher approval. Please wait for your teacher to approve your account.",
            );
            await supabase.auth.signOut();
            setLoading(false);
            return;
          }
          if (!profile.verified) {
            setErrorMsg(t("auth.verifyEmailPrompt") || "Please verify your email to continue.");
            setLoading(false);
            return;
          }
        }

        setAppState?.({
          ...appState,
          currentUser: profile,
        });

        if (profile.role === "teacher") setView?.("teacher-dashboard");
        else if (profile.role === "superadmin") setView?.("superadmin-dashboard");
        else setView?.("student-dashboard");
      }
    };

    checkSession();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setFieldErrors({});
    setGlobalError?.(null);
    setGlobalSuccess?.(null);

    const validationResult = loginSchema.safeParse({ email, password });
    if (!validationResult.success) {
      const nextFieldErrors = {};
      for (const issue of validationResult.error.issues) {
        const key = issue.path?.[0];
        if (key && !nextFieldErrors[key]) {
          nextFieldErrors[key] = issue.message;
        }
      }
      setFieldErrors(nextFieldErrors);
      setErrorMsg(validationResult.error.issues[0]?.message || "Validation Error");
      return;
    }

    setLoading(true);
    sessionStorage.removeItem("quizapp_logout_initiated");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        setErrorMsg(/invalid/i.test(error.message) ? t("auth.invalidCredentials") : error.message);
        return;
      }

      const userId = data.user?.id;
      if (!userId) {
        setErrorMsg("No session returned from Supabase.");
        return;
      }

      const { data: profile, error: pErr } = await supabase
        .from("users")
        .select("id, email, name, role, approved, verified, teacher_code, teacher_id, teacher_invite_code, avatar_url, school_id, student_id")
        .eq("id", userId)
        .maybeSingle();

      if (pErr) {
        setErrorMsg(pErr.message);
        return;
      }

      if (!profile) {
        // App.jsx onAuthStateChange will create the profile and route to /complete-profile.
        return;
      }

      if (!profile.role) {
        setAppState?.({
          ...appState,
          currentUser: profile,
        });
        setView?.("complete-profile");
        return;
      }

      if (profile.role !== "superadmin") {
        if (!profile.approved) {
          await supabase.auth.signOut();
          setErrorMsg(
            t("auth.teacherWillApprove") ||
              "Your account is awaiting teacher approval. Please wait for your teacher to approve your account.",
          );
          return;
        }
        if (!profile?.verified) {
          setErrorMsg(t("auth.verifyEmailPrompt") || "Please verify your email to continue.");
          return;
        }
      }

      setAppState?.({
        ...appState,
        currentUser: profile,
      });

      if (profile?.role === "teacher") setView?.("teacher-dashboard");
      else if (profile?.role === "superadmin") setView?.("superadmin-dashboard");
      else setView?.("student-dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setGlobalError?.(null);
    setGlobalSuccess?.(null);
    setLoading(true);
    sessionStorage.removeItem("quizapp_logout_initiated");

    try {
      const redirectUrl = `${window.location.origin}/`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) {
        setErrorMsg(
          `${t("errors.googleSignInFailed") || "Google sign-in failed"}: ${error.message}`,
        );
        setLoading(false);
      }
    } catch {
      setErrorMsg(
        t("errors.failedToInitiateGoogleSignIn") ||
          "Failed to initiate Google sign-in. Please try again.",
      );
      setLoading(false);
    }
  };

  const displayError = errorMsg || globalError || null;
  const displaySuccess = !displayError ? globalSuccess || null : null;

  return (
    <AuthLayout
      title={t("auth.loginToQuizMaster")}
      subtitle={t("auth.welcomeBack")}
      error={displayError}
      success={displaySuccess}
      footer={
        <p>
          {t("auth.dontHaveAccount")}{" "}
          <button
            type="button"
            onClick={() => setView?.("register")}
            className="font-semibold text-brand-700 hover:text-brand-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 rounded"
          >
            {t("auth.register")}
          </button>
        </p>
      }
    >
      <form onSubmit={handleLogin} className="space-y-4" noValidate>
        <Field label={t("auth.email")} error={fieldErrors.email || null} required>
          <Input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: null }));
            }}
            placeholder={t("auth.emailPlaceholder")}
            required
          />
        </Field>

        <Field label={t("auth.password")} error={fieldErrors.password || null} required>
          <PasswordToggleInput
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: null }));
            }}
            placeholder="••••••••"
            required
          />
        </Field>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setView?.("forgot-password")}
            className="text-xs font-medium text-accent-500 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 rounded"
          >
            {t("auth.forgotPassword")}
          </button>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={loading}
          className="w-full"
        >
          {loading ? t("auth.signingIn") : t("auth.login")}
        </Button>
      </form>

      <div className="relative my-2">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-line" />
        </div>
        <div className="relative flex justify-center text-xs uppercase tracking-wide">
          <span className="bg-surface px-2.5 text-ink-muted">
            {t("auth.orContinueWith")}
          </span>
        </div>
      </div>

      <Button
        type="button"
        variant="secondary"
        size="md"
        disabled={loading}
        onClick={handleGoogleSignIn}
        className="w-full"
      >
        <Icon name="google" className="h-5 w-5" />
        <span>{t("auth.signInWithGoogle")}</span>
      </Button>
    </AuthLayout>
  );
}
