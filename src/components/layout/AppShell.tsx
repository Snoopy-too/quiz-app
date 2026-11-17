import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { LegacyNavData } from "../../routes/legacyNavigation";
import VerticalNav from "./VerticalNav";

export interface AppShellProps {
  currentView: string;
  setView: (view: string, data?: LegacyNavData) => void;
  appState: unknown;
  pendingAssignmentCount?: number;
  children: ReactNode;
}

/** Authenticated workspace frame providing skip link, unified sidebar/drawer nav, and #main landmark. */
export function AppShell({
  currentView,
  setView,
  appState,
  pendingAssignmentCount = 0,
  children,
}: AppShellProps) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen bg-canvas text-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[10060] focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-ink focus:shadow-pop focus:ring-2 focus:ring-accent-500"
      >
        {t("nav.skipToContent", "Skip to main content")}
      </a>

      <VerticalNav
        currentView={currentView}
        setView={setView}
        appState={appState}
        pendingAssignmentCount={pendingAssignmentCount}
      />

      <main
        id="main"
        tabIndex={-1}
        className="flex-1 min-w-0 md:ml-64 pt-14 md:pt-0 min-h-screen bg-canvas focus:outline-none"
      >
        {children}
      </main>
    </div>
  );
}

export default AppShell;
