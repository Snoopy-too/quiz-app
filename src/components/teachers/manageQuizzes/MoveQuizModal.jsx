import React from "react";
import { useTranslation } from "react-i18next";
import { Folder, FolderOpen } from "lucide-react";
import { Button } from "../../ui";

export default function MoveQuizModal({
  moveQuizModal,
  folders,
  selectedQuizzes,
  moveQuizToFolder,
  bulkMoveQuizzes,
  setMoveQuizModal,
}) {
  const { t } = useTranslation();

  if (!moveQuizModal) return null;

  const sortedFlatFolders = [];
  const appendChildren = (parentId, depth) => {
    const children = folders
      .filter((f) => f.parent_folder_id === parentId)
      .sort((a, b) => {
        const orderDiff = (a.order_index ?? 0) - (b.order_index ?? 0);
        if (orderDiff !== 0) return orderDiff;
        return (a.name || "").localeCompare(b.name || "", undefined, {
          numeric: true,
          sensitivity: "base",
        });
      });
    for (const child of children) {
      sortedFlatFolders.push({ folder: child, depth });
      appendChildren(child.id, depth + 1);
    }
  };
  appendChildren(null, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[1px]">
      <div className="max-h-[80vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-line bg-surface p-6 shadow-pop">
        <h3 className="mb-1 text-lg font-semibold text-ink">
          {moveQuizModal === "bulk"
            ? `${t("folder.moveToFolder")} (${selectedQuizzes.size})`
            : t("folder.moveToFolder")}
        </h3>
        <p className="mb-4 text-xs text-ink-muted">{t("folder.folder")}</p>

        <div className="max-h-80 space-y-1 overflow-y-auto">
          <button
            type="button"
            onClick={() => {
              if (moveQuizModal === "bulk") {
                bulkMoveQuizzes(null);
              } else {
                moveQuizToFolder(moveQuizModal, null);
              }
            }}
            className="group flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-left transition-colors hover:bg-brand-50"
          >
            <FolderOpen
              size={18}
              className="text-ink-subtle transition-colors group-hover:text-brand-600"
              aria-hidden="true"
            />
            <span className="text-sm font-medium text-ink group-hover:text-brand-700">
              {t("folder.unfiledQuizzes")}
            </span>
          </button>

          {sortedFlatFolders.map(({ folder, depth }) => (
            <button
              key={folder.id}
              type="button"
              onClick={() => {
                if (moveQuizModal === "bulk") {
                  bulkMoveQuizzes(folder.id);
                } else {
                  moveQuizToFolder(moveQuizModal, folder.id);
                }
              }}
              className="group flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-left transition-colors hover:bg-brand-50"
              style={{ paddingLeft: `${14 + depth * 20}px` }}
            >
              <Folder
                size={18}
                className="shrink-0 text-ink-subtle transition-colors group-hover:text-brand-600"
                aria-hidden="true"
              />
              <span className="truncate text-sm text-ink group-hover:text-brand-700">
                {folder.name}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-5 flex border-t border-line pt-4">
          <Button variant="secondary" className="w-full" onClick={() => setMoveQuizModal(null)}>
            {t("common.cancel")}
          </Button>
        </div>
      </div>
    </div>
  );
}
