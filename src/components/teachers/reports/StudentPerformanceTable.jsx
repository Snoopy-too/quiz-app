import React from "react";
import { useTranslation } from "react-i18next";
import { ChevronUp, ChevronDown } from "lucide-react";
import { Card } from "../../ui";

export default function StudentPerformanceTable({
  sortedStudentPerformance,
  studentSortConfig,
  handleStudentSort,
  setView,
}) {
  const { t } = useTranslation();

  const renderSortIcon = (key) => {
    if (studentSortConfig.key !== key) return null;
    return studentSortConfig.direction === "asc" ? (
      <ChevronUp className="h-4 w-4 text-brand-600" aria-hidden="true" />
    ) : (
      <ChevronDown className="h-4 w-4 text-brand-600" aria-hidden="true" />
    );
  };

  const accuracyColor = (val) => {
    const num = parseFloat(val);
    if (num > 80) return "text-success-600";
    if (num > 50) return "text-amber-700";
    return "text-danger-600";
  };

  const columns = [
    { key: "student", label: t("reports.student") },
    { key: "studentId", label: t("reports.studentId") },
    { key: "quizzesParticipated", label: t("reports.quizzesParticipated") },
    { key: "averageAccuracy", label: t("reports.overallAccuracy") },
    { key: "courseAccuracy", label: t("reports.courseAccuracy") },
    { key: "nonCourseAccuracy", label: t("reports.nonCourseAccuracy") },
  ];

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-surface-muted/60 text-xs font-semibold uppercase tracking-wider text-ink-muted">
            <tr>
              {columns.map(({ key, label }) => (
                <th key={key} className="px-5 py-3.5 text-left">
                  <button
                    type="button"
                    onClick={() => handleStudentSort(key)}
                    className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-wider text-ink-muted transition-colors hover:text-ink"
                  >
                    {label}
                    {renderSortIcon(key)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {sortedStudentPerformance.map((student) => (
              <tr key={student.student_id} className="transition-colors hover:bg-surface-muted/40">
                <td className="px-5 py-4">
                  <button
                    type="button"
                    onClick={() => setView("student-report", { studentId: student.student_id })}
                    className="text-left font-semibold text-ink transition-colors hover:text-brand-600"
                  >
                    {student.name}
                  </button>
                </td>
                <td className="px-5 py-4 font-mono text-ink-muted">{student.studentIdNo || "-"}</td>
                <td className="px-5 py-4 text-ink-muted">{student.quizzesParticipated}</td>
                <td className="px-5 py-4">
                  <span className={`font-semibold ${accuracyColor(student.averageAccuracy)}`}>
                    {student.averageAccuracy}%
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span className={`font-semibold ${accuracyColor(student.courseAccuracy)}`}>
                    {student.courseAccuracy}%
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span className={`font-semibold ${accuracyColor(student.nonCourseAccuracy)}`}>
                    {student.nonCourseAccuracy}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
