import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { resolveLandingPath, sanitizeNextPath } from "../domain/auth";
import { Spinner } from "../components/ui";
import { useAppAuth } from "./authContext";

function AuthLoadingScreen() {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center">
      <Spinner size="lg" label="Loading session" />
    </div>
  );
}

export function RequireGuest({ children }: { children: ReactNode }) {
  const { appState, authReady } = useAppAuth();
  const location = useLocation();

  if (!authReady) {
    return <AuthLoadingScreen />;
  }

  const user = appState.currentUser;
  if (user) {
    if (!user.role) {
      return <Navigate to="/complete-profile" replace />;
    }
    const next = sanitizeNextPath(new URLSearchParams(location.search).get("next"));
    return <Navigate to={next || resolveLandingPath(user)} replace />;
  }

  return <>{children}</>;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { appState, authReady } = useAppAuth();
  const location = useLocation();

  if (!authReady) {
    return <AuthLoadingScreen />;
  }

  const user = appState.currentUser;
  if (!user) {
    const target = `${location.pathname}${location.search}`;
    const nextQuery = target && target !== "/" && target !== "/login"
      ? `?next=${encodeURIComponent(target)}`
      : "";
    return <Navigate to={`/login${nextQuery}`} replace />;
  }

  if (!user.role && location.pathname !== "/complete-profile") {
    return <Navigate to="/complete-profile" replace />;
  }

  return <>{children}</>;
}

export function RequireRole({
  roles,
  children,
}: {
  roles: string[];
  children: ReactNode;
}) {
  const { appState, authReady } = useAppAuth();
  const location = useLocation();

  if (!authReady) {
    return <AuthLoadingScreen />;
  }

  const user = appState.currentUser;
  if (!user) {
    const target = `${location.pathname}${location.search}`;
    const nextQuery = target && target !== "/" && target !== "/login"
      ? `?next=${encodeURIComponent(target)}`
      : "";
    return <Navigate to={`/login${nextQuery}`} replace />;
  }

  if (!user.role) {
    return <Navigate to="/complete-profile" replace />;
  }

  if (!roles.includes(user.role)) {
    return <Navigate to={resolveLandingPath(user)} replace />;
  }

  return <>{children}</>;
}
