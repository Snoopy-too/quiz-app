import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "../../supabaseClient";
import AuthLayout from "./AuthLayout";
import { Button, Spinner } from "../ui";

export default function VerifyEmail({ setView, error, success, setError, setSuccess }) {
  const { t } = useTranslation();
  const [checking, setChecking] = useState(true);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    const checkVerification = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        const { data: profile } = await supabase
          .from("users")
          .select("verified, role")
          .eq("id", session.user.id)
          .maybeSingle();

        if (profile?.verified) {
          setSuccess("Email verified! Redirecting to login...");
          setTimeout(() => {
            setView("login");
          }, 2000);
          return;
        }
      }
      setChecking(false);
    };

    checkVerification();
  }, [setView, setSuccess]);

  const handleResendEmail = async () => {
    setError?.(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const emailToResend =
        session?.user?.email || sessionStorage.getItem("quizapp_registered_email");

      if (!emailToResend) {
        setError(t("auth.noEmailForResend") || "No email found. Please register again.");
        return;
      }

      const { error: resendErr } = await supabase.auth.resend({
        type: "signup",
        email: emailToResend,
      });

      if (resendErr) {
        setError(`Failed to resend email: ${resendErr.message}`);
      } else {
        setResendSuccess(true);
        setTimeout(() => setResendSuccess(false), 5000);
      }
    } catch {
      setError("Failed to resend verification email.");
    }
  };

  if (checking) {
    return (
      <AuthLayout title={t("auth.checkYourEmail")}>
        <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
          <Spinner size="lg" label={t("auth.checkingVerification")} />
          <p className="text-sm text-ink-muted">{t("auth.checkingVerification")}</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={t("auth.checkYourEmail")}
      subtitle={t("auth.verificationLinkSent")}
      error={error}
      success={resendSuccess ? t("auth.verificationEmailResent") : success}
    >
      <div className="flex justify-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-700">
          <Mail className="h-7 w-7" aria-hidden="true" />
        </div>
      </div>

      <div className="rounded-xl border border-brand-200 bg-brand-50/60 p-4">
        <h3 className="text-sm font-semibold text-ink mb-2">{t("auth.whatToDoNext")}</h3>
        <ol className="list-decimal list-inside text-sm space-y-1 text-ink-muted">
          <li>{t("auth.checkEmailInbox")}</li>
          <li>{t("auth.lookForEmail")}</li>
          <li>{t("auth.clickVerificationLink")}</li>
          <li>{t("auth.returnToLogin")}</li>
        </ol>
      </div>

      <div className="space-y-3">
        <Button
          type="button"
          variant="primary"
          size="lg"
          className="w-full"
          onClick={handleResendEmail}
        >
          {t("auth.resendVerificationEmail")}
        </Button>

        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="w-full"
          onClick={() => setView("login")}
        >
          {t("auth.backToLogin")}
        </Button>
      </div>

      <p className="text-xs text-ink-muted text-center">
        {t("auth.didntReceiveEmail")}
      </p>
    </AuthLayout>
  );
}
