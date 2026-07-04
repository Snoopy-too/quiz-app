import { z } from "zod";

const noHTML = z.string().refine((val) => !/<[^>]*>/g.test(val), {
  message: "HTML tags or scripts are not allowed.",
});

export const optionSchema = z.object({
  text: noHTML
    .trim()
    .max(200, { message: "Option text cannot exceed 200 characters." }),
  is_correct: z.boolean(),
  image_url: z.string().optional().nullable(),
});

export const questionSchema = z.object({
  id: z.string().optional(),
  question_text: noHTML
    .trim()
    .min(1, { message: "Question text is required." })
    .max(500, { message: "Question text cannot exceed 500 characters." }),
  question_type: z.string().min(1, { message: "Question type is required." }),
  time_limit: z
    .number({ invalid_type_error: "Time limit must be a number." })
    .int()
    .positive({ message: "Time limit must be positive." }),
  points: z
    .number({ invalid_type_error: "Points must be a number." })
    .int()
    .nonnegative({ message: "Points cannot be negative." }),
  image_url: z.string().optional().nullable(),
  video_url: z.string().optional().nullable(),
  gif_url: z.string().optional().nullable(),
  options: z.array(optionSchema).min(2, { message: "At least 2 options are required." }),
});

export const quizSchema = z.object({
  title: noHTML
    .trim()
    .min(1, { message: "Quiz title is required." })
    .max(200, { message: "Quiz title cannot exceed 200 characters." }),
  theme_id: z.string().optional().nullable(),
  folder_id: z.string().optional().nullable(),
  is_template: z.boolean().default(false),
  is_public: z.boolean().default(false),
  is_global: z.boolean().default(false),
  is_course_material: z.boolean().default(true),
  is_survey: z.boolean().default(false),
});
