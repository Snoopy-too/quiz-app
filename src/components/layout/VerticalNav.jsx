import { useState } from "react";
import { Home, LayoutDashboard, FileText, Users, Settings, LogOut, PlayCircle, Trophy, BarChart3, FolderOpen, UserCheck, Shield, Globe, Menu, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "../../supabaseClient";
import ConfirmModal from "../common/ConfirmModal";
import LanguageSwitcher from "../common/LanguageSwitcher";

export default function VerticalNav({ currentView, setView, appState }) {
  const { t } = useTranslation();
  const userRole = appState?.currentUser?.role;
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    setShowLogoutModal(false);
    try {
      await supabase.auth.signOut();
      setView("login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Navigation items based on role
  const getNavItems = () => {
    if (userRole === "teacher") {
      return [
        { id: "teacher-dashboard", label: t('nav.dashboard'), icon: LayoutDashboard },
        { id: "manage-quizzes", label: t('teacher.myQuizzes'), icon: FolderOpen },
        { id: "create-quiz", label: t('nav.createQuiz'), icon: FileText },
        { id: "manage-students", label: t('teacher.students'), icon: Users },
        { id: "reports", label: t('nav.reports'), icon: BarChart3 },
        { id: "public-quizzes", label: t('nav.publicQuizzes'), icon: Globe },
      ];
    } else if (userRole === "student") {
      return [
        { id: "student-dashboard", label: t('nav.dashboard'), icon: LayoutDashboard },
      ];
    } else if (userRole === "superadmin") {
      return [
        { id: "superadmin-dashboard", label: t('nav.dashboard'), icon: Shield },
      ];
    }
    return [];
  };

  const navItems = getNavItems();

  const handleNavClick = (itemId) => {
    setView(itemId);
    setMobileMenuOpen(false); // Close mobile menu after selection
  };

  return (
    <>
      {/* Desktop Sidebar - Hidden on mobile */}
      <div className="hidden md:flex w-64 text-white flex flex-col h-screen fixed left-0 top-0 shadow-xl z-40" style={{ background: 'linear-gradient(to bottom, #4a7c7e, #3d6668)' }}>
        {/* Logo/Brand */}
        <div className="p-4 flex items-center justify-center border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
          <img
            src="http://pierenglishschool.com/quizapp/images/logo.png"
            alt="QuizMaster Logo"
            className="max-w-full h-auto"
            style={{ maxHeight: '112px', width: 'auto' }}
            onError={(e) => {
              // Fallback to placeholder if image fails to load
              e.target.style.display = 'none';
            }}
          />
        </div>

        {/* User Info */}
        <div className="p-4 border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
          <div className="flex items-center gap-3 mb-3">
            {appState?.currentUser?.avatar_url ? (
              <img
                src={appState.currentUser.avatar_url}
                alt={appState.currentUser.name}
                className="w-10 h-10 rounded-full object-cover flex-shrink-0 border"
                style={{ borderColor: 'rgba(255, 255, 255, 0.2)' }}
                onError={(e) => {
                  // If avatar fails to load, hide it
                  e.target.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}>
                <span className="text-sm font-bold">
                  {appState?.currentUser?.name?.charAt(0).toUpperCase() || appState?.currentUser?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{appState?.currentUser?.name || "User"}</p>
              <p className="text-xs text-blue-50 truncate">{appState?.currentUser?.email}</p>
            </div>
          </div>

          {/* Language Switcher */}
          <LanguageSwitcher compact={true} />
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;

              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${isActive
                        ? "font-semibold shadow-md"
                        : "text-gray-200 hover:text-white"
                      }`}
                    style={isActive ? { backgroundColor: 'rgba(255, 255, 255, 0.15)' } : { backgroundColor: 'transparent' }}
                  >
                    <Icon size={20} className={isActive ? "" : "text-gray-300"} />
                    <span className="text-sm">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Settings & Logout */}
        <div className="p-4 border-t space-y-2" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
          <button
            onClick={() => handleNavClick("settings")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${currentView === "settings"
                ? "font-semibold shadow-md"
                : "text-gray-200 hover:text-white"
              }`}
            style={currentView === "settings" ? { backgroundColor: 'rgba(255, 255, 255, 0.15)' } : { backgroundColor: 'transparent' }}
          >
            <Settings size={20} className={currentView === "settings" ? "" : "text-gray-300"} />
            <span className="text-sm">{t('nav.settings')}</span>
          </button>

          <button
            onClick={() => setShowLogoutModal(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-200 hover:text-white transition-all duration-200"
            style={{ backgroundColor: 'transparent' }}
            onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(220, 38, 38, 0.2)'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            <LogOut size={20} />
            <span className="text-sm">{t('nav.logout')}</span>
          </button>
        </div>
      </div>

      {/* Mobile Header with Hamburger Menu - Visible only on mobile */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white shadow-md z-50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {appState?.currentUser?.avatar_url ? (
            <img
              src={appState.currentUser.avatar_url}
              alt={appState.currentUser.name}
              className="w-8 h-8 rounded-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-500 text-white text-sm font-bold">
              {appState?.currentUser?.name?.charAt(0).toUpperCase() || "U"}
            </div>
          )}
          <span className="text-sm font-semibold text-gray-800 truncate">
            {appState?.currentUser?.name || "User"}
          </span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          {mobileMenuOpen ? (
            <X size={24} className="text-gray-700" />
          ) : (
            <Menu size={24} className="text-gray-700" />
          )}
        </button>
      </div>

      {/* Mobile Menu - Slide in from left */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-40 animate-fadeIn"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Slide-in Menu */}
          <div
            className="md:hidden fixed top-0 left-0 bottom-0 w-64 bg-white shadow-2xl z-50 overflow-y-auto"
            style={{
              animation: 'slideInLeft 0.3s ease-out'
            }}
          >
            {/* Mobile Menu Header */}
            <div className="p-4 border-b bg-gradient-to-r from-blue-600 to-cyan-500">
              <div className="flex items-center gap-3 mb-3">
                {appState?.currentUser?.avatar_url ? (
                  <img
                    src={appState.currentUser.avatar_url}
                    alt={appState.currentUser.name}
                    className="w-10 h-10 rounded-full object-cover border-2 border-white"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/20 border-2 border-white">
                    <span className="text-sm font-bold text-white">
                      {appState?.currentUser?.name?.charAt(0).toUpperCase() || "U"}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{appState?.currentUser?.name || "User"}</p>
                  <p className="text-xs text-blue-50 truncate">{appState?.currentUser?.email}</p>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                  aria-label="Close menu"
                >
                  <X size={20} className="text-white" />
                </button>
              </div>
              <LanguageSwitcher compact={true} />
            </div>

            {/* Navigation Items */}
            <nav className="p-4">
              <ul className="space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;

                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => handleNavClick(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${isActive
                            ? "font-semibold bg-blue-100 text-blue-700"
                            : "text-gray-700 hover:bg-gray-100"
                          }`}
                      >
                        <Icon size={20} />
                        <span className="text-sm">{item.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              <div className="border-t pt-4 mt-4 space-y-2">
                <button
                  onClick={() => handleNavClick("settings")}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${currentView === "settings"
                      ? "font-semibold bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100"
                    }`}
                >
                  <Settings size={20} />
                  <span className="text-sm">{t('nav.settings')}</span>
                </button>

                <button
                  onClick={() => {
                    setShowLogoutModal(true);
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-all duration-200"
                >
                  <LogOut size={20} />
                  <span className="text-sm">{t('nav.logout')}</span>
                </button>
              </div>
            </nav>
          </div>
        </>
      )}

      <ConfirmModal
        isOpen={showLogoutModal}
        title={t('nav.logout')}
        message={t('common.confirm')}
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutModal(false)}
        confirmText={t('nav.logout')}
        confirmStyle="danger"
      />
    </>
  );
}
