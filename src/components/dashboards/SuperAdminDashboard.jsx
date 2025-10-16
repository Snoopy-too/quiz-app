// src/components/dashboards/SuperAdminDashboard.jsx

import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { UserPlus, Edit2, Trash2, Key, Users, UserCheck, UserX, Search } from "lucide-react";
import VerticalNav from "../layout/VerticalNav";
import AlertModal from "../common/AlertModal";
import ConfirmModal from "../common/ConfirmModal";

export default function SuperAdminDashboard({ setView, appState }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Alert/Confirm modals
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: "", message: "", type: "info" });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: "", message: "", onConfirm: null });

  // Form states
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "student",
    student_id: ""
  });

  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    role: "",
    student_id: "",
    approved: false,
    verified: false
  });

  const [passwordForm, setPasswordForm] = useState({
    newPassword: "",
    confirmPassword: ""
  });

  useEffect(() => {
    fetchUsers();

    // Debug: Check current user's role
    const checkUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData } = await supabase
          .from("users")
          .select("role, email, id")
          .eq("id", user.id)
          .single();
        console.log("Current logged in user:", userData);
        console.log("Auth UID:", user.id);
      }
    };
    checkUserRole();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });

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

  const handleCreateUser = async (e) => {
    e.preventDefault();

    if (createForm.password !== createForm.confirmPassword) {
      setAlertModal({
        isOpen: true,
        title: "Password Mismatch",
        message: "Passwords do not match",
        type: "error"
      });
      return;
    }

    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: createForm.email,
        password: createForm.password,
        options: {
          data: {
            name: createForm.name,
            role: createForm.role
          }
        }
      });

      if (authError) throw authError;

      // Create user profile
      const { error: profileError } = await supabase.from("users").insert([{
        id: authData.user.id,
        name: createForm.name,
        email: createForm.email,
        role: createForm.role,
        student_id: createForm.student_id || null,
        verified: true, // Admin-created users are auto-verified
        approved: true  // Admin-created users are auto-approved
      }]);

      if (profileError) throw profileError;

      setAlertModal({
        isOpen: true,
        title: "Success",
        message: "User created successfully!",
        type: "success"
      });
      setShowCreateModal(false);
      setCreateForm({ name: "", email: "", password: "", confirmPassword: "", role: "student", student_id: "" });
      fetchUsers();
    } catch (error) {
      setAlertModal({
        isOpen: true,
        title: "Error",
        message: "Error creating user: " + error.message,
        type: "error"
      });
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();

    try {
      console.log("Attempting to update user:", selectedUser.id);
      console.log("Update data:", {
        name: editForm.name,
        email: editForm.email,
        role: editForm.role,
        student_id: editForm.student_id || null,
        approved: editForm.approved,
        verified: editForm.verified
      });

      const { data, error, count } = await supabase
        .from("users")
        .update({
          name: editForm.name,
          email: editForm.email,
          role: editForm.role,
          student_id: editForm.student_id || null,
          approved: editForm.approved,
          verified: editForm.verified
        })
        .eq("id", selectedUser.id)
        .select();

      console.log("Update result:", { data, error, count });

      if (error) {
        console.error("Update error:", error);
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error("No rows were updated. This might be a permissions issue. Check that your role is 'superadmin' and RLS policies are applied.");
      }

      setAlertModal({
        isOpen: true,
        title: "Success",
        message: "User updated successfully!",
        type: "success"
      });
      setShowEditModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      console.error("Error in handleEditUser:", error);
      setAlertModal({
        isOpen: true,
        title: "Error",
        message: "Error updating user: " + error.message,
        type: "error"
      });
    }
  };

  const handleDeleteUser = (userId, userEmail) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete User",
      message: `Are you sure you want to delete user: ${userEmail}?\n\nThis will delete:\n- User account\n- All their quizzes and questions\n- All quiz sessions\n- All participation records\n\nThis action cannot be undone!`,
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        try {
          // Note: This only deletes from users table
          // Auth user deletion requires admin API or user to delete themselves
          const { error } = await supabase
            .from("users")
            .delete()
            .eq("id", userId);

          if (error) throw error;

          setAlertModal({
            isOpen: true,
            title: "Success",
            message: "User deleted from database. Note: Auth account still exists.",
            type: "success"
          });
          fetchUsers();
        } catch (error) {
          setAlertModal({
            isOpen: true,
            title: "Error",
            message: "Error deleting user: " + error.message,
            type: "error"
          });
        }
      }
    });
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setAlertModal({
        isOpen: true,
        title: "Password Mismatch",
        message: "Passwords do not match",
        type: "error"
      });
      return;
    }

    setAlertModal({
      isOpen: true,
      title: "Password Reset Info",
      message: "Password reset requires Supabase Admin API or email reset link.\n\nTo reset password:\n1. Go to Supabase Dashboard\n2. Authentication > Users\n3. Click user\n4. Send password reset email",
      type: "info"
    });
    setShowPasswordModal(false);
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name || "",
      email: user.email || "",
      role: user.role || "",
      student_id: user.student_id || "",
      approved: user.approved || false,
      verified: user.verified || false
    });
    setShowEditModal(true);
  };

  const openPasswordModal = (user) => {
    setSelectedUser(user);
    setPasswordForm({ newPassword: "", confirmPassword: "" });
    setShowPasswordModal(true);
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === "all" || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  // Stats
  const stats = {
    total: users.length,
    teachers: users.filter(u => u.role === "teacher").length,
    students: users.filter(u => u.role === "student").length,
    admins: users.filter(u => u.role === "superadmin").length,
    pending: users.filter(u => !u.approved || !u.verified).length
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Vertical Navigation */}
      <VerticalNav currentView="superadmin-dashboard" setView={setView} appState={appState} />

      {/* Main Content */}
      <div className="flex-1 ml-64">
        <nav className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <h1 className="text-2xl font-bold text-blue-700">Super Admin Dashboard</h1>
        </nav>

        <div className="container mx-auto p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Users</p>
                <p className="text-3xl font-bold text-blue-700">{stats.total}</p>
              </div>
              <Users className="text-blue-700" size={40} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Teachers</p>
                <p className="text-3xl font-bold text-blue-600">{stats.teachers}</p>
              </div>
              <UserCheck className="text-blue-600" size={40} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Students</p>
                <p className="text-3xl font-bold text-green-600">{stats.students}</p>
              </div>
              <Users className="text-green-600" size={40} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Admins</p>
                <p className="text-3xl font-bold text-orange-600">{stats.admins}</p>
              </div>
              <UserCheck className="text-orange-600" size={40} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Pending</p>
                <p className="text-3xl font-bold text-red-600">{stats.pending}</p>
              </div>
              <UserX className="text-red-600" size={40} />
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex gap-4 flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500"
              >
                <option value="all">All Roles</option>
                <option value="student">Students</option>
                <option value="teacher">Teachers</option>
                <option value="superadmin">Admins</option>
              </select>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-700 text-white px-6 py-2 rounded-lg hover:bg-blue-800 flex items-center gap-2"
            >
              <UserPlus size={20} />
              Create User
            </button>
          </div>
        </div>

        {/* Users Table */}
        {loading && <p className="text-center text-gray-600">Loading users...</p>}
        {error && <p className="text-center text-red-500">{error}</p>}

        {!loading && !error && (
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-4 text-left text-sm font-semibold text-gray-700">Name</th>
                    <th className="p-4 text-left text-sm font-semibold text-gray-700">Email</th>
                    <th className="p-4 text-left text-sm font-semibold text-gray-700">Role</th>
                    <th className="p-4 text-left text-sm font-semibold text-gray-700">Student ID</th>
                    <th className="p-4 text-left text-sm font-semibold text-gray-700">Status</th>
                    <th className="p-4 text-left text-sm font-semibold text-gray-700">Created</th>
                    <th className="p-4 text-left text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="p-4">{user.name || "N/A"}</td>
                      <td className="p-4">{user.email}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          user.role === "teacher" ? "bg-blue-100 text-blue-800" :
                          user.role === "student" ? "bg-green-100 text-green-800" :
                          "bg-orange-100 text-orange-800"
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="p-4">{user.student_id || "N/A"}</td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          {user.verified ? (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Verified</span>
                          ) : (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">Unverified</span>
                          )}
                          {user.approved ? (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Approved</span>
                          ) : (
                            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">Pending</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-gray-600">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditModal(user)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit User"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => openPasswordModal(user)}
                            className="p-2 text-blue-700 hover:bg-blue-50 rounded"
                            title="Reset Password"
                          >
                            <Key size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id, user.email)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                            title="Delete User"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredUsers.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No users found matching your search criteria.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Create User Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold mb-6">Create New User</h2>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input
                    type="text"
                    required
                    value={createForm.name}
                    onChange={(e) => setCreateForm({...createForm, name: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={(e) => setCreateForm({...createForm, email: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={createForm.password}
                    onChange={(e) => setCreateForm({...createForm, password: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Confirm Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={createForm.confirmPassword}
                    onChange={(e) => setCreateForm({...createForm, confirmPassword: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Role</label>
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm({...createForm, role: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </div>

                {createForm.role === "student" && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Student ID (Optional)</label>
                    <input
                      type="text"
                      value={createForm.student_id}
                      onChange={(e) => setCreateForm({...createForm, student_id: e.target.value})}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                )}

                <div className="flex gap-2 mt-6">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-700 text-white py-2 rounded hover:bg-blue-800"
                  >
                    Create User
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit User Modal */}
        {showEditModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold mb-6">Edit User: {selectedUser.email}</h2>
              <form onSubmit={handleEditUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Role</label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </div>

                {editForm.role === "student" && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Student ID</label>
                    <input
                      type="text"
                      value={editForm.student_id}
                      onChange={(e) => setEditForm({...editForm, student_id: e.target.value})}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                )}

                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editForm.verified}
                      onChange={(e) => setEditForm({...editForm, verified: e.target.checked})}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Verified</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editForm.approved}
                      onChange={(e) => setEditForm({...editForm, approved: e.target.checked})}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Approved</span>
                  </label>
                </div>

                <div className="flex gap-2 mt-6">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Password Reset Modal */}
        {showPasswordModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold mb-4">Reset Password</h2>
              <p className="text-gray-600 mb-6">
                User: <strong>{selectedUser.email}</strong>
              </p>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> Direct password changes require Supabase Admin API.
                    The recommended method is to send a password reset email via Supabase Dashboard.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">New Password</label>
                  <input
                    type="password"
                    minLength={6}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                    disabled
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Confirm Password</label>
                  <input
                    type="password"
                    minLength={6}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                    disabled
                  />
                </div>

                <div className="flex gap-2 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="w-full bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400"
                  >
                    Close
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Custom Modals */}
        <AlertModal
          isOpen={alertModal.isOpen}
          title={alertModal.title}
          message={alertModal.message}
          type={alertModal.type}
          onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        />

        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
          confirmStyle="danger"
        />
        </div>
      </div>
    </div>
  );
}
