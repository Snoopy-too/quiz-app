import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../../supabaseClient";
import { ChevronLeft, ChevronRight, Clock, AlertTriangle, CheckCircle, Send, Loader2, Heart, Spade, Diamond, Club, Calendar } from "lucide-react";
import AlertModal from "../common/AlertModal";
import ConfirmModal from "../common/ConfirmModal";

// Answer button styles (same as StudentQuiz)
const answerStyles = [
  { bg: "bg-red-500", hover: "hover:bg-red-600", ring: "ring-red-300", icon: Heart },
  { bg: "bg-blue-500", hover: "hover:bg-blue-600", ring: "ring-blue-300", icon: Spade },
  { bg: "bg-yellow-500", hover: "hover:bg-yellow-600", ring: "ring-yellow-300", icon: Diamond },
  { bg: "bg-green-500", hover: "hover:bg-green-600", ring: "ring-green-300", icon: Club },
];

export default function AssignedQuizTaking({ assignmentId, appState, setView, viewResults = false }) {
  const { t } = useTranslation();
  const [assignment, setAssignment] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { questionId: { optionIndex, isCorrect, timeTaken } }
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [questionStartTime, setQuestionStartTime] = useState(null);
  const [showResults, setShowResults] = useState(viewResults);
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: "", message: "", type: "info" });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: "", message: "", onConfirm: null });
  const [deadlineRemaining, setDeadlineRemaining] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null); // Per-question timer
  const [showOptions, setShowOptions] = useState(false); // Valid for "Read Time"

  useEffect(() => {
    if (assignmentId) {
      loadAssignment();
    }
  }, [assignmentId]);

  // Deadline countdown timer
  useEffect(() => {
    if (!assignment?.deadline) return;

    const updateRemaining = () => {
      const now = new Date();
      const deadline = new Date(assignment.deadline);
      const diff = deadline - now;

      if (diff <= 0) {
        setDeadlineRemaining(0);
        // Auto-submit if deadline passed
        if (!showResults && !submitting) {
          handleSubmit(true);
        }
      } else {
        setDeadlineRemaining(diff);
      }
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);
    return () => clearInterval(interval);
  }, [assignment?.deadline, showResults, submitting]);

  // Question timer & Reading Delay Logic
  useEffect(() => {
    if (questions.length > 0 && currentQuestionIndex >= 0) {
      const currentQ = questions[currentQuestionIndex];
      const isAnswered = currentQ && answers[currentQ.id];

      if (currentQ && !isAnswered) {
        // Start reading phase
        setShowOptions(false);
        setTimeLeft(currentQ.time_limit || 20); // Initialize timer but don't count down yet

        const delay = setTimeout(() => {
          setShowOptions(true);
          setQuestionStartTime(Date.now()); // Start "answering time" now
        }, 3000); // 3 seconds reading time

        return () => clearTimeout(delay);
      } else {
        // Already answered or invalid
        setShowOptions(true);
        setTimeLeft(null);
      }
    }
  }, [currentQuestionIndex, questions, answers]); // Re-run when current question changes

  // Countdown Effect
  useEffect(() => {
    if (!showOptions) return; // Don't count down during reading phase
    if (timeLeft === null || timeLeft <= 0 || showResults) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Time's up!
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, showResults, showOptions]);

  const loadAssignment = async () => {
    setLoading(true);
    try {
      // Fetch assignment with quiz data
      const { data: assignmentData, error: assignmentError } = await supabase
        .from("quiz_assignments")
        .select(`
          *,
          quizzes (
            id,
            title,
            category_id,
            theme_id,
            categories (
              name
            ),
            themes (
              primary_color,
              secondary_color,
              background_image_url
            )
          )
        `)
        .eq("id", assignmentId)
        .single();

      if (assignmentError) throw assignmentError;

      // Check if deadline passed
      if (new Date(assignmentData.deadline) < new Date() && assignmentData.status !== "completed") {
        setError(t("assignedQuiz.deadlinePassed", "The deadline for this quiz has passed."));
        setLoading(false);
        return;
      }

      setAssignment(assignmentData);
      setQuiz(assignmentData.quizzes);

      // If already completed, show results
      if (assignmentData.status === "completed" || viewResults) {
        await loadCompletedResults(assignmentData);
        setShowResults(true);
        setLoading(false);
        return;
      }

      // Fetch questions in the stored order
      const questionOrder = assignmentData.question_order || [];

      const { data: questionsData, error: questionsError } = await supabase
        .from("questions")
        .select("*")
        .in("id", questionOrder);

      if (questionsError) throw questionsError;

      // Sort questions according to stored order
      let sortedQuestions = questionOrder
        .map(id => questionsData.find(q => q.id === id))
        .filter(Boolean);

      // Fallback: If no questions found via ID list (maybe IDs changed or list is empty), 
      // try fetching all questions for this quiz
      if (sortedQuestions.length === 0) {
        const { data: allQuestions, error: fallbackError } = await supabase
          .from("questions")
          .select("*")
          .eq("quiz_id", assignmentData.quiz_id);

        if (!fallbackError && allQuestions?.length > 0) {
          sortedQuestions = allQuestions;
        } else if (fallbackError) {
          console.error('[AssignedQuizTaking] Fallback fetch failed:', fallbackError);
        }
      }

      if (sortedQuestions.length === 0) {
        setError(t("assignedQuiz.noQuestions", "This quiz has no questions or you don't have permission to view them."));
        setLoading(false);
        return;
      }

      setQuestions(sortedQuestions);

      // Load any existing answers (for resuming)
      const { data: existingAnswers, error: answersError } = await supabase
        .from("assignment_answers")
        .select("*")
        .eq("assignment_id", assignmentId);

      if (!answersError && existingAnswers) {
        const answersMap = {};
        existingAnswers.forEach(a => {
          answersMap[a.question_id] = {
            optionIndex: a.selected_option_index,
            isCorrect: a.is_correct,
            timeTaken: a.time_taken
          };
        });
        setAnswers(answersMap);
      }

      // Update status to in_progress if pending
      if (assignmentData.status === "pending") {
        await supabase
          .from("quiz_assignments")
          .update({ status: "in_progress", started_at: new Date().toISOString() })
          .eq("id", assignmentId);
      }

      // Set start times
      setStartTime(assignmentData.started_at ? new Date(assignmentData.started_at) : new Date());
      setQuestionStartTime(Date.now());
      setCurrentQuestionIndex(assignmentData.current_question_index || 0);

      // Initialize timeLeft for the first loaded question if not answered
      const firstQ = sortedQuestions[assignmentData.current_question_index || 0];
      if (firstQ) {
        // Check if already answered in the just-loaded map
        // NOTE: 'answers' state isn't set yet (closure), so we check 'existingAnswers'
        const isAnswered = existingAnswers?.some(a => a.question_id === firstQ.id);
        if (!isAnswered) {
          setShowOptions(false);
          setTimeLeft(firstQ.time_limit || 20);
        } else {
          setShowOptions(true);
        }
      }

    } catch (err) {
      console.error("Error loading assignment:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadCompletedResults = async (assignmentData) => {
    // Load questions and answers for results view
    const questionOrder = assignmentData.question_order || [];
    const { data: questionsData } = await supabase
      .from("questions")
      .select("*")
      .in("id", questionOrder);

    const sortedQuestions = questionOrder
      .map(id => questionsData?.find(q => q.id === id))
      .filter(Boolean);

    setQuestions(sortedQuestions);

    const { data: existingAnswers } = await supabase
      .from("assignment_answers")
      .select("*")
      .eq("assignment_id", assignmentData.id);

    if (existingAnswers) {
      const answersMap = {};
      existingAnswers.forEach(a => {
        answersMap[a.question_id] = {
          optionIndex: a.selected_option_index,
          isCorrect: a.is_correct,
          timeTaken: a.time_taken,
          pointsEarned: a.points_earned
        };
      });
      setAnswers(answersMap);
    }
  };

  const handleSelectOption = async (questionId, optionIndex) => {
    if (showResults) return;

    // Block if time ran out
    if (timeLeft === 0 && !answers[questionId]) return;
    // Block if options are hidden
    if (!showOptions) return;

    const question = questions.find(q => q.id === questionId);
    if (!question) return;

    const isCorrect = question.options[optionIndex]?.is_correct || false;

    // Calculate time taken for this question
    // If strict timer, valid time taken is (TimeLimit - timeLeft)
    const timeLimit = question.time_limit || 20; // Default
    const validTimeLeft = timeLeft === null ? 0 : timeLeft;
    const timeTaken = Math.max(0, timeLimit - validTimeLeft);

    const points = isCorrect ? (question.points || 100) : 0;

    const newAnswer = {
      optionIndex,
      isCorrect,
      timeTaken,
      pointsEarned: points
    };

    setAnswers(prev => ({ ...prev, [questionId]: newAnswer }));

    // Stop the timer
    setTimeLeft(null);

    // Save to database (upsert)
    try {
      const { error: upsertError } = await supabase
        .from("assignment_answers")
        .upsert({
          assignment_id: assignmentId,
          question_id: questionId,
          selected_option_index: optionIndex,
          is_correct: isCorrect,
          points_earned: points,
          time_taken: timeTaken,
          answered_at: new Date().toISOString()
        }, {
          onConflict: "assignment_id,question_id"
        });

      if (upsertError) console.error("Error saving answer:", upsertError);
    } catch (err) {
      console.error("Error saving answer:", err);
    }
  };

  const goToQuestion = async (index) => {
    if (index < 0 || index >= questions.length) return;

    setCurrentQuestionIndex(index);
    // setQuestionStartTime will be handled by the effect when options are shown

    // Update progress in database
    await supabase
      .from("quiz_assignments")
      .update({ current_question_index: index })
      .eq("id", assignmentId);
  };

  const handleSubmit = async (autoSubmit = false) => {
    if (!autoSubmit) {
      const unansweredCount = questions.length - Object.keys(answers).length;
      if (unansweredCount > 0) {
        setConfirmModal({
          isOpen: true,
          title: t("assignedQuiz.unansweredQuestions", "Unanswered Questions"),
          message: t("assignedQuiz.unansweredWarning", "You have {count} unanswered questions. Are you sure you want to submit?").replace("{count}", unansweredCount),
          onConfirm: () => {
            setConfirmModal({ ...confirmModal, isOpen: false });
            submitQuiz();
          }
        });
        return;
      }
    }

    await submitQuiz();
  };

  const submitQuiz = async () => {
    setSubmitting(true);
    try {
      // Calculate final score
      const totalScore = Object.values(answers).reduce((sum, a) => sum + (a.pointsEarned || 0), 0);
      const correctAnswers = Object.values(answers).filter(a => a.isCorrect).length;
      const totalTime = Math.floor((Date.now() - startTime.getTime()) / 1000);

      // Update assignment as completed
      const { error: updateError } = await supabase
        .from("quiz_assignments")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          score: totalScore,
          correct_answers: correctAnswers,
          time_taken: totalTime
        })
        .eq("id", assignmentId);

      if (updateError) throw updateError;

      setAssignment(prev => ({
        ...prev,
        status: "completed",
        score: totalScore,
        correct_answers: correctAnswers,
        time_taken: totalTime
      }));

      setShowResults(true);
      setAlertModal({
        isOpen: true,
        title: t("assignedQuiz.quizCompleted", "Quiz Completed!"),
        message: t("assignedQuiz.scoreMessage", "You scored {score} points with {correct}/{total} correct answers.").replace("{score}", totalScore).replace("{correct}", correctAnswers).replace("{total}", questions.length),
        type: "success"
      });
    } catch (err) {
      console.error("Error submitting quiz:", err);
      setAlertModal({
        isOpen: true,
        title: t("common.error", "Error"),
        message: err.message,
        type: "error"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (ms) => {
    if (ms <= 0) return "0:00";
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const isUrgent = deadlineRemaining !== null && deadlineRemaining < 30 * 60 * 1000; // < 30 minutes

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 size={48} className="animate-spin text-orange-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md">
          <AlertTriangle size={48} className="mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">{t("common.error", "Error")}</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => setView("assigned-quizzes")}
            className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-semibold"
          >
            {t("common.back", "Back")}
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : null;
  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / questions.length) * 100;

  // Results View
  if (showResults) {
    const totalScore = assignment?.score || Object.values(answers).reduce((sum, a) => sum + (a.pointsEarned || 0), 0);
    const correctAnswers = assignment?.correct_answers || Object.values(answers).filter(a => a.isCorrect).length;

    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-500 to-orange-600 p-4">
        <div className="max-w-3xl mx-auto">
          {/* Results Header */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6 text-center">
            <CheckCircle size={64} className="mx-auto mb-4 text-green-500" />
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              {t("assignedQuiz.quizCompleted", "Quiz Completed!")}
            </h1>
            <p className="text-gray-600 mb-6">{quiz?.title}</p>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-orange-50 rounded-xl p-4">
                <p className="text-3xl font-bold text-orange-600">{totalScore}</p>
                <p className="text-sm text-gray-600">{t("assignedQuiz.points", "Points")}</p>
              </div>
              <div className="bg-green-50 rounded-xl p-4">
                <p className="text-3xl font-bold text-green-600">{correctAnswers}/{questions.length}</p>
                <p className="text-sm text-gray-600">{t("assignedQuiz.correct", "Correct")}</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-3xl font-bold text-blue-600">{Math.round((correctAnswers / questions.length) * 100)}%</p>
                <p className="text-sm text-gray-600">{t("assignedQuiz.accuracy", "Accuracy")}</p>
              </div>
            </div>

            <button
              onClick={() => setView("assigned-quizzes")}
              className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 rounded-lg font-semibold"
            >
              {t("common.backToList", "Back to Assigned Quizzes")}
            </button>
          </div>

          {/* Question Review */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              {t("assignedQuiz.questionReview", "Question Review")}
            </h2>
            <div className="space-y-4">
              {questions.map((q, idx) => {
                const answer = answers[q.id];
                return (
                  <div key={q.id} className={`p-4 rounded-lg border-2 ${answer?.isCorrect ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
                    <div className="flex items-start gap-3">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${answer?.isCorrect ? "bg-green-500" : "bg-red-500"}`}>
                        {idx + 1}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{q.question_text}</p>
                        {answer ? (
                          <p className="text-sm mt-2">
                            <span className="text-gray-600">{t("assignedQuiz.yourAnswer", "Your answer")}: </span>
                            <span className={answer.isCorrect ? "text-green-600 font-semibold" : "text-red-600"}>
                              {q.options[answer.optionIndex]?.text}
                            </span>
                            {!answer.isCorrect && (
                              <span className="text-green-600 ml-2">
                                ({t("assignedQuiz.correctAnswer", "Correct")}: {q.options.find(o => o.is_correct)?.text})
                              </span>
                            )}
                          </p>
                        ) : (
                          <p className="text-sm mt-2 text-gray-500 italic">{t("assignedQuiz.notAnswered", "Not answered")}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <AlertModal
          isOpen={alertModal.isOpen}
          title={alertModal.title}
          message={alertModal.message}
          type={alertModal.type}
          onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        />
      </div>
    );
  }

  // Quiz Taking View
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 to-orange-600 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-md p-4">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-800">{quiz?.title}</h1>
            <p className="text-sm text-gray-500">
              {t("assignedQuiz.question", "Question")} {currentQuestionIndex + 1} / {questions.length}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Question Timer - Prominent */}
            {!answers[currentQuestion?.id] && timeLeft !== null && (
              <div className={`flex items-center gap-2 px-6 py-3 rounded-full font-black border-4 shadow-lg transform transition-all ${timeLeft <= 5
                  ? "bg-red-100 border-red-500 text-red-600 scale-110 animate-pulse"
                  : "bg-white border-blue-500 text-blue-600"
                }`}>
                <Clock size={32} strokeWidth={2.5} />
                <span className="text-3xl tabular-nums tracking-wider">{timeLeft}</span>
              </div>
            )}

            {/* Deadline Timer */}
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${isUrgent ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"}`}>
              {isUrgent ? <AlertTriangle size={20} /> : <Calendar size={20} />}
              <div>
                <span className="font-semibold">{formatTime(deadlineRemaining)}</span>
                <span className="text-xs ml-1 block">{t("assignedQuiz.remaining", "remaining")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="max-w-4xl mx-auto mt-3">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
            <span>{t("assignedQuiz.progress", "Progress")}: {answeredCount}/{questions.length}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-orange-500 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      {/* Question Content */}
      <main className="flex-1 p-4">
        <div className="max-w-4xl mx-auto">
          {currentQuestion && (
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 sm:p-8">
              {/* Question Text */}
              <div className="mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800 text-center">
                  {currentQuestion.question_text}
                </h2>
                {currentQuestion.image_url && (
                  <div className="mt-4 flex justify-center">
                    <img
                      src={currentQuestion.image_url}
                      alt="Question"
                      className="max-h-48 sm:max-h-64 rounded-lg object-contain"
                    />
                  </div>
                )}
              </div>

              {/* Time's Up Message */}
              {timeLeft === 0 && !answers[currentQuestion.id] && (
                <div className="mb-6 bg-red-100 border border-red-300 text-red-700 p-4 rounded-lg text-center animate-bounce">
                  <p className="font-bold text-lg">{t("session.timeUp", "Time's Up!")}</p>
                  <p className="text-sm">{t("assignedQuiz.timeUpMessage", "You can no longer answer this question.")}</p>
                </div>
              )}

              {/* Answer Options - Hidden during read time if not answering/answered */}
              {showOptions ? (
                <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 fade-in`} style={{ animation: 'fadeIn 0.5s ease-in' }}>
                  {currentQuestion.options?.map((opt, idx) => {
                    if (!opt.text && !opt.image_url) return null;

                    const style = answerStyles[idx];
                    const IconComponent = style.icon;
                    const isSelected = currentAnswer?.optionIndex === idx;
                    const isDisabled = (timeLeft === 0 && !isSelected) || (currentAnswer !== undefined);

                    return (
                      <button
                        key={idx}
                        onClick={() => handleSelectOption(currentQuestion.id, idx)}
                        disabled={isDisabled}
                        className={`${style.bg} ${!isDisabled ? style.hover : "opacity-50 cursor-not-allowed"} ${isSelected ? `ring-4 ${style.ring} scale-105` : ""
                          } text-white p-4 sm:p-6 rounded-lg text-lg font-bold transition-all flex items-center justify-center gap-3`}
                      >
                        <IconComponent size={24} fill="white" className="shrink-0" />
                        {opt.image_url ? (
                          <img
                            src={opt.image_url}
                            alt={opt.text || `Option ${idx + 1}`}
                            className="max-h-20 object-contain rounded"
                          />
                        ) : (
                          <span className="text-center">{opt.text}</span>
                        )}
                        {isSelected && (
                          <CheckCircle size={24} className="shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center">
                  {/* Placeholder for reading time, keep layout stable or just empty */}
                  <div className="flex flex-col items-center text-gray-400 animate-pulse">
                    <Clock size={48} className="mb-2 opacity-50" />
                    <p className="text-sm font-medium tracking-widest uppercase">Reading Time</p>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="mt-8 flex items-center justify-between">
                <button
                  onClick={() => goToQuestion(currentQuestionIndex - 1)}
                  disabled={currentQuestionIndex === 0}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={20} />
                  {t("assignedQuiz.previous", "Previous")}
                </button>

                {currentQuestionIndex === questions.length - 1 ? (
                  <button
                    onClick={() => handleSubmit(false)}
                    disabled={submitting}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50"
                  >
                    {submitting ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <Send size={20} />
                    )}
                    {t("assignedQuiz.submitQuiz", "Submit Quiz")}
                  </button>
                ) : (
                  <button
                    onClick={() => goToQuestion(currentQuestionIndex + 1)}
                    className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg"
                  >
                    {t("assignedQuiz.next", "Next")}
                    <ChevronRight size={20} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

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
      />
    </div>
  );
}
