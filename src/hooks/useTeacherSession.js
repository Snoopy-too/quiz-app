import { useState, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../supabaseClient";

export default function useTeacherSession(sessionId) {
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
  const [allStudentsAnswered, setAllStudentsAnswered] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);
  const [answerRevealCountdown, setAnswerRevealCountdown] = useState(4);
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: "", message: "", type: "info" });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: "", message: "", onConfirm: null });
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [allowSharedDevice, setAllowSharedDevice] = useState(false);
  const [randomizeQuestions, setRandomizeQuestions] = useState(false);
  const [randomizeAnswers, setRandomizeAnswers] = useState(false);
  const [startingQuiz, setStartingQuiz] = useState(false);
  const [endingQuiz, setEndingQuiz] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Helper with timeout for supabase network calls
  const withTimeout = (promise, ms = 8000) => {
    return Promise.race([
      promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Network request timed out. Please check your internet connection.')), ms)
      )
    ]);
  };

  // Ref to hold current question for real-time subscription
  const currentQuestionRef = useRef(null);
  // Ref to hold current session for polling (avoids stale closure)
  const sessionRef = useRef(null);
  // Debounce timers for realtime event handlers
  const loadParticipantsTimerRef = useRef(null);
  const loadLiveAnswersTimerRef = useRef(null);
  // Quiz-flow timers that must be cleared on unmount so stale callbacks
  // don't write to Supabase after the teacher navigates away.
  const autoAdvanceTimerRef = useRef(null);
  const startQuizTimerRef = useRef(null);
  const thinkingTimerRef = useRef(null);

  useEffect(() => {
    if (sessionId) {
      loadSession();
      const cleanup = setupRealtimeSubscriptions();

      // Fallback polling for participant and answer updates + session state healing
      const pollInterval = setInterval(async () => {
        // Use ref to get latest session state (avoids stale closure)
        const currentSession = sessionRef.current;
        if (currentSession?.status === 'waiting' || currentSession?.status === 'question_active' || currentSession?.status === 'showing_results') {
          loadParticipants(currentSession);
        }

        // Poll for live answers while question is active
        const activeQuestion = currentQuestionRef.current;
        if (currentSession?.status === 'question_active' && activeQuestion) {
          loadLiveAnswers(activeQuestion.id);
        }

        // Defense-in-depth: heal local session state from DB if it diverges.
        // This ensures that even if a stale closure or other bug corrupts local
        // state, the teacher re-syncs within a few seconds.
        if (currentSession && currentSession.status !== 'completed' && currentSession.status !== 'cancelled') {
          try {
            const { data } = await supabase
              .from('quiz_sessions')
              .select('current_question_index, status')
              .eq('id', sessionId)
              .single();
            if (data && (data.current_question_index !== currentSession.current_question_index || data.status !== currentSession.status)) {
              console.warn('[TeacherControl] Healing local state from DB', {
                local: { cqi: currentSession.current_question_index, status: currentSession.status },
                db: data,
              });
              setSession(prev => prev ? { ...prev, current_question_index: data.current_question_index, status: data.status } : prev);
            }
          } catch (err) {
            console.warn('[TeacherControl] Session heal poll failed:', err.message);
          }
        }
      }, 5000);

      return () => {
        cleanup();
        clearInterval(pollInterval);
        clearTimeout(loadParticipantsTimerRef.current);
        clearTimeout(loadLiveAnswersTimerRef.current);
        clearTimeout(autoAdvanceTimerRef.current);
        clearTimeout(startQuizTimerRef.current);
        clearTimeout(thinkingTimerRef.current);
      };
    }
  }, [sessionId]);

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

  // Question timer countdown effect - only starts after answers are revealed
  useEffect(() => {
    if (session?.status === "question_active" && questionTimeRemaining > 0 && !allStudentsAnswered && showAnswers) {
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
  }, [session?.status, questionTimeRemaining, allStudentsAnswered, showAnswers]);

  // Answer reveal countdown effect - show answers after 4 seconds
  useEffect(() => {
    if (session?.status === "question_active" && currentQuestion && !showAnswers && answerRevealCountdown > 0) {
      const timer = setTimeout(() => {
        setAnswerRevealCountdown(answerRevealCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (session?.status === "question_active" && answerRevealCountdown === 0 && !showAnswers) {
      setShowAnswers(true);
    }
  }, [session?.status, currentQuestion, answerRevealCountdown, showAnswers]);

  // Check if all students have answered
  useEffect(() => {
    if (session?.status === "question_active" && participants.length > 0) {
      const allAnswered = participants.filter((p) =>
        liveAnswers.some((a) => a.participant_id === p.id)
      ).length === participants.length;

      // Fix 5: Detect transition from all-answered back to not-all-answered
      // (e.g., a late joiner increased participant count mid-question).
      // Cancel the pending 2s early-advance timer so results aren't shown prematurely.
      if (!allAnswered && allStudentsAnswered && autoAdvanceTimerRef.current) {
        console.warn('[TeacherControl] allAnswered flipped to false — cancelling early advance timer');
        clearTimeout(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = null;
      }

      setAllStudentsAnswered(allAnswered);

      if (allAnswered && autoAdvanceTimerRef.current) {
        // All students have answered - cancel the auto-advance timer
        console.log('[TeacherControl] All students answered! Auto-advancing to results in 2 seconds...');
        clearTimeout(autoAdvanceTimerRef.current);

        // Auto-advance to results after 2 seconds so everyone can see they've all answered
        autoAdvanceTimerRef.current = setTimeout(() => {
          console.log('[TeacherControl] Auto-advancing to results now');
          // Use ref to avoid stale closure — the critical fix for the Q2-stuck bug
          const cqi = sessionRef.current?.current_question_index ?? 0;
          showQuestionResults(cqi);
        }, 2000);
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
    // Use passed session object, then ref (avoids stale closure), then state
    const currentSession = sessionObj || sessionRef.current || session;
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

    console.log('[TeacherControl] Loaded participants:', data?.length || 0);

    // Batch-fetch all team members in a single query instead of N+1
    const teamEntries = (data || []).filter(p => p.is_team_entry === true && p.team_id);
    let teamMembersMap = {};

    if (teamEntries.length > 0) {
      const teamIds = [...new Set(teamEntries.map(p => p.team_id))];
      const { data: allMembers } = await supabase
        .from("team_members")
        .select("team_id, student_id, users(name)")
        .in("team_id", teamIds);

      if (allMembers) {
        for (const m of allMembers) {
          if (!teamMembersMap[m.team_id]) teamMembersMap[m.team_id] = [];
          teamMembersMap[m.team_id].push(m);
        }
      }
    }

    const participantsWithTeams = (data || []).map(p => {
      if (p.is_team_entry === true && p.team_id && teamMembersMap[p.team_id]) {
        return { ...p, teamMembers: teamMembersMap[p.team_id] };
      }
      return p;
    });

    setParticipants(participantsWithTeams);

    // Group by teams if in team mode
    if (currentSession?.mode === "team") {
      const teamMap = {};

      for (const p of (participantsWithTeams || [])) {
        // Only include team entries
        if (p.is_team_entry === true && p.team_id) {
          let teamName = "Unknown Team";

          // Try to get team name from joined data
          if (p.teams) {
            teamName = p.teams.name || p.teams.team_name || teamName;
          } else {
            // Fallback: fetch team name directly if JOIN failed
            try {
              const { data: teamData } = await supabase
                .from('teams')
                .select('name, team_name')
                .eq('id', p.team_id)
                .single();
              if (teamData) {
                teamName = teamData.name || teamData.team_name || teamName;
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
    }
  };

  const loadLiveAnswers = async (questionId) => {
    if (!questionId) return;

    const { data, error } = await supabase
      .from("quiz_answers")
      .select("*")
      .eq("session_id", sessionId)
      .eq("question_id", questionId);

    if (!error) {
      setLiveAnswers(data || []);
    } else {
      console.error('[TeacherControl] Error loading live answers:', error);
    }
  };

  const setupRealtimeSubscriptions = () => {

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
          console.log('[TeacherControl] Participant change:', payload.eventType);
          clearTimeout(loadParticipantsTimerRef.current);
          loadParticipantsTimerRef.current = setTimeout(() => loadParticipants(), 500);
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
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
          console.log('[TeacherControl] New answer for question:', payload.new.question_id);
          clearTimeout(loadParticipantsTimerRef.current);
          loadParticipantsTimerRef.current = setTimeout(() => loadParticipants(), 500);
          const activeQuestion = currentQuestionRef.current;
          if (activeQuestion && payload.new.question_id === activeQuestion.id) {
            clearTimeout(loadLiveAnswersTimerRef.current);
            loadLiveAnswersTimerRef.current = setTimeout(() => loadLiveAnswers(activeQuestion.id), 300);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('[TeacherControl] Error subscribing to answer channel');
        }
      });

    // Subscribe to quiz_sessions updates — defense-in-depth to heal local state
    // if it diverges from DB (mirrors the student-side pattern in StudentQuiz.jsx).
    const sessionChannel = supabase
      .channel(`session-${sessionId}-state`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "quiz_sessions",
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          console.log('[TeacherControl] Session state updated via realtime:', payload.new?.status, 'cqi:', payload.new?.current_question_index);
          if (payload.new) {
            setSession(prev => prev ? {
              ...prev,
              current_question_index: payload.new.current_question_index,
              status: payload.new.status,
            } : prev);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('[TeacherControl] Error subscribing to session state channel');
        }
      });

    return () => {
      participantChannel.unsubscribe();
      answerChannel.unsubscribe();
      sessionChannel.unsubscribe();
    };
  };

  const selectMode = async (mode) => {
    try {
      console.log('[TeacherControl] Selecting mode:', mode, 'for session:', sessionId);

      const updateData = { mode: mode };
      if (mode === "team") {
        updateData.allow_shared_device = allowSharedDevice;
      }

      // Apply randomization settings
      if (randomizeQuestions) {
        const shuffled = shuffleArray(questions);
        const newOrder = shuffled.map(q => q.id);
        updateData.question_order = newOrder;
        setShuffledQuestions(shuffled);
        setQuestionOrder(newOrder);
      }

      if (randomizeAnswers) {
        updateData.randomize_answers = true;
      }

      const { data, error } = await supabase
        .from("quiz_sessions")
        .update(updateData)
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

      // Create updated session object (functional updater avoids stale closure)
      const updatedFields = {
        mode,
        ...(randomizeQuestions && { question_order: updateData.question_order }),
        ...(randomizeAnswers && { randomize_answers: true }),
      };
      setSession(prev => prev ? { ...prev, ...updatedFields } : prev);
      // Keep a local reference for the immediate loadParticipants call below
      const updatedSession = { ...session, ...updatedFields };

      // Immediately reload participants with the new mode
      await loadParticipants(updatedSession);
    } catch (err) {
      console.error('[TeacherControl] Exception in selectMode:', err);
      setAlertModal({ isOpen: true, title: t('common.error'), message: t('teacher.errorSettingMode') + ': ' + err.message, type: "error" });
    }
  };

  const startQuiz = async () => {
    if (startingQuiz) return;
    setStartingQuiz(true);
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
      setSession(prev => prev ? { ...prev, status: "active", question_order: questionOrder } : prev);
      setCountdownValue(5); // Reset countdown to 5

      // Wait 5 seconds before showing first question
      clearTimeout(startQuizTimerRef.current);
      startQuizTimerRef.current = setTimeout(() => {
        showQuestion(0);
      }, 5000);
    } catch (err) {
      console.error('[startQuiz] Unexpected error:', err);
      setAlertModal({ isOpen: true, title: t('common.error'), message: t('errors.errorStartingQuiz') + ': ' + err.message, type: "error" });
    } finally {
      setStartingQuiz(false);
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

    // Guard: don't re-enter the same question if it's already active (prevents stuck-loop)
    const guardSession = sessionRef.current;
    if (guardSession?.status === 'question_active' && guardSession?.current_question_index === questionIndex) {
      console.warn('[TeacherControl] showQuestion re-entry blocked — question already active', { questionIndex });
      return;
    }

    if (isTransitioning) return;
    setIsTransitioning(true);

    try {
      const question = questionsToUse[questionIndex];

      // Update database with current question with a timeout
      const { error: updateError } = await withTimeout(
        supabase
          .from("quiz_sessions")
          .update({
            current_question_index: questionIndex,
            status: "question_active",
          })
          .eq("id", sessionId)
      );

      if (updateError) throw updateError;

      // Clear any existing auto-advance timer
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = null;
      }

      setCurrentQuestion(question);
      setShowResults(false);
      setLiveAnswers([]); // Reset live answers for new question
      setAllStudentsAnswered(false); // Reset for new question

      // Reset answer reveal state for new question
      setShowAnswers(false);
      setAnswerRevealCountdown(4);

      const startActualTimer = () => {
        setIsThinkingTime(false);
        setQuestionTimeRemaining(question.time_limit);

        // Auto-advance after time limit + 4 seconds for answer reveal
        clearTimeout(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = setTimeout(() => {
          showQuestionResults(questionIndex);
        }, (question.time_limit + 4) * 1000);
      };

      if (session.mode === 'team') {
        // Team Mode: 5 second thinking time + 4 second answer reveal
        setIsThinkingTime(true);
        setQuestionTimeRemaining(5);

        // Update session state immediately (functional updater avoids stale closure)
        setSession(prev => prev ? {
          ...prev,
          current_question_index: questionIndex,
          status: "question_active",
        } : prev);

        // Load answers
        await loadLiveAnswers(question.id);

        // Wait 5 seconds then start actual timer (4-second answer reveal happens via effect)
        clearTimeout(thinkingTimerRef.current);
        thinkingTimerRef.current = setTimeout(() => {
          startActualTimer();
        }, 5000);
      } else {
        // Classic Mode: Start with 4-second answer reveal delay (handled by effect)
        setIsThinkingTime(false);
        setSession(prev => prev ? {
          ...prev,
          current_question_index: questionIndex,
          status: "question_active",
        } : prev);

        await loadLiveAnswers(question.id);
        startActualTimer();
      }
    } catch (err) {
      setAlertModal({ isOpen: true, title: t('common.error'), message: t('teacher.errorShowingQuestion') + ': ' + err.message, type: "error" });
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleShowResults = () => {
    // Button only appears when all students have answered, so proceed directly
    proceedToResults();
  };

  const proceedToResults = () => {
    // Cancel auto-advance timer
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    // Use ref to avoid stale closure
    const cqi = sessionRef.current?.current_question_index ?? session?.current_question_index ?? 0;
    showQuestionResults(cqi);
  };

  const showQuestionResults = async (questionIndex) => {
    try {
      // Guard: bail out if this call corresponds to a stale timer firing after
      // the teacher already advanced past this question (the core crash fix).
      const currentSession = sessionRef.current;
      if (!currentSession) return;
      if (currentSession.current_question_index !== questionIndex) {
        console.warn('[TeacherControl] Stale showQuestionResults ignored', {
          timerIndex: questionIndex,
          sessionIndex: currentSession.current_question_index,
        });
        return;
      }

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
      setSession(prev => prev ? { ...prev, status: "showing_results" } : prev);
    } catch (err) {
      setAlertModal({ isOpen: true, title: t('common.error'), message: t('teacher.errorLoadingResults') + ': ' + err.message, type: "error" });
    }
  };

  const nextQuestion = async () => {
    // Re-read current_question_index from DB to avoid stale-closure drift
    try {
      const { data } = await supabase
        .from('quiz_sessions')
        .select('current_question_index')
        .eq('id', sessionId)
        .single();
      const cqi = data?.current_question_index ?? sessionRef.current?.current_question_index ?? 0;
      showQuestion(cqi + 1);
    } catch (err) {
      // Fallback to ref if DB read fails
      const cqi = sessionRef.current?.current_question_index ?? 0;
      showQuestion(cqi + 1);
    }
  };

  const endQuiz = async (status = "completed") => {
    if (endingQuiz) return;
    setEndingQuiz(true);
    try {
      await supabase
        .from("quiz_sessions")
        .update({ status: status })
        .eq("id", sessionId);

      // Handle shared device mode - attribute results to all team members
      if (session.mode === 'team') {
        try {
          console.log('[TeacherControl] Checking for shared device teams...');

          // Get all team participants with their team info
          const { data: teamParticipants, error: fetchError } = await supabase
            .from("session_participants")
            .select(`
              id,
              score,
              user_id,
              team_id,
              teams!inner(id, is_shared_device)
            `)
            .eq("session_id", sessionId)
            .eq("is_team_entry", true);

          if (fetchError) {
            console.warn('[TeacherControl] Error fetching team participants:', fetchError);
          } else if (teamParticipants) {
            // Process shared device teams
            for (const participant of teamParticipants) {
              if (participant.teams?.is_shared_device) {
                console.log('[TeacherControl] Processing shared device team:', participant.team_id);

                // Get all team members who aren't the captain (the one who played)
                const { data: teamMembers, error: membersError } = await supabase
                  .from("team_members")
                  .select("student_id")
                  .eq("team_id", participant.team_id)
                  .neq("student_id", participant.user_id);

                if (membersError) {
                  console.warn('[TeacherControl] Error fetching team members:', membersError);
                  continue;
                }

                // Create participant records for each team member with the same score
                for (const member of teamMembers || []) {
                  console.log('[TeacherControl] Attributing score to team member:', member.student_id);

                  const { error: upsertError } = await supabase
                    .from("session_participants")
                    .upsert({
                      session_id: sessionId,
                      user_id: member.student_id,
                      team_id: participant.team_id,
                      is_team_entry: true,
                      score: participant.score
                    }, {
                      onConflict: 'session_id,user_id'
                    });

                  if (upsertError) {
                    console.warn('[TeacherControl] Error attributing score to member:', upsertError);
                  }
                }
              }
            }
          }
        } catch (attrError) {
          console.warn('[TeacherControl] Shared device attribution failed:', attrError);
          // Not critical, continue with cleanup
        }

        // Cleanup teams - removes student memberships so teams don't persist
        try {
          console.log('[TeacherControl] Triggering team cleanup for session:', sessionId);
          await supabase.rpc('cleanup_session_teams', { p_session_id: sessionId });
          console.log('[TeacherControl] Team cleanup executed');
        } catch (cleanupError) {
          console.warn('[TeacherControl] Team cleanup failed (function might be missing):', cleanupError);
          // Not critical for ending the quiz, so we continue
        }
      }

      setSession(prev => prev ? { ...prev, status: status } : prev);
    } catch (err) {
      setAlertModal({ isOpen: true, title: "Error", message: "Error ending quiz: " + err.message, type: "error" });
    } finally {
      setEndingQuiz(false);
    }
  };

  const closeSession = (onComplete) => {
    setConfirmModal({
      isOpen: true,
      title: "End Session",
      message: "Are you sure you want to end this session? This will cancel the quiz for all students.",
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        await endQuiz("cancelled");
        if (onComplete) onComplete();
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

  // Reload session from DB — recovery mechanism when local state is corrupt
  const reloadSession = async () => {
    setLoading(true);
    setError(null);
    await loadSession();
  };

  return {
    // Session state
    session, quiz, questions, shuffledQuestions, participants, teams,
    theme, currentQuestion, questionOrder, showResults, questionResults,
    liveAnswers, loading, error, showModeSelection, selectedMode,
    isThinkingTime, countdownValue, questionTimeRemaining,
    allStudentsAnswered, showAnswers, answerRevealCountdown,
    alertModal, confirmModal, showAssignModal,
    allowSharedDevice, randomizeQuestions, randomizeAnswers,
    startingQuiz, endingQuiz, backgroundConfig,

    // Setters needed by UI
    setAlertModal, setConfirmModal, setShowAssignModal,
    setAllowSharedDevice, setRandomizeQuestions, setRandomizeAnswers,

    // Actions
    selectMode, startQuiz, showQuestion, handleShowResults,
    nextQuestion, endQuiz, closeSession, loadParticipants, reloadSession,
  };
}
