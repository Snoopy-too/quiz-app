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
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(to bottom, #4a7c7e, #3d6668)' }}>
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: '#2c5aa0' }}></div>
          <p className="text-gray-600">{t('auth.checkingVerification')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(to bottom, #4a7c7e, #3d6668)' }}>
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="flex justify-center mb-6">
          <LanguageSwitcher />
        </div>
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(77, 184, 216, 0.1)' }}>
            <svg className="w-8 h-8" style={{ color: '#4db8d8' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: '#2c5aa0' }}>{t('auth.checkYourEmail')}</h1>
          <p className="text-gray-600">
            {t('auth.verificationLinkSent')}
          </p>
        </div>

        {resendSuccess && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">
            {t('auth.verificationEmailResent')}
          </div>
        )}

        <div className="rounded-lg p-4 mb-6" style={{ backgroundColor: 'rgba(77, 184, 216, 0.1)', borderColor: '#4db8d8', borderWidth: '1px' }}>
          <h3 className="font-semibold mb-2" style={{ color: '#2c5aa0' }}>{t('auth.whatToDoNext')}</h3>
          <ol className="list-decimal list-inside text-sm space-y-1" style={{ color: '#1f3a52' }}>
            <li>{t('auth.checkEmailInbox')}</li>
            <li>{t('auth.lookForEmail')}</li>
            <li>{t('auth.clickVerificationLink')}</li>
            <li>{t('auth.returnToLogin')}</li>
          </ol>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleResendEmail}
            className="w-full text-white p-3 rounded-lg transition-all duration-200 font-medium"
            style={{ background: 'linear-gradient(to right, #2c5aa0, #4db8d8)' }}
          >
            {t('auth.resendVerificationEmail')}
          </button>

          <button
            onClick={() => setView("login")}
            className="w-full border-2 p-3 rounded-lg transition-all duration-200 font-medium"
            style={{ borderColor: '#4db8d8', color: '#2c5aa0' }}
            onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(77, 184, 216, 0.1)'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
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
