import { describe, it, expect } from "vitest";
import { bulkEditUsersSchema } from "../schemas/bulkEdit";

describe("Validation Schemas - Bulk Edit Users", () => {
  const validUuid1 = "11111111-1111-4111-a111-111111111111";
  const validUuid2 = "22222222-2222-4222-a222-222222222222";
  const schoolUuid = "33333333-3333-4333-a333-333333333333";
  const teacherUuid = "44444444-4444-4444-a444-444444444444";

  it("should validate a valid school update only", () => {
    const result = bulkEditUsersSchema.safeParse({
      userIds: [validUuid1, validUuid2],
      schoolAction: "set",
      school_id: schoolUuid,
      teacherAction: "keep",
      teacher_id: null,
    });
    expect(result.success).toBe(true);
  });

  it("should validate a valid teacher update only", () => {
    const result = bulkEditUsersSchema.safeParse({
      userIds: [validUuid1],
      schoolAction: "keep",
      school_id: null,
      teacherAction: "set",
      teacher_id: teacherUuid,
    });
    expect(result.success).toBe(true);
  });

  it("should validate both school and teacher assignment", () => {
    const result = bulkEditUsersSchema.safeParse({
      userIds: [validUuid1, validUuid2],
      schoolAction: "set",
      school_id: schoolUuid,
      teacherAction: "set",
      teacher_id: teacherUuid,
    });
    expect(result.success).toBe(true);
  });

  it("should validate clearing school and teacher", () => {
    const result = bulkEditUsersSchema.safeParse({
      userIds: [validUuid1],
      schoolAction: "clear",
      school_id: null,
      teacherAction: "clear",
      teacher_id: null,
    });
    expect(result.success).toBe(true);
  });

  it("should reject when userIds is empty", () => {
    const result = bulkEditUsersSchema.safeParse({
      userIds: [],
      schoolAction: "set",
      school_id: schoolUuid,
      teacherAction: "keep",
      teacher_id: null,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("At least one user must be selected.");
    }
  });

  it("should reject when userIds contains invalid UUIDs", () => {
    const result = bulkEditUsersSchema.safeParse({
      userIds: ["not-a-valid-uuid"],
      schoolAction: "clear",
      school_id: null,
      teacherAction: "keep",
      teacher_id: null,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].code).toBe("invalid_format");
    }
  });

  it("should reject when schoolAction is 'set' but school_id is missing", () => {
    const result = bulkEditUsersSchema.safeParse({
      userIds: [validUuid1],
      schoolAction: "set",
      school_id: null,
      teacherAction: "keep",
      teacher_id: null,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes("school_id"));
      expect(issue).toBeDefined();
      expect(issue?.message).toBe("Please select a school to assign.");
    }
  });

  it("should reject when teacherAction is 'set' but teacher_id is missing", () => {
    const result = bulkEditUsersSchema.safeParse({
      userIds: [validUuid1],
      schoolAction: "keep",
      school_id: null,
      teacherAction: "set",
      teacher_id: null,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes("teacher_id"));
      expect(issue).toBeDefined();
      expect(issue?.message).toBe("Please select a teacher to assign.");
    }
  });

  it("should reject when both schoolAction and teacherAction are 'keep'", () => {
    const result = bulkEditUsersSchema.safeParse({
      userIds: [validUuid1],
      schoolAction: "keep",
      school_id: null,
      teacherAction: "keep",
      teacher_id: null,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes("general"));
      expect(issue).toBeDefined();
      expect(issue?.message).toBe("Please choose at least one category (School or Teacher) to update.");
    }
  });

  it("should reject invalid action enum values", () => {
    const result = bulkEditUsersSchema.safeParse({
      userIds: [validUuid1],
      schoolAction: "invalid_action",
      school_id: null,
      teacherAction: "keep",
      teacher_id: null,
    });
    expect(result.success).toBe(false);
  });
});
