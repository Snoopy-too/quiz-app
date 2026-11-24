import React from "react";
import { UserPlus, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageHeader, Card, CardBody, Button, Skeleton } from "../ui";
import AlertModal from "../common/AlertModal";
import ConfirmModal from "../common/ConfirmModal";
import useManageStudents from "../../hooks/useManageStudents";
import StatsCards from "./manageStudents/StatsCards";
import SearchFilter from "./manageStudents/SearchFilter";
import StudentTable from "./manageStudents/StudentTable";
import CreateStudentModal from "./manageStudents/CreateStudentModal";
import StudentDetailsModal from "./manageStudents/StudentDetailsModal";

export default function ManageStudents({ setView, appState }) {
  const { t } = useTranslation();
  const ms = useManageStudents(appState);

  if (ms.loading) {
    return (
      <div className="min-h-screen bg-canvas">
        <PageHeader
          title={t("manageStudents.title")}
          description={t("teacher.manageStudentsDescription")}
        />
        <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <Card key={idx}>
                <CardBody className="space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                </CardBody>
              </Card>
            ))}
          </div>
          <Card>
            <CardBody className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-48 w-full" />
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  if (ms.error) {
    return (
      <div className="min-h-screen bg-canvas">
        <PageHeader
          title={t("manageStudents.title")}
          description={t("teacher.manageStudentsDescription")}
        />
        <div className="mx-auto max-w-7xl p-4 sm:p-6">
          <Card className="border-danger-600/40">
            <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 text-danger-600">
                <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
                <p className="text-sm font-medium">
                  {t("manageStudents.errorTitle")}: {ms.error}
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setView("teacher-dashboard")}>
                {t("manageStudents.backToDashboard")}
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      <PageHeader
        title={t("manageStudents.title")}
        description={t("teacher.manageStudentsDescription")}
        actions={
          <Button
            variant="primary"
            onClick={() => {
              ms.resetCreateStudentState();
              ms.setShowCreateModal(true);
            }}
          >
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            {t("manageStudents.createStudentButton")}
          </Button>
        }
      />

      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        {/* Info Banner */}
        <div className="rounded-xl border border-brand-200 bg-brand-50/60 px-4 py-3 text-sm text-brand-800">
          <strong className="font-semibold">{t("common.note")}:</strong>{" "}
          {t("manageStudents.teacherCodeNote")}
        </div>

        <StatsCards
          students={ms.filterStatus === "unlinked" ? ms.unlinkedStudents : ms.myStudents}
          pendingStudents={ms.pendingStudents}
        />

        <SearchFilter
          searchTerm={ms.searchTerm}
          setSearchTerm={ms.setSearchTerm}
          filterStatus={ms.filterStatus}
          setFilterStatus={ms.setFilterStatus}
        />

        <StudentTable
          filteredStudents={ms.filteredStudents}
          highlightedIds={ms.highlightedIds}
          sortColumn={ms.sortColumn}
          sortDirection={ms.sortDirection}
          handleSort={ms.handleSort}
          viewStudentDetails={ms.viewStudentDetails}
          handleApprove={ms.handleApprove}
          handleReject={ms.handleReject}
          handleUnlink={ms.handleUnlink}
          handleDelete={ms.handleDelete}
          handleLink={ms.handleLink}
          currentUserId={appState.currentUser.id}
          quizCounts={ms.quizCounts}
          filterStatus={ms.filterStatus}
          selectedStudentIds={ms.selectedStudentIds}
          selectionState={ms.selectionState}
          onToggleSelectStudent={ms.toggleSelectStudent}
          onToggleSelectAll={ms.toggleSelectAllVisible}
          onClearSelection={ms.clearStudentSelection}
          onBulkUnlink={ms.handleBulkUnlink}
          onBulkLink={ms.handleBulkLink}
          isBulkProcessing={ms.isBulkProcessing}
        />
      </div>

      <CreateStudentModal
        showCreateModal={ms.showCreateModal}
        closeCreateStudentModal={ms.closeCreateStudentModal}
        handleCreateStudent={ms.handleCreateStudent}
        newStudentForm={ms.newStudentForm}
        setNewStudentForm={ms.setNewStudentForm}
        creatingStudent={ms.creatingStudent}
        createStudentError={ms.createStudentError}
        createStudentSuccess={ms.createStudentSuccess}
        resetCreateStudentState={ms.resetCreateStudentState}
      />

      <StudentDetailsModal
        showDetails={ms.showDetails}
        setShowDetails={ms.setShowDetails}
        selectedStudent={ms.selectedStudent}
        isEditing={ms.isEditing}
        setIsEditing={ms.setIsEditing}
        editForm={ms.editForm}
        setEditForm={ms.setEditForm}
        handleUpdateStudent={ms.handleUpdateStudent}
        updatingStudent={ms.updatingStudent}
        handleApprove={ms.handleApprove}
        handleReject={ms.handleReject}
        handleDelete={ms.handleDelete}
        currentUserId={appState.currentUser.id}
      />

      <AlertModal
        isOpen={ms.alertModal.isOpen}
        title={ms.alertModal.title}
        message={ms.alertModal.message}
        type={ms.alertModal.type}
        onClose={() => ms.setAlertModal(prev => ({ ...prev, isOpen: false }))}
      />
      <ConfirmModal
        isOpen={ms.confirmModal.isOpen}
        title={ms.confirmModal.title}
        message={ms.confirmModal.message}
        confirmText={ms.confirmModal.confirmText || undefined}
        onConfirm={ms.confirmModal.onConfirm}
        onCancel={() => ms.setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        confirmStyle={ms.confirmModal.confirmStyle || "danger"}
      />
    </div>
  );
}
