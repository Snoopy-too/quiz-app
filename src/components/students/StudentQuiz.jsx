import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../../supabaseClient";
import { Trophy, Clock, Heart, Spade, Diamond, Club } from "lucide-react";
import AlertModal from "../common/AlertModal";
import ConfirmModal from "../common/ConfirmModal";

export default function StudentQuiz({ sessionId, appState, setView }) {
  const { t } = useTranslation();
  const [session, setSession] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [theme, setTheme] = useState(null);
  const [participant, setParticipant] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questions, setQuestions] = useState([]);
  const questionsRef = useRef([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
  const [wasCorrect, setWasCorrect] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [showCountdown, setShowCountdown] = useState(false);
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: "", message: "", type: "info" });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: "", message: "", onConfirm: null });

  useEffect(() => {
    if (sessionId) {
      joinSession();
      setupRealtimeSubscriptions();
    }
  }, [sessionId]);

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
      console.log("=== LOADING QUIZ ===");
      console.log("Session quiz_id:", session.quiz_id);

      const { data: quizResults, error: quizError } = await supabase
        .from("quizzes")
        .select("*")
        .eq("id", session.quiz_id);

      console.log("Quiz query results:", quizResults);
      console.log("Quiz query error:", quizError);

      if (quizError) {
        console.error("Quiz query failed:", quizError);
        throw new Error(`${t('errors.errorLoadingQuiz')}: ${quizError.message}`);
      }

      // Get first result from array
      const quizData = quizResults && quizResults.length > 0 ? quizResults[0] : null;
      if (!quizData) {
        console.error("No quiz found with ID:", session.quiz_id);
        console.error("Query returned:", quizResults);
        throw new Error(`${t('errors.quizNotFound')} (ID: ${session.quiz_id}). ${t('errors.quizMayBeDeleted')}`);
      }

      console.log("✅ Quiz loaded successfully:", quizData.title);
      setQuiz(quizData);

      // Load theme separately if quiz has a theme_id
      if (quizData.theme_id) {
        const { data: themeResults, error: themeError } = await supabase
          .from("themes")
          .select("*")
          .eq("id", quizData.theme_id);

        if (!themeError && themeResults && themeResults.length > 0) {
          const themeData = themeResults[0];
          console.log("Theme data loaded:", themeData);
          setTheme(themeData);
        } else {
          console.log("Theme fetch error or no theme found:", themeError);
          setTheme(null);
        }
      } else {
        console.log("No theme_id on quiz");
        setTheme(null);
      }

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
      console.log("Checking if user is already a participant...");
      const { data: existingParticipant, error: checkParticipantError } = await supabase
        .from("session_participants")
        .select("*")
        .eq("session_id", sessionId)
        .eq("user_id", appState.currentUser.id)
        .maybeSingle();

      if (checkParticipantError) {
        console.log("Error checking participant:", checkParticipantError);
      }

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
      }

      // If session is already active, load current question
      if (session.status === "question_active" && orderedQuestions.length > 0) {
        const currentQuestionData = orderedQuestions[session.current_question_index];
        if (currentQuestionData) {
          setCurrentQuestion(currentQuestionData);
          setTimeRemaining(currentQuestionData.time_limit);
        }
      }

      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const setupRealtimeSubscriptions = () => {
    // Subscribe to session updates
    const sessionChannel = supabase
      .channel(`session-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "quiz_sessions",
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          const updatedSession = payload.new;
          setSession(updatedSession);

          if (updatedSession.status === "active" && updatedSession.current_question_index === 0) {
            // Quiz just started, show countdown
            setShowCountdown(true);
            setCountdown(5);
          } else if (updatedSession.status === "question_active") {
            // Use questionsRef to access current questions array
            const currentQuestions = questionsRef.current;
            const questionData = currentQuestions[updatedSession.current_question_index];
            if (questionData) {
              setShowCountdown(false);
              setCurrentQuestion(questionData);
              setTimeRemaining(questionData.time_limit);
              setHasAnswered(false);
              setSelectedOption(null);
              setShowCorrectAnswer(false);
              setWasCorrect(false);
            } else {
              console.error('Question not found at index:', updatedSession.current_question_index);
              console.error('Available questions:', currentQuestions.length);
            }
          } else if (updatedSession.status === "showing_results") {
            setShowCorrectAnswer(true);
          }
        }
      )
      .subscribe();

    return () => {
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

  // Timer countdown
  useEffect(() => {
    if (session?.status === "question_active" && timeRemaining > 0 && !hasAnswered) {
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
  }, [session?.status, timeRemaining, hasAnswered]);

  const submitAnswer = async (optionIndex) => {
    if (hasAnswered || !currentQuestion || !participant) return;

    setSelectedOption(optionIndex);
    setHasAnswered(true);

    try {
      const isCorrect = currentQuestion.options[optionIndex].is_correct;
      setWasCorrect(isCorrect);

      // Calculate points based on time remaining
      const timeBonus = Math.floor((timeRemaining / currentQuestion.time_limit) * 100);
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

  // Helper function to get background style
  const getBackgroundStyle = () => {
    console.log("Getting background style, theme:", theme);

    if (theme?.background_image_url) {
      console.log("Using theme background image:", theme.background_image_url);
      return {
        backgroundImage: `url(${theme.background_image_url})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      };
    }

    if (theme) {
      console.log("Using theme gradient colors:", theme.primary_color, theme.secondary_color);
      return {
        background: `linear-gradient(135deg, ${theme.primary_color}, ${theme.secondary_color})`,
      };
    }

    if (quiz?.background_image_url) {
      console.log("Using quiz background image:", quiz.background_image_url);
      return {
        backgroundImage: `url(${quiz.background_image_url})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      };
    }

    console.log("No theme or custom background found, using fallback");
    return { background: "linear-gradient(135deg, #7C3AED, #2563EB)" };
  };

  const backgroundStyle = getBackgroundStyle();
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
            onClick={() => setView("student-dashboard")}
            className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700"
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
              <div className="text-8xl font-bold animate-pulse" style={{ color: theme?.primary_color || "#7C3AED" }}>
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
                <Clock size={24} className="text-purple-600" />
                <span className="text-3xl font-bold text-purple-600">
                  {timeRemaining}s
                </span>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">{t('session.yourScore')}</p>
                <p className="text-2xl font-bold text-purple-600">
                  {participant?.score || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Question */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 mb-4">
            <div className="text-center mb-6">
              <p className="text-gray-600 mb-2">
                {t('quiz.question')} {session.current_question_index + 1} {t('student.of')} {questions.length}
              </p>
              <h2 className="text-3xl font-bold mb-4">{currentQuestion.question_text}</h2>

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

            {/* Answer Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentQuestion.options?.map((opt, idx) => {
                const style = answerStyles[idx];
                const IconComponent = style.icon;

                return (
                  <button
                    key={idx}
                    onClick={() => submitAnswer(idx)}
                    disabled={hasAnswered || timeRemaining === 0}
                    className={`${style.bg} ${
                      !hasAnswered && timeRemaining > 0 ? style.hover : ""
                    } ${
                      selectedOption === idx ? `ring-4 ${style.ring}` : ""
                    } text-white p-6 md:p-8 rounded-lg text-xl md:text-2xl font-bold transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3 relative`}
                  >
                    <IconComponent size={28} className="absolute left-4 top-4" fill="white" />
                    <span>{opt.text}</span>
                  </button>
                );
              })}
            </div>

            {/* Feedback after answering */}
            {hasAnswered && (
              <div
                className={`mt-6 p-4 rounded-xl text-center ${
                  wasCorrect ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
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
              <p className="text-xl font-bold text-green-600">
                {currentQuestion.options?.find((o) => o.is_correct)?.text}
              </p>
            </div>
          )}

          <div className="bg-purple-100 rounded-xl p-6">
            <p className="text-gray-600 mb-1">{t('session.yourScore')}</p>
            <p className="text-4xl font-bold text-purple-600">
              {participant?.score || 0}
            </p>
          </div>

          <p className="text-gray-600 mt-6">{t('student.waitingForNextQuestion')}</p>
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

          <div className="bg-purple-100 rounded-xl p-8 mb-6">
            <p className="text-gray-600 mb-2">{t('student.finalScore')}</p>
            <p className="text-5xl font-bold text-purple-600">
              {participant?.score || 0}
            </p>
            <p className="text-gray-600 mt-2">{t('quiz.points')}</p>
          </div>

          <p className="text-gray-600 mb-6">{t('student.greatJob')}</p>

          <button
            onClick={() => setView("student-dashboard")}
            className="bg-purple-600 text-white px-8 py-3 rounded-lg hover:bg-purple-700 text-xl font-semibold"
          >
            {t('student.backToDashboard')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
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
}
