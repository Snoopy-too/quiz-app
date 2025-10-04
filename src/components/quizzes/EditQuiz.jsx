import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { Plus, Trash2, Save, ArrowLeft, Upload, X, Edit2, GripVertical, Copy, CheckCircle, Eye, Clock, Award } from "lucide-react";
import { uploadImage, uploadVideo, uploadGIF } from "../../utils/mediaUpload";
import VerticalNav from "../layout/VerticalNav";
import AlertModal from "../common/AlertModal";
import ConfirmModal from "../common/ConfirmModal";
import ThemeSelector from "./ThemeSelector";

export default function EditQuiz({ setView, quizId, appState }) {
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [themeId, setThemeId] = useState(null);
  const [showThemeSelector, setShowThemeSelector] = useState(false);

  // Form for new/editing question
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [questionForm, setQuestionForm] = useState({
    question_text: "",
    question_type: "multiple_choice",
    time_limit: 30,
    points: 100,
    image_url: "",
    video_url: "",
    gif_url: "",
    options: [
      { text: "", is_correct: false },
      { text: "", is_correct: false },
      { text: "", is_correct: false },
      { text: "", is_correct: false },
    ],
  });
  const [uploading, setUploading] = useState(false);
  const [draggedQuestion, setDraggedQuestion] = useState(null);
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: "", message: "", type: "info" });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: "", message: "", onConfirm: null });

  useEffect(() => {
    if (quizId) {
      fetchQuizAndQuestions();
    }
  }, [quizId]);

  const fetchQuizAndQuestions = async () => {
    try {
      // Fetch quiz details with category and theme
      const { data: quizData, error: quizError } = await supabase
        .from("quizzes")
        .select("id, title, theme_id, category_id, categories(name), themes(name)")
        .eq("id", quizId)
        .single();

      if (quizError) throw quizError;
      setQuiz(quizData);
      setThemeId(quizData.theme_id);

      // Fetch questions
      const { data: questionsData, error: questionsError } = await supabase
        .from("questions")
        .select("*")
        .eq("quiz_id", quizId)
        .order("order_index", { ascending: true });

      if (questionsError) throw questionsError;
      setQuestions(questionsData || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = () => {
    setEditingQuestion(null);
    setShowQuestionForm(true);
    setQuestionForm({
      question_text: "",
      question_type: "multiple_choice",
      time_limit: 30,
      points: 100,
      image_url: "",
      video_url: "",
      gif_url: "",
      options: [
        { text: "", is_correct: false },
        { text: "", is_correct: false },
        { text: "", is_correct: false },
        { text: "", is_correct: false },
      ],
    });
  };

  const handleEditQuestion = (question) => {
    setEditingQuestion(question);
    setShowQuestionForm(true);
    setQuestionForm({
      question_text: question.question_text,
      question_type: question.question_type,
      time_limit: question.time_limit,
      points: question.points,
      image_url: question.image_url || "",
      video_url: question.video_url || "",
      gif_url: question.gif_url || "",
      options: question.options || [
        { text: "", is_correct: false },
        { text: "", is_correct: false },
        { text: "", is_correct: false },
        { text: "", is_correct: false },
      ],
    });
  };

  const handleSaveQuestion = async () => {
    if (!questionForm.question_text.trim()) {
      setAlertModal({ isOpen: true, title: "Validation Error", message: "Question text is required", type: "error" });
      return;
    }

    const hasCorrectAnswer = questionForm.options.some((opt) => opt.is_correct);
    if (!hasCorrectAnswer) {
      setAlertModal({ isOpen: true, title: "Validation Error", message: "Please mark at least one answer as correct", type: "error" });
      return;
    }

    setSaving(true);
    try {
      const questionData = {
        question_text: questionForm.question_text,
        question_type: questionForm.question_type,
        time_limit: questionForm.time_limit,
        points: questionForm.points,
        options: questionForm.options,
        image_url: questionForm.image_url || null,
        video_url: questionForm.video_url || null,
        gif_url: questionForm.gif_url || null,
      };

      if (editingQuestion) {
        // Update existing question
        const { error: updateError } = await supabase
          .from("questions")
          .update(questionData)
          .eq("id", editingQuestion.id);

        if (updateError) throw updateError;
      } else {
        // Insert new question
        const { error: insertError } = await supabase.from("questions").insert([
          {
            ...questionData,
            quiz_id: quizId,
            order_index: questions.length,
          },
        ]);

        if (insertError) throw insertError;
      }

      await fetchQuizAndQuestions();
      setEditingQuestion(null);
      setShowQuestionForm(false);
      setQuestionForm({
        question_text: "",
        question_type: "multiple_choice",
        time_limit: 30,
        points: 100,
        image_url: "",
        video_url: "",
        gif_url: "",
        options: [
          { text: "", is_correct: false },
          { text: "", is_correct: false },
          { text: "", is_correct: false },
          { text: "", is_correct: false },
        ],
      });
    } catch (err) {
      setAlertModal({ isOpen: true, title: "Error", message: "Error saving question: " + err.message, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Question",
      message: "Are you sure you want to delete this question?",
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        try {
          const { error: deleteError } = await supabase
            .from("questions")
            .delete()
            .eq("id", questionId);

          if (deleteError) throw deleteError;
          await fetchQuizAndQuestions();
        } catch (err) {
          setAlertModal({ isOpen: true, title: "Error", message: "Error deleting question: " + err.message, type: "error" });
        }
      }
    });
  };

  const updateOption = (index, field, value) => {
    const newOptions = [...questionForm.options];
    newOptions[index][field] = value;

    // If marking as correct, unmark others for single-answer questions
    if (field === "is_correct" && value) {
      newOptions.forEach((opt, i) => {
        if (i !== index) opt.is_correct = false;
      });
    }

    setQuestionForm({ ...questionForm, options: newOptions });
  };

  const handleQuestionTypeChange = (type) => {
    if (type === "true_false") {
      setQuestionForm({
        ...questionForm,
        question_type: type,
        options: [
          { text: "True", is_correct: false },
          { text: "False", is_correct: false },
        ],
      });
    } else {
      setQuestionForm({
        ...questionForm,
        question_type: type,
        options: [
          { text: "", is_correct: false },
          { text: "", is_correct: false },
          { text: "", is_correct: false },
          { text: "", is_correct: false },
        ],
      });
    }
  };

  const handleMediaUpload = async (e, mediaType) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      let url;
      if (mediaType === "image") {
        url = await uploadImage(file);
        setQuestionForm({ ...questionForm, image_url: url });
      } else if (mediaType === "video") {
        url = await uploadVideo(file);
        setQuestionForm({ ...questionForm, video_url: url });
      } else if (mediaType === "gif") {
        url = await uploadGIF(file);
        setQuestionForm({ ...questionForm, gif_url: url });
      }
    } catch (error) {
      setAlertModal({ isOpen: true, title: "Error", message: "Error uploading file: " + error.message, type: "error" });
    } finally {
      setUploading(false);
    }
  };

  const removeMedia = (mediaType) => {
    setQuestionForm({ ...questionForm, [`${mediaType}_url`]: "" });
  };

  const handleDuplicateQuestion = async (question) => {
    try {
      const { error: insertError } = await supabase.from("questions").insert([
        {
          quiz_id: quizId,
          question_text: `${question.question_text} (Copy)`,
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
      setAlertModal({ isOpen: true, title: "Error", message: "Error duplicating question: " + err.message, type: "error" });
    }
  };

  const handleSaveTheme = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("quizzes")
        .update({ theme_id: themeId })
        .eq("id", quizId);

      if (error) throw error;

      await fetchQuizAndQuestions();
      setShowThemeSelector(false);
      setAlertModal({ isOpen: true, title: "Success", message: "Theme updated successfully!", type: "success" });
    } catch (err) {
      setAlertModal({ isOpen: true, title: "Error", message: "Error updating theme: " + err.message, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e, question, index) => {
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

      // Update order_index for all questions
      const updates = reorderedQuestions.map((q, idx) => ({
        id: q.id,
        order_index: idx,
      }));

      for (const update of updates) {
        await supabase
          .from("questions")
          .update({ order_index: update.order_index })
          .eq("id", update.id);
      }

      await fetchQuizAndQuestions();
      setDraggedQuestion(null);
    } catch (err) {
      setAlertModal({ isOpen: true, title: "Error", message: "Error reordering questions: " + err.message, type: "error" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-xl text-gray-600">Loading quiz...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-red-600 mb-4">Error: {error}</p>
          <button
            onClick={() => setView("manage-quizzes")}
            className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700"
          >
            Back to Quizzes
          </button>
        </div>
      </div>
    );
  }

  const totalPoints = questions.reduce((sum, q) => sum + (q.points || 0), 0);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Vertical Navigation */}
      <VerticalNav currentView="manage-quizzes" setView={setView} appState={appState} />

      {/* Main Content */}
      <div className="flex-1 ml-64">
        {/* Top Navigation */}
        <nav className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setView("manage-quizzes")}
              className="text-gray-600 hover:text-gray-900 transition"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{quiz?.title}</h1>
              <div className="flex items-center gap-3 mt-1">
                {quiz?.categories?.name && (
                  <span className="text-sm text-gray-600 px-2 py-0.5 bg-indigo-100 rounded-full">
                    {quiz.categories.name}
                  </span>
                )}
                {quiz?.themes?.name && (
                  <button
                    onClick={() => setShowThemeSelector(true)}
                    className="text-sm text-gray-600 px-2 py-0.5 bg-purple-100 rounded-full hover:bg-purple-200 transition cursor-pointer"
                    title="Click to change theme"
                  >
                    🎨 {quiz.themes.name}
                  </button>
                )}
                <span className="text-sm text-gray-500">•</span>
                <span className="text-sm text-gray-600">{questions.length} questions</span>
                <span className="text-sm text-gray-500">•</span>
                <span className="text-sm text-gray-600">{totalPoints} total points</span>
              </div>
            </div>
          </div>
          </div>
        </nav>

        {/* Sticky Toolbar */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-700">
            Questions ({questions.length})
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAddQuestion}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition flex items-center gap-2 text-sm font-medium"
            >
              <Plus size={16} />
              Add Question
            </button>
            </div>
          </div>
        </div>

        <div className="container mx-auto p-6 max-w-5xl">
        {/* Questions List */}
        <div className="mb-6">

          {questions.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus size={32} className="text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No questions yet</h3>
              <p className="text-gray-600 mb-6">Start building your quiz by adding questions</p>
              <button
                onClick={handleAddQuestion}
                className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition font-medium"
              >
                Add Your First Question
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((q, idx) => (
                <div
                  key={q.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, q, idx)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, idx)}
                  className={`bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 overflow-hidden ${
                    draggedQuestion?.question.id === q.id ? "opacity-50" : ""
                  }`}
                >
                  {/* Question Header */}
                  <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="cursor-move text-gray-400 hover:text-gray-600">
                        <GripVertical size={20} />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-purple-700 bg-purple-100 px-3 py-1 rounded-full">
                          Q{idx + 1}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Clock size={14} />
                            <span>{q.time_limit}s</span>
                          </div>
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            <Award size={14} />
                            <span>{q.points} pts</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditQuestion(q)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Edit Question"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDuplicateQuestion(q)}
                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition"
                        title="Duplicate Question"
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Delete Question"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Question Body */}
                  <div className="p-6">
                    {/* Media Preview */}
                    {(q.image_url || q.video_url || q.gif_url) && (
                      <div className="mb-4">
                        {q.image_url && (
                          <img src={q.image_url} alt="Question" className="rounded-lg max-h-48 object-cover" />
                        )}
                        {q.video_url && (
                          <video src={q.video_url} controls className="rounded-lg max-h-48 w-full" />
                        )}
                        {q.gif_url && (
                          <img src={q.gif_url} alt="GIF" className="rounded-lg max-h-48 object-cover" />
                        )}
                      </div>
                    )}

                    {/* Question Text */}
                    <p className="text-lg font-semibold text-gray-900 mb-4">{q.question_text}</p>

                    {/* Answer Options */}
                    <div className="grid grid-cols-2 gap-3">
                      {q.options?.map((opt, i) => (
                        <div
                          key={i}
                          className={`p-3 rounded-lg border-2 transition-all ${
                            opt.is_correct
                              ? "bg-green-50 border-green-400 shadow-sm"
                              : "bg-gray-50 border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {opt.is_correct && (
                              <CheckCircle size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
                            )}
                            <span className={`text-sm ${opt.is_correct ? "font-semibold text-green-900" : "text-gray-700"}`}>
                              {opt.text}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              </div>
            )}
          </div>

          {/* Question Form */}
          {showQuestionForm && (
            <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold mb-4">
              {editingQuestion ? "Edit Question" : "Add New Question"}
            </h3>

            <div className="space-y-4">
              {/* Question Text */}
              <div>
                <label className="block text-sm font-medium mb-1">Question</label>
                <input
                  type="text"
                  value={questionForm.question_text}
                  onChange={(e) =>
                    setQuestionForm({ ...questionForm, question_text: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2"
                  placeholder="Enter your question"
                />
              </div>

              {/* Question Type */}
              <div>
                <label className="block text-sm font-medium mb-1">Question Type</label>
                <select
                  value={questionForm.question_type}
                  onChange={(e) => handleQuestionTypeChange(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="multiple_choice">Multiple Choice</option>
                  <option value="true_false">True/False</option>
                </select>
              </div>

              {/* Media Upload */}
              <div>
                <label className="block text-sm font-medium mb-2">Media (Optional)</label>
                <div className="grid grid-cols-3 gap-4">
                  {/* Image Upload */}
                  <div>
                    {questionForm.image_url ? (
                      <div className="relative">
                        <img
                          src={questionForm.image_url}
                          alt="Preview"
                          className="w-full h-24 object-cover rounded border"
                        />
                        <button
                          onClick={() => removeMedia("image")}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-gray-300 rounded cursor-pointer hover:border-purple-500">
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

                  {/* Video Upload */}
                  <div>
                    {questionForm.video_url ? (
                      <div className="relative">
                        <video
                          src={questionForm.video_url}
                          className="w-full h-24 object-cover rounded border"
                          controls
                        />
                        <button
                          onClick={() => removeMedia("video")}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-gray-300 rounded cursor-pointer hover:border-purple-500">
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

                  {/* GIF Upload */}
                  <div>
                    {questionForm.gif_url ? (
                      <div className="relative">
                        <img
                          src={questionForm.gif_url}
                          alt="GIF Preview"
                          className="w-full h-24 object-cover rounded border"
                        />
                        <button
                          onClick={() => removeMedia("gif")}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-gray-300 rounded cursor-pointer hover:border-purple-500">
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
                {uploading && <p className="text-sm text-purple-600 mt-2">Uploading...</p>}
              </div>

              {/* Time & Points */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Time Limit (seconds)</label>
                  <input
                    type="number"
                    value={questionForm.time_limit}
                    onChange={(e) =>
                      setQuestionForm({ ...questionForm, time_limit: parseInt(e.target.value) })
                    }
                    className="w-full border rounded px-3 py-2"
                    min="5"
                    max="120"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Points</label>
                  <input
                    type="number"
                    value={questionForm.points}
                    onChange={(e) =>
                      setQuestionForm({ ...questionForm, points: parseInt(e.target.value) })
                    }
                    className="w-full border rounded px-3 py-2"
                    min="10"
                    max="1000"
                  />
                </div>
              </div>

              {/* Answer Options */}
              <div>
                <label className="block text-sm font-medium mb-2">Answer Options</label>
                <div className="space-y-2">
                  {questionForm.options.map((opt, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={opt.text}
                        onChange={(e) => updateOption(idx, "text", e.target.value)}
                        className="flex-1 border rounded px-3 py-2"
                        placeholder={`Option ${idx + 1}`}
                        disabled={questionForm.question_type === "true_false"}
                      />
                      <label className="flex items-center gap-2 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={opt.is_correct}
                          onChange={(e) => updateOption(idx, "is_correct", e.target.checked)}
                          className="w-5 h-5"
                        />
                        <span className="text-sm">Correct</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Save/Cancel */}
              <div className="flex gap-2">
                <button
                  onClick={handleSaveQuestion}
                  disabled={saving}
                  className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save size={20} />
                  {saving ? "Saving..." : "Save Question"}
                </button>
                <button
                  onClick={() => {
                    setEditingQuestion(null);
                    setShowQuestionForm(false);
                    setQuestionForm({
                      question_text: "",
                      question_type: "multiple_choice",
                      time_limit: 30,
                      points: 100,
                      image_url: "",
                      video_url: "",
                      gif_url: "",
                      options: [
                        { text: "", is_correct: false },
                        { text: "", is_correct: false },
                        { text: "", is_correct: false },
                        { text: "", is_correct: false },
                      ],
                    });
                  }}
                  className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
                </div>
              </div>
            </div>
          )}

          {/* Theme Selector Modal */}
          {showThemeSelector && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
                  <h2 className="text-2xl font-bold text-gray-800">Select Quiz Theme</h2>
                  <button
                    onClick={() => setShowThemeSelector(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="p-6">
                  <ThemeSelector selectedThemeId={themeId} onThemeSelect={setThemeId} />

                  <div className="flex gap-3 mt-6 pt-6 border-t">
                    <button
                      onClick={handleSaveTheme}
                      disabled={saving}
                      className="flex-1 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium"
                    >
                      {saving ? "Saving..." : "Save Theme"}
                    </button>
                    <button
                      onClick={() => setShowThemeSelector(false)}
                      className="flex-1 bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
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
