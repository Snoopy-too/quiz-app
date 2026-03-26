import React from "react";
import { useTranslation } from "react-i18next";

export default function NewFolderModal({
  showNewFolderModal, selectedParentFolder, newFolderName,
  setNewFolderName, creatingFolder, createFolder, onClose,
}) {
  const { t } = useTranslation();

  if (!showNewFolderModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-96">
        <h3 className="text-xl font-bold mb-4">
          {selectedParentFolder ? t('folder.createSubfolder') : t('folder.createFolder')}
        </h3>
        <input
          type="text"
          placeholder={t('folder.folderName')}
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !creatingFolder && createFolder()}
          className="w-full px-4 py-2 border rounded-lg mb-4"
          autoFocus
        />
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">
            {t('common.cancel')}
          </button>
          <button
            onClick={createFolder}
            disabled={creatingFolder}
            className={`px-4 py-2 text-white rounded-lg ${creatingFolder ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-700 hover:bg-blue-800'}`}
          >
            {creatingFolder ? t('common.creating') || 'Creating...' : t('common.create')}
          </button>
        </div>
      </div>
    </div>
  );
}
