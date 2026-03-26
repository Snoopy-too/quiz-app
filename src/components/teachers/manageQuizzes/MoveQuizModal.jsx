import React from "react";
import { useTranslation } from "react-i18next";
import { Folder, FolderOpen } from "lucide-react";

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-96 max-h-[80vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-2">
          {moveQuizModal === "bulk" ? t('folder.moveToFolder') + ` (${selectedQuizzes.size})` : t('folder.moveToFolder')}
        </h3>
        <p className="text-sm text-gray-600 mb-4">{t('folder.folder')}</p>

        <div className="space-y-1 max-h-96 overflow-y-auto">
          <button
            onClick={() => {
              if (moveQuizModal === "bulk") {
                bulkMoveQuizzes(null);
              } else {
                moveQuizToFolder(moveQuizModal, null);
              }
            }}
            className="w-full text-left px-4 py-3 hover:bg-blue-50 rounded-lg transition flex items-center gap-3 group"
          >
            <FolderOpen
              size={22}
              className="text-gray-500 group-hover:text-blue-600 transition-transform group-hover:scale-110"
              fill="currentColor"
              fillOpacity={0.1}
            />
            <span className="text-sm group-hover:text-blue-800 font-medium">{t('folder.unfiledQuizzes')}</span>
          </button>

          {folders.map((folder) => {
            const depth = (() => {
              let d = 0;
              let currentId = folder.parent_folder_id;
              while (currentId) {
                d++;
                const parent = folders.find((f) => f.id === currentId);
                currentId = parent?.parent_folder_id;
              }
              return d;
            })();

            return (
              <button
                key={folder.id}
                onClick={() => {
                  if (moveQuizModal === "bulk") {
                    bulkMoveQuizzes(folder.id);
                  } else {
                    moveQuizToFolder(moveQuizModal, folder.id);
                  }
                }}
                className="w-full text-left px-4 py-3 hover:bg-blue-50 rounded-lg transition flex items-center gap-3 group"
                style={{ paddingLeft: `${16 + depth * 20}px` }}
              >
                <Folder
                  size={22}
                  className="text-amber-500 group-hover:text-blue-600 transition-transform group-hover:scale-110"
                  fill="currentColor"
                  fillOpacity={0.2}
                />
                <span className="text-sm group-hover:text-blue-800">{folder.name}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200 flex gap-2">
          <button
            onClick={() => setMoveQuizModal(null)}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
