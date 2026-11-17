import React from "react";
import { useTranslation } from "react-i18next";
import { Play, Edit2, Trash2, Copy, Move, Eye, CheckSquare, Square, Calendar, Users, BarChart3 } from "lucide-react";
import { Badge, Button } from "../../ui";
import {
  DEFAULT_THEME_GRADIENT,
  DEFAULT_THEME_PRIMARY,
  DEFAULT_THEME_TEXT_COLOR,
} from "../../../theme/themeDefaults";

export default function QuizCard({
  quiz,
  themesById,
  selectedQuizzes,
  highlightedQuizId,
  draggedItem,
  handleDragStart,
  toggleQuizSelection,
  handleStartQuiz,
  handleDuplicate,
  handleDelete,
  setMoveQuizModal,
  setAssignQuizModal,
  setViewAssignmentsModal,
  setView,
}) {
  const { t } = useTranslation();

  const translateThemeName = (themeName) => {
    if (!themeName) return t("theme.defaultTheme");

    const lowerName = themeName.toLowerCase();
    const themeKey = `theme.${lowerName}`;

    // Try to translate, if translation key doesn't exist, return original name
    const translated = t(themeKey);
    return translated === themeKey ? themeName : translated;
  };

  const getThemeMeta = (quizItem) => {
    const theme = quizItem.themeDetails || themesById[quizItem.theme_id] || null;
    const customBackground = quizItem.background_image_url;

    if (theme?.background_image_url) {
      return {
        label: translateThemeName(theme.name),
        style: {
          backgroundImage: `url(${theme.background_image_url})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        },
        textColor: theme.text_color || DEFAULT_THEME_TEXT_COLOR,
        overlay: true,
        isCustom: false,
      };
    }

    if (theme && (theme.primary_color || theme.secondary_color)) {
      const primary = theme.primary_color || DEFAULT_THEME_PRIMARY;
      const secondary = theme.secondary_color || primary;
      return {
        label: translateThemeName(theme.name),
        style: {
          background: `linear-gradient(135deg, ${primary}, ${secondary})`,
        },
        textColor: theme.text_color || DEFAULT_THEME_TEXT_COLOR,
        overlay: false,
        isCustom: false,
      };
    }

    if (customBackground) {
      return {
        label: t("theme.customTheme"),
        style: {
          backgroundImage: `url(${customBackground})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        },
        textColor: DEFAULT_THEME_TEXT_COLOR,
        overlay: true,
        isCustom: true,
      };
    }

    return {
      label: t("theme.defaultTheme"),
      style: {
        background: DEFAULT_THEME_GRADIENT,
      },
      textColor: DEFAULT_THEME_TEXT_COLOR,
      overlay: false,
      isCustom: false,
    };
  };

  const isSelected = selectedQuizzes.has(quiz.id);
  const isHighlighted = highlightedQuizId === quiz.id;
  const themeMeta = getThemeMeta(quiz);
  const badgeLabel = themeMeta.label;

  return (
    <div
      data-quiz-id={quiz.id}
      draggable
      onDragStart={(e) => handleDragStart(e, quiz, "quiz")}
      className={`flex flex-col overflow-hidden rounded-2xl border bg-surface shadow-card transition-all duration-200 hover:shadow-pop ${
        isHighlighted || isSelected
          ? "border-brand-500 ring-2 ring-brand-500/20"
          : "border-line"
      } ${draggedItem?.item.id === quiz.id ? "opacity-50" : ""}`}
    >
      {/* Theme Preview */}
      <div className="relative h-28 shrink-0">
        <div className="absolute inset-0" style={themeMeta.style}></div>
        {themeMeta.overlay && <div className="absolute inset-0 bg-black/35" />}
        <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between">
          <span
            className="text-xs font-semibold drop-shadow"
            style={{ color: themeMeta.textColor }}
          >
            {badgeLabel}
          </span>
          {themeMeta.isCustom && (
            <Badge variant="neutral" className="bg-surface/90 text-ink">
              {t("theme.custom")}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        {/* Title and selection */}
        <div className="mb-3 flex flex-1 items-start gap-2.5">
          <button
            type="button"
            aria-label={isSelected ? "Deselect quiz" : "Select quiz"}
            onClick={(e) => {
              e.stopPropagation();
              toggleQuizSelection(quiz.id);
            }}
            className="mt-0.5 shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
          >
            {isSelected ? (
              <CheckSquare size={18} className="text-brand-600" aria-hidden="true" />
            ) : (
              <Square size={18} className="text-ink-subtle hover:text-brand-600" aria-hidden="true" />
            )}
          </button>
          <div className="min-w-0 flex-1">
            <h3 className="mb-1.5 line-clamp-2 text-base font-semibold text-ink">{quiz.title}</h3>

            {/* Category Tag */}
            {quiz.categories?.name && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                <Badge variant="brand">{quiz.categories.name}</Badge>
              </div>
            )}

            {/* Meta info */}
            <div className="flex items-center gap-2 text-xs text-ink-muted">
              <span>{new Date(quiz.created_at).toLocaleDateString()}</span>
              <span>·</span>
              <span>
                {quiz.questionCount}{" "}
                {quiz.questionCount !== 1 ? t("quiz.questions") : t("quiz.question")}
              </span>
            </div>

            {/* Last Live Date */}
            <div className="mt-1 text-xs text-ink-muted">
              {quiz.lastLiveDate ? (
                <span>
                  {t("reports.lastLive", {
                    date: new Date(quiz.lastLiveDate).toLocaleString(undefined, {
                      year: "numeric",
                      month: "numeric",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    }),
                  })}
                </span>
              ) : (
                <span>{t("reports.lastLiveNever")}</span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="border-t border-line pt-3">
          <div className="flex gap-2">
            <Button
              variant="primary"
              size="sm"
              className="flex-1"
              onClick={() => handleStartQuiz(quiz.id)}
              title={t("quiz.startQuiz")}
            >
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
              {t("actions.start")}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={() => setAssignQuizModal(quiz)}
              title={t("assignQuiz.title", "Assign")}
            >
              <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
              {t("assignQuiz.actions", "Assign")}
            </Button>
          </div>

          <div className="mt-2 flex items-center justify-between gap-1">
            <button
              type="button"
              onClick={() => setView("preview-quiz", quiz.id)}
              className="flex flex-1 items-center justify-center rounded-lg p-2 text-ink-muted transition-colors hover:bg-surface-muted hover:text-brand-700"
              title={t("actions.preview")}
              aria-label={t("actions.preview")}
            >
              <Eye className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setView("edit-quiz", quiz.id)}
              className="flex flex-1 items-center justify-center rounded-lg p-2 text-ink-muted transition-colors hover:bg-surface-muted hover:text-brand-700"
              title={t("common.edit")}
              aria-label={t("common.edit")}
            >
              <Edit2 className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => handleDuplicate(quiz.id)}
              className="flex flex-1 items-center justify-center rounded-lg p-2 text-ink-muted transition-colors hover:bg-surface-muted hover:text-brand-700"
              title={t("actions.duplicate")}
              aria-label={t("actions.duplicate")}
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setView("reports", quiz.id)}
              className="flex flex-1 items-center justify-center rounded-lg p-2 text-ink-muted transition-colors hover:bg-surface-muted hover:text-brand-700"
              title={t("reports.actionViewReports", "View Reports")}
              aria-label={t("reports.actionViewReports", "View Reports")}
            >
              <BarChart3 className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setMoveQuizModal(quiz.id)}
              className="flex flex-1 items-center justify-center rounded-lg p-2 text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
              title={t("folder.moveToFolder")}
              aria-label={t("folder.moveToFolder")}
            >
              <Move className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(quiz.id)}
              className="flex flex-1 items-center justify-center rounded-lg p-2 text-ink-muted transition-colors hover:bg-red-50 hover:text-danger-600"
              title={t("common.delete")}
              aria-label={t("common.delete")}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* Assignments Button - only if there are assignments */}
          {quiz.assignmentCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewAssignmentsModal(quiz)}
              className="mt-2 w-full border border-line bg-surface-muted/50"
              title={t("assignQuiz.viewAssignments", "View Assignments")}
            >
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              {t("assignQuiz.viewAssignments", "View Assignments")} ({quiz.assignmentCount})
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
