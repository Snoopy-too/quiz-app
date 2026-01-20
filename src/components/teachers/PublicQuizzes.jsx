import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../../supabaseClient";
import { Copy, Search, Eye, Globe, User, Calendar, Hash, Check, RefreshCw, List, X, ChevronDown, ChevronUp } from "lucide-react";
import VerticalNav from "../layout/VerticalNav";
import AlertModal from "../common/AlertModal";
import ConfirmModal from "../common/ConfirmModal";

export default function PublicQuizzes({ setView, appState }) {
  const { t } = useTranslation();
  const [publicQuizzes, setPublicQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [themesById, setThemesById] = useState({});
  const [importedQuizzes, setImportedQuizzes] = useState({}); // Map of source_quiz_id -> imported quiz info

  // Alert/Confirm modals
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: "", message: "", type: "info" });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: "", message: "", onConfirm: null });
  const [viewQuestionsModal, setViewQuestionsModal] = useState({
    isOpen: false,
    quizTitle: "",
    questions: [],
    loading: false
  });

  useEffect(() => {
    const init = async () => {
      const themesMap = await fetchThemes();
      await fetchImportedQuizzes();
      await fetchPublicQuizzes(themesMap);
    };
    init();
  }, []);

  // Fetch quizzes that the current user has imported (have source_quiz_id)
  const fetchImportedQuizzes = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) return;

      const { data, error: fetchError } = await supabase
        .from("quizzes")
        .select("id, source_quiz_id, imported_at")
        .eq("created_by", user.user.id)
        .not("source_quiz_id", "is", null);

      if (fetchError) throw fetchError;

      // Create a map of source_quiz_id -> imported quiz info
      const importedMap = {};
      (data || []).forEach((quiz) => {
        importedMap[quiz.source_quiz_id] = {
          importedQuizId: quiz.id,
          importedAt: quiz.imported_at
        };
      });
      setImportedQuizzes(importedMap);
    } catch (err) {
      console.error("Error fetching imported quizzes:", err.message);
    }
  };

  const fetchThemes = async () => {
    try {
      const { data, error: themeError } = await supabase
        .from("themes")
        .select("id, name, background_image_url, primary_color, secondary_color, text_color");

      if (themeError) throw themeError;

      const mapped = {};
      (data || []).forEach((theme) => {
        mapped[theme.id] = theme;
      });

      setThemesById(mapped);
      return mapped;
    } catch (err) {
      console.error("Error fetching themes:", err.message);
      return {};
    }
  };

  const fetchPublicQuizzes = async (themeMap = themesById) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) {
        setError(t('errors.notAuthenticated'));
        return;
      }

      // Fetch all public quizzes with creator information
      const { data, error: fetchError } = await supabase
        .from("quizzes")
        .select(`
          id,
          title,
          theme_id,
          background_image_url,
          created_at,
          updated_at,
          created_by,
          users!quizzes_created_by_fkey(name, email, avatar_url),
          questions(id)
        `)
        .eq("is_public", true)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      // Add question count and theme details to each quiz
      const quizzesWithCount = (data || []).map((quiz) => ({
        ...quiz,
        questionCount: quiz.questions?.length || 0,
        themeDetails: themeMap[quiz.theme_id] || null,
        creatorName: quiz.users?.name || quiz.users?.email || "Unknown",
        creatorAvatar: quiz.users?.avatar_url || null,
        isOwnQuiz: quiz.created_by === user.user.id
      }));

      setPublicQuizzes(quizzesWithCount);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImportQuiz = (quizId) => {
    setConfirmModal({
      isOpen: true,
      title: t('publicQuizzes.importQuiz'),
      message: t('publicQuizzes.importQuizConfirm'),
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        await importQuiz(quizId);
      }
    });
  };

  const importQuiz = async (quizId) => {
    try {
      // Get original quiz
      const { data: quiz, error: quizError } = await supabase
        .from("quizzes")
        .select("*")
        .eq("id", quizId)
        .single();

      if (quizError) throw quizError;

      // Get questions
      const { data: questions, error: questionsError } = await supabase
        .from("questions")
        .select("*")
        .eq("quiz_id", quizId);

      if (questionsError) throw questionsError;

      // Create new quiz in user's account
      const { data: newQuiz, error: newQuizError } = await supabase
        .from("quizzes")
        .insert([
          {
            title: `${quiz.title} (Imported)`,
            theme_id: quiz.theme_id || null,
            category_id: quiz.category_id,
            created_by: appState.currentUser.id,
            background_image_url: quiz.background_image_url || null,
            randomize_questions: quiz.randomize_questions,
            randomize_answers: quiz.randomize_answers,
            is_template: false,
            is_public: false, // Imported quizzes are private by default
            folder_id: null,
            source_quiz_id: quizId, // Track which public quiz this was imported from
            imported_at: new Date().toISOString() // Track when it was imported
          },
        ])
        .select()
        .single();

      if (newQuizError) throw newQuizError;

      // Copy questions
      if (questions && questions.length > 0) {
        const newQuestions = questions.map((q) => ({
          quiz_id: newQuiz.id,
          question_text: q.question_text,
          question_type: q.question_type,
          time_limit: q.time_limit,
          points: q.points,
          options: q.options,
          image_url: q.image_url,
          video_url: q.video_url,
          gif_url: q.gif_url,
          order_index: q.order_index,
        }));

        const { error: questionsInsertError } = await supabase
          .from("questions")
          .insert(newQuestions);

        if (questionsInsertError) throw questionsInsertError;
      }

      // Update the imported quizzes map
      setImportedQuizzes(prev => ({
        ...prev,
        [quizId]: {
          importedQuizId: newQuiz.id,
          importedAt: newQuiz.imported_at
        }
      }));

      setAlertModal({
        isOpen: true,
        title: t('common.success'),
        message: t('publicQuizzes.importSuccess'),
        type: "success"
      });
    } catch (err) {
      setAlertModal({
        isOpen: true,
        title: t('common.error'),
        message: t('publicQuizzes.importError') + ": " + err.message,
        type: "error"
      });
    }
  };

  // Get filtered and sorted quizzes
  const getDisplayedQuizzes = () => {
    let displayed = publicQuizzes;

    // Apply search
    if (searchQuery) {
      displayed = displayed.filter((quiz) =>
        quiz.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        quiz.creatorName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sort
    if (sortBy === "created_at") {
      displayed.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortBy === "title") {
      displayed.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === "creator") {
      displayed.sort((a, b) => a.creatorName.localeCompare(b.creatorName));
    }

    return displayed;
  };

  // Helper function to translate theme names
  const translateThemeName = (themeName) => {
    if (!themeName) return t('theme.defaultTheme');

    const lowerName = themeName.toLowerCase();
    const themeKey = `theme.${lowerName}`;

    const translated = t(themeKey);
    return translated === themeKey ? themeName : translated;
  };

  // Get theme metadata for quiz card
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

  // Check if a public quiz has been updated since it was imported
  const hasQuizBeenUpdated = (quiz) => {
    const importInfo = importedQuizzes[quiz.id];
    if (!importInfo || !importInfo.importedAt) return false;

    // Compare source quiz's updated_at with imported_at
    const sourceUpdatedAt = new Date(quiz.updated_at || quiz.created_at);
    const importedAt = new Date(importInfo.importedAt);

    return sourceUpdatedAt > importedAt;
  };

  // Get import status for a quiz
  const getImportStatus = (quiz) => {
    if (quiz.isOwnQuiz) return "own";
    if (!importedQuizzes[quiz.id]) return "not_imported";
    if (hasQuizBeenUpdated(quiz)) return "update_available";
    return "imported";
  };

  const handleViewQuestions = async (quiz) => {
    setViewQuestionsModal({
      isOpen: true,
      quizTitle: quiz.title,
      questions: [],
      loading: true
    });

    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', quiz.id)
        .order('order_index', { ascending: true });

      if (error) throw error;

      setViewQuestionsModal(prev => ({
        ...prev,
        loading: false,
        questions: data || []
      }));
    } catch (err) {
      console.error("Error fetching questions:", err);
      // Fallback to empty list or handle error gracefully
      setViewQuestionsModal(prev => ({ ...prev, loading: false }));
    }
  };

  const renderQuestionsModal = () => {
    if (!viewQuestionsModal.isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl animate-scaleIn">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                {t('quiz.questions')} ({viewQuestionsModal.questions.length})
              </p>
              <h3 className="text-xl font-bold text-gray-800 line-clamp-1">{viewQuestionsModal.quizTitle}</h3>
            </div>
            <button
              onClick={() => setViewQuestionsModal(prev => ({ ...prev, isOpen: false }))}
              className="text-gray-400 hover:text-gray-600 transition-colors bg-white p-2 rounded-full border border-gray-200 hover:shadow-sm"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-100/50">
            {viewQuestionsModal.loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-500">{t('common.loading')}</p>
              </div>
            ) : viewQuestionsModal.questions.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200 border-dashed">
                <p className="text-gray-500">{t('quiz.noQuestions')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {viewQuestionsModal.questions.map((q, idx) => (
                  <QuestionItem key={q.id} question={q} index={idx} />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-white rounded-b-xl flex justify-end">
            <button
              onClick={() => setViewQuestionsModal(prev => ({ ...prev, isOpen: false }))}
              className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium text-sm"
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderQuizCard = (quiz) => {
    const themeMeta = getThemeMeta(quiz);
    const importStatus = getImportStatus(quiz);

    return (
      <div
        key={quiz.id}
        className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-200 overflow-hidden border border-gray-200"
      >
        {/* Theme Preview */}
        <div className="relative h-32">
          <div className="absolute inset-0" style={themeMeta.style}></div>
          {themeMeta.overlay && <div className="absolute inset-0 bg-black/35" />}
          <div className="absolute top-2 right-2">
            <Globe size={20} className="text-white drop-shadow" />
          </div>
          {/* Show "Imported" badge if already imported */}
          {importStatus === "imported" && (
            <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
              <Check size={12} />
              {t('publicQuizzes.imported')}
            </div>
          )}
          {/* Show "Update Available" badge if source was updated */}
          {importStatus === "update_available" && (
            <div className="absolute top-2 left-2 bg-amber-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
              <RefreshCw size={12} />
              {t('publicQuizzes.updateAvailable')}
            </div>
          )}
          <div className="absolute bottom-2 left-3 right-3">
            <span
              className="text-sm font-semibold drop-shadow"
              style={{ color: themeMeta.textColor }}
            >
              {themeMeta.label}
            </span>
          </div>
        </div>

        <div className="p-4">
          {/* Title */}
          <div className="mb-3">
            <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{quiz.title}</h3>

            {/* Creator Info */}
            <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
              {quiz.creatorAvatar ? (
                <img
                  src={quiz.creatorAvatar}
                  alt={quiz.creatorName}
                  className="w-5 h-5 rounded-full object-cover"
                />
              ) : (
                <User size={14} />
              )}
              <span>{quiz.creatorName}</span>
            </div>

            {/* Meta info */}
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Calendar size={14} />
                <span>{new Date(quiz.created_at).toLocaleDateString()}</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1">
                <Hash size={14} />
                <span>{quiz.questionCount} {quiz.questionCount === 1 ? t('quiz.question') : t('quiz.questions')}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-100">
            <button
              onClick={() => setView("preview-quiz", quiz.id)}
              className="bg-blue-600 text-white px-2 py-2 rounded-md hover:bg-blue-700 transition text-xs font-medium flex items-center justify-center gap-1"
              title={t('actions.preview')}
            >
              <Eye size={13} />
              {t('actions.preview')}
            </button>

            <button
              onClick={() => handleViewQuestions(quiz)}
              className="bg-violet-600 text-white px-2 py-2 rounded-md hover:bg-violet-700 transition text-xs font-medium flex items-center justify-center gap-1"
              title="View Questions"
            >
              <List size={13} />
              Questions
            </button>

            {/* Import actions - span both columns */}
            <div className="col-span-2">
              {/* Not imported yet - show Import button */}
              {importStatus === "not_imported" && (
                <button
                  onClick={() => handleImportQuiz(quiz.id)}
                  className="w-full bg-blue-700 text-white px-3 py-2 rounded-md hover:bg-blue-800 transition text-sm font-medium flex items-center justify-center gap-1.5"
                  title={t('publicQuizzes.import')}
                >
                  <Copy size={14} />
                  {t('publicQuizzes.import')}
                </button>
              )}

              {/* Already imported - show grayed out Imported indicator */}
              {importStatus === "imported" && (
                <div className="w-full bg-gray-100 text-gray-500 px-3 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-1.5 border border-gray-200">
                  <Check size={14} />
                  {t('publicQuizzes.imported')}
                </div>
              )}

              {/* Update available - show Re-import button */}
              {importStatus === "update_available" && (
                <button
                  onClick={() => handleImportQuiz(quiz.id)}
                  className="w-full bg-amber-500 text-white px-3 py-2 rounded-md hover:bg-amber-600 transition text-sm font-medium flex items-center justify-center gap-1.5"
                  title={t('publicQuizzes.reimport')}
                >
                  <RefreshCw size={14} />
                  {t('publicQuizzes.reimport')}
                </button>
              )}

              {/* Own quiz - show Your Quiz indicator */}
              {importStatus === "own" && (
                <div className="w-full bg-gray-100 text-gray-600 px-3 py-2 rounded-md text-sm font-medium text-center border border-gray-200">
                  {t('publicQuizzes.yourQuiz')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Vertical Navigation */}
      <VerticalNav currentView="public-quizzes" setView={setView} appState={appState} />

      {/* Main Content */}
      <div className="flex-1 ml-64">
        {/* Top Navigation */}
        <nav className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Globe size={28} className="text-blue-700" />
              <div>
                <h1 className="text-2xl font-bold text-blue-700">{t('nav.publicQuizzes')}</h1>
                <p className="text-sm text-gray-600">{t('publicQuizzes.description')}</p>
              </div>
            </div>
          </div>
        </nav>

        {/* Toolbar */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={t('publicQuizzes.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
            >
              <option value="created_at">{t('manager.sortNewest')}</option>
              <option value="title">{t('manager.sortAZ')}</option>
              <option value="creator">{t('publicQuizzes.sortByCreator')}</option>
            </select>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="p-6">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <p className="text-gray-600">{t('common.loading')}</p>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center py-16">
              <p className="text-red-600">{t('common.error')}: {error}</p>
            </div>
          )}

          {!loading && !error && publicQuizzes.length === 0 && (
            <div className="flex items-center justify-center py-16">
              <div className="bg-white rounded-xl shadow-lg p-12 text-center max-w-md">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Globe size={32} className="text-blue-700" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{t('publicQuizzes.noPublicQuizzes')}</h3>
                <p className="text-gray-600">{t('publicQuizzes.noPublicQuizzesDescription')}</p>
              </div>
            </div>
          )}

          {!loading && !error && publicQuizzes.length > 0 && (
            <div>
              {/* Header */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {t('publicQuizzes.availableQuizzes')}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {getDisplayedQuizzes().length} {getDisplayedQuizzes().length !== 1 ? t('quiz.quizzes') : t('quiz.quiz')}
                  {searchQuery && ` ${t('manager.matchingSearch', { query: searchQuery })}`}
                </p>
              </div>

              {/* Quizzes Grid */}
              {getDisplayedQuizzes().length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search size={32} className="text-gray-400" />
                  </div>
                  <p className="text-gray-600">{t('manager.noQuizzesFound', { query: searchQuery })}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {getDisplayedQuizzes().map((quiz) => renderQuizCard(quiz))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Custom Modals */}
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
        confirmStyle="primary"
      />

      {renderQuestionsModal()}
    </div>
  );
}

function QuestionItem({ question, index }) {
  const [expanded, setExpanded] = useState(false);

  // Ensure options is an array
  let options = [];
  try {
    options = typeof question.options === 'string' ? JSON.parse(question.options) : question.options;
  } catch (e) {
    console.error("Error parsing options", e);
  }

  // Helper to determine shape color like Kahoot
  const getShapeColor = (idx) => {
    // Red, Blue, Yellow, Green for 0, 1, 2, 3
    const colors = ['bg-red-500', 'bg-blue-500', 'bg-yellow-500', 'bg-green-500'];
    return colors[idx % colors.length];
  };

  // Helper for shape icon (simple CSS shapes or just use the color block with index)
  // We can just use the color block as in Kahoot compact view.

  const answerIcons = ['▲', '◆', '●', '■'];

  return (
    <div className={`bg-white rounded-lg shadow-sm border transition-all duration-200 overflow-hidden ${expanded ? 'border-blue-300 ring-4 ring-blue-50/50' : 'border-gray-200 hover:border-blue-200'}`}>
      {/* Header / Clickable Area */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50/80 transition-colors gap-4"
      >
        <div className="flex flex-col flex-1 min-w-0">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Quiz</span>
          <h4 className={`font-semibold text-gray-800 text-sm md:text-base leading-snug ${expanded ? '' : 'line-clamp-1'}`}>
            {question.question_text}
          </h4>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {question.image_url && !expanded && (
            <div className="h-8 w-12 rounded bg-gray-100 overflow-hidden border border-gray-200">
              <img src={question.image_url} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <div className={`p-1 rounded-full transition-transform duration-200 ${expanded ? 'bg-blue-100 text-blue-600 rotate-180' : 'text-gray-400'}`}>
            <ChevronDown size={18} />
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-gray-100 p-4 pt-2 bg-gray-50/30">
          <div className="flex flex-col md:flex-row gap-6 mt-2 ml-1">
            {/* Image if exists */}
            {question.image_url && (
              <div className="shrink-0">
                <div className="rounded-lg overflow-hidden h-32 w-auto aspect-video bg-gray-200 border border-gray-200 shadow-sm">
                  <img src={question.image_url} alt="Question" className="w-full h-full object-cover" />
                </div>
              </div>
            )}

            {/* Options Grid */}
            <div className="flex-1 grid grid-cols-1 gap-2 self-start w-full">
              {Array.isArray(options) && options.map((opt, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between p-2.5 rounded-md border 
                    ${opt.is_correct
                      ? 'bg-green-50 border-green-200 shadow-sm'
                      : 'bg-white border-gray-200 opacity-80'}`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    {/* Shape/Color Icon */}
                    <div className={`w-6 h-6 rounded shrink-0 flex items-center justify-center text-white text-[10px] shadow-sm ${getShapeColor(i)}`}>
                      {answerIcons[i % 4]}
                    </div>
                    <span className={`text-sm font-medium truncate ${opt.is_correct ? 'text-gray-900' : 'text-gray-600'}`}>
                      {opt.text}
                    </span>
                  </div>
                  <div className="shrink-0 pl-2">
                    {opt.is_correct ? (
                      <Check size={18} className="text-green-600" />
                    ) : (
                      <X size={18} className="text-red-300" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
