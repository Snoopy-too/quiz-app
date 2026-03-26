import React from "react";
import { useTranslation } from "react-i18next";
import { Search, Plus, FolderPlus, Move, Trash2, X, PanelLeftOpen } from "lucide-react";

export default function QuizToolbar({
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
  selectedQuizzes,
  clearSelection,
  bulkDeleteQuizzes,
  setMoveQuizModal,
  setShowNewFolderModal,
  setSelectedParentFolder,
  setMobileFolderPanelOpen,
  setView,
}) {
  const { t } = useTranslation();

  return (
    <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 md:py-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 md:gap-4">
        {/* Left: Mobile folder toggle, Search and Filters */}
        <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
          {/* Mobile folder toggle button */}
          <button
            onClick={() => setMobileFolderPanelOpen(true)}
            className="md:hidden p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition flex-shrink-0"
            title={t('folder.folders')}
          >
            <PanelLeftOpen size={20} />
          </button>
          <div className="relative flex-1 max-w-md">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t('manager.searchQuizzes')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
          >
            <option value="created_at">{t('manager.sortNewest')}</option>
            <option value="title">{t('manager.sortAZ')}</option>
          </select>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
          {selectedQuizzes.size > 0 && (
            <>
              <div className="px-2 md:px-3 py-1.5 md:py-2 bg-blue-50 text-blue-800 rounded-lg text-xs md:text-sm font-medium">
                {selectedQuizzes.size}
              </div>
              <button
                onClick={() => setMoveQuizModal("bulk")}
                className="p-2 md:px-4 md:py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition flex items-center gap-2 text-sm"
                title={t('manager.move')}
              >
                <Move size={16} />
                <span className="hidden md:inline">{t('manager.move')}</span>
              </button>
              <button
                onClick={bulkDeleteQuizzes}
                className="p-2 md:px-4 md:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-2 text-sm"
                title={t('common.delete')}
              >
                <Trash2 size={16} />
                <span className="hidden md:inline">{t('common.delete')}</span>
              </button>
              <button
                onClick={clearSelection}
                className="p-2 md:px-3 md:py-2 text-gray-600 hover:text-gray-800 text-sm"
                title={t('manager.clear')}
              >
                <X size={16} className="md:hidden" />
                <span className="hidden md:inline">{t('manager.clear')}</span>
              </button>
            </>
          )}

          {selectedQuizzes.size === 0 && (
            <>
              <button
                onClick={() => {
                  setSelectedParentFolder(null);
                  setShowNewFolderModal(true);
                }}
                className="p-2 md:px-4 md:py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition flex items-center gap-2 text-sm font-medium"
                title={t('folder.newFolder')}
              >
                <FolderPlus size={16} />
                <span className="hidden md:inline">{t('folder.newFolder')}</span>
              </button>
              <button
                onClick={() => setView("create-quiz")}
                className="p-2 md:px-4 md:py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition flex items-center gap-2 text-sm font-medium"
                title={t('nav.createQuiz')}
              >
                <Plus size={16} />
                <span className="hidden md:inline">{t('nav.createQuiz')}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
