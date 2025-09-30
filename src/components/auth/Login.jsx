import React, { useState } from "react";

const Login = ({ appState, setAppState, setView, formData, setFormData, error, setError, success, setSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [role, setRole] = useState("student");

  const handleSubmit = () => {
    setError("");
    setSuccess("");

    if (isRegister) {
      const exists = appState.users.find((u) => u.email === formData.email);
      if (exists) {
        setError("Email already registered");
        return;
      }
      if (role === "student" && !formData.studentId) {
        setError("Student ID is required");
        return;
      }

      const newUser = {
        id: appState.users.length + 1,
        email: formData.email,
        password: formData.password,
        role: role,
        verified: false,
        approved: role === "teacher" ? false : true,
        name: formData.name,
        studentId: role === "student" ? formData.studentId : null,
      };

      setAppState((prev) => ({
        ...prev,
        users: [...prev.users, newUser],
        pendingVerifications: [...prev.pendingVerifications, { userId: newUser.id, code: "123456" }],
      }));
      setSuccess("Registration successful! Verification code: 123456");
      setFormData({});
    } else {
      const user = appState.users.find(
        (u) => u.email === formData.email && u.password === formData.password
      );
      if (!user) {
        setError("Invalid credentials");
        return;
      }
      if (!user.verified) {
        setError("Please verify your email first");
        return;
      }
      if (user.role === "teacher" && !user.approved) {
        setError("Your account is pending admin approval");
        return;
      }
      setAppState((prev) => ({ ...prev, currentUser: user }));
      setView(user.role === "student" ? "student-dashboard" : "teacher-dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
          {isRegister ? "Register" : "Login"} to QuizMaster
        </h1>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        <div className="space-y-4">
          {isRegister && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                </select>
              </div>
              <input
                type="text"
                placeholder="Full Name"
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-3 border rounded-lg"
              />
              {role === "student" && (
                <input
                  type="text"
                  placeholder="Student ID"
                  value={formData.studentId || ""}
                  onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                  className="w-full p-3 border rounded-lg"
                />
              )}
            </>
          )}
          <input
            type="email"
            placeholder="Email"
            value={formData.email || ""}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full p-3 border rounded-lg"
          />
          <input
            type="password"
            placeholder="Password"
            value={formData.password || ""}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="w-full p-3 border rounded-lg"
          />
          <button
            onClick={handleSubmit}
            className="w-full bg-purple-600 text-white p-3 rounded-lg hover:bg-purple-700 transition"
          >
            {isRegister ? "Register" : "Login"}
          </button>
        </div>

        <button
          onClick={() => {
            setIsRegister(!isRegister);
            setError("");
            setSuccess("");
          }}
          className="w-full mt-4 text-purple-600 hover:underline"
        >
          {isRegister ? "Already have an account? Login" : "Don't have an account? Register"}
        </button>

        {success && isRegister && (
          <button
            onClick={() => setView("verify")}
            className="w-full mt-4 bg-green-600 text-white p-3 rounded-lg hover:bg-green-700"
          >
            Verify Email
          </button>
        )}
      </div>
    </div>
  );
};

export default Login;
