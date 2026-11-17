import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../../supabaseClient";
import AuthLayout from "./AuthLayout";
import { Button, Field, Input } from "../ui";

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
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setMessage({ type: "error", text: error.message });
      } else {
        setMessage({
          type: "success",
          text: t("auth.resetEmailSent") || "Check your email for a password reset link.",
        });
      }
    } catch {
      setMessage({
        type: "error",
        text: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={t("auth.forgotPassword") || "Forgot Password"}
      subtitle={
        t("auth.forgotPasswordDescription") ||
        "If this email exists in our system, you will receive a reset link shortly."
      }
      error={message?.type === "error" ? message.text : null}
      success={message?.type === "success" ? message.text : null}
      footer={
        <p>
          {t("auth.rememberPassword") || "Remember your password?"}{" "}
          <button
            type="button"
            onClick={() => setView("login")}
            className="font-semibold text-brand-700 hover:text-brand-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 rounded"
          >
            {t("auth.backToLogin") || "Back to Login"}
          </button>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label={t("auth.email")} required>
          <Input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("auth.emailPlaceholder")}
            required
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
            ? t("auth.sending") || "Sending..."
            : t("auth.sendResetLink") || "Send Reset Link"}
        </Button>
      </form>
    </AuthLayout>
  );
}
