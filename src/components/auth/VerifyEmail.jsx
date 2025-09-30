import React from "react";

export default function VerifyEmail({ appState, setAppState, setView, formData, setFormData, error, setError, success, setSuccess }) {
  const handleVerify = () => {
    const pending = appState.pendingVerifications.find((p) => p.code === formData.code);
    if (pending) {
      setAppState((prev) => ({
        ...prev,
        users: prev.users.map((u) => (u.id === pending.userId ? { ...u, verified: true } : u)),
        pendingVerifications: prev.pendingVerifications.filter((p) => p.userId !== pending.userId),
      }));
      setSuccess("Email verified! You can now login.");
      setTimeout(() => setView("login"), 2000);
    } else {
      setError("Invalid verification code");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-6">Verify Email</h1>
        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
        {success && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">{success}</div>}
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Enter 6-digit code"
            value={formData.code || ""}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            className="w-full p-3 border rounded-lg text-center text-2xl"
            maxLength="6"
          />
          <button onClick={handleVerify} className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700">
            Verify
          </button>
        </div>
        <button onClick={() => setView("login")} className="w-full mt-4 text-blue-600 hover:underline">
          Back to Login
        </button>
      </div>
    </div>
  );
}
