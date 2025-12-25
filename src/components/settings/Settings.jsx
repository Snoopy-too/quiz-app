import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { User, Lock, Camera, Save, Check } from "lucide-react";
import VerticalNav from "../layout/VerticalNav";
import { useTranslation } from "react-i18next";

// 60 default avatars using DiceBear API with different styles
const DEFAULT_AVATARS = [
  // avataaars (1-5)
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Avatar1",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Avatar2",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Avatar3",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Avatar4",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Avatar5",
  // lorelei (6-10)
  "https://api.dicebear.com/7.x/lorelei/svg?seed=Avatar6",
  "https://api.dicebear.com/7.x/lorelei/svg?seed=Avatar7",
  "https://api.dicebear.com/7.x/lorelei/svg?seed=Avatar8",
  "https://api.dicebear.com/7.x/lorelei/svg?seed=Avatar9",
  "https://api.dicebear.com/7.x/lorelei/svg?seed=Avatar10",
  // personas (11-15)
  "https://api.dicebear.com/7.x/personas/svg?seed=Avatar11",
  "https://api.dicebear.com/7.x/personas/svg?seed=Avatar12",
  "https://api.dicebear.com/7.x/personas/svg?seed=Avatar13",
  "https://api.dicebear.com/7.x/personas/svg?seed=Avatar14",
  "https://api.dicebear.com/7.x/personas/svg?seed=Avatar15",
  // pixel-art (16-20)
  "https://api.dicebear.com/7.x/pixel-art/svg?seed=Avatar16",
  "https://api.dicebear.com/7.x/pixel-art/svg?seed=Avatar17",
  "https://api.dicebear.com/7.x/pixel-art/svg?seed=Avatar18",
  "https://api.dicebear.com/7.x/pixel-art/svg?seed=Avatar19",
  "https://api.dicebear.com/7.x/pixel-art/svg?seed=Avatar20",
  // big-ears (21-25)
  "https://api.dicebear.com/7.x/big-ears/svg?seed=Avatar21",
  "https://api.dicebear.com/7.x/big-ears/svg?seed=Avatar22",
  "https://api.dicebear.com/7.x/big-ears/svg?seed=Avatar23",
  "https://api.dicebear.com/7.x/big-ears/svg?seed=Avatar24",
  "https://api.dicebear.com/7.x/big-ears/svg?seed=Avatar25",
  // bottts (26-30)
  "https://api.dicebear.com/7.x/bottts/svg?seed=Avatar26",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Avatar27",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Avatar28",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Avatar29",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Avatar30",
  // adventurer (31-35)
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Avatar31",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Avatar32",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Avatar33",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Avatar34",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Avatar35",
  // fun-emoji (36-40)
  "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Avatar36",
  "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Avatar37",
  "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Avatar38",
  "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Avatar39",
  "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Avatar40",
  // micah (41-45)
  "https://api.dicebear.com/7.x/micah/svg?seed=Avatar41",
  "https://api.dicebear.com/7.x/micah/svg?seed=Avatar42",
  "https://api.dicebear.com/7.x/micah/svg?seed=Avatar43",
  "https://api.dicebear.com/7.x/micah/svg?seed=Avatar44",
  "https://api.dicebear.com/7.x/micah/svg?seed=Avatar45",
  // notionists (46-50)
  "https://api.dicebear.com/7.x/notionists/svg?seed=Avatar46",
  "https://api.dicebear.com/7.x/notionists/svg?seed=Avatar47",
  "https://api.dicebear.com/7.x/notionists/svg?seed=Avatar48",
  "https://api.dicebear.com/7.x/notionists/svg?seed=Avatar49",
  "https://api.dicebear.com/7.x/notionists/svg?seed=Avatar50",
  // open-peeps (51-55)
  "https://api.dicebear.com/7.x/open-peeps/svg?seed=Avatar51",
  "https://api.dicebear.com/7.x/open-peeps/svg?seed=Avatar52",
  "https://api.dicebear.com/7.x/open-peeps/svg?seed=Avatar53",
  "https://api.dicebear.com/7.x/open-peeps/svg?seed=Avatar54",
  "https://api.dicebear.com/7.x/open-peeps/svg?seed=Avatar55",
  // thumbs (56-60)
  "https://api.dicebear.com/7.x/thumbs/svg?seed=Avatar56",
  "https://api.dicebear.com/7.x/thumbs/svg?seed=Avatar57",
  "https://api.dicebear.com/7.x/thumbs/svg?seed=Avatar58",
  "https://api.dicebear.com/7.x/thumbs/svg?seed=Avatar59",
  "https://api.dicebear.com/7.x/thumbs/svg?seed=Avatar60"
];

export default function Settings({ setView, appState, setAppState }) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [isGoogleUser, setIsGoogleUser] = useState(false);

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

    // Check if user authenticated with Google
    const checkAuthProvider = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Check if user has a Google provider
        const hasGoogleProvider = user.app_metadata?.provider === 'google' ||
                                   user.app_metadata?.providers?.includes('google');
        setIsGoogleUser(hasGoogleProvider);
      }
    };

    checkAuthProvider();
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

      <div className="flex-1 md:ml-64 ml-0">
        <nav className="bg-white shadow-sm border-b border-gray-200 px-4 md:px-6 py-3 md:py-4">
          <h1 className="text-xl md:text-2xl font-bold text-blue-700">{t("settings.settings")}</h1>
        </nav>

        <div className="container mx-auto p-4 md:p-6 max-w-4xl">
          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-md mb-4 md:mb-6">
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab("profile")}
                className={`${isGoogleUser ? 'w-full' : 'flex-1'} px-3 md:px-6 py-3 md:py-4 text-center text-sm md:text-base font-medium transition-colors ${
                  activeTab === "profile"
                    ? "text-blue-700 border-b-2 border-blue-700"
                    : "text-gray-600 hover:text-blue-700"
                }`}
              >
                <User className="inline-block mr-1 md:mr-2" size={18} />
                <span className="hidden sm:inline">{t("settings.profile")}</span>
                <span className="sm:hidden">Profile</span>
              </button>
              {!isGoogleUser && (
                <button
                  onClick={() => setActiveTab("password")}
                  className={`flex-1 px-3 md:px-6 py-3 md:py-4 text-center text-sm md:text-base font-medium transition-colors ${
                    activeTab === "password"
                      ? "text-blue-700 border-b-2 border-blue-700"
                      : "text-gray-600 hover:text-blue-700"
                  }`}
                >
                  <Lock className="inline-block mr-1 md:mr-2" size={18} />
                  <span className="hidden sm:inline">{t("settings.password")}</span>
                  <span className="sm:hidden">Password</span>
                </button>
              )}
            </div>

            {/* Messages */}
            {message.text && (
              <div className={`mx-4 md:mx-6 mt-4 md:mt-6 p-3 md:p-4 rounded-lg text-sm md:text-base ${
                message.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
              }`}>
                {message.text}
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === "profile" && (
              <form onSubmit={handleUpdateProfile} className="p-4 md:p-6 space-y-4 md:space-y-6">
                {isGoogleUser && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <strong>{t("common.note")}:</strong> You are signed in with Google. Your password is managed by Google and cannot be changed here.
                    </p>
                  </div>
                )}

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
                  <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2 md:gap-4 mb-4 md:mb-6 p-3 md:p-4 bg-gray-50 rounded-lg max-h-80 overflow-y-auto">
                    {DEFAULT_AVATARS.map((avatar, index) => (
                      <button
                        key={index}
                        type="button"
                        title={`Select avatar ${index + 1}`}
                        onClick={() => setProfileForm({ ...profileForm, avatar_url: avatar })}
                        className={`relative w-full aspect-square rounded-lg overflow-hidden border-2 transition-all active:scale-95 md:hover:scale-110 ${
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
                            <Check className="text-blue-700 bg-white rounded-full p-1" size={20} />
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
              <form onSubmit={handleChangePassword} className="p-4 md:p-6 space-y-4 md:space-y-6">
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
          <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
            <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-3 md:mb-4">{t("settings.accountInformation")}</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">{t("settings.role")}</span>
                <span className="font-medium capitalize text-blue-700">{appState.currentUser?.role}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">{t("settings.accountStatus")}</span>
                <span className={`font-medium px-3 py-1 rounded-full text-xs ${
                  appState.currentUser?.verified && appState.currentUser?.approved
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}>
                  {appState.currentUser?.verified && appState.currentUser?.approved
                    ? t("settings.active")
                    : t("settings.pendingApproval")}
                </span>
              </div>
              {appState.currentUser?.student_id && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">{t("settings.studentId")}</span>
                  <span className="font-medium text-gray-800">{appState.currentUser.student_id}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
