import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button, Input } from "../../ui";

export default function NewFolderModal({
  showNewFolderModal,
  selectedParentFolder,
  newFolderName,
  setNewFolderName,
  creatingFolder,
  createFolder,
  onClose,
}) {
  const { t } = useTranslation();
  const inputRef = useRef(null);

  useEffect(() => {
    if (showNewFolderModal) {
      inputRef.current?.focus();
    }
  }, [showNewFolderModal]);

  if (!showNewFolderModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[1px]">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 shadow-pop">
        <h3 className="mb-4 text-lg font-semibold text-ink">
          {selectedParentFolder ? t("folder.createSubfolder") : t("folder.createFolder")}
        </h3>
        <Input
          ref={inputRef}
          type="text"
          placeholder={t("folder.folderName")}
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !creatingFolder && createFolder()}
          className="mb-4"
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button variant="primary" onClick={createFolder} loading={creatingFolder}>
            {creatingFolder ? t("common.creating") || "Creating..." : t("common.create")}
          </Button>
        </div>
      </div>
    </div>
  );
}
