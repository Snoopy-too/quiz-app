import React from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen, FolderPlus, Edit2, Trash2 } from "lucide-react";

export default function FolderTree({
  expandedFolders,
  activeFolder,
  editingFolder,
  draggedItem,
  toggleFolder,
  setActiveFolder,
  setEditingFolder,
  renameFolder,
  deleteFolder,
  setSelectedParentFolder,
  setShowNewFolderModal,
  handleDragStart,
  handleDragOver,
  handleDrop,
  buildFolderTree,
  getQuizzesInFolder,
}) {
  const renderFolder = (folder, depth = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const subfolders = buildFolderTree(folder.id);
    const folderQuizzes = getQuizzesInFolder(folder.id);
    const hasSubfolders = subfolders.length > 0;
    const isActive = activeFolder === folder.id;

    return (
      <div key={folder.id} style={depth > 0 ? { paddingLeft: `${depth * 14}px` } : undefined}>
        <div
          role="button"
          tabIndex={0}
          draggable
          onDragStart={(e) => handleDragStart(e, folder, "folder")}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, folder)}
          onClick={() => setActiveFolder(folder.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setActiveFolder(folder.id);
            }
          }}
          className={`group flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 transition-colors ${
            isActive
              ? "bg-brand-50 font-medium text-brand-700"
              : "text-ink-muted hover:bg-surface-muted hover:text-ink"
          } ${draggedItem?.item.id === folder.id ? "opacity-50" : ""}`}
        >
          {hasSubfolders && (
            <button
              type="button"
              aria-label={isExpanded ? "Collapse folder" : "Expand folder"}
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(folder.id);
              }}
              className="-ml-1.5 rounded p-0.5 text-ink-subtle transition-colors hover:bg-surface hover:text-ink"
            >
              {isExpanded ? (
                <ChevronDown size={15} aria-hidden="true" />
              ) : (
                <ChevronRight size={15} aria-hidden="true" />
              )}
            </button>
          )}
          {isExpanded && hasSubfolders ? (
            <FolderOpen
              size={18}
              className={`${
                isActive ? "text-brand-600" : "text-ink-subtle group-hover:text-ink-muted"
              } shrink-0 transition-colors`}
              aria-hidden="true"
            />
          ) : (
            <Folder
              size={18}
              className={`${
                isActive ? "text-brand-600" : "text-ink-subtle group-hover:text-ink-muted"
              } shrink-0 transition-colors`}
              aria-hidden="true"
            />
          )}

          {editingFolder === folder.id ? (
            <input
              type="text"
              defaultValue={folder.name}
              onClick={(e) => e.stopPropagation()}
              onBlur={(e) => renameFolder(folder.id, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") renameFolder(folder.id, e.target.value);
                if (e.key === "Escape") setEditingFolder(null);
              }}
              className="min-w-0 flex-1 rounded-md border border-line bg-surface px-2 py-0.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          ) : (
            <span className="min-w-0 flex-1 truncate text-sm" title={folder.name}>
              {folder.name}
            </span>
          )}

          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium group-hover:hidden group-focus-within:hidden ${
              isActive
                ? "bg-brand-100 text-brand-800"
                : "border border-line bg-surface-muted text-ink-muted"
            }`}
          >
            {folderQuizzes.length}
          </span>

          <div className="hidden shrink-0 items-center gap-0.5 group-hover:flex group-focus-within:flex">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedParentFolder(folder.id);
                setShowNewFolderModal(true);
              }}
              className="rounded p-1 text-ink-muted transition hover:bg-surface hover:text-ink"
              title="Add subfolder"
              aria-label="Add subfolder"
            >
              <FolderPlus size={14} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setEditingFolder(folder.id);
              }}
              className="rounded p-1 text-ink-muted transition hover:bg-surface hover:text-ink"
              title="Rename folder"
              aria-label="Rename folder"
            >
              <Edit2 size={14} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                deleteFolder(folder.id);
              }}
              className="rounded p-1 text-danger-600 transition hover:bg-red-50"
              title="Delete folder"
              aria-label="Delete folder"
            >
              <Trash2 size={14} aria-hidden="true" />
            </button>
          </div>
        </div>

        {isExpanded && hasSubfolders && (
          <div className="mt-0.5 space-y-0.5">
            {subfolders.map((subfolder) => renderFolder(subfolder, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {buildFolderTree(null).map((folder) => renderFolder(folder))}
    </>
  );
}
