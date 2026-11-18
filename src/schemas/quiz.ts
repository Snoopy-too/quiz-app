import { z } from "zod";

const noHTML = z.string().refine((val) => !/<\/?[a-zA-Z][^>]*>/g.test(val), {
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
    .number({ error: "Time limit must be a number." })
    .int()
    .positive({ message: "Time limit must be positive." }),
  points: z
    .number({ error: "Points must be a number." })
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

export const QuestionOptionSchema = z.object({
  text: z.string(),
  is_correct: z.boolean().default(false),
  image_url: z.string().optional().default(""),
});

export type QuestionOption = z.infer<typeof QuestionOptionSchema>;

export const QuestionTypeSchema = z.enum(["multiple_choice", "true_false"]);
export type QuestionType = z.infer<typeof QuestionTypeSchema>;

export const EditorQuestionSchema = z.object({
  id: z.string().optional(),
  tempId: z.string().optional(),
  order_index: z.number().int().nonnegative().optional(),
  question_text: z.string().default(""),
  question_type: QuestionTypeSchema.default("multiple_choice"),
  time_limit: z.number().int().min(5).max(300).default(30),
  points: z.number().int().min(0).max(10000).default(100),
  image_url: z.string().nullable().optional().default(""),
  video_url: z.string().nullable().optional().default(""),
  gif_url: z.string().nullable().optional().default(""),
  options: z.array(QuestionOptionSchema).min(2).max(4),
});

export type EditorQuestion = z.infer<typeof EditorQuestionSchema>;

export const EditorQuizMetadataSchema = z.object({
  title: z.string().default(""),
  theme_id: z.string().nullable().default(null),
  background_image_url: z.string().nullable().default(null),
  folder_id: z.string().nullable().default(null),
  is_template: z.boolean().default(false),
  is_public: z.boolean().default(false),
  is_global: z.boolean().default(false),
  is_course_material: z.boolean().default(true),
  is_survey: z.boolean().default(false),
});

export type EditorQuizMetadata = z.infer<typeof EditorQuizMetadataSchema>;

export const QuizThemeSchema = z.object({
  id: z.string(),
  name: z.string(),
  primary_color: z.string(),
  secondary_color: z.string(),
  text_color: z.string().nullable().optional(),
  background_image_url: z.string().nullable().optional(),
  is_default: z.boolean().nullable().optional(),
});

export type QuizTheme = z.infer<typeof QuizThemeSchema>;

export const QuizFolderSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  parent_folder_id: z.string().nullable().optional(),
  order_index: z.number().int().nullable().optional(),
});

export type QuizFolder = z.infer<typeof QuizFolderSchema>;

export const QuizDraftSchema = z.object({
  version: z.literal(1),
  savedAt: z.string(),
  metadata: EditorQuizMetadataSchema,
  questions: z.array(EditorQuestionSchema),
});

export type QuizDraft = z.infer<typeof QuizDraftSchema>;

export interface QuestionValidationResult {
  valid: boolean;
  errors: string[];
}

export interface QuizPublishabilityResult {
  publishable: boolean;
  titleError: string | null;
  questionErrors: Record<string, string[]>;
  summaryErrors: string[];
}

export function getQuestionKey(question: Pick<EditorQuestion, "id" | "tempId">, fallbackIndex = 0): string {
  return question.id || question.tempId || `idx-${fallbackIndex}`;
}

export function createDefaultQuestion(type: QuestionType = "multiple_choice"): EditorQuestion {
  const options: QuestionOption[] =
    type === "true_false"
      ? [
          { text: "True", is_correct: true, image_url: "" },
          { text: "False", is_correct: false, image_url: "" },
        ]
      : [
          { text: "", is_correct: true, image_url: "" },
          { text: "", is_correct: false, image_url: "" },
          { text: "", is_correct: false, image_url: "" },
          { text: "", is_correct: false, image_url: "" },
        ];

  return {
    tempId: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    question_text: "",
    question_type: type,
    time_limit: 30,
    points: 100,
    image_url: "",
    video_url: "",
    gif_url: "",
    options,
  };
}

export function validateQuestionForEditor(
  question: EditorQuestion,
  options: { isSurvey?: boolean } = {},
): QuestionValidationResult {
  const errors: string[] = [];
  const text = (question.question_text || "").trim();

  if (!text) {
    errors.push("Question text is required.");
  }

  const parsed = questionSchema.safeParse({
    question_text: question.question_text || "",
    question_type: question.question_type,
    time_limit: Number(question.time_limit ?? 30),
    points: options.isSurvey ? 0 : Number(question.points ?? 100),
    image_url: question.image_url || null,
    video_url: question.video_url || null,
    gif_url: question.gif_url || null,
    options: (question.options || []).map((opt) => ({
      text: opt.text || "",
      is_correct: options.isSurvey ? false : Boolean(opt.is_correct),
      image_url: opt.image_url || "",
    })),
  });

  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      if (!errors.includes(issue.message)) {
        errors.push(issue.message);
      }
    }
  }

  const hasOptionContent = (opt: QuestionOption) =>
    Boolean((opt.text || "").trim() || (opt.image_url || "").trim());
  const nonEmptyOptionCount = (question.options || []).filter(hasOptionContent).length;
  if (nonEmptyOptionCount < 2) {
    errors.push("At least 2 options must have text or an image.");
  }

  const markedCorrectOptions = (question.options || []).filter((opt) => Boolean(opt.is_correct));
  if (!options.isSurvey && markedCorrectOptions.length === 0) {
    errors.push("Please mark at least one answer as correct.");
  } else if (!options.isSurvey && markedCorrectOptions.some((opt) => !hasOptionContent(opt))) {
    errors.push("Every marked correct answer must have text or an image.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function isQuizPublishable(
  metadata: Pick<EditorQuizMetadata, "title" | "is_survey">,
  questions: EditorQuestion[],
): QuizPublishabilityResult {
  const titleParsed = quizSchema.safeParse({ title: (metadata.title || "").trim() });
  const titleError = titleParsed.success
    ? null
    : titleParsed.error.issues[0]?.message || "Quiz title is required.";

  const questionErrors: Record<string, string[]> = {};
  const summaryErrors: string[] = [];

  if (titleError) {
    summaryErrors.push(titleError);
  }

  if (questions.length === 0) {
    summaryErrors.push("Add at least one question before saving.");
  }

  questions.forEach((question, index) => {
    const key = getQuestionKey(question, index);
    const res = validateQuestionForEditor(question, { isSurvey: metadata.is_survey });
    if (!res.valid) {
      questionErrors[key] = res.errors;
      summaryErrors.push(`Question ${index + 1}: ${res.errors[0]}`);
    }
  });

  return {
    publishable: !titleError && questions.length > 0 && Object.keys(questionErrors).length === 0,
    titleError,
    questionErrors,
    summaryErrors,
  };
}
