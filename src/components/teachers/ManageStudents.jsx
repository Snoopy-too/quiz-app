import React from "react";
import { UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import VerticalNav from "../layout/VerticalNav";
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
      <div className="flex min-h-screen bg-gray-50">
        <VerticalNav currentView="manage-students" setView={setView} appState={appState} />
        <div className="flex-1 ml-64 flex items-center justify-center">
          <p className="text-xl text-gray-600">{t("manageStudents.loadingStudents")}</p>
        </div>
      </div>
    );
  }

  if (ms.error) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <VerticalNav currentView="manage-students" setView={setView} appState={appState} />
        <div className="flex-1 ml-64 flex items-center justify-center">
          <div className="text-center">
            <p className="text-xl text-red-600 mb-4">{t("manageStudents.errorTitle")}: {ms.error}</p>
            <button
              onClick={() => setView("teacher-dashboard")}
              className="bg-blue-700 text-white px-6 py-3 rounded-lg hover:bg-blue-800"
            >
              {t("manageStudents.backToDashboard")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Vertical Navigation */}
      <VerticalNav currentView="manage-students" setView={setView} appState={appState} />

      {/* Main Content */}
      <div className="flex-1 ml-64">
        <nav className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 relative z-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <h1 className="text-2xl font-bold text-green-600">{t("manageStudents.title")}</h1>
            <button
              onClick={() => {
                ms.resetCreateStudentState();
                ms.setShowCreateModal(true);
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition self-start md:self-auto"
            >
              <UserPlus size={18} />
              {t("manageStudents.createStudentButton")}
            </button>
          </div>
        </nav>

        <div className="container mx-auto p-6 relative z-0">
          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              <strong>{t("common.note")}:</strong> {t("manageStudents.teacherCodeNote")}
            </p>
          </div>

          <StatsCards students={ms.students} pendingStudents={ms.pendingStudents} />

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
          />
        </div>
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
        onConfirm={ms.confirmModal.onConfirm}
        onCancel={() => ms.setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        confirmStyle="danger"
      />
    </div>
  );
}
