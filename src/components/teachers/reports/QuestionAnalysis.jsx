import React from "react";
import { useTranslation } from "react-i18next";
import { ChevronUp, ChevronDown, AlertCircle } from "lucide-react";

export default function QuestionAnalysis({
  questionAnalytics,
  isSurvey,
  expandedQuestion,
  setExpandedQuestion,
}) {
  const { t } = useTranslation();

  if (!questionAnalytics) return null;

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h3 className="text-2xl font-bold mb-4">
        {isSurvey ? t("reports.surveyAnswers") : t("reports.questionPerformance")}
      </h3>
      <div className="space-y-4">
        {questionAnalytics.map((q, idx) => (
          <div key={q.id} className="border rounded-lg p-4">
            <div
              className="flex justify-between items-start cursor-pointer"
              onClick={() => setExpandedQuestion(expandedQuestion === idx ? null : idx)}
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-lg font-semibold">{t("reports.questionLabel")}{idx + 1}:</span>
                  <span className="text-gray-800">{q.question_text}</span>
                </div>
                <div className="flex gap-4 text-sm">
                  <span className="text-gray-600">
                    {t("reports.answeredTimes", { count: q.totalAnswers })}
                  </span>
                  {!isSurvey && (
                    <>
                      <span className={`font-semibold ${q.accuracy > 80 ? 'text-green-600' :
                        q.accuracy > 50 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                        {t("reports.accuracy", { percent: q.accuracy })}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${q.difficultyKey === 'difficultyEasy' ? 'bg-green-100 text-green-800' :
                        q.difficultyKey === 'difficultyMedium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                        {t(`reports.${q.difficultyKey}`)}
                      </span>
                    </>
                  )}
                </div>
              </div>
              {expandedQuestion === idx ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>

            {expandedQuestion === idx && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="font-semibold mb-3">{t("reports.answerDistribution")}</h4>
                <div className="space-y-2">
                  {q.options?.map((opt, optIdx) => {
                    if (!opt.text && !opt.image_url) return null;
                    const count = q.optionCounts[optIdx] || 0;
                    const percentage = q.totalAnswers > 0
                      ? ((count / q.totalAnswers) * 100).toFixed(1)
                      : 0;

                    // Highlight the most popular answer in survey mode
                    const maxCount = Math.max(...Object.values(q.optionCounts || { 0: 0 }));
                    const isMostPopular = count > 0 && count === maxCount;
                    const isHighlighted = isSurvey ? isMostPopular : opt.is_correct;

                    return (
                      <div key={optIdx} className="flex items-center gap-3">
                        <div className={`w-28 px-2 py-1 rounded text-sm font-medium text-center ${
                          isHighlighted
                            ? (isSurvey ? 'bg-blue-100 text-blue-800 border border-blue-300' : 'bg-green-100 text-green-800')
                            : 'bg-gray-100 text-gray-800'
                          }`}>
                          {isSurvey
                            ? (isMostPopular ? t("reports.mostPopular", "Most Popular") : t("reports.option", { number: optIdx + 1 }))
                            : (opt.is_correct ? t("reports.correct") : t("reports.option", { number: optIdx + 1 }))}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm mb-1">{opt.text}</div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-4">
                              <div
                                className={`h-4 rounded-full ${
                                  isHighlighted
                                    ? (isSurvey ? 'bg-blue-500 font-semibold' : 'bg-green-500')
                                    : 'bg-blue-500 opacity-60'
                                  }`}
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium w-16 text-right">
                              {count} ({percentage}%)
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {!isSurvey && q.mostCommonWrongAnswer && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="text-red-600 mt-0.5" size={20} />
                      <div>
                        <p className="text-sm font-semibold text-red-800">{t("reports.mostCommonMistake")}</p>
                        <p className="text-sm text-red-700">
                          {t("reports.studentsSelected", { count: q.mostCommonWrongAnswer.count, text: q.mostCommonWrongAnswer.text })}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
