import { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  Building2,
  ClipboardList,
  FolderOpen,
  Globe,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Settings,
  Shield,
  Smartphone,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePwaInstall } from "../../hooks/usePwaInstall";
import { supabase } from "../../supabaseClient";
import ConfirmModal from "../common/ConfirmModal";
import InstallGuideDialog from "../common/InstallGuideDialog";
import LanguageSwitcher from "../common/LanguageSwitcher";
import { useToast } from "../ui";

export default function VerticalNav({
  currentView,
  setView,
  appState,
  pendingAssignmentCount = 0,
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const pwaInstall = usePwaInstall();
  const user = appState?.currentUser;
  const userRole = user?.role;
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [failedAvatarUrl, setFailedAvatarUrl] = useState(null);
  const avatarError = Boolean(user?.avatar_url && failedAvatarUrl === user.avatar_url);
  const hamburgerRef = useRef(null);
  const closeDrawerRef = useRef(null);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
        hamburgerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    closeDrawerRef.current?.focus();

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  const handleLogout = async () => {
    setShowLogoutModal(false);
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith("sb-") || key.includes("supabase"))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));

      sessionStorage.removeItem("quizapp_activeFolder");
      sessionStorage.removeItem("quizapp_selectedTeacherId");
      sessionStorage.removeItem("quizapp_registered_email");
      sessionStorage.removeItem("quizapp_switch_team_session_id");
      sessionStorage.setItem("quizapp_logout_initiated", "true");

      await supabase.auth.signOut({ scope: "global" });

      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.startsWith("sb-") || key.includes("supabase"))) {
          localStorage.removeItem(key);
        }
      }

      window.location.href = `${window.location.origin}/login`;
    } catch (error) {
      console.error("Logout error:", error);
      window.location.href = `${window.location.origin}/login`;
    }
  };

  const getNavSections = () => {
    if (userRole === "teacher") {
      return [
        {
          id: "main",
          label: null,
          items: [
            { id: "teacher-dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
          ],
        },
        {
          id: "library",
          label: t("nav.libraryGroup", "Library"),
          items: [
            { id: "manage-quizzes", label: t("teacher.myQuizzes"), icon: FolderOpen },
            { id: "public-quizzes", label: t("nav.schoolLibrary", "School library"), icon: Building2 },
            { id: "global-quizzes", label: t("nav.communityLibrary", "Community library"), icon: Globe },
          ],
        },
        {
          id: "class",
          label: t("nav.classGroup", "Class"),
          items: [
            { id: "manage-students", label: t("teacher.students"), icon: Users },
            { id: "reports", label: t("nav.reports"), icon: BarChart3 },
          ],
        },
      ];
    }

    if (userRole === "student") {
      return [
        {
          id: "student",
          label: null,
          items: [
            { id: "student-dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
            {
              id: "assigned-quizzes",
              label: t("nav.assignments", "Assignments"),
              icon: ClipboardList,
              badge: pendingAssignmentCount > 0 ? pendingAssignmentCount : null,
            },
            { id: "student-results", label: t("nav.results", "Results"), icon: Trophy },
          ],
        },
      ];
    }

    if (userRole === "superadmin") {
      return [
        {
          id: "admin",
          label: null,
          items: [
            { id: "superadmin-dashboard", label: t("nav.dashboard"), icon: Shield },
          ],
        },
      ];
    }

    return [];
  };

  const navSections = getNavSections();

  const handleNavClick = (itemId) => {
    setView(itemId);
    setMobileMenuOpen(false);
  };

  const handleInstallClick = async () => {
    setMobileMenuOpen(false);
    if (pwaInstall.canNativeInstall) {
      const outcome = await pwaInstall.triggerNativeInstall();
      if (outcome === "accepted") {
        toast.success(t("pwa.installedToast"));
        return;
      }
      if (outcome === "unavailable") {
        setShowInstallGuide(true);
      }
      return;
    }
    setShowInstallGuide(true);
  };

  const userInitial =
    user?.name?.charAt(0)?.toUpperCase() ||
    user?.email?.charAt(0)?.toUpperCase() ||
    "U";

  const renderSidebarBody = (isMobile = false) => (
    <div className="flex h-full flex-col bg-brand-700 text-white">
      {/* Brand header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
        <div className="flex items-center gap-2.5 min-w-0">
          {!logoError ? (
            <img
              src="/brand/logo.svg"
              alt="QuizMaster"
              className="h-10 w-auto max-w-full"
              onError={() => setLogoError(true)}
            />
          ) : (
            <span className="text-lg font-bold tracking-tight text-white">QuizMaster</span>
          )}
        </div>
        {isMobile && (
          <button
            ref={closeDrawerRef}
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              hamburgerRef.current?.focus();
            }}
            className="rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label={t("nav.closeMenu", "Close menu")}
          >
            <X size={20} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Teacher primary CTA */}
      {userRole === "teacher" && (
        <div className="px-4 pt-4 pb-1">
          <button
            type="button"
            onClick={() => handleNavClick("create-quiz")}
            aria-current={currentView === "create-quiz" ? "page" : undefined}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-surface px-4 py-2.5 text-sm font-semibold text-brand-800 shadow-sm transition-colors duration-150 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <Plus size={18} aria-hidden="true" />
            <span>{t("nav.newQuiz", "New quiz")}</span>
          </button>
        </div>
      )}

      {/* Navigation Sections */}
      <nav aria-label="Primary navigation" className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {navSections.map((section) => (
          <div key={section.id}>
            {section.label && (
              <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-white/60">
                {section.label}
              </p>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const IconComponent = item.icon;
                const isActive = currentView === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => handleNavClick(item.id)}
                      aria-current={isActive ? "page" : undefined}
                      className={`relative flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                        isActive
                          ? "bg-white/15 font-semibold text-white"
                          : "text-white/80 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {isActive && (
                        <span
                          aria-hidden="true"
                          className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r bg-white"
                        />
                      )}
                      <span className="flex items-center gap-3 min-w-0">
                        <IconComponent
                          size={18}
                          className={isActive ? "text-white shrink-0" : "text-white/75 shrink-0"}
                          aria-hidden="true"
                        />
                        <span className="truncate">{item.label}</span>
                      </span>
                      {item.badge && (
                        <span className="rounded-full bg-warning-500 px-2 py-0.5 text-xs font-bold text-ink">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom Compact Account & Language Footer */}
      <div className="border-t border-white/10 p-3 space-y-2.5">
        <div className="flex items-center gap-2.5 px-1">
          {user?.avatar_url && !avatarError ? (
            <img
              src={user.avatar_url}
              alt={user.name || "User avatar"}
              className="h-9 w-9 rounded-full border border-white/25 object-cover shrink-0"
              onError={() => setFailedAvatarUrl(user.avatar_url || null)}
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold text-white">
              {userInitial}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{user?.name || "User"}</p>
            <p className="truncate text-xs text-white/70">{user?.email}</p>
          </div>
        </div>

        <LanguageSwitcher compact={true} />

        {pwaInstall.canShowInstallAction && (
          <button
            type="button"
            onClick={handleInstallClick}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs font-medium text-white transition-colors duration-150 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <Smartphone size={15} aria-hidden="true" />
            <span className="truncate">{t("pwa.navAction")}</span>
          </button>
        )}

        <div className="grid grid-cols-2 gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => handleNavClick("settings")}
            aria-current={currentView === "settings" ? "page" : undefined}
            className={`flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
              currentView === "settings"
                ? "bg-white/15 text-white font-semibold"
                : "text-white/80 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Settings size={15} aria-hidden="true" />
            <span className="truncate">{t("nav.settings")}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              setShowLogoutModal(true);
            }}
            className="flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-white/80 transition-colors duration-150 hover:bg-danger-600/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <LogOut size={15} aria-hidden="true" />
            <span className="truncate">{t("nav.logout")}</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:z-40 md:flex md:w-64 md:flex-col shadow-card">
        {renderSidebarBody(false)}
      </aside>

      {/* Mobile Top Bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 flex h-14 items-center justify-between border-b border-white/10 bg-brand-700 px-4 text-white shadow-sm">
        <div className="flex items-center gap-2.5 min-w-0">
          {!logoError ? (
            <img
              src="/brand/logo.svg"
              alt="QuizMaster"
              className="h-8 w-auto"
              onError={() => setLogoError(true)}
            />
          ) : (
            <span className="text-base font-bold tracking-tight">QuizMaster</span>
          )}
        </div>
        <button
          ref={hamburgerRef}
          type="button"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-nav-drawer"
          aria-label={mobileMenuOpen ? t("nav.closeMenu", "Close menu") : t("nav.openMenu", "Open menu")}
          className="rounded-lg p-2 text-white/90 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          {mobileMenuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
        </button>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/50 animate-fadeIn"
            onClick={() => {
              setMobileMenuOpen(false);
              hamburgerRef.current?.focus();
            }}
            aria-hidden="true"
          />
          <div
            id="mobile-nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="relative z-10 h-full w-64 shadow-pop"
          >
            {renderSidebarBody(true)}
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showLogoutModal}
        title={t("nav.logout")}
        message={t("common.confirm")}
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutModal(false)}
        confirmText={t("nav.logout")}
        confirmStyle="danger"
      />

      <InstallGuideDialog
        open={showInstallGuide}
        onClose={() => setShowInstallGuide(false)}
        platform={pwaInstall.platform}
        isInAppBrowser={pwaInstall.isInAppBrowser}
      />
    </>
  );
}
