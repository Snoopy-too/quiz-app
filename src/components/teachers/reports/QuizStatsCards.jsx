import React from "react";
import { useTranslation } from "react-i18next";
import { BarChart3, Users, Award, Target } from "lucide-react";
import { Card, CardBody } from "../../ui";

export default function QuizStatsCards({ quizStats, isSurvey }) {
  const { t } = useTranslation();

  if (!quizStats) return null;

  const cards = [
    {
      label: t("reports.totalSessions"),
      value: quizStats.sessions + (quizStats.totalAssignments || 0),
      icon: BarChart3,
      badgeClass: "bg-brand-50 text-brand-600",
    },
    {
      label: t("reports.totalParticipants"),
      value: quizStats.totalParticipants,
      icon: Users,
      badgeClass: "bg-emerald-50 text-success-600",
    },
    ...(!isSurvey
      ? [
          {
            label: t("reports.averageScore"),
            value: quizStats.averageScore,
            icon: Award,
            badgeClass: "bg-brand-50 text-brand-600",
          },
          {
            label: t("reports.overallAccuracy"),
            value: `${quizStats.overallAccuracy}%`,
            icon: Target,
            badgeClass: "bg-amber-50 text-amber-700",
          },
        ]
      : []),
  ];

  return (
    <div className={`grid grid-cols-1 gap-4 ${isSurvey ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-4"}`}>
      {cards.map(({ label, value, icon: IconComponent, badgeClass }) => (
        <Card key={label}>
          <CardBody className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-ink-muted">{label}</p>
              <p className="mt-1 text-3xl font-bold text-ink">{value}</p>
            </div>
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${badgeClass}`}>
              <IconComponent className="h-5 w-5" aria-hidden="true" />
            </span>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
