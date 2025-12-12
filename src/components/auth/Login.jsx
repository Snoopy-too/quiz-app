import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../common/LanguageSwitcher";

export default function Login({
  setView,
  appState,
  setAppState,
  setError: setGlobalError, // optional from parent
  setSuccess: setGlobalSuccess, // optional from parent
}) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Check for existing session when component mounts (handles OAuth callback)
  useEffect(() => {
    const checkSession = async () => {
      console.log('Login: Checking for existing session...');

      // Don't auto-login if logout was just initiated
      const logoutInitiated = sessionStorage.getItem('quizapp_logout_initiated');
      if (logoutInitiated) {
        console.log('Login: Logout was initiated, skipping session check');
        return;
      }

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('Login: Session check error:', sessionError);
        setErrorMsg(`Authentication error: ${sessionError.message}`);
        return;
      }

      if (session) {
        console.log('Login: Active session found for:', session.user.email);
        setLoading(true);

        // Fetch user profile
        const { data: profile, error: profileError } = await supabase
          .from("users")
          .select("id, email, name, role, approved, verified, teacher_code, teacher_id")
          .eq("id", session.user.id)
          .maybeSingle();

        if (profileError) {
          console.error('Login: Profile fetch error:', profileError);
          setErrorMsg(`Failed to load profile: ${profileError.message}`);
          setLoading(false);
          return;
        }

        if (!profile) {
          console.log('Login: No profile found, waiting for profile creation...');
          // Profile might be being created by App.jsx's onAuthStateChange
          // Don't show error, just wait
          setLoading(false);
          return;
        }

        // Check approval/verification gates
        if (profile.role !== "superadmin") {
          if (!profile.approved) {
            console.log('Login: Account pending approval');
            setErrorMsg("Your account is awaiting approval.");
            setLoading(false);
            return;
          }
          if (!profile.verified) {
            console.log('Login: Email not verified');
            setErrorMsg("Please verify your email to continue.");
            setLoading(false);
            return;
          }
        }

        console.log('Login: Redirecting to dashboard for role:', profile.role);

        // Update app state and redirect
        setAppState?.({
          ...appState,
          currentUser: profile,
        });

        if (profile.role === "teacher") setView?.("teacher-dashboard");
        else if (profile.role === "superadmin") setView?.("superadmin-dashboard");
        else setView?.("student-dashboard");
      } else {
        console.log('Login: No active session found');
      }
    };

    checkSession();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setGlobalError?.(null);
    setGlobalSuccess?.(null);
    setLoading(true);

    // Clear logout flag when user initiates a new login
    sessionStorage.removeItem('quizapp_logout_initiated');

    try {
      // 1) Auth against Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        setErrorMsg(/invalid/i.test(error.message) ? t('auth.invalidCredentials') : error.message);
        return;
      }

      const userId = data.user?.id;
      if (!userId) {
        setErrorMsg("No session returned from Supabase.");
        return;
      }

      // 2) Load profile from public.users
      const { data: profile, error: pErr } = await supabase
        .from("users")
        .select("id, email, name, role, approved, verified, teacher_code, teacher_id")
        .eq("id", userId)
        .maybeSingle();

      if (pErr) {
        setErrorMsg(pErr.message);
        return;
      }

      // Optional gates
      if (profile?.role !== "superadmin") {
        if (!profile?.approved) return setErrorMsg("Your account is awaiting approval.");
        if (!profile?.verified) return setErrorMsg("Please verify your email to continue.");
      }

      // 3) Store in app state and route by role (NO page reload)
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

    // Clear logout flag when user initiates a new login
    sessionStorage.removeItem('quizapp_logout_initiated');

    try {
      // Dynamically use current site URL (works for both localhost and Netlify)
      const redirectUrl = `${window.location.origin}/`;

      console.log('Initiating Google OAuth with redirect URL:', redirectUrl);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) {
        console.error('OAuth initiation error:', error);
        setErrorMsg(`Google sign-in failed: ${error.message}`);
        setLoading(false);
      }

      // On success, browser redirects to Google - don't set loading to false
    } catch (err) {
      console.error('OAuth exception:', err);
      setErrorMsg("Failed to initiate Google sign-in. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(to bottom, #4a7c7e, #3d6668)' }}>
      <div className="max-w-sm w-full p-8 rounded-xl shadow-2xl bg-white/95 backdrop-blur-sm">
        <div className="flex justify-center mb-6">
          <LanguageSwitcher />
        </div>
        <h1 className="text-2xl font-bold text-center mb-2" style={{ color: '#2c5aa0' }}>{t('auth.loginToQuizMaster')}</h1>
        <p className="text-center text-sm text-gray-600 mb-6">{t('auth.welcomeBack')}</p>

        {errorMsg && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-200">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#1f3a52' }}>{t('auth.email')}</label>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border-2 rounded-lg px-4 py-2.5 focus:outline-none transition-colors"
              style={{ borderColor: '#e0e0e0' }}
              onFocus={(e) => e.target.style.borderColor = '#4db8d8'}
              onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
              placeholder={t('auth.emailPlaceholder')}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#1f3a52' }}>{t('auth.password')}</label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border-2 rounded-lg px-4 py-2.5 focus:outline-none transition-colors"
              style={{ borderColor: '#e0e0e0' }}
              onFocus={(e) => e.target.style.borderColor = '#4db8d8'}
              onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full text-white font-semibold py-2.5 rounded-lg transition-all duration-200 disabled:opacity-50 hover:opacity-90"
            style={{ background: 'linear-gradient(to right, #2c5aa0, #4db8d8)' }}
          >
            {loading ? t('auth.signingIn') : t('auth.login')}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full" style={{ borderTop: '1px solid #e0e0e0' }}></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 text-gray-500" style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)' }}>{t('auth.orContinueWith')}</span>
            </div>
          </div>

          <button
            onClick={handleGoogleSignIn}
            type="button"
            className="mt-4 w-full flex items-center justify-center gap-3 border-2 font-medium py-2.5 px-4 rounded-lg transition-all duration-200"
            style={{ borderColor: '#4db8d8', color: '#2c5aa0' }}
            onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(77, 184, 216, 0.1)'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {t('auth.signInWithGoogle')}
          </button>
        </div>

        <p className="text-center text-sm mt-6 text-gray-700">
          {t('auth.dontHaveAccount')}{" "}
          <button
            onClick={() => setView("register")}
            className="font-semibold transition-colors hover:opacity-80"
            style={{ color: '#2c5aa0' }}
          >
            {t('auth.register')}
          </button>
        </p>
      </div>
    </div>
  );
}
