import React from "react";
import { useTranslation } from "react-i18next";
import { Plus, Archive, FolderOpen, Search, X } from "lucide-react";
import VerticalNav from "../layout/VerticalNav";
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

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Vertical Navigation */}
      <VerticalNav currentView="manage-quizzes" setView={setView} appState={appState} />

      {/* Main Content */}
      <div className="flex-1 md:ml-64 pt-16 md:pt-0 flex flex-col h-screen overflow-hidden">
        {/* Top Navigation */}
        <nav className="bg-white shadow-sm border-b border-gray-200 px-4 md:px-6 py-3 md:py-4">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-1 md:gap-4">
            <div className="flex items-center gap-2 md:gap-4">
              <h1 className="text-lg md:text-2xl font-bold text-blue-700">{t('manager.quizManager')}</h1>
              <div className="hidden md:block h-6 w-px bg-gray-300"></div>
              <span className="hidden md:inline text-sm text-gray-600">
                {t('manager.quizzesAndFolders', {
                  quizCount: mq.quizzes.length,
                  quizText: mq.quizzes.length !== 1 ? t('quiz.quizzes') : t('quiz.quiz'),
                  folderCount: mq.folders.length,
                  folderText: mq.folders.length !== 1 ? t('folder.folders') : t('folder.folder')
                })}
              </span>
            </div>
            <span className="md:hidden text-xs text-gray-600">
              {mq.quizzes.length} {mq.quizzes.length !== 1 ? t('quiz.quizzes') : t('quiz.quiz')} • {mq.folders.length} {mq.folders.length !== 1 ? t('folder.folders') : t('folder.folder')}
            </span>
          </div>
        </nav>

        {/* Toolbar */}
        <QuizToolbar
          searchQuery={mq.searchQuery}
          setSearchQuery={mq.setSearchQuery}
          sortBy={mq.sortBy}
          setSortBy={mq.setSortBy}
          selectedQuizzes={mq.selectedQuizzes}
          clearSelection={mq.clearSelection}
          bulkDeleteQuizzes={mq.bulkDeleteQuizzes}
          setMoveQuizModal={mq.setMoveQuizModal}
          setShowNewFolderModal={mq.setShowNewFolderModal}
          setSelectedParentFolder={mq.setSelectedParentFolder}
          setMobileFolderPanelOpen={mq.setMobileFolderPanelOpen}
          setView={setView}
        />

        {/* Main Content Area */}
        <div className="flex flex-1 overflow-hidden">
          {mq.loading && (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-gray-600">{t('common.loading')}</p>
            </div>
          )}

          {mq.error && (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-red-600">{t('common.error')}: {mq.error}</p>
            </div>
          )}

          {!mq.loading && !mq.error && mq.quizzes.length === 0 && mq.folders.length === 0 && (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="bg-white rounded-xl shadow-lg p-12 text-center max-w-md">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plus size={32} className="text-blue-700" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{t('quiz.noQuizzes')}</h3>
                <p className="text-gray-600 mb-6">{t('manager.getStarted')}</p>
                <button
                  onClick={() => setView("create-quiz")}
                  className="bg-blue-700 text-white px-8 py-3 rounded-lg hover:bg-blue-800 transition font-medium"
                >
                  {t('manager.createYourFirstQuiz')}
                </button>
              </div>
            </div>
          )}

          {!mq.loading && !mq.error && (mq.folders.length > 0 || mq.quizzes.length > 0) && (
            <>
              {/* Mobile Folder Panel Overlay */}
              {mq.mobileFolderPanelOpen && (
                <>
                  {/* Backdrop */}
                  <div
                    className="md:hidden fixed inset-0 bg-black/50 z-40"
                    onClick={() => mq.setMobileFolderPanelOpen(false)}
                  />
                  {/* Slide-in Panel */}
                  <div className="md:hidden fixed top-0 left-0 bottom-0 w-72 bg-gray-100 shadow-2xl z-50 overflow-y-auto" style={{ animation: 'slideInLeft 0.3s ease-out' }}>
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-sm uppercase text-gray-600 px-2">{t('folder.folders')}</h3>
                        <button
                          onClick={() => mq.setMobileFolderPanelOpen(false)}
                          className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          <X size={20} className="text-gray-600" />
                        </button>
                      </div>
                      <div className="space-y-0.5">
                        {/* All Quizzes */}
                        <div
                          onClick={() => { mq.setActiveFolder(null); mq.setMobileFolderPanelOpen(false); }}
                          className={`py-2 px-3 rounded-lg flex items-center gap-2 cursor-pointer transition-colors ${mq.activeFolder === null ? "bg-blue-50 text-blue-800 font-medium" : "hover:bg-gray-200 text-gray-700"
                            }`}
                        >
                          <Archive
                            size={22}
                            className={`${mq.activeFolder === null ? "text-blue-600" : "text-gray-500"} transition-transform group-hover:scale-110`}
                            fill="currentColor"
                            fillOpacity={0.1}
                          />
                          <span className="flex-1 text-sm">{t('folder.allQuizzes')}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${mq.activeFolder === null ? "bg-blue-100 text-blue-800" : "bg-gray-200 text-gray-600"
                            }`}>
                            {mq.quizzes.length}
                          </span>
                        </div>

                        {/* Unfiled Quizzes */}
                        <div
                          onClick={() => { mq.setActiveFolder("unfiled"); mq.setMobileFolderPanelOpen(false); }}
                          className={`py-2 px-3 rounded-lg flex items-center gap-2 cursor-pointer transition-colors ${mq.activeFolder === "unfiled" ? "bg-blue-50 text-blue-800 font-medium" : "hover:bg-gray-200 text-gray-700"
                            }`}
                        >
                          <FolderOpen
                            size={22}
                            className={`${mq.activeFolder === "unfiled" ? "text-blue-600" : "text-gray-500"} transition-transform group-hover:scale-110`}
                            fill="currentColor"
                            fillOpacity={0.1}
                          />
                          <span className="flex-1 text-sm">{t('folder.unfiledQuizzes')}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${mq.activeFolder === "unfiled" ? "bg-blue-100 text-blue-800" : "bg-gray-200 text-gray-600"
                            }`}>
                            {mq.getQuizzesWithoutFolder().length}
                          </span>
                        </div>

                        {/* Folder Tree */}
                        <div className="pt-2 border-t border-gray-300 mt-2">
                          <FolderTree
                            folders={mq.folders}
                            quizzes={mq.quizzes}
                            themesById={mq.themesById}
                            expandedFolders={mq.expandedFolders}
                            activeFolder={mq.activeFolder}
                            editingFolder={mq.editingFolder}
                            draggedItem={mq.draggedItem}
                            highlightedQuizId={mq.highlightedQuizId}
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
                            handleSidebarQuizClick={mq.handleSidebarQuizClick}
                            buildFolderTree={mq.buildFolderTree}
                            getQuizzesInFolder={mq.getQuizzesInFolder}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Left Sidebar: Folder Tree - Hidden on mobile */}
              <div className="hidden md:block w-72 bg-gray-100 border-r border-gray-200 overflow-y-auto overflow-x-hidden">
                <div className="p-4">
                  <h3 className="font-bold text-sm uppercase text-gray-600 mb-3 px-2">{t('folder.folders')}</h3>
                  <div className="space-y-0.5">
                    {/* All Quizzes */}
                    <div
                      onClick={() => mq.setActiveFolder(null)}
                      className={`py-2 px-3 rounded-lg flex items-center gap-2 cursor-pointer transition-colors ${mq.activeFolder === null ? "bg-blue-50 text-blue-800 font-medium" : "hover:bg-gray-200 text-gray-700"
                        }`}
                    >
                      <Archive
                        size={22}
                        className={`${mq.activeFolder === null ? "text-blue-600" : "text-gray-500"} transition-transform group-hover:scale-110`}
                        fill="currentColor"
                        fillOpacity={0.1}
                      />
                      <span className="flex-1 text-sm">{t('folder.allQuizzes')}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${mq.activeFolder === null ? "bg-blue-100 text-blue-800" : "bg-gray-200 text-gray-600"
                        }`}>
                        {mq.quizzes.length}
                      </span>
                    </div>

                    {/* Unfiled Quizzes */}
                    <div
                      onClick={() => mq.setActiveFolder("unfiled")}
                      onDragOver={mq.handleDragOver}
                      onDrop={(e) => mq.handleDrop(e, null)}
                      className={`py-2 px-3 rounded-lg flex items-center gap-2 cursor-pointer transition-colors ${mq.activeFolder === "unfiled" ? "bg-blue-50 text-blue-800 font-medium" : "hover:bg-gray-200 text-gray-700"
                        }`}
                    >
                      <FolderOpen
                        size={22}
                        className={`${mq.activeFolder === "unfiled" ? "text-blue-600" : "text-gray-500"} transition-transform group-hover:scale-110`}
                        fill="currentColor"
                        fillOpacity={0.1}
                      />
                      <span className="flex-1 text-sm">{t('folder.unfiledQuizzes')}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${mq.activeFolder === "unfiled" ? "bg-blue-100 text-blue-800" : "bg-gray-200 text-gray-600"
                        }`}>
                        {mq.getQuizzesWithoutFolder().length}
                      </span>
                    </div>

                    {/* Folder Tree */}
                    <div className="pt-2 border-t border-gray-300 mt-2">
                      <FolderTree
                        folders={mq.folders}
                        quizzes={mq.quizzes}
                        themesById={mq.themesById}
                        expandedFolders={mq.expandedFolders}
                        activeFolder={mq.activeFolder}
                        editingFolder={mq.editingFolder}
                        draggedItem={mq.draggedItem}
                        highlightedQuizId={mq.highlightedQuizId}
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
                        handleSidebarQuizClick={mq.handleSidebarQuizClick}
                        buildFolderTree={mq.buildFolderTree}
                        getQuizzesInFolder={mq.getQuizzesInFolder}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Quizzes Grid */}
              <div className="flex-1 overflow-y-auto bg-white">
                <div className="p-4 md:p-6">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 md:mb-6">
                    <div>
                      <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                        {mq.activeFolder === null
                          ? t('folder.allQuizzes')
                          : mq.activeFolder === "unfiled"
                            ? t('folder.unfiledQuizzes')
                            : mq.folders.find((f) => f.id === mq.activeFolder)?.name || t('folder.folder')}
                      </h2>
                      <p className="text-xs md:text-sm text-gray-600 mt-1">
                        {mq.getDisplayedQuizzes().length} {mq.getDisplayedQuizzes().length !== 1 ? t('quiz.quizzes') : t('quiz.quiz')}
                        {mq.searchQuery && ` ${t('manager.matchingSearch', { query: mq.searchQuery })}`}
                      </p>
                    </div>

                    {mq.getDisplayedQuizzes().length > 0 && (
                      <button
                        onClick={mq.selectAllQuizzes}
                        className="text-sm text-blue-700 hover:text-blue-800 font-medium self-start sm:self-auto"
                      >
                        {t('manager.selectAll')}
                      </button>
                    )}
                  </div>

                  {/* Quizzes Grid */}
                  {mq.getDisplayedQuizzes().length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search size={32} className="text-gray-400" />
                      </div>
                      <p className="text-gray-600">
                        {mq.searchQuery ? t('manager.noQuizzesFound', { query: mq.searchQuery }) : t('manager.noQuizzesInFolder')}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
            </>
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
            onAssignmentCreated={() => {
              // Success handler
              mq.setAlertModal({
                isOpen: true,
                title: t("common.success", "Success"),
                message: t("assignQuiz.successMessage", "Quiz assigned successfully!"),
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
