import React from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen, FolderPlus, Edit2, Trash2 } from "lucide-react";

export default function FolderTree({
  folders,
  quizzes,
  themesById,
  expandedFolders,
  activeFolder,
  editingFolder,
  draggedItem,
  highlightedQuizId,
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
  handleSidebarQuizClick,
  buildFolderTree,
  getQuizzesInFolder,
}) {
  const renderFolder = (folder, depth = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const subfolders = buildFolderTree(folder.id);
    const folderQuizzes = getQuizzesInFolder(folder.id);
    const hasChildren = subfolders.length > 0 || folderQuizzes.length > 0;
    const isActive = activeFolder === folder.id;

    return (
      <div key={folder.id} style={{ marginLeft: `${depth * 16}px` }}>
        <div
          draggable
          onDragStart={(e) => handleDragStart(e, folder, "folder")}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, folder)}
          onClick={() => setActiveFolder(folder.id)}
          className={`flex items-center gap-2 py-2 px-3 rounded-lg group cursor-pointer transition-colors ${isActive ? "bg-blue-50 text-blue-800 font-medium" : "hover:bg-gray-200 text-gray-700"
            } ${draggedItem?.item.id === folder.id ? "opacity-50" : ""}`}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              hasChildren && toggleFolder(folder.id);
            }}
            className="p-1 hover:bg-gray-300 rounded"
          >
            {hasChildren ? (
              isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
            ) : (
              <span className="w-4" />
            )}
          </button>
          {isExpanded ? (
            <FolderOpen
              size={22}
              className={`${isActive ? "text-blue-700" : "text-amber-500"} flex-shrink-0 transition-transform group-hover:scale-110`}
              fill="currentColor"
              fillOpacity={0.2}
            />
          ) : (
            <Folder
              size={22}
              className={`${isActive ? "text-blue-700" : "text-amber-500"} flex-shrink-0 transition-transform group-hover:scale-110`}
              fill="currentColor"
              fillOpacity={0.2}
            />
          )}

          {editingFolder === folder.id ? (
            <input
              type="text"
              defaultValue={folder.name}
              autoFocus
              onClick={(e) => e.stopPropagation()}
              onBlur={(e) => renameFolder(folder.id, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") renameFolder(folder.id, e.target.value);
                if (e.key === "Escape") setEditingFolder(null);
              }}
              className="flex-1 px-2 py-1 border rounded text-sm"
            />
          ) : (
            <span className="flex-1 text-sm">{folder.name}</span>
          )}

          <span className={`text-xs px-2 py-0.5 rounded-full ${isActive ? "bg-blue-100 text-blue-800" : "bg-gray-200 text-gray-600"}`}>
            {folderQuizzes.length}
          </span>

          <div className="opacity-0 group-hover:opacity-100 flex gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedParentFolder(folder.id);
                setShowNewFolderModal(true);
              }}
              className="p-1 hover:bg-gray-300 rounded transition"
              title="Add subfolder"
            >
              <FolderPlus size={14} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditingFolder(folder.id);
              }}
              className="p-1 hover:bg-gray-300 rounded transition"
              title="Rename folder"
            >
              <Edit2 size={14} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteFolder(folder.id);
              }}
              className="p-1 hover:bg-red-100 text-red-600 rounded transition"
              title="Delete folder"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {isExpanded && (
          <div>
            {/* Render subfolders */}
            {subfolders.map((subfolder) => renderFolder(subfolder, depth + 1))}

            {/* Render quizzes in this folder as simple clickable items */}
            {folderQuizzes.length > 0 && (
              <div className="ml-8 mt-1 space-y-1">
                {folderQuizzes.map((quiz) => {
                  const theme = quiz.themeDetails || themesById[quiz.theme_id] || null;
                  const backgroundImage = theme?.background_image_url || quiz.background_image_url;
                  const gradient = theme?.primary_color
                    ? `linear-gradient(135deg, ${theme.primary_color}, ${theme.secondary_color || theme.primary_color})`
                    : "linear-gradient(135deg, #7C3AED, #2563EB)";

                  const isHighlighted = highlightedQuizId === quiz.id;

                  return (
                    <div
                      key={quiz.id}
                      onClick={() => handleSidebarQuizClick(quiz, folder.id)}
                      className={`py-1.5 px-3 text-sm rounded cursor-pointer transition-colors flex items-center gap-2 ${
                        isHighlighted
                          ? "bg-blue-100 text-blue-800 font-medium"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <div
                        className={`w-3 h-3 rounded-full shadow transition-all ${
                          isHighlighted
                            ? "ring-2 ring-blue-400 ring-offset-1"
                            : "border border-white/60"
                        }`}
                        style={{
                          backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          background: backgroundImage ? undefined : gradient
                        }}
                      ></div>
                      <span className="flex-1">{quiz.title}</span>
                    </div>
                  );
                })}
              </div>
            )}
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
