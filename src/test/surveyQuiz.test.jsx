import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "../i18n";
import QuizCompleted from "../components/quizzes/teacherControl/QuizCompleted";
import QuestionResults from "../components/quizzes/teacherControl/QuestionResults";

describe("Survey Quiz TeacherControl Screens", () => {
  it("displays the actual total question count in QuizCompleted for survey quizzes", () => {
    const questions = Array.from({ length: 10 }, (_, idx) => ({
      id: `q-${idx + 1}`,
      question_text: `Question ${idx + 1}`,
      options: [],
    }));

    render(
      <QuizCompleted
        quiz={{ id: "quiz-1", title: "Course Feedback", is_survey: true }}
        questions={questions}
        session={{ id: "sess-1", mode: "classic" }}
        participants={[{ id: "p1" }, { id: "p2" }, { id: "p3" }]}
        teams={[]}
        setView={vi.fn()}
      />
    );

    expect(screen.getByText("Survey Complete!")).toBeInTheDocument();
    expect(screen.getByText("Total Questions:")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.queryByText("N/A")).not.toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("displays per-option answer counts in QuestionResults for survey quizzes without a leaderboard", () => {
    const currentQuestion = {
      id: "q-1",
      question_text: "How was the pace?",
      options: [
        { text: "Too slow", is_correct: false },
        { text: "Just right", is_correct: false },
        { text: "Too fast", is_correct: false },
      ],
    };

    render(
      <QuestionResults
        quiz={{ id: "quiz-1", title: "Course Feedback", is_survey: true }}
        session={{ id: "sess-1", mode: "classic", current_question_index: 0, randomize_answers: false }}
        currentQuestion={currentQuestion}
        questions={[currentQuestion]}
        questionResults={[
          { selected_option_index: 1 },
          { selected_option_index: 1 },
          { selected_option_index: 2 },
        ]}
        participants={[{ id: "p1" }, { id: "p2" }, { id: "p3" }]}
        teams={[]}
        nextQuestion={vi.fn()}
        endQuiz={vi.fn()}
        endingQuiz={false}
        closeSession={vi.fn()}
        isTransitioning={false}
      />
    );

    expect(screen.getByText("How was the pace?")).toBeInTheDocument();
    expect(screen.getByText("0 answers")).toBeInTheDocument();
    expect(screen.getByText("2 answers")).toBeInTheDocument();
    expect(screen.getByText("1 answer")).toBeInTheDocument();
    expect(screen.getByText("Finish Survey")).toBeInTheDocument();
    expect(screen.queryByText("Leaderboard")).not.toBeInTheDocument();
  });
});
