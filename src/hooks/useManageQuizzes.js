import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../supabaseClient";

export default function useManageQuizzes(appState) {
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
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null);
  const [folderContextMenu, setFolderContextMenu] = useState(null);
  const [moveQuizModal, setMoveQuizModal] = useState(null);
  const [assignQuizModal, setAssignQuizModal] = useState(null);
  const [viewAssignmentsModal, setViewAssignmentsModal] = useState(null);
  const [draggedItem, setDraggedItem] = useState(null);
  const [activeFolder, setActiveFolder] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedQuizzes, setSelectedQuizzes] = useState(new Set());
  const [sortBy, setSortBy] = useState("created_at");
  const [filterCategory, setFilterCategory] = useState(null);
  const [mobileFolderPanelOpen, setMobileFolderPanelOpen] = useState(false);
  const [highlightedQuizId, setHighlightedQuizId] = useState(null);
  const quizGridRef = useRef(null);

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
        .select("id, title, theme_id, background_image_url, category_id, folder_id, created_at, categories(name), questions(id), quiz_assignments(count)")
        .eq("created_by", user.user.id)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      // Add question count and assignment count to each quiz
      const quizzesWithCount = (data || []).map((quiz) => ({
        ...quiz,
        questionCount: quiz.questions?.length || 0,
        assignmentCount: quiz.quiz_assignments?.[0]?.count || 0,
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
    if (!newFolderName.trim() || creatingFolder) return;

    setCreatingFolder(true);
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
    } finally {
      setCreatingFolder(false);
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
        try {
          const { error: deleteError } = await supabase
            .from("quiz_folders")
            .delete()
            .eq("id", folderId);

          if (deleteError) throw deleteError;

          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          await fetchFolders();
          await fetchQuizzes();
          setFolderContextMenu(null);
        } catch (err) {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
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
        try {
          const { error: deleteError } = await supabase
            .from("quizzes")
            .delete()
            .eq("id", quizId);

          if (deleteError) throw deleteError;
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          await fetchQuizzes();
        } catch (err) {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
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

  const handleStartQuiz = async (quizId, navigateToSession) => {
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
      if (navigateToSession) navigateToSession(session.id);
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
        try {
          const quizIds = Array.from(selectedQuizzes);
          const { error } = await supabase
            .from("quizzes")
            .delete()
            .in("id", quizIds);

          if (error) throw error;

          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          await fetchQuizzes();
          clearSelection();
        } catch (err) {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
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

  // Handle clicking a quiz in the folder sidebar
  const handleSidebarQuizClick = useCallback((quiz, folderId) => {
    // Set the active folder so the quiz's card is visible in the grid
    setActiveFolder(folderId);
    setHighlightedQuizId(quiz.id);

    // Wait for the grid to re-render with the correct folder, then scroll
    setTimeout(() => {
      const cardEl = document.querySelector(`[data-quiz-id="${quiz.id}"]`);
      if (cardEl) {
        cardEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);

    // Clear highlight after a few seconds
    setTimeout(() => {
      setHighlightedQuizId(null);
    }, 3000);
  }, []);

  return {
    // State
    quizzes, folders, expandedFolders, loading, error, themesById,
    showNewFolderModal, newFolderName, selectedParentFolder, creatingFolder,
    editingFolder, folderContextMenu, moveQuizModal, assignQuizModal,
    viewAssignmentsModal, draggedItem, activeFolder, searchQuery,
    selectedQuizzes, sortBy, filterCategory, mobileFolderPanelOpen,
    highlightedQuizId, quizGridRef, alertModal, confirmModal,

    // Setters needed by UI
    setShowNewFolderModal, setNewFolderName, setSelectedParentFolder,
    setEditingFolder, setFolderContextMenu, setMoveQuizModal,
    setAssignQuizModal, setViewAssignmentsModal, setDraggedItem,
    setActiveFolder, setSearchQuery, setSelectedQuizzes, setSortBy,
    setFilterCategory, setMobileFolderPanelOpen, setHighlightedQuizId,
    setAlertModal, setConfirmModal,

    // Actions
    fetchQuizzes, fetchFolders, toggleFolder, createFolder, renameFolder,
    deleteFolder, moveQuizToFolder, handleDragStart, handleDragOver,
    handleDrop, handleDelete, handleDuplicate, handleStartQuiz,
    buildFolderTree, getQuizzesInFolder, getQuizzesWithoutFolder,
    getDisplayedQuizzes, toggleQuizSelection, selectAllQuizzes,
    clearSelection, bulkMoveQuizzes, bulkDeleteQuizzes,
    handleSidebarQuizClick,
  };
}
