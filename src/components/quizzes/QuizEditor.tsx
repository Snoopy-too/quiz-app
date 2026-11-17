import { useEffect, useId, useRef, useState } from "react";
import { useBlocker } from "react-router";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  ImagePlus,
  Plus,
  Save,
  SlidersHorizontal,
  Trash2,
  Upload,
  WifiOff,
  X,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Dialog,
  EmptyState,
  Field,
  IconButton,
  Input,
  PageHeader,
  Select,
  Skeleton,
  Spinner,
  Textarea,
  cn,
} from "../ui";
import ConfirmModal from "../common/ConfirmModal";
import MediaUploadZone from "./MediaUploadZone";
import ThemeSelector from "./ThemeSelector";
import { useQuizEditor, type SaveStatus } from "../../hooks/useQuizEditor";
import { getQuestionKey, type EditorQuestion, type QuestionType } from "../../schemas/quiz";
import {
  DEFAULT_THEME_PRIMARY,
  DEFAULT_THEME_SECONDARY,
  DEFAULT_THEME_TEXT_COLOR,
} from "../../theme/themeDefaults";

const ANSWER_STRIPE_CLASSES = [
  "border-l-4 border-l-answer-1",
  "border-l-4 border-l-answer-2",
  "border-l-4 border-l-answer-3",
  "border-l-4 border-l-answer-4",
];

const ANSWER_BADGE_CLASSES = [
  "bg-answer-1 text-white",
  "bg-answer-2 text-white",
  "bg-answer-3 text-white",
  "bg-answer-4 text-white",
];

const TIME_OPTIONS = [5, 10, 15, 20, 30, 45, 60, 90, 120];
const POINTS_OPTIONS = [0, 50, 100, 200, 500, 1000];

export interface QuizEditorProps {
  quizId?: string;
  setView?: (view: string, data?: unknown) => void;
  appState?: {
    currentUser?: {
      id?: string;
    } | null;
  };
}

function SaveStatusBadge({ status }: { status: SaveStatus }) {
  const { t } = useTranslation();

  if (status === "idle") return null;

  if (status === "saving") {
    return (
      <Badge variant="brand">
        <Spinner size="sm" label={t("editor.savingStatus")} />
        <span>{t("editor.savingStatus")}</span>
      </Badge>
    );
  }
  if (status === "saved") {
    return (
      <Badge variant="success">
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{t("editor.savedStatus")}</span>
      </Badge>
    );
  }
  if (status === "offline") {
    return (
      <Badge variant="warning">
        <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{t("editor.offlineStatus")}</span>
      </Badge>
    );
  }
  return <Badge variant="neutral">{t("editor.unsavedStatus")}</Badge>;
}

export default function QuizEditor({ quizId, setView, appState }: QuizEditorProps) {
  const { t } = useTranslation();
  const teacherId = appState?.currentUser?.id ?? null;

  const editor = useQuizEditor({ quizId, teacherId, setView });

  const [mobileTab, setMobileTab] = useState<"questions" | "editor" | "settings">("editor");
  const [rightPaneTab, setRightPaneTab] = useState<"settings" | "preview">("settings");
  const [showRightPane, setShowRightPane] = useState<boolean>(true);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null);
  const [showGlobalConfirm, setShowGlobalConfirm] = useState<boolean>(false);
  const [showBulkDialog, setShowBulkDialog] = useState<boolean>(false);
  const [bulkTime, setBulkTime] = useState<string>("30");
  const [bulkPoints, setBulkPoints] = useState<string>("100");
  const [applyBulkTime, setApplyBulkTime] = useState<boolean>(true);
  const [applyBulkPoints, setApplyBulkPoints] = useState<boolean>(true);

  const csvInputRef = useRef<HTMLInputElement | null>(null);
  const optionImageRefs = useRef<Array<HTMLInputElement | null>>([]);

  const bulkTimeId = useId();
  const bulkPointsId = useId();

  // Protect unsaved changes on tab close/reload and React Router route changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (editor.dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [editor.dirty]);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      editor.dirty && currentLocation.pathname !== nextLocation.pathname,
  );

  const activeQuestion: EditorQuestion | undefined = editor.questions[editor.activeIndex];
  const activeKey = activeQuestion ? getQuestionKey(activeQuestion, editor.activeIndex) : "";
  const activeErrors = activeKey ? editor.publishability.questionErrors[activeKey] || [] : [];
  const showActiveErrors =
    activeErrors.length > 0 && (editor.attemptedSave || Boolean(editor.touchedKeys[activeKey]));

  const handleQuestionKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (!e.altKey) return;
    if (e.key === "ArrowUp" && idx > 0) {
      e.preventDefault();
      editor.moveQuestion(idx, idx - 1);
    } else if (e.key === "ArrowDown" && idx < editor.questions.length - 1) {
      e.preventDefault();
      editor.moveQuestion(idx, idx + 1);
    }
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await editor.bulkUpdateTimeAndPoints({
      timeLimit: applyBulkTime ? Number(bulkTime) : undefined,
      points: applyBulkPoints && !editor.metadata.is_survey ? Number(bulkPoints) : undefined,
    });
    setShowBulkDialog(false);
  };

  const previewStyle = (() => {
    if (editor.metadata.background_image_url) {
      return {
        backgroundImage: `url(${editor.metadata.background_image_url})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        color: DEFAULT_THEME_TEXT_COLOR,
      };
    }
    if (editor.currentTheme?.background_image_url) {
      return {
        backgroundImage: `url(${editor.currentTheme.background_image_url})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        color: editor.currentTheme.text_color || DEFAULT_THEME_TEXT_COLOR,
      };
    }
    const primary = editor.currentTheme?.primary_color || DEFAULT_THEME_PRIMARY;
    const secondary = editor.currentTheme?.secondary_color || DEFAULT_THEME_SECONDARY;
    return {
      background: `linear-gradient(135deg, ${primary}, ${secondary})`,
      color: editor.currentTheme?.text_color || DEFAULT_THEME_TEXT_COLOR,
    };
  })();

  if (editor.loading) {
    return (
      <div className="min-h-screen bg-canvas">
        <PageHeader title={quizId ? t("editor.editQuizTitle") : t("editor.newQuizTitle")} />
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)_320px] gap-6">
          <Skeleton className="h-[460px] w-full rounded-xl" />
          <Skeleton className="h-[460px] w-full rounded-xl" />
          <Skeleton className="h-[460px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <PageHeader
        title={editor.metadata.title.trim() || (editor.isEditMode ? t("editor.editQuizTitle") : t("editor.newQuizTitle"))}
        breadcrumbs={
          <button
            type="button"
            onClick={() => setView?.("manage-quizzes")}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-ink transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t("quiz.backToQuizzes")}</span>
          </button>
        }
        actions={
          <>
            <SaveStatusBadge status={editor.saveStatus} />
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) editor.importCsvFile(file);
                e.target.value = "";
              }}
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => csvInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
              <span>{t("quiz.importCSV")}</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowBulkDialog(true)}
              disabled={editor.questions.length === 0}
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{t("quiz.timeLimit")} / {t("quiz.points")}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="hidden lg:inline-flex"
              aria-pressed={showRightPane}
              onClick={() => {
                setShowRightPane((prev) => {
                  const next = !prev;
                  if (next) setRightPaneTab("preview");
                  return next;
                });
              }}
            >
              <Eye className="h-4 w-4" aria-hidden="true" />
              <span>{t("editor.previewPane")}</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              loading={editor.saving}
              onClick={() => editor.saveQuiz({ exitAfterSave: false })}
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              <span>{t("common.save")}</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={editor.saving}
              onClick={() => editor.saveQuiz({ exitAfterSave: true })}
            >
              <span>{t("editor.publish")}</span>
            </Button>
          </>
        }
      />

      {/* Mobile tab bar */}
      <div
        role="tablist"
        aria-label={t("quiz.editQuiz")}
        className="lg:hidden border-b border-line bg-surface px-4 flex gap-2"
      >
        {(
          [
            { id: "questions", label: `${t("editor.questionsPane")} (${editor.questions.length})` },
            { id: "editor", label: t("quiz.editQuestion") },
            { id: "settings", label: `${t("editor.settingsPane")} & ${t("editor.previewPane")}` },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={mobileTab === tab.id}
            onClick={() => setMobileTab(tab.id)}
            className={cn(
              "px-3 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
              mobileTab === tab.id
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-ink-muted hover:text-ink",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main 3-pane workspace */}
      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        <div
          className={cn(
            "grid grid-cols-1 gap-6 items-start",
            showRightPane
              ? "lg:grid-cols-[260px_minmax(0,1fr)_320px]"
              : "lg:grid-cols-[260px_minmax(0,1fr)]",
          )}
        >
          {/* Left Pane: Question List */}
          <aside
            aria-label={t("editor.questionsPane")}
            className={cn(
              "space-y-3",
              mobileTab !== "questions" && "hidden lg:block",
            )}
          >
            <Card>
              <CardHeader className="flex items-center justify-between py-3 px-4">
                <span className="text-sm font-semibold text-ink">
                  {t("editor.questionsPane")} ({editor.questions.length})
                </span>
              </CardHeader>
              <CardBody className="p-2.5 space-y-2 max-h-[60vh] overflow-y-auto" role="list">
                {editor.questions.length === 0 ? (
                  <p className="text-xs text-ink-muted px-2 py-4 text-center">
                    {t("quiz.noQuestions")}
                  </p>
                ) : (
                  editor.questions.map((q, idx) => {
                    const key = getQuestionKey(q, idx);
                    const qErrors = editor.publishability.questionErrors[key] || [];
                    const hasVisibleError =
                      qErrors.length > 0 && (editor.attemptedSave || Boolean(editor.touchedKeys[key]));
                    const isActive = idx === editor.activeIndex;

                    return (
                      <div
                        key={key}
                        role="listitem"
                        draggable
                        onDragStart={() => setDraggedIndex(idx)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => {
                          if (draggedIndex !== null) {
                            editor.moveQuestion(draggedIndex, idx);
                            setDraggedIndex(null);
                          }
                        }}
                        onDragEnd={() => setDraggedIndex(null)}
                        className={cn(
                          "rounded-lg border transition-all p-2.5",
                          isActive
                            ? "border-brand-500 bg-brand-50/50 ring-1 ring-brand-500"
                            : "border-line bg-surface hover:bg-surface-muted/60",
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              editor.setActiveIndex(idx);
                              setMobileTab("editor");
                            }}
                            onKeyDown={(e) => handleQuestionKeyDown(e, idx)}
                            className="flex-1 min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 rounded"
                          >
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-800 shrink-0">
                                {idx + 1}
                              </span>
                              <span className="text-[11px] font-medium text-ink-muted uppercase">
                                {q.question_type === "true_false" ? "T/F" : "MC"}
                              </span>
                              <span className="text-[11px] text-ink-muted">
                                · {q.time_limit}s
                              </span>
                              {hasVisibleError && (
                                <AlertCircle
                                  className="h-3.5 w-3.5 text-danger-600 ml-auto shrink-0"
                                  aria-label={qErrors[0]}
                                />
                              )}
                            </div>
                            <p className="text-xs font-medium text-ink truncate">
                              {q.question_text.trim() || t("quiz.enterQuestion")}
                            </p>
                          </button>
                        </div>

                        <div className="mt-2 pt-1.5 border-t border-line/60 flex items-center justify-between gap-1">
                          <div className="flex items-center gap-0.5">
                            <IconButton
                              size="sm"
                              aria-label={t("editor.moveUp")}
                              disabled={idx === 0}
                              onClick={() => editor.moveQuestion(idx, idx - 1)}
                            >
                              <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                            </IconButton>
                            <IconButton
                              size="sm"
                              aria-label={t("editor.moveDown")}
                              disabled={idx === editor.questions.length - 1}
                              onClick={() => editor.moveQuestion(idx, idx + 1)}
                            >
                              <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                            </IconButton>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <IconButton
                              size="sm"
                              aria-label={t("quiz.duplicateQuestion")}
                              onClick={() => editor.duplicateQuestion(idx)}
                            >
                              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                            </IconButton>
                            <IconButton
                              size="sm"
                              aria-label={t("quiz.deleteQuestion")}
                              onClick={() => setDeleteConfirmIndex(idx)}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-danger-600" aria-hidden="true" />
                            </IconButton>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardBody>
              <div className="p-2.5 border-t border-line flex flex-col gap-1.5">
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    editor.addQuestion("multiple_choice");
                    setMobileTab("editor");
                  }}
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  <span>{t("quiz.addQuestion")}</span>
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    editor.addQuestion("true_false");
                    setMobileTab("editor");
                  }}
                >
                  <span>+ {t("quiz.trueFalse")}</span>
                </Button>
              </div>
            </Card>
          </aside>

          {/* Center Pane: Active Question + Answer Editor */}
          <section
            aria-label={t("quiz.editQuestion")}
            className={cn(
              "space-y-4 min-w-0",
              mobileTab !== "editor" && "hidden lg:block",
            )}
          >
            {/* Quiz Title Bar inside workspace so user never hunts for title */}
            <Card>
              <CardBody className="p-4">
                <Field
                  label={t("quiz.title")}
                  required
                  error={
                    editor.attemptedSave ? editor.publishability.titleError : null
                  }
                >
                  <Input
                    value={editor.metadata.title}
                    maxLength={200}
                    placeholder={t("quiz.enterQuizTitle")}
                    onChange={(e) => editor.updateMetadata({ title: e.target.value })}
                  />
                </Field>
              </CardBody>
            </Card>

            {!activeQuestion ? (
              <Card>
                <CardBody>
                  <EmptyState
                    title={t("quiz.noQuestions")}
                    description={t("editor.selectQuestionPrompt")}
                    primaryAction={{
                      label: t("quiz.addFirstQuestion"),
                      onClick: () => editor.addQuestion("multiple_choice"),
                    }}
                  />
                </CardBody>
              </Card>
            ) : (
              <Card>
                <CardHeader className="flex flex-wrap items-center justify-between gap-3 py-3.5 px-5">
                  <div className="flex items-center gap-2">
                    <Badge variant="brand">
                      {t("quiz.question")} {editor.activeIndex + 1}
                    </Badge>
                    {editor.metadata.is_survey && (
                      <Badge variant="neutral">Survey</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="w-40">
                      <Select
                        aria-label={t("quiz.questionType")}
                        value={activeQuestion.question_type}
                        onChange={(e) =>
                          editor.changeQuestionType(
                            editor.activeIndex,
                            e.target.value as QuestionType,
                          )
                        }
                      >
                        <option value="multiple_choice">{t("quiz.multipleChoice")}</option>
                        <option value="true_false">{t("quiz.trueFalse")}</option>
                      </Select>
                    </div>
                    <div className="w-28">
                      <Select
                        aria-label={t("quiz.timeLimit")}
                        value={String(activeQuestion.time_limit)}
                        onChange={(e) =>
                          editor.updateQuestionAt(editor.activeIndex, (q) => ({
                            ...q,
                            time_limit: Number(e.target.value),
                          }))
                        }
                      >
                        {TIME_OPTIONS.map((sec) => (
                          <option key={sec} value={String(sec)}>
                            {sec}s
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="w-28">
                      <Select
                        aria-label={t("quiz.points")}
                        disabled={editor.metadata.is_survey}
                        value={String(editor.metadata.is_survey ? 0 : activeQuestion.points)}
                        onChange={(e) =>
                          editor.updateQuestionAt(editor.activeIndex, (q) => ({
                            ...q,
                            points: Number(e.target.value),
                          }))
                        }
                      >
                        {POINTS_OPTIONS.map((pts) => (
                          <option key={pts} value={String(pts)}>
                            {pts} pts
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>
                </CardHeader>

                <CardBody className="space-y-5">
                  {showActiveErrors && (
                    <div
                      role="alert"
                      className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger-600 flex items-start gap-2"
                    >
                      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
                      <span>{activeErrors[0]}</span>
                    </div>
                  )}

                  <Field label={t("quiz.questionText")} required>
                    <Textarea
                      rows={3}
                      maxLength={500}
                      placeholder={t("quiz.enterQuestion")}
                      value={activeQuestion.question_text}
                      onChange={(e) =>
                        editor.updateQuestionAt(editor.activeIndex, (q) => ({
                          ...q,
                          question_text: e.target.value,
                        }))
                      }
                    />
                  </Field>

                  {/* Media Upload Section */}
                  <div>
                    <p className="text-sm font-medium text-ink mb-2">
                      {t("quiz.mediaOptional")}
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      <MediaUploadZone
                        type="image"
                        accept="image/*"
                        currentUrl={activeQuestion.image_url}
                        uploading={editor.uploadingMedia.image}
                        onFileSelect={(file: File, mediaType: "image" | "video" | "gif") =>
                          editor.uploadQuestionMedia(editor.activeIndex, file, mediaType)
                        }
                        onRemove={(mediaType: "image" | "video" | "gif") =>
                          editor.removeQuestionMedia(editor.activeIndex, mediaType)
                        }
                      />
                      <MediaUploadZone
                        type="video"
                        accept="video/*"
                        currentUrl={activeQuestion.video_url}
                        uploading={editor.uploadingMedia.video}
                        onFileSelect={(file: File, mediaType: "image" | "video" | "gif") =>
                          editor.uploadQuestionMedia(editor.activeIndex, file, mediaType)
                        }
                        onRemove={(mediaType: "image" | "video" | "gif") =>
                          editor.removeQuestionMedia(editor.activeIndex, mediaType)
                        }
                      />
                      <MediaUploadZone
                        type="gif"
                        accept="image/gif"
                        currentUrl={activeQuestion.gif_url}
                        uploading={editor.uploadingMedia.gif}
                        onFileSelect={(file: File, mediaType: "image" | "video" | "gif") =>
                          editor.uploadQuestionMedia(editor.activeIndex, file, mediaType)
                        }
                        onRemove={(mediaType: "image" | "video" | "gif") =>
                          editor.removeQuestionMedia(editor.activeIndex, mediaType)
                        }
                      />
                    </div>
                  </div>

                  {/* Answer Options Editor */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-ink">{t("quiz.answers")}</span>
                      {!editor.metadata.is_survey && (
                        <span className="text-xs text-ink-muted">
                          {t("quiz.correctAnswer")}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {activeQuestion.options.map((opt, optIdx) => {
                        const stripeClass =
                          ANSWER_STRIPE_CLASSES[optIdx % ANSWER_STRIPE_CLASSES.length];
                        const badgeClass =
                          ANSWER_BADGE_CLASSES[optIdx % ANSWER_BADGE_CLASSES.length];
                        const isUploadingOption = editor.uploadingMedia.optionIndex === optIdx;

                        return (
                          <div
                            key={optIdx}
                            className={cn(
                              "rounded-xl border border-line bg-surface p-3 space-y-2.5 shadow-sm",
                              stripeClass,
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold shrink-0",
                                  badgeClass,
                                )}
                              >
                                {optIdx + 1}
                              </span>
                              <Input
                                aria-label={`${t("quiz.option")} ${optIdx + 1}`}
                                value={opt.text}
                                maxLength={200}
                                placeholder={`${t("quiz.option")} ${optIdx + 1}`}
                                onChange={(e) =>
                                  editor.updateQuestionAt(editor.activeIndex, (q) => ({
                                    ...q,
                                    options: q.options.map((item, i) =>
                                      i === optIdx ? { ...item, text: e.target.value } : item,
                                    ),
                                  }))
                                }
                              />
                              {!editor.metadata.is_survey && (
                                <button
                                  type="button"
                                  aria-pressed={Boolean(opt.is_correct)}
                                  aria-label={`${t("quiz.correct")} — ${t("quiz.option")} ${optIdx + 1}`}
                                  onClick={() =>
                                    editor.updateQuestionAt(editor.activeIndex, (q) => ({
                                      ...q,
                                      options: q.options.map((item, i) =>
                                        i === optIdx
                                          ? { ...item, is_correct: !item.is_correct }
                                          : item,
                                      ),
                                    }))
                                  }
                                  className={cn(
                                    "h-9 w-9 rounded-lg border flex items-center justify-center shrink-0 transition-colors",
                                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500",
                                    opt.is_correct
                                      ? "bg-success-600 border-success-600 text-white"
                                      : "bg-surface-muted border-line text-ink-muted hover:text-ink",
                                  )}
                                >
                                  <Check className="h-4 w-4" aria-hidden="true" />
                                </button>
                              )}
                            </div>

                            {opt.image_url ? (
                              <div className="relative inline-block">
                                <img
                                  src={opt.image_url}
                                  alt={`${t("quiz.option")} ${optIdx + 1}`}
                                  className="h-16 w-24 object-cover rounded-lg border border-line"
                                />
                                <button
                                  type="button"
                                  aria-label={t("theme.removeImage")}
                                  onClick={() => editor.removeOptionImage(editor.activeIndex, optIdx)}
                                  className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-danger-600 text-white flex items-center justify-center shadow-sm"
                                >
                                  <X className="h-3 w-3" aria-hidden="true" />
                                </button>
                              </div>
                            ) : (
                              <div>
                                <input
                                  ref={(el) => {
                                    optionImageRefs.current[optIdx] = el;
                                  }}
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      editor.uploadOptionImage(editor.activeIndex, optIdx, file);
                                    }
                                    e.target.value = "";
                                  }}
                                />
                                <button
                                  type="button"
                                  disabled={isUploadingOption}
                                  onClick={() => optionImageRefs.current[optIdx]?.click()}
                                  className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-ink transition-colors"
                                >
                                  <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
                                  <span>
                                    {isUploadingOption ? t("common.uploading") : t("quiz.image")}
                                  </span>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardBody>
              </Card>
            )}
          </section>

          {/* Right Pane: Settings & Live Student Preview */}
          {(showRightPane || mobileTab === "settings") && (
            <aside
              aria-label={t("editor.settingsPane")}
              className={cn(
                "space-y-4",
                mobileTab !== "settings" && "hidden lg:block",
              )}
            >
              <Card>
                <div className="border-b border-line px-3 flex gap-1">
                  <button
                    type="button"
                    onClick={() => setRightPaneTab("settings")}
                    className={cn(
                      "px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors",
                      rightPaneTab === "settings"
                        ? "border-brand-600 text-brand-700"
                        : "border-transparent text-ink-muted hover:text-ink",
                    )}
                  >
                    {t("editor.settingsPane")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRightPaneTab("preview")}
                    className={cn(
                      "px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors",
                      rightPaneTab === "preview"
                        ? "border-brand-600 text-brand-700"
                        : "border-transparent text-ink-muted hover:text-ink",
                    )}
                  >
                    {t("editor.previewPane")}
                  </button>
                </div>

                <CardBody className="p-4 space-y-4">
                  {rightPaneTab === "preview" ? (
                    <div className="space-y-3">
                      <p className="text-xs text-ink-muted">{t("editor.previewNotice")}</p>
                      <div
                        className="rounded-xl p-4 min-h-[280px] flex flex-col justify-between shadow-inner overflow-hidden"
                        style={previewStyle}
                      >
                        <div className="bg-black/35 backdrop-blur-sm rounded-lg p-3 text-center">
                          <p className="text-xs opacity-80 mb-1">
                            {editor.metadata.title || t("quiz.untitledQuiz")}
                          </p>
                          <p className="text-sm font-bold leading-snug">
                            {activeQuestion?.question_text || t("quiz.enterQuestion")}
                          </p>
                          {(activeQuestion?.image_url || activeQuestion?.gif_url) && (
                            <img
                              src={activeQuestion.image_url || activeQuestion.gif_url || ""}
                              alt="Question preview"
                              className="mt-2 mx-auto max-h-24 rounded object-contain"
                            />
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-1.5 mt-3">
                          {(activeQuestion?.options || []).map((opt, idx) => (
                            <div
                              key={idx}
                              className={cn(
                                "rounded-md px-2 py-2 text-[11px] font-semibold text-white truncate",
                                ANSWER_BADGE_CLASSES[idx % ANSWER_BADGE_CLASSES.length],
                              )}
                            >
                              {opt.text || `${t("quiz.option")} ${idx + 1}`}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Field label={t("folder.folder")}>
                        <Select
                          value={editor.metadata.folder_id || ""}
                          onChange={(e) =>
                            editor.updateMetadata({ folder_id: e.target.value || null })
                          }
                        >
                          <option value="">{t("folder.noFolder")}</option>
                          {editor.folders.map((folder) => (
                            <option key={folder.id} value={folder.id}>
                              {folder.name}
                            </option>
                          ))}
                        </Select>
                      </Field>

                      <div>
                        <p className="text-sm font-medium text-ink mb-2">{t("quiz.theme")}</p>
                        <ThemeSelector
                          selectedThemeId={editor.metadata.theme_id}
                          onThemeSelect={editor.handleThemeSelect}
                          customBackgroundUrl={editor.metadata.background_image_url}
                          onCustomBackgroundChange={editor.handleCustomBackgroundChange}
                        />
                      </div>

                      <div className="space-y-2.5 pt-2 border-t border-line">
                        <label className="flex items-center gap-2.5 text-sm text-ink cursor-pointer">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-line text-brand-600"
                            checked={editor.metadata.is_public}
                            onChange={(e) =>
                              editor.updateMetadata({ is_public: e.target.checked })
                            }
                          />
                          <span>{t("quiz.isPublic")}</span>
                        </label>

                        <label className="flex items-center gap-2.5 text-sm text-ink cursor-pointer">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-line text-brand-600"
                            checked={editor.metadata.is_global}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setShowGlobalConfirm(true);
                              } else {
                                editor.updateMetadata({ is_global: false });
                              }
                            }}
                          />
                          <span>{t("quiz.isGlobal")}</span>
                        </label>

                        <label className="flex items-center gap-2.5 text-sm text-ink cursor-pointer">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-line text-brand-600"
                            checked={editor.metadata.is_template}
                            onChange={(e) =>
                              editor.updateMetadata({ is_template: e.target.checked })
                            }
                          />
                          <span>{t("quiz.isTemplate")}</span>
                        </label>

                        <label className="flex items-center gap-2.5 text-sm text-ink cursor-pointer">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-line text-brand-600"
                            checked={editor.metadata.is_course_material}
                            onChange={(e) =>
                              editor.updateMetadata({ is_course_material: e.target.checked })
                            }
                          />
                          <span>{t("quiz.isCourseMaterial")}</span>
                        </label>

                        <label className="flex items-center gap-2.5 text-sm text-ink cursor-pointer">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-line text-brand-600"
                            checked={editor.metadata.is_survey}
                            onChange={(e) =>
                              editor.updateMetadata({ is_survey: e.target.checked })
                            }
                          />
                          <span>Survey (ungraded)</span>
                        </label>
                      </div>
                    </div>
                  )}
                </CardBody>
              </Card>
            </aside>
          )}
        </div>
      </div>

      {/* Restore Draft Dialog */}
      <Dialog
        open={Boolean(editor.pendingDraft)}
        onClose={editor.discardDraft}
        title={t("editor.restoreDraftTitle")}
        description={t("editor.restoreDraftMessage")}
        footer={
          <>
            <Button variant="secondary" onClick={editor.discardDraft}>
              {t("editor.discardDraft")}
            </Button>
            <Button variant="primary" onClick={editor.restoreDraft}>
              {t("editor.restoreDraft")}
            </Button>
          </>
        }
      />

      {/* Route Leave Confirmation Dialog */}
      <Dialog
        open={blocker.state === "blocked"}
        onClose={() => blocker.reset?.()}
        title={t("editor.unsavedStatus")}
        description={t("editor.unsavedLeaveConfirm")}
        footer={
          <>
            <Button variant="secondary" onClick={() => blocker.reset?.()}>
              {t("common.cancel")}
            </Button>
            <Button variant="danger" onClick={() => blocker.proceed?.()}>
              {t("common.confirm")}
            </Button>
          </>
        }
      />

      {/* Bulk Time & Points Dialog */}
      <Dialog
        open={showBulkDialog}
        onClose={() => setShowBulkDialog(false)}
        title={`${t("quiz.timeLimit")} & ${t("quiz.points")}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowBulkDialog(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" form="bulk-edit-form" variant="primary">
              {t("common.apply")}
            </Button>
          </>
        }
      >
        <form id="bulk-edit-form" onSubmit={handleBulkSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm font-medium text-ink">
              <input
                type="checkbox"
                checked={applyBulkTime}
                onChange={(e) => setApplyBulkTime(e.target.checked)}
              />
              <span>{t("quiz.timeLimit")}</span>
            </label>
            <Select
              id={bulkTimeId}
              disabled={!applyBulkTime}
              value={bulkTime}
              onChange={(e) => setBulkTime(e.target.value)}
            >
              {TIME_OPTIONS.map((sec) => (
                <option key={sec} value={String(sec)}>
                  {sec} {t("time.seconds")}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm font-medium text-ink">
              <input
                type="checkbox"
                checked={applyBulkPoints}
                disabled={editor.metadata.is_survey}
                onChange={(e) => setApplyBulkPoints(e.target.checked)}
              />
              <span>{t("quiz.points")}</span>
            </label>
            <Select
              id={bulkPointsId}
              disabled={!applyBulkPoints || editor.metadata.is_survey}
              value={bulkPoints}
              onChange={(e) => setBulkPoints(e.target.value)}
            >
              {POINTS_OPTIONS.map((pts) => (
                <option key={pts} value={String(pts)}>
                  {pts} pts
                </option>
              ))}
            </Select>
          </div>
        </form>
      </Dialog>

      {/* Delete Question Confirmation */}
      <ConfirmModal
        isOpen={deleteConfirmIndex !== null}
        title={t("quiz.deleteQuestion")}
        message={t("quiz.confirmDeleteQuestion")}
        confirmStyle="danger"
        confirmText={t("common.delete")}
        cancelText={t("common.cancel")}
        onCancel={() => setDeleteConfirmIndex(null)}
        onConfirm={async () => {
          if (deleteConfirmIndex !== null) {
            await editor.deleteQuestion(deleteConfirmIndex);
            setDeleteConfirmIndex(null);
          }
        }}
      />

      {/* Global Quiz Warning Confirmation */}
      <ConfirmModal
        isOpen={showGlobalConfirm}
        title={t("quiz.globalQuizWarningTitle")}
        message={t("quiz.globalQuizWarning")}
        confirmText={t("common.confirm")}
        cancelText={t("common.cancel")}
        onCancel={() => setShowGlobalConfirm(false)}
        onConfirm={() => {
          editor.updateMetadata({ is_global: true, is_public: true });
          setShowGlobalConfirm(false);
        }}
      />
    </div>
  );
}
