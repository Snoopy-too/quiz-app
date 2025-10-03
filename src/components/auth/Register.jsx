import React, { useState } from "react";
import { supabase } from "../../supabaseClient";

export default function Register({ setView, setAppState, error, setError, success, setSuccess }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "student",
    studentId: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Prevent self-registration as superadmin
    if (formData.role === "superadmin") {
      setError("Superadmin accounts must be created by the system administrator.");
      return;
    }

    try {
      // 1. Create auth user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            role: formData.role,
          }
        }
      });

      if (authError) {
        console.error("Supabase auth error:", authError);
        setError(authError.message || "Registration failed. Try again.");
        return;
      }

      if (!authData.user) {
        setError("Registration failed. Please try again.");
        return;
      }

      // 2. Create profile in users table
      const { error: profileError } = await supabase.from("users").insert([
        {
          id: authData.user.id, // Use auth user ID
          name: formData.name,
          email: formData.email.trim().toLowerCase(),
          role: formData.role,
          student_id: formData.role === "student" ? formData.studentId : null,
          verified: false, // Email verification required
          approved: formData.role === "student" ? true : false, // Teachers need approval
        },
      ]);

      if (profileError) {
        console.error("Profile creation error:", profileError);
        setError("Registration failed. Try again.");
        return;
      }

      // 3. Show success message
      if (formData.role === "student") {
        setSuccess("Registration successful! Please check your email to verify your account.");
      } else {
        setSuccess("Registration successful! A teacher must approve your account before you can login.");
      }

      // Redirect to verify email page
      setTimeout(() => {
        setView("verify");
      }, 2000);

    } catch (err) {
      console.error("Unexpected error:", err);
      setError("Something went wrong. Try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-green-400 to-blue-500">
      <div className="bg-white p-8 rounded-lg shadow-lg w-96">
        <h2 className="text-2xl font-bold mb-6 text-center">Register for QuizMaster</h2>
        {error && <div className="bg-red-100 text-red-700 p-2 mb-4 rounded">{error}</div>}
        {success && <div className="bg-green-100 text-green-700 p-2 mb-4 rounded">{success}</div>}
        
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="name"
            placeholder="Full Name"
            value={formData.name}
            onChange={handleChange}
            className="w-full px-4 py-2 mb-4 border rounded-lg"
            required
          />
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

          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="w-full px-4 py-2 mb-4 border rounded-lg"
          >
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
          </select>

          {formData.role === "student" && (
            <input
              type="text"
              name="studentId"
              placeholder="Student ID"
              value={formData.studentId}
              onChange={handleChange}
              className="w-full px-4 py-2 mb-4 border rounded-lg"
              required
            />
          )}

          <button
            type="submit"
            className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
          >
            Register
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => setView("login")}
            className="text-green-700 hover:underline"
          >
            Already have an account? Login
          </button>
        </div>
      </div>
    </div>
  );
}
