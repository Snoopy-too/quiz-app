import { z } from "zod";

export const bulkEditUsersSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1, "At least one user must be selected."),
  schoolAction: z.enum(["keep", "set", "clear"]),
  school_id: z.string().uuid().optional().nullable(),
  teacherAction: z.enum(["keep", "set", "clear"]),
  teacher_id: z.string().uuid().optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.schoolAction === "set" && (!data.school_id || data.school_id.trim() === "")) {
    ctx.addIssue({
      path: ["school_id"],
      code: z.ZodIssueCode.custom,
      message: "Please select a school to assign.",
    });
  }

  if (data.teacherAction === "set" && (!data.teacher_id || data.teacher_id.trim() === "")) {
    ctx.addIssue({
      path: ["teacher_id"],
      code: z.ZodIssueCode.custom,
      message: "Please select a teacher to assign.",
    });
  }

  if (data.schoolAction === "keep" && data.teacherAction === "keep") {
    ctx.addIssue({
      path: ["general"],
      code: z.ZodIssueCode.custom,
      message: "Please choose at least one category (School or Teacher) to update.",
    });
  }
});
