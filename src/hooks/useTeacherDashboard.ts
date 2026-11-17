import { useCallback, useEffect, useState } from "react";
import { fetchTeacherDashboardSummary } from "../infrastructure/dashboardRepository";
import type { TeacherDashboardSummary } from "../schemas/dashboard";

export function useTeacherDashboard(teacherId: string | undefined) {
  const [data, setData] = useState<TeacherDashboardSummary | null>(null);
  const [loadedTeacherId, setLoadedTeacherId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!teacherId) {
      return;
    }

    try {
      setError(null);
      const summary = await fetchTeacherDashboardSummary(teacherId);
      setData(summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard summary");
    } finally {
      setLoadedTeacherId(teacherId);
    }
  }, [teacherId]);

  useEffect(() => {
    if (!teacherId) return;
    let active = true;
    const timer = window.setTimeout(() => {
      if (active) void load();
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [teacherId, load]);

  useEffect(() => {
    if (!teacherId) return;
    const onFocus = () => {
      void load();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [teacherId, load]);

  const loading = Boolean(teacherId && loadedTeacherId !== teacherId);

  return { data, loading, error, refetch: load };
}
