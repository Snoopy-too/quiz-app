import { useState } from "react";
import { Home, LayoutDashboard, FileText, Users, Settings, LogOut, PlayCircle, Trophy, BarChart3, FolderOpen, UserCheck, Shield } from "lucide-react";
import { supabase } from "../../supabaseClient";
import ConfirmModal from "../common/ConfirmModal";

export default function VerticalNav({ currentView, setView, appState }) {
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
        { id: "teacher-dashboard", label: "Dashboard", icon: LayoutDashboard },
        { id: "manage-quizzes", label: "My Quizzes", icon: FolderOpen },
        { id: "create-quiz", label: "Create Quiz", icon: FileText },
        { id: "manage-students", label: "Students", icon: Users },
        { id: "reports", label: "Reports", icon: BarChart3 },
      ];
    } else if (userRole === "student") {
      return [
        { id: "student-dashboard", label: "Dashboard", icon: LayoutDashboard },
        { id: "join-quiz", label: "Join Quiz", icon: PlayCircle },
        { id: "my-results", label: "My Results", icon: Trophy },
      ];
    } else if (userRole === "superadmin") {
      return [
        { id: "superadmin-dashboard", label: "Dashboard", icon: Shield },
      ];
    }
    return [];
  };

  const navItems = getNavItems();

  return (
    <div className="w-64 bg-gradient-to-b from-purple-700 to-purple-900 text-white flex flex-col h-screen fixed left-0 top-0 shadow-xl">
      {/* Logo/Brand */}
      <div className="p-6 border-b border-purple-600">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
            <span className="text-2xl font-bold text-purple-700">Q</span>
          </div>
          <div>
            <h1 className="text-xl font-bold">QuizMaster</h1>
            <p className="text-xs text-purple-200">
              {userRole === "teacher" ? "Teacher Portal" : userRole === "student" ? "Student Portal" : "Admin Portal"}
            </p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-purple-600">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
            <span className="text-sm font-bold">
              {appState?.currentUser?.name?.charAt(0).toUpperCase() || appState?.currentUser?.email?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{appState?.currentUser?.name || "User"}</p>
            <p className="text-xs text-purple-200 truncate">{appState?.currentUser?.email}</p>
          </div>
        </div>
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
                      ? "bg-white text-purple-700 font-semibold shadow-md"
                      : "text-purple-100 hover:bg-purple-600 hover:text-white"
                  }`}
                >
                  <Icon size={20} className={isActive ? "text-purple-700" : "text-purple-200"} />
                  <span className="text-sm">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Settings & Logout */}
      <div className="p-4 border-t border-purple-600 space-y-2">
        <button
          onClick={() => setView("settings")}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
            currentView === "settings"
              ? "bg-white text-purple-700 font-semibold shadow-md"
              : "text-purple-100 hover:bg-purple-600 hover:text-white"
          }`}
        >
          <Settings size={20} className={currentView === "settings" ? "text-purple-700" : "text-purple-200"} />
          <span className="text-sm">Settings</span>
        </button>

        <button
          onClick={() => setShowLogoutModal(true)}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-purple-100 hover:bg-red-600 hover:text-white transition-all duration-200"
        >
          <LogOut size={20} />
          <span className="text-sm">Logout</span>
        </button>
      </div>

      <ConfirmModal
        isOpen={showLogoutModal}
        title="Confirm Logout"
        message="Are you sure you want to logout?"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutModal(false)}
        confirmText="Logout"
        confirmStyle="danger"
      />
    </div>
  );
}
