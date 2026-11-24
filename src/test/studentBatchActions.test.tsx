import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import i18n from "../i18n";
import {
  chunkIds,
  getLinkableStudentIds,
  getSelectableStudentIds,
  getSelectionState,
  getUnlinkableStudentIds,
  pruneSelectedIds,
  toggleSelectAllVisible,
  toggleStudentRangeSelection,
  toggleStudentSelection,
} from "../domain/studentSelection";
import {
  batchLinkStudentsSchema,
  batchUnlinkStudentsSchema,
} from "../schemas/studentManagement";

const TEACHER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_TEACHER_ID = "22222222-2222-4222-8222-222222222222";
const SCHOOL_ID = "33333333-3333-4333-8333-333333333333";
const OTHER_SCHOOL_ID = "44444444-4444-4444-8444-444444444444";

const S1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const S2 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2";
const S3 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3";
const S4 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4";
const S5 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb5";

interface MockStudentRow {
  id: string;
  name: string;
  email: string;
  student_id: string;
  role: string;
  teacher_id: string | null;
  school_id: string | null;
  approved: boolean;
  verified: boolean;
  created_at: string;
}

const mockState: {
  students: MockStudentRow[];
  updateCalls: Array<{
    payload: Record<string, unknown>;
    filters: Array<{ op: string; args: unknown[] }>;
  }>;
  nextUpdateError: { message: string; code?: string } | null;
} = {
  students: [],
  updateCalls: [],
  nextUpdateError: null,
};

function makeInitialStudents(): MockStudentRow[] {
  return [
    {
      id: S1,
      name: "Alice Tanaka",
      email: "alice@school.edu",
      student_id: "12501",
      role: "student",
      teacher_id: TEACHER_ID,
      school_id: SCHOOL_ID,
      approved: true,
      verified: true,
      created_at: "2026-05-20T00:00:00Z",
    },
    {
      id: S2,
      name: "Bob Sato",
      email: "bob@school.edu",
      student_id: "12502",
      role: "student",
      teacher_id: TEACHER_ID,
      school_id: SCHOOL_ID,
      approved: true,
      verified: true,
      created_at: "2026-05-20T00:00:00Z",
    },
    {
      id: S3,
      name: "Carol Suzuki",
      email: "carol@school.edu",
      student_id: "12503",
      role: "student",
      teacher_id: TEACHER_ID,
      school_id: SCHOOL_ID,
      approved: true,
      verified: true,
      created_at: "2026-05-20T00:00:00Z",
    },
    {
      id: S4,
      name: "Kenji Ito",
      email: "kenji@school.edu",
      student_id: "12601",
      role: "student",
      teacher_id: null,
      school_id: SCHOOL_ID,
      approved: true,
      verified: true,
      created_at: "2026-05-20T00:00:00Z",
    },
    {
      id: S5,
      name: "Yuki Mori",
      email: "yuki@school.edu",
      student_id: "12602",
      role: "student",
      teacher_id: null,
      school_id: SCHOOL_ID,
      approved: true,
      verified: true,
      created_at: "2026-05-20T00:00:00Z",
    },
  ];
}

vi.mock("../supabaseClient", () => ({
  supabase: {
    channel: vi.fn(() => {
      const ch = {
        on: vi.fn(() => ch),
        subscribe: vi.fn(() => ch),
        unsubscribe: vi.fn(),
      };
      return ch;
    }),
    from: vi.fn((table: string) => {
      if (table === "session_participants") {
        const chain = {
          select: vi.fn(() => chain),
          in: vi.fn(() => Promise.resolve({ data: [], error: null })),
        };
        return chain;
      }

      return {
        select: vi.fn(() => {
          const chain = {
            eq: vi.fn(() => chain),
            or: vi.fn(() => chain),
            order: vi.fn(() =>
              Promise.resolve({ data: [...mockState.students], error: null }),
            ),
          };
          return chain;
        }),
        update: vi.fn((payload: Record<string, unknown>) => {
          const filters: Array<{ op: string; args: unknown[] }> = [];
          const runUpdate = () => {
            mockState.updateCalls.push({ payload, filters: [...filters] });
            if (mockState.nextUpdateError) {
              const err = mockState.nextUpdateError;
              mockState.nextUpdateError = null;
              return Promise.resolve({ error: err });
            }
            const inFilter = filters.find((f) => f.op === "in" && f.args[0] === "id");
            const eqIdFilter = filters.find((f) => f.op === "eq" && f.args[0] === "id");
            const targetIds = new Set<string>(
              inFilter
                ? (inFilter.args[1] as string[])
                : eqIdFilter
                  ? [eqIdFilter.args[1] as string]
                  : [],
            );
            mockState.students = mockState.students.map((row) =>
              targetIds.has(row.id) ? { ...row, ...payload } : row,
            );
            return Promise.resolve({ error: null });
          };

          const chain: Record<string, unknown> = {
            in: vi.fn((col: string, vals: unknown[]) => {
              filters.push({ op: "in", args: [col, vals] });
              return chain;
            }),
            eq: vi.fn((col: string, val: unknown) => {
              filters.push({ op: "eq", args: [col, val] });
              return chain;
            }),
            is: vi.fn((col: string, val: unknown) => {
              filters.push({ op: "is", args: [col, val] });
              return chain;
            }),
            then: (
              resolve: (value: { error: unknown }) => void,
              reject?: (reason?: unknown) => void,
            ) => runUpdate().then(resolve, reject),
          };
          return chain;
        }),
      };
    }),
  },
}));

import {
  linkStudentsBatch,
  unlinkStudentsBatch,
} from "../infrastructure/studentRepository";
import ManageStudents from "../components/teachers/ManageStudents";

describe("studentSelection domain helpers", () => {
  const sample = [
    { id: S1, teacher_id: TEACHER_ID, school_id: SCHOOL_ID },
    { id: S2, teacher_id: OTHER_TEACHER_ID, school_id: SCHOOL_ID },
    { id: S4, teacher_id: null, school_id: SCHOOL_ID },
    { id: S5, teacher_id: null, school_id: OTHER_SCHOOL_ID },
  ];

  it("filters unlinkable and linkable students strictly by teacher and school", () => {
    expect(getUnlinkableStudentIds(sample, TEACHER_ID)).toEqual([S1]);
    expect(getLinkableStudentIds(sample, SCHOOL_ID)).toEqual([S4]);
    expect(getSelectableStudentIds(sample, "my_students", TEACHER_ID, SCHOOL_ID)).toEqual([S1]);
    expect(getSelectableStudentIds(sample, "unlinked", TEACHER_ID, SCHOOL_ID)).toEqual([S4]);
  });

  it("toggles single selection, select-all visible, and Shift+click ranges", () => {
    const ordered = [S1, S2, S3];
    let selected = toggleStudentSelection(new Set(), S1);
    expect(Array.from(selected)).toEqual([S1]);

    selected = toggleStudentRangeSelection(selected, ordered, S1, S3);
    expect(Array.from(selected)).toEqual([S1, S2, S3]);

    expect(getSelectionState(selected, ordered)).toEqual({
      allVisibleSelected: true,
      someVisibleSelected: false,
      visibleSelectedCount: 3,
      totalSelectedCount: 3,
    });

    // Deselect visible while preserving an off-filter selected ID
    const withHidden = new Set([S1, S2, S3, S4]);
    const afterDeselectVisible = toggleSelectAllVisible(withHidden, ordered);
    expect(Array.from(afterDeselectVisible)).toEqual([S4]);

    // Prune drops invalid IDs
    expect(Array.from(pruneSelectedIds(withHidden, new Set([S2, S3])))).toEqual([S2, S3]);
  });

  it("deduplicates and chunks IDs safely", () => {
    expect(chunkIds([S1, S2, S1, S3], 2)).toEqual([[S1, S2], [S3]]);
    expect(() => chunkIds([S1], 0)).toThrow(RangeError);
  });
});

describe("studentManagement Zod schemas", () => {
  it("validates batch unlink and batch link payloads", () => {
    expect(
      batchUnlinkStudentsSchema.safeParse({ teacherId: TEACHER_ID, studentIds: [S1, S2] }).success,
    ).toBe(true);
    expect(
      batchUnlinkStudentsSchema.safeParse({ teacherId: TEACHER_ID, studentIds: [] }).success,
    ).toBe(false);
    expect(
      batchLinkStudentsSchema.safeParse({
        teacherId: TEACHER_ID,
        schoolId: SCHOOL_ID,
        studentIds: [S4],
      }).success,
    ).toBe(true);
    expect(
      batchLinkStudentsSchema.safeParse({
        teacherId: "not-a-uuid",
        studentIds: [S4],
      }).success,
    ).toBe(false);
  });
});

describe("studentRepository batch operations", () => {
  beforeEach(() => {
    mockState.students = makeInitialStudents();
    mockState.updateCalls = [];
    mockState.nextUpdateError = null;
  });

  it("chunks batch unlink queries and scopes them to teacher_id and role=student", async () => {
    const result = await unlinkStudentsBatch(
      { teacherId: TEACHER_ID, studentIds: [S1, S2, S3, S1] },
      2,
    );

    expect(result).toEqual({ unlinkedCount: 3 });
    expect(mockState.updateCalls).toHaveLength(2);
    expect(mockState.updateCalls[0]).toEqual({
      payload: { teacher_id: null },
      filters: [
        { op: "in", args: ["id", [S1, S2]] },
        { op: "eq", args: ["teacher_id", TEACHER_ID] },
        { op: "eq", args: ["role", "student"] },
      ],
    });
    expect(mockState.updateCalls[1].filters[0]).toEqual({ op: "in", args: ["id", [S3]] });
  });

  it("chunks batch link queries and scopes them to teacher_id IS NULL, role=student, and school_id", async () => {
    const result = await linkStudentsBatch(
      { teacherId: TEACHER_ID, schoolId: SCHOOL_ID, studentIds: [S4, S5] },
      1,
    );

    expect(result).toEqual({ linkedCount: 2 });
    expect(mockState.updateCalls).toHaveLength(2);
    expect(mockState.updateCalls[0]).toEqual({
      payload: { teacher_id: TEACHER_ID },
      filters: [
        { op: "in", args: ["id", [S4]] },
        { op: "is", args: ["teacher_id", null] },
        { op: "eq", args: ["role", "student"] },
        { op: "eq", args: ["school_id", SCHOOL_ID] },
      ],
    });
  });
});

describe("ManageStudents batch unlink and batch link UI", () => {
  const appState = {
    currentUser: {
      id: TEACHER_ID,
      school_id: SCHOOL_ID,
      name: "Teacher One",
      email: "teacher@school.edu",
      role: "teacher",
    },
  };

  beforeEach(async () => {
    await i18n.changeLanguage("en");
    mockState.students = makeInitialStudents();
    mockState.updateCalls = [];
    mockState.nextUpdateError = null;
  });

  it("selects multiple linked students and unlinks them in one batch", async () => {
    render(<ManageStudents setView={vi.fn()} appState={appState} />);

    await waitFor(() => {
      expect(screen.getByText("Alice Tanaka")).toBeInTheDocument();
    });

    const aliceCheckbox = screen.getByLabelText("Select Alice Tanaka") as HTMLInputElement;
    const bobCheckbox = screen.getByLabelText("Select Bob Sato") as HTMLInputElement;
    const selectAllCheckbox = screen.getByLabelText("Select all visible students") as HTMLInputElement;

    fireEvent.click(aliceCheckbox);
    expect(selectAllCheckbox.indeterminate).toBe(true);

    fireEvent.click(bobCheckbox);
    expect(screen.getByText("2 students selected")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Unlink Selected \(2\)/i }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Unlink Selected Students")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Unlink" }));

    await waitFor(() => {
      expect(screen.getByText("2 students unlinked from your class successfully.")).toBeInTheDocument();
    });

    expect(mockState.updateCalls).toHaveLength(1);
    expect(mockState.updateCalls[0].payload).toEqual({ teacher_id: null });
    expect(mockState.updateCalls[0].filters[0]).toEqual({ op: "in", args: ["id", [S1, S2]] });

    // Only Carol should remain in My Students
    expect(screen.queryByText("Alice Tanaka")).not.toBeInTheDocument();
    expect(screen.queryByText("Bob Sato")).not.toBeInTheDocument();
    expect(screen.getByText("Carol Suzuki")).toBeInTheDocument();
  });

  it("supports Shift+click range selection and clears selection when switching tabs", async () => {
    render(<ManageStudents setView={vi.fn()} appState={appState} />);

    await waitFor(() => {
      expect(screen.getByText("Alice Tanaka")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText("Select Alice Tanaka"));
    fireEvent.click(screen.getByLabelText("Select Carol Suzuki"), { shiftKey: true });

    expect(screen.getByText("3 students selected")).toBeInTheDocument();

    // Switching to Unlinked tab clears previous selection
    fireEvent.click(screen.getByRole("button", { name: "Unlinked" }));

    await waitFor(() => {
      expect(screen.getByText("Kenji Ito")).toBeInTheDocument();
    });
    expect(screen.queryByText("3 students selected")).not.toBeInTheDocument();
  });

  it("selects all unlinked students and links them in one batch", async () => {
    render(<ManageStudents setView={vi.fn()} appState={appState} />);

    await waitFor(() => {
      expect(screen.getByText("Alice Tanaka")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Unlinked" }));

    await waitFor(() => {
      expect(screen.getByText("Kenji Ito")).toBeInTheDocument();
      expect(screen.getByText("Yuki Mori")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText("Select all visible students"));
    expect(screen.getByText("2 students selected")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Link Selected \(2\)/i }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Link Selected Students")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Link" }));

    await waitFor(() => {
      expect(screen.getByText("2 students linked to your class successfully!")).toBeInTheDocument();
    });

    expect(mockState.updateCalls).toHaveLength(1);
    expect(mockState.updateCalls[0].payload).toEqual({ teacher_id: TEACHER_ID });
    expect(mockState.updateCalls[0].filters).toEqual([
      { op: "in", args: ["id", [S4, S5]] },
      { op: "is", args: ["teacher_id", null] },
      { op: "eq", args: ["role", "student"] },
      { op: "eq", args: ["school_id", SCHOOL_ID] },
    ]);

    // Unlinked list should now be empty
    expect(screen.getByText("No students found")).toBeInTheDocument();
  });
});
