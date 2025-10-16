import { useState } from "react";
import { Home, LayoutDashboard, FileText, Users, Settings, LogOut, PlayCircle, Trophy, BarChart3, FolderOpen, UserCheck, Shield, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "../../supabaseClient";
import ConfirmModal from "../common/ConfirmModal";
import LanguageSwitcher from "../common/LanguageSwitcher";

export default function VerticalNav({ currentView, setView, appState }) {
  const { t } = useTranslation();
  const userRole = appState?.currentUser?.role;
  const [showLogoutModal, setShowLogoutModal] = useState(false);

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

  return (
    <div className="w-64 text-white flex flex-col h-screen fixed left-0 top-0 shadow-xl z-40" style={{ background: 'linear-gradient(to bottom, #4a7c7e, #3d6668)' }}>
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
                  onClick={() => setView(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive
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
          onClick={() => setView("settings")}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
            currentView === "settings"
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

      <ConfirmModal
        isOpen={showLogoutModal}
        title={t('nav.logout')}
        message={t('common.confirm')}
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutModal(false)}
        confirmText={t('nav.logout')}
        confirmStyle="danger"
      />
    </div>
  );
}
