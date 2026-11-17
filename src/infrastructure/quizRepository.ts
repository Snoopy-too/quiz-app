import { supabase } from "../supabaseClient";
import type { Database, Json } from "./database.types";
import {
  EditorQuestionSchema,
  EditorQuizMetadataSchema,
  QuizFolderSchema,
  QuizThemeSchema,
  type EditorQuestion,
  type EditorQuizMetadata,
  type QuestionOption,
  type QuizFolder,
  type QuizTheme,
} from "../schemas/quiz";
import { sanitizeOptionText, sanitizeQuestionText, sanitizeQuizTitle } from "../utils/sanitize";

type QuestionInsert = Database["public"]["Tables"]["questions"]["Insert"];
type QuestionUpdate = Database["public"]["Tables"]["questions"]["Update"];
type QuizRow = Database["public"]["Tables"]["quizzes"]["Row"];
type QuizUpdate = Database["public"]["Tables"]["quizzes"]["Update"];

export interface LoadedQuizBundle {
  quiz: {
    id: string;
    created_by: string | null;
    metadata: EditorQuizMetadata;
  };
  questions: EditorQuestion[];
  theme: QuizTheme | null;
}

function normalizeOptions(rawOptions: Json | null, isSurvey = false): QuestionOption[] {
  if (!Array.isArray(rawOptions)) {
    return [
      { text: "", is_correct: !isSurvey, image_url: "" },
      { text: "", is_correct: false, image_url: "" },
    ];
  }
  return rawOptions.map((item) => {
    const record = typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {};
    return {
      text: typeof record.text === "string" ? record.text : "",
      is_correct: isSurvey ? false : Boolean(record.is_correct),
      image_url: typeof record.image_url === "string" ? record.image_url : "",
    };
  });
}

function sanitizeQuestionPayload(
  question: EditorQuestion,
  orderIndex: number,
  isSurvey = false,
): Omit<QuestionInsert, "quiz_id"> {
  const safeOptions = (question.options || []).map((opt) => ({
    text: sanitizeOptionText(opt.text || ""),
    is_correct: isSurvey ? false : Boolean(opt.is_correct),
    image_url: opt.image_url || "",
  }));

  return {
    question_text: sanitizeQuestionText(question.question_text || ""),
    question_type: question.question_type || "multiple_choice",
    time_limit: Number(question.time_limit || 30),
    points: isSurvey ? 0 : Number(question.points ?? 100),
    image_url: question.image_url || null,
    video_url: question.video_url || null,
    gif_url: question.gif_url || null,
    options: safeOptions as unknown as Json,
    order_index: orderIndex,
  };
}

export async function fetchTeacherFolders(teacherId: string): Promise<QuizFolder[]> {
  const { data, error } = await supabase
    .from("quiz_folders")
    .select("id, name, color, icon, parent_folder_id, order_index")
    .eq("created_by", teacherId)
    .order("order_index", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return (data || []).map((row) => QuizFolderSchema.parse(row));
}

export async function fetchThemeById(themeId: string): Promise<QuizTheme | null> {
  const { data, error } = await supabase
    .from("themes")
    .select("id, name, primary_color, secondary_color, text_color, background_image_url, is_default")
    .eq("id", themeId)
    .maybeSingle();

  if (error) throw error;
  return data ? QuizThemeSchema.parse(data) : null;
}

export async function fetchDefaultTheme(): Promise<QuizTheme | null> {
  const { data: defaultRow, error: defaultErr } = await supabase
    .from("themes")
    .select("id, name, primary_color, secondary_color, text_color, background_image_url, is_default")
    .eq("is_default", true)
    .limit(1)
    .maybeSingle();

  if (defaultErr) throw defaultErr;
  if (defaultRow) return QuizThemeSchema.parse(defaultRow);

  const { data: firstRow, error: firstErr } = await supabase
    .from("themes")
    .select("id, name, primary_color, secondary_color, text_color, background_image_url, is_default")
    .limit(1)
    .maybeSingle();

  if (firstErr) throw firstErr;
  return firstRow ? QuizThemeSchema.parse(firstRow) : null;
}

export async function loadQuizForEditor(quizId: string): Promise<LoadedQuizBundle> {
  const { data: quizData, error: quizError } = await supabase
    .from("quizzes")
    .select(
      "id, title, created_by, theme_id, background_image_url, folder_id, is_template, is_public, is_global, is_course_material, is_survey",
    )
    .eq("id", quizId)
    .single();

  if (quizError) throw quizError;
  const quizRow = quizData as Pick<
    QuizRow,
    | "id"
    | "title"
    | "created_by"
    | "theme_id"
    | "background_image_url"
    | "folder_id"
    | "is_template"
    | "is_public"
    | "is_global"
    | "is_course_material"
    | "is_survey"
  >;

  const { data: questionsData, error: questionsError } = await supabase
    .from("questions")
    .select("id, question_text, question_type, time_limit, points, image_url, video_url, gif_url, options, order_index")
    .eq("quiz_id", quizId)
    .order("order_index", { ascending: true });

  if (questionsError) throw questionsError;

  const isSurvey = Boolean(quizRow.is_survey);
  const metadata = EditorQuizMetadataSchema.parse({
    title: quizRow.title || "",
    theme_id: quizRow.theme_id ?? null,
    background_image_url: quizRow.background_image_url ?? null,
    folder_id: quizRow.folder_id ?? null,
    is_template: Boolean(quizRow.is_template),
    is_public: Boolean(quizRow.is_public),
    is_global: Boolean(quizRow.is_global),
    is_course_material: Boolean(quizRow.is_course_material),
    is_survey: isSurvey,
  });

  const questions: EditorQuestion[] = (questionsData || []).map((row, idx) =>
    EditorQuestionSchema.parse({
      id: row.id,
      order_index: row.order_index ?? idx,
      question_text: row.question_text || "",
      question_type: row.question_type === "true_false" ? "true_false" : "multiple_choice",
      time_limit: Number(row.time_limit || 30),
      points: Number(row.points ?? 100),
      image_url: row.image_url || "",
      video_url: row.video_url || "",
      gif_url: row.gif_url || "",
      options: normalizeOptions(row.options, false),
    }),
  );

  let theme: QuizTheme | null = null;
  if (metadata.theme_id) {
    theme = await fetchThemeById(metadata.theme_id);
  }

  return {
    quiz: {
      id: quizRow.id,
      created_by: quizRow.created_by,
      metadata,
    },
    questions,
    theme,
  };
}

export async function createQuizWithQuestions(params: {
  createdBy: string;
  metadata: EditorQuizMetadata;
  questions: EditorQuestion[];
}): Promise<{ quizId: string }> {
  const { createdBy, metadata, questions } = params;
  const sanitizedTitle = sanitizeQuizTitle(metadata.title || "");

  const { data: insertedQuiz, error: quizError } = await supabase
    .from("quizzes")
    .insert([
      {
        title: sanitizedTitle,
        created_by: createdBy,
        theme_id: metadata.theme_id,
        background_image_url: metadata.background_image_url,
        folder_id: metadata.folder_id,
        is_template: metadata.is_template,
        is_public: metadata.is_public,
        is_global: metadata.is_global,
        is_course_material: metadata.is_course_material,
        is_survey: metadata.is_survey,
      },
    ])
    .select("id")
    .single();

  if (quizError) throw quizError;

  if (questions.length > 0) {
    const questionPayloads: QuestionInsert[] = questions.map((q, index) => ({
      quiz_id: insertedQuiz.id,
      ...sanitizeQuestionPayload(q, index, metadata.is_survey),
    }));

    const { error: qErr } = await supabase.from("questions").insert(questionPayloads);
    if (qErr) throw qErr;
  }

  return { quizId: insertedQuiz.id };
}

export async function updateQuizMetadata(
  quizId: string,
  metadata: EditorQuizMetadata,
): Promise<void> {
  const updatePayload: QuizUpdate = {
    title: sanitizeQuizTitle(metadata.title || ""),
    theme_id: metadata.theme_id,
    background_image_url: metadata.background_image_url,
    folder_id: metadata.folder_id,
    is_template: metadata.is_template,
    is_public: metadata.is_public,
    is_global: metadata.is_global,
    is_course_material: metadata.is_course_material,
    is_survey: metadata.is_survey,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("quizzes").update(updatePayload).eq("id", quizId);
  if (error) throw error;
}

export async function normalizeSurveyQuestionsInDb(
  quizId: string,
  questions: EditorQuestion[],
): Promise<void> {
  const persisted = questions.filter((q) => Boolean(q.id));
  await Promise.all(
    persisted.map(async (q) => {
      const cleanedOptions = (q.options || []).map((opt) => ({
        ...opt,
        is_correct: false,
      }));
      const { error } = await supabase
        .from("questions")
        .update({
          points: 0,
          options: cleanedOptions as unknown as Json,
        })
        .eq("id", q.id!);
      if (error) throw error;
    }),
  );
  if (persisted.length === 0) {
    const { error } = await supabase.from("questions").update({ points: 0 }).eq("quiz_id", quizId);
    if (error) throw error;
  }
}

export async function insertQuestionInDb(
  quizId: string,
  question: EditorQuestion,
  orderIndex: number,
  isSurvey = false,
): Promise<EditorQuestion> {
  const payload: QuestionInsert = {
    quiz_id: quizId,
    ...sanitizeQuestionPayload(question, orderIndex, isSurvey),
  };

  const { data, error } = await supabase
    .from("questions")
    .insert([payload])
    .select("id, question_text, question_type, time_limit, points, image_url, video_url, gif_url, options, order_index")
    .single();

  if (error) throw error;

  return EditorQuestionSchema.parse({
    id: data.id,
    order_index: data.order_index ?? orderIndex,
    question_text: data.question_text,
    question_type: data.question_type === "true_false" ? "true_false" : "multiple_choice",
    time_limit: Number(data.time_limit || 30),
    points: Number(data.points ?? 100),
    image_url: data.image_url || "",
    video_url: data.video_url || "",
    gif_url: data.gif_url || "",
    options: normalizeOptions(data.options, isSurvey),
  });
}

export async function updateQuestionInDb(
  questionId: string,
  question: EditorQuestion,
  orderIndex?: number,
  isSurvey = false,
): Promise<void> {
  const sanitized = sanitizeQuestionPayload(
    question,
    orderIndex ?? question.order_index ?? 0,
    isSurvey,
  );
  const payload: QuestionUpdate = {
    question_text: sanitized.question_text,
    question_type: sanitized.question_type,
    time_limit: sanitized.time_limit,
    points: sanitized.points,
    image_url: sanitized.image_url,
    video_url: sanitized.video_url,
    gif_url: sanitized.gif_url,
    options: sanitized.options,
    order_index: orderIndex !== undefined ? orderIndex : question.order_index,
  };

  const { error } = await supabase.from("questions").update(payload).eq("id", questionId);
  if (error) throw error;
}

export async function insertQuestionsBatchInDb(
  quizId: string,
  questions: EditorQuestion[],
  startingOrderIndex: number,
  isSurvey = false,
): Promise<EditorQuestion[]> {
  if (questions.length === 0) return [];
  const payloads: QuestionInsert[] = questions.map((q, idx) => ({
    quiz_id: quizId,
    ...sanitizeQuestionPayload(q, startingOrderIndex + idx, isSurvey),
  }));

  const { data, error } = await supabase
    .from("questions")
    .insert(payloads)
    .select("id, question_text, question_type, time_limit, points, image_url, video_url, gif_url, options, order_index");

  if (error) throw error;

  return (data || []).map((row, idx) =>
    EditorQuestionSchema.parse({
      id: row.id,
      order_index: row.order_index ?? startingOrderIndex + idx,
      question_text: row.question_text,
      question_type: row.question_type === "true_false" ? "true_false" : "multiple_choice",
      time_limit: Number(row.time_limit || 30),
      points: Number(row.points ?? 100),
      image_url: row.image_url || "",
      video_url: row.video_url || "",
      gif_url: row.gif_url || "",
      options: normalizeOptions(row.options, isSurvey),
    }),
  );
}

export async function deleteQuestionInDb(questionId: string): Promise<void> {
  const { error } = await supabase.from("questions").delete().eq("id", questionId);
  if (error) throw error;
}

export async function reorderQuestionsInDb(orderedQuestionIds: string[]): Promise<void> {
  for (let index = 0; index < orderedQuestionIds.length; index += 1) {
    const id = orderedQuestionIds[index];
    const { error } = await supabase
      .from("questions")
      .update({ order_index: index })
      .eq("id", id);
    if (error) throw error;
  }
}

export async function bulkUpdateQuestionsInDb(
  quizId: string,
  updates: { timeLimit?: number; points?: number },
): Promise<void> {
  const payload: QuestionUpdate = {};
  if (updates.timeLimit !== undefined) payload.time_limit = updates.timeLimit;
  if (updates.points !== undefined) payload.points = updates.points;
  if (Object.keys(payload).length === 0) return;

  const { error } = await supabase.from("questions").update(payload).eq("quiz_id", quizId);
  if (error) throw error;
}
