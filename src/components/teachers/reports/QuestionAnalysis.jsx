import React from "react";
import { useTranslation } from "react-i18next";
import { ChevronUp, ChevronDown, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardBody, Badge } from "../../ui";

export default function QuestionAnalysis({
  questionAnalytics,
  isSurvey,
  expandedQuestion,
  setExpandedQuestion,
}) {
  const { t } = useTranslation();

  if (!questionAnalytics) return null;

  const difficultyVariant = (difficultyKey) => {
    if (difficultyKey === "difficultyEasy") return "success";
    if (difficultyKey === "difficultyMedium") return "warning";
    return "danger";
  };

  return (
    <Card>
      <CardHeader>
        <h3 className="text-base font-semibold text-ink">
          {isSurvey ? t("reports.surveyAnswers") : t("reports.questionPerformance")}
        </h3>
      </CardHeader>
      <CardBody className="space-y-3">
        {questionAnalytics.map((q, idx) => (
          <div key={q.id} className="rounded-xl border border-line bg-surface p-4">
            <button
              type="button"
              aria-expanded={expandedQuestion === idx}
              className="flex w-full items-start justify-between gap-4 text-left"
              onClick={() => setExpandedQuestion(expandedQuestion === idx ? null : idx)}
            >
              <div className="flex-1">
                <div className="mb-2 flex flex-wrap items-baseline gap-2">
                  <span className="text-sm font-semibold text-brand-700">
                    {t("reports.questionLabel")}
                    {idx + 1}:
                  </span>
                  <span className="text-base font-medium text-ink">{q.question_text}</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="text-ink-muted">
                    {t("reports.answeredTimes", { count: q.totalAnswers })}
                  </span>
                  {!isSurvey && (
                    <>
                      <span
                        className={`font-semibold ${
                          q.accuracy > 80
                            ? "text-success-600"
                            : q.accuracy > 50
                              ? "text-amber-700"
                              : "text-danger-600"
                        }`}
                      >
                        {t("reports.accuracy", { percent: q.accuracy })}
                      </span>
                      <Badge variant={difficultyVariant(q.difficultyKey)}>
                        {t(`reports.${q.difficultyKey}`)}
                      </Badge>
                    </>
                  )}
                </div>
              </div>
              <span className="mt-0.5 text-ink-muted">
                {expandedQuestion === idx ? (
                  <ChevronUp size={18} aria-hidden="true" />
                ) : (
                  <ChevronDown size={18} aria-hidden="true" />
                )}
              </span>
            </button>

            {expandedQuestion === idx && (
              <div className="mt-4 border-t border-line pt-4">
                <h4 className="mb-3 text-sm font-semibold text-ink">{t("reports.answerDistribution")}</h4>
                <div className="space-y-2.5">
                  {q.options?.map((opt, optIdx) => {
                    if (!opt.text && !opt.image_url) return null;
                    const count = q.optionCounts[optIdx] || 0;
                    const percentage =
                      q.totalAnswers > 0 ? ((count / q.totalAnswers) * 100).toFixed(1) : 0;

                    const maxCount = Math.max(...Object.values(q.optionCounts || { 0: 0 }));
                    const isMostPopular = count > 0 && count === maxCount;
                    const isHighlighted = isSurvey ? isMostPopular : opt.is_correct;

                    return (
                      <div key={optIdx} className="flex items-center gap-3">
                        <div className="w-32 shrink-0">
                          <Badge
                            variant={
                              isHighlighted ? (isSurvey ? "brand" : "success") : "neutral"
                            }
                            className="w-full justify-center py-1"
                          >
                            {isSurvey
                              ? isMostPopular
                                ? t("reports.mostPopular", "Most Popular")
                                : t("reports.option", { number: optIdx + 1 })
                              : opt.is_correct
                                ? t("reports.correct")
                                : t("reports.option", { number: optIdx + 1 })}
                          </Badge>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 text-sm text-ink">{opt.text}</div>
                          <div className="flex items-center gap-2.5">
                            <div className="h-3 flex-1 overflow-hidden rounded-full bg-surface-muted">
                              <div
                                className={`h-3 rounded-full transition-all ${
                                  isHighlighted
                                    ? isSurvey
                                      ? "bg-brand-600"
                                      : "bg-success-600"
                                    : "bg-brand-500/40"
                                }`}
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                            <span className="w-20 shrink-0 text-right text-xs font-medium text-ink-muted">
                              {count} ({percentage}%)
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {!isSurvey && q.mostCommonWrongAnswer && (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3">
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="mt-0.5 shrink-0 text-danger-600" size={18} aria-hidden="true" />
                      <div>
                        <p className="text-sm font-semibold text-danger-600">
                          {t("reports.mostCommonMistake")}
                        </p>
                        <p className="text-sm text-ink">
                          {t("reports.studentsSelected", {
                            count: q.mostCommonWrongAnswer.count,
                            text: q.mostCommonWrongAnswer.text,
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </CardBody>
    </Card>
  );
}
