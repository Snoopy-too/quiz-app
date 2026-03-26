import React from "react";
import { useTranslation } from "react-i18next";
import { Play, Edit2, Trash2, Copy, Move, Eye, CheckSquare, Square, Calendar, Users } from "lucide-react";

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
    if (!themeName) return t('theme.defaultTheme');

    const lowerName = themeName.toLowerCase();
    const themeKey = `theme.${lowerName}`;

    // Try to translate, if translation key doesn't exist, return original name
    const translated = t(themeKey);
    return translated === themeKey ? themeName : translated;
  };

  const getThemeMeta = (quiz) => {
    const theme = quiz.themeDetails || themesById[quiz.theme_id] || null;
    const customBackground = quiz.background_image_url;

    if (theme?.background_image_url) {
      return {
        label: translateThemeName(theme.name),
        style: {
          backgroundImage: `url(${theme.background_image_url})`,
          backgroundSize: "cover",
          backgroundPosition: "center"
        },
        textColor: theme.text_color || "#FFFFFF",
        overlay: true,
        isCustom: false
      };
    }

    if (theme && (theme.primary_color || theme.secondary_color)) {
      const primary = theme.primary_color || "#7C3AED";
      const secondary = theme.secondary_color || primary;
      return {
        label: translateThemeName(theme.name),
        style: {
          background: `linear-gradient(135deg, ${primary}, ${secondary})`
        },
        textColor: theme.text_color || "#FFFFFF",
        overlay: false,
        isCustom: false
      };
    }

    if (customBackground) {
      return {
        label: t('theme.customTheme'),
        style: {
          backgroundImage: `url(${customBackground})`,
          backgroundSize: "cover",
          backgroundPosition: "center"
        },
        textColor: "#FFFFFF",
        overlay: true,
        isCustom: true
      };
    }

    return {
      label: t('theme.defaultTheme'),
      style: {
        background: "linear-gradient(135deg, #7C3AED, #2563EB)"
      },
      textColor: "#FFFFFF",
      overlay: false,
      isCustom: false
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
      className={`bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-200 overflow-hidden border-2 ${
        isHighlighted
          ? "border-blue-500 ring-2 ring-blue-300 shadow-lg shadow-blue-100"
          : isSelected
            ? "border-cyan-400 ring-2 ring-blue-100"
            : "border-transparent"
        } ${draggedItem?.item.id === quiz.id ? "opacity-50" : ""}`}
    >
      {/* Theme Preview */}
      <div className="relative h-28">
        <div className="absolute inset-0" style={themeMeta.style}></div>
        {themeMeta.overlay && <div className="absolute inset-0 bg-black/35" />}
        <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between">
          <span
            className="text-sm text-blue-700 drop-shadow"
            style={{ color: themeMeta.textColor }}
          >
            {badgeLabel}
          </span>
          {themeMeta.isCustom && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/80 text-gray-700">{t('theme.custom')}</span>
          )}
        </div>
      </div>

      <div className="p-4">
        {/* Title and selection */}
        <div className="flex items-start gap-3 mb-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleQuizSelection(quiz.id);
            }}
            className="mt-1 flex-shrink-0"
          >
            {isSelected ? (
              <CheckSquare size={20} className="text-blue-700" />
            ) : (
              <Square size={20} className="text-gray-400 hover:text-blue-700" />
            )}
          </button>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{quiz.title}</h3>

            {/* Tags/Badges */}
            {quiz.categories?.name && (
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="text-xs px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-300">
                  {quiz.categories.name}
                </span>
              </div>
            )}

            {/* Meta info */}
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>{new Date(quiz.created_at).toLocaleDateString()}</span>
              <span>•</span>
              <span>{quiz.questionCount} {quiz.questionCount !== 1 ? t('quiz.questions') : t('quiz.question')}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons - Horizontal row */}
        <div className="flex items-center gap-1 pt-3 border-t border-gray-100 flex-wrap">
          <div className="flex gap-1 w-full mb-2">
            <button
              onClick={() => handleStartQuiz(quiz.id)}
              className="flex-1 bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 transition text-sm font-medium flex items-center justify-center gap-1.5"
              title={t('quiz.startQuiz')}
            >
              <Play size={14} />
              {t('actions.start')}
            </button>
            <button
              onClick={() => setAssignQuizModal(quiz)}
              className="flex-1 bg-orange-600 text-white px-3 py-2 rounded-md hover:bg-orange-700 transition text-sm font-medium flex items-center justify-center gap-1.5"
              title={t('assignQuiz.title', "Assign")}
            >
              <Calendar size={14} />
              {t('assignQuiz.actions', "Assign")}
            </button>
          </div>

          <div className="flex gap-1 justify-between w-full">
            <button
              onClick={() => setView("preview-quiz", quiz.id)}
              className="p-2 bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition flex-1 flex justify-center"
              title={t('actions.preview')}
            >
              <Eye size={16} />
            </button>
            <button
              onClick={() => setView("edit-quiz", quiz.id)}
              className="p-2 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition flex-1 flex justify-center"
              title={t('common.edit')}
            >
              <Edit2 size={16} />
            </button>
            <button
              onClick={() => handleDuplicate(quiz.id)}
              className="p-2 bg-blue-50 text-blue-800 rounded-md hover:bg-blue-50 transition flex-1 flex justify-center"
              title={t('actions.duplicate')}
            >
              <Copy size={16} />
            </button>
            <button
              onClick={() => setMoveQuizModal(quiz.id)}
              className="p-2 bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100 transition flex-1 flex justify-center"
              title={t('folder.moveToFolder')}
            >
              <Move size={16} />
            </button>
            <button
              onClick={() => handleDelete(quiz.id)}
              className="p-2 bg-red-50 text-red-700 rounded-md hover:bg-red-100 transition flex-1 flex justify-center"
              title={t('common.delete')}
            >
              <Trash2 size={16} />
            </button>
          </div>

          {/* Assignments Button - only if there are assignments */}
          {quiz.assignmentCount > 0 && (
            <button
              onClick={() => setViewAssignmentsModal(quiz)}
              className="w-full mt-2 p-2 bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 transition flex items-center justify-center gap-2 text-sm font-medium"
              title={t('assignQuiz.viewAssignments', "View Assignments")}
            >
              <Users size={14} />
              {t('assignQuiz.viewAssignments', "View Assignments")} ({quiz.assignmentCount})
            </button>
          )}

        </div>
      </div>
    </div>
  );
}
