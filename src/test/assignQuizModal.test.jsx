import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "../i18n";
import AssignQuizModal from "../components/teachers/AssignQuizModal";

const mockStudents = [
  { id: "s1", name: "Alice", email: "alice@example.com", student_id: "STU-10" },
  { id: "s2", name: "Bob", email: "bob@example.com", student_id: "STU-2" },
  { id: "s3", name: "Charlie", email: "charlie@example.com", student_id: null },
  { id: "s4", name: "Diana", email: "diana@example.com", student_id: "STU-1" },
];

vi.mock("../supabaseClient", () => ({
  supabase: {
    from: vi.fn(() => {
      const chain = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        order: vi.fn(() => Promise.resolve({ data: mockStudents, error: null })),
      };
      return chain;
    }),
  },
}));

describe("AssignQuizModal student sorting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sorts students by name by default and by student number when selected", async () => {
    render(
      <AssignQuizModal
        isOpen={true}
        onClose={vi.fn()}
        quizId="quiz-1"
        quizTitle="Sample Quiz"
        teacherId="teacher-1"
        onAssignmentCreated={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
    });

    const getRenderedNames = () =>
      screen
        .getAllByRole("button")
        .map((btn) => btn.querySelector("p.font-medium")?.textContent)
        .filter(Boolean);

    expect(getRenderedNames()).toEqual(["Alice", "Bob", "Charlie", "Diana"]);

    const sortSelect = screen.getByLabelText("Sort students by");
    fireEvent.change(sortSelect, { target: { value: "student_id" } });

    expect(getRenderedNames()).toEqual(["Diana", "Bob", "Alice", "Charlie"]);
  });
});
