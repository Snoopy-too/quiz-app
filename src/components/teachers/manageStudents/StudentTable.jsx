import React, { useRef } from "react";
import { ChevronUp, ChevronDown, Users, CheckCircle, Clock, XCircle, Unlink, Link2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardBody, Badge, Button, EmptyState } from "../../ui";

const EMPTY_SET = new Set();
const DEFAULT_SELECTION_STATE = {
  allVisibleSelected: false,
  someVisibleSelected: false,
  visibleSelectedCount: 0,
  totalSelectedCount: 0,
};

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
  selectedStudentIds = EMPTY_SET,
  selectionState = DEFAULT_SELECTION_STATE,
  onToggleSelectStudent,
  onToggleSelectAll,
  onClearSelection,
  onBulkUnlink,
  onBulkLink,
  isBulkProcessing = false,
}) {
  const { t } = useTranslation();
  const shiftKeyPressedRef = useRef(false);

  const isUnlinkedTab = filterStatus === "unlinked";
  const hasSelectionSupport = Boolean(onToggleSelectStudent && onToggleSelectAll);
  const selectedCount = selectionState.totalSelectedCount;

  const renderBulkActionBar = () => {
    if (!hasSelectionSupport || selectedCount === 0) return null;

    return (
      <div
        role="region"
        aria-label={t("manageStudents.bulkActionsLabel")}
        className="flex flex-col gap-3 rounded-xl border border-brand-200 bg-brand-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-2.5 text-sm font-medium text-brand-900">
          <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-brand-600 px-2 text-xs font-semibold text-white">
            {selectedCount}
          </span>
          <span>
            {selectedCount === 1
              ? t("manageStudents.selectedCountOne")
              : t("manageStudents.selectedCount", { count: selectedCount })}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onClearSelection}
            disabled={isBulkProcessing}
          >
            {t("manageStudents.clearSelection")}
          </Button>
          {isUnlinkedTab ? (
            <Button
              variant="primary"
              size="sm"
              onClick={onBulkLink}
              loading={isBulkProcessing}
            >
              <Link2 className="h-4 w-4" aria-hidden="true" />
              {t("manageStudents.linkSelected", { count: selectedCount })}
            </Button>
          ) : (
            <Button
              variant="danger"
              size="sm"
              onClick={onBulkUnlink}
              loading={isBulkProcessing}
            >
              <Unlink className="h-4 w-4" aria-hidden="true" />
              {t("manageStudents.unlinkSelected", { count: selectedCount })}
            </Button>
          )}
        </div>
      </div>
    );
  };

  if (filteredStudents.length === 0) {
    return (
      <div className="space-y-3">
        {renderBulkActionBar()}
        <Card>
          <CardBody>
            <EmptyState
              icon={<Users className="h-6 w-6" aria-hidden="true" />}
              title={t("manageStudents.noStudentsFound")}
            />
          </CardBody>
        </Card>
      </div>
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
    <div className="space-y-3">
      {renderBulkActionBar()}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-surface-muted/60 text-xs font-semibold uppercase tracking-wider text-ink-muted">
              <tr>
                {hasSelectionSupport && (
                  <th className="w-12 px-4 py-3.5 text-left">
                    <input
                      type="checkbox"
                      aria-label={t("manageStudents.selectAllStudents")}
                      checked={selectionState.allVisibleSelected}
                      ref={(el) => {
                        if (el) {
                          el.indeterminate = selectionState.someVisibleSelected;
                        }
                      }}
                      onChange={onToggleSelectAll}
                      disabled={isBulkProcessing}
                      className="h-4 w-4 cursor-pointer rounded border-line text-brand-600 focus:ring-2 focus:ring-accent-500"
                    />
                  </th>
                )}
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
                {!isUnlinkedTab && (
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
              {filteredStudents.map((student) => {
                const isSelected = selectedStudentIds.has(student.id);
                const isSelectable = isUnlinkedTab
                  ? student.teacher_id === null
                  : student.teacher_id === currentUserId;

                return (
                  <tr
                    key={student.id}
                    className={`transition-colors hover:bg-surface-muted/40 ${
                      isSelected ? "bg-brand-50/50" : ""
                    } ${
                      highlightedIds.has(student.id) ? "bg-brand-50/60 student-glow" : ""
                    }`}
                  >
                    {hasSelectionSupport && (
                      <td className="px-4 py-4">
                        {isSelectable && (
                          <input
                            type="checkbox"
                            aria-label={t("manageStudents.selectStudent", {
                              name: student.name || student.email || student.id,
                            })}
                            checked={isSelected}
                            disabled={isBulkProcessing}
                            onClick={(e) => {
                              shiftKeyPressedRef.current = e.shiftKey;
                            }}
                            onChange={() => {
                              const shiftKey = shiftKeyPressedRef.current;
                              shiftKeyPressedRef.current = false;
                              onToggleSelectStudent(student.id, { shiftKey });
                            }}
                            className="h-4 w-4 cursor-pointer rounded border-line text-brand-600 focus:ring-2 focus:ring-accent-500"
                          />
                        )}
                      </td>
                    )}
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
                    {!isUnlinkedTab && (
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
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
