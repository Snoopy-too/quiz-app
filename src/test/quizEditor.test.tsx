import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import "../i18n";
import QuizEditor from "../components/quizzes/QuizEditor";
import { ToastProvider } from "../components/ui";
import { isQuizPublishable, createDefaultQuestion } from "../schemas/quiz";
import * as quizRepo from "../infrastructure/quizRepository";
import {
  DEFAULT_THEME_PRIMARY,
  DEFAULT_THEME_SECONDARY,
  DEFAULT_THEME_TEXT_COLOR,
} from "../theme/themeDefaults";

vi.mock("../components/quizzes/ThemeSelector", () => ({
  default: function MockThemeSelector() {
    return <div data-testid="theme-selector">Theme Selector</div>;
  },
}));

vi.mock("../infrastructure/quizRepository", () => ({
  fetchTeacherFolders: vi.fn(),
  fetchDefaultTheme: vi.fn(),
  fetchThemeById: vi.fn(),
  loadQuizForEditor: vi.fn(),
  createQuizWithQuestions: vi.fn(),
  updateQuizMetadata: vi.fn(),
  normalizeSurveyQuestionsInDb: vi.fn(),
  insertQuestionInDb: vi.fn(),
  updateQuestionInDb: vi.fn(),
  insertQuestionsBatchInDb: vi.fn(),
  deleteQuestionInDb: vi.fn(),
  reorderQuestionsInDb: vi.fn(),
  bulkUpdateQuestionsInDb: vi.fn(),
}));

function renderQuizEditor(props: { quizId?: string; setView?: (v: string, d?: unknown) => void } = {}) {
  const setView = props.setView || vi.fn();
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: (
          <ToastProvider>
            <QuizEditor
              quizId={props.quizId}
              setView={setView}
              appState={{ currentUser: { id: "teacher-1" } }}
            />
          </ToastProvider>
        ),
      },
    ],
    { initialEntries: ["/"] },
  );

  return {
    setView,
    ...render(<RouterProvider router={router} />),
  };
}

describe("QuizEditor & Publishability Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    vi.mocked(quizRepo.fetchTeacherFolders).mockResolvedValue([]);
    vi.mocked(quizRepo.fetchDefaultTheme).mockResolvedValue({
      id: "theme-default",
      name: "Default",
      primary_color: DEFAULT_THEME_PRIMARY,
      secondary_color: DEFAULT_THEME_SECONDARY,
      text_color: DEFAULT_THEME_TEXT_COLOR,
      background_image_url: null,
      is_default: true,
    });
    vi.mocked(quizRepo.fetchThemeById).mockResolvedValue(null);
  });

  it("validates quiz publishability across standard and survey quizzes", () => {
    const emptyRes = isQuizPublishable(
      { title: "", is_survey: false },
      [createDefaultQuestion("multiple_choice")],
    );
    expect(emptyRes.publishable).toBe(false);
    expect(emptyRes.titleError).toBe("Quiz title is required.");

    const q1 = createDefaultQuestion("multiple_choice");
    q1.question_text = "What is 2 + 2?";
    q1.options = [
      { text: "3", is_correct: false, image_url: "" },
      { text: "4", is_correct: false, image_url: "" },
    ];
    const noCorrectRes = isQuizPublishable({ title: "Math Quiz", is_survey: false }, [q1]);
    expect(noCorrectRes.publishable).toBe(false);

    // Survey mode allows no correct answer
    const surveyRes = isQuizPublishable({ title: "Feedback Poll", is_survey: true }, [q1]);
    expect(surveyRes.publishable).toBe(true);
  });

  it("blocks saving when validation errors exist and prompts draft restoration", async () => {
    localStorage.setItem(
      "quizapp_draft_quiz_new",
      JSON.stringify({
        version: 1,
        savedAt: "2026-11-17T12:00:00.000Z",
        metadata: {
          title: "Recovered Biology Draft",
          theme_id: null,
          background_image_url: null,
          folder_id: null,
          is_template: false,
          is_public: false,
          is_global: false,
          is_course_material: false,
          is_survey: false,
        },
        questions: [
          {
            tempId: "temp-q1",
            question_text: "Which organelle produces ATP?",
            question_type: "multiple_choice",
            time_limit: 30,
            points: 100,
            image_url: "",
            video_url: "",
            gif_url: "",
            options: [
              { text: "Mitochondria", is_correct: true, image_url: "" },
              { text: "Ribosome", is_correct: false, image_url: "" },
            ],
          },
        ],
      }),
    );

    renderQuizEditor();

    await waitFor(() => {
      expect(screen.getByText("Restore unsaved draft?")).toBeInTheDocument();
    });

    const restoreBtn = await screen.findByRole("button", { name: "Restore draft" });
    fireEvent.click(restoreBtn);
    expect(screen.getByPlaceholderText("Enter quiz title")).toHaveValue("Recovered Biology Draft");

    // Clear title to trigger validation block on save
    fireEvent.change(screen.getByPlaceholderText("Enter quiz title"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(screen.getAllByText("Quiz title is required.").length).toBeGreaterThanOrEqual(2);
    });
    expect(quizRepo.createQuizWithQuestions).not.toHaveBeenCalled();
  });

  it("saves and exits an existing quiz without redundant question updates when unchanged", async () => {
    vi.mocked(quizRepo.loadQuizForEditor).mockResolvedValue({
      quiz: {
        id: "quiz-123",
        created_by: "teacher-1",
        metadata: {
          title: "Loaded Quiz",
          theme_id: null,
          background_image_url: null,
          folder_id: null,
          is_template: false,
          is_public: false,
          is_global: false,
          is_course_material: true,
          is_survey: false,
        },
      },
      questions: [
        {
          id: "q-1",
          order_index: 0,
          question_text: "Question One?",
          question_type: "multiple_choice",
          time_limit: 30,
          points: 100,
          image_url: "",
          video_url: "",
          gif_url: "",
          options: [
            { text: "Yes", is_correct: true, image_url: "" },
            { text: "No", is_correct: false, image_url: "" },
          ],
        },
        {
          id: "q-2",
          order_index: 1,
          question_text: "Question Two?",
          question_type: "multiple_choice",
          time_limit: 30,
          points: 100,
          image_url: "",
          video_url: "",
          gif_url: "",
          options: [
            { text: "Alpha", is_correct: true, image_url: "" },
            { text: "Beta", is_correct: false, image_url: "" },
          ],
        },
      ],
      theme: null,
    });

    const { setView } = renderQuizEditor({ quizId: "quiz-123" });

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Enter quiz title")).toHaveValue("Loaded Quiz");
    });

    fireEvent.click(screen.getByRole("button", { name: "Save & Exit" }));

    await waitFor(() => {
      expect(setView).toHaveBeenCalledWith("manage-quizzes");
    });
    expect(quizRepo.updateQuestionInDb).not.toHaveBeenCalled();
    expect(quizRepo.updateQuizMetadata).not.toHaveBeenCalled();
  });

  it("adds questions and supports Alt+ArrowUp keyboard reordering", async () => {
    renderQuizEditor();

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Enter question text")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText("Enter question text"), {
      target: { value: "First Question" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Add Question" }));
    fireEvent.change(screen.getByPlaceholderText("Enter question text"), {
      target: { value: "Second Question" },
    });

    const listItems = screen.getAllByRole("listitem");
    expect(listItems).toHaveLength(2);
    expect(listItems[0]).toHaveTextContent("First Question");
    expect(listItems[1]).toHaveTextContent("Second Question");

    const secondSelectBtn = listItems[1].querySelector("button");
    expect(secondSelectBtn).not.toBeNull();
    fireEvent.keyDown(secondSelectBtn!, { key: "ArrowUp", altKey: true });

    const reorderedItems = screen.getAllByRole("listitem");
    expect(reorderedItems[0]).toHaveTextContent("Second Question");
    expect(reorderedItems[1]).toHaveTextContent("First Question");
  });

  it("renders answer options as multi-line textareas and collapses the settings pane by default", async () => {
    renderQuizEditor();

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Enter question text")).toBeInTheDocument();
    });

    const option1 = screen.getByLabelText("Option 1");
    expect(option1.tagName).toBe("TEXTAREA");

    const longAnswer = "100 years in the future to see how humanity has evolved and what cities look like";
    fireEvent.change(option1, { target: { value: longAnswer } });
    expect(option1).toHaveValue(longAnswer);

    // Settings/Themes right pane is collapsed by default
    expect(screen.queryByTestId("theme-selector")).not.toBeInTheDocument();

    // Clicking Settings opens the right pane with ThemeSelector visible and synced title field
    const settingsBtn = screen.getByRole("button", { name: "Settings" });
    expect(settingsBtn).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(settingsBtn);

    expect(screen.getByTestId("theme-selector")).toBeInTheDocument();
    expect(settingsBtn).toHaveAttribute("aria-pressed", "true");

    const titleInputs = screen.getAllByPlaceholderText("Enter quiz title");
    expect(titleInputs).toHaveLength(2);
    fireEvent.change(titleInputs[0], { target: { value: "Updated From Header" } });
    expect(titleInputs[1]).toHaveValue("Updated From Header");

    // Clicking Settings again collapses it
    fireEvent.click(settingsBtn);
    expect(screen.queryByTestId("theme-selector")).not.toBeInTheDocument();
  });
});
