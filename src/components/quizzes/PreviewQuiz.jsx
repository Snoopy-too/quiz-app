import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { Trophy, Clock, Heart, Spade, Diamond, Club, X, SkipForward } from "lucide-react";
import AlertModal from "../common/AlertModal";
import ConfirmModal from "../common/ConfirmModal";
import AutoPlayVideo from "../common/AutoPlayVideo";

export default function PreviewQuiz({ quizId, setView, returnView = "manage-quizzes" }) {
  const [quiz, setQuiz] = useState(null);
  const [theme, setTheme] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [wasCorrect, setWasCorrect] = useState(false);
  const [quizComplete, setQuizComplete] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [showCountdown, setShowCountdown] = useState(true);
  const [showAnswers, setShowAnswers] = useState(false);
  const [answerRevealCountdown, setAnswerRevealCountdown] = useState(4);
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: "", message: "", type: "info" });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: "", message: "", onConfirm: null });

  useEffect(() => {
    loadQuiz();
  }, [quizId]);

  const loadQuiz = async () => {
    try {
      // Check if quizId is valid
      if (!quizId) {
        setError("No quiz ID provided");
        setLoading(false);
        return;
      }

      // Load quiz
      const { data: quizData, error: quizError } = await supabase
        .from("quizzes")
        .select("*")
        .eq("id", quizId)
        .single();

      if (quizError) throw quizError;
      setQuiz(quizData);

      // Load theme if quiz has a theme_id
      if (quizData.theme_id) {
        const { data: themeData, error: themeError } = await supabase
          .from("themes")
          .select("*")
          .eq("id", quizData.theme_id)
          .single();

        if (!themeError && themeData) {
          setTheme(themeData);
        }
      }

      // Load questions
      const { data: questionsData, error: questionsError } = await supabase
        .from("questions")
        .select("*")
        .eq("quiz_id", quizId)
        .order("order_index", { ascending: true });

      if (questionsError) throw questionsError;

      if (!questionsData || questionsData.length === 0) {
        setError("This quiz has no questions yet.");
        setLoading(false);
        return;
      }

      setQuestions(questionsData);
      setTimeRemaining(questionsData[0].time_limit);
      setLoading(false);

      // Start countdown when quiz loads
      setShowCountdown(true);
      setCountdown(5);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  // Helper function to get background style
  const getBackgroundStyle = () => {
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
  };

  const backgroundStyle = getBackgroundStyle();

  // Countdown timer effect
  useEffect(() => {
    if (showCountdown && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (showCountdown && countdown === 0) {
      setShowCountdown(false);
      // Reset answer reveal countdown when question countdown ends
      setShowAnswers(false);
      setAnswerRevealCountdown(4);
    }
  }, [showCountdown, countdown]);

  // Answer reveal countdown effect - show answers after 4 seconds
  useEffect(() => {
    if (!showCountdown && !showResults && !quizComplete && !showAnswers && answerRevealCountdown > 0) {
      const timer = setTimeout(() => {
        setAnswerRevealCountdown(answerRevealCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (!showCountdown && answerRevealCountdown === 0 && !showAnswers) {
      setShowAnswers(true);
    }
  }, [showCountdown, showResults, quizComplete, answerRevealCountdown, showAnswers]);

  // Timer countdown - only starts after answers are revealed
  useEffect(() => {
    if (timeRemaining > 0 && !hasAnswered && !showResults && !quizComplete && showAnswers) {
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
  }, [timeRemaining, hasAnswered, showResults, quizComplete, showAnswers]);

  const submitAnswer = (optionIndex) => {
    if (hasAnswered) return;

    const currentQuestion = questions[currentQuestionIndex];
    setSelectedOption(optionIndex);
    setHasAnswered(true);

    const isCorrect = currentQuestion.options[optionIndex].is_correct;
    setWasCorrect(isCorrect);

    if (isCorrect) {
      // Calculate points based on time remaining
      const timeBonus = Math.floor((timeRemaining / currentQuestion.time_limit) * 100);
      const points = currentQuestion.points + timeBonus;
      setScore(score + points);
    }

    setShowResults(true);
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedOption(null);
      setHasAnswered(false);
      setShowResults(false);
      setWasCorrect(false);
      setTimeRemaining(questions[currentQuestionIndex + 1].time_limit);
      // Reset answer reveal for next question
      setShowAnswers(false);
      setAnswerRevealCountdown(4);
    } else {
      setQuizComplete(true);
    }
  };

  const quitPreview = () => {
    setConfirmModal({
      isOpen: true,
      title: "Quit Preview",
      message: "Are you sure you want to quit the preview? Your progress will be lost.",
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        setView(returnView);
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={backgroundStyle}>
        <p className="text-2xl text-white">Loading preview...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl shadow-2xl p-12 max-w-md">
          <p className="text-xl text-red-600 mb-4">Error: {error}</p>
          <button
            onClick={() => setView(returnView)}
            className="bg-blue-700 text-white px-6 py-3 rounded-lg hover:bg-blue-800"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  // Quiz completed
  if (quizComplete) {
    return (
      <div className="min-h-screen" style={backgroundStyle}>
        <nav className="bg-white/95 backdrop-blur-sm shadow-md p-4 flex justify-between items-center">
          <div>
            <span className="text-sm text-gray-600">Preview Mode</span>
            <h1 className="text-xl font-bold text-blue-700">{quiz.title}</h1>
          </div>
          <button
            onClick={() => setView(returnView)}
            className="bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800"
          >
            Exit Preview
          </button>
        </nav>

        <div className="container mx-auto p-6 flex items-center justify-center min-h-[80vh]">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-12 text-center max-w-md w-full">
            <Trophy className="mx-auto mb-6 text-yellow-500" size={80} />
            <h2 className="text-4xl font-bold mb-6">Preview Complete!</h2>

            <div className="bg-blue-50 rounded-xl p-8 mb-6">
              <p className="text-gray-600 mb-2">Final Score</p>
              <p className="text-5xl font-bold text-blue-700">{score}</p>
              <p className="text-gray-600 mt-2">points</p>
            </div>

            <p className="text-gray-600 mb-6">
              You answered {questions.length} question{questions.length !== 1 ? "s" : ""}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setCurrentQuestionIndex(0);
                  setSelectedOption(null);
                  setHasAnswered(false);
                  setShowResults(false);
                  setWasCorrect(false);
                  setScore(0);
                  setQuizComplete(false);
                  setTimeRemaining(questions[0].time_limit);
                  setShowCountdown(true);
                  setCountdown(5);
                  setShowAnswers(false);
                  setAnswerRevealCountdown(4);
                }}
                className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-semibold"
              >
                Try Again
              </button>
              <button
                onClick={() => setView(returnView)}
                className="flex-1 bg-blue-700 text-white px-6 py-3 rounded-lg hover:bg-blue-800 font-semibold"
              >
                Exit Preview
              </button>
            </div>
          </div>
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
            <div className="mb-6">
              <span className="px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                PREVIEW MODE
              </span>
            </div>
            <h1 className="text-4xl font-bold text-gray-800 mb-8">{quiz?.title}</h1>
            <div className="mb-4">
              <p className="text-gray-600 mb-4">Starting in...</p>
              <div className="text-8xl font-bold animate-pulse" style={{ color: theme?.primary_color || "#7C3AED" }}>
                {countdown}
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-6">
              Get ready! The quiz will begin shortly.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const answerStyles = [
    { bg: "bg-red-500", hover: "hover:bg-red-600", ring: "ring-red-400", icon: Heart },
    { bg: "bg-blue-600", hover: "hover:bg-blue-700", ring: "ring-blue-400", icon: Spade },
    { bg: "bg-orange-500", hover: "hover:bg-orange-600", ring: "ring-orange-400", icon: Diamond },
    { bg: "bg-green-500", hover: "hover:bg-green-600", ring: "ring-green-400", icon: Club },
  ];

  return (
    <div className="min-h-screen" style={backgroundStyle}>
      {/* Header */}
      <nav className="bg-white/95 backdrop-blur-sm shadow-md p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                PREVIEW MODE
              </span>
              <h1 className="text-xl font-bold text-blue-700">{quiz.title}</h1>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Question {currentQuestionIndex + 1} of {questions.length}
            </p>
          </div>
          <button
            onClick={quitPreview}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            <X size={20} />
            Exit Preview
          </button>
        </div>
      </nav>

      <div className="container mx-auto p-4">
        {/* Timer and Score */}
        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-4 mb-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Clock size={24} className="text-blue-700" />
              <span className="text-3xl font-bold text-blue-700">
                {timeRemaining}s
              </span>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Preview Score</p>
              <p className="text-2xl font-bold text-blue-700">{score}</p>
            </div>
          </div>
        </div>

        {/* Question */}
        <div className="p-6 mb-4">
          <div className="text-center mb-6">
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
          {!showResults ? (
            showAnswers ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        } text-white p-6 md:p-8 rounded-lg text-xl md:text-2xl font-bold transition-all disabled:opacity-60 disabled:cursor-not-allowed flex flex-col md:flex-row items-center justify-center gap-3 relative`}
                    >
                      <IconComponent size={28} className="shrink-0" fill="white" />
                      {opt.image_url ? (
                        <img
                          src={opt.image_url}
                          alt={opt.text || `Option ${idx + 1}`}
                          className="max-h-24 md:max-h-32 object-contain rounded"
                        />
                      ) : (
                        <span className="text-center">{opt.text}</span>
                      )}
                    </button>
                  );
                })}
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
            )
          ) : (
            <>
              {/* Show results */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {currentQuestion.options?.map((opt, idx) => {
                  // Skip empty options (no text and no image)
                  if (!opt.text && !opt.image_url) return null;

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
                      {opt.image_url ? (
                        <div className="mt-8 flex justify-center">
                          <img
                            src={opt.image_url}
                            alt={opt.text || `Option ${idx + 1}`}
                            className="max-h-24 object-contain rounded"
                          />
                        </div>
                      ) : (
                        <div className="text-xl font-bold mt-8">{opt.text}</div>
                      )}
                      {isCorrect && (
                        <div className="absolute top-2 right-2 bg-white text-green-600 rounded-full p-2 font-bold">
                          ✓
                        </div>
                      )}
                      {selectedOption === idx && !isCorrect && (
                        <div className="absolute top-2 right-2 bg-white text-red-600 rounded-full p-2 font-bold">
                          ✗
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Feedback */}
              <div
                className={`p-4 rounded-xl text-center mb-4 ${wasCorrect ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  }`}
              >
                <p className="text-2xl font-bold">
                  {wasCorrect ? "✓ Correct!" : "✗ Incorrect"}
                </p>
                <p className="text-lg">
                  {wasCorrect
                    ? `+${currentQuestion.points} points!`
                    : "Better luck next time!"}
                </p>
              </div>

              {/* Next button */}
              <div className="flex justify-center">
                <button
                  onClick={nextQuestion}
                  className="bg-blue-600 text-white px-12 py-4 rounded-xl hover:bg-blue-700 text-xl font-bold flex items-center gap-3"
                >
                  {currentQuestionIndex < questions.length - 1 ? (
                    <>
                      Next Question
                      <SkipForward size={24} />
                    </>
                  ) : (
                    <>
                      <Trophy size={24} />
                      Finish Preview
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          {!hasAnswered && timeRemaining === 0 && !showResults && (
            <div className="mt-6 p-4 rounded-xl text-center bg-gray-100 text-gray-800">
              <p className="text-2xl font-bold">Time's up!</p>
              <button
                onClick={nextQuestion}
                className="mt-4 bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 font-semibold"
              >
                Continue
              </button>
            </div>
          )}
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
