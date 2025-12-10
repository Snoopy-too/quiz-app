import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../../supabaseClient";
import {
  Plus,
  Trash2,
  Save,
  Upload,
  X,
  GripVertical,
  Clock,
  Award,
  CheckCircle,
  Edit2,
  Copy,
} from "lucide-react";
import { uploadImage, uploadVideo, uploadGIF } from "../../utils/mediaUpload";
import VerticalNav from "../layout/VerticalNav";
import ThemeSelector from "./ThemeSelector";
import AlertModal from "../common/AlertModal";

const generateTempId = () => `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

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

export default function CreateQuiz({ onQuizCreated, setView, appState }) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [themeId, setThemeId] = useState(null);
  const [customThemeUrl, setCustomThemeUrl] = useState(null);
  const [folderId, setFolderId] = useState("");
  const [folders, setFolders] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [activeTab, setActiveTab] = useState("settings");
  const [questionForm, setQuestionForm] = useState(createEmptyQuestion());
  const [questionFormMode, setQuestionFormMode] = useState(null); // 'add' | 'edit' | null
  const [editingQuestionIndex, setEditingQuestionIndex] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [questionError, setQuestionError] = useState(null);
  const [draggedQuestionIndex, setDraggedQuestionIndex] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isTemplate, setIsTemplate] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: "", message: "", type: "info" });

  // Bulk Edit State
  const [selectedQuestions, setSelectedQuestions] = useState(new Set());
  const [bulkTimeLimit, setBulkTimeLimit] = useState(30);
  const [bulkPoints, setBulkPoints] = useState(100);

  // Fetch folders and default theme from DB
  useEffect(() => {
    fetchFolders();
    fetchDefaultTheme();
  }, []);

  const fetchDefaultTheme = async () => {
    try {
      const { data, error } = await supabase
        .from("themes")
        .select("id")
        .eq("is_default", true)
        .single();

      if (!error && data) {
        setThemeId(data.id);
        setCustomThemeUrl(null);
      }
    } catch (err) {
      console.error("Error fetching default theme:", err);
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
    setEditingQuestionIndex(null);
    setQuestionFormMode(null);
    setQuestionError(null);
  };

  const handleAddQuestion = () => {
    setActiveTab("questions");
    setQuestionForm(createEmptyQuestion());
    setEditingQuestionIndex(null);
    setQuestionFormMode("add");
    setQuestionError(null);
  };

  const handleEditQuestion = (index) => {
    const question = questions[index];
    setActiveTab("questions");
    setEditingQuestionIndex(index);
    setQuestionForm({
      question_text: question.question_text,
      question_type: question.question_type,
      time_limit: question.time_limit,
      points: question.points,
      image_url: question.image_url || "",
      video_url: question.video_url || "",
      gif_url: question.gif_url || "",
      options: question.options.map((opt) => ({ ...opt })),
    });
    setQuestionFormMode("edit");
    setQuestionError(null);
  };

  const handleDuplicateQuestion = (index) => {
    setQuestions((prev) => {
      const question = prev[index];
      const duplicate = {
        ...question,
        tempId: generateTempId(),
        question_text: `${question.question_text} (Copy)`,
        options: question.options.map((opt) => ({ ...opt })),
      };
      return [...prev, duplicate];
    });
    setActiveTab("questions");
  };

  const handleDeleteQuestion = (index) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
    if (questionFormMode !== "edit" || editingQuestionIndex === null) return;

    if (editingQuestionIndex === index) {
      resetQuestionForm();
    } else if (editingQuestionIndex > index) {
      setEditingQuestionIndex((prev) => (prev !== null ? prev - 1 : prev));
    }
  };

  const updateOption = (index, field, value) => {
    setQuestionForm((prev) => {
      const updatedOptions = prev.options.map((opt, i) => {
        if (i !== index) return { ...opt };
        return { ...opt, [field]: value };
      });

      if (field === "is_correct" && value) {
        updatedOptions.forEach((opt, i) => {
          if (i !== index) opt.is_correct = false;
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

  const handleMediaUpload = async (e, mediaType) => {
    const file = e.target.files[0];
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
      setQuestionError("Error uploading file: " + err.message);
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

  const handleSaveQuestion = () => {
    if (!questionForm.question_text.trim()) {
      setAlertModal({
        isOpen: true,
        title: t('common.error'),
        message: t('quiz.questionTextRequired') || "Question text is required.",
        type: "error"
      });
      return;
    }

    const hasCorrectAnswer = questionForm.options.some((opt) => opt.is_correct);
    if (!hasCorrectAnswer) {
      setAlertModal({
        isOpen: true,
        title: "Validation Error",
        message: t('quiz.markCorrectAnswer') || "Please mark at least one answer as correct.",
        type: "warning"
      });
      return;
    }

    if (!questionFormMode) {
      return;
    }

    const sanitizedQuestion = {
      tempId:
        questionFormMode === "edit" && editingQuestionIndex !== null
          ? questions[editingQuestionIndex]?.tempId
          : generateTempId(),
      question_text: questionForm.question_text.trim(),
      question_type: questionForm.question_type,
      time_limit: questionForm.time_limit,
      points: questionForm.points,
      image_url: questionForm.image_url || "",
      video_url: questionForm.video_url || "",
      gif_url: questionForm.gif_url || "",
      options: questionForm.options.map((opt) => ({
        text: opt.text.trim(),
        is_correct: opt.is_correct,
      })),
    };

    if (questionFormMode === "edit" && editingQuestionIndex !== null) {
      setQuestions((prev) => {
        const updated = [...prev];
        updated[editingQuestionIndex] = sanitizedQuestion;
        return updated;
      });
    } else if (questionFormMode === "add") {
      setQuestions((prev) => [...prev, sanitizedQuestion]);
    }

    resetQuestionForm();
  };

  const handleDragStart = (e, index) => {
    setDraggedQuestionIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedQuestionIndex === null || draggedQuestionIndex === dropIndex) return;

    setQuestions((prev) => {
      const reordered = [...prev];
      const [moved] = reordered.splice(draggedQuestionIndex, 1);
      reordered.splice(dropIndex, 0, moved);
      return reordered;
    });
    setDraggedQuestionIndex(null);
  };

  const handleSaveQuiz = async (shouldExit = false) => {
    const exit = typeof shouldExit === 'boolean' ? shouldExit : false;
    setSaving(true);
    setError(null);
    setSuccess(null);

    if (!title.trim()) {
      setError("Quiz title is required.");
      setActiveTab("settings");
      setSaving(false);
      return;
    }

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) {
        setError("You must be logged in to create a quiz.");
        setSaving(false);
        return;
      }

      const { data: quizData, error: insertQuizError } = await supabase
        .from("quizzes")
        .insert([
          {
            title: title.trim(),
            theme_id: customThemeUrl ? null : themeId,
            background_image_url: customThemeUrl || null,
            folder_id: folderId || null,
            created_by: user.user.id,
            randomize_questions: false,
            randomize_answers: false,
            is_template: isTemplate,
            is_public: isPublic,
          },
        ])
        .select("id")
        .single();

      if (insertQuizError) throw insertQuizError;

      if (questions.length > 0) {
        const payload = questions.map((question, index) => ({
          quiz_id: quizData.id,
          question_text: question.question_text,
          question_type: question.question_type,
          time_limit: question.time_limit,
          points: question.points,
          options: question.options,
          image_url: question.image_url || null,
          video_url: question.video_url || null,
          gif_url: question.gif_url || null,
          order_index: index,
        }));

        const { error: insertQuestionsError } = await supabase.from("questions").insert(payload);
        if (insertQuestionsError) throw insertQuestionsError;
      }

      if (exit) {
        if (onQuizCreated) onQuizCreated();
        setView("manage-quizzes");
        return;
      }

      setSuccess("Quiz created successfully!");
      setTitle("");
      setFolderId("");
      setQuestions([]);
      setIsTemplate(false);
      setIsPublic(false);
      setActiveTab("settings");
      resetQuestionForm();
      await fetchDefaultTheme();
      setCustomThemeUrl(null);
      if (onQuizCreated) onQuizCreated();
    } catch (err) {
      setError(err.message);
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
            placeholder={t('quiz.questionText')}
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
          <label className="block text-sm font-medium mb-2">{t('quiz.questionText')} ({t('common.or')} Media)</label>
          <div className="grid grid-cols-3 gap-4">
            <div>
              {questionForm.image_url ? (
                <div className="relative">
                  <img src={questionForm.image_url} alt="Preview" className="w-full h-24 object-cover rounded border" />
                  <button
                    onClick={() => removeMedia("image")}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-gray-300 rounded cursor-pointer hover:border-cyan-400">
                  <Upload size={20} className="text-gray-400 mb-1" />
                  <span className="text-xs text-gray-500">Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleMediaUpload(e, "image")}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              )}
            </div>

            <div>
              {questionForm.video_url ? (
                <div className="relative">
                  <video src={questionForm.video_url} className="w-full h-24 object-cover rounded border" controls />
                  <button
                    onClick={() => removeMedia("video")}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-gray-300 rounded cursor-pointer hover:border-cyan-400">
                  <Upload size={20} className="text-gray-400 mb-1" />
                  <span className="text-xs text-gray-500">Video</span>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => handleMediaUpload(e, "video")}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              )}
            </div>

            <div>
              {questionForm.gif_url ? (
                <div className="relative">
                  <img src={questionForm.gif_url} alt="GIF Preview" className="w-full h-24 object-cover rounded border" />
                  <button
                    onClick={() => removeMedia("gif")}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-gray-300 rounded cursor-pointer hover:border-cyan-400">
                  <Upload size={20} className="text-gray-400 mb-1" />
                  <span className="text-xs text-gray-500">GIF</span>
                  <input
                    type="file"
                    accept="image/gif"
                    onChange={(e) => handleMediaUpload(e, "gif")}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              )}
            </div>
          </div>
          {uploading && <p className="text-sm text-blue-700 mt-2">{t('common.loading')}</p>}
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
                  <span className="text-sm">{t('quiz.correctAnswer')}</span>
                </label>
              </div>
            ))}
          </div>
        </div>

        {questionError && <p className="text-sm text-red-600">{questionError}</p>}

        <div className="flex gap-2">
          <button
            onClick={handleSaveQuestion}
            className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
          >
            <Save size={18} />
            {t('common.save')}
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

  return (
    <div className="flex min-h-screen bg-gray-50">
      <VerticalNav currentView="create-quiz" setView={setView} appState={appState} />

      <div className="flex-1 ml-64">
        <nav className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-blue-700">{t('nav.createQuiz')}</h1>
            <div className="flex gap-2">
              <button
                onClick={() => handleSaveQuiz(false)}
                disabled={saving}
                className="bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800 disabled:opacity-50 flex items-center gap-2"
              >
                <Save size={18} />
                {saving ? t('common.loading') : t('common.save')}
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
          {(error || success) && (
            <div className="mt-3">
              {error && <p className="text-sm text-red-600">{error}</p>}
              {success && <p className="text-sm text-green-600">{success}</p>}
            </div>
          )}
        </nav>

        <div className="container mx-auto p-6 max-w-5xl">
          <div className="bg-white shadow-md rounded-lg">
            <div className="flex border-b border-gray-200">
              <button
                className={`flex-1 px-4 py-3 text-sm font-medium transition ${activeTab === "settings"
                  ? "text-blue-700 border-b-2 border-blue-700 bg-blue-50"
                  : "text-gray-600 hover:text-blue-700"
                  }`}
                onClick={() => setActiveTab("settings")}
              >
                {t('nav.settings')}
              </button>
              <button
                className={`flex-1 px-4 py-3 text-sm font-medium transition ${activeTab === "questions"
                  ? "text-blue-700 border-b-2 border-blue-700 bg-blue-50"
                  : "text-gray-600 hover:text-blue-700"
                  }`}
                onClick={() => setActiveTab("questions")}
              >
                {t('quiz.questions')} ({questions.length})
              </button>
            </div>

            <div className="p-6">
              {activeTab === "settings" ? (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('quiz.title')}</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      className="w-full border rounded px-3 py-2 focus:ring focus:ring-blue-300"
                      placeholder={t('quiz.title')}
                    />
                  </div>

                  <div className="border-t pt-4">
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

                  <div>
                    <label className="block text-sm font-medium mb-1">{t('folder.folder')}</label>
                    <select
                      value={folderId}
                      onChange={(e) => setFolderId(e.target.value)}
                      className="w-full border rounded px-3 py-2 focus:ring focus:ring-blue-300"
                    >
                      <option value="">-- No Folder (Top Level) --</option>
                      {folderOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {folders.length === 0 && (
                      <p className="mt-2 text-xs text-gray-500">
                        {t('folder.noFolders')}
                      </p>
                    )}
                  </div>

                  <div className="border-t pt-4 space-y-3">
                    <h3 className="font-semibold text-gray-700">{t('nav.settings')}</h3>

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
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-800">
                        {t('quiz.questions')} ({questions.length})
                      </h2>
                      <p className="text-sm text-gray-500">
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
                      <p className="text-gray-600 mb-6">Start building your quiz by adding questions.</p>
                      <button
                        onClick={handleAddQuestion}
                        className="bg-blue-700 text-white px-6 py-3 rounded-lg hover:bg-blue-800 transition font-medium"
                      >
                        {t('quiz.addQuestion')}
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
                              <select
                                value={bulkTimeLimit}
                                onChange={(e) => setBulkTimeLimit(Number(e.target.value))}
                                className="text-sm border rounded px-2 py-1"
                              >
                                <option value={10}>10s</option>
                                <option value={20}>20s</option>
                                <option value={30}>30s</option>
                                <option value={60}>60s</option>
                                <option value={90}>90s</option>
                                <option value={120}>120s</option>
                              </select>
                              <button
                                onClick={() => {
                                  if (selectedQuestions.size === 0) return;
                                  setQuestions(prev => prev.map((q, i) => selectedQuestions.has(i) ? { ...q, time_limit: bulkTimeLimit } : q));
                                  setSuccess("Time limits updated!");
                                  setTimeout(() => setSuccess(null), 3000);
                                }}
                                disabled={selectedQuestions.size === 0}
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
                                onClick={() => {
                                  if (selectedQuestions.size === 0) return;
                                  setQuestions(prev => prev.map((q, i) => selectedQuestions.has(i) ? { ...q, points: bulkPoints } : q));
                                  setSuccess("Points updated!");
                                  setTimeout(() => setSuccess(null), 3000);
                                }}
                                disabled={selectedQuestions.size === 0}
                                className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 disabled:opacity-50"
                              >
                                {t('common.apply') || "Apply"}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {questions.map((question, index) => {
                        const isEditing = questionFormMode === "edit" && editingQuestionIndex === index;
                        return (
                          <div
                            key={question.tempId || index}
                            draggable={!isEditing}
                            onDragStart={(e) => {
                              if (!isEditing) handleDragStart(e, index);
                            }}
                            onDragOver={(e) => {
                              if (!isEditing) handleDragOver(e);
                            }}
                            onDrop={(e) => {
                              if (!isEditing) handleDrop(e, index);
                            }}
                            className={`bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden ${draggedQuestionIndex === index ? "opacity-50" : ""
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
                                      onClick={() => handleEditQuestion(index)}
                                      className="text-gray-600 hover:text-blue-700 px-2 py-1 rounded"
                                      title="Edit question"
                                    >
                                      <Edit2 size={16} />
                                    </button>
                                    <button
                                      onClick={() => handleDuplicateQuestion(index)}
                                      className="text-gray-600 hover:text-blue-700 px-2 py-1 rounded"
                                      title="Duplicate question"
                                    >
                                      <Copy size={16} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteQuestion(index)}
                                      className="text-gray-600 hover:text-red-600 px-2 py-1 rounded"
                                      title="Delete question"
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
                                        <img
                                          src={question.gif_url}
                                          alt="GIF"
                                          className="rounded-lg max-h-48 object-cover"
                                        />
                                      )}
                                    </div>
                                  )}

                                  <p className="text-lg font-semibold text-gray-900">{question.question_text}</p>

                                  <div className="grid grid-cols-2 gap-3">
                                    {question.options.map((option, optionIndex) => (
                                      <div
                                        key={optionIndex}
                                        className={`p-3 rounded-lg border-2 transition-all ${option.is_correct
                                          ? "bg-green-50 border-green-400 shadow-sm"
                                          : "bg-gray-50 border-gray-200 hover:border-gray-300"
                                          }`}
                                      >
                                        <div className="flex items-start gap-2">
                                          {option.is_correct && (
                                            <CheckCircle size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
                                          )}
                                          <span
                                            className={`text-sm ${option.is_correct ? "font-semibold text-green-900" : "text-gray-700"
                                              }`}
                                          >
                                            {option.text || <em className="text-gray-400">No answer text</em>}
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
                      {renderQuestionEditor(t('quiz.addQuestion'))}
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
              {saving ? t('common.loading') : t('common.save')}
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
    </div>
  );
}
