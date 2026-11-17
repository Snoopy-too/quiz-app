import React from "react";
import { ChevronUp, ChevronDown, Users, CheckCircle, Clock, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardBody, Badge, Button, EmptyState } from "../../ui";

export default function StudentTable({
  filteredStudents,
  highlightedIds,
  sortColumn,
  sortDirection,
  handleSort,
  viewStudentDetails,
  handleApprove,
  handleReject,
  handleUnlink,
  handleDelete,
  handleLink,
  currentUserId,
  quizCounts = {},
  filterStatus,
}) {
  const { t } = useTranslation();

  if (filteredStudents.length === 0) {
    return (
      <Card>
        <CardBody>
          <EmptyState
            icon={<Users className="h-6 w-6" aria-hidden="true" />}
            title={t("manageStudents.noStudentsFound")}
          />
        </CardBody>
      </Card>
    );
  }

  const renderSortIcon = (column) => {
    if (sortColumn !== column) return null;
    return sortDirection === "asc" ? (
      <ChevronUp className="h-4 w-4 text-brand-600" aria-hidden="true" />
    ) : (
      <ChevronDown className="h-4 w-4 text-brand-600" aria-hidden="true" />
    );
  };

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-surface-muted/60 text-xs font-semibold uppercase tracking-wider text-ink-muted">
            <tr>
              <th className="px-5 py-3.5 text-left">
                <button
                  type="button"
                  onClick={() => handleSort("name")}
                  className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-wider text-ink-muted hover:text-ink transition-colors"
                >
                  {t("manageStudents.tableHeaderName")}
                  {renderSortIcon("name")}
                </button>
              </th>
              <th className="px-5 py-3.5 text-left">{t("manageStudents.tableHeaderEmail")}</th>
              <th className="px-5 py-3.5 text-left">
                <button
                  type="button"
                  onClick={() => handleSort("studentId")}
                  className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-wider text-ink-muted hover:text-ink transition-colors"
                >
                  {t("manageStudents.tableHeaderStudentId")}
                  {renderSortIcon("studentId")}
                </button>
              </th>
              <th className="px-5 py-3.5 text-left">{t("manageStudents.tableHeaderStatus")}</th>
              <th className="px-5 py-3.5 text-left">
                <button
                  type="button"
                  onClick={() => handleSort("joined")}
                  className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-wider text-ink-muted hover:text-ink transition-colors"
                >
                  {t("manageStudents.tableHeaderJoined")}
                  {renderSortIcon("joined")}
                </button>
              </th>
              {filterStatus !== "unlinked" && (
                <th className="px-5 py-3.5 text-left">
                  <button
                    type="button"
                    onClick={() => handleSort("quizzesTaken")}
                    className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-wider text-ink-muted hover:text-ink transition-colors"
                  >
                    {t("manageStudents.tableHeaderQuizzesTaken")}
                    {renderSortIcon("quizzesTaken")}
                  </button>
                </th>
              )}
              <th className="px-5 py-3.5 text-right">{t("manageStudents.tableHeaderActions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filteredStudents.map((student) => (
              <tr
                key={student.id}
                className={`transition-colors hover:bg-surface-muted/40 ${
                  highlightedIds.has(student.id) ? "bg-brand-50/60 student-glow" : ""
                }`}
              >
                <td className="px-5 py-4 font-semibold text-ink">{student.name}</td>
                <td className="px-5 py-4 text-ink-muted">{student.email}</td>
                <td className="px-5 py-4 font-mono text-ink-muted">{student.student_id || "-"}</td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap gap-1.5">
                    {student.approved ? (
                      <Badge variant="success">
                        <CheckCircle className="h-3 w-3" aria-hidden="true" />
                        {t("manageStudents.statusApproved")}
                      </Badge>
                    ) : (
                      <Badge variant="warning">
                        <Clock className="h-3 w-3" aria-hidden="true" />
                        {t("manageStudents.statusPending")}
                      </Badge>
                    )}
                    {!student.verified && (
                      <Badge variant="danger">
                        <XCircle className="h-3 w-3" aria-hidden="true" />
                        {t("manageStudents.statusUnverified")}
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="px-5 py-4 text-ink-muted">
                  {new Date(student.created_at).toLocaleDateString()}
                </td>
                {filterStatus !== "unlinked" && (
                  <td className="px-5 py-4 text-center font-medium text-ink">
                    {quizCounts[student.id] || 0}
                  </td>
                )}
                <td className="px-5 py-4">
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => viewStudentDetails(student)}
                    >
                      {t("manageStudents.actionView")}
                    </Button>

                    {student.teacher_id === currentUserId && (
                      <>
                        {!student.approved ? (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleApprove(student.id)}
                          >
                            {t("manageStudents.actionApprove")}
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReject(student.id)}
                          >
                            {t("manageStudents.actionRevoke")}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnlink(student)}
                        >
                          {t("manageStudents.actionUnlink")}
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(student.id)}
                        >
                          {t("manageStudents.actionDelete")}
                        </Button>
                      </>
                    )}

                    {student.teacher_id === null && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleLink(student)}
                      >
                        {t("manageStudents.actionLink")}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
