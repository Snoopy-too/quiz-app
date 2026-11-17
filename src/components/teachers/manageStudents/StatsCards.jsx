import React from "react";
import { UserCheck, CheckCircle, Clock, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardBody } from "../../ui";

export default function StatsCards({ students, pendingStudents }) {
  const { t } = useTranslation();

  const items = [
    {
      label: t("manageStudents.totalStudents"),
      value: students.length,
      icon: UserCheck,
      badgeClass: "bg-brand-50 text-brand-600",
    },
    {
      label: t("manageStudents.approved"),
      value: students.filter((s) => s.approved).length,
      icon: CheckCircle,
      badgeClass: "bg-emerald-50 text-success-600",
    },
    {
      label: t("manageStudents.pendingApproval"),
      value: pendingStudents.length,
      icon: Clock,
      badgeClass: "bg-amber-50 text-amber-700",
    },
    {
      label: t("manageStudents.unverifiedEmail"),
      value: students.filter((s) => !s.verified).length,
      icon: XCircle,
      badgeClass: "bg-red-50 text-danger-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map(({ label, value, icon: IconComponent, badgeClass }) => (
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
