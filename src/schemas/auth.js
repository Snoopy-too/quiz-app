import { z } from "zod";

const noHTML = z.string().refine((val) => !/<[^>]*>/g.test(val), {
  message: "HTML tags or scripts are not allowed.",
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { message: "Email is required." })
    .email({ message: "Invalid email format." }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters." }),
});

export const registrationSchema = z.object({
  name: noHTML
    .trim()
    .min(1, { message: "Name is required." })
    .max(100, { message: "Name cannot exceed 100 characters." }),
  email: z
    .string()
    .trim()
    .min(1, { message: "Email is required." })
    .email({ message: "Invalid email format." }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters." }),
  role: z.enum(["student", "teacher"]),
  studentId: z.string().trim().optional(),
  teacherCode: z.string().trim().optional(),
  school_id: z.string().trim().optional(),
}).superRefine((data, ctx) => {
  if (data.role === "student") {
    if (!data.studentId || data.studentId.trim() === "") {
      ctx.addIssue({
        path: ["studentId"],
        code: z.ZodIssueCode.custom,
        message: "Student number is required.",
      });
    } else if (/<[^>]*>/g.test(data.studentId)) {
      ctx.addIssue({
        path: ["studentId"],
        code: z.ZodIssueCode.custom,
        message: "HTML tags are not allowed in student number.",
      });
    }

    if (!data.teacherCode || data.teacherCode.trim() === "") {
      ctx.addIssue({
        path: ["teacherCode"],
        code: z.ZodIssueCode.custom,
        message: "Teacher code is required for students.",
      });
    } else if (/<[^>]*>/g.test(data.teacherCode)) {
      ctx.addIssue({
        path: ["teacherCode"],
        code: z.ZodIssueCode.custom,
        message: "HTML tags are not allowed in teacher code.",
      });
    }
  }

  if (data.role === "teacher") {
    if (!data.school_id || data.school_id.trim() === "") {
      ctx.addIssue({
        path: ["school_id"],
        code: z.ZodIssueCode.custom,
        message: "School selection is required for teachers.",
      });
    }
  }
});
