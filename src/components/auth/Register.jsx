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

    // ❌ Prevent self-registration as superadmin
    if (formData.role === "superadmin") {
      setError("Superadmin accounts must be created by the system administrator.");
      return;
    }

    try {
      // ✅ Insert new user
      const { data, error } = await supabase.from("users").insert([
        {
          name: formData.name,
          email: formData.email,
          password: formData.password, // NOTE: plain-text for now
          role: formData.role,
          student_id: formData.role === "student" ? formData.studentId : null,
          verified: true, // auto-verified for now
          approved: formData.role === "teacher" ? false : true, // teachers need approval
        },
      ]).select().single();

      if (error) {
        console.error("Supabase insert error:", error);
        setError("Registration failed. Try again.");
        return;
      }

      console.log("✅ Registration success:", data);

      // Save new user into state and auto-login
      setAppState((prev) => ({ ...prev, currentUser: data }));
      setSuccess("Registration successful! You are now logged in.");

      // Redirect based on role
      if (data.role === "student") {
        setView("student-dashboard");
      } else if (data.role === "teacher") {
        setView("teacher-dashboard");
      }
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
