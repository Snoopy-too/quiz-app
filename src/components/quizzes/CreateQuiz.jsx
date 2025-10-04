import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { Upload, X } from "lucide-react";
import { uploadImage } from "../../utils/mediaUpload";
import VerticalNav from "../layout/VerticalNav";
import AlertModal from "../common/AlertModal";
import ConfirmModal from "../common/ConfirmModal";
import ThemeSelector from "./ThemeSelector";

export default function CreateQuiz({ onQuizCreated, setView, appState }) {
  const [title, setTitle] = useState("");
  const [themeId, setThemeId] = useState(null);
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [randomizeQuestions, setRandomizeQuestions] = useState(false);
  const [randomizeAnswers, setRandomizeAnswers] = useState(false);
  const [isTemplate, setIsTemplate] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: "", message: "", type: "info" });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: "", message: "", onConfirm: null });

  // ✅ Fetch categories and default theme from DB
  useEffect(() => {
    fetchCategories();
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
      }
    } catch (err) {
      console.error("Error fetching default theme:", err);
    }
  };

  const fetchCategories = async () => {
    let { data, error } = await supabase
      .from("categories")
      .select("id, name")
      .order("name");

    if (error) {
      console.error("Error fetching categories:", error.message);
    } else {
      setCategories(data || []);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      setAlertModal({ isOpen: true, title: "Validation Error", message: "Please enter a category name", type: "error" });
      return;
    }

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) {
        setAlertModal({ isOpen: true, title: "Authentication Required", message: "You must be logged in to create a category.", type: "error" });
        return;
      }

      const { data, error: insertError } = await supabase
        .from("categories")
        .insert([
          {
            name: newCategoryName.trim(),
            created_by: user.user.id,
          },
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      await fetchCategories();
      setCategoryId(data.id);
      setNewCategoryName("");
      setShowNewCategory(false);
    } catch (err) {
      setAlertModal({ isOpen: true, title: "Error", message: "Error creating category: " + err.message, type: "error" });
    }
  };

  // ✅ Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) {
        setError("You must be logged in to create a quiz.");
        setLoading(false);
        return;
      }

      const { error: insertError } = await supabase.from("quizzes").insert([
        {
          title,
          theme_id: themeId,
          category_id: categoryId || null,
          created_by: user.user.id,
          randomize_questions: randomizeQuestions,
          randomize_answers: randomizeAnswers,
          is_template: isTemplate,
          is_public: isPublic,
        },
      ]);

      if (insertError) throw insertError;

      setSuccess("Quiz created successfully!");
      setTitle("");
      setCategoryId("");
      setRandomizeQuestions(false);
      setRandomizeAnswers(false);
      setIsTemplate(false);
      setIsPublic(false);
      await fetchDefaultTheme(); // Reset to default theme
      if (onQuizCreated) onQuizCreated(); // callback to refresh list if needed
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Vertical Navigation */}
      <VerticalNav currentView="create-quiz" setView={setView} appState={appState} />

      {/* Main Content */}
      <div className="flex-1 ml-64">
        <nav className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <h1 className="text-2xl font-bold text-purple-600">Create New Quiz</h1>
        </nav>

        <div className="container mx-auto p-6 max-w-2xl">
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Quiz Details</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
        {/* Quiz Title */}
        <div>
          <label className="block text-sm font-medium mb-1">Quiz Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full border rounded px-3 py-2 focus:ring focus:ring-blue-300"
            placeholder="Enter quiz title"
          />
        </div>

        {/* Theme Selector */}
        <div className="border-t pt-4">
          <ThemeSelector selectedThemeId={themeId} onThemeSelect={setThemeId} />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          {!showNewCategory ? (
            <div className="flex gap-2">
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="flex-1 border rounded px-3 py-2 focus:ring focus:ring-blue-300"
              >
                <option value="">-- Select a Category --</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowNewCategory(true)}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 whitespace-nowrap"
              >
                + New Category
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-1 border rounded px-3 py-2 focus:ring focus:ring-green-300"
                  placeholder="Enter new category name"
                />
                <button
                  type="button"
                  onClick={handleCreateCategory}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewCategory(false);
                    setNewCategoryName("");
                  }}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quiz Settings */}
        <div className="border-t pt-4 space-y-3">
          <h3 className="font-semibold text-gray-700">Quiz Settings</h3>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={randomizeQuestions}
              onChange={(e) => setRandomizeQuestions(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm">Randomize question order</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={randomizeAnswers}
              onChange={(e) => setRandomizeAnswers(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm">Randomize answer order</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isTemplate}
              onChange={(e) => setIsTemplate(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm">Save as template</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm">Make quiz public</span>
          </label>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Quiz"}
        </button>

        {/* Messages */}
        {error && <p className="mt-3 text-red-500">{error}</p>}
        {success && <p className="mt-3 text-green-600">{success}</p>}
      </form>
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
