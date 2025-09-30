import React, { useState } from "react";
import { supabase } from "../../supabaseClient";

export default function Login({ setView, setAppState }) {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    console.log("Login formData:", formData);

    try {
      // ✅ Query the "users" table directly
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", formData.email)
        .eq("password", formData.password) // NOTE: plain-text for now
        .single();

      if (error || !data) {
        console.error("Supabase query error:", error);
        setError("Invalid credentials");
        return;
      }

      console.log("✅ Login success:", data);

      // Save logged in user to state
      setAppState((prev) => ({ ...prev, currentUser: data }));

      // Redirect based on role
      if (data.role === "student") {
        setView("student-dashboard");
      } else if (data.role === "teacher") {
        setView("teacher-dashboard");
      } else if (data.role === "superadmin") {
        setView("superadmin-dashboard");
      } else {
        // fallback for unknown roles
        setView("teacher-dashboard");
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      setError("Login failed. Try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-purple-400 to-pink-500">
      <div className="bg-white p-8 rounded-lg shadow-lg w-96">
        <h2 className="text-2xl font-bold mb-6 text-center">Login to QuizMaster</h2>
        {error && <div className="bg-red-100 text-red-700 p-2 mb-4 rounded">{error}</div>}
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-4 py-2 mb-4 border rounded-lg"
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            className="w-full px-4 py-2 mb-4 border rounded-lg"
            required
          />
          <button
            type="submit"
            className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700"
          >
            Login
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => setView("register")}
            className="text-purple-700 hover:underline"
          >
            Don’t have an account? Register
          </button>
        </div>
      </div>
    </div>
  );
}
