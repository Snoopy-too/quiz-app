import React from "react";
import { useTranslation } from "react-i18next";
import { Search, Move, Trash2, X, PanelLeftOpen } from "lucide-react";
import { Input, Select, Button, Badge } from "../../ui";

export default function QuizToolbar({
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
  selectedQuizzes,
  clearSelection,
  bulkDeleteQuizzes,
  setMoveQuizModal,
  setMobileFolderPanelOpen,
}) {
  const { t } = useTranslation();

  return (
    <div className="shrink-0 rounded-xl border border-line bg-surface p-3 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Mobile folder toggle, Search and Sort */}
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setMobileFolderPanelOpen(true)}
            className="shrink-0 md:hidden"
            aria-label={t("folder.folders")}
            title={t("folder.folders")}
          >
            <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
          </Button>
          <div className="relative max-w-md flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle"
              aria-hidden="true"
            />
            <Input
              type="text"
              placeholder={t("manager.searchQuizzes")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label={t("manager.sortQuizzes", "Sort quizzes")}
            className="w-auto min-w-[140px]"
          >
            <option value="created_at">{t("manager.sortNewest")}</option>
            <option value="title">{t("manager.sortAZ")}</option>
          </Select>
        </div>

        {/* Right: Bulk Selection Actions */}
        {selectedQuizzes.size > 0 && (
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="brand">{selectedQuizzes.size}</Badge>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setMoveQuizModal("bulk")}
              title={t("manager.move")}
            >
              <Move className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{t("manager.move")}</span>
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={bulkDeleteQuizzes}
              title={t("common.delete")}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{t("common.delete")}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              title={t("manager.clear")}
            >
              <X className="h-4 w-4 sm:hidden" aria-hidden="true" />
              <span className="hidden sm:inline">{t("manager.clear")}</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
