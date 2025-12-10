import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../../supabaseClient";
import { Copy, Search, Eye, Globe, User, Calendar, Hash } from "lucide-react";
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

  // Alert/Confirm modals
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: "", message: "", type: "info" });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: "", message: "", onConfirm: null });

  useEffect(() => {
    const init = async () => {
      const themesMap = await fetchThemes();
      await fetchPublicQuizzes(themesMap);
    };
    init();
  }, []);

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
            folder_id: null
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

  const renderQuizCard = (quiz) => {
    const themeMeta = getThemeMeta(quiz);

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
          <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
            <button
              onClick={() => setView("preview-quiz", quiz.id)}
              className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 transition text-sm font-medium flex items-center justify-center gap-1.5"
              title={t('actions.preview')}
            >
              <Eye size={14} />
              {t('actions.preview')}
            </button>
            {!quiz.isOwnQuiz && (
              <button
                onClick={() => handleImportQuiz(quiz.id)}
                className="flex-1 bg-blue-700 text-white px-3 py-2 rounded-md hover:bg-blue-800 transition text-sm font-medium flex items-center justify-center gap-1.5"
                title={t('publicQuizzes.import')}
              >
                <Copy size={14} />
                {t('publicQuizzes.import')}
              </button>
            )}
            {quiz.isOwnQuiz && (
              <div className="flex-1 bg-gray-100 text-gray-600 px-3 py-2 rounded-md text-sm font-medium text-center">
                {t('publicQuizzes.yourQuiz')}
              </div>
            )}
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
    </div>
  );
}
