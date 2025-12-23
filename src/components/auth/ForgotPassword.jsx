import { useState } from "react";
import { supabase } from "../../supabaseClient";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../common/LanguageSwitcher";

export default function ForgotPassword({ setView }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo: `${window.location.origin}/?type=recovery`,
        }
      );

      if (error) {
        setMessage({ type: "error", text: error.message });
      } else {
        setMessage({
          type: "success",
          text: t("auth.resetEmailSent") || "Check your email for a password reset link.",
        });
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
          {t("auth.forgotPassword") || "Forgot Password"}
        </h1>
        <p className="text-center text-sm text-gray-600 mb-6">
          {t("auth.forgotPasswordDescription") || "Enter your email and we'll send you a reset link."}
        </p>

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
              {t("auth.email")}
            </label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border-2 rounded-lg px-4 py-2.5 focus:outline-none transition-colors"
              style={{ borderColor: "#e0e0e0" }}
              onFocus={(e) => (e.target.style.borderColor = "#4db8d8")}
              onBlur={(e) => (e.target.style.borderColor = "#e0e0e0")}
              placeholder={t("auth.emailPlaceholder")}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full text-white font-semibold py-2.5 rounded-lg transition-all duration-200 disabled:opacity-50 hover:opacity-90"
            style={{ background: "linear-gradient(to right, #2c5aa0, #4db8d8)" }}
          >
            {loading
              ? t("auth.sending") || "Sending..."
              : t("auth.sendResetLink") || "Send Reset Link"}
          </button>
        </form>

        <p className="text-center text-sm mt-6 text-gray-700">
          {t("auth.rememberPassword") || "Remember your password?"}{" "}
          <button
            onClick={() => setView("login")}
            className="font-semibold transition-colors hover:opacity-80"
            style={{ color: "#2c5aa0" }}
          >
            {t("auth.backToLogin") || "Back to Login"}
          </button>
        </p>
      </div>
    </div>
  );
}
