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
  teamScoringMode,
  setTeamScoringMode,
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
          className="flex items-center gap-1.5 px-4 py-2 border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 hover:border-red-300 rounded-xl transition font-medium shadow-sm hover:shadow text-sm"
        >
          <X size={16} />
          <span>{t("common.cancel")}</span>
        </button>
      </nav>

      <div className="flex-1">
        <div className="container mx-auto p-6 flex flex-col items-center justify-center min-h-[80vh]">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 sm:p-12 text-center max-w-6xl w-full">
            <h2 className="text-4xl font-bold mb-4">Select Quiz Mode</h2>
            <p className="text-gray-600 mb-8">Choose how you want students to participate</p>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {/* Classic Mode */}
              <button
                type="button"
                onClick={() => selectMode("classic")}
                className="text-left border-2 border-gray-300 rounded-xl p-6 sm:p-8 hover:border-blue-700 hover:shadow-lg transition cursor-pointer group bg-white flex flex-col justify-between"
              >
                <div>
                  <div className="text-6xl mb-4">🎯</div>
                  <h3 className="text-2xl font-bold mb-3 group-hover:text-blue-700">Classic Mode</h3>
                  <p className="text-gray-600 mb-4 text-sm">
                    Students join individually using the PIN and compete on their own.
                  </p>
                </div>
                <ul className="text-left text-sm text-gray-600 space-y-2">
                  <li>✓ Individual scores</li>
                  <li>✓ Personal leaderboard</li>
                  <li>✓ Quick setup</li>
                </ul>
              </button>

              {/* Defuse Mode */}
              <button
                type="button"
                onClick={() => selectMode("defuse")}
                className="text-left border-2 border-gray-300 rounded-xl p-6 sm:p-8 hover:border-red-600 hover:shadow-lg transition cursor-pointer group bg-white flex flex-col justify-between relative overflow-hidden"
              >
                <div>
                  <div className="text-6xl mb-4">💣</div>
                  <h3 className="text-2xl font-bold mb-3 group-hover:text-red-600">Defuse Mode</h3>
                  <p className="text-gray-600 mb-4 text-sm">
                    Race against a ticking bomb! One shared timer for the entire quiz with incorrect answer penalties.
                  </p>
                </div>
                <ul className="text-left text-sm text-gray-600 space-y-2">
                  <li>✓ Whole-quiz bomb clock</li>
                  <li>✓ Incorrect answer penalties</li>
                  <li>✓ Defuse or explode together</li>
                </ul>
              </button>

              {/* Team Mode */}
              <div
                className="border-2 border-gray-300 rounded-xl p-6 sm:p-8 hover:border-blue-600 hover:shadow-lg transition group bg-white flex flex-col justify-between"
              >
                <div>
                  <div className="text-6xl mb-4">👥</div>
                  <h3 className="text-2xl font-bold mb-3 group-hover:text-blue-600">Team Mode</h3>
                  <p className="text-gray-600 mb-4 text-sm">
                    Students form teams with custom names and compete together.
                  </p>
                  <ul className="text-left text-sm text-gray-600 space-y-2">
                    <li>✓ Team collaboration</li>
                    <li>✓ Custom team names</li>
                    <li>✓ Combined scores</li>
                  </ul>
                </div>

                <div>
                  {/* Shared Device Toggle */}
                  <label
                    htmlFor="allow-shared-device"
                    className={`mt-4 flex cursor-pointer items-center gap-2.5 rounded-lg border p-2.5 text-left transition ${
                      allowSharedDevice
                        ? "border-blue-600 bg-blue-50/70 text-blue-900"
                        : "border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300 hover:bg-gray-100/70"
                    }`}
                  >
                    <input
                      id="allow-shared-device"
                      type="checkbox"
                      checked={allowSharedDevice}
                      onChange={(e) => setAllowSharedDevice(e.target.checked)}
                      className="h-4 w-4 shrink-0 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs font-medium">Allow shared device teams</span>
                  </label>

                  {/* Team Scoring Mode Selector */}
                  <div
                    className="mt-3 pt-3 border-t border-gray-200"
                  >
                    <p className="text-xs font-medium text-gray-700 mb-1.5 text-left">Team Scoring</p>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setTeamScoringMode('combined')}
                        className={`flex-1 py-1.5 px-2 text-[11px] font-semibold rounded-lg border-2 transition ${
                          teamScoringMode === 'combined'
                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                            : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        Combined
                        <span className="block text-[9px] font-normal mt-0.5 opacity-70">Sum</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTeamScoringMode('average')}
                        className={`flex-1 py-1.5 px-2 text-[11px] font-semibold rounded-lg border-2 transition ${
                          teamScoringMode === 'average'
                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                            : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        Average
                        <span className="block text-[9px] font-normal mt-0.5 opacity-70">Mean</span>
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => selectMode("team")}
                    className="w-full mt-3 bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 font-semibold transition text-sm"
                  >
                    Start Team Mode
                  </button>
                </div>
              </div>

              {/* Assign Quiz Mode */}
              <button
                type="button"
                onClick={() => setShowAssignModal(true)}
                className="text-left border-2 border-gray-300 rounded-xl p-6 sm:p-8 hover:border-orange-600 hover:shadow-lg transition cursor-pointer group bg-white flex flex-col justify-between"
              >
                <div>
                  <div className="text-6xl mb-4">📋</div>
                  <h3 className="text-2xl font-bold mb-3 group-hover:text-orange-600">{t("teacherControl.assignQuiz", "Assign Quiz")}</h3>
                  <p className="text-gray-600 mb-4 text-sm">
                    {t("teacherControl.assignQuizDescription", "Assign this quiz to specific students with a deadline.")}
                  </p>
                </div>
                <ul className="text-left text-sm text-gray-600 space-y-2">
                  <li>✓ {t("teacherControl.forAbsentStudents", "For absent students")}</li>
                  <li>✓ {t("teacherControl.setDeadline", "Set deadline")}</li>
                  <li>✓ {t("teacherControl.emailNotifications", "Email notifications")}</li>
                </ul>
              </button>
            </div>

            {/* Randomization Options */}
            <div className="mt-8 border-t border-gray-200 pt-6 text-left">
              <div className="mb-1 flex items-center gap-2">
                <Shuffle size={18} className="text-gray-600" aria-hidden="true" />
                <h3 className="text-base font-semibold text-gray-800">Randomization Options</h3>
              </div>
              <p className="mb-4 text-sm text-gray-500">
                Prevent students from memorizing answer positions or question order across repeated attempts.
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label
                  htmlFor="randomize-questions"
                  className={`flex cursor-pointer items-start gap-3.5 rounded-xl border-2 p-4 text-left transition-all ${
                    randomizeQuestions
                      ? "border-blue-600 bg-blue-50/70 shadow-sm"
                      : "border-gray-200 bg-gray-50/80 hover:border-gray-300 hover:bg-gray-100/80"
                  }`}
                >
                  <input
                    id="randomize-questions"
                    type="checkbox"
                    checked={randomizeQuestions}
                    onChange={(e) => setRandomizeQuestions(e.target.checked)}
                    className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="block min-w-0 flex-1 text-sm font-semibold text-gray-900">
                    Randomize question order
                    <span className="mt-0.5 block text-xs font-normal text-gray-600">
                      Questions appear in a different order each session
                    </span>
                  </span>
                </label>

                <label
                  htmlFor="randomize-answers"
                  className={`flex cursor-pointer items-start gap-3.5 rounded-xl border-2 p-4 text-left transition-all ${
                    randomizeAnswers
                      ? "border-blue-600 bg-blue-50/70 shadow-sm"
                      : "border-gray-200 bg-gray-50/80 hover:border-gray-300 hover:bg-gray-100/80"
                  }`}
                >
                  <input
                    id="randomize-answers"
                    type="checkbox"
                    checked={randomizeAnswers}
                    onChange={(e) => setRandomizeAnswers(e.target.checked)}
                    className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="block min-w-0 flex-1 text-sm font-semibold text-gray-900">
                    Randomize answer positions
                    <span className="mt-0.5 block text-xs font-normal text-gray-600">
                      Answer choices are shuffled for each question
                    </span>
                  </span>
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
            message: t("assignQuiz.successMessage", { count: assignments.length, defaultValue: "Quiz has been assigned to {{count}} student(s). They will receive email notifications." }),
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
