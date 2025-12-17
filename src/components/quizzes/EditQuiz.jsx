import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../../supabaseClient";
import {
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  Upload,
  X,
  Edit2,
  GripVertical,
  Copy,
  CheckCircle,
  Clock,
  Award,
  Settings,
  HelpCircle,
} from "lucide-react";
import { uploadImage, uploadVideo, uploadGIF } from "../../utils/mediaUpload";
import VerticalNav from "../layout/VerticalNav";
import AlertModal from "../common/AlertModal";
import ConfirmModal from "../common/ConfirmModal";
import ThemeSelector from "./ThemeSelector";
import MediaUploadZone from "./MediaUploadZone";

const getDefaultOptions = (type) =>
  type === "true_false"
    ? [
      { text: "True", is_correct: false },
      { text: "False", is_correct: false },
    ]
    : [
      { text: "", is_correct: false },
      { text: "", is_correct: false },
      { text: "", is_correct: false },
      { text: "", is_correct: false },
    ];

const createEmptyQuestion = (type = "multiple_choice") => ({
  question_text: "",
  question_type: type,
  time_limit: 30,
  points: 100,
  image_url: "",
  video_url: "",
  gif_url: "",
  options: getDefaultOptions(type),
});

export default function EditQuiz({ setView, quizId, appState: _appState }) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [themeId, setThemeId] = useState(null);
  const [customThemeUrl, setCustomThemeUrl] = useState(null);
  const [folderId, setFolderId] = useState("");
  const [isTemplate, setIsTemplate] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [folders, setFolders] = useState([]);
  const [activeTab, setActiveTab] = useState("settings");
  const [questionForm, setQuestionForm] = useState(createEmptyQuestion());
  const [questionFormMode, setQuestionFormMode] = useState(null); // 'add' | 'edit' | null
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [questionError, setQuestionError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [draggedQuestion, setDraggedQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [saving, setSaving] = useState(false);
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: "", message: "", type: "info" });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: "", message: "", onConfirm: null });

  // Bulk Edit State
  const [selectedQuestions, setSelectedQuestions] = useState(new Set());
  const [bulkTimeLimit, setBulkTimeLimit] = useState(30);
  const [bulkPoints, setBulkPoints] = useState(100);

  useEffect(() => {
    if (quizId) {
      fetchQuizAndQuestions();
    }
  }, [quizId]);

  useEffect(() => {
    fetchFolders();
  }, []);

  const fetchQuizAndQuestions = async () => {
    try {
      const { data: quizData, error: quizError } = await supabase
        .from("quizzes")
        .select("id, title, theme_id, background_image_url, folder_id, is_template, is_public")
        .eq("id", quizId)
        .single();

      if (quizError) throw quizError;

      setTitle(quizData.title || "");
      setThemeId(quizData.theme_id);
      setCustomThemeUrl(quizData.theme_id ? null : quizData.background_image_url || null);
      setFolderId(quizData.folder_id || "");
      setIsTemplate(Boolean(quizData.is_template));
      setIsPublic(Boolean(quizData.is_public));

      const { data: questionsData, error: questionsError } = await supabase
        .from("questions")
        .select("*")
        .eq("quiz_id", quizId)
        .order("order_index", { ascending: true });

      if (questionsError) throw questionsError;
      setQuestions(questionsData || []);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchFolders = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) return;

      const { data, error } = await supabase
        .from("quiz_folders")
        .select("id, name, parent_folder_id")
        .eq("created_by", user.user.id)
        .order("name", { ascending: true });

      if (error) throw error;
      setFolders(data || []);
    } catch (err) {
      console.error("Error fetching folders:", err.message);
    }
  };

  const folderOptions = useMemo(() => {
    const options = [];

    const buildOptions = (parentId = null, depth = 0) => {
      const children = folders
        .filter((folder) => folder.parent_folder_id === parentId)
        .sort((a, b) => a.name.localeCompare(b.name));

      children.forEach((folder) => {
        const indent = depth > 0 ? `${"  ".repeat(depth)}- ` : "";
        options.push({
          id: folder.id,
          label: `${indent}${folder.name}`,
        });
        buildOptions(folder.id, depth + 1);
      });
    };

    buildOptions();
    return options;
  }, [folders]);

  const resetQuestionForm = () => {
    setQuestionForm(createEmptyQuestion());
    setQuestionFormMode(null);
    setEditingQuestion(null);
    setQuestionError(null);
  };

  const handleAddQuestion = () => {
    setActiveTab("questions");
    setQuestionForm(createEmptyQuestion());
    setQuestionFormMode("add");
    setEditingQuestion(null);
    setQuestionError(null);
  };

  const handleEditQuestion = (question) => {
    setActiveTab("questions");
    setQuestionForm({
      question_text: question.question_text,
      question_type: question.question_type,
      time_limit: question.time_limit,
      points: question.points,
      image_url: question.image_url || "",
      video_url: question.video_url || "",
      gif_url: question.gif_url || "",
      options:
        question.options && Array.isArray(question.options)
          ? question.options.map((opt) => ({ ...opt }))
          : getDefaultOptions(question.question_type),
    });
    setQuestionFormMode("edit");
    setEditingQuestion(question);
    setQuestionError(null);
  };

  const handleSaveQuestion = async () => {
    if (!questionForm.question_text.trim()) {
      setAlertModal({
        isOpen: true,
        title: t('common.error'),
        message: t('quiz.questionTextRequired'),
        type: "error"
      });
      return;
    }

    const hasCorrectAnswer = questionForm.options.some((opt) => opt.is_correct);
    if (!hasCorrectAnswer) {
      setAlertModal({
        isOpen: true,
        title: "Validation Error",
        message: t('quiz.markCorrectAnswer'),
        type: "warning"
      });
      return;
    }

    if (!questionFormMode) {
      return;
    }

    setSaving(true);
    setQuestionError(null);
    try {
      const payload = {
        question_text: questionForm.question_text.trim(),
        question_type: questionForm.question_type,
        time_limit: questionForm.time_limit,
        points: questionForm.points,
        options: questionForm.options.map((opt) => ({
          text: opt.text.trim(),
          is_correct: opt.is_correct,
        })),
        image_url: questionForm.image_url || null,
        video_url: questionForm.video_url || null,
        gif_url: questionForm.gif_url || null,
      };

      if (questionFormMode === "edit" && editingQuestion) {
        const { error: updateError } = await supabase.from("questions").update(payload).eq("id", editingQuestion.id);
        if (updateError) throw updateError;
      } else if (questionFormMode === "add") {
        const { error: insertError } = await supabase.from("questions").insert([
          {
            ...payload,
            quiz_id: quizId,
            order_index: questions.length,
          },
        ]);
        if (insertError) throw insertError;
      }

      await fetchQuizAndQuestions();
      resetQuestionForm();
    } catch (err) {
      setAlertModal({ isOpen: true, title: t('common.error'), message: t('quiz.errorSavingQuestion') + ": " + err.message, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuestion = (questionId) => {
    setConfirmModal({
      isOpen: true,
      title: t('quiz.deleteQuestion'),
      message: t('quiz.confirmDeleteQuestion'),
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        try {
          const { error: deleteError } = await supabase.from("questions").delete().eq("id", questionId);
          if (deleteError) throw deleteError;
          if (questionFormMode === "edit" && editingQuestion?.id === questionId) {
            resetQuestionForm();
          }
          await fetchQuizAndQuestions();
        } catch (err) {
          setAlertModal({ isOpen: true, title: t('common.error'), message: t('quiz.errorDeletingQuestion') + ": " + err.message, type: "error" });
        }
      },
    });
  };

  const updateOption = (index, field, value) => {
    setQuestionForm((prev) => {
      const updatedOptions = prev.options.map((opt, idx) =>
        idx === index ? { ...opt, [field]: value } : { ...opt },
      );

      if (field === "is_correct" && value) {
        updatedOptions.forEach((opt, idx) => {
          if (idx !== index) opt.is_correct = false;
        });
      }

      return { ...prev, options: updatedOptions };
    });
  };

  const handleQuestionTypeChange = (type) => {
    setQuestionForm((prev) => ({
      ...prev,
      question_type: type,
      options: getDefaultOptions(type),
    }));
  };

  const handleMediaUpload = async (fileOrEvent, mediaType) => {
    let file;
    if (fileOrEvent.target && fileOrEvent.target.files) {
      file = fileOrEvent.target.files[0];
    } else {
      file = fileOrEvent;
    }

    if (!file) return;

    setUploading(true);
    try {
      let url;
      if (mediaType === "image") {
        url = await uploadImage(file);
      } else if (mediaType === "video") {
        url = await uploadVideo(file);
      } else if (mediaType === "gif") {
        url = await uploadGIF(file);
      }

      if (url) {
        setQuestionForm((prev) => ({
          ...prev,
          [`${mediaType}_url`]: url,
        }));
      }
    } catch (err) {
      setAlertModal({ isOpen: true, title: t('common.error'), message: t('quiz.errorUploadingFile') + ": " + err.message, type: "error" });
    } finally {
      setUploading(false);
    }
  };

  const removeMedia = (mediaType) => {
    setQuestionForm((prev) => ({
      ...prev,
      [`${mediaType}_url`]: "",
    }));
  };

  const handleDuplicateQuestion = async (question) => {
    try {
      const { error: insertError } = await supabase.from("questions").insert([
        {
          quiz_id: quizId,
          question_text: `${question.question_text} ${t('quiz.copySuffix')}`,
          question_type: question.question_type,
          time_limit: question.time_limit,
          points: question.points,
          options: question.options,
          image_url: question.image_url,
          video_url: question.video_url,
          gif_url: question.gif_url,
          order_index: questions.length,
        },
      ]);

      if (insertError) throw insertError;
      await fetchQuizAndQuestions();
    } catch (err) {
      setAlertModal({ isOpen: true, title: t('common.error'), message: t('quiz.errorDuplicatingQuestion') + ": " + err.message, type: "error" });
    }
  };

  const handleDragStart = (e, question, index) => {
    if (questionFormMode === "edit" && editingQuestion?.id === question.id) {
      e.preventDefault();
      return;
    }
    setDraggedQuestion({ question, index });
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e, dropIndex) => {
    e.preventDefault();
    if (!draggedQuestion || draggedQuestion.index === dropIndex) return;

    try {
      const reorderedQuestions = [...questions];
      const [movedQuestion] = reorderedQuestions.splice(draggedQuestion.index, 1);
      reorderedQuestions.splice(dropIndex, 0, movedQuestion);

      const updates = reorderedQuestions.map((q, idx) => ({
        id: q.id,
        order_index: idx,
      }));

      for (const update of updates) {
        await supabase.from("questions").update({ order_index: update.order_index }).eq("id", update.id);
      }

      await fetchQuizAndQuestions();
      setDraggedQuestion(null);
    } catch (err) {
      setAlertModal({ isOpen: true, title: t('common.error'), message: t('quiz.errorReorderingQuestions') + ": " + err.message, type: "error" });
    }
  };

  const handleSaveQuiz = async (shouldExit = false) => {
    const exit = typeof shouldExit === 'boolean' ? shouldExit : false;
    setSaving(true);
    setSaveError(null);
    setSuccess(null);

    if (!title.trim()) {
      setSaveError(t('quiz.quizTitleRequired'));
      setActiveTab("settings");
      setSaving(false);
      return;
    }

    try {
      const payload = {
        title: title.trim(),
        theme_id: customThemeUrl ? null : themeId,
        background_image_url: customThemeUrl || null,
        folder_id: folderId || null,
        randomize_questions: false,
        randomize_answers: false,
        is_template: isTemplate,
        is_public: isPublic,
      };

      const { error: updateError } = await supabase.from("quizzes").update(payload).eq("id", quizId);
      if (updateError) throw updateError;

      if (exit) {
        setView("manage-quizzes");
        return;
      }

      setSuccess("Changes saved!");
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const totalPoints = useMemo(
    () => questions.reduce((sum, q) => sum + (q.points || 0), 0),
    [questions],
  );

  const renderQuestionEditor = (heading = null) => (
    <div>
      {heading && <h3 className="text-xl font-bold mb-4">{heading}</h3>}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">{t('quiz.question')}</label>
          <input
            type="text"
            value={questionForm.question_text}
            onChange={(e) => setQuestionForm((prev) => ({ ...prev, question_text: e.target.value }))}
            className="w-full border rounded px-3 py-2"
            placeholder={t('quiz.enterQuestion')}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{t('quiz.questionType')}</label>
          <select
            value={questionForm.question_type}
            onChange={(e) => handleQuestionTypeChange(e.target.value)}
            className="w-full border rounded px-3 py-2"
          >
            <option value="multiple_choice">{t('quiz.multipleChoice')}</option>
            <option value="true_false">{t('quiz.trueFalse')}</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">{t('quiz.mediaOptional')}</label>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <MediaUploadZone
                type="image"
                accept="image/*"
                currentUrl={questionForm.image_url}
                onFileSelect={(file) => handleMediaUpload(file, "image")}
                onRemove={() => removeMedia("image")}
                uploading={uploading}
              />
            </div>

            <div>
              <MediaUploadZone
                type="video"
                accept="video/*"
                currentUrl={questionForm.video_url}
                onFileSelect={(file) => handleMediaUpload(file, "video")}
                onRemove={() => removeMedia("video")}
                uploading={uploading}
              />
            </div>

            <div>
              <MediaUploadZone
                type="gif"
                accept="image/gif"
                currentUrl={questionForm.gif_url}
                onFileSelect={(file) => handleMediaUpload(file, "gif")}
                onRemove={() => removeMedia("gif")}
                uploading={uploading}
              />
            </div>
          </div>
          {uploading && <p className="text-sm text-blue-700 mt-2 font-medium animate-pulse">{t('common.uploading')}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t('quiz.timeLimit')}</label>
            <input
              type="number"
              value={questionForm.time_limit}
              onChange={(e) => {
                const value = parseInt(e.target.value, 10);
                setQuestionForm((prev) => ({
                  ...prev,
                  time_limit: Number.isNaN(value) ? prev.time_limit : value,
                }));
              }}
              className="w-full border rounded px-3 py-2"
              min="5"
              max="120"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('quiz.points')}</label>
            <input
              type="number"
              value={questionForm.points}
              onChange={(e) => {
                const value = parseInt(e.target.value, 10);
                setQuestionForm((prev) => ({
                  ...prev,
                  points: Number.isNaN(value) ? prev.points : value,
                }));
              }}
              className="w-full border rounded px-3 py-2"
              min="10"
              max="1000"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">{t('quiz.answers')}</label>
          <div className="space-y-2">
            {questionForm.options.map((opt, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={opt.text}
                  onChange={(e) => updateOption(idx, "text", e.target.value)}
                  className="flex-1 border rounded px-3 py-2"
                  placeholder={`${t('quiz.option')} ${idx + 1}`}
                  disabled={questionForm.question_type === "true_false"}
                />
                <label className="flex items-center gap-2 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={opt.is_correct}
                    onChange={(e) => updateOption(idx, "is_correct", e.target.checked)}
                    className="w-5 h-5"
                  />
                  <span className="text-sm">{t('quiz.correct')}</span>
                </label>
              </div>
            ))}
          </div>
        </div>

        {questionError && <p className="text-sm text-red-600">{questionError}</p>}

        <div className="flex gap-2">
          <button
            onClick={handleSaveQuestion}
            disabled={saving}
            className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save size={18} />
            {saving ? t('common.saving') : t('quiz.saveQuestion')}
          </button>
          <button
            onClick={resetQuestionForm}
            className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600"
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-xl text-gray-600">{t('quiz.loadingQuiz')}</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-red-600 mb-4">{t('common.error')}: {loadError}</p>
          <button
            onClick={() => setView("manage-quizzes")}
            className="bg-blue-700 text-white px-6 py-3 rounded-lg hover:bg-blue-800"
          >
            {t('quiz.backToQuizzes')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-100 to-blue-50">
      <VerticalNav currentView="manage-quizzes" setView={setView} appState={_appState} />

      <div className="flex-1 ml-64">
        <nav className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setView("manage-quizzes")} className="text-gray-600 hover:text-gray-900 transition">
                <ArrowLeft size={24} />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{title || t('quiz.untitledQuiz')}</h1>
                <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                  <span>
                    {questions.length} {questions.length === 1 ? t('quiz.question') : t('quiz.questions')}
                  </span>
                  <span>•</span>
                  <span>{totalPoints} {t('quiz.totalPoints')}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleSaveQuiz(false)}
                disabled={saving}
                className="bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800 disabled:opacity-50 flex items-center gap-2"
              >
                <Save size={18} />
                {saving ? t('common.saving') : "Save Quiz"}
              </button>
              <button
                onClick={() => handleSaveQuiz(true)}
                disabled={saving}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Save size={18} />
                Save & Exit
              </button>
            </div>
          </div>
          {(saveError || success) && (
            <div className="mt-3">
              {saveError && <p className="text-sm text-red-600">{saveError}</p>}
              {success && <p className="text-sm text-green-600">{success}</p>}
            </div>
          )}
        </nav>

        <div className="container mx-auto p-6 max-w-5xl">
          <div className="shadow-lg rounded-xl border border-gray-200/20" style={{ background: 'linear-gradient(to bottom, #4a7c7e, #3d6668)' }}>
            {/* Improved Tab Navigation */}
            <div className="flex rounded-t-xl overflow-hidden bg-black/20 backdrop-blur-sm">
              <button
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 text-sm font-semibold transition-all duration-200 border-b-2 ${activeTab === "settings"
                  ? "text-white border-white bg-white/10"
                  : "text-gray-300 border-transparent hover:text-white hover:bg-white/5"
                  }`}
                onClick={() => setActiveTab("settings")}
              >
                <Settings size={18} className={activeTab === "settings" ? "text-white" : "text-gray-400"} />
                {t('nav.settings')}
              </button>
              <button
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 text-sm font-semibold transition-all duration-200 border-b-2 ${activeTab === "questions"
                  ? "text-white border-white bg-white/10"
                  : "text-gray-300 border-transparent hover:text-white hover:bg-white/5"
                  }`}
                onClick={() => setActiveTab("questions")}
              >
                <HelpCircle size={18} className={activeTab === "questions" ? "text-white" : "text-gray-400"} />
                {t('quiz.questions')}
                <span className={`ml-1 px-2 py-0.5 text-xs rounded-full ${activeTab === "questions"
                  ? "bg-white text-teal-800"
                  : "bg-gray-700 text-gray-300"
                  }`}>
                  {questions.length}
                </span>
              </button>
            </div>

            <div className="p-6">
              {activeTab === "settings" ? (
                <div className="space-y-6">
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('quiz.quizSettings')}</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">{t('quiz.title')}</label>
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          className="w-full border rounded px-3 py-2 focus:ring focus:ring-blue-300"
                          placeholder={t('quiz.enterQuizTitle')}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">{t('folder.folder')}</label>
                        <select
                          value={folderId}
                          onChange={(e) => setFolderId(e.target.value)}
                          className="w-full border rounded px-3 py-2 focus:ring focus:ring-blue-300"
                        >
                          <option value="">{t('folder.noFolder')}</option>
                          {folderOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        {folders.length === 0 && (
                          <p className="mt-2 text-xs text-gray-500">
                            {t('folder.noFoldersMessage')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <ThemeSelector
                      selectedThemeId={themeId}
                      onThemeSelect={(id) => {
                        setThemeId(id);
                        setCustomThemeUrl(null);
                      }}
                      customBackgroundUrl={customThemeUrl}
                      onCustomBackgroundChange={(url) => {
                        setCustomThemeUrl(url);
                        if (url) {
                          setThemeId(null);
                        }
                      }}
                    />
                  </div>

                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="font-semibold text-gray-700 mb-3">{t('nav.settings')}</h3>
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isTemplate}
                          onChange={(e) => setIsTemplate(e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">{t('quiz.isTemplate')}</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isPublic}
                          onChange={(e) => setIsPublic(e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">{t('quiz.isPublic')}</span>
                      </label>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between text-white">
                    <div>
                      <h2 className="text-lg font-semibold">
                        {t('quiz.questions')} ({questions.length})
                      </h2>
                      <p className="text-sm text-white/80">
                        {questions.length} {questions.length === 1 ? t('quiz.question') : t('quiz.questions')} • {totalPoints} {t('quiz.points')}
                      </p>
                    </div>
                    <button
                      onClick={handleAddQuestion}
                      className="bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition flex items-center gap-2 text-sm font-medium"
                    >
                      <Plus size={16} />
                      {t('quiz.addQuestion')}
                    </button>
                  </div>

                  {questions.length === 0 ? (
                    <div className="bg-gray-50 border border-dashed border-blue-100 rounded-lg p-10 text-center">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
                        <Plus size={32} className="text-blue-700" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">{t('quiz.noQuestions')}</h3>
                      <p className="text-gray-600 mb-6">{t('quiz.startBuildingQuiz')}</p>
                      <button
                        onClick={handleAddQuestion}
                        className="bg-blue-700 text-white px-6 py-3 rounded-lg hover:bg-blue-800 transition font-medium"
                      >
                        {t('quiz.addFirstQuestion')}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Bulk Actions Toolbar */}
                      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm mb-4">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              checked={questions.length > 0 && selectedQuestions.size === questions.length}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedQuestions(new Set(questions.map((_, i) => i)));
                                } else {
                                  setSelectedQuestions(new Set());
                                }
                              }}
                            />
                            <span className="text-sm font-medium text-gray-700">
                              {selectedQuestions.size} {t('common.selected') || "Selected"}
                            </span>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <label className="text-sm text-gray-600 whitespace-nowrap">{t('quiz.timeLimit')}:</label>
                              <input
                                type="number"
                                value={bulkTimeLimit}
                                onChange={(e) => setBulkTimeLimit(Number(e.target.value))}
                                className="text-sm border rounded px-2 py-1 w-20"
                                min="5"
                                max="300"
                                step="5"
                              />
                              <button
                                onClick={async () => {
                                  if (selectedQuestions.size === 0) return;
                                  setSaving(true);
                                  try {
                                    const updates = [];
                                    const newQuestions = [...questions];

                                    selectedQuestions.forEach(index => {
                                      const q = newQuestions[index];
                                      if (!q) return;

                                      // Local update
                                      newQuestions[index] = { ...q, time_limit: bulkTimeLimit };

                                      // DB Update if ID exists (it should in Edit mode)
                                      if (q.id) {
                                        updates.push(supabase.from("questions").update({ time_limit: bulkTimeLimit }).eq("id", q.id));
                                      }
                                    });

                                    setQuestions(newQuestions);
                                    await Promise.all(updates);
                                    setSuccess("Time limits updated!");
                                    setTimeout(() => setSuccess(null), 3000);
                                  } catch (err) {
                                    setAlertModal({ isOpen: true, title: t('common.error'), message: "Failed to update questions.", type: "error" });
                                  } finally {
                                    setSaving(false);
                                  }
                                }}
                                disabled={selectedQuestions.size === 0 || saving}
                                className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 disabled:opacity-50"
                              >
                                {t('common.apply') || "Apply"}
                              </button>
                            </div>

                            <div className="flex items-center gap-2">
                              <label className="text-sm text-gray-600 whitespace-nowrap">{t('quiz.points')}:</label>
                              <input
                                type="number"
                                value={bulkPoints}
                                onChange={(e) => setBulkPoints(Number(e.target.value))}
                                className="text-sm border rounded px-2 py-1 w-20"
                                min="0" step="10"
                              />
                              <button
                                onClick={async () => {
                                  if (selectedQuestions.size === 0) return;
                                  setSaving(true);
                                  try {
                                    const updates = [];
                                    const newQuestions = [...questions];

                                    selectedQuestions.forEach(index => {
                                      const q = newQuestions[index];
                                      if (!q) return;

                                      // Local update
                                      newQuestions[index] = { ...q, points: bulkPoints };

                                      // DB Update if ID exists
                                      if (q.id) {
                                        updates.push(supabase.from("questions").update({ points: bulkPoints }).eq("id", q.id));
                                      }
                                    });

                                    setQuestions(newQuestions);
                                    await Promise.all(updates);
                                    setSuccess("Points updated!");
                                    setTimeout(() => setSuccess(null), 3000);
                                  } catch (err) {
                                    setAlertModal({ isOpen: true, title: t('common.error'), message: "Failed to update questions.", type: "error" });
                                  } finally {
                                    setSaving(false);
                                  }
                                }}
                                disabled={selectedQuestions.size === 0 || saving}
                                className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 disabled:opacity-50"
                              >
                                {t('common.apply') || "Apply"}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {questions.map((question, index) => {
                        const isEditing = questionFormMode === "edit" && editingQuestion?.id === question.id;
                        return (
                          <div
                            key={question.id}
                            draggable={!isEditing}
                            onDragStart={(e) => {
                              if (!isEditing) handleDragStart(e, question, index);
                            }}
                            onDragOver={(e) => {
                              if (!isEditing) handleDragOver(e);
                            }}
                            onDrop={(e) => {
                              if (!isEditing) handleDrop(e, index);
                            }}
                            className={`bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden ${draggedQuestion?.question.id === question.id ? "opacity-50" : ""
                              } ${isEditing ? "ring-2 ring-blue-100 border-cyan-300" : ""}`}
                          >
                            <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`${isEditing ? "text-gray-300 cursor-not-allowed" : "cursor-move text-gray-400 hover:text-gray-600"
                                    }`}
                                >
                                  <GripVertical size={20} />
                                </div>
                                {!isEditing && (
                                  <input
                                    type="checkbox"
                                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    checked={selectedQuestions.has(index)}
                                    onChange={() => {
                                      const newSelected = new Set(selectedQuestions);
                                      if (newSelected.has(index)) {
                                        newSelected.delete(index);
                                      } else {
                                        newSelected.add(index);
                                      }
                                      setSelectedQuestions(newSelected);
                                    }}
                                  />
                                )}
                                <div className="flex items-center gap-2">
                                  <span className="text-lg font-bold text-blue-800 bg-blue-50 px-3 py-1 rounded-full">
                                    Q{index + 1}
                                  </span>
                                  <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <div className="flex items-center gap-1">
                                      <Clock size={14} />
                                      <span>{isEditing ? questionForm.time_limit : question.time_limit}s</span>
                                    </div>
                                    <span>•</span>
                                    <div className="flex items-center gap-1">
                                      <Award size={14} />
                                      <span>{isEditing ? questionForm.points : question.points} pts</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                {!isEditing && (
                                  <>
                                    <button
                                      onClick={() => handleEditQuestion(question)}
                                      className="text-gray-600 hover:text-blue-700 px-2 py-1 rounded"
                                      title={t('quiz.editQuestion')}
                                    >
                                      <Edit2 size={16} />
                                    </button>
                                    <button
                                      onClick={() => handleDuplicateQuestion(question)}
                                      className="text-gray-600 hover:text-blue-700 px-2 py-1 rounded"
                                      title={t('quiz.duplicateQuestion')}
                                    >
                                      <Copy size={16} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteQuestion(question.id)}
                                      className="text-gray-600 hover:text-red-600 px-2 py-1 rounded"
                                      title={t('quiz.deleteQuestion')}
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="p-6 space-y-4">
                              {isEditing ? (
                                renderQuestionEditor()
                              ) : (
                                <>
                                  {(question.image_url || question.video_url || question.gif_url) && (
                                    <div className="mb-4">
                                      {question.image_url && (
                                        <img
                                          src={question.image_url}
                                          alt="Question"
                                          className="rounded-lg max-h-48 object-cover"
                                        />
                                      )}
                                      {question.video_url && (
                                        <video src={question.video_url} controls className="rounded-lg max-h-48 w-full" />
                                      )}
                                      {question.gif_url && (
                                        <img src={question.gif_url} alt="GIF" className="rounded-lg max-h-48 object-cover" />
                                      )}
                                    </div>
                                  )}

                                  <p className="text-lg font-semibold text-gray-900">{question.question_text}</p>

                                  <div className="grid grid-cols-2 gap-3">
                                    {question.options?.map((opt, idx) => (
                                      <div
                                        key={idx}
                                        className={`p-3 rounded-lg border-2 transition-all ${opt.is_correct
                                          ? "bg-green-50 border-green-400 shadow-sm"
                                          : "bg-gray-50 border-gray-200 hover:border-gray-300"
                                          }`}
                                      >
                                        <div className="flex items-start gap-2">
                                          {opt.is_correct && (
                                            <CheckCircle size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
                                          )}
                                          <span
                                            className={`text-sm ${opt.is_correct ? "font-semibold text-green-900" : "text-gray-700"
                                              }`}
                                          >
                                            {opt.text || <em className="text-gray-400">{t('quiz.noAnswerText')}</em>}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {questions.length > 0 && questionFormMode !== "add" && (
                    <div className="flex justify-center mt-6">
                      <button
                        onClick={handleAddQuestion}
                        className="bg-blue-700 text-white px-6 py-3 rounded-lg hover:bg-blue-800 transition flex items-center gap-2 font-medium"
                      >
                        <Plus size={18} />
                        {t('quiz.addQuestion')}
                      </button>
                    </div>
                  )}

                  {questionFormMode === "add" && (
                    <div className="bg-white border border-blue-100 rounded-lg shadow-sm p-6">
                      {renderQuestionEditor(t('quiz.addNewQuestion'))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSaveQuiz}
              disabled={saving}
              className="bg-blue-700 text-white px-6 py-3 rounded-lg hover:bg-blue-800 disabled:opacity-50 flex items-center gap-2"
            >
              <Save size={20} />
              {saving ? t('common.saving') : "Save Quiz"}
            </button>
          </div>
        </div>
      </div>

      <AlertModal
        isOpen={alertModal.isOpen}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
      />
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        confirmStyle="danger"
      />
    </div>
  );
}
