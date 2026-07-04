import { describe, it, expect } from "vitest";
import { loginSchema, registrationSchema } from "../schemas/auth";
import { quizSchema, questionSchema } from "../schemas/quiz";

describe("Validation Schemas - Auth", () => {
  describe("loginSchema", () => {
    it("should validate correct credentials", () => {
      const result = loginSchema.safeParse({
        email: "teacher@school.edu",
        password: "securepassword123",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid email formats", () => {
      const result = loginSchema.safeParse({
        email: "invalid-email",
        password: "password123",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Invalid email format.");
      }
    });

    it("should reject short passwords", () => {
      const result = loginSchema.safeParse({
        email: "teacher@school.edu",
        password: "123",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Password must be at least 6 characters.");
      }
    });
  });

  describe("registrationSchema", () => {
    it("should validate correct student registration", () => {
      const result = registrationSchema.safeParse({
        name: "Jane Student",
        email: "jane@school.edu",
        password: "password123",
        role: "student",
        studentId: "STU-001",
        teacherCode: "CODE123",
      });
      expect(result.success).toBe(true);
    });

    it("should reject student registration with script tags in name", () => {
      const result = registrationSchema.safeParse({
        name: 'Jane <script>alert("hack")</script>',
        email: "jane@school.edu",
        password: "password123",
        role: "student",
        studentId: "STU-001",
        teacherCode: "CODE123",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("HTML tags or scripts are not allowed.");
      }
    });

    it("should reject student registration with HTML tags in studentId", () => {
      const result = registrationSchema.safeParse({
        name: "Jane Student",
        email: "jane@school.edu",
        password: "password123",
        role: "student",
        studentId: "STU-001<p>inject</p>",
        teacherCode: "CODE123",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("HTML tags are not allowed in student number.");
      }
    });

    it("should validate teacher registration with school_id", () => {
      const result = registrationSchema.safeParse({
        name: "John Teacher",
        email: "john@school.edu",
        password: "password123",
        role: "teacher",
        school_id: "c9c2b4c1-482a-4df4-a82a-a925f4fb491f",
      });
      expect(result.success).toBe(true);
    });

    it("should reject teacher registration without school_id", () => {
      const result = registrationSchema.safeParse({
        name: "John Teacher",
        email: "john@school.edu",
        password: "password123",
        role: "teacher",
        school_id: "",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("School selection is required for teachers.");
      }
    });
  });
});

describe("Validation Schemas - Quiz", () => {
  describe("quizSchema", () => {
    it("should validate valid quiz settings", () => {
      const result = quizSchema.safeParse({
        title: "Science Quiz 101",
        is_template: false,
        is_public: false,
        is_global: false,
        is_course_material: true,
        is_survey: false,
      });
      expect(result.success).toBe(true);
    });

    it("should reject quiz with script tags in title", () => {
      const result = quizSchema.safeParse({
        title: "Quiz <script>src=evil.js</script>",
        is_template: false,
        is_public: false,
        is_global: false,
        is_course_material: true,
        is_survey: false,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("HTML tags or scripts are not allowed.");
      }
    });
  });

  describe("questionSchema", () => {
    it("should validate correct question details", () => {
      const result = questionSchema.safeParse({
        question_text: "What is 2 + 2?",
        question_type: "multiple_choice",
        time_limit: 30,
        points: 100,
        options: [
          { text: "3", is_correct: false },
          { text: "4", is_correct: true },
          { text: "5", is_correct: false },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("should reject question with scripts in options", () => {
      const result = questionSchema.safeParse({
        question_text: "What is 2 + 2?",
        question_type: "multiple_choice",
        time_limit: 30,
        points: 100,
        options: [
          { text: "3", is_correct: false },
          { text: "4 <script></script>", is_correct: true },
        ],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("HTML tags or scripts are not allowed.");
      }
    });

    it("should reject question with negative time limit", () => {
      const result = questionSchema.safeParse({
        question_text: "What is 2 + 2?",
        question_type: "multiple_choice",
        time_limit: -5,
        points: 100,
        options: [
          { text: "3", is_correct: false },
          { text: "4", is_correct: true },
        ],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Time limit must be positive.");
      }
    });

    it("should reject question with fewer than 2 options", () => {
      const result = questionSchema.safeParse({
        question_text: "What is 2 + 2?",
        question_type: "multiple_choice",
        time_limit: 30,
        points: 100,
        options: [
          { text: "4", is_correct: true },
        ],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("At least 2 options are required.");
      }
    });
  });
});
