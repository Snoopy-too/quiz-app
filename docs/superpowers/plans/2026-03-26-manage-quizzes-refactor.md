# ManageQuizzes.jsx Refactoring Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Break down the 1503-line `ManageQuizzes.jsx` into a custom hook for all logic + 5 focused sub-components, keeping behavior identical.

**Architecture:** Extract all state, data fetching, folder/quiz CRUD, filtering, selection, and drag & drop logic into `useManageQuizzes` hook. Extract the recursive folder renderer, quiz card, toolbar, and two modals into sub-components. The main component becomes a ~350-line layout shell.

**Tech Stack:** React 18, Supabase JS, Vitest, i18next, Tailwind CSS, Lucide icons

---

## File Structure

### New files to create:
| File | Responsibility |
|------|---------------|
| `src/hooks/useManageQuizzes.js` | All state, data fetching, folder/quiz CRUD, filtering, selection, drag & drop |
| `src/components/teachers/manageQuizzes/QuizCard.jsx` | Individual quiz card with theme preview, actions, selection |
| `src/components/teachers/manageQuizzes/FolderTree.jsx` | Recursive folder tree renderer (shared by desktop sidebar & mobile panel) |
| `src/components/teachers/manageQuizzes/QuizToolbar.jsx` | Search, sort, bulk actions toolbar |
| `src/components/teachers/manageQuizzes/NewFolderModal.jsx` | Create folder dialog |
| `src/components/teachers/manageQuizzes/MoveQuizModal.jsx` | Move quiz(zes) to folder dialog |

### Files to modify:
| File | Change |
|------|--------|
| `src/components/teachers/ManageQuizzes.jsx` | Slim down to ~350-line layout shell importing hook + sub-components |

---

## Task 1: Create `useManageQuizzes` hook (logic extraction)

**Files:**
- Create: `src/hooks/useManageQuizzes.js`

Extract from `ManageQuizzes.jsx` lines 12-618 into a custom hook. The hook receives `appState` (for `currentUser`) and returns all state + actions. `setView` is NOT in the hook — it stays in the component.

- [ ] **Step 1: Create `src/hooks/useManageQuizzes.js`**

```js
import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../supabaseClient";

export default function useManageQuizzes(appState) {
  const { t } = useTranslation();

  // --- All useState declarations (original lines 13-40) ---
  const [quizzes, setQuizzes] = useState([]);
  const [folders, setFolders] = useState([]);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [themesById, setThemesById] = useState({});
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [selectedParentFolder, setSelectedParentFolder] = useState(null);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null);
  const [folderContextMenu, setFolderContextMenu] = useState(null);
  const [moveQuizModal, setMoveQuizModal] = useState(null);
  const [assignQuizModal, setAssignQuizModal] = useState(null);
  const [viewAssignmentsModal, setViewAssignmentsModal] = useState(null);
  const [draggedItem, setDraggedItem] = useState(null);
  const [activeFolder, setActiveFolder] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedQuizzes, setSelectedQuizzes] = useState(new Set());
  const [sortBy, setSortBy] = useState("created_at");
  const [filterCategory, setFilterCategory] = useState(null);
  const [mobileFolderPanelOpen, setMobileFolderPanelOpen] = useState(false);
  const [highlightedQuizId, setHighlightedQuizId] = useState(null);
  const quizGridRef = useRef(null);
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: "", message: "", type: "info" });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: "", message: "", onConfirm: null });

  // --- useEffect (original lines 42-50) ---
  // --- All functions (original lines 52-618) --- copy verbatim:
  // fetchThemes, fetchQuizzes, fetchFolders,
  // toggleFolder, createFolder, renameFolder, deleteFolder,
  // moveQuizToFolder, handleDragStart, handleDragOver, handleDrop,
  // handleDelete, handleDuplicate, handleStartQuiz (modified - see below),
  // buildFolderTree, getQuizzesInFolder, getQuizzesWithoutFolder,
  // getDisplayedQuizzes, toggleQuizSelection, selectAllQuizzes,
  // clearSelection, bulkMoveQuizzes, bulkDeleteQuizzes,
  // handleSidebarQuizClick

  // Return everything sub-components need
  return {
    // State
    quizzes, folders, expandedFolders, loading, error, themesById,
    showNewFolderModal, newFolderName, selectedParentFolder, creatingFolder,
    editingFolder, folderContextMenu, moveQuizModal, assignQuizModal,
    viewAssignmentsModal, draggedItem, activeFolder, searchQuery,
    selectedQuizzes, sortBy, filterCategory, mobileFolderPanelOpen,
    highlightedQuizId, quizGridRef, alertModal, confirmModal,

    // Setters needed by UI
    setShowNewFolderModal, setNewFolderName, setSelectedParentFolder,
    setEditingFolder, setFolderContextMenu, setMoveQuizModal,
    setAssignQuizModal, setViewAssignmentsModal, setDraggedItem,
    setActiveFolder, setSearchQuery, setSelectedQuizzes, setSortBy,
    setFilterCategory, setMobileFolderPanelOpen, setHighlightedQuizId,
    setAlertModal, setConfirmModal,

    // Actions
    fetchQuizzes, fetchFolders, toggleFolder, createFolder, renameFolder,
    deleteFolder, moveQuizToFolder, handleDragStart, handleDragOver,
    handleDrop, handleDelete, handleDuplicate, handleStartQuiz,
    buildFolderTree, getQuizzesInFolder, getQuizzesWithoutFolder,
    getDisplayedQuizzes, toggleQuizSelection, selectAllQuizzes,
    clearSelection, bulkMoveQuizzes, bulkDeleteQuizzes,
    handleSidebarQuizClick,
  };
}
```

**Key details:**
- Import path for supabaseClient: `../supabaseClient` (not `../../supabaseClient`)
- `handleStartQuiz` uses `setView` in the original (line 462). Modify it to accept a `navigateToSession` callback parameter:

```js
const handleStartQuiz = async (quizId, navigateToSession) => {
  // ... same logic ...
  // Instead of: setView("teacher-control", session.id)
  // Use: navigateToSession(session.id)
  if (navigateToSession) navigateToSession(session.id);
};
```

- `handleDuplicate` uses `appState.currentUser.id` (line 370) — this is passed via the `appState` parameter
- `handleStartQuiz` uses `appState.currentUser.id` (line 453) — same
- **Stale closure fix:** In `deleteFolder`, `handleDelete`, and `bulkDeleteQuizzes`, the original code uses `setConfirmModal({ ...confirmModal, isOpen: false })` which captures stale `confirmModal`. Fix these to use the functional updater: `setConfirmModal(prev => ({ ...prev, isOpen: false }))`. Same fix for `setAlertModal` patterns inside `onConfirm` callbacks.

- [ ] **Step 2: Verify the app builds**

Run: `npx vite build`
Expected: Build succeeds (new file isn't imported yet)

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useManageQuizzes.js
git commit -m "refactor: extract useManageQuizzes hook from ManageQuizzes"
```

---

## Task 2: Create sub-components

**Files:**
- Create: `src/components/teachers/manageQuizzes/QuizCard.jsx`
- Create: `src/components/teachers/manageQuizzes/FolderTree.jsx`
- Create: `src/components/teachers/manageQuizzes/QuizToolbar.jsx`
- Create: `src/components/teachers/manageQuizzes/NewFolderModal.jsx`
- Create: `src/components/teachers/manageQuizzes/MoveQuizModal.jsx`

### Step 1: Create `QuizCard.jsx`

Extracted from `getThemeMeta` + `translateThemeName` + `renderQuizCard` (original lines 777-995).

**Required imports:**
```jsx
import React from "react";
import { useTranslation } from "react-i18next";
import { Play, Edit2, Trash2, Copy, Move, Eye, CheckSquare, Square, Calendar, Users } from "lucide-react";
```

Props: `quiz`, `themesById`, `selectedQuizzes`, `highlightedQuizId`, `draggedItem`, `handleDragStart`, `toggleQuizSelection`, `handleStartQuiz`, `handleDuplicate`, `handleDelete`, `setMoveQuizModal`, `setAssignQuizModal`, `setViewAssignmentsModal`, `setView`.

**Important:** `handleStartQuiz` must be the shell's local wrapper (which binds `setView`), NOT `mq.handleStartQuiz` from the hook. The shell creates: `const handleStartQuiz = (quizId) => mq.handleStartQuiz(quizId, (sid) => setView("teacher-control", sid));` and passes this wrapper to QuizCard. The card just calls `handleStartQuiz(quiz.id)` with one argument.

Move `translateThemeName` and `getThemeMeta` functions inside this component (they are only used by the card). Each QuizCard calls `useTranslation()` for `t()`.

The component returns the full card JSX from `renderQuizCard` (lines 852-994). The wrapping `key` prop is NOT set inside the component — it's set by the parent when mapping.

- [ ] **Step 2: Create `FolderTree.jsx`**

Extracted from the recursive `renderFolder` function (original lines 620-774).

**Required imports:**
```jsx
import React from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen, FolderPlus, Edit2, Trash2 } from "lucide-react";
```

Props: `folders`, `quizzes`, `themesById`, `expandedFolders`, `activeFolder`, `editingFolder`, `draggedItem`, `highlightedQuizId`, `toggleFolder`, `setActiveFolder`, `setEditingFolder`, `renameFolder`, `deleteFolder`, `setSelectedParentFolder`, `setShowNewFolderModal`, `handleDragStart`, `handleDragOver`, `handleDrop`, `handleSidebarQuizClick`, `buildFolderTree`, `getQuizzesInFolder`.

This component contains the recursive `renderFolder` function and renders `buildFolderTree(null).map(folder => renderFolder(folder))`. The sidebar quiz items inside expanded folders (original lines 730-769) are also part of this component.

- [ ] **Step 3: Create `QuizToolbar.jsx`**

Extracted from the toolbar section (original lines 1025-1118).

**Required imports:**
```jsx
import React from "react";
import { useTranslation } from "react-i18next";
import { Search, Plus, FolderPlus, Move, Trash2, X, PanelLeftOpen } from "lucide-react";
```

Props: `searchQuery`, `setSearchQuery`, `sortBy`, `setSortBy`, `selectedQuizzes`, `clearSelection`, `bulkDeleteQuizzes`, `setMoveQuizModal`, `setShowNewFolderModal`, `setSelectedParentFolder`, `setMobileFolderPanelOpen`, `setView`.

- [ ] **Step 4: Create `NewFolderModal.jsx`**

Extracted from lines 1326-1363.

**Required imports:**
```jsx
import React from "react";
import { useTranslation } from "react-i18next";
```

Props: `showNewFolderModal`, `selectedParentFolder`, `newFolderName`, `setNewFolderName`, `creatingFolder`, `createFolder`, `onClose` (a callback that sets `showNewFolderModal(false)`, resets `newFolderName("")`, resets `selectedParentFolder(null)`).

```jsx
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
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
          >
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
```

- [ ] **Step 5: Create `MoveQuizModal.jsx`**

Extracted from lines 1365-1441.

**Required imports:**
```jsx
import React from "react";
import { useTranslation } from "react-i18next";
import { Folder, FolderOpen } from "lucide-react";
```

Props: `moveQuizModal`, `folders`, `selectedQuizzes`, `moveQuizToFolder`, `bulkMoveQuizzes`, `setMoveQuizModal`.

The modal handles both single quiz move (`moveQuizModal` is a quiz ID) and bulk move (`moveQuizModal === "bulk"`). It computes folder depth inline for indentation.

- [ ] **Step 6: Verify the app builds**

Run: `npx vite build`
Expected: Build succeeds

- [ ] **Step 7: Commit**

```bash
git add src/components/teachers/manageQuizzes/
git commit -m "refactor: add sub-components for ManageQuizzes decomposition"
```

---

## Task 3: Rewire ManageQuizzes.jsx as a layout shell

**Files:**
- Modify: `src/components/teachers/ManageQuizzes.jsx`

- [ ] **Step 1: Rewrite ManageQuizzes.jsx**

Replace the entire file. The component now:
1. Imports the hook and all sub-components
2. Contains only the main layout JSX (nav, content area, sidebar, grid)
3. Delegates rendering to sub-components

```jsx
import React from "react";
import { useTranslation } from "react-i18next";
import { Plus, Archive, FolderOpen, Search } from "lucide-react";
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

  const handleStartQuiz = (quizId) => {
    mq.handleStartQuiz(quizId, (sessionId) => {
      setView("teacher-control", sessionId);
    });
  };

  // ... main layout JSX ...
  // Uses <QuizToolbar>, <FolderTree>, <QuizCard>, <NewFolderModal>, <MoveQuizModal>
  // The nav bar (lines 1004-1023) stays inline
  // The sidebar sections (All Quizzes, Unfiled Quizzes items + FolderTree) stay inline
  // The quiz grid maps getDisplayedQuizzes() to <QuizCard> components
  // Modals: <NewFolderModal>, <MoveQuizModal>, <AssignQuizModal>, <QuizAssignmentsModal>, <AlertModal>, <ConfirmModal>
}
```

**Key details about the rewiring:**

1. The `handleStartQuiz` wrapper in the component bridges `setView` into the hook's callback pattern
2. The `QuizCard` component receives `setView` directly for edit/preview navigation
3. The desktop sidebar (lines 1224-1274) keeps the "All Quizzes" and "Unfiled Quizzes" items inline, but delegates the folder tree to `<FolderTree>`
4. The mobile folder panel (lines 1154-1221) similarly keeps the "All Quizzes" / "Unfiled" items inline with `<FolderTree>` for the folder list
5. The `NewFolderModal` receives an `onClose` callback that resets the 3 related states
6. `<AssignQuizModal>` and `<QuizAssignmentsModal>` stay as direct imports (they're already separate components)

- [ ] **Step 2: Verify the app builds**

Run: `npx vite build`
Expected: Build succeeds with no errors

- [ ] **Step 3: Run existing tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add src/components/teachers/ManageQuizzes.jsx src/hooks/useManageQuizzes.js
git commit -m "refactor: rewire ManageQuizzes as layout shell with hook + sub-components"
```

---

## Task 4: Cleanup and verify

- [ ] **Step 1: Verify no dead imports in any file**

Check each new file for unused imports and remove them:
- `src/hooks/useManageQuizzes.js`
- `src/components/teachers/manageQuizzes/QuizCard.jsx`
- `src/components/teachers/manageQuizzes/FolderTree.jsx`
- `src/components/teachers/manageQuizzes/QuizToolbar.jsx`
- `src/components/teachers/manageQuizzes/NewFolderModal.jsx`
- `src/components/teachers/manageQuizzes/MoveQuizModal.jsx`
- `src/components/teachers/ManageQuizzes.jsx`

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 3: Run production build**

Run: `npx vite build`
Expected: Clean build, no errors

- [ ] **Step 4: Final commit (if changes needed)**

```bash
git add -A
git commit -m "refactor: cleanup dead imports after ManageQuizzes decomposition"
```

---

## Summary of result

| Before | After |
|--------|-------|
| `ManageQuizzes.jsx` — 1503 lines | `ManageQuizzes.jsx` — ~350 lines (layout shell) |
| | `useManageQuizzes.js` — ~500 lines (all logic) |
| | `QuizCard.jsx` — ~220 lines |
| | `FolderTree.jsx` — ~160 lines |
| | `QuizToolbar.jsx` — ~100 lines |
| | `NewFolderModal.jsx` — ~45 lines |
| | `MoveQuizModal.jsx` — ~85 lines |
| 1 file, 1 responsibility boundary | 7 files, clear separation of concerns |
