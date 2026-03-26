import React from "react";
import { useTranslation } from "react-i18next";
import { X, Shuffle } from "lucide-react";
import AssignQuizModal from "../../teachers/AssignQuizModal";

export default function ModeSelection({
  quiz,
  session,
  selectMode,
  closeSession,
  allowSharedDevice,
  setAllowSharedDevice,
  randomizeQuestions,
  setRandomizeQuestions,
  randomizeAnswers,
  setRandomizeAnswers,
  showAssignModal,
  setShowAssignModal,
  alertModal,
  setAlertModal,
}) {
  const { t } = useTranslation();

  return (
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                className="border-2 border-gray-300 rounded-xl p-8 hover:border-blue-600 hover:shadow-lg transition group bg-white"
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

                {/* Shared Device Toggle */}
                <label
                  className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200 cursor-pointer text-left"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={allowSharedDevice}
                    onChange={(e) => setAllowSharedDevice(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">Allow shared device teams</span>
                </label>

                <button
                  onClick={() => selectMode("team")}
                  className="w-full mt-4 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 font-semibold transition"
                >
                  Start Team Mode
                </button>
              </div>

              {/* Assign Quiz Mode */}
              <div
                onClick={() => setShowAssignModal(true)}
                className="border-2 border-gray-300 rounded-xl p-8 hover:border-orange-600 hover:shadow-lg transition cursor-pointer group bg-white"
              >
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-2xl font-bold mb-3 group-hover:text-orange-600">{t("teacherControl.assignQuiz", "Assign Quiz")}</h3>
                <p className="text-gray-600 mb-4">
                  {t("teacherControl.assignQuizDescription", "Assign this quiz to specific students with a deadline.")}
                </p>
                <ul className="text-left text-sm text-gray-600 space-y-2">
                  <li>✓ {t("teacherControl.forAbsentStudents", "For absent students")}</li>
                  <li>✓ {t("teacherControl.setDeadline", "Set deadline")}</li>
                  <li>✓ {t("teacherControl.emailNotifications", "Email notifications")}</li>
                </ul>
              </div>
            </div>

            {/* Randomization Options */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <Shuffle size={20} className="text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-700">Randomization Options</h3>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Prevent students from memorizing answer positions or question order across repeated attempts.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <label className="flex items-center gap-3 cursor-pointer bg-gray-50 hover:bg-gray-100 transition rounded-lg p-4 flex-1">
                  <input
                    type="checkbox"
                    checked={randomizeQuestions}
                    onChange={(e) => setRandomizeQuestions(e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-medium text-gray-800">Randomize question order</span>
                    <p className="text-xs text-gray-500 mt-0.5">Questions appear in a different order each session</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer bg-gray-50 hover:bg-gray-100 transition rounded-lg p-4 flex-1">
                  <input
                    type="checkbox"
                    checked={randomizeAnswers}
                    onChange={(e) => setRandomizeAnswers(e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-medium text-gray-800">Randomize answer positions</span>
                    <p className="text-xs text-gray-500 mt-0.5">Answer choices are shuffled for each question</p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
      <AssignQuizModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        quizId={quiz?.id}
        quizTitle={quiz?.title}
        teacherId={session?.host_id}
        onAssignmentCreated={(assignments) => {
          setShowAssignModal(false);
          setAlertModal({
            isOpen: true,
            title: t("assignQuiz.successTitle", "Quiz Assigned"),
            message: t("assignQuiz.successMessage", "Quiz has been assigned to {count} student(s). They will receive email notifications.").replace("{count}", assignments.length),
            type: "success"
          });
          // Close the session and return to manage quizzes after a delay
          setTimeout(() => {
            closeSession(true); // Pass true to skip confirmation
          }, 2000);
        }}
      />
    </>
  );
}
