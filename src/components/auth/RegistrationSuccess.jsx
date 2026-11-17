import { useEffect, useState } from "react";
import { CheckCircle2, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "../../supabaseClient";
import AuthLayout from "./AuthLayout";
import { Button } from "../ui";

export default function RegistrationSuccess({ setView }) {
  const { t } = useTranslation();
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    const email = sessionStorage.getItem("quizapp_registered_email");
    if (!email) return;

    const poll = setInterval(async () => {
      try {
        const { data } = await supabase
          .from("users")
          .select("approved")
          .eq("email", email)
          .maybeSingle();

        if (data?.approved) {
          setApproved(true);
          clearInterval(poll);
          sessionStorage.removeItem("quizapp_registered_email");
        }
      } catch {
        // Non-critical polling fallback
      }
    }, 5000);

    return () => clearInterval(poll);
  }, []);

  const handleGoToLogin = () => {
    sessionStorage.removeItem("quizapp_registered_email");
    setView("login");
  };

  return (
    <AuthLayout
      title={t("auth.registrationComplete")}
      subtitle={t("auth.accountCreatedSuccessfully")}
    >
      <div className="flex justify-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-success-600">
          <CheckCircle2 className="h-9 w-9" aria-hidden="true" />
        </div>
      </div>

      {approved ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-success-600 mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <h3 className="text-sm font-semibold text-emerald-900 mb-1">
              {t("auth.accountApproved")}
            </h3>
            <p className="text-sm text-emerald-800">{t("auth.youCanNowLogin")}</p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <Clock className="h-5 w-5 text-warning-500 mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <h3 className="text-sm font-semibold text-amber-900 mb-1">
              {t("auth.waitingForTeacherApproval")}
            </h3>
            <p className="text-sm text-amber-800">{t("auth.teacherWillApprove")}</p>
          </div>
        </div>
      )}

      <Button
        type="button"
        variant="primary"
        size="lg"
        className="w-full"
        onClick={handleGoToLogin}
      >
        {t("auth.goToLogin")}
      </Button>
    </AuthLayout>
  );
}
