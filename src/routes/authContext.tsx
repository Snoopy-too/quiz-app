import { createContext, useContext, type Dispatch, type SetStateAction } from "react";
import type { AuthProfile } from "../domain/auth";

export interface AppStateShape {
  users: unknown[];
  quizzes: unknown[];
  categories: unknown[];
  currentUser: AuthProfile | null;
  pendingVerifications: unknown[];
  activeSessions: unknown[];
}

export interface AppAuthContextValue {
  appState: AppStateShape;
  setAppState: Dispatch<SetStateAction<AppStateShape>>;
  authReady: boolean;
  error: string | null;
  setError: (msg: string | null) => void;
  success: string | null;
  setSuccess: (msg: string | null) => void;
  formData: Record<string, unknown>;
  setFormData: Dispatch<SetStateAction<Record<string, unknown>>>;
  selectedTeacherId: string | null;
  setSelectedTeacherId: Dispatch<SetStateAction<string | null>>;
  refreshProfile: () => Promise<AuthProfile | null>;
}

const AppAuthContext = createContext<AppAuthContextValue | null>(null);

export const AppAuthProvider = AppAuthContext.Provider;

export function useAppAuth(): AppAuthContextValue {
  const ctx = useContext(AppAuthContext);
  if (!ctx) {
    throw new Error("useAppAuth must be used inside AppAuthProvider");
  }
  return ctx;
}
