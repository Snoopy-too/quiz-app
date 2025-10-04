import { useState } from "react";
import { supabase } from "../../supabaseClient";

export default function Login({
  setView,
  appState,
  setAppState,
  setError: setGlobalError, // optional from parent
  setSuccess: setGlobalSuccess, // optional from parent
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setGlobalError?.(null);
    setGlobalSuccess?.(null);
    setLoading(true);

    try {
      // 1) Auth against Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        setErrorMsg(/invalid/i.test(error.message) ? "Invalid credentials" : error.message);
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
        .select("id, email, name, role, approved, verified")
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

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        setErrorMsg(error.message);
      }
    } catch (err) {
      setErrorMsg("Failed to initiate Google sign-in.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-sm w-full p-6 rounded-xl shadow-lg bg-white">
        <h1 className="text-2xl font-bold text-center mb-4">Login to QuizMaster</h1>

        {errorMsg && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-200">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 rounded disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        <div className="mt-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>

          <button
            onClick={handleGoogleSignIn}
            type="button"
            className="mt-4 w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 font-medium py-2 px-4 rounded hover:bg-gray-50 transition-colors shadow-sm"
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
            Sign in with Google
          </button>
        </div>

        <p className="text-center text-sm mt-4">
          Don't have an account?{" "}
          <button
            onClick={() => setView("register")}
            className="text-purple-700 underline hover:text-purple-800"
          >
            Register
          </button>
        </p>
      </div>
    </div>
  );
}
