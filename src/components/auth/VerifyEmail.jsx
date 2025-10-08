import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../common/LanguageSwitcher";

export default function VerifyEmail({ setView, setError, setSuccess }) {
  const { t } = useTranslation();
  const [checking, setChecking] = useState(true);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    // Check if user just verified their email (came back from email link)
    const checkVerification = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        // User is logged in after email verification
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
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user?.email) {
        setError("No email found. Please register again.");
        return;
      }

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: session.user.email
      });

      if (error) {
        setError(`Failed to resend email: ${error.message}`);
      } else {
        setResendSuccess(true);
        setTimeout(() => setResendSuccess(false), 5000);
      }
    } catch (err) {
      console.error("Resend error:", err);
      setError("Failed to resend verification email.");
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('auth.checkingVerification')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="flex justify-center mb-4">
          <LanguageSwitcher />
        </div>
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">{t('auth.checkYourEmail')}</h1>
          <p className="text-gray-600">
            {t('auth.verificationLinkSent')}
          </p>
        </div>

        {resendSuccess && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {t('auth.verificationEmailResent')}
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">{t('auth.whatToDoNext')}</h3>
          <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
            <li>{t('auth.checkEmailInbox')}</li>
            <li>{t('auth.lookForEmail')}</li>
            <li>{t('auth.clickVerificationLink')}</li>
            <li>{t('auth.returnToLogin')}</li>
          </ol>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleResendEmail}
            className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t('auth.resendVerificationEmail')}
          </button>

          <button
            onClick={() => setView("login")}
            className="w-full border border-gray-300 text-gray-700 p-3 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {t('auth.backToLogin')}
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-4">
          {t('auth.didntReceiveEmail')}
        </p>
      </div>
    </div>
  );
}
