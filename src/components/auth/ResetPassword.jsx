import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../../supabaseClient";
import AuthLayout, { PasswordToggleInput } from "./AuthLayout";
import { Button, Field, Spinner } from "../ui";

export default function ResetPassword({ setView, setSuccess }) {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    let cleanupSubscription = null;
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        setSessionReady(true);
      } else {
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((event, nextSession) => {
          if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && nextSession)) {
            setSessionReady(true);
          }
        });
        cleanupSubscription = subscription;
      }
    };

    checkSession();
    return () => cleanupSubscription?.unsubscribe?.();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    if (password.length < 6) {
      setMessage({
        type: "error",
        text: t("auth.passwordTooShort") || "Password must be at least 6 characters.",
      });
      return;
    }

    if (password !== confirmPassword) {
      setMessage({
        type: "error",
        text: t("auth.passwordsDoNotMatch") || "Passwords do not match.",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setMessage({ type: "error", text: error.message });
      } else {
        await supabase.auth.signOut();
        setSuccess?.(
          t("auth.passwordResetSuccess") ||
            "Password reset successfully! Please log in with your new password.",
        );
        setView("login");
      }
    } catch {
      setMessage({
        type: "error",
        text: t("auth.unexpectedError") || "An unexpected error occurred. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={t("auth.resetPassword") || "Reset Password"}
      subtitle={t("auth.resetPasswordDescription") || "Enter your new password below."}
      error={message?.type === "error" ? message.text : null}
      success={message?.type === "success" ? message.text : null}
      footer={
        <button
          type="button"
          onClick={() => setView("login")}
          className="font-semibold text-brand-700 hover:text-brand-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 rounded"
        >
          {t("auth.backToLogin") || "Back to Login"}
        </button>
      }
    >
      {!sessionReady ? (
        <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
          <Spinner size="lg" label={t("auth.verifyingLink") || "Verifying reset link..."} />
          <p className="text-sm text-ink-muted">
            {t("auth.verifyingLink") || "Verifying reset link..."}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label={t("auth.newPassword") || "New Password"} required>
            <PasswordToggleInput
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
            />
          </Field>

          <Field label={t("auth.confirmNewPassword") || "Confirm New Password"} required>
            <PasswordToggleInput
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
            />
          </Field>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            className="w-full"
          >
            {loading
              ? t("auth.resetting") || "Resetting..."
              : t("auth.resetPasswordButton") || "Reset Password"}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
