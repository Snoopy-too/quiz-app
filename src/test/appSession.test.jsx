import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import "../i18n";
import App from "../App";
import * as supabaseClient from "../supabaseClient";

// Mock Supabase client
vi.mock("../supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signOut: vi.fn(),
    },
    rpc: vi.fn(() => Promise.resolve({ data: 0, error: null })),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(),
        })),
        insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn() })) })),
      })),
      update: vi.fn(() => ({ eq: vi.fn() })),
    })),
  },
}));

// Mock child route components to isolate router & session bootstrapping
vi.mock("../components/auth/Login", () => ({ default: () => <div data-testid="login-view">Login</div> }));
vi.mock("../components/dashboards/StudentDashboard", () => ({ default: () => <div data-testid="student-dashboard">Student Dashboard</div> }));
vi.mock("../components/dashboards/TeacherDashboard", () => ({ default: () => <div data-testid="teacher-dashboard">Teacher Dashboard</div> }));
vi.mock("../components/dashboards/SuperAdminDashboard", () => ({ default: () => <div data-testid="superadmin-dashboard">SuperAdmin Dashboard</div> }));
vi.mock("../components/quizzes/TeacherControl", () => ({ default: () => <div data-testid="teacher-control">Teacher Control</div> }));
vi.mock("../components/students/StudentQuiz", () => ({ default: () => <div data-testid="student-quiz">Student Quiz</div> }));

describe("App Session Bootstrapping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    window.history.replaceState({}, "", "/");
  });

  it("should route to teacher dashboard if role is teacher", async () => {
    supabaseClient.supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "teacher-123", app_metadata: {} } } },
      error: null,
    });

    const mockProfile = {
      id: "teacher-123",
      role: "teacher",
      email: "t@test.com",
      approved: true,
      verified: true,
    };
    supabaseClient.supabase.from.mockImplementation((table) => {
      if (table === "users") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
        };
      }
      return { select: vi.fn() };
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("teacher-dashboard")).toBeInTheDocument();
    });
  });

  it("should route to student dashboard if role is student", async () => {
    supabaseClient.supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "student-123", app_metadata: {} } } },
      error: null,
    });

    const mockProfile = {
      id: "student-123",
      role: "student",
      email: "s@test.com",
      approved: true,
      verified: true,
    };
    supabaseClient.supabase.from.mockImplementation((table) => {
      if (table === "users") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
        };
      }
      return { select: vi.fn() };
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("student-dashboard")).toBeInTheDocument();
    });
  });

  it("should preserve /teacher/host/:sessionId URL route on reload instead of redirecting to dashboard", async () => {
    window.history.replaceState({}, "", "/teacher/host/session-789");

    supabaseClient.supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "teacher-123", app_metadata: {} } } },
      error: null,
    });

    const mockProfile = {
      id: "teacher-123",
      role: "teacher",
      email: "t@test.com",
      approved: true,
      verified: true,
    };
    supabaseClient.supabase.from.mockImplementation((table) => {
      if (table === "users") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
        };
      }
      return { select: vi.fn() };
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("teacher-control")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("teacher-dashboard")).not.toBeInTheDocument();
  });

  it("should preserve /play/:sessionId URL route on reload for students", async () => {
    window.history.replaceState({}, "", "/play/session-456");

    supabaseClient.supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "student-123", app_metadata: {} } } },
      error: null,
    });

    const mockProfile = {
      id: "student-123",
      role: "student",
      email: "s@test.com",
      approved: true,
      verified: true,
    };
    supabaseClient.supabase.from.mockImplementation((table) => {
      if (table === "users") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
        };
      }
      return { select: vi.fn() };
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("student-quiz")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("student-dashboard")).not.toBeInTheDocument();
  });
});
