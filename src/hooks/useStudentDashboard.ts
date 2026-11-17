import { useCallback, useEffect, useState } from "react";
import { fetchStudentDashboardSummary } from "../infrastructure/dashboardRepository";
import type { StudentDashboardSummary } from "../schemas/dashboard";

export function useStudentDashboard(studentId: string | undefined, enabled = true) {
  const activeKey = studentId && enabled ? studentId : null;
  const [data, setData] = useState<StudentDashboardSummary | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!studentId || !enabled) {
      return;
    }

    try {
      setError(null);
      const summary = await fetchStudentDashboardSummary(studentId);
      setData(summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load student dashboard");
    } finally {
      setLoadedKey(studentId);
    }
  }, [studentId, enabled]);

  useEffect(() => {
    if (!activeKey) return;
    let active = true;
    const timer = window.setTimeout(() => {
      if (active) void load();
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [activeKey, load]);

  useEffect(() => {
    if (!studentId || !enabled) return;
    const onFocus = () => {
      void load();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [studentId, enabled, load]);

  const dismissActiveSession = useCallback(() => {
    setData((prev) => (prev ? { ...prev, activeSession: null } : prev));
  }, []);

  const loading = Boolean(activeKey && loadedKey !== activeKey);

  return { data, loading, error, refetch: load, dismissActiveSession };
}
