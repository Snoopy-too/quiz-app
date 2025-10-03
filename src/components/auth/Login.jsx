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
