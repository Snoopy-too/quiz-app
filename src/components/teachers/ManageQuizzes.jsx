import React from "react";
import { useTranslation } from "react-i18next";
import { Plus, Archive, FolderOpen, FolderPlus, Search, X, AlertCircle } from "lucide-react";
import { PageHeader, Button, Card, CardBody, EmptyState, Skeleton } from "../ui";
import AlertModal from "../common/AlertModal";
import ConfirmModal from "../common/ConfirmModal";
import AssignQuizModal from "./AssignQuizModal";
import QuizAssignmentsModal from "./QuizAssignmentsModal";
import useManageQuizzes from "../../hooks/useManageQuizzes";
import QuizCard from "./manageQuizzes/QuizCard";
import FolderTree from "./manageQuizzes/FolderTree";
import QuizToolbar from "./manageQuizzes/QuizToolbar";
import NewFolderModal from "./manageQuizzes/NewFolderModal";
import MoveQuizModal from "./manageQuizzes/MoveQuizModal";

export default function ManageQuizzes({ setView, appState }) {
  const { t } = useTranslation();
  const mq = useManageQuizzes(appState);

  // Wrapper that binds setView into the hook's callback
  const handleStartQuiz = (quizId) => {
    mq.handleStartQuiz(quizId, (sessionId) => {
      setView("teacher-control", sessionId);
    });
  };

  const countDescription = t("manager.quizzesAndFolders", {
    quizCount: mq.quizzes.length,
    quizText: mq.quizzes.length !== 1 ? t("quiz.quizzes") : t("quiz.quiz"),
    folderCount: mq.folders.length,
    folderText: mq.folders.length !== 1 ? t("folder.folders") : t("folder.folder"),
  });

  return (
    <div className="flex h-[calc(100vh-3.5rem)] md:h-screen flex-col overflow-hidden bg-canvas">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <PageHeader
          title={t("manager.quizManager")}
          description={countDescription}
          actions={
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  mq.setSelectedParentFolder(null);
                  mq.setShowNewFolderModal(true);
                }}
              >
                <FolderPlus className="h-4 w-4" aria-hidden="true" />
                {t("folder.newFolder")}
              </Button>
              <Button variant="primary" onClick={() => setView("create-quiz")}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                {t("nav.createQuiz")}
              </Button>
            </>
          }
        />

        {/* Main Content Area */}
        <div className="flex flex-1 overflow-hidden">
          {mq.loading && (
            <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
              <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <Card key={idx}>
                    <Skeleton className="h-28 w-full rounded-none rounded-t-xl" />
                    <CardBody className="space-y-3">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-9 w-full" />
                    </CardBody>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {mq.error && (
            <div className="flex-1 px-4 py-5 sm:px-6">
              <div className="mx-auto max-w-7xl">
                <Card className="border-danger-600/40">
                  <CardBody className="flex items-center gap-3 text-danger-600">
                    <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
                    <p className="text-sm font-medium">
                      {t("common.error")}: {mq.error}
                    </p>
                  </CardBody>
                </Card>
              </div>
            </div>
          )}

          {!mq.loading && !mq.error && mq.quizzes.length === 0 && mq.folders.length === 0 && (
            <div className="flex flex-1 items-center justify-center p-6">
              <EmptyState
                className="w-full max-w-md"
                icon={<Plus className="h-6 w-6" aria-hidden="true" />}
                title={t("quiz.noQuizzes")}
                description={t("manager.getStarted")}
                primaryAction={{
                  label: t("manager.createYourFirstQuiz"),
                  onClick: () => setView("create-quiz"),
                }}
              />
            </div>
          )}

          {!mq.loading && !mq.error && (mq.folders.length > 0 || mq.quizzes.length > 0) && (
            <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 gap-6 overflow-hidden px-4 py-5 sm:px-6">
              {/* Mobile Folder Panel Overlay */}
              {mq.mobileFolderPanelOpen && (
                <>
                  <div
                    role="presentation"
                    className="fixed inset-0 z-40 bg-black/50 md:hidden"
                    onClick={() => mq.setMobileFolderPanelOpen(false)}
                  />
                  <div
                    className="fixed bottom-0 left-0 top-0 z-50 w-72 overflow-y-auto border-r border-line bg-surface shadow-pop md:hidden"
                    style={{ animation: "slideInLeft 0.3s ease-out" }}
                  >
                    <div className="p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <h2 className="px-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                          {t("folder.folders")}
                        </h2>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            aria-label={t("folder.newFolder")}
                            title={t("folder.newFolder")}
                            onClick={() => {
                              mq.setSelectedParentFolder(null);
                              mq.setShowNewFolderModal(true);
                            }}
                            className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-surface-muted hover:text-brand-700"
                          >
                            <FolderPlus className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            aria-label={t("common.close")}
                            onClick={() => mq.setMobileFolderPanelOpen(false)}
                            className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
                          >
                            <X className="h-5 w-5" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        {/* All Quizzes */}
                        <button
                          type="button"
                          onClick={() => {
                            mq.setActiveFolder(null);
                            mq.setMobileFolderPanelOpen(false);
                          }}
                          className={`group flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors ${
                            mq.activeFolder === null
                              ? "bg-brand-50 font-medium text-brand-700"
                              : "text-ink-muted hover:bg-surface-muted hover:text-ink"
                          }`}
                        >
                          <Archive
                            size={18}
                            className={mq.activeFolder === null ? "text-brand-600" : "text-ink-subtle"}
                            aria-hidden="true"
                          />
                          <span className="flex-1 truncate text-sm">{t("folder.allQuizzes")}</span>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                              mq.activeFolder === null
                                ? "bg-brand-100 text-brand-800"
                                : "border border-line bg-surface-muted text-ink-muted"
                            }`}
                          >
                            {mq.quizzes.length}
                          </span>
                        </button>

                        {/* Unfiled Quizzes */}
                        <button
                          type="button"
                          onClick={() => {
                            mq.setActiveFolder("unfiled");
                            mq.setMobileFolderPanelOpen(false);
                          }}
                          className={`group flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors ${
                            mq.activeFolder === "unfiled"
                              ? "bg-brand-50 font-medium text-brand-700"
                              : "text-ink-muted hover:bg-surface-muted hover:text-ink"
                          }`}
                        >
                          <FolderOpen
                            size={18}
                            className={mq.activeFolder === "unfiled" ? "text-brand-600" : "text-ink-subtle"}
                            aria-hidden="true"
                          />
                          <span className="flex-1 truncate text-sm">{t("folder.unfiledQuizzes")}</span>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                              mq.activeFolder === "unfiled"
                                ? "bg-brand-100 text-brand-800"
                                : "border border-line bg-surface-muted text-ink-muted"
                            }`}
                          >
                            {mq.getQuizzesWithoutFolder().length}
                          </span>
                        </button>

                        {/* Folder Tree */}
                        <div className="mt-2 space-y-0.5 border-t border-line pt-2">
                          <FolderTree
                            expandedFolders={mq.expandedFolders}
                            activeFolder={mq.activeFolder}
                            editingFolder={mq.editingFolder}
                            draggedItem={mq.draggedItem}
                            toggleFolder={mq.toggleFolder}
                            setActiveFolder={(folderId) => {
                              mq.setActiveFolder(folderId);
                              mq.setMobileFolderPanelOpen(false);
                            }}
                            setEditingFolder={mq.setEditingFolder}
                            renameFolder={mq.renameFolder}
                            deleteFolder={mq.deleteFolder}
                            setSelectedParentFolder={mq.setSelectedParentFolder}
                            setShowNewFolderModal={mq.setShowNewFolderModal}
                            handleDragStart={mq.handleDragStart}
                            handleDragOver={mq.handleDragOver}
                            handleDrop={mq.handleDrop}
                            buildFolderTree={mq.buildFolderTree}
                            getQuizzesInFolder={mq.getQuizzesInFolder}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Left Card Sidebar: Folder Tree - Hidden on mobile */}
              <aside className="hidden shrink-0 flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card md:flex md:w-64 lg:w-72">
                <div className="flex items-center justify-between border-b border-line px-4 py-3">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    {t("folder.folders")}
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      mq.setSelectedParentFolder(null);
                      mq.setShowNewFolderModal(true);
                    }}
                    className="rounded-lg p-1 text-ink-muted transition-colors hover:bg-surface-muted hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                    title={t("folder.newFolder")}
                    aria-label={t("folder.newFolder")}
                  >
                    <FolderPlus className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>

                <div className="flex-1 space-y-1 overflow-y-auto p-3">
                  {/* All Quizzes */}
                  <button
                    type="button"
                    onClick={() => mq.setActiveFolder(null)}
                    className={`group flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors ${
                      mq.activeFolder === null
                        ? "bg-brand-50 font-medium text-brand-700"
                        : "text-ink-muted hover:bg-surface-muted hover:text-ink"
                    }`}
                  >
                    <Archive
                      size={18}
                      className={mq.activeFolder === null ? "text-brand-600" : "text-ink-subtle"}
                      aria-hidden="true"
                    />
                    <span className="flex-1 truncate text-sm">{t("folder.allQuizzes")}</span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                        mq.activeFolder === null
                          ? "bg-brand-100 text-brand-800"
                          : "border border-line bg-surface-muted text-ink-muted"
                      }`}
                    >
                      {mq.quizzes.length}
                    </span>
                  </button>

                  {/* Unfiled Quizzes */}
                  <button
                    type="button"
                    onClick={() => mq.setActiveFolder("unfiled")}
                    onDragOver={mq.handleDragOver}
                    onDrop={(e) => mq.handleDrop(e, null)}
                    className={`group flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors ${
                      mq.activeFolder === "unfiled"
                        ? "bg-brand-50 font-medium text-brand-700"
                        : "text-ink-muted hover:bg-surface-muted hover:text-ink"
                    }`}
                  >
                    <FolderOpen
                      size={18}
                      className={mq.activeFolder === "unfiled" ? "text-brand-600" : "text-ink-subtle"}
                      aria-hidden="true"
                    />
                    <span className="flex-1 truncate text-sm">{t("folder.unfiledQuizzes")}</span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                        mq.activeFolder === "unfiled"
                          ? "bg-brand-100 text-brand-800"
                          : "border border-line bg-surface-muted text-ink-muted"
                      }`}
                    >
                      {mq.getQuizzesWithoutFolder().length}
                    </span>
                  </button>

                  {/* Folder Tree */}
                  <div className="mt-2 space-y-0.5 border-t border-line pt-2">
                    <FolderTree
                      expandedFolders={mq.expandedFolders}
                      activeFolder={mq.activeFolder}
                      editingFolder={mq.editingFolder}
                      draggedItem={mq.draggedItem}
                      toggleFolder={mq.toggleFolder}
                      setActiveFolder={mq.setActiveFolder}
                      setEditingFolder={mq.setEditingFolder}
                      renameFolder={mq.renameFolder}
                      deleteFolder={mq.deleteFolder}
                      setSelectedParentFolder={mq.setSelectedParentFolder}
                      setShowNewFolderModal={mq.setShowNewFolderModal}
                      handleDragStart={mq.handleDragStart}
                      handleDragOver={mq.handleDragOver}
                      handleDrop={mq.handleDrop}
                      buildFolderTree={mq.buildFolderTree}
                      getQuizzesInFolder={mq.getQuizzesInFolder}
                    />
                  </div>
                </div>
              </aside>

              {/* Right Column: Toolbar + Quizzes Grid */}
              <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-hidden">
                <QuizToolbar
                  searchQuery={mq.searchQuery}
                  setSearchQuery={mq.setSearchQuery}
                  sortBy={mq.sortBy}
                  setSortBy={mq.setSortBy}
                  selectedQuizzes={mq.selectedQuizzes}
                  clearSelection={mq.clearSelection}
                  bulkDeleteQuizzes={mq.bulkDeleteQuizzes}
                  setMoveQuizModal={mq.setMoveQuizModal}
                  setMobileFolderPanelOpen={mq.setMobileFolderPanelOpen}
                />

                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  {/* Active Folder Header */}
                  <div className="mb-4 flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-ink">
                        {mq.activeFolder === null
                          ? t("folder.allQuizzes")
                          : mq.activeFolder === "unfiled"
                            ? t("folder.unfiledQuizzes")
                            : mq.folders.find((f) => f.id === mq.activeFolder)?.name || t("folder.folder")}
                      </h2>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        {mq.getDisplayedQuizzes().length}{" "}
                        {mq.getDisplayedQuizzes().length !== 1 ? t("quiz.quizzes") : t("quiz.quiz")}
                        {mq.searchQuery && ` ${t("manager.matchingSearch", { query: mq.searchQuery })}`}
                      </p>
                    </div>

                    {mq.getDisplayedQuizzes().length > 0 && (
                      <Button variant="ghost" size="sm" onClick={mq.selectAllQuizzes}>
                        {t("manager.selectAll")}
                      </Button>
                    )}
                  </div>

                  {/* Quizzes Grid */}
                  <div className="flex-1 overflow-y-auto pb-6 pr-1">
                    {mq.getDisplayedQuizzes().length === 0 ? (
                      <EmptyState
                        icon={<Search className="h-6 w-6" aria-hidden="true" />}
                        title={
                          mq.searchQuery
                            ? t("manager.noQuizzesFound", { query: mq.searchQuery })
                            : t("manager.noQuizzesInFolder")
                        }
                      />
                    ) : (
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {mq.getDisplayedQuizzes().map((quiz) => (
                          <QuizCard
                            key={quiz.id}
                            quiz={quiz}
                            themesById={mq.themesById}
                            selectedQuizzes={mq.selectedQuizzes}
                            highlightedQuizId={mq.highlightedQuizId}
                            draggedItem={mq.draggedItem}
                            handleDragStart={mq.handleDragStart}
                            toggleQuizSelection={mq.toggleQuizSelection}
                            handleStartQuiz={handleStartQuiz}
                            handleDuplicate={mq.handleDuplicate}
                            handleDelete={mq.handleDelete}
                            setMoveQuizModal={mq.setMoveQuizModal}
                            setAssignQuizModal={mq.setAssignQuizModal}
                            setViewAssignmentsModal={mq.setViewAssignmentsModal}
                            setView={setView}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* New Folder Modal */}
        <NewFolderModal
          showNewFolderModal={mq.showNewFolderModal}
          selectedParentFolder={mq.selectedParentFolder}
          newFolderName={mq.newFolderName}
          setNewFolderName={mq.setNewFolderName}
          creatingFolder={mq.creatingFolder}
          createFolder={mq.createFolder}
          onClose={() => {
            mq.setShowNewFolderModal(false);
            mq.setNewFolderName("");
            mq.setSelectedParentFolder(null);
          }}
        />

        {/* Move Quiz to Folder Modal */}
        <MoveQuizModal
          moveQuizModal={mq.moveQuizModal}
          folders={mq.folders}
          selectedQuizzes={mq.selectedQuizzes}
          moveQuizToFolder={mq.moveQuizToFolder}
          bulkMoveQuizzes={mq.bulkMoveQuizzes}
          setMoveQuizModal={mq.setMoveQuizModal}
        />

        {/* Assign Quiz Modal */}
        {mq.assignQuizModal && (
          <AssignQuizModal
            isOpen={!!mq.assignQuizModal}
            onClose={() => {
              mq.setAssignQuizModal(null);
              // Refresh to update assignment count
              mq.fetchQuizzes();
            }}
            quizId={mq.assignQuizModal.id}
            quizTitle={mq.assignQuizModal.title}
            teacherId={appState.currentUser.id}
            onAssignmentCreated={(assignments) => {
              // Success handler
              mq.setAlertModal({
                isOpen: true,
                title: t("common.success", "Success"),
                message: t("assignQuiz.successMessage", { count: Array.isArray(assignments) ? assignments.length : 0, defaultValue: "Quiz has been assigned to {{count}} student(s). They will receive email notifications." }),
                type: "success"
              });
              // Refresh counts
              mq.fetchQuizzes();
            }}
          />
        )}

        {/* View Assignments Modal */}
        {mq.viewAssignmentsModal && (
          <QuizAssignmentsModal
            isOpen={!!mq.viewAssignmentsModal}
            onClose={() => {
              mq.setViewAssignmentsModal(null);
              // Refresh to update assignment count if unassigned
              mq.fetchQuizzes();
            }}
            quizId={mq.viewAssignmentsModal.id}
            quizTitle={mq.viewAssignmentsModal.title}
          />
        )}

        {/* Custom Modals */}
        <AlertModal
          isOpen={mq.alertModal.isOpen}
          title={mq.alertModal.title}
          message={mq.alertModal.message}
          type={mq.alertModal.type}
          onClose={() => mq.setAlertModal({ ...mq.alertModal, isOpen: false })}
        />

        <ConfirmModal
          isOpen={mq.confirmModal.isOpen}
          title={mq.confirmModal.title}
          message={mq.confirmModal.message}
          onConfirm={mq.confirmModal.onConfirm}
          onCancel={() => mq.setConfirmModal({ ...mq.confirmModal, isOpen: false })}
          confirmStyle="danger"
        />
      </div>
    </div>
  );
}
