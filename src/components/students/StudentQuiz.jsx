import { useState, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../../supabaseClient";
import { Trophy, Clock, Heart, Spade, Diamond, Club } from "lucide-react";
import AlertModal from "../common/AlertModal";
import ConfirmModal from "../common/ConfirmModal";
import AutoPlayVideo from "../common/AutoPlayVideo";
import { clearActiveSession } from "../../utils/sessionPersistence";

export default function StudentQuiz({ sessionId, appState, setView }) {
  const { t } = useTranslation();
  const [session, setSession] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [theme, setTheme] = useState(null);
  const [participant, setParticipant] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questions, setQuestions] = useState([]);
  const questionsRef = useRef([]);
  const sessionRef = useRef(null);
  const realtimeAliveRef = useRef(false);
  const currentQuestionIndexRef = useRef(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
  const [wasCorrect, setWasCorrect] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [showCountdown, setShowCountdown] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);
  const [answerRevealCountdown, setAnswerRevealCountdown] = useState(4);
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: "", message: "", type: "info" });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: "", message: "", onConfirm: null });

  useEffect(() => {
    if (sessionId && appState.currentUser?.id) {
      joinSession();
    }
  }, [sessionId, appState.currentUser]);

  // Synchronize current question whenever session status, question index, or questions list changes
  // This centralizes the logic and makes it robust against race conditions
  useEffect(() => {
    if (!session || questions.length === 0 || loading) return;

    console.log('[StudentQuiz] Syncing state with session status:', session.status);

    if (session.status === "active") {
      // Only show "active" countdown if we're at the very beginning
      if (!showCountdown && session.current_question_index === 0 && !currentQuestion) {
        console.log('[StudentQuiz] Transitioning to ACTIVE (countdown)');
        setShowCountdown(true);
        setCountdown(5);
      }
    } else if (session.status === "question_active") {
      const questionData = questions[session.current_question_index];
      if (questionData) {
        // Only trigger new question logic if it's actually a different question
        if (!currentQuestion || currentQuestion.id !== questionData.id) {
          console.log('[StudentQuiz] Transitioning to QUESTION_ACTIVE:', questionData.id);
          setShowCountdown(false);
          setCurrentQuestion(questionData);
          setTimeRemaining(questionData.time_limit);
          setHasAnswered(false);
          setSelectedOption(null);
          setShowCorrectAnswer(false);
          setWasCorrect(false);
          setShowAnswers(false);
          setAnswerRevealCountdown(4);
        }
      } else {
        console.error('[StudentQuiz] Question not found at index:', session.current_question_index);
      }
    } else if (session.status === "showing_results") {
      if (!showCorrectAnswer) {
        console.log('[StudentQuiz] Transitioning to SHOWING_RESULTS');
        setShowCorrectAnswer(true);
      }
    } else if (session.status === "completed") {
      console.log('[StudentQuiz] Transitioning to COMPLETED');
      clearActiveSession();
    }
  }, [session?.status, session?.current_question_index, session?.id, questions, loading]);

  // Effect to check if user already answered the current question (reconnection case)
  useEffect(() => {
    const checkExistingAnswer = async () => {
      if (!currentQuestion || !participant) return;

      console.log('[StudentQuiz] Checking for existing answer for question:', currentQuestion.id);
      try {
        const { data: existingAnswer } = await supabase
          .from("quiz_answers")
          .select("*")
          .eq("session_id", sessionId)
          .eq("participant_id", participant.id)
          .eq("question_id", currentQuestion.id)
          .maybeSingle();

        if (existingAnswer) {
          console.log('[StudentQuiz] Reconnecting: Restoring previous answer:', existingAnswer);
          setHasAnswered(true);
          setSelectedOption(existingAnswer.selected_option_index);
          setWasCorrect(existingAnswer.is_correct);
          // If we've already answered, skip the visual reveal delays
          setShowAnswers(true);
          setAnswerRevealCountdown(0);
        }
      } catch (err) {
        console.error('[StudentQuiz] Error checking existing answer:', err);
      }
    };

    checkExistingAnswer();
  }, [currentQuestion?.id, participant?.id]);

  // Keep sessionRef in sync for accurate logging in poll callbacks
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // Separate effect for realtime subscriptions and polling
  // Gated behind loading to avoid race condition with joinSession
  useEffect(() => {
    if (!sessionId || loading) return;

    console.log('[StudentQuiz] Setting up realtime and polling (loading complete)');
    const cleanup = setupRealtimeSubscriptions();

    // Fallback polling — backs off to 5s when realtime is delivering updates
    let pollTimer = null;
    const schedulePoll = () => {
      const interval = realtimeAliveRef.current ? 5000 : 2000;
      pollTimer = setTimeout(async () => {
        try {
          const { data: sessionData, error } = await supabase
            .from("quiz_sessions")
            .select("*")
            .eq("id", sessionId)
            .single();

          if (!error && sessionData) {
            setSession(prev => {
              if (!prev || prev.status !== sessionData.status || prev.current_question_index !== sessionData.current_question_index) {
                console.log('[StudentQuiz] Poll detected change:', prev?.status, '->', sessionData.status);
                return sessionData;
              }
              return prev;
            });
          }
        } catch (err) {
          console.error('[StudentQuiz] Error polling session:', err);
        }
        schedulePoll();
      }, interval);
    };
    schedulePoll();

    return () => {
      console.log('[StudentQuiz] Cleaning up realtime and polling');
      cleanup();
      clearTimeout(pollTimer);
    };
  }, [sessionId, loading]);

  // Keep questionsRef in sync with questions state
  useEffect(() => {
    questionsRef.current = questions;
  }, [questions]);

  const joinSession = async () => {
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

      if (quizError) {
        console.error("Quiz query failed:", quizError);
        throw new Error(`${t('errors.errorLoadingQuiz')}: ${quizError.message}`);
      }

      const quizData = quizResults && quizResults.length > 0 ? quizResults[0] : null;
      if (!quizData) {
        throw new Error(`${t('errors.quizNotFound')} (ID: ${session.quiz_id}). ${t('errors.quizMayBeDeleted')}`);
      }

      console.log('[StudentQuiz] Quiz loaded:', quizData.title);
      setQuiz(quizData);

      // Load questions
      const { data: questionsData, error: questionsError } = await supabase
        .from("questions")
        .select("*")
        .eq("quiz_id", session.quiz_id)
        .order("order_index", { ascending: true });

      if (questionsError) throw questionsError;

      // If session has a question_order, use it to reorder questions
      let orderedQuestions = questionsData;
      if (session.question_order) {
        orderedQuestions = session.question_order
          .map(id => questionsData.find(q => q.id === id))
          .filter(Boolean);
      }

      setQuestions(orderedQuestions);

      // Check if already a participant
      const { data: existingParticipant, error: checkParticipantError } = await supabase
        .from("session_participants")
        .select("*")
        .eq("session_id", sessionId)
        .eq("user_id", appState.currentUser.id)
        .maybeSingle();

      if (checkParticipantError) {
        console.error('[StudentQuiz] Error checking participant:', checkParticipantError);
      }

      let activeParticipant = existingParticipant;

      if (existingParticipant) {
        setParticipant(existingParticipant);
      } else {
        // Join as new participant
        const { data: newParticipant, error: participantError } = await supabase
          .from("session_participants")
          .insert([
            {
              session_id: sessionId,
              user_id: appState.currentUser.id,
              score: 0,
            },
          ])
          .select()
          .single();

        if (participantError) throw participantError;
        setParticipant(newParticipant);
        activeParticipant = newParticipant;
      }

      // Load theme after participant exists (RLS requires participant row)
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

      // Initialize question index ref
      currentQuestionIndexRef.current = session.current_question_index;

      // Re-fetch latest session state to avoid stale data from the initial fetch
      // (the quiz may have started while we were loading questions/participant)
      const { data: latestSessionData } = await supabase
        .from("quiz_sessions")
        .select("*")
        .eq("id", sessionId);

      if (latestSessionData?.length > 0) {
        console.log('[StudentQuiz] Latest session status after join:', latestSessionData[0].status);
        setSession(latestSessionData[0]);
      }

      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const setupRealtimeSubscriptions = () => {
    console.log('[StudentQuiz] Setting up realtime subscriptions for session:', sessionId);

    // Subscribe to session updates
    const sessionChannel = supabase
      .channel(`student-session-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "quiz_sessions",
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          console.log('[StudentQuiz] Realtime update:', payload.new.status);
          realtimeAliveRef.current = true;
          setSession(payload.new);
        }
      )
      .subscribe((status) => {
        console.log('[StudentQuiz] Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('[StudentQuiz] Successfully subscribed to session updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[StudentQuiz] Error subscribing to session channel');
        }
      });

    return () => {
      console.log('[StudentQuiz] Cleaning up realtime subscriptions');
      sessionChannel.unsubscribe();
    };
  };

  // Countdown timer effect
  useEffect(() => {
    if (showCountdown && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (showCountdown && countdown === 0) {
      setShowCountdown(false);
    }
  }, [showCountdown, countdown]);

  // Answer reveal countdown effect - show answers after 4 seconds
  useEffect(() => {
    if (session?.status === "question_active" && !showAnswers && answerRevealCountdown > 0) {
      const timer = setTimeout(() => {
        setAnswerRevealCountdown(answerRevealCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (session?.status === "question_active" && answerRevealCountdown === 0 && !showAnswers) {
      setShowAnswers(true);
    }
  }, [session?.status, answerRevealCountdown, showAnswers]);

  // Timer countdown - only starts after answers are revealed
  useEffect(() => {
    if (session?.status === "question_active" && timeRemaining > 0 && !hasAnswered && showAnswers) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [session?.status, timeRemaining, hasAnswered, showAnswers]);

  const submitAnswer = async (optionIndex) => {
    if (hasAnswered || !currentQuestion || !participant) return;

    setSelectedOption(optionIndex);
    setHasAnswered(true);

    try {
      const isCorrect = currentQuestion.options[optionIndex].is_correct;
      setWasCorrect(isCorrect);

      // Calculate points based on time remaining
      const timeBonus = Math.floor((timeRemaining / currentQuestion.time_limit) * currentQuestion.points);
      const points = isCorrect ? currentQuestion.points + timeBonus : 0;

      // Submit answer
      const { error: answerError } = await supabase.from("quiz_answers").insert([
        {
          session_id: sessionId,
          participant_id: participant.id,
          question_id: currentQuestion.id,
          selected_option_index: optionIndex,
          is_correct: isCorrect,
          points_earned: points,
          time_taken: currentQuestion.time_limit - timeRemaining,
        },
      ]);

      if (answerError) throw answerError;

      // Update participant score
      const { error: updateError } = await supabase
        .from("session_participants")
        .update({ score: participant.score + points })
        .eq("id", participant.id);

      if (updateError) throw updateError;

      setParticipant({ ...participant, score: participant.score + points });
    } catch (err) {
      setAlertModal({ isOpen: true, title: t('common.error'), message: t('errors.errorSubmittingAnswer') + ": " + err.message, type: "error" });
    }
  };

  const backgroundStyle = useMemo(() => {
    if (theme?.background_image_url) {
      return {
        backgroundImage: `url(${theme.background_image_url})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      };
    }
    if (theme) {
      return {
        background: `linear-gradient(135deg, ${theme.primary_color}, ${theme.secondary_color})`,
      };
    }
    if (quiz?.background_image_url) {
      return {
        backgroundImage: `url(${quiz.background_image_url})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      };
    }
    return { background: "linear-gradient(135deg, #7C3AED, #2563EB)" };
  }, [theme?.background_image_url, theme?.primary_color, theme?.secondary_color, quiz?.background_image_url]);
  const textColor = theme?.text_color || "#FFFFFF";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={backgroundStyle}>
        <p className="text-2xl" style={{ color: textColor }}>{t('student.joiningQuiz')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-red-600 mb-4">{t('common.error')}: {error}</p>
          <button
            onClick={() => {
              clearActiveSession();
              setView("student-dashboard");
            }}
            className="bg-blue-700 text-white px-6 py-3 rounded-lg hover:bg-blue-800"
          >
            {t('student.backToDashboard')}
          </button>
        </div>
      </div>
    );
  }

  // Show countdown screen
  if (showCountdown) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={backgroundStyle}>
        <div className="text-center">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-12 max-w-md">
            <h1 className="text-4xl font-bold text-gray-800 mb-8">{quiz?.title}</h1>
            <div className="mb-4">
              <p className="text-gray-600 mb-4">{t('student.startingIn')}</p>
              <div className="text-6xl md:text-8xl font-bold animate-pulse" style={{ color: theme?.primary_color || "#7C3AED" }}>
                {countdown}
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-6">
              {t('student.getReadyQuizStarting')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Waiting for quiz to start
  if (session.status === "waiting") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={backgroundStyle}>
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-12 text-center max-w-md">
          <h2 className="text-3xl font-bold mb-4">{t('student.youreIn')}</h2>
          <p className="text-gray-600 mb-6">
            {t('student.waitingForTeacherToStart')}
          </p>
          <div className="animate-pulse text-6xl mb-4">⏳</div>
          <p className="text-lg font-semibold" style={{ color: theme?.primary_color || "#7C3AED" }}>{quiz.title}</p>
        </div>
      </div>
    );
  }

  // Question active
  if (session.status === "question_active" && currentQuestion) {
    const answerStyles = [
      { bg: "bg-red-500", hover: "hover:bg-red-600", ring: "ring-red-400", icon: Heart },
      { bg: "bg-blue-600", hover: "hover:bg-blue-700", ring: "ring-blue-400", icon: Spade },
      { bg: "bg-orange-500", hover: "hover:bg-orange-600", ring: "ring-orange-400", icon: Diamond },
      { bg: "bg-green-500", hover: "hover:bg-green-600", ring: "ring-green-400", icon: Club },
    ];

    return (
      <div className="min-h-screen" style={backgroundStyle}>
        <div className="container mx-auto p-4">
          {/* Header */}
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-4 mb-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Clock size={24} className="text-blue-700" />
                <span className="text-3xl font-bold text-blue-700">
                  {timeRemaining}s
                </span>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">{t('session.yourScore')}</p>
                <p className="text-2xl font-bold text-blue-700">
                  {participant?.score || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Question */}
          <div className="p-6 mb-4">
            <div className="text-center mb-6">
              <p className="text-white/80 mb-2 drop-shadow-lg">
                {t('quiz.question')} {session.current_question_index + 1} {t('student.of')} {questions.length}
              </p>
              <h2
                className={`font-bold mb-4 transition-all duration-300 text-white drop-shadow-lg ${showAnswers ? 'text-3xl' : 'text-4xl'}`}
                style={{ textShadow: '2px 2px 6px rgba(0,0,0,0.7), 0 0 20px rgba(0,0,0,0.4)' }}
              >
                {currentQuestion.question_text}
              </h2>

              {/* Media Display */}
              {currentQuestion.image_url && (
                <img
                  src={currentQuestion.image_url}
                  alt="Question"
                  className="max-w-[min(100%,28rem)] mx-auto rounded-lg shadow-lg mb-4"
                />
              )}
              {currentQuestion.video_url && (
                <AutoPlayVideo
                  src={currentQuestion.video_url}
                  className="max-w-[min(100%,28rem)] mx-auto rounded-lg shadow-lg mb-4"
                  reloadKey={currentQuestion.id}
                />
              )}
              {currentQuestion.gif_url && (
                <img
                  src={currentQuestion.gif_url}
                  alt="GIF"
                  className="max-w-[min(100%,28rem)] mx-auto rounded-lg shadow-lg mb-4"
                />
              )}
            </div>

            {/* Answer Options - shown after 4 second delay */}
            {showAnswers ? (
              <div className="relative rounded-xl overflow-hidden">
                {(theme?.background_image_url || quiz?.background_image_url) && (
                  <div
                    className="absolute inset-0 opacity-15"
                    style={{
                      backgroundImage: `url(${theme?.background_image_url || quiz?.background_image_url})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  />
                )}
                <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                {currentQuestion.options?.map((opt, idx) => {
                  // Skip empty options (no text and no image)
                  if (!opt.text && !opt.image_url) return null;

                  const style = answerStyles[idx];
                  const IconComponent = style.icon;

                  return (
                    <button
                      key={idx}
                      onClick={() => submitAnswer(idx)}
                      disabled={hasAnswered || timeRemaining === 0}
                      className={`${style.bg} ${!hasAnswered && timeRemaining > 0 ? style.hover : ""
                        } ${selectedOption === idx ? `ring-4 ${style.ring}` : ""
                        } text-white p-3 sm:p-4 md:p-6 lg:p-8 rounded-lg text-sm sm:text-base md:text-xl lg:text-2xl font-bold transition-all disabled:opacity-60 disabled:cursor-not-allowed flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 relative`}
                    >
                      <IconComponent size={28} className="shrink-0" fill="white" />
                      {opt.image_url ? (
                        <img
                          src={opt.image_url}
                          alt={opt.text || `Option ${idx + 1}`}
                          className="max-h-24 sm:max-h-32 md:max-h-40 object-contain rounded"
                        />
                      ) : (
                        <span className="text-center">{opt.text}</span>
                      )}
                    </button>
                  );
                })}
                </div>
              </div>
            ) : (
              <div className="flex justify-center py-8">
                <svg className="w-16 h-16" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="8"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke={theme?.primary_color || "#7C3AED"}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray="283"
                    strokeDashoffset="283"
                    transform="rotate(-90 50 50)"
                    style={{
                      animation: 'circleProgress 4s linear forwards'
                    }}
                  />
                </svg>
                <style>{`
                  @keyframes circleProgress {
                    from { stroke-dashoffset: 283; }
                    to { stroke-dashoffset: 0; }
                  }
                `}</style>
              </div>
            )}

            {/* Feedback after answering */}
            {hasAnswered && (
              <div
                className={`mt-6 p-4 rounded-xl text-center ${wasCorrect ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  }`}
              >
                <p className="text-2xl font-bold">
                  {wasCorrect ? `✓ ${t('session.correctAnswer')}` : `✗ ${t('student.incorrect')}`}
                </p>
                <p className="text-lg">
                  {wasCorrect
                    ? `+${currentQuestion.points} ${t('quiz.points')}!`
                    : t('student.betterLuckNextTime')}
                </p>
                <p className="text-sm mt-2 opacity-75">
                  Waiting for other players...
                </p>
              </div>
            )}

            {!hasAnswered && timeRemaining === 0 && (
              <div className="mt-6 p-4 rounded-xl text-center bg-gray-100 text-gray-800">
                <p className="text-2xl font-bold">{t('session.timeUp')}</p>
                <p className="text-lg">{t('student.waitingForResults')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Showing results
  if (session.status === "showing_results" && currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={backgroundStyle}>
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-12 text-center max-w-md">
          <div className="mb-6">
            {wasCorrect ? (
              <>
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-4xl font-bold text-green-600 mb-2">{t('session.correctAnswer')}</h2>
              </>
            ) : (
              <>
                <div className="text-6xl mb-4">😔</div>
                <h2 className="text-4xl font-bold text-red-600 mb-2">{t('student.incorrect')}</h2>
              </>
            )}
          </div>

          {showCorrectAnswer && (
            <div className="mb-6">
              <p className="text-gray-600 mb-2">{t('student.theCorrectAnswerWas')}</p>
              {(() => {
                const correctOpt = currentQuestion.options?.find((o) => o.is_correct);
                return correctOpt?.image_url ? (
                  <img
                    src={correctOpt.image_url}
                    alt={correctOpt.text || "Correct answer"}
                    className="max-h-32 object-contain rounded mx-auto"
                  />
                ) : (
                  <p className="text-xl font-bold text-green-600">
                    {correctOpt?.text}
                  </p>
                );
              })()}
            </div>
          )}

          <div className="bg-blue-50 rounded-xl p-6">
            <p className="text-gray-600 mb-1">{t('session.yourScore')}</p>
            <p className="text-4xl font-bold text-blue-700">
              {participant?.score || 0}
            </p>
          </div>

          <p className="text-gray-600 mt-6">{t('student.waitingForNextQuestion')}</p>
        </div>
      </div>
    );
  }

  // Quiz cancelled
  if (session.status === "cancelled") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={backgroundStyle}>
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-12 text-center max-w-md">
          <div className="text-6xl mb-6">🚫</div>
          <h2 className="text-3xl font-bold mb-4">{t('session.quizCancelled')}</h2>
          <p className="text-gray-600 mb-8">
            {t('session.quizCancelledByTeacher')}
          </p>
          <button
            onClick={() => {
              clearActiveSession();
              setView("student-dashboard");
            }}
            className="bg-blue-700 text-white px-8 py-3 rounded-lg hover:bg-blue-800 text-xl font-semibold"
          >
            {t('student.backToDashboard')}
          </button>
        </div>
      </div>
    );
  }

  // Quiz completed
  if (session.status === "completed") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={backgroundStyle}>
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-12 text-center max-w-md">
          <Trophy className="mx-auto mb-6 text-yellow-500" size={80} />
          <h2 className="text-4xl font-bold mb-6">{t('student.quizComplete')}</h2>

          <div className="bg-blue-50 rounded-xl p-8 mb-6">
            <p className="text-gray-600 mb-2">{t('student.finalScore')}</p>
            <p className="text-5xl font-bold text-blue-700">
              {participant?.score || 0}
            </p>
            <p className="text-gray-600 mt-2">{t('quiz.points')}</p>
          </div>

          <p className="text-gray-600 mb-6">{t('student.greatJob')}</p>

          <button
            onClick={() => {
              clearActiveSession();
              setView("student-dashboard");
            }}
            className="bg-blue-700 text-white px-8 py-3 rounded-lg hover:bg-blue-800 text-xl font-semibold"
          >
            {t('student.backToDashboard')}
          </button>
        </div>
      </div>
    );
  }

  // Fallback for any other status (prevents white screen)
  return (
    <div className="min-h-screen flex items-center justify-center" style={backgroundStyle}>
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-12 text-center max-w-md">
        <div className="animate-pulse text-6xl mb-4">⏳</div>
        <h2 className="text-xl font-bold mb-4">{t('student.waitingForTeacherToStart')}</h2>
        {session?.status === "active" && (
          <p className="text-gray-600 mb-4">{t('student.getReadyQuizStarting')}</p>
        )}
        <p className="text-sm text-gray-500">Status: {session?.status}</p>

        <div className="mt-6">
          <button
            onClick={() => setView("student-dashboard")}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            {t('student.backToDashboard')}
          </button>
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
