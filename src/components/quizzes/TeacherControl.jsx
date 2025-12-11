import React, { useState, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../../supabaseClient";
import { Users, Play, SkipForward, Trophy, X, Heart, Spade, Diamond, Club, Clock, RefreshCw, BrainCircuit } from "lucide-react";
import PodiumAnimation from "../animations/PodiumAnimation";
import AlertModal from "../common/AlertModal";
import ConfirmModal from "../common/ConfirmModal";
import AutoPlayVideo from "../common/AutoPlayVideo";

export default function TeacherControl({ sessionId, setView }) {
  const { t } = useTranslation();
  const [session, setSession] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [shuffledQuestions, setShuffledQuestions] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [teams, setTeams] = useState([]);
  const [theme, setTheme] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionOrder, setQuestionOrder] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [questionResults, setQuestionResults] = useState([]);
  const [liveAnswers, setLiveAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModeSelection, setShowModeSelection] = useState(true);
  const [selectedMode, setSelectedMode] = useState("classic");
  const [isThinkingTime, setIsThinkingTime] = useState(false);
  const [countdownValue, setCountdownValue] = useState(5);
  const [questionTimeRemaining, setQuestionTimeRemaining] = useState(0);
  const [autoAdvanceTimer, setAutoAdvanceTimer] = useState(null);
  const [allStudentsAnswered, setAllStudentsAnswered] = useState(false);
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: "", message: "", type: "info" });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: "", message: "", onConfirm: null });

  // Ref to hold current question for real-time subscription
  const currentQuestionRef = useRef(null);
  // Ref to hold current session for polling (avoids stale closure)
  const sessionRef = useRef(null);

  useEffect(() => {
    if (sessionId) {
      loadSession();
      const cleanup = setupRealtimeSubscriptions();

      // Add polling as a fallback mechanism for participant updates
      // Poll every 3 seconds while in waiting status
      const pollInterval = setInterval(() => {
        // Use ref to get latest session state (avoids stale closure)
        const currentSession = sessionRef.current;
        if (currentSession?.status === 'waiting') {
          console.log('[TeacherControl] Polling for participant updates (fallback)');
          loadParticipants(currentSession);
        }

        // Poll for live answers while question is active
        if (currentSession?.status === 'question_active' && currentQuestion) {
          console.log('[TeacherControl] Polling for live answers (fallback)');
          loadLiveAnswers(currentQuestion.id);
        }
      }, 3000);

      return () => {
        cleanup();
        clearInterval(pollInterval);
      };
    }
  }, [sessionId, session?.status, currentQuestion?.id]);

  // Keep ref in sync with currentQuestion state
  useEffect(() => {
    currentQuestionRef.current = currentQuestion;
  }, [currentQuestion]);

  // Keep sessionRef in sync with session state
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // Countdown timer effect for quiz start
  useEffect(() => {
    if (session?.status === "active" && !currentQuestion && countdownValue > 0) {
      const timer = setTimeout(() => setCountdownValue(countdownValue - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [session?.status, currentQuestion, countdownValue]);

  // Question timer countdown effect
  useEffect(() => {
    if (session?.status === "question_active" && questionTimeRemaining > 0 && !allStudentsAnswered) {
      const timer = setInterval(() => {
        setQuestionTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [session?.status, questionTimeRemaining, allStudentsAnswered]);

  // Check if all students have answered
  useEffect(() => {
    if (session?.status === "question_active" && participants.length > 0) {
      const allAnswered = participants.filter((p) =>
        liveAnswers.some((a) => a.participant_id === p.id)
      ).length === participants.length;

      setAllStudentsAnswered(allAnswered);

      if (allAnswered && autoAdvanceTimer) {
        // All students have answered - cancel the auto-advance timer
        console.log('[TeacherControl] All students answered! Auto-advancing to results in 2 seconds...');
        clearTimeout(autoAdvanceTimer);

        // Auto-advance to results after 2 seconds so everyone can see they've all answered
        const earlyAdvanceTimer = setTimeout(() => {
          console.log('[TeacherControl] Auto-advancing to results now');
          showQuestionResults(session.current_question_index);
        }, 2000);

        setAutoAdvanceTimer(earlyAdvanceTimer);
      }
    }
  }, [liveAnswers, participants, session?.status]);

  const loadSession = async () => {
    try {
      // Load session - avoid .single() due to PostgreSQL 'mode' column conflict
      const { data: sessionData, error: sessionError } = await supabase
        .from("quiz_sessions")
        .select("*")
        .eq("id", sessionId);

      if (sessionError) throw sessionError;

      // Get first result from array
      const session = sessionData && sessionData.length > 0 ? sessionData[0] : null;
      if (!session) {
        throw new Error(t('errors.quizSessionNotFound'));
      }

      setSession(session);

      // Load quiz - avoid .single() to prevent 406 errors
      const { data: quizResults, error: quizError } = await supabase
        .from("quizzes")
        .select("*")
        .eq("id", session.quiz_id);

      if (quizError) throw quizError;

      // Get first result from array
      const quizData = quizResults && quizResults.length > 0 ? quizResults[0] : null;
      if (!quizData) {
        throw new Error(t('errors.quizNotFound'));
      }

      setQuiz(quizData);

      if (quizData.theme_id) {
        const { data: themeResults, error: themeError } = await supabase
          .from("themes")
          .select("*")
          .eq("id", quizData.theme_id);

        if (!themeError && themeResults && themeResults.length > 0) {
          setTheme(themeResults[0]);
        } else {
          setTheme(null);
        }
      } else {
        setTheme(null);
      }

      // Load questions
      const { data: questionsData, error: questionsError } = await supabase
        .from("questions")
        .select("*")
        .eq("quiz_id", session.quiz_id)
        .order("order_index", { ascending: true });

      if (questionsError) throw questionsError;
      setQuestions(questionsData);

      // Check if session already has a question order
      if (session.question_order) {
        // Use existing order from session
        const orderedQuestions = session.question_order
          .map(id => questionsData.find(q => q.id === id))
          .filter(Boolean);
        setShuffledQuestions(orderedQuestions);
        setQuestionOrder(session.question_order);
      } else {
        // Use questions in their original order
        setShuffledQuestions(questionsData);
        setQuestionOrder(questionsData.map(q => q.id));
      }

      // Load participants - pass session directly since state update may not have completed
      await loadParticipants(session);

      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const loadParticipants = async (sessionObj = null) => {
    // Use passed session object or fall back to state
    const currentSession = sessionObj || session;
    console.log('[TeacherControl] Loading participants for session:', sessionId, 'mode:', currentSession?.mode);
    let { data, error } = await supabase
      .from("session_participants")
      .select("*, users(name, avatar_url), teams(id, name, team_name)")
      .eq("session_id", sessionId)
      .order("score", { ascending: false });

    if (error) {
      console.error('[TeacherControl] Error loading participants:', error);
      console.error('[TeacherControl] Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });

      // Try a simpler query as fallback (in case teams table or is_team_entry column doesn't exist)
      console.log('[TeacherControl] Attempting fallback query without teams...');
      const fallbackResult = await supabase
        .from("session_participants")
        .select("*, users(name, avatar_url)")
        .eq("session_id", sessionId)
        .order("score", { ascending: false });

      if (fallbackResult.error) {
        console.error('[TeacherControl] Fallback query also failed:', fallbackResult.error);
      } else {
        console.log('[TeacherControl] Fallback query succeeded!');
        data = fallbackResult.data;
        error = null;
      }
    }

    console.log('[TeacherControl] Loaded participants data:', data);
    console.log('[TeacherControl] Number of participants:', data?.length || 0);

    // Fetch team members for team entries
    const participantsWithTeams = await Promise.all(
      (data || []).map(async (p) => {
        // Check if is_team_entry exists and is true
        if (p.is_team_entry === true && p.team_id) {
          try {
            // Fetch team members
            const { data: members } = await supabase
              .from("team_members")
              .select("student_id, users(name)")
              .eq("team_id", p.team_id);

            return {
              ...p,
              teamMembers: members || []
            };
          } catch (err) {
            console.error('[TeacherControl] Error fetching team members:', err);
            return p;
          }
        }
        return p;
      })
    );

    setParticipants(participantsWithTeams);
    console.log('[TeacherControl] Set participants state with', participantsWithTeams.length, 'participants');

    // Group by teams if in team mode
    if (currentSession?.mode === "team") {
      const teamMap = {};
      console.log('[TeacherControl] Processing team mode grouping, participants:', participantsWithTeams?.length);

      for (const p of (participantsWithTeams || [])) {
        console.log('[TeacherControl] Participant:', p.id, 'is_team_entry:', p.is_team_entry, 'team_id:', p.team_id, 'teams:', p.teams);

        // Only include team entries
        if (p.is_team_entry === true && p.team_id) {
          let teamName = "Unknown Team";

          // Try to get team name from joined data
          if (p.teams) {
            teamName = p.teams.name || p.teams.team_name || teamName;
            console.log('[TeacherControl] Team name from join:', teamName);
          } else {
            // Fallback: fetch team name directly if JOIN failed
            console.log('[TeacherControl] Teams JOIN failed, fetching directly for team_id:', p.team_id);
            try {
              const { data: teamData } = await supabase
                .from('teams')
                .select('name, team_name')
                .eq('id', p.team_id)
                .single();
              if (teamData) {
                teamName = teamData.name || teamData.team_name || teamName;
                console.log('[TeacherControl] Team name from direct fetch:', teamName);
              }
            } catch (err) {
              console.error('[TeacherControl] Error fetching team name:', err);
            }
          }

          if (!teamMap[teamName]) {
            teamMap[teamName] = [];
          }
          teamMap[teamName].push(p);
        }
      }

      const groupedTeams = Object.entries(teamMap).map(([name, members]) => ({
        name,
        members,
        score: members.reduce((sum, m) => sum + (m.score || 0), 0)
      }));

      setTeams(groupedTeams);
      console.log('[TeacherControl] Teams grouped:', groupedTeams.length, 'teams:', groupedTeams.map(t => t.name));
    }
  };

  const loadLiveAnswers = async (questionId) => {
    if (!questionId) {
      console.log('[TeacherControl] loadLiveAnswers called with no questionId');
      return;
    }

    console.log('[TeacherControl] Loading live answers for question:', questionId);

    const { data, error } = await supabase
      .from("quiz_answers")
      .select("*")
      .eq("session_id", sessionId)
      .eq("question_id", questionId);

    if (!error) {
      console.log('[TeacherControl] Loaded live answers:', data?.length || 0, 'answers');
      setLiveAnswers(data || []);
    } else {
      console.error('[TeacherControl] Error loading live answers:', error);
    }
  };

  const setupRealtimeSubscriptions = () => {
    console.log('[TeacherControl] Setting up realtime subscriptions for session:', sessionId);

    // Subscribe to new participants
    const participantChannel = supabase
      .channel(`session-${sessionId}-participants`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "session_participants",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          console.log('[TeacherControl] Participant change detected:', payload);
          console.log('[TeacherControl] Event type:', payload.eventType);
          console.log('[TeacherControl] New data:', payload.new);
          console.log('[TeacherControl] Old data:', payload.old);
          loadParticipants();
        }
      )
      .subscribe((status) => {
        console.log('[TeacherControl] Participant subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('[TeacherControl] Successfully subscribed to participant changes');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[TeacherControl] Error subscribing to participant channel');
        }
      });

    // Subscribe to answer submissions
    const answerChannel = supabase
      .channel(`session-${sessionId}-answers`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "quiz_answers",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          console.log('[TeacherControl] New answer detected:', payload);
          console.log('[TeacherControl] Answer details:', {
            participant_id: payload.new.participant_id,
            question_id: payload.new.question_id,
            is_correct: payload.new.is_correct
          });
          loadParticipants();
          // Reload live answers if this answer is for the current question
          // Use ref to avoid stale closure
          const activeQuestion = currentQuestionRef.current;
          console.log('[TeacherControl] Current active question:', activeQuestion?.id);
          if (activeQuestion && payload.new.question_id === activeQuestion.id) {
            console.log('[TeacherControl] Answer is for current question - reloading live answers');
            loadLiveAnswers(activeQuestion.id);
          } else {
            console.log('[TeacherControl] Answer is NOT for current question - ignoring');
          }
        }
      )
      .subscribe((status) => {
        console.log('[TeacherControl] Answer subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('[TeacherControl] Successfully subscribed to answer changes');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[TeacherControl] Error subscribing to answer channel');
        }
      });

    return () => {
      console.log('[TeacherControl] Cleaning up realtime subscriptions');
      participantChannel.unsubscribe();
      answerChannel.unsubscribe();
    };
  };

  const selectMode = async (mode) => {
    try {
      console.log('[TeacherControl] Selecting mode:', mode, 'for session:', sessionId);

      const { data, error } = await supabase
        .from("quiz_sessions")
        .update({ mode: mode })
        .eq("id", sessionId)
        .select();

      console.log('[TeacherControl] Mode update result:', { data, error });

      if (error) {
        console.error('[TeacherControl] Error updating mode:', error);
        setAlertModal({
          isOpen: true,
          title: t('common.error'),
          message: t('teacher.errorSettingMode') + ': ' + error.message,
          type: "error"
        });
        return;
      }

      console.log('[TeacherControl] Mode updated successfully to:', mode);
      setSelectedMode(mode);
      setShowModeSelection(false);

      // Create updated session object and set it
      const updatedSession = { ...session, mode };
      setSession(updatedSession);

      // Immediately reload participants with the new mode
      await loadParticipants(updatedSession);
    } catch (err) {
      console.error('[TeacherControl] Exception in selectMode:', err);
      setAlertModal({ isOpen: true, title: t('common.error'), message: t('teacher.errorSettingMode') + ': ' + err.message, type: "error" });
    }
  };

  const startQuiz = async () => {
    try {
      console.log('[startQuiz] Starting quiz, sessionId:', sessionId);
      console.log('[startQuiz] Current session state:', session);

      // First, verify the session exists and check permissions
      const { data: existingSession, error: checkError } = await supabase
        .from("quiz_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      console.log('[startQuiz] Existing session check:', { existingSession, checkError });

      if (checkError) {
        console.error('[startQuiz] Failed to fetch session:', checkError);
        setAlertModal({
          isOpen: true,
          title: t('errors.errorStartingQuiz'),
          message: `${t('teacher.cannotAccessSession')}: ${checkError.message}`,
          type: "error"
        });
        return;
      }

      // Now try to update with question order if not already set
      const updateData = { status: "active" };

      // Only set question_order if it hasn't been set yet
      if (!session.question_order && questionOrder) {
        updateData.question_order = questionOrder;
      }

      const { data, error } = await supabase
        .from("quiz_sessions")
        .update(updateData)
        .eq("id", sessionId)
        .select();

      console.log('[startQuiz] Update result:', { data, error });

      if (error) {
        console.error('[startQuiz] Update error:', error);
        setAlertModal({
          isOpen: true,
          title: t('errors.errorStartingQuiz'),
          message: `${t('teacher.failedToStartQuiz')}: ${error.message}\n\n${t('teacher.details')}: ${JSON.stringify(error, null, 2)}`,
          type: "error"
        });
        return;
      }

      console.log('[startQuiz] Quiz started successfully');
      setSession({ ...session, status: "active", question_order: questionOrder });
      setCountdownValue(5); // Reset countdown to 5

      // Wait 5 seconds before showing first question
      setTimeout(() => {
        showQuestion(0);
      }, 5000);
    } catch (err) {
      console.error('[startQuiz] Unexpected error:', err);
      setAlertModal({ isOpen: true, title: t('common.error'), message: t('errors.errorStartingQuiz') + ': ' + err.message, type: "error" });
    }
  };

  const shuffleArray = (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  const showQuestion = async (questionIndex) => {
    const questionsToUse = shuffledQuestions.length > 0 ? shuffledQuestions : questions;

    if (questionIndex >= questionsToUse.length) {
      await endQuiz();
      return;
    }

    try {
      const question = questionsToUse[questionIndex];

      // Update database with current question
      await supabase
        .from("quiz_sessions")
        .update({
          current_question_index: questionIndex,
          status: "question_active",
        })
        .eq("id", sessionId);

      // Clear any existing auto-advance timer
      if (autoAdvanceTimer) {
        clearTimeout(autoAdvanceTimer);
      }

      setCurrentQuestion(question);
      setShowResults(false);
      setLiveAnswers([]); // Reset live answers for new question
      setAllStudentsAnswered(false); // Reset for new question

      const startActualTimer = () => {
        setIsThinkingTime(false);
        setQuestionTimeRemaining(question.time_limit);

        // Auto-advance after time limit
        const timer = setTimeout(() => {
          showQuestionResults(questionIndex);
        }, question.time_limit * 1000);
        setAutoAdvanceTimer(timer);
      };

      if (session.mode === 'team') {
        // Team Mode: 5 second thinking time
        setIsThinkingTime(true);
        setQuestionTimeRemaining(5);

        // Update session state immediately
        setSession({
          ...session,
          current_question_index: questionIndex,
          status: "question_active",
        });

        // Load answers
        await loadLiveAnswers(question.id);

        // Wait 5 seconds then start actual timer
        setTimeout(() => {
          startActualTimer();
        }, 5000);
      } else {
        // Classic Mode: Start immediately
        setIsThinkingTime(false);
        setSession({
          ...session,
          current_question_index: questionIndex,
          status: "question_active",
        });

        await loadLiveAnswers(question.id);
        startActualTimer();
      }
    } catch (err) {
      setAlertModal({ isOpen: true, title: t('common.error'), message: t('teacher.errorShowingQuestion') + ': ' + err.message, type: "error" });
    }
  };

  const handleShowResults = () => {
    // Button only appears when all students have answered, so proceed directly
    proceedToResults();
  };

  const proceedToResults = () => {
    // Cancel auto-advance timer
    if (autoAdvanceTimer) {
      clearTimeout(autoAdvanceTimer);
      setAutoAdvanceTimer(null);
    }
    showQuestionResults(session.current_question_index);
  };

  const showQuestionResults = async (questionIndex) => {
    try {
      const questionsToUse = shuffledQuestions.length > 0 ? shuffledQuestions : questions;

      // Get all answers for this question
      const { data: answers, error } = await supabase
        .from("quiz_answers")
        .select("*, session_participants(users(name))")
        .eq("session_id", sessionId)
        .eq("question_id", questionsToUse[questionIndex].id);

      if (error) throw error;

      // Update session status
      await supabase
        .from("quiz_sessions")
        .update({ status: "showing_results" })
        .eq("id", sessionId);

      setQuestionResults(answers || []);
      setShowResults(true);
      setSession({ ...session, status: "showing_results" });
    } catch (err) {
      setAlertModal({ isOpen: true, title: t('common.error'), message: t('teacher.errorLoadingResults') + ': ' + err.message, type: "error" });
    }
  };

  const nextQuestion = () => {
    const nextIndex = session.current_question_index + 1;
    showQuestion(nextIndex);
  };

  const endQuiz = async (status = "completed") => {
    try {
      await supabase
        .from("quiz_sessions")
        .update({ status: status })
        .eq("id", sessionId);

      // Cleanup teams if in team mode - removes student memberships so teams don't persist
      if (session.mode === 'team') {
        try {
          console.log('[TeacherControl] Triggering team cleanup for session:', sessionId);
          await supabase.rpc('cleanup_session_teams', { p_session_id: sessionId });
          console.log('[TeacherControl] Team cleanup executed');
        } catch (cleanupError) {
          console.warn('[TeacherControl] Team cleanup failed (function might be missing):', cleanupError);
          // Not critical for ending the quiz, so we continue
        }
      }

      setSession({ ...session, status: status });
    } catch (err) {
      setAlertModal({ isOpen: true, title: "Error", message: "Error ending quiz: " + err.message, type: "error" });
    }
  };

  const closeSession = async () => {
    setConfirmModal({
      isOpen: true,
      title: "End Session",
      message: "Are you sure you want to end this session? This will cancel the quiz for all students.",
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        await endQuiz("cancelled");
        setView("manage-quizzes");
      }
    });
  };

  const getBackgroundConfig = () => {
    if (theme?.background_image_url) {
      return {
        style: {
          backgroundImage: `url(${theme.background_image_url})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        },
        overlay: true,
      };
    }

    if (theme && (theme.primary_color || theme.secondary_color)) {
      const primary = theme.primary_color || "#7C3AED";
      const secondary = theme.secondary_color || primary;
      return {
        style: {
          background: `linear-gradient(135deg, ${primary}, ${secondary})`,
        },
        overlay: false,
      };
    }

    if (quiz?.background_image_url) {
      return {
        style: {
          backgroundImage: `url(${quiz.background_image_url})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        },
        overlay: true,
      };
    }

    return {
      style: {
        background: "linear-gradient(135deg, #7C3AED, #2563EB)",
      },
      overlay: false,
    };
  };

  const backgroundConfig = useMemo(getBackgroundConfig, [theme, quiz]);

  const renderWithBackground = (content, options = {}) => {
    const { overlayStrength = 0.45 } = options;
    const useOverlay = backgroundConfig.overlay;

    return (
      <>
        <div className="min-h-screen relative" style={backgroundConfig.style}>
          {useOverlay && (
            <div
              className="absolute inset-0"
              style={{ backgroundColor: `rgba(0, 0, 0, ${overlayStrength})` }}
            />
          )}
          <div className="relative z-10 min-h-screen flex flex-col">
            {content}
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
      </>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-xl text-gray-600">Loading session...</p>
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
            className="bg-blue-700 text-white px-6 py-3 rounded-lg hover:bg-blue-800"
          >
            Back to Quizzes
          </button>
        </div>
      </div>
    );
  }

  // Mode Selection
  if (session.status === "waiting" && showModeSelection) {
    return renderWithBackground(
      <>
        <nav className="bg-white shadow-md p-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-700">{quiz.title}</h1>
          <button
            onClick={closeSession}
            className="text-red-600 hover:text-red-700"
          >
            <X size={24} />
          </button>
        </nav>

        <div className="flex-1">
          <div className="container mx-auto p-6 flex flex-col items-center justify-center min-h-[80vh]">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-12 text-center max-w-4xl w-full">
              <h2 className="text-4xl font-bold mb-4">Select Quiz Mode</h2>
              <p className="text-gray-600 mb-8">Choose how you want students to participate</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Classic Mode */}
                <div
                  onClick={() => selectMode("classic")}
                  className="border-2 border-gray-300 rounded-xl p-8 hover:border-blue-700 hover:shadow-lg transition cursor-pointer group bg-white"
                >
                  <div className="text-6xl mb-4">🎯</div>
                  <h3 className="text-2xl font-bold mb-3 group-hover:text-blue-700">Classic Mode</h3>
                  <p className="text-gray-600 mb-4">
                    Students join individually using the PIN and compete on their own.
                  </p>
                  <ul className="text-left text-sm text-gray-600 space-y-2">
                    <li>✓ Individual scores</li>
                    <li>✓ Personal leaderboard</li>
                    <li>✓ Quick setup</li>
                  </ul>
                </div>

                {/* Team Mode */}
                <div
                  onClick={() => selectMode("team")}
                  className="border-2 border-gray-300 rounded-xl p-8 hover:border-blue-600 hover:shadow-lg transition cursor-pointer group bg-white"
                >
                  <div className="text-6xl mb-4">👥</div>
                  <h3 className="text-2xl font-bold mb-3 group-hover:text-blue-600">Team Mode</h3>
                  <p className="text-gray-600 mb-4">
                    Students form teams with custom names and compete together.
                  </p>
                  <ul className="text-left text-sm text-gray-600 space-y-2">
                    <li>✓ Team collaboration</li>
                    <li>✓ Custom team names</li>
                    <li>✓ Combined scores</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Waiting for students
  if (session.status === "waiting" && !showModeSelection) {
    const isTeamMode = session.mode === "team";

    return renderWithBackground(
      <>
        <nav className="bg-white shadow-md p-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-700">{quiz.title}</h1>
          <div className="flex items-center gap-4">
            <span className={`px-4 py-2 rounded-lg font-semibold ${isTeamMode ? "bg-blue-100 text-blue-800" : "bg-blue-50 text-blue-800"
              }`}>
              {isTeamMode ? "Team Mode" : "Classic Mode"}
            </span>
            <button
              onClick={closeSession}
              className="text-red-600 hover:text-red-700"
            >
              <X size={24} />
            </button>
          </div>
        </nav>

        <div className="flex-1">
          <div className="container mx-auto p-6 flex flex-col items-center justify-center min-h-[80vh]">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-12 text-center max-w-2xl w-full">
              <h2 className="text-4xl font-bold mb-6">Join at QuizMaster</h2>
              <div className="bg-gray-100 rounded-xl p-8 mb-6">
                <p className="text-gray-600 text-xl mb-2">Game PIN:</p>
                <p className="text-7xl font-bold text-blue-700">{session.pin}</p>
              </div>

              {isTeamMode ? (
                <>
                  <div className="flex items-center justify-center gap-3 mb-8">
                    <Users className="text-blue-600" size={32} />
                    <p className="text-3xl font-bold">{teams.length}</p>
                    <p className="text-xl text-gray-600">teams joined</p>
                    <button
                      onClick={loadParticipants}
                      className="ml-2 p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Refresh team count"
                    >
                      <RefreshCw size={24} />
                    </button>
                  </div>

                  {teams.length > 0 && (
                    <div className="mb-6 max-h-60 overflow-y-auto">
                      <div className="space-y-3">
                        {teams.map((team, idx) => (
                          <div
                            key={idx}
                            className="bg-blue-50 border border-blue-200 rounded-lg p-4"
                          >
                            <div className="font-bold text-lg text-blue-900 mb-2">
                              {team.name}
                            </div>
                            <div className="text-sm text-gray-600">
                              Members: {team.members.map(m => m.users?.name || m.player_name).join(", ")}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center gap-3 mb-8">
                    <Users className="text-blue-600" size={32} />
                    <p className="text-3xl font-bold">{participants.length}</p>
                    <p className="text-xl text-gray-600">
                      {participants.filter(p => p.is_team_entry === true).length > 0
                        ? "participants"
                        : "players"}
                    </p>
                    <button
                      onClick={loadParticipants}
                      className="ml-2 p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Refresh participant count"
                    >
                      <RefreshCw size={24} />
                    </button>
                  </div>

                  {participants.length > 0 && (
                    <div className="mb-6 max-h-60 overflow-y-auto">
                      <div className="space-y-2">
                        {participants.map((p) => {
                          if (p.is_team_entry === true && p.teams) {
                            return (
                              <div
                                key={p.id}
                                className="bg-blue-50 border border-blue-200 rounded-lg p-3"
                              >
                                <div className="font-bold text-lg text-blue-900">
                                  {p.teams.team_name}
                                </div>
                                <div className="ml-4 mt-1 space-y-0.5">
                                  {p.teamMembers?.map((member, idx) => (
                                    <div key={idx} className="text-sm text-gray-600">
                                      - {member.users?.name || "Unknown"}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          } else {
                            return (
                              <div
                                key={p.id}
                                className="bg-gray-50 rounded-lg p-2 text-sm font-medium"
                              >
                                {p.users?.name || "Anonymous"}
                              </div>
                            );
                          }
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}

              <button
                onClick={startQuiz}
                disabled={isTeamMode ? teams.length === 0 : participants.length === 0}
                className="bg-green-600 text-white px-12 py-4 rounded-xl hover:bg-green-700 text-2xl font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 mx-auto"
              >
                <Play size={32} />
                Start Quiz
              </button>
              {((isTeamMode && teams.length === 0) || (!isTeamMode && participants.length === 0)) && (
                <p className="text-gray-500 mt-4">
                  Waiting for {isTeamMode ? "teams" : "players"} to join...
                </p>
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  // Countdown screen - Quiz starting
  if (session.status === "active" && !currentQuestion) {
    return renderWithBackground(
      <>
        <nav className="bg-white shadow-md p-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-700">{quiz.title}</h1>
          <button
            onClick={closeSession}
            className="text-red-600 hover:text-red-700"
          >
            <X size={24} />
          </button>
        </nav>

        <div className="flex-1">
          <div className="container mx-auto p-6 flex items-center justify-center min-h-[80vh]">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-12 text-center max-w-md w-full">
              <h2 className="text-4xl font-bold text-gray-800 mb-8">{quiz.title}</h2>
              <div className="mb-4">
                <p className="text-gray-600 mb-4">Starting in...</p>
                <div className="text-8xl font-bold text-blue-700 animate-pulse">
                  {countdownValue}
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-6">
                Get ready! The first question will appear shortly.
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Quiz is active - showing question
  if (session.status === "question_active" && currentQuestion) {
    return renderWithBackground(
      <>
        <nav className="bg-white shadow-md p-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-blue-700">{quiz.title}</h1>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${isThinkingTime ? "bg-yellow-100 animate-pulse" : "bg-blue-50"
              }`}>
              {isThinkingTime ? (
                <>
                  <BrainCircuit size={20} className="text-yellow-700" />
                  <span className="text-2xl font-bold text-yellow-700">
                    Thinking: {questionTimeRemaining}s
                  </span>
                </>
              ) : (
                <>
                  <Clock size={20} className="text-blue-700" />
                  <span className="text-2xl font-bold text-blue-700">
                    {questionTimeRemaining}s
                  </span>
                </>
              )}
            </div>
            <span className="text-gray-600">
              Question {session.current_question_index + 1} of {questions.length}
            </span>
            <button
              onClick={closeSession}
              className="text-red-600 hover:text-red-700"
            >
              <X size={24} />
            </button>
          </div>
        </nav>

        <div className="flex-1">
          <div className="container mx-auto p-6">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 mb-6">
              <div className="text-center mb-8">
                <p className="text-gray-600 mb-4">Time: {currentQuestion.time_limit}s</p>
                <h2 className="text-4xl font-bold mb-6">{currentQuestion.question_text}</h2>

                {/* Media Display */}
                {currentQuestion.image_url && (
                  <img
                    src={currentQuestion.image_url}
                    alt="Question"
                    className="max-w-md mx-auto rounded-lg shadow-lg mb-4"
                  />
                )}
                {currentQuestion.video_url && (
                  <AutoPlayVideo
                    src={currentQuestion.video_url}
                    className="max-w-md mx-auto rounded-lg shadow-lg mb-4"
                    reloadKey={currentQuestion.id}
                  />
                )}
                {currentQuestion.gif_url && (
                  <img
                    src={currentQuestion.gif_url}
                    alt="GIF"
                    className="max-w-md mx-auto rounded-lg shadow-lg mb-4"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {currentQuestion.options?.map((opt, idx) => {
                  const answerStyles = [
                    { bg: "bg-red-500", icon: Heart },
                    { bg: "bg-blue-600", icon: Spade },
                    { bg: "bg-orange-500", icon: Diamond },
                    { bg: "bg-green-500", icon: Club },
                  ];
                  const style = answerStyles[idx];
                  const IconComponent = style.icon;

                  return (
                    <div
                      key={idx}
                      className={`${style.bg} text-white p-8 rounded-lg text-center text-2xl font-bold flex flex-col md:flex-row items-center justify-center gap-3 relative`}
                    >
                      <IconComponent size={28} className="shrink-0" fill="white" />
                      <span className="text-center">{opt.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users size={24} />
                  <span className="text-xl font-semibold">
                    {participants.filter((p) =>
                      liveAnswers.some((a) => a.participant_id === p.id)
                    ).length}{" "}
                    / {participants.length} answered
                  </span>
                </div>
                {allStudentsAnswered ? (
                  <div className="bg-green-100 text-green-800 px-6 py-3 rounded-lg font-semibold animate-pulse">
                    All answered! Showing results...
                  </div>
                ) : (
                  <div className="text-gray-600 text-sm">
                    Waiting for all students...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Showing results
  if (session.status === "showing_results" && currentQuestion) {
    const correctOption = currentQuestion.options?.find((o) => o.is_correct);
    const answerCounts = {};
    currentQuestion.options?.forEach((_, idx) => {
      answerCounts[idx] = 0;
    });
    questionResults.forEach((answer) => {
      if (answer.selected_option_index !== null) {
        answerCounts[answer.selected_option_index]++;
      }
    });

    return renderWithBackground(
      <>
        <nav className="bg-white shadow-md p-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-blue-700">{quiz.title}</h1>
          <button
            onClick={closeSession}
            className="text-red-600 hover:text-red-700"
          >
            <X size={24} />
          </button>
        </nav>

        <div className="flex-1">
          <div className="container mx-auto p-6">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 mb-6">
              <h2 className="text-3xl font-bold text-center mb-6">
                {currentQuestion.question_text}
              </h2>

              {/* Media Display in Results */}
              {currentQuestion.image_url && (
                <img
                  src={currentQuestion.image_url}
                  alt="Question"
                  className="max-w-md mx-auto rounded-lg shadow-lg mb-6"
                />
              )}
              {currentQuestion.video_url && (
                <AutoPlayVideo
                  src={currentQuestion.video_url}
                  className="max-w-md mx-auto rounded-lg shadow-lg mb-6"
                  reloadKey={currentQuestion.id}
                />
              )}
              {currentQuestion.gif_url && (
                <img
                  src={currentQuestion.gif_url}
                  alt="GIF"
                  className="max-w-md mx-auto rounded-lg shadow-lg mb-6"
                />
              )}

              <div className="grid grid-cols-2 gap-4 mb-8">
                {currentQuestion.options?.map((opt, idx) => {
                  const answerStyles = [
                    { bg: "bg-red-500", icon: Heart },
                    { bg: "bg-blue-600", icon: Spade },
                    { bg: "bg-orange-500", icon: Diamond },
                    { bg: "bg-green-500", icon: Club },
                  ];
                  const style = answerStyles[idx];
                  const IconComponent = style.icon;
                  const isCorrect = opt.is_correct;

                  return (
                    <div
                      key={idx}
                      className={`${style.bg} ${isCorrect ? "ring-4 ring-white" : "opacity-60"
                        } text-white p-6 rounded-lg relative`}
                    >
                      <IconComponent size={24} className="absolute left-4 top-4" fill="white" />
                      <div className="text-xl font-bold mb-2 mt-8">{opt.text}</div>
                      <div className="text-lg">
                        {answerCounts[idx]} answer{answerCounts[idx] !== 1 ? "s" : ""}
                      </div>
                      {isCorrect && (
                        <div className="absolute top-2 right-2 bg-white text-green-600 rounded-full p-2 font-bold">
                          ✓
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-center">
                {session.current_question_index < questions.length - 1 ? (
                  <button
                    onClick={nextQuestion}
                    className="bg-blue-600 text-white px-12 py-4 rounded-xl hover:bg-blue-700 text-xl font-bold flex items-center gap-3"
                  >
                    Next Question
                    <SkipForward size={24} />
                  </button>
                ) : (
                  <button
                    onClick={() => endQuiz()}
                    className="bg-blue-700 text-white px-12 py-4 rounded-xl hover:bg-blue-800 text-xl font-bold flex items-center gap-3"
                  >
                    <Trophy size={24} />
                    Show Final Results
                  </button>
                )}
              </div>
            </div>

            {/* Leaderboard */}
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-6">
              {session.mode === 'team' && (
                <div className="mb-8">
                  <h3 className="text-2xl font-bold mb-4 text-center">Team Leaderboard</h3>
                  <div className="space-y-2">
                    {[...teams].sort((a, b) => b.score - a.score).map((team, idx) => (
                      <div
                        key={team.name}
                        className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-4"
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-2xl font-bold text-gray-400">
                            #{idx + 1}
                          </span>
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold border-2 border-blue-200">
                            {team.name.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="text-lg font-semibold text-gray-800">
                            {team.name}
                          </span>
                        </div>
                        <span className="text-xl font-bold text-blue-700">
                          {team.score} pts
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <h3 className="text-2xl font-bold mb-4 text-center">
                {session.mode === 'team' ? 'Individual Leaderboard' : 'Leaderboard'}
              </h3>
              <div className="space-y-2">
                {participants.slice(0, 5).map((p, idx) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between bg-gray-50 rounded-lg p-4"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-2xl font-bold text-gray-400">
                        #{idx + 1}
                      </span>
                      {p.users?.avatar_url && (
                        <img
                          src={p.users.avatar_url}
                          alt={p.users?.name || "Avatar"}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      )}
                      <span className="text-lg font-semibold">
                        {p.users?.name || "Anonymous"}
                      </span>
                    </div>
                    <span className="text-xl font-bold text-blue-700">
                      {p.score} pts
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Quiz completed
  if (session.status === "completed") {
    const sortedTeams = [...teams].sort((a, b) => b.score - a.score);

    // Determine top 3 based on mode
    const topThree = session.mode === 'team'
      ? sortedTeams.slice(0, 3).map(t => ({
        id: t.name,
        score: t.score,
        users: { name: t.name, avatar_url: null } // Adapt team to participant structure for podium
      }))
      : participants.slice(0, 3);

    return renderWithBackground(
      <>
        <nav className="bg-white shadow-md p-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-700">{quiz.title}</h1>
          <button
            onClick={() => setView("manage-quizzes")}
            className="bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800"
          >
            Back to Quizzes
          </button>
        </nav>

        <div className="flex-1">
          <div className="container mx-auto p-6">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-12 mb-6">
              <Trophy className="mx-auto mb-6 text-yellow-500" size={80} />
              <h2 className="text-4xl font-bold mb-12 text-center">Quiz Complete!</h2>

              {/* Podium Animation */}
              {topThree.length >= 3 && <PodiumAnimation winners={topThree} />}

              {/* Full Leaderboard */}
              <div className="max-w-2xl mx-auto">
                <h3 className="text-2xl font-bold mb-4 text-center">Final Rankings</h3>
                <div className="space-y-3">
                  {session.mode === 'team' ? (
                    // Team Rankings
                    sortedTeams.map((team, idx) => (
                      <div
                        key={team.name}
                        className={`flex items-center justify-between p-4 rounded-xl ${idx === 0
                          ? "bg-yellow-100 border-2 border-yellow-500"
                          : idx === 1
                            ? "bg-gray-100 border-2 border-gray-400"
                            : idx === 2
                              ? "bg-orange-100 border-2 border-orange-400"
                              : "bg-gray-50"
                          }`}
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-3xl font-bold">
                            {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                          </span>
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl border-2 ${idx === 0 ? "bg-yellow-200 border-yellow-500 text-yellow-800" :
                            idx === 1 ? "bg-gray-200 border-gray-500 text-gray-800" :
                              idx === 2 ? "bg-orange-200 border-orange-500 text-orange-800" :
                                "bg-blue-100 border-blue-300 text-blue-600"
                            }`}>
                            {team.name.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="text-xl font-semibold">
                            {team.name}
                          </span>
                        </div>
                        <span className="text-2xl font-bold text-blue-700">
                          {team.score} pts
                        </span>
                      </div>
                    ))
                  ) : (
                    // Individual Rankings
                    participants.map((p, idx) => (
                      <div
                        key={p.id}
                        className={`flex items-center justify-between p-4 rounded-xl ${idx === 0
                          ? "bg-yellow-100 border-2 border-yellow-500"
                          : idx === 1
                            ? "bg-gray-100 border-2 border-gray-400"
                            : idx === 2
                              ? "bg-orange-100 border-2 border-orange-400"
                              : "bg-gray-50"
                          }`}
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-3xl font-bold">
                            {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                          </span>
                          {p.users?.avatar_url && (
                            <img
                              src={p.users.avatar_url}
                              alt={p.users?.name || "Avatar"}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          )}
                          <span className="text-xl font-semibold">
                            {p.users?.name || "Anonymous"}
                          </span>
                        </div>
                        <span className="text-2xl font-bold text-blue-700">
                          {p.score} pts
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex justify-center mt-8">
                <button
                  onClick={() => setView("manage-quizzes")}
                  className="bg-blue-700 text-white px-8 py-3 rounded-lg hover:bg-blue-800 text-xl font-semibold"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Default fallback - should not reach here
  return null;
}
