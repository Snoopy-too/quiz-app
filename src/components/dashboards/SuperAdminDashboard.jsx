// src/components/dashboards/SuperAdminDashboard.jsx

import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";

export default function SuperAdminDashboard({ setView }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError("");

      try {
        const { data, error } = await supabase
          .from("users")
          .select("id, email, role");

        if (error) {
          console.error("Error fetching users:", error.message);
          setError("Failed to load users");
        } else {
          setUsers(data);
        }
      } catch (err) {
        console.error("Unexpected error:", err);
        setError("Something went wrong.");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold mb-6">Super Admin Dashboard</h1>

      {loading && <p>Loading users...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!loading && !error && (
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">All Users</h2>
          <table className="w-full border border-gray-200">
            <thead>
              <tr className="bg-gray-200 text-left">
                <th className="p-2 border">ID</th>
                <th className="p-2 border">Email</th>
                <th className="p-2 border">Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-100">
                  <td className="p-2 border">{user.id}</td>
                  <td className="p-2 border">{user.email}</td>
                  <td className="p-2 border">{user.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6">
        <button
          onClick={() => setView("login")}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
