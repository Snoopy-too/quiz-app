import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { User, Lock, Camera, Save, Check } from "lucide-react";
import VerticalNav from "../layout/VerticalNav";
import { useTranslation } from "react-i18next";

// 30 default avatars using DiceBear API with different styles
const DEFAULT_AVATARS = [
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Avatar1",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Avatar2",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Avatar3",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Avatar4",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Avatar5",
  "https://api.dicebear.com/7.x/lorelei/svg?seed=Avatar6",
  "https://api.dicebear.com/7.x/lorelei/svg?seed=Avatar7",
  "https://api.dicebear.com/7.x/lorelei/svg?seed=Avatar8",
  "https://api.dicebear.com/7.x/lorelei/svg?seed=Avatar9",
  "https://api.dicebear.com/7.x/lorelei/svg?seed=Avatar10",
  "https://api.dicebear.com/7.x/personas/svg?seed=Avatar11",
  "https://api.dicebear.com/7.x/personas/svg?seed=Avatar12",
  "https://api.dicebear.com/7.x/personas/svg?seed=Avatar13",
  "https://api.dicebear.com/7.x/personas/svg?seed=Avatar14",
  "https://api.dicebear.com/7.x/personas/svg?seed=Avatar15",
  "https://api.dicebear.com/7.x/pixel-art/svg?seed=Avatar16",
  "https://api.dicebear.com/7.x/pixel-art/svg?seed=Avatar17",
  "https://api.dicebear.com/7.x/pixel-art/svg?seed=Avatar18",
  "https://api.dicebear.com/7.x/pixel-art/svg?seed=Avatar19",
  "https://api.dicebear.com/7.x/pixel-art/svg?seed=Avatar20",
  "https://api.dicebear.com/7.x/big-ears/svg?seed=Avatar21",
  "https://api.dicebear.com/7.x/big-ears/svg?seed=Avatar22",
  "https://api.dicebear.com/7.x/big-ears/svg?seed=Avatar23",
  "https://api.dicebear.com/7.x/big-ears/svg?seed=Avatar24",
  "https://api.dicebear.com/7.x/big-ears/svg?seed=Avatar25",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Avatar26",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Avatar27",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Avatar28",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Avatar29",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Avatar30"
];

export default function Settings({ setView, appState, setAppState }) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Profile form
  const [profileForm, setProfileForm] = useState({
    name: appState.currentUser?.name || "",
    email: appState.currentUser?.email || "",
    avatar_url: appState.currentUser?.avatar_url || ""
  });

  // Password form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  useEffect(() => {
    setProfileForm({
      name: appState.currentUser?.name || "",
      email: appState.currentUser?.email || "",
      avatar_url: appState.currentUser?.avatar_url || ""
    });
  }, [appState.currentUser]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const { error } = await supabase
        .from("users")
        .update({
          name: profileForm.name,
          email: profileForm.email,
          avatar_url: profileForm.avatar_url
        })
        .eq("id", appState.currentUser.id);

      if (error) throw error;

      // Update app state
      setAppState((prev) => ({
        ...prev,
        currentUser: {
          ...prev.currentUser,
          name: profileForm.name,
          email: profileForm.email,
          avatar_url: profileForm.avatar_url
        }
      }));

      setMessage({ type: "success", text: t("settings.profileUpdated") });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: "error", text: t("settings.passwordsDoNotMatch") });
      setLoading(false);
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setMessage({ type: "error", text: t("settings.passwordTooShort") });
      setLoading(false);
      return;
    }

    try {
      // Update password in Supabase Auth
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });

      if (error) throw error;

      setMessage({ type: "success", text: t("settings.passwordChanged") });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <VerticalNav currentView="settings" setView={setView} appState={appState} />

      <div className="flex-1 ml-64">
        <nav className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <h1 className="text-2xl font-bold text-blue-700">{t("settings.settings")}</h1>
        </nav>

        <div className="container mx-auto p-6 max-w-4xl">
          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-md mb-6">
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab("profile")}
                className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                  activeTab === "profile"
                    ? "text-blue-700 border-b-2 border-blue-700"
                    : "text-gray-600 hover:text-blue-700"
                }`}
              >
                <User className="inline-block mr-2" size={20} />
                {t("settings.profile")}
              </button>
              <button
                onClick={() => setActiveTab("password")}
                className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                  activeTab === "password"
                    ? "text-blue-700 border-b-2 border-blue-700"
                    : "text-gray-600 hover:text-blue-700"
                }`}
              >
                <Lock className="inline-block mr-2" size={20} />
                {t("settings.password")}
              </button>
            </div>

            {/* Messages */}
            {message.text && (
              <div className={`mx-6 mt-6 p-4 rounded-lg ${
                message.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
              }`}>
                {message.text}
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === "profile" && (
              <form onSubmit={handleUpdateProfile} className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("settings.name")}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter your full name"
                    title="Full Name"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("settings.email")}
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="your.email@example.com"
                    title="Email Address"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    <Camera className="inline-block mr-2" size={18} />
                    Select Avatar
                  </label>

                  {/* Avatar Grid */}
                  <div className="grid grid-cols-5 md:grid-cols-6 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                    {DEFAULT_AVATARS.map((avatar, index) => (
                      <button
                        key={index}
                        type="button"
                        title={`Select avatar ${index + 1}`}
                        onClick={() => setProfileForm({ ...profileForm, avatar_url: avatar })}
                        className={`relative w-full aspect-square rounded-lg overflow-hidden border-2 transition-all hover:scale-110 ${
                          profileForm.avatar_url === avatar
                            ? "border-blue-700 shadow-lg"
                            : "border-gray-300 hover:border-cyan-400"
                        }`}
                      >
                        <img
                          src={avatar}
                          alt={`Avatar option ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {profileForm.avatar_url === avatar && (
                          <div className="absolute inset-0 bg-blue-700 bg-opacity-20 flex items-center justify-center">
                            <Check className="text-blue-700 bg-white rounded-full p-1" size={24} />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Custom URL Option */}
                  <div className="border-t pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Or enter custom avatar URL
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="url"
                        placeholder={t("settings.avatarUrlPlaceholder")}
                        value={profileForm.avatar_url}
                        onChange={(e) => setProfileForm({ ...profileForm, avatar_url: e.target.value })}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      />
                      {profileForm.avatar_url && (
                        <img
                          src={profileForm.avatar_url}
                          alt="Avatar preview"
                          className="w-10 h-10 rounded-full object-cover border border-gray-300"
                          onError={(e) => e.target.style.display = 'none'}
                        />
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {t("settings.avatarUrlHelp")}
                    </p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-700 text-white px-6 py-3 rounded-lg hover:bg-blue-800 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                >
                  <Save size={20} />
                  {loading ? t("settings.saving") : t("settings.saveChanges")}
                </button>
              </form>
            )}

            {/* Password Tab */}
            {activeTab === "password" && (
              <form onSubmit={handleChangePassword} className="p-6 space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-800">
                    <strong>{t("common.note")}:</strong> {t("settings.passwordNote")}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("settings.newPassword")}
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    placeholder={t("settings.newPasswordPlaceholder")}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("settings.confirmNewPassword")}
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    placeholder={t("settings.confirmPasswordPlaceholder")}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-700 text-white px-6 py-3 rounded-lg hover:bg-blue-800 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                >
                  <Lock size={20} />
                  {loading ? t("settings.updating") : t("settings.changePassword")}
                </button>
              </form>
            )}
          </div>

          {/* Account Info */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">{t("settings.accountInformation")}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">{t("settings.role")}</span>
                <span className="font-medium capitalize">{appState.currentUser?.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t("settings.accountStatus")}</span>
                <span className={`font-medium ${
                  appState.currentUser?.verified && appState.currentUser?.approved
                    ? "text-green-600"
                    : "text-yellow-600"
                }`}>
                  {appState.currentUser?.verified && appState.currentUser?.approved
                    ? t("settings.active")
                    : t("settings.pendingApproval")}
                </span>
              </div>
              {appState.currentUser?.student_id && (
                <div className="flex justify-between">
                  <span className="text-gray-600">{t("settings.studentId")}</span>
                  <span className="font-medium">{appState.currentUser.student_id}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
