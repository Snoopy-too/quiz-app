import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { supabase } from "../../supabaseClient";
import {
  Copy,
  Search,
  Eye,
  Globe,
  Building2,
  User,
  Calendar,
  Hash,
  Check,
  RefreshCw,
  List,
  X,
  ChevronDown,
  AlertCircle,
} from "lucide-react";
import {
  PageHeader,
  Card,
  CardBody,
  Button,
  Input,
  Select,
  Badge,
  EmptyState,
  Skeleton,
  IconButton,
  Spinner,
} from "../ui";
import AlertModal from "../common/AlertModal";
import ConfirmModal from "../common/ConfirmModal";
import {
  DEFAULT_THEME_GRADIENT,
  DEFAULT_THEME_PRIMARY,
  DEFAULT_THEME_TEXT_COLOR,
} from "../../theme/themeDefaults";

export default function PublicQuizzes({ appState, viewType = "public" }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
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
      setLoading(true);
      const themesMap = await fetchThemes();
      await fetchImportedQuizzes();
      await fetchPublicQuizzes(themesMap);
    };
    init();
  }, [viewType, appState.currentUser?.school_id]);

  // Fetch quizzes that the current user has imported (have source_quiz_id)
  const fetchImportedQuizzes = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) return;

      const { data, error: fetchError } = await supabase
        .from("quizzes")
        .select("id, source_quiz_id, imported_at")
        .eq("created_by", user.user.id)
        .not("source_quiz_id", "is", null)
        .order("imported_at", { ascending: true });

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

      // Fetch all public quizzes with creator information (including school_id)
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
          is_public,
          is_global,
          users!quizzes_created_by_fkey(name, email, avatar_url, school_id),
          questions(id)
        `)
        .eq("is_public", true)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      // Get the current teacher's school_id
      const currentSchoolId = appState.currentUser?.school_id;

      // Add question count and theme details, then filter by same school or global
      const quizzesWithCount = (data || [])
        .filter((quiz) => {
          if (viewType === "global") {
            return quiz.is_global === true;
          } else {
            // viewType === "public"
            // If the current teacher has a school_id assigned, show quizzes from creators at the same school.
            if (currentSchoolId) {
              return quiz.users?.school_id === currentSchoolId;
            }
            // If teacher has no school yet, (only their own quizzes, if any)
            return quiz.created_by === user.user.id;
          }
        })
        .map((quiz) => ({
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
        await importQuiz(quizId);
        setConfirmModal({ ...confirmModal, isOpen: false });
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

      const nowIso = new Date().toISOString();
      const existingImport = importedQuizzes[quizId];
      let savedQuiz = null;

      if (existingImport?.importedQuizId) {
        const { data: updatedQuiz, error: updateError } = await supabase
          .from("quizzes")
          .update({
            title: `${quiz.title} (Imported)`,
            theme_id: quiz.theme_id || null,
            category_id: quiz.category_id,
            background_image_url: quiz.background_image_url || null,
            randomize_questions: quiz.randomize_questions,
            randomize_answers: quiz.randomize_answers,
            is_survey: quiz.is_survey || false,
            is_course_material: quiz.is_course_material ?? true,
            imported_at: nowIso,
          })
          .eq("id", existingImport.importedQuizId)
          .eq("created_by", appState.currentUser.id)
          .select()
          .maybeSingle();

        if (updateError) throw updateError;
        if (updatedQuiz) {
          savedQuiz = updatedQuiz;
          const { error: deleteQuestionsError } = await supabase
            .from("questions")
            .delete()
            .eq("quiz_id", savedQuiz.id);
          if (deleteQuestionsError) throw deleteQuestionsError;
        }
      }

      if (!savedQuiz) {
        // Create new quiz in user's account
        const { data: insertedQuiz, error: newQuizError } = await supabase
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
              is_survey: quiz.is_survey || false,
              is_course_material: quiz.is_course_material ?? true,
              source_quiz_id: quizId, // Track which public quiz this was imported from
              imported_at: nowIso // Track when it was imported
            },
          ])
          .select()
          .single();

        if (newQuizError) throw newQuizError;
        savedQuiz = insertedQuiz;
      }

      // Copy questions
      if (questions && questions.length > 0) {
        const newQuestions = questions.map((q) => ({
          quiz_id: savedQuiz.id,
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
          importedQuizId: savedQuiz.id,
          importedAt: savedQuiz.imported_at
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
    let displayed = [...publicQuizzes];

    // Apply search
    if (searchQuery) {
      const qLower = searchQuery.toLowerCase();
      displayed = displayed.filter((quiz) =>
        (quiz.title || "").toLowerCase().includes(qLower) ||
        (quiz.creatorName || "").toLowerCase().includes(qLower)
      );
    }

    // Apply sort
    if (sortBy === "created_at") {
      displayed.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortBy === "title") {
      displayed.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    } else if (sortBy === "creator") {
      displayed.sort((a, b) => (a.creatorName || "").localeCompare(b.creatorName || ""));
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
        textColor: theme.text_color || DEFAULT_THEME_TEXT_COLOR,
        overlay: true,
        isCustom: false
      };
    }

    if (theme && (theme.primary_color || theme.secondary_color)) {
      const primary = theme.primary_color || DEFAULT_THEME_PRIMARY;
      const secondary = theme.secondary_color || primary;
      return {
        label: translateThemeName(theme.name),
        style: {
          background: `linear-gradient(135deg, ${primary}, ${secondary})`
        },
        textColor: theme.text_color || DEFAULT_THEME_TEXT_COLOR,
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
        textColor: DEFAULT_THEME_TEXT_COLOR,
        overlay: true,
        isCustom: true
      };
    }

    return {
      label: t('theme.defaultTheme'),
      style: {
        background: DEFAULT_THEME_GRADIENT
      },
      textColor: DEFAULT_THEME_TEXT_COLOR,
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[1px]">
        <div className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-pop animate-scaleIn">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-line bg-surface-muted/60 px-6 py-4">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                {t("quiz.questions")} ({viewQuestionsModal.questions.length})
              </p>
              <h3 className="line-clamp-1 text-lg font-semibold text-ink">
                {viewQuestionsModal.quizTitle}
              </h3>
            </div>
            <IconButton
              aria-label={t("common.close")}
              size="sm"
              onClick={() => setViewQuestionsModal((prev) => ({ ...prev, isOpen: false }))}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </IconButton>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto bg-canvas p-4 sm:p-6">
            {viewQuestionsModal.loading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12">
                <Spinner />
                <p className="text-sm text-ink-muted">{t("common.loading")}</p>
              </div>
            ) : viewQuestionsModal.questions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line bg-surface py-12 text-center">
                <p className="text-sm text-ink-muted">{t("quiz.noQuestions")}</p>
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
          <div className="flex justify-end border-t border-line bg-surface px-6 py-4">
            <Button
              variant="secondary"
              onClick={() => setViewQuestionsModal((prev) => ({ ...prev, isOpen: false }))}
            >
              {t("common.close")}
            </Button>
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
        className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition-all duration-200 hover:shadow-pop"
      >
        {/* Theme Preview */}
        <div className="relative h-32 shrink-0">
          <div className="absolute inset-0" style={themeMeta.style}></div>
          {themeMeta.overlay && <div className="absolute inset-0 bg-black/35" />}
          <div className="absolute right-2.5 top-2.5">
            {viewType === "global" ? (
              <Globe size={18} className="text-white drop-shadow" aria-hidden="true" />
            ) : (
              <Building2 size={18} className="text-white drop-shadow" aria-hidden="true" />
            )}
          </div>
          {importStatus === "imported" && (
            <div className="absolute left-2.5 top-2.5">
              <Badge variant="success" className="bg-surface/95 shadow-sm">
                <Check className="h-3 w-3" aria-hidden="true" />
                {t("publicQuizzes.imported")}
              </Badge>
            </div>
          )}
          {importStatus === "update_available" && (
            <div className="absolute left-2.5 top-2.5">
              <Badge variant="warning" className="bg-surface/95 shadow-sm">
                <RefreshCw className="h-3 w-3" aria-hidden="true" />
                {t("publicQuizzes.updateAvailable")}
              </Badge>
            </div>
          )}
          <div className="absolute bottom-2 left-3 right-3">
            <span
              className="text-xs font-semibold drop-shadow"
              style={{ color: themeMeta.textColor }}
            >
              {themeMeta.label}
            </span>
          </div>
        </div>

        <div className="flex flex-1 flex-col p-4">
          {/* Title & Metadata */}
          <div className="mb-3 flex-1">
            <h3 className="mb-2 line-clamp-2 text-base font-semibold text-ink">{quiz.title}</h3>

            {/* Creator Info */}
            <div className="mb-2 flex items-center gap-2 text-xs text-ink-muted">
              {quiz.creatorAvatar ? (
                <img
                  src={quiz.creatorAvatar}
                  alt={quiz.creatorName}
                  className="h-5 w-5 rounded-full object-cover"
                />
              ) : (
                <User size={14} aria-hidden="true" />
              )}
              <span className="truncate">{quiz.creatorName}</span>
            </div>

            {/* Meta info */}
            <div className="flex items-center gap-3 text-xs text-ink-muted">
              <div className="flex items-center gap-1">
                <Calendar size={13} aria-hidden="true" />
                <span>{new Date(quiz.created_at).toLocaleDateString()}</span>
              </div>
              <span>·</span>
              <div className="flex items-center gap-1">
                <Hash size={13} aria-hidden="true" />
                <span>
                  {quiz.questionCount}{" "}
                  {quiz.questionCount === 1 ? t("quiz.question") : t("quiz.questions")}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 border-t border-line pt-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                navigate(
                  `/teacher/quizzes/${quiz.id}/preview?returnTo=${
                    viewType === "global" ? "global-quizzes" : "public-quizzes"
                  }`
                )
              }
              title={t("actions.preview")}
            >
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              {t("actions.preview")}
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleViewQuestions(quiz)}
              title={t("quiz.questions", "Questions")}
            >
              <List className="h-3.5 w-3.5" aria-hidden="true" />
              {t("quiz.questions", "Questions")}
            </Button>

            <div className="col-span-2">
              {importStatus === "not_imported" && (
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full"
                  onClick={() => handleImportQuiz(quiz.id)}
                  title={t("publicQuizzes.import")}
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("publicQuizzes.import")}
                </Button>
              )}

              {importStatus === "imported" && (
                <div className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-line bg-surface-muted px-3 py-1.5 text-sm font-medium text-ink-muted">
                  <Check className="h-3.5 w-3.5 text-success-600" aria-hidden="true" />
                  {t("publicQuizzes.imported")}
                </div>
              )}

              {importStatus === "update_available" && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                  onClick={() => handleImportQuiz(quiz.id)}
                  title={t("publicQuizzes.reimport")}
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("publicQuizzes.reimport")}
                </Button>
              )}

              {importStatus === "own" && (
                <div className="w-full rounded-lg border border-line bg-surface-muted px-3 py-1.5 text-center text-sm font-medium text-ink-muted">
                  {t("publicQuizzes.yourQuiz")}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-canvas">
      <PageHeader
        title={viewType === "global" ? t("nav.globalQuizzes") : t("nav.publicQuizzes")}
        description={
          viewType === "global" ? t("publicQuizzes.globalDescription") : t("publicQuizzes.description")
        }
      />

      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        {/* Toolbar */}
        <Card>
          <CardBody className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-md flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle"
                aria-hidden="true"
              />
              <Input
                type="text"
                placeholder={t("publicQuizzes.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label={t("manager.sortQuizzes", "Sort quizzes")}
              className="w-full sm:w-auto sm:min-w-[180px]"
            >
              <option value="created_at">{t("manager.sortNewest")}</option>
              <option value="title">{t("manager.sortAZ")}</option>
              <option value="creator">{t("publicQuizzes.sortByCreator")}</option>
            </Select>
          </CardBody>
        </Card>

        {loading && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <Card key={idx}>
                <Skeleton className="h-32 w-full rounded-none rounded-t-xl" />
                <CardBody className="space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-9 w-full" />
                </CardBody>
              </Card>
            ))}
          </div>
        )}

        {error && (
          <Card className="border-danger-600/40">
            <CardBody className="flex items-center gap-3 text-danger-600">
              <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
              <p className="text-sm font-medium">
                {t("common.error")}: {error}
              </p>
            </CardBody>
          </Card>
        )}

        {!loading && !error && publicQuizzes.length === 0 && (
          <EmptyState
            icon={
              viewType === "global" ? (
                <Globe className="h-6 w-6" aria-hidden="true" />
              ) : (
                <Building2 className="h-6 w-6" aria-hidden="true" />
              )
            }
            title={t("publicQuizzes.noPublicQuizzes")}
            description={t("publicQuizzes.noPublicQuizzesDescription")}
          />
        )}

        {!loading && !error && publicQuizzes.length > 0 && (
          <div>
            {/* Header */}
            <div className="mb-4">
              <h2 className="text-base font-semibold text-ink">
                {t("publicQuizzes.availableQuizzes")}
              </h2>
              <p className="mt-0.5 text-xs text-ink-muted">
                {getDisplayedQuizzes().length}{" "}
                {getDisplayedQuizzes().length !== 1 ? t("quiz.quizzes") : t("quiz.quiz")}
                {searchQuery && ` ${t("manager.matchingSearch", { query: searchQuery })}`}
              </p>
            </div>

            {/* Quizzes Grid */}
            {getDisplayedQuizzes().length === 0 ? (
              <EmptyState
                icon={<Search className="h-6 w-6" aria-hidden="true" />}
                title={t("manager.noQuizzesFound", { query: searchQuery })}
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {getDisplayedQuizzes().map((quiz) => renderQuizCard(quiz))}
              </div>
            )}
          </div>
        )}
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

function QuestionItem({ question }) {
  const [expanded, setExpanded] = useState(false);

  // Ensure options is an array
  let options = [];
  try {
    options = typeof question.options === "string" ? JSON.parse(question.options) : question.options;
  } catch (e) {
    console.error("Error parsing options", e);
  }

  // Helper to determine shape color like Kahoot
  const getShapeColor = (idx) => {
    const colors = ["bg-red-500", "bg-blue-500", "bg-amber-500", "bg-emerald-500"];
    return colors[idx % colors.length];
  };

  const answerIcons = ["▲", "◆", "●", "■"];

  return (
    <div
      className={`overflow-hidden rounded-xl border bg-surface shadow-sm transition-all duration-200 ${
        expanded
          ? "border-brand-400 ring-2 ring-brand-500/15"
          : "border-line hover:border-brand-300"
      }`}
    >
      {/* Header */}
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between gap-4 p-4 text-left transition-colors hover:bg-surface-muted/60"
      >
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-subtle">
            Quiz
          </span>
          <h4
            className={`text-sm font-semibold leading-snug text-ink md:text-base ${
              expanded ? "" : "line-clamp-1"
            }`}
          >
            {question.question_text}
          </h4>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {question.image_url && !expanded && (
            <div className="h-8 w-12 overflow-hidden rounded border border-line bg-surface-muted">
              <img src={question.image_url} alt="" className="h-full w-full object-cover" />
            </div>
          )}
          <div
            className={`rounded-full p-1 transition-transform duration-200 ${
              expanded ? "rotate-180 bg-brand-50 text-brand-600" : "text-ink-subtle"
            }`}
          >
            <ChevronDown size={18} aria-hidden="true" />
          </div>
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-line bg-surface-muted/30 p-4 pt-2">
          <div className="ml-1 mt-2 flex flex-col gap-6 md:flex-row">
            {question.image_url && (
              <div className="shrink-0">
                <div className="aspect-video h-32 w-auto overflow-hidden rounded-lg border border-line bg-surface-muted shadow-sm">
                  <img src={question.image_url} alt="Question" className="h-full w-full object-cover" />
                </div>
              </div>
            )}

            {/* Options Grid */}
            <div className="grid w-full flex-1 grid-cols-1 gap-2 self-start">
              {Array.isArray(options) &&
                options.map((opt, i) => {
                  if (!opt.text && !opt.image_url) return null;
                  return (
                    <div
                      key={i}
                      className={`flex items-center justify-between rounded-lg border p-2.5 ${
                        opt.is_correct
                          ? "border-emerald-200 bg-emerald-50 shadow-sm"
                          : "border-line bg-surface opacity-85"
                      }`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-[10px] text-white shadow-sm ${getShapeColor(i)}`}
                        >
                          {answerIcons[i % 4]}
                        </div>
                        <span
                          className={`truncate text-sm font-medium ${
                            opt.is_correct ? "text-ink" : "text-ink-muted"
                          }`}
                        >
                          {opt.text}
                        </span>
                      </div>
                      <div className="shrink-0 pl-2">
                        {opt.is_correct ? (
                          <Check size={18} className="text-success-600" aria-hidden="true" />
                        ) : (
                          <X size={18} className="text-danger-600/40" aria-hidden="true" />
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
