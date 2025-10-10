import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../../supabaseClient";
import { Plus, Edit2, Trash2, Play, Copy, Folder, FolderPlus, ChevronRight, ChevronDown, MoreVertical, FolderOpen, Search, Filter, CheckSquare, Square, Move, Archive, Eye } from "lucide-react";
import VerticalNav from "../layout/VerticalNav";
import AlertModal from "../common/AlertModal";
import ConfirmModal from "../common/ConfirmModal";

export default function ManageQuizzes({ setView, appState }) {
  const { t } = useTranslation();
  const [quizzes, setQuizzes] = useState([]);
  const [folders, setFolders] = useState([]);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [themesById, setThemesById] = useState({});
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [selectedParentFolder, setSelectedParentFolder] = useState(null);
  const [editingFolder, setEditingFolder] = useState(null);
  const [folderContextMenu, setFolderContextMenu] = useState(null);
  const [moveQuizModal, setMoveQuizModal] = useState(null);
  const [draggedItem, setDraggedItem] = useState(null);
  const [activeFolder, setActiveFolder] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedQuizzes, setSelectedQuizzes] = useState(new Set());
  const [sortBy, setSortBy] = useState("created_at");
  const [filterCategory, setFilterCategory] = useState(null);

  // Alert/Confirm modals
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: "", message: "", type: "info" });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: "", message: "", onConfirm: null });

  useEffect(() => {
    const init = async () => {
      const themesMap = await fetchThemes();
      await fetchQuizzes(themesMap);
      await fetchFolders();
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

  const fetchQuizzes = async (themeMap = themesById) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) {
        setError(t('errors.notAuthenticated'));
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("quizzes")
        .select("id, title, theme_id, background_image_url, category_id, folder_id, created_at, categories(name), questions(id)")
        .eq("created_by", user.user.id)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      // Add question count to each quiz
      const quizzesWithCount = (data || []).map((quiz) => ({
        ...quiz,
        questionCount: quiz.questions?.length || 0,
        themeDetails: themeMap[quiz.theme_id] || null
      }));

      setQuizzes(quizzesWithCount);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchFolders = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) return;

      const { data, error: fetchError } = await supabase
        .from("quiz_folders")
        .select("*")
        .eq("created_by", user.user.id)
        .order("order_index", { ascending: true });

      if (fetchError) throw fetchError;
      setFolders(data || []);
    } catch (err) {
      console.error("Error fetching folders:", err.message);
    }
  };

  const toggleFolder = (folderId) => {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      const { data: user } = await supabase.auth.getUser();
      const { error: insertError } = await supabase
        .from("quiz_folders")
        .insert([
          {
            name: newFolderName,
            parent_folder_id: selectedParentFolder,
            created_by: user.user.id,
          },
        ]);

      if (insertError) throw insertError;

      await fetchFolders();
      setShowNewFolderModal(false);
      setNewFolderName("");
      setSelectedParentFolder(null);
    } catch (err) {
      setAlertModal({
        isOpen: true,
        title: t('common.error'),
        message: t('errors.errorCreatingFolder') + ": " + err.message,
        type: "error"
      });
    }
  };

  const renameFolder = async (folderId, newName) => {
    if (!newName.trim()) return;

    try {
      const { error: updateError } = await supabase
        .from("quiz_folders")
        .update({ name: newName })
        .eq("id", folderId);

      if (updateError) throw updateError;

      await fetchFolders();
      setEditingFolder(null);
    } catch (err) {
      setAlertModal({
        isOpen: true,
        title: t('common.error'),
        message: t('errors.errorRenamingFolder') + ": " + err.message,
        type: "error"
      });
    }
  };

  const deleteFolder = (folderId) => {
    setConfirmModal({
      isOpen: true,
      title: t('folder.deleteFolder'),
      message: t('manager.deleteFolderConfirm'),
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        try {
          const { error: deleteError } = await supabase
            .from("quiz_folders")
            .delete()
            .eq("id", folderId);

          if (deleteError) throw deleteError;

          await fetchFolders();
          await fetchQuizzes();
          setFolderContextMenu(null);
        } catch (err) {
          setAlertModal({
            isOpen: true,
            title: t('common.error'),
            message: t('errors.errorDeletingFolder') + ": " + err.message,
            type: "error"
          });
        }
      }
    });
  };

  const moveQuizToFolder = async (quizId, folderId) => {
    try {
      const { error: updateError } = await supabase
        .from("quizzes")
        .update({ folder_id: folderId })
        .eq("id", quizId);

      if (updateError) throw updateError;

      await fetchQuizzes();
      setMoveQuizModal(null);
    } catch (err) {
      setAlertModal({
        isOpen: true,
        title: t('common.error'),
        message: t('errors.errorMovingQuiz') + ": " + err.message,
        type: "error"
      });
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e, item, type) => {
    setDraggedItem({ item, type });
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e, targetFolder) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedItem) return;

    try {
      if (draggedItem.type === "quiz") {
        // Moving a quiz to a folder
        await moveQuizToFolder(draggedItem.item.id, targetFolder?.id || null);
      } else if (draggedItem.type === "folder") {
        // Moving a folder to another folder (or root)
        if (draggedItem.item.id === targetFolder?.id) {
          // Can't move folder into itself
          setAlertModal({
            isOpen: true,
            title: t('common.error'),
            message: t('manager.cannotMoveIntoItself'),
            type: "error"
          });
          return;
        }

        // Check if target is a descendant of dragged folder
        let currentParent = targetFolder?.parent_folder_id;
        while (currentParent) {
          if (currentParent === draggedItem.item.id) {
            setAlertModal({
              isOpen: true,
              title: t('common.error'),
              message: t('manager.cannotMoveIntoSubfolder'),
              type: "error"
            });
            return;
          }
          const parentFolder = folders.find(f => f.id === currentParent);
          currentParent = parentFolder?.parent_folder_id;
        }

        const { error: updateError } = await supabase
          .from("quiz_folders")
          .update({ parent_folder_id: targetFolder?.id || null })
          .eq("id", draggedItem.item.id);

        if (updateError) throw updateError;

        await fetchFolders();
      }
    } catch (err) {
      setAlertModal({
        isOpen: true,
        title: t('common.error'),
        message: t('errors.errorMovingItem') + ": " + err.message,
        type: "error"
      });
    } finally {
      setDraggedItem(null);
    }
  };

  const handleDelete = (quizId) => {
    setConfirmModal({
      isOpen: true,
      title: t('quiz.deleteQuiz'),
      message: t('manager.deleteQuizConfirm'),
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        try {
          const { error: deleteError } = await supabase
            .from("quizzes")
            .delete()
            .eq("id", quizId);

          if (deleteError) throw deleteError;
          await fetchQuizzes();
        } catch (err) {
          setAlertModal({
            isOpen: true,
            title: t('common.error'),
            message: t('errors.errorDeletingQuiz') + ": " + err.message,
            type: "error"
          });
        }
      }
    });
  };

  const handleDuplicate = async (quizId) => {
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

      // Create new quiz
      const { data: newQuiz, error: newQuizError } = await supabase
        .from("quizzes")
        .insert([
          {
            title: `${quiz.title} (Copy)`,
            theme_id: quiz.theme_id || null,
            category_id: quiz.category_id,
            created_by: appState.currentUser.id,
            background_image_url: quiz.background_image_url || null,
            randomize_questions: quiz.randomize_questions,
            randomize_answers: quiz.randomize_answers,
            is_template: quiz.is_template,
            is_public: quiz.is_public,
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
        message: t('messages.quizDuplicatedSuccess'),
        type: "success"
      });
      await fetchQuizzes();
    } catch (err) {
      setAlertModal({
        isOpen: true,
        title: t('common.error'),
        message: t('errors.errorDuplicatingQuiz') + ": " + err.message,
        type: "error"
      });
    }
  };

  const handleStartQuiz = async (quizId) => {
    try {
      // Check if quiz has questions
      const { data: questions, error: qErr } = await supabase
        .from("questions")
        .select("id")
        .eq("quiz_id", quizId);

      if (qErr) throw qErr;
      if (!questions || questions.length === 0) {
        setAlertModal({
          isOpen: true,
          title: t('quiz.noQuestions'),
          message: t('errors.noQuestions'),
          type: "error"
        });
        return;
      }

      // Generate a 6-digit PIN
      const pin = Math.floor(100000 + Math.random() * 900000).toString();

      // Create quiz session
      const { data: session, error: sessionError } = await supabase
        .from("quiz_sessions")
        .insert([
          {
            quiz_id: quizId,
            pin: pin,
            status: "waiting",
            current_question_index: 0,
            host_id: appState.currentUser.id,
          },
        ])
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Navigate to teacher control with session ID
      setView("teacher-control", session.id);
    } catch (err) {
      setAlertModal({
        isOpen: true,
        title: t('common.error'),
        message: t('errors.errorStartingQuiz') + ": " + err.message,
        type: "error"
      });
    }
  };

  // Helper function to build folder tree structure
  const buildFolderTree = (parentId = null) => {
    return folders
      .filter((folder) => folder.parent_folder_id === parentId)
      .sort((a, b) => a.order_index - b.order_index);
  };

  // Get quizzes for a specific folder
  const getQuizzesInFolder = (folderId) => {
    return quizzes.filter((quiz) => quiz.folder_id === folderId);
  };

  // Get quizzes without a folder
  const getQuizzesWithoutFolder = () => {
    return quizzes.filter((quiz) => !quiz.folder_id);
  };

  // Get filtered and searched quizzes for active folder
  const getDisplayedQuizzes = () => {
    let displayed = activeFolder === "unfiled"
      ? getQuizzesWithoutFolder()
      : activeFolder
        ? getQuizzesInFolder(activeFolder)
        : quizzes;

    // Apply search
    if (searchQuery) {
      displayed = displayed.filter((quiz) =>
        quiz.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply category filter
    if (filterCategory) {
      displayed = displayed.filter((quiz) => quiz.category_id === filterCategory);
    }

    // Apply sort
    if (sortBy === "created_at") {
      displayed.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortBy === "title") {
      displayed.sort((a, b) => a.title.localeCompare(b.title));
    }

    return displayed;
  };

  // Toggle quiz selection
  const toggleQuizSelection = (quizId) => {
    setSelectedQuizzes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(quizId)) {
        newSet.delete(quizId);
      } else {
        newSet.add(quizId);
      }
      return newSet;
    });
  };

  // Select all displayed quizzes
  const selectAllQuizzes = () => {
    const displayed = getDisplayedQuizzes();
    setSelectedQuizzes(new Set(displayed.map((q) => q.id)));
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedQuizzes(new Set());
  };

  // Bulk move quizzes
  const bulkMoveQuizzes = async (folderId) => {
    try {
      const quizIds = Array.from(selectedQuizzes);
      const { error } = await supabase
        .from("quizzes")
        .update({ folder_id: folderId })
        .in("id", quizIds);

      if (error) throw error;

      await fetchQuizzes();
      clearSelection();
      setMoveQuizModal(null);
    } catch (err) {
      setAlertModal({
        isOpen: true,
        title: t('common.error'),
        message: t('errors.errorMovingQuizzes') + ": " + err.message,
        type: "error"
      });
    }
  };

  // Bulk delete quizzes
  const bulkDeleteQuizzes = () => {
    setConfirmModal({
      isOpen: true,
      title: t('quiz.deleteQuiz'),
      message: t('manager.deleteQuizzesConfirm', { count: selectedQuizzes.size }),
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        try {
          const quizIds = Array.from(selectedQuizzes);
          const { error } = await supabase
            .from("quizzes")
            .delete()
            .in("id", quizIds);

          if (error) throw error;

          await fetchQuizzes();
          clearSelection();
        } catch (err) {
          setAlertModal({
            isOpen: true,
            title: t('common.error'),
            message: t('errors.errorDeletingQuizzes') + ": " + err.message,
            type: "error"
          });
        }
      }
    });
  };

  // Recursive folder renderer
  const renderFolder = (folder, depth = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const subfolders = buildFolderTree(folder.id);
    const folderQuizzes = getQuizzesInFolder(folder.id);
    const hasChildren = subfolders.length > 0 || folderQuizzes.length > 0;
    const isActive = activeFolder === folder.id;

    return (
      <div key={folder.id} style={{ marginLeft: `${depth * 16}px` }}>
        <div
          draggable
          onDragStart={(e) => handleDragStart(e, folder, "folder")}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, folder)}
          onClick={() => setActiveFolder(folder.id)}
          className={`flex items-center gap-2 py-2 px-3 rounded-lg group cursor-pointer transition-colors ${
            isActive ? "bg-purple-100 text-purple-700 font-medium" : "hover:bg-gray-200 text-gray-700"
          } ${draggedItem?.item.id === folder.id ? "opacity-50" : ""}`}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              hasChildren && toggleFolder(folder.id);
            }}
            className="p-1 hover:bg-gray-300 rounded"
          >
            {hasChildren ? (
              isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
            ) : (
              <span className="w-4" />
            )}
          </button>
          {isExpanded ? <FolderOpen size={18} className={isActive ? "text-purple-600" : "text-yellow-600"} /> : <Folder size={18} className={isActive ? "text-purple-600" : "text-yellow-600"} />}

          {editingFolder === folder.id ? (
            <input
              type="text"
              defaultValue={folder.name}
              autoFocus
              onClick={(e) => e.stopPropagation()}
              onBlur={(e) => renameFolder(folder.id, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") renameFolder(folder.id, e.target.value);
                if (e.key === "Escape") setEditingFolder(null);
              }}
              className="flex-1 px-2 py-1 border rounded text-sm"
            />
          ) : (
            <span className="flex-1 text-sm">{folder.name}</span>
          )}

          <span className={`text-xs px-2 py-0.5 rounded-full ${isActive ? "bg-purple-200 text-purple-700" : "bg-gray-200 text-gray-600"}`}>
            {folderQuizzes.length}
          </span>

          <div className="opacity-0 group-hover:opacity-100 flex gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedParentFolder(folder.id);
                setShowNewFolderModal(true);
              }}
              className="p-1 hover:bg-gray-300 rounded transition"
              title="Add subfolder"
            >
              <FolderPlus size={14} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditingFolder(folder.id);
              }}
              className="p-1 hover:bg-gray-300 rounded transition"
              title="Rename folder"
            >
              <Edit2 size={14} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteFolder(folder.id);
              }}
              className="p-1 hover:bg-red-100 text-red-600 rounded transition"
              title="Delete folder"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {isExpanded && (
          <div>
            {/* Render subfolders */}
            {subfolders.map((subfolder) => renderFolder(subfolder, depth + 1))}

            {/* Render quizzes in this folder as simple clickable items */}
            {folderQuizzes.length > 0 && (
              <div className="ml-8 mt-1 space-y-1">
                {folderQuizzes.map((quiz) => {
                  const theme = quiz.themeDetails || themesById[quiz.theme_id] || null;
                  const backgroundImage = theme?.background_image_url || quiz.background_image_url;
                  const gradient = theme?.primary_color
                    ? `linear-gradient(135deg, ${theme.primary_color}, ${theme.secondary_color || theme.primary_color})`
                    : "linear-gradient(135deg, #7C3AED, #2563EB)";

                  return (
                    <div
                      key={quiz.id}
                      onClick={() => setActiveFolder(folder.id)}
                      className="py-1.5 px-3 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer transition-colors flex items-center gap-2"
                    >
                      <div
                        className="w-3 h-3 rounded-full border border-white/60 shadow"
                        style={{
                          backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          background: backgroundImage ? undefined : gradient
                        }}
                      ></div>
                      <span className="flex-1">{quiz.title}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Helper function to translate theme names
  const translateThemeName = (themeName) => {
    if (!themeName) return t('theme.defaultTheme');

    const lowerName = themeName.toLowerCase();
    const themeKey = `theme.${lowerName}`;

    // Try to translate, if translation key doesn't exist, return original name
    const translated = t(themeKey);
    return translated === themeKey ? themeName : translated;
  };

  // Quiz card renderer
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
    const isSelected = selectedQuizzes.has(quiz.id);
    const themeMeta = getThemeMeta(quiz);
    const badgeLabel = themeMeta.label;

    return (
      <div
        key={quiz.id}
        draggable
        onDragStart={(e) => handleDragStart(e, quiz, "quiz")}
        className={`bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-200 overflow-hidden border-2 ${
          isSelected ? "border-purple-500 ring-2 ring-purple-200" : "border-transparent"
        } ${draggedItem?.item.id === quiz.id ? "opacity-50" : ""}`}
      >
        {/* Theme Preview */}
        <div className="relative h-28">
          <div className="absolute inset-0" style={themeMeta.style}></div>
          {themeMeta.overlay && <div className="absolute inset-0 bg-black/35" />}
          <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between">
            <span
              className="text-sm font-semibold drop-shadow"
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
                <CheckSquare size={20} className="text-purple-600" />
              ) : (
                <Square size={20} className="text-gray-400 hover:text-purple-600" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{quiz.title}</h3>

              {/* Tags/Badges */}
              <div className="flex flex-wrap gap-2 mb-3">
                {badgeLabel && (
                  <span className="text-xs px-2 py-1 rounded-full font-medium bg-purple-100 text-purple-700 border border-purple-200">
                    {badgeLabel}
                  </span>
                )}
                {quiz.categories?.name && (
                  <span className="text-xs px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-300">
                    {quiz.categories.name}
                  </span>
                )}
              </div>

              {/* Meta info */}
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>{new Date(quiz.created_at).toLocaleDateString()}</span>
                <span>•</span>
                <span>{t('quiz.questionCount', { count: quiz.questionCount })}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons - Horizontal row */}
          <div className="flex items-center gap-1 pt-3 border-t border-gray-100">
            <button
              onClick={() => handleStartQuiz(quiz.id)}
              className="flex-1 bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 transition text-sm font-medium flex items-center justify-center gap-1.5"
              title={t('quiz.startQuiz')}
            >
              <Play size={14} />
              {t('actions.start')}
            </button>
            <button
              onClick={() => setView("preview-quiz", quiz.id)}
              className="p-2 bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition"
              title={t('actions.preview')}
            >
              <Eye size={16} />
            </button>
            <button
              onClick={() => setView("edit-quiz", quiz.id)}
              className="p-2 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition"
              title={t('common.edit')}
            >
              <Edit2 size={16} />
            </button>
            <button
              onClick={() => handleDuplicate(quiz.id)}
              className="p-2 bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 transition"
              title={t('actions.duplicate')}
            >
              <Copy size={16} />
            </button>
            <button
              onClick={() => setMoveQuizModal(quiz.id)}
              className="p-2 bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100 transition"
              title={t('folder.moveToFolder')}
            >
              <Move size={16} />
            </button>
            <button
              onClick={() => handleDelete(quiz.id)}
              className="p-2 bg-red-50 text-red-700 rounded-md hover:bg-red-100 transition"
              title={t('common.delete')}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Vertical Navigation */}
      <VerticalNav currentView="manage-quizzes" setView={setView} appState={appState} />

      {/* Main Content */}
      <div className="flex-1 ml-64">
        {/* Top Navigation */}
        <nav className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-purple-600">{t('manager.quizManager')}</h1>
              <div className="h-6 w-px bg-gray-300"></div>
              <span className="text-sm text-gray-600">
                {t('manager.quizzesAndFolders', {
                  quizCount: quizzes.length,
                  quizText: quizzes.length !== 1 ? t('quiz.quizzes') : t('quiz.quiz'),
                  folderCount: folders.length,
                  folderText: folders.length !== 1 ? t('folder.folders') : t('folder.folder')
                })}
              </span>
            </div>
          </div>
        </nav>

        {/* Toolbar */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Left: Search and Filters */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative flex-1 max-w-md">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={t('manager.searchQuizzes')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            >
              <option value="created_at">{t('manager.sortNewest')}</option>
              <option value="title">{t('manager.sortAZ')}</option>
            </select>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center gap-2">
            {selectedQuizzes.size > 0 && (
              <>
                <div className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium">
                  {t('manager.selected', { count: selectedQuizzes.size })}
                </div>
                <button
                  onClick={() => setMoveQuizModal("bulk")}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition flex items-center gap-2 text-sm"
                >
                  <Move size={16} />
                  {t('manager.move')}
                </button>
                <button
                  onClick={bulkDeleteQuizzes}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-2 text-sm"
                >
                  <Trash2 size={16} />
                  {t('common.delete')}
                </button>
                <button
                  onClick={clearSelection}
                  className="px-3 py-2 text-gray-600 hover:text-gray-800 text-sm"
                >
                  {t('manager.clear')}
                </button>
              </>
            )}

            {selectedQuizzes.size === 0 && (
              <>
                <button
                  onClick={() => {
                    setSelectedParentFolder(null);
                    setShowNewFolderModal(true);
                  }}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition flex items-center gap-2 text-sm font-medium"
                >
                  <FolderPlus size={16} />
                  {t('folder.newFolder')}
                </button>
                <button
                  onClick={() => setView("create-quiz")}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2 text-sm font-medium"
                >
                  <Plus size={16} />
                  {t('nav.createQuiz')}
                </button>
              </>
            )}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex h-[calc(100vh-140px)]">
        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-600">{t('common.loading')}</p>
          </div>
        )}

        {error && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-red-600">{t('common.error')}: {error}</p>
          </div>
        )}

        {!loading && !error && quizzes.length === 0 && folders.length === 0 && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="bg-white rounded-xl shadow-lg p-12 text-center max-w-md">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus size={32} className="text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{t('quiz.noQuizzes')}</h3>
              <p className="text-gray-600 mb-6">{t('manager.getStarted')}</p>
              <button
                onClick={() => setView("create-quiz")}
                className="bg-purple-600 text-white px-8 py-3 rounded-lg hover:bg-purple-700 transition font-medium"
              >
                {t('manager.createYourFirstQuiz')}
              </button>
            </div>
          </div>
        )}

        {!loading && !error && (folders.length > 0 || quizzes.length > 0) && (
          <>
            {/* Left Sidebar: Folder Tree */}
            <div className="w-72 bg-gray-100 border-r border-gray-200 overflow-y-auto">
              <div className="p-4">
                <h3 className="font-bold text-sm uppercase text-gray-600 mb-3 px-2">{t('folder.folders')}</h3>
                <div className="space-y-0.5">
                  {/* All Quizzes */}
                  <div
                    onClick={() => setActiveFolder(null)}
                    className={`py-2 px-3 rounded-lg flex items-center gap-2 cursor-pointer transition-colors ${
                      activeFolder === null ? "bg-purple-100 text-purple-700 font-medium" : "hover:bg-gray-200 text-gray-700"
                    }`}
                  >
                    <Archive size={18} className={activeFolder === null ? "text-purple-600" : "text-gray-600"} />
                    <span className="flex-1 text-sm">{t('folder.allQuizzes')}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      activeFolder === null ? "bg-purple-200 text-purple-700" : "bg-gray-200 text-gray-600"
                    }`}>
                      {quizzes.length}
                    </span>
                  </div>

                  {/* Unfiled Quizzes */}
                  <div
                    onClick={() => setActiveFolder("unfiled")}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, null)}
                    className={`py-2 px-3 rounded-lg flex items-center gap-2 cursor-pointer transition-colors ${
                      activeFolder === "unfiled" ? "bg-purple-100 text-purple-700 font-medium" : "hover:bg-gray-200 text-gray-700"
                    }`}
                  >
                    <FolderOpen size={18} className={activeFolder === "unfiled" ? "text-purple-600" : "text-gray-600"} />
                    <span className="flex-1 text-sm">{t('folder.unfiledQuizzes')}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      activeFolder === "unfiled" ? "bg-purple-200 text-purple-700" : "bg-gray-200 text-gray-600"
                    }`}>
                      {getQuizzesWithoutFolder().length}
                    </span>
                  </div>

                  {/* Folder Tree */}
                  <div className="pt-2 border-t border-gray-300 mt-2">
                    {buildFolderTree(null).map((folder) => renderFolder(folder))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Quizzes Grid */}
            <div className="flex-1 overflow-y-auto bg-white">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {activeFolder === null
                        ? t('folder.allQuizzes')
                        : activeFolder === "unfiled"
                          ? t('folder.unfiledQuizzes')
                          : folders.find((f) => f.id === activeFolder)?.name || t('folder.folder')}
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {getDisplayedQuizzes().length} {getDisplayedQuizzes().length !== 1 ? t('quiz.quizzes') : t('quiz.quiz')}
                      {searchQuery && ` ${t('manager.matchingSearch', { query: searchQuery })}`}
                    </p>
                  </div>

                  {getDisplayedQuizzes().length > 0 && (
                    <button
                      onClick={selectAllQuizzes}
                      className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                    >
                      {t('manager.selectAll')}
                    </button>
                  )}
                </div>

                {/* Quizzes Grid */}
                {getDisplayedQuizzes().length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Search size={32} className="text-gray-400" />
                    </div>
                    <p className="text-gray-600">
                      {searchQuery ? t('manager.noQuizzesFound', { query: searchQuery }) : t('manager.noQuizzesInFolder')}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {getDisplayedQuizzes().map((quiz) => renderQuizCard(quiz))}
                  </div>
                )}
              </div>
            </div>
            </>
          )}
        </div>

        {/* New Folder Modal */}
        {showNewFolderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96">
            <h3 className="text-xl font-bold mb-4">
              {selectedParentFolder ? t('folder.createSubfolder') : t('folder.createFolder')}
            </h3>
            <input
              type="text"
              placeholder={t('folder.folderName')}
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createFolder()}
              className="w-full px-4 py-2 border rounded-lg mb-4"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowNewFolderModal(false);
                  setNewFolderName("");
                  setSelectedParentFolder(null);
                }}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={createFolder}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                {t('common.create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move Quiz to Folder Modal */}
      {moveQuizModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-96 max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-2">
              {moveQuizModal === "bulk" ? t('folder.moveToFolder') + ` (${selectedQuizzes.size})` : t('folder.moveToFolder')}
            </h3>
            <p className="text-sm text-gray-600 mb-4">{t('folder.folder')}</p>

            <div className="space-y-1 max-h-96 overflow-y-auto">
              <button
                onClick={() => {
                  if (moveQuizModal === "bulk") {
                    bulkMoveQuizzes(null);
                  } else {
                    moveQuizToFolder(moveQuizModal, null);
                  }
                }}
                className="w-full text-left px-4 py-3 hover:bg-purple-50 rounded-lg transition flex items-center gap-3 group"
              >
                <FolderOpen size={18} className="text-gray-600 group-hover:text-purple-600" />
                <span className="text-sm group-hover:text-purple-700 font-medium">{t('folder.unfiledQuizzes')}</span>
              </button>

              {folders.map((folder) => {
                const depth = (() => {
                  let d = 0;
                  let currentId = folder.parent_folder_id;
                  while (currentId) {
                    d++;
                    const parent = folders.find((f) => f.id === currentId);
                    currentId = parent?.parent_folder_id;
                  }
                  return d;
                })();

                return (
                  <button
                    key={folder.id}
                    onClick={() => {
                      if (moveQuizModal === "bulk") {
                        bulkMoveQuizzes(folder.id);
                      } else {
                        moveQuizToFolder(moveQuizModal, folder.id);
                      }
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-purple-50 rounded-lg transition flex items-center gap-3 group"
                    style={{ paddingLeft: `${16 + depth * 20}px` }}
                  >
                    <Folder size={18} className="text-yellow-600 group-hover:text-purple-600" />
                    <span className="text-sm group-hover:text-purple-700">{folder.name}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200 flex gap-2">
              <button
                onClick={() => setMoveQuizModal(null)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
          </div>
        )}

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
          confirmStyle="danger"
        />
      </div>
    </div>
  );
}
