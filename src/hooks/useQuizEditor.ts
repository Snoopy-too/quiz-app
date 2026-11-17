import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "../components/ui";
import {
  bulkUpdateQuestionsInDb,
  createQuizWithQuestions,
  deleteQuestionInDb,
  fetchDefaultTheme,
  fetchTeacherFolders,
  fetchThemeById,
  insertQuestionInDb,
  insertQuestionsBatchInDb,
  loadQuizForEditor,
  normalizeSurveyQuestionsInDb,
  reorderQuestionsInDb,
  updateQuestionInDb,
  updateQuizMetadata,
} from "../infrastructure/quizRepository";
import {
  createDefaultQuestion,
  getQuestionKey,
  isQuizPublishable,
  QuizDraftSchema,
  type EditorQuestion,
  type EditorQuizMetadata,
  type QuestionType,
  type QuizDraft,
  type QuizFolder,
  type QuizPublishabilityResult,
  type QuizTheme,
  validateQuestionForEditor,
} from "../schemas/quiz";
import { parseKahootCSV } from "../utils/csvQuizParser";
import { uploadGIF, uploadImage, uploadVideo } from "../utils/mediaUpload";
import { validateFileUpload } from "../utils/sanitize";

export const QUIZ_DRAFT_STORAGE_KEY = "quizapp_draft_quiz_new";

export type SaveStatus = "idle" | "saving" | "saved" | "unsaved" | "offline";

export interface UseQuizEditorOptions {
  quizId?: string;
  teacherId?: string | null;
  setView?: (view: string, data?: unknown) => void;
}

const DEFAULT_METADATA: EditorQuizMetadata = {
  title: "",
  theme_id: null,
  background_image_url: null,
  folder_id: null,
  is_template: false,
  is_public: false,
  is_global: false,
  is_course_material: false,
  is_survey: false,
};

function readInitialFolderId(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const paramFolder = params.get("folder");
    if (paramFolder && paramFolder !== "all" && paramFolder !== "unfiled") {
      return paramFolder;
    }
    const stored = sessionStorage.getItem("quizapp_activeFolder");
    if (stored && stored !== "all" && stored !== "unfiled") {
      return stored;
    }
  } catch {
    // Ignore storage/URL read issues in restricted test environments
  }
  return null;
}

function readLocalDraft(): QuizDraft | null {
  try {
    const raw = localStorage.getItem(QUIZ_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsedJson: unknown = JSON.parse(raw);
    const validated = QuizDraftSchema.safeParse(parsedJson);
    if (!validated.success) return null;
    const draft = validated.data;
    const hasMeaningfulContent =
      draft.metadata.title.trim().length > 0 ||
      draft.questions.some(
        (q) =>
          q.question_text.trim().length > 0 ||
          q.options.some((opt) => opt.text.trim().length > 0),
      );
    return hasMeaningfulContent ? draft : null;
  } catch {
    return null;
  }
}

function clearLocalDraft(): void {
  try {
    localStorage.removeItem(QUIZ_DRAFT_STORAGE_KEY);
  } catch {
    // Ignore storage removal errors
  }
}

function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (
    typeof err === "object" &&
    err !== null &&
    "message" in err &&
    typeof (err as { message?: unknown }).message === "string" &&
    (err as { message: string }).message.trim().length > 0
  ) {
    return (err as { message: string }).message;
  }
  return fallback;
}

export function useQuizEditor({ quizId, teacherId, setView }: UseQuizEditorOptions) {
  const { t } = useTranslation();
  const toast = useToast();
  const isEditMode = Boolean(quizId);

  const [metadata, setMetadata] = useState<EditorQuizMetadata>(DEFAULT_METADATA);
  const [questions, setQuestions] = useState<EditorQuestion[]>(() =>
    isEditMode ? [] : [createDefaultQuestion("multiple_choice")],
  );
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [folders, setFolders] = useState<QuizFolder[]>([]);
  const [currentTheme, setCurrentTheme] = useState<QuizTheme | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [dirty, setDirty] = useState<boolean>(false);
  const [attemptedSave, setAttemptedSave] = useState<boolean>(false);
  const [touchedKeys, setTouchedKeys] = useState<Record<string, boolean>>({});
  const [pendingDraft, setPendingDraft] = useState<QuizDraft | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState<{
    image: boolean;
    video: boolean;
    gif: boolean;
    optionIndex: number | null;
  }>({ image: false, video: false, gif: false, optionIndex: null });

  const hydratedRef = useRef<boolean>(false);
  const metadataRef = useRef<EditorQuizMetadata>(metadata);
  const questionsRef = useRef<EditorQuestion[]>(questions);
  const dirtyMetadataRef = useRef<boolean>(false);
  const dirtyQuestionKeysRef = useRef<Set<string>>(new Set());
  const autosaveTimerRef = useRef<number | null>(null);
  const tRef = useRef(t);
  const toastRef = useRef(toast);

  useEffect(() => {
    tRef.current = t;
    toastRef.current = toast;
  }, [t, toast]);

  useEffect(() => {
    metadataRef.current = metadata;
    questionsRef.current = questions;
  }, [metadata, questions]);

  const publishability: QuizPublishabilityResult = useMemo(
    () => isQuizPublishable(metadata, questions),
    [metadata, questions],
  );

  // Monitor online / offline connectivity status
  useEffect(() => {
    const handleOffline = () => setSaveStatus("offline");
    const handleOnline = () => {
      setSaveStatus((prev) => (prev === "offline" ? (dirty ? "unsaved" : "idle") : prev));
    };
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [dirty]);

  // Initial load of folders, theme, quiz data (edit), or draft prompt (new)
  useEffect(() => {
    let cancelled = false;
    hydratedRef.current = false;
    dirtyMetadataRef.current = false;
    dirtyQuestionKeysRef.current.clear();

    async function init() {
      setLoading(true);
      setAttemptedSave(false);
      setTouchedKeys({});

      try {
        if (teacherId) {
          try {
            const loadedFolders = await fetchTeacherFolders(teacherId);
            if (!cancelled) setFolders(loadedFolders);
          } catch (folderErr) {
            console.error("Failed to load folders:", folderErr);
          }
        }

        if (quizId) {
          const bundle = await loadQuizForEditor(quizId);
          if (cancelled) return;
          setMetadata(bundle.quiz.metadata);
          setQuestions(bundle.questions);
          setCurrentTheme(bundle.theme);
          setActiveIndex(0);
          setDirty(false);
          setSaveStatus("idle");
          setPendingDraft(null);
        } else {
          const defaultTheme = await fetchDefaultTheme().catch(() => null);
          if (cancelled) return;
          const initialFolder = readInitialFolderId();
          setMetadata({
            ...DEFAULT_METADATA,
            folder_id: initialFolder,
            theme_id: defaultTheme?.id ?? null,
          });
          setCurrentTheme(defaultTheme);
          setQuestions([createDefaultQuestion("multiple_choice")]);
          setActiveIndex(0);
          setDirty(false);
          setSaveStatus("idle");
          setPendingDraft(readLocalDraft());
        }
      } catch (err) {
        if (!cancelled) {
          toastRef.current.error(getErrorMessage(err, tRef.current("quiz.errorSavingQuestion")));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          hydratedRef.current = true;
        }
      }
    }

    init();
    return () => {
      cancelled = true;
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [quizId, teacherId]);

  // Debounced localStorage draft save (create mode) OR Supabase autosave (edit mode)
  const schedulePersistence = useCallback(() => {
    if (!hydratedRef.current) return;
    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
    }

    if (!quizId) {
      autosaveTimerRef.current = window.setTimeout(() => {
        try {
          const draft: QuizDraft = {
            version: 1,
            savedAt: new Date().toISOString(),
            metadata: metadataRef.current,
            questions: questionsRef.current,
          };
          localStorage.setItem(QUIZ_DRAFT_STORAGE_KEY, JSON.stringify(draft));
        } catch {
          // Ignore quota/storage errors
        }
      }, 600);
      return;
    }

    autosaveTimerRef.current = window.setTimeout(async () => {
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        setSaveStatus("offline");
        return;
      }

      const currentMeta = metadataRef.current;
      const currentQuestions = questionsRef.current;
      const needsMetaSave = dirtyMetadataRef.current && currentMeta.title.trim().length > 0;
      const keysToFlush = Array.from(dirtyQuestionKeysRef.current);

      const validUpdates: Array<{ key: string; question: EditorQuestion; index: number }> = [];
      currentQuestions.forEach((q, idx) => {
        const key = getQuestionKey(q, idx);
        if (keysToFlush.includes(key) && q.id) {
          const res = validateQuestionForEditor(q, { isSurvey: currentMeta.is_survey });
          if (res.valid) {
            validUpdates.push({ key, question: q, index: idx });
          }
        }
      });

      if (!needsMetaSave && validUpdates.length === 0) {
        return;
      }

      setSaveStatus("saving");
      try {
        if (needsMetaSave) {
          await updateQuizMetadata(quizId, currentMeta);
          dirtyMetadataRef.current = false;
          if (currentMeta.is_survey) {
            await normalizeSurveyQuestionsInDb(quizId, currentQuestions);
          }
        }

        for (const item of validUpdates) {
          await updateQuestionInDb(
            item.question.id!,
            item.question,
            item.index,
            currentMeta.is_survey,
          );
          dirtyQuestionKeysRef.current.delete(item.key);
        }

        const stillDirty =
          dirtyMetadataRef.current || dirtyQuestionKeysRef.current.size > 0;
        setDirty(stillDirty);
        setSaveStatus(stillDirty ? "unsaved" : "saved");
      } catch (err) {
        console.error("Autosave failed:", err);
        setSaveStatus(navigator.onLine === false ? "offline" : "unsaved");
      }
    }, 1500);
  }, [quizId]);

  const markDirty = useCallback(
    (metaChanged = false, questionKey?: string) => {
      if (!hydratedRef.current) return;
      if (metaChanged) dirtyMetadataRef.current = true;
      if (questionKey) {
        dirtyQuestionKeysRef.current.add(questionKey);
        setTouchedKeys((prev) => (prev[questionKey] ? prev : { ...prev, [questionKey]: true }));
      }
      setDirty(true);
      setSaveStatus(typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : "unsaved");
      schedulePersistence();
    },
    [schedulePersistence],
  );

  const restoreDraft = useCallback(() => {
    if (!pendingDraft) return;
    setMetadata(pendingDraft.metadata);
    setQuestions(
      pendingDraft.questions.length > 0
        ? pendingDraft.questions
        : [createDefaultQuestion("multiple_choice")],
    );
    setActiveIndex(0);
    setPendingDraft(null);
    setDirty(true);
    setSaveStatus("unsaved");
    if (pendingDraft.metadata.theme_id) {
      fetchThemeById(pendingDraft.metadata.theme_id)
        .then((th) => {
          if (th) setCurrentTheme(th);
        })
        .catch(() => {});
    }
  }, [pendingDraft]);

  const discardDraft = useCallback(() => {
    clearLocalDraft();
    setPendingDraft(null);
  }, []);

  const updateMetadata = useCallback(
    (patch: Partial<EditorQuizMetadata>) => {
      if (!hydratedRef.current) return;
      setMetadata((prev) => {
        const next = { ...prev, ...patch };
        return next;
      });
      if (patch.is_survey) {
        setQuestions((prev) =>
          prev.map((q) => ({
            ...q,
            points: 0,
            options: q.options.map((opt) => ({ ...opt, is_correct: false })),
          })),
        );
      }
      if ("theme_id" in patch) {
        if (patch.theme_id) {
          fetchThemeById(patch.theme_id)
            .then((themeObj) => setCurrentTheme(themeObj))
            .catch(() => {});
        } else {
          setCurrentTheme(null);
        }
      }
      markDirty(true);
    },
    [markDirty],
  );

  const handleThemeSelect = useCallback(
    (themeId: string | null) => {
      if (!hydratedRef.current) return;
      if (themeId === metadataRef.current.theme_id) return;
      updateMetadata({ theme_id: themeId, background_image_url: null });
    },
    [updateMetadata],
  );

  const handleCustomBackgroundChange = useCallback(
    (url: string | null) => {
      if (!hydratedRef.current) return;
      if (url === metadataRef.current.background_image_url) return;
      updateMetadata({ background_image_url: url });
    },
    [updateMetadata],
  );

  const updateQuestionAt = useCallback(
    (index: number, updater: (prev: EditorQuestion) => EditorQuestion) => {
      let targetKey = "";
      setQuestions((prev) =>
        prev.map((q, idx) => {
          if (idx !== index) return q;
          const updated = updater(q);
          targetKey = getQuestionKey(updated, idx);
          return updated;
        }),
      );
      if (targetKey) {
        markDirty(false, targetKey);
      }
    },
    [markDirty],
  );

  const changeQuestionType = useCallback(
    (index: number, nextType: QuestionType) => {
      updateQuestionAt(index, (q) => {
        if (q.question_type === nextType) return q;
        if (nextType === "true_false") {
          const trueCorrect = q.options[0]?.is_correct ?? true;
          return {
            ...q,
            question_type: "true_false",
            options: [
              { text: t("quiz.trueOption", "True"), is_correct: trueCorrect, image_url: "" },
              { text: t("quiz.falseOption", "False"), is_correct: !trueCorrect, image_url: "" },
            ],
          };
        }
        return {
          ...q,
          question_type: "multiple_choice",
          options: [
            q.options[0] || { text: "", is_correct: true, image_url: "" },
            q.options[1] || { text: "", is_correct: false, image_url: "" },
            { text: "", is_correct: false, image_url: "" },
            { text: "", is_correct: false, image_url: "" },
          ],
        };
      });
    },
    [t, updateQuestionAt],
  );

  const addQuestion = useCallback(
    (type: QuestionType = "multiple_choice") => {
      const nextQuestion = createDefaultQuestion(type);
      if (metadataRef.current.is_survey) {
        nextQuestion.points = 0;
        nextQuestion.options = nextQuestion.options.map((o) => ({ ...o, is_correct: false }));
      }
      setQuestions((prev) => {
        const next = [...prev, nextQuestion];
        setActiveIndex(next.length - 1);
        return next;
      });
      markDirty(false, getQuestionKey(nextQuestion, questionsRef.current.length));
    },
    [markDirty],
  );

  const duplicateQuestion = useCallback(
    async (index: number) => {
      const source = questionsRef.current[index];
      if (!source) return;
      const suffix = t("quiz.copySuffix") || "(Copy)";
      const cloned: EditorQuestion = {
        ...source,
        id: undefined,
        tempId: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        question_text: source.question_text ? `${source.question_text} ${suffix}` : "",
        options: source.options.map((opt) => ({ ...opt })),
      };

      let finalInserted = cloned;
      if (quizId && validateQuestionForEditor(cloned, { isSurvey: metadataRef.current.is_survey }).valid) {
        try {
          finalInserted = await insertQuestionInDb(
            quizId,
            cloned,
            index + 1,
            metadataRef.current.is_survey,
          );
        } catch (err) {
          toast.error(err instanceof Error ? err.message : t("quiz.errorDuplicatingQuestion"));
          return;
        }
      }

      const nextList = [...questionsRef.current];
      nextList.splice(index + 1, 0, finalInserted);
      setQuestions(nextList);
      setActiveIndex(index + 1);

      if (quizId && finalInserted.id) {
        const persistedIds = nextList.map((q) => q.id).filter((id): id is string => Boolean(id));
        if (persistedIds.length > 0) {
          reorderQuestionsInDb(persistedIds).catch((err) =>
            console.error("Failed to reorder after duplicate:", err),
          );
        }
      } else {
        markDirty(false, getQuestionKey(finalInserted, index + 1));
      }
    },
    [markDirty, quizId, t, toast],
  );

  const deleteQuestion = useCallback(
    async (index: number) => {
      const target = questionsRef.current[index];
      if (!target) return;

      if (quizId && target.id) {
        try {
          await deleteQuestionInDb(target.id);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : t("quiz.errorDeletingQuestion"));
          return;
        }
      }

      const key = getQuestionKey(target, index);
      dirtyQuestionKeysRef.current.delete(key);

      const remaining = questionsRef.current.filter((_, idx) => idx !== index);
      setQuestions(remaining);
      setActiveIndex((prevActive) => {
        if (remaining.length === 0) return 0;
        if (prevActive > index) return prevActive - 1;
        return Math.min(prevActive, remaining.length - 1);
      });

      if (quizId) {
        const persistedIds = remaining.map((q) => q.id).filter((id): id is string => Boolean(id));
        if (persistedIds.length > 0) {
          reorderQuestionsInDb(persistedIds).catch((err) =>
            console.error("Failed to update order_index after delete:", err),
          );
        }
      } else {
        markDirty(false);
      }
    },
    [markDirty, quizId, t, toast],
  );

  const moveQuestion = useCallback(
    async (fromIndex: number, toIndex: number) => {
      const list = questionsRef.current;
      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= list.length ||
        toIndex >= list.length
      ) {
        return;
      }

      const reordered = [...list];
      const [moved] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, moved);
      const indexed = reordered.map((q, idx) => ({ ...q, order_index: idx }));

      setQuestions(indexed);
      setActiveIndex((prevActive) => {
        if (prevActive === fromIndex) return toIndex;
        if (fromIndex < prevActive && toIndex >= prevActive) return prevActive - 1;
        if (fromIndex > prevActive && toIndex <= prevActive) return prevActive + 1;
        return prevActive;
      });

      if (quizId) {
        const persistedIds = indexed.map((q) => q.id).filter((id): id is string => Boolean(id));
        if (persistedIds.length > 0) {
          try {
            await reorderQuestionsInDb(persistedIds);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : t("quiz.errorReorderingQuestions"));
          }
        }
      } else {
        markDirty(false);
      }
    },
    [markDirty, quizId, t, toast],
  );

  const bulkUpdateTimeAndPoints = useCallback(
    async (updates: { timeLimit?: number; points?: number }) => {
      const nextPoints = metadataRef.current.is_survey ? 0 : updates.points;
      setQuestions((prev) =>
        prev.map((q) => ({
          ...q,
          time_limit: updates.timeLimit !== undefined ? updates.timeLimit : q.time_limit,
          points: nextPoints !== undefined ? nextPoints : q.points,
        })),
      );

      if (quizId) {
        try {
          await bulkUpdateQuestionsInDb(quizId, {
            timeLimit: updates.timeLimit,
            points: nextPoints,
          });
          toast.success(t("editor.savedStatus"));
        } catch (err) {
          toast.error(err instanceof Error ? err.message : t("quiz.errorSavingQuestion"));
          return;
        }
      } else {
        markDirty(false);
        toast.success(t("common.apply"));
      }
    },
    [markDirty, quizId, t, toast],
  );

  const importCsvFile = useCallback(
    async (file: File) => {
      try {
        const content = await file.text();
        const parsed = parseKahootCSV(content, file.name);
        const imported: EditorQuestion[] = parsed.questions.map((q: EditorQuestion) =>
          metadataRef.current.is_survey
            ? { ...q, points: 0, options: q.options.map((o) => ({ ...o, is_correct: false })) }
            : q,
        );

        if (parsed.title && !metadataRef.current.title.trim()) {
          setMetadata((prev) => ({ ...prev, title: parsed.title }));
          if (quizId) dirtyMetadataRef.current = true;
        }

        const currentList = questionsRef.current;
        const onlyEmptyPlaceholder =
          currentList.length === 1 &&
          !currentList[0].id &&
          !currentList[0].question_text.trim() &&
          currentList[0].options.every((o) => !o.text.trim());

        if (quizId) {
          const inserted = await insertQuestionsBatchInDb(
            quizId,
            imported,
            onlyEmptyPlaceholder ? 0 : currentList.length,
            metadataRef.current.is_survey,
          );
          const next = onlyEmptyPlaceholder ? inserted : [...currentList, ...inserted];
          setQuestions(next);
          setActiveIndex(onlyEmptyPlaceholder ? 0 : currentList.length);
        } else {
          const next = onlyEmptyPlaceholder ? imported : [...currentList, ...imported];
          setQuestions(next);
          setActiveIndex(onlyEmptyPlaceholder ? 0 : currentList.length);
          markDirty(Boolean(parsed.title && !metadataRef.current.title.trim()));
        }

        toast.success(`${imported.length} ${t("quiz.questions")}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("quiz.errorSavingQuestion"));
      }
    },
    [markDirty, quizId, t, toast],
  );

  const uploadQuestionMedia = useCallback(
    async (index: number, file: File, type: "image" | "video" | "gif") => {
      const allowedByType: Record<"image" | "video" | "gif", string[]> = {
        image: ["image/jpeg", "image/png", "image/webp", "image/gif"],
        gif: ["image/gif"],
        video: ["video/mp4", "video/webm"],
      };
      const check = validateFileUpload(file, {
        maxSize: type === "video" ? 25 * 1024 * 1024 : 10 * 1024 * 1024,
        allowedTypes: allowedByType[type],
      }) as { valid: boolean; error: string | null };
      if (!check.valid) {
        toast.error(check.error || t("quiz.errorUploadingFile"));
        return;
      }

      setUploadingMedia((prev) => ({ ...prev, [type]: true }));
      try {
        const url =
          type === "video"
            ? await uploadVideo(file)
            : type === "gif"
              ? await uploadGIF(file)
              : await uploadImage(file);

        updateQuestionAt(index, (q) => ({
          ...q,
          image_url: type === "image" ? url : q.image_url,
          video_url: type === "video" ? url : q.video_url,
          gif_url: type === "gif" ? url : q.gif_url,
        }));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("quiz.errorUploadingFile"));
      } finally {
        setUploadingMedia((prev) => ({ ...prev, [type]: false }));
      }
    },
    [t, toast, updateQuestionAt],
  );

  const removeQuestionMedia = useCallback(
    (index: number, type: "image" | "video" | "gif") => {
      updateQuestionAt(index, (q) => ({
        ...q,
        image_url: type === "image" ? "" : q.image_url,
        video_url: type === "video" ? "" : q.video_url,
        gif_url: type === "gif" ? "" : q.gif_url,
      }));
    },
    [updateQuestionAt],
  );

  const uploadOptionImage = useCallback(
    async (questionIndex: number, optionIndex: number, file: File) => {
      const check = validateFileUpload(file, {
        maxSize: 5 * 1024 * 1024,
        allowedTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
      }) as { valid: boolean; error: string | null };
      if (!check.valid) {
        toast.error(check.error || t("quiz.errorUploadingFile"));
        return;
      }
      setUploadingMedia((prev) => ({ ...prev, optionIndex }));
      try {
        const url = await uploadImage(file);
        updateQuestionAt(questionIndex, (q) => ({
          ...q,
          options: q.options.map((opt, oIdx) =>
            oIdx === optionIndex ? { ...opt, image_url: url } : opt,
          ),
        }));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("quiz.errorUploadingFile"));
      } finally {
        setUploadingMedia((prev) => ({ ...prev, optionIndex: null }));
      }
    },
    [t, toast, updateQuestionAt],
  );

  const removeOptionImage = useCallback(
    (questionIndex: number, optionIndex: number) => {
      updateQuestionAt(questionIndex, (q) => ({
        ...q,
        options: q.options.map((opt, oIdx) =>
          oIdx === optionIndex ? { ...opt, image_url: "" } : opt,
        ),
      }));
    },
    [updateQuestionAt],
  );

  const saveQuiz = useCallback(
    async ({ exitAfterSave }: { exitAfterSave: boolean }): Promise<boolean> => {
      setAttemptedSave(true);
      const validation = isQuizPublishable(metadataRef.current, questionsRef.current);

      if (!validation.publishable) {
        const firstInvalidIdx = questionsRef.current.findIndex((q, idx) =>
          Boolean(validation.questionErrors[getQuestionKey(q, idx)]),
        );
        if (firstInvalidIdx >= 0) {
          setActiveIndex(firstInvalidIdx);
        }
        toast.error(validation.summaryErrors[0] || t("editor.validationBlocked"));
        return false;
      }

      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
      }

      setSaving(true);
      setSaveStatus("saving");
      try {
        if (!quizId) {
          if (!teacherId) {
            throw new Error("Missing teacher ID");
          }
          const created = await createQuizWithQuestions({
            createdBy: teacherId,
            metadata: metadataRef.current,
            questions: questionsRef.current,
          });
          clearLocalDraft();
          dirtyMetadataRef.current = false;
          dirtyQuestionKeysRef.current.clear();
          setDirty(false);
          setSaveStatus("saved");
          toast.success(t("editor.savedStatus"));

          if (exitAfterSave) {
            setView?.("manage-quizzes");
          } else {
            setView?.("edit-quiz", created.quizId);
          }
          return true;
        }

        if (dirtyMetadataRef.current) {
          await updateQuizMetadata(quizId, metadataRef.current);
          if (metadataRef.current.is_survey) {
            await normalizeSurveyQuestionsInDb(quizId, questionsRef.current);
          }
        }

        const persistedQuestions: EditorQuestion[] = [];
        for (let idx = 0; idx < questionsRef.current.length; idx += 1) {
          const q = questionsRef.current[idx];
          const key = getQuestionKey(q, idx);
          if (!q.id) {
            const inserted = await insertQuestionInDb(
              quizId,
              q,
              idx,
              metadataRef.current.is_survey,
            );
            persistedQuestions.push(inserted);
            dirtyQuestionKeysRef.current.delete(key);
          } else if (dirtyQuestionKeysRef.current.has(key) || q.order_index !== idx) {
            await updateQuestionInDb(q.id, q, idx, metadataRef.current.is_survey);
            persistedQuestions.push({ ...q, order_index: idx });
            dirtyQuestionKeysRef.current.delete(key);
          } else {
            persistedQuestions.push(q);
          }
        }

        setQuestions(persistedQuestions);
        dirtyMetadataRef.current = false;
        dirtyQuestionKeysRef.current.clear();
        setDirty(false);
        setSaveStatus("saved");
        toast.success(t("editor.savedStatus"));

        if (exitAfterSave) {
          setView?.("manage-quizzes");
        }
        return true;
      } catch (err) {
        const msg = getErrorMessage(err, t("quiz.errorSavingQuestion"));
        toast.error(msg);
        setSaveStatus(navigator.onLine === false ? "offline" : "unsaved");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [quizId, setView, t, teacherId, toast],
  );

  return {
    isEditMode,
    metadata,
    questions,
    activeIndex,
    setActiveIndex,
    folders,
    currentTheme,
    loading,
    saving,
    saveStatus,
    dirty,
    attemptedSave,
    touchedKeys,
    publishability,
    pendingDraft,
    uploadingMedia,
    restoreDraft,
    discardDraft,
    updateMetadata,
    handleThemeSelect,
    handleCustomBackgroundChange,
    updateQuestionAt,
    changeQuestionType,
    addQuestion,
    duplicateQuestion,
    deleteQuestion,
    moveQuestion,
    bulkUpdateTimeAndPoints,
    importCsvFile,
    uploadQuestionMedia,
    removeQuestionMedia,
    uploadOptionImage,
    removeOptionImage,
    saveQuiz,
  };
}
