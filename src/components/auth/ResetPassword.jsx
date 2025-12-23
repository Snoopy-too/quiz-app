import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../common/LanguageSwitcher";

export default function ResetPassword({ setView, setSuccess }) {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [sessionReady, setSessionReady] = useState(false);

  // Wait for Supabase to process the recovery token from the URL
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSessionReady(true);
      } else {
        // Listen for the session to be established
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
            setSessionReady(true);
          }
        });

        return () => subscription?.unsubscribe();
      }
    };

    checkSession();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    // Validation
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
        // Sign out to clear the recovery session
        await supabase.auth.signOut();

        // Notify parent of success and redirect to login
        setSuccess?.(t("auth.passwordResetSuccess") || "Password reset successfully! Please log in with your new password.");
        setView("login");
      }
    } catch (err) {
      setMessage({ type: "error", text: "An unexpected error occurred. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "linear-gradient(to bottom, #4a7c7e, #3d6668)" }}
    >
      <div className="max-w-sm w-full p-8 rounded-xl shadow-2xl bg-white/95 backdrop-blur-sm">
        <div className="flex justify-center mb-6">
          <LanguageSwitcher />
        </div>
        <h1 className="text-2xl font-bold text-center mb-2" style={{ color: "#2c5aa0" }}>
          {t("auth.resetPassword") || "Reset Password"}
        </h1>
        <p className="text-center text-sm text-gray-600 mb-6">
          {t("auth.resetPasswordDescription") || "Enter your new password below."}
        </p>

        {!sessionReady ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">{t("auth.verifyingLink") || "Verifying reset link..."}</p>
          </div>
        ) : (
          <>
            {message && (
              <div
                className={`mb-4 rounded-md p-3 text-sm border ${
                  message.type === "error"
                    ? "bg-red-50 text-red-700 border-red-200"
                    : "bg-green-50 text-green-700 border-green-200"
                }`}
              >
                {message.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "#1f3a52" }}>
                  {t("auth.newPassword") || "New Password"}
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border-2 rounded-lg px-4 py-2.5 focus:outline-none transition-colors"
                  style={{ borderColor: "#e0e0e0" }}
                  onFocus={(e) => (e.target.style.borderColor = "#4db8d8")}
                  onBlur={(e) => (e.target.style.borderColor = "#e0e0e0")}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "#1f3a52" }}>
                  {t("auth.confirmNewPassword") || "Confirm New Password"}
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full border-2 rounded-lg px-4 py-2.5 focus:outline-none transition-colors"
                  style={{ borderColor: "#e0e0e0" }}
                  onFocus={(e) => (e.target.style.borderColor = "#4db8d8")}
                  onBlur={(e) => (e.target.style.borderColor = "#e0e0e0")}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full text-white font-semibold py-2.5 rounded-lg transition-all duration-200 disabled:opacity-50 hover:opacity-90"
                style={{ background: "linear-gradient(to right, #2c5aa0, #4db8d8)" }}
              >
                {loading
                  ? t("auth.resetting") || "Resetting..."
                  : t("auth.resetPasswordButton") || "Reset Password"}
              </button>
            </form>

            <p className="text-center text-sm mt-6 text-gray-700">
              <button
                onClick={() => setView("login")}
                className="font-semibold transition-colors hover:opacity-80"
                style={{ color: "#2c5aa0" }}
              >
                {t("auth.backToLogin") || "Back to Login"}
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
