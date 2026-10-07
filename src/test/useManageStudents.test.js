import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import useManageStudents from "../hooks/useManageStudents";
import * as supabaseClient from "../supabaseClient";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, params) => key + (params ? JSON.stringify(params) : ""),
  }),
}));

vi.mock("../supabaseClient", () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn((cb) => {
        if (cb) cb("SUBSCRIBED");
        return { unsubscribe: vi.fn() };
      }),
      unsubscribe: vi.fn(),
    })),
    from: vi.fn(),
  },
}));

describe("useManageStudents", () => {
  const currentTeacher = {
    id: "teacher-school-b",
    role: "teacher",
    name: "Teacher B",
    school_id: "school-b-uuid",
  };

  const mockStudents = [
    {
      id: "student-1",
      name: "Student From School A (Accidentally Registered)",
      email: "student1@test.com",
      role: "student",
      teacher_id: null,
      school_id: "school-a-uuid", // Different school!
      schools: { id: "school-a-uuid", name: "School A" },
      approved: true,
      verified: true,
      created_at: new Date().toISOString(),
    },
    {
      id: "student-2",
      name: "Student From School B (Unlinked)",
      email: "student2@test.com",
      role: "student",
      teacher_id: null,
      school_id: "school-b-uuid", // Same school
      schools: { id: "school-b-uuid", name: "School B" },
      approved: true,
      verified: true,
      created_at: new Date().toISOString(),
    },
    {
      id: "student-3",
      name: "Already Linked Student",
      email: "student3@test.com",
      role: "student",
      teacher_id: "teacher-school-b",
      school_id: "school-b-uuid",
      schools: { id: "school-b-uuid", name: "School B" },
      approved: true,
      verified: true,
      created_at: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports a function", () => {
    expect(typeof useManageStudents).toBe("function");
  });

  it("includes unlinked students from ALL schools when filterStatus is 'unlinked'", async () => {
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockOr = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockResolvedValue({ data: mockStudents, error: null });

    supabaseClient.supabase.from.mockImplementation((table) => {
      if (table === "users") {
        return {
          select: mockSelect,
          eq: mockEq,
          or: mockOr,
          order: mockOrder,
        };
      }
      if (table === "session_participants") {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
      return {};
    });

    const { result } = renderHook(() =>
      useManageStudents({ currentUser: currentTeacher })
    );

    // Wait for initial fetch
    await act(async () => {
      await result.current.fetchStudents();
    });

    // Switch to 'unlinked' filter
    act(() => {
      result.current.setFilterStatus("unlinked");
    });

    // Both student-1 (School A) and student-2 (School B) should be visible!
    const unlinkedIds = result.current.filteredStudents.map((s) => s.id);
    expect(unlinkedIds).toContain("student-1");
    expect(unlinkedIds).toContain("student-2");
    expect(unlinkedIds).not.toContain("student-3");

    // unlinkedStudents list/count should also include all unlinked students
    expect(result.current.unlinkedStudents).toHaveLength(2);
  });

  it("updates teacher_id AND moves student to teacher's school_id when handleLink is confirmed", async () => {
    const mockUpdate = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockResolvedValue({ data: null, error: null });

    supabaseClient.supabase.from.mockImplementation((table) => {
      if (table === "users") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: mockEq,
          or: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: mockStudents, error: null }),
          update: mockUpdate,
        };
      }
      if (table === "session_participants") {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
      return {};
    });

    const { result } = renderHook(() =>
      useManageStudents({ currentUser: currentTeacher })
    );

    await act(async () => {
      await result.current.fetchStudents();
    });

    // Call handleLink for student-1 (who was in School A)
    act(() => {
      result.current.handleLink(mockStudents[0]);
    });

    // Confirm modal should be open with an onConfirm callback
    expect(result.current.confirmModal.isOpen).toBe(true);
    expect(typeof result.current.confirmModal.onConfirm).toBe("function");

    // Execute the onConfirm callback
    await act(async () => {
      await result.current.confirmModal.onConfirm();
    });

    // Supabase update must have been called with teacher_id AND the teacher's school_id
    expect(mockUpdate).toHaveBeenCalledWith({
      teacher_id: "teacher-school-b",
      school_id: "school-b-uuid",
    });
    expect(mockEq).toHaveBeenCalledWith("id", "student-1");
  });
});
