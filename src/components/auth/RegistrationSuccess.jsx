import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../common/LanguageSwitcher";

export default function RegistrationSuccess({ setView }) {
  const { t } = useTranslation();

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(to bottom, #4a7c7e, #3d6668)" }}
    >
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="flex justify-center mb-6">
          <LanguageSwitcher />
        </div>

        <div className="text-center mb-6">
          <div
            className="mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-4"
            style={{ backgroundColor: "rgba(34, 197, 94, 0.1)" }}
          >
            <svg
              className="w-10 h-10 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: "#2c5aa0" }}>
            {t("auth.registrationComplete")}
          </h1>
          <p className="text-gray-600 text-lg">
            {t("auth.accountCreatedSuccessfully")}
          </p>
        </div>

        <div
          className="rounded-lg p-5 mb-6"
          style={{
            backgroundColor: "rgba(251, 191, 36, 0.1)",
            border: "1px solid rgba(251, 191, 36, 0.3)",
          }}
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl mt-0.5">⏳</span>
            <div>
              <h3 className="font-semibold text-amber-800 mb-1">
                {t("auth.waitingForTeacherApproval")}
              </h3>
              <p className="text-sm text-amber-700">
                {t("auth.teacherWillApprove")}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setView("login")}
          className="w-full text-white font-semibold py-3 rounded-lg transition-all duration-200 hover:opacity-90"
          style={{ background: "linear-gradient(to right, #2c5aa0, #4db8d8)" }}
        >
          {t("auth.goToLogin")}
        </button>
      </div>
    </div>
  );
}
