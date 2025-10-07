import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { Users, Play, SkipForward, Trophy, X, Heart, Spade, Diamond, Club, Clock } from "lucide-react";
import PodiumAnimation from "../animations/PodiumAnimation";
import AlertModal from "../common/AlertModal";
import ConfirmModal from "../common/ConfirmModal";

export default function TeacherControl({ sessionId, setView }) {
  const [session, setSession] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [shuffledQuestions, setShuffledQuestions] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [teams, setTeams] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionOrder, setQuestionOrder] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [questionResults, setQuestionResults] = useState([]);
  const [liveAnswers, setLiveAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModeSelection, setShowModeSelection] = useState(true);
  const [selectedMode, setSelectedMode] = useState(null);
  const [countdownValue, setCountdownValue] = useState(5);
  const [questionTimeRemaining, setQuestionTimeRemaining] = useState(0);
  const [autoAdvanceTimer, setAutoAdvanceTimer] = useState(null);
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: "", message: "", type: "info" });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: "", message: "", onConfirm: null });

  useEffect(() => {
    if (sessionId) {
      loadSession();
      const cleanup = setupRealtimeSubscriptions();
      return cleanup;
    }
  }, [sessionId]);

  // Countdown timer effect for quiz start
  useEffect(() => {
    if (session?.status === "active" && !currentQuestion && countdownValue > 0) {
      const timer = setTimeout(() => setCountdownValue(countdownValue - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [session?.status, currentQuestion, countdownValue]);

  // Question timer countdown effect
  useEffect(() => {
    if (session?.status === "question_active" && questionTimeRemaining > 0) {
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
  }, [session?.status, questionTimeRemaining]);

  // Auto-advance when all students have answered
  useEffect(() => {
    if (session?.status === "question_active" && participants.length > 0 && liveAnswers.length > 0) {
      const allAnswered = participants.filter((p) =>
        liveAnswers.some((a) => a.participant_id === p.id)
      ).length === participants.length;

      if (allAnswered && autoAdvanceTimer) {
        // All students have answered - cancel the auto-advance timer and show results immediately
        clearTimeout(autoAdvanceTimer);
        setAutoAdvanceTimer(null);
        // Give a brief moment for UI to update
        setTimeout(() => {
          proceedToResults();
        }, 1000);
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
        throw new Error("Quiz session not found");
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
        throw new Error("Quiz not found");
      }

      setQuiz(quizData);

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

      // Load participants
      await loadParticipants();

      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const loadParticipants = async () => {
    const { data, error } = await supabase
      .from("session_participants")
      .select("*, users(name)")
      .eq("session_id", sessionId)
      .order("score", { ascending: false });

    if (!error) {
      setParticipants(data || []);

      // Group by teams if in team mode
      if (session?.mode === "team") {
        const teamMap = {};
        data?.forEach(p => {
          const teamName = p.team_name || "No Team";
          if (!teamMap[teamName]) {
            teamMap[teamName] = [];
          }
          teamMap[teamName].push(p);
        });
        setTeams(Object.entries(teamMap).map(([name, members]) => ({
          name,
          members,
          score: members.reduce((sum, m) => sum + (m.score || 0), 0)
        })));
      }
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
        () => {
          loadParticipants();
        }
      )
      .subscribe();

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
          loadParticipants();
          // Reload live answers if this answer is for the current question
          if (currentQuestion && payload.new.question_id === currentQuestion.id) {
            loadLiveAnswers(currentQuestion.id);
          }
        }
      )
      .subscribe();

    return () => {
      participantChannel.unsubscribe();
      answerChannel.unsubscribe();
    };
  };

  const selectMode = async (mode) => {
    try {
      await supabase
        .from("quiz_sessions")
        .update({ mode: mode })
        .eq("id", sessionId);

      setSelectedMode(mode);
      setShowModeSelection(false);
      setSession({ ...session, mode });
    } catch (err) {
      setAlertModal({ isOpen: true, title: "Error", message: "Error setting mode: " + err.message, type: "error" });
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
          title: "Error Starting Quiz",
          message: `Cannot access quiz session: ${checkError.message}`,
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
          title: "Error Starting Quiz",
          message: `Failed to start quiz: ${error.message}\n\nDetails: ${JSON.stringify(error, null, 2)}`,
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
      setAlertModal({ isOpen: true, title: "Error", message: "Error starting quiz: " + err.message, type: "error" });
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
      setQuestionTimeRemaining(question.time_limit); // Start countdown
      setSession({
        ...session,
        current_question_index: questionIndex,
        status: "question_active",
      });

      // Load any existing answers for this question (in case of refresh)
      await loadLiveAnswers(question.id);

      // Auto-advance after time limit
      const timer = setTimeout(() => {
        showQuestionResults(questionIndex);
      }, question.time_limit * 1000);
      setAutoAdvanceTimer(timer);
    } catch (err) {
      setAlertModal({ isOpen: true, title: "Error", message: "Error showing question: " + err.message, type: "error" });
    }
  };

  const handleShowResults = () => {
    const allAnswered = participants.filter((p) =>
      liveAnswers.some((a) => a.participant_id === p.id)
    ).length === participants.length;

    // If there's still time and not all students have answered, show confirmation
    if (questionTimeRemaining > 0 && !allAnswered) {
      setConfirmModal({
        isOpen: true,
        title: "Show Results Early?",
        message: `There are still ${questionTimeRemaining} seconds remaining and ${participants.length - participants.filter((p) => liveAnswers.some((a) => a.participant_id === p.id)).length} student(s) haven't answered yet. Are you sure you want to show results now?`,
        onConfirm: () => {
          setConfirmModal({ ...confirmModal, isOpen: false });
          proceedToResults();
        }
      });
    } else {
      proceedToResults();
    }
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
      setAlertModal({ isOpen: true, title: "Error", message: "Error loading results: " + err.message, type: "error" });
    }
  };

  const nextQuestion = () => {
    const nextIndex = session.current_question_index + 1;
    showQuestion(nextIndex);
  };

  const endQuiz = async () => {
    try {
      await supabase
        .from("quiz_sessions")
        .update({ status: "completed" })
        .eq("id", sessionId);

      setSession({ ...session, status: "completed" });
    } catch (err) {
      setAlertModal({ isOpen: true, title: "Error", message: "Error ending quiz: " + err.message, type: "error" });
    }
  };

  const closeSession = async () => {
    setConfirmModal({
      isOpen: true,
      title: "End Session",
      message: "Are you sure you want to end this session?",
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        await endQuiz();
        setView("manage-quizzes");
      }
    });
  };

  // Render modals wrapper for all views
  const ModalsWrapper = ({ children }) => (
    <>
      {children}
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

  if (loading) {
    return (
      <ModalsWrapper>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <p className="text-xl text-gray-600">Loading session...</p>
        </div>
      </ModalsWrapper>
    );
  }

  if (error) {
    return (
      <ModalsWrapper>
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
      </ModalsWrapper>
    );
  }

  // Mode Selection
  if (session.status === "waiting" && showModeSelection) {
    return (
      <ModalsWrapper>
        <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600">
        <nav className="bg-white shadow-md p-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-purple-600">{quiz.title}</h1>
          <button
            onClick={closeSession}
            className="text-red-600 hover:text-red-700"
          >
            <X size={24} />
          </button>
        </nav>

        <div className="container mx-auto p-6 flex flex-col items-center justify-center min-h-[80vh]">
          <div className="bg-white rounded-2xl shadow-2xl p-12 text-center max-w-4xl w-full">
            <h2 className="text-4xl font-bold mb-4">Select Quiz Mode</h2>
            <p className="text-gray-600 mb-8">Choose how you want students to participate</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Classic Mode */}
              <div
                onClick={() => selectMode("classic")}
                className="border-2 border-gray-300 rounded-xl p-8 hover:border-purple-600 hover:shadow-lg transition cursor-pointer group"
              >
                <div className="text-6xl mb-4">🎯</div>
                <h3 className="text-2xl font-bold mb-3 group-hover:text-purple-600">Classic Mode</h3>
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
                className="border-2 border-gray-300 rounded-xl p-8 hover:border-blue-600 hover:shadow-lg transition cursor-pointer group"
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
      </ModalsWrapper>
    );
  }

  // Waiting for students
  if (session.status === "waiting" && !showModeSelection) {
    const isTeamMode = session.mode === "team";

    return (
      <ModalsWrapper>
        <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600">
        <nav className="bg-white shadow-md p-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-purple-600">{quiz.title}</h1>
          <div className="flex items-center gap-4">
            <span className={`px-4 py-2 rounded-lg font-semibold ${
              isTeamMode ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"
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

        <div className="container mx-auto p-6 flex flex-col items-center justify-center min-h-[80vh]">
          <div className="bg-white rounded-2xl shadow-2xl p-12 text-center max-w-2xl w-full">
            <h2 className="text-4xl font-bold mb-6">Join at QuizMaster</h2>
            <div className="bg-gray-100 rounded-xl p-8 mb-6">
              <p className="text-gray-600 text-xl mb-2">Game PIN:</p>
              <p className="text-7xl font-bold text-purple-600">{session.pin}</p>
            </div>

            {isTeamMode ? (
              <>
                <div className="flex items-center justify-center gap-3 mb-8">
                  <Users className="text-blue-600" size={32} />
                  <p className="text-3xl font-bold">{teams.length}</p>
                  <p className="text-xl text-gray-600">teams joined</p>
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
                  <p className="text-xl text-gray-600">players</p>
                </div>

                {participants.length > 0 && (
                  <div className="mb-6 max-h-40 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-2">
                      {participants.map((p) => (
                        <div
                          key={p.id}
                          className="bg-gray-50 rounded-lg p-2 text-sm font-medium"
                        >
                          {p.users?.name || "Anonymous"}
                        </div>
                      ))}
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
      </ModalsWrapper>
    );
  }

  // Countdown screen - Quiz starting
  if (session.status === "active" && !currentQuestion) {
    return (
      <ModalsWrapper>
        <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600">
        <nav className="bg-white shadow-md p-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-purple-600">{quiz.title}</h1>
          <button
            onClick={closeSession}
            className="text-red-600 hover:text-red-700"
          >
            <X size={24} />
          </button>
        </nav>

        <div className="container mx-auto p-6 flex items-center justify-center min-h-[80vh]">
          <div className="bg-white rounded-2xl shadow-2xl p-12 text-center max-w-md w-full">
            <h2 className="text-4xl font-bold text-gray-800 mb-8">{quiz.title}</h2>
            <div className="mb-4">
              <p className="text-gray-600 mb-4">Starting in...</p>
              <div className="text-8xl font-bold text-purple-600 animate-pulse">
                {countdownValue}
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-6">
              Get ready! The first question will appear shortly.
            </p>
          </div>
        </div>
      </div>
      </ModalsWrapper>
    );
  }

  // Quiz is active - showing question
  if (session.status === "question_active" && currentQuestion) {
    return (
      <ModalsWrapper>
        <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-600">
        <nav className="bg-white shadow-md p-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-purple-600">{quiz.title}</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-purple-100 px-4 py-2 rounded-lg">
              <Clock size={20} className="text-purple-600" />
              <span className="text-2xl font-bold text-purple-600">
                {questionTimeRemaining}s
              </span>
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

        <div className="container mx-auto p-6">
          <div className="bg-white rounded-2xl shadow-2xl p-8 mb-6">
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
                <video
                  src={currentQuestion.video_url}
                  controls
                  className="max-w-md mx-auto rounded-lg shadow-lg mb-4"
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
                    className={`${style.bg} text-white p-8 rounded-lg text-center text-2xl font-bold flex items-center justify-center gap-3 relative`}
                  >
                    <IconComponent size={28} className="absolute left-4 top-4" fill="white" />
                    <span>{opt.text}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
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
              <button
                onClick={handleShowResults}
                className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 font-semibold"
              >
                Show Results
              </button>
            </div>
          </div>
        </div>
      </div>
      </ModalsWrapper>
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

    return (
      <ModalsWrapper>
        <div className="min-h-screen bg-gradient-to-br from-green-600 to-blue-600">
        <nav className="bg-white shadow-md p-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-purple-600">{quiz.title}</h1>
          <button
            onClick={closeSession}
            className="text-red-600 hover:text-red-700"
          >
            <X size={24} />
          </button>
        </nav>

        <div className="container mx-auto p-6">
          <div className="bg-white rounded-2xl shadow-2xl p-8 mb-6">
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
              <video
                src={currentQuestion.video_url}
                controls
                className="max-w-md mx-auto rounded-lg shadow-lg mb-6"
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
                    className={`${style.bg} ${
                      isCorrect ? "ring-4 ring-white" : "opacity-60"
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
                  onClick={endQuiz}
                  className="bg-purple-600 text-white px-12 py-4 rounded-xl hover:bg-purple-700 text-xl font-bold flex items-center gap-3"
                >
                  <Trophy size={24} />
                  Show Final Results
                </button>
              )}
            </div>
          </div>

          {/* Leaderboard */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-2xl font-bold mb-4 text-center">Leaderboard</h3>
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
                    <span className="text-lg font-semibold">
                      {p.users?.name || "Anonymous"}
                    </span>
                  </div>
                  <span className="text-xl font-bold text-purple-600">
                    {p.score} pts
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      </ModalsWrapper>
    );
  }

  // Quiz completed
  if (session.status === "completed") {
    const topThree = participants.slice(0, 3);

    return (
      <ModalsWrapper>
        <div className="min-h-screen bg-gradient-to-br from-yellow-500 to-orange-600">
        <nav className="bg-white shadow-md p-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-purple-600">{quiz.title}</h1>
          <button
            onClick={() => setView("manage-quizzes")}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
          >
            Back to Quizzes
          </button>
        </nav>

        <div className="container mx-auto p-6">
          <div className="bg-white rounded-2xl shadow-2xl p-12 mb-6">
            <Trophy className="mx-auto mb-6 text-yellow-500" size={80} />
            <h2 className="text-4xl font-bold mb-12 text-center">Quiz Complete!</h2>

            {/* Podium Animation */}
            {topThree.length >= 3 && <PodiumAnimation winners={topThree} />}

            {/* Full Leaderboard */}
            <div className="max-w-2xl mx-auto">
              <h3 className="text-2xl font-bold mb-4 text-center">Final Rankings</h3>
              <div className="space-y-3">
                {participants.map((p, idx) => (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between p-4 rounded-xl ${
                      idx === 0
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
                      <span className="text-xl font-semibold">
                        {p.users?.name || "Anonymous"}
                      </span>
                    </div>
                    <span className="text-2xl font-bold text-purple-600">
                      {p.score} pts
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-center mt-8">
              <button
                onClick={() => setView("manage-quizzes")}
                className="bg-purple-600 text-white px-8 py-3 rounded-lg hover:bg-purple-700 text-xl font-semibold"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
      </ModalsWrapper>
    );
  }

  // Default fallback - should not reach here
  return null;
}
