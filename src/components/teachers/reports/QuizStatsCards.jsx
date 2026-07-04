import React from "react";
import { useTranslation } from "react-i18next";
import { BarChart3, Users, Award, Target } from "lucide-react";

export default function QuizStatsCards({ quizStats, isSurvey }) {
  const { t } = useTranslation();

  if (!quizStats) return null;

  return (
    <div className={`grid grid-cols-1 ${isSurvey ? 'md:grid-cols-2' : 'md:grid-cols-4'} gap-4 mb-6`}>
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">{t("reports.totalSessions")}</p>
            <p className="text-3xl font-bold text-blue-600">
              {quizStats.sessions + (quizStats.totalAssignments || 0)}
            </p>
          </div>
          <BarChart3 className="text-blue-600" size={40} />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">{t("reports.totalParticipants")}</p>
            <p className="text-3xl font-bold text-green-600">{quizStats.totalParticipants}</p>
          </div>
          <Users className="text-green-600" size={40} />
        </div>
      </div>

      {!isSurvey && (
        <>
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t("reports.averageScore")}</p>
                <p className="text-3xl font-bold text-blue-700">{quizStats.averageScore}</p>
              </div>
              <Award className="text-blue-700" size={40} />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t("reports.overallAccuracy")}</p>
                <p className="text-3xl font-bold text-orange-600">{quizStats.overallAccuracy}%</p>
              </div>
              <Target className="text-orange-600" size={40} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
