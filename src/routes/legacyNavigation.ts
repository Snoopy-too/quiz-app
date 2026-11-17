import { useCallback } from "react";
import { useNavigate } from "react-router";

export interface StudentReportNavPayload {
  studentId?: string;
  attemptId?: string;
  attemptType?: string;
}

export type LegacyNavData = string | StudentReportNavPayload | undefined;

export function viewToPath(view: string, data?: LegacyNavData): string {
  switch (view) {
    case "login":
      return "/login";
    case "register":
      return "/register";
    case "registration-success":
      return "/register/success";
    case "verify":
      return "/verify";
    case "forgot-password":
      return "/forgot-password";
    case "reset-password":
      return "/reset-password";
    case "complete-profile":
      return "/complete-profile";
    case "student-dashboard":
      return "/student";
    case "student-quiz":
      return typeof data === "string" && data ? `/play/${encodeURIComponent(data)}` : "/student";
    case "assigned-quizzes":
      return "/student/assignments";
    case "assigned-quiz-taking":
      return typeof data === "string" && data
        ? `/student/assignments/${encodeURIComponent(data)}`
        : "/student/assignments";
    case "student-results":
      return "/student/results";
    case "create-team":
      return "/student/team";
    case "teacher-dashboard":
      return "/teacher";
    case "manage-quizzes":
      return "/teacher/quizzes";
    case "create-quiz":
      return "/teacher/quizzes/new";
    case "edit-quiz":
      return typeof data === "string" && data
        ? `/teacher/quizzes/${encodeURIComponent(data)}/edit`
        : "/teacher/quizzes";
    case "preview-quiz":
      return typeof data === "string" && data
        ? `/teacher/quizzes/${encodeURIComponent(data)}/preview`
        : "/teacher/quizzes";
    case "teacher-control":
      return typeof data === "string" && data
        ? `/teacher/host/${encodeURIComponent(data)}`
        : "/teacher/quizzes";
    case "manage-students":
      return "/teacher/students";
    case "reports":
      return typeof data === "string" && data
        ? `/teacher/reports?quizId=${encodeURIComponent(data)}`
        : "/teacher/reports";
    case "student-report": {
      if (data && typeof data === "object" && data.studentId) {
        const params = new URLSearchParams();
        if (data.attemptId) params.set("attemptId", data.attemptId);
        if (data.attemptType) params.set("attemptType", data.attemptType);
        const query = params.toString();
        return `/teacher/reports/students/${encodeURIComponent(data.studentId)}${query ? `?${query}` : ""}`;
      }
      return "/teacher/reports";
    }
    case "public-quizzes":
      return "/teacher/library/school";
    case "global-quizzes":
      return "/teacher/library/community";
    case "superadmin-dashboard":
      return "/admin";
    case "settings":
      return "/settings";
    default:
      throw new Error(`Unmapped legacy view: ${view}`);
  }
}

export function pathToView(pathname: string): string {
  if (pathname === "/student") return "student-dashboard";
  if (pathname.startsWith("/join")) return "student-dashboard";
  if (pathname.startsWith("/play/")) return "student-quiz";
  if (pathname === "/student/assignments") return "assigned-quizzes";
  if (pathname.startsWith("/student/assignments/")) return "assigned-quiz-taking";
  if (pathname === "/student/results") return "student-results";
  if (pathname === "/student/team") return "create-team";
  if (pathname === "/teacher") return "teacher-dashboard";
  if (pathname === "/teacher/quizzes") return "manage-quizzes";
  if (pathname === "/teacher/quizzes/new") return "create-quiz";
  if (/^\/teacher\/quizzes\/[^/]+\/edit/.test(pathname)) return "edit-quiz";
  if (/^\/teacher\/quizzes\/[^/]+\/preview/.test(pathname)) return "preview-quiz";
  if (pathname.startsWith("/teacher/host/")) return "teacher-control";
  if (pathname === "/teacher/students") return "manage-students";
  if (pathname === "/teacher/reports/students/" || /^\/teacher\/reports\/students\/[^/]+/.test(pathname)) {
    return "student-report";
  }
  if (pathname === "/teacher/reports") return "reports";
  if (pathname === "/teacher/library/school") return "public-quizzes";
  if (pathname === "/teacher/library/community") return "global-quizzes";
  if (pathname.startsWith("/admin")) return "superadmin-dashboard";
  if (pathname === "/settings") return "settings";
  if (pathname === "/complete-profile") return "complete-profile";
  if (pathname === "/register/success") return "registration-success";
  if (pathname === "/register") return "register";
  if (pathname === "/verify") return "verify";
  if (pathname === "/forgot-password") return "forgot-password";
  if (pathname === "/reset-password") return "reset-password";
  return "login";
}

/**
 * Migration shim that translates legacy setView(view, data) calls to router navigation.
 */
export function useLegacySetView() {
  const navigate = useNavigate();
  return useCallback(
    (view: string, data?: LegacyNavData) => {
      navigate(viewToPath(view, data));
    },
    [navigate],
  );
}
