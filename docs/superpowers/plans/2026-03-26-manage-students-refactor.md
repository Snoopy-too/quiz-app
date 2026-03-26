# ManageStudents.jsx Refactoring Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Break down the 1427-line `ManageStudents.jsx` into a custom hook for all logic + 5 focused sub-components, keeping behavior identical.

**Architecture:** Extract all state, data fetching, student CRUD, realtime subscriptions, filtering/sorting, and computed values into `useManageStudents` hook. Extract stats cards, search/filter bar, student table, create student modal, and student details modal into sub-components. The main component becomes a ~120-line layout shell. Fix 6 stale closure bugs with `confirmModal`/`alertModal` spreads.

**Tech Stack:** React 18, Supabase JS, Vitest, i18next, Tailwind CSS, Lucide icons

---

## File Structure

### New files to create:
| File | Responsibility |
|------|---------------|
| `src/hooks/useManageStudents.js` | All state, refs, realtime subscriptions, data fetching, student CRUD, filtering/sorting, computed values |
| `src/components/teachers/manageStudents/StatsCards.jsx` | 4 summary stat cards (total, approved, pending, unverified) |
| `src/components/teachers/manageStudents/SearchFilter.jsx` | Search input + 5 filter status buttons |
| `src/components/teachers/manageStudents/StudentTable.jsx` | Sortable student table with inline action buttons |
| `src/components/teachers/manageStudents/CreateStudentModal.jsx` | Create student form + success credentials display |
| `src/components/teachers/manageStudents/StudentDetailsModal.jsx` | Student details/edit form + performance stats + action buttons |

### Files to modify:
| File | Change |
|------|--------|
| `src/components/teachers/ManageStudents.jsx` | Slim down to ~120-line layout shell importing hook + sub-components |

---

## Task 1: Create `useManageStudents` hook (logic extraction)

**Files:**
- Create: `src/hooks/useManageStudents.js`

Extract from `ManageStudents.jsx` lines 11-697 into a custom hook. The hook receives `appState` and returns all state + actions. `setView` stays in the component.

**Stale closure fixes:** Replace all `{ ...confirmModal, isOpen: false }` with `prev => ({ ...prev, isOpen: false })` functional updater pattern. Affected locations:
- `handleUnlink` lines 264, 268
- `handleReject` lines 338, 341
- `handleDelete` lines 366, 370
- `AlertModal onClose` line 1415 (will be in shell)
- `ConfirmModal onCancel` line 1422 (will be in shell)

- [ ] **Step 1: Create `src/hooks/useManageStudents.js`**

```js
import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import { createClient } from "@supabase/supabase-js";
import { useTranslation } from "react-i18next";

export default function useManageStudents(appState) {
  const { t } = useTranslation();

  // --- All useState declarations (original lines 12-42) ---
  const [students, setStudents] = useState([]);
  const [pendingStudents, setPendingStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("my_students");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: "", message: "", type: "info" });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: "", message: "", onConfirm: null });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newStudentForm, setNewStudentForm] = useState({
    name: "",
    email: "",
    studentId: "",
    password: "",
    confirmPassword: "",
  });
  const [creatingStudent, setCreatingStudent] = useState(false);
  const [createStudentError, setCreateStudentError] = useState("");
  const [createStudentSuccess, setCreateStudentSuccess] = useState(null);
  const [sortColumn, setSortColumn] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    studentId: "",
    password: "",
  });
  const [updatingStudent, setUpdatingStudent] = useState(false);
  const [highlightedIds, setHighlightedIds] = useState(new Set());
  const knownStudentIdsRef = useRef(new Set());

  // --- highlightNewStudents helper (original lines 45-64) --- copy verbatim

  // --- useEffect for init (original lines 66-70) --- copy verbatim

  // --- useEffect for realtime + poll (original lines 72-205) --- copy verbatim

  // --- All functions (original lines 207-633) --- copy verbatim, with these fixes:
  //
  // FIX stale closures in handleUnlink, handleReject, handleDelete:
  //   BEFORE: setConfirmModal({ ...confirmModal, isOpen: false })
  //   AFTER:  setConfirmModal(prev => ({ ...prev, isOpen: false }))
  //
  // Functions to copy:
  //   fetchStudents, handleLink, handleUnlink, handleApprove, handleReject,
  //   handleDelete, resetCreateStudentState, closeCreateStudentModal,
  //   handleCreateStudent, fetchStudentPerformance, viewStudentDetails,
  //   handleUpdateStudent, handleSort

  // --- filteredStudents computed value (original lines 635-697) --- copy verbatim

  return {
    // State
    students, pendingStudents, searchTerm, setSearchTerm,
    filterStatus, setFilterStatus, loading, error,
    selectedStudent, setSelectedStudent, showDetails, setShowDetails,
    alertModal, setAlertModal, confirmModal, setConfirmModal,
    showCreateModal, setShowCreateModal,
    newStudentForm, setNewStudentForm,
    creatingStudent, createStudentError, createStudentSuccess,
    sortColumn, sortDirection, isEditing, setIsEditing,
    editForm, setEditForm, updatingStudent, highlightedIds,
    // Computed
    filteredStudents,
    // Actions
    fetchStudents, handleLink, handleUnlink, handleApprove, handleReject,
    handleDelete, resetCreateStudentState, closeCreateStudentModal,
    handleCreateStudent, fetchStudentPerformance, viewStudentDetails,
    handleUpdateStudent, handleSort,
  };
}
```

The full hook copies all logic from lines 11-697 of `ManageStudents.jsx` verbatim, with the 6 stale closure fixes applied.

- [ ] **Step 2: Verify the hook file is syntactically valid**

Run: `npx -y acorn --ecma2020 --module src/hooks/useManageStudents.js > /dev/null 2>&1 && echo "OK" || echo "SYNTAX ERROR"`
Expected: OK (or check with the build)

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useManageStudents.js
git commit -m "refactor: extract useManageStudents hook from ManageStudents.jsx"
```

---

## Task 2: Create `StatsCards` sub-component

**Files:**
- Create: `src/components/teachers/manageStudents/StatsCards.jsx`

Extract original lines 760-807. The 4 summary stat cards showing total students, approved count, pending count, and unverified count.

- [ ] **Step 1: Create `src/components/teachers/manageStudents/StatsCards.jsx`**

```jsx
import React from "react";
import { UserCheck, CheckCircle, Clock, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function StatsCards({ students, pendingStudents }) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      {/* Card 1: Total Students */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">{t("manageStudents.totalStudents")}</p>
            <p className="text-3xl font-bold text-gray-800">{students.length}</p>
          </div>
          <UserCheck className="text-blue-600" size={40} />
        </div>
      </div>

      {/* Card 2: Approved */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">{t("manageStudents.approved")}</p>
            <p className="text-3xl font-bold text-green-600">
              {students.filter((s) => s.approved).length}
            </p>
          </div>
          <CheckCircle className="text-green-600" size={40} />
        </div>
      </div>

      {/* Card 3: Pending */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">{t("manageStudents.pendingApproval")}</p>
            <p className="text-3xl font-bold text-orange-600">
              {pendingStudents.length}
            </p>
          </div>
          <Clock className="text-orange-600" size={40} />
        </div>
      </div>

      {/* Card 4: Unverified */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">{t("manageStudents.unverifiedEmail")}</p>
            <p className="text-3xl font-bold text-red-600">
              {students.filter((s) => !s.verified).length}
            </p>
          </div>
          <XCircle className="text-red-600" size={40} />
        </div>
      </div>
    </div>
  );
}
```

**Props:** `students` (array), `pendingStudents` (array)

- [ ] **Step 2: Commit**

```bash
git add src/components/teachers/manageStudents/StatsCards.jsx
git commit -m "refactor: extract StatsCards from ManageStudents"
```

---

## Task 3: Create `SearchFilter` sub-component

**Files:**
- Create: `src/components/teachers/manageStudents/SearchFilter.jsx`

Extract original lines 809-870. Search input and 5 filter buttons (my_students, approved, pending, unverified, unlinked).

- [ ] **Step 1: Create `src/components/teachers/manageStudents/SearchFilter.jsx`**

```jsx
import React from "react";
import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function SearchFilter({ searchTerm, setSearchTerm, filterStatus, setFilterStatus }) {
  const { t } = useTranslation();

  const filters = [
    { key: "my_students", label: t("manageStudents.filterMyStudents") },
    { key: "approved", label: t("manageStudents.filterApproved") },
    { key: "pending", label: t("manageStudents.filterPending") },
    { key: "unverified", label: t("manageStudents.filterUnverified") },
    { key: "unlinked", label: t("manageStudents.filterUnlinked") },
  ];

  return (
    <div className="bg-white rounded-xl shadow-md p-6 mb-6">
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder={t("manageStudents.searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-300"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {filters.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilterStatus(key)}
              className={`px-4 py-2 rounded-lg ${
                filterStatus === key
                  ? "bg-green-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Props:** `searchTerm`, `setSearchTerm`, `filterStatus`, `setFilterStatus`

**Note:** The original had 5 individual buttons with repeated styling. This uses a `filters` array to reduce duplication while producing identical HTML output.

- [ ] **Step 2: Commit**

```bash
git add src/components/teachers/manageStudents/SearchFilter.jsx
git commit -m "refactor: extract SearchFilter from ManageStudents"
```

---

## Task 4: Create `StudentTable` sub-component

**Files:**
- Create: `src/components/teachers/manageStudents/StudentTable.jsx`

Extract original lines 872-1002. Sortable table with name/email/studentId/status/joined columns and action buttons per row.

- [ ] **Step 1: Create `src/components/teachers/manageStudents/StudentTable.jsx`**

```jsx
import React from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function StudentTable({
  filteredStudents,
  highlightedIds,
  sortColumn,
  sortDirection,
  handleSort,
  viewStudentDetails,
  handleApprove,
  handleReject,
  handleUnlink,
  handleDelete,
  handleLink,
  currentUserId,
}) {
  const { t } = useTranslation();

  const SortIcon = ({ column }) => {
    if (sortColumn !== column) return null;
    return sortDirection === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />;
  };

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-100 border-b">
          <tr>
            {/* Copy the 6 <th> elements from original lines 877-906 verbatim */}
            {/* Name (sortable), Email, Student ID (sortable), Status, Joined (sortable), Actions */}
          </tr>
        </thead>
        <tbody>
          {filteredStudents.length === 0 ? (
            <tr>
              <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                {t("manageStudents.noStudentsFound")}
              </td>
            </tr>
          ) : (
            filteredStudents.map((student) => (
              <tr key={student.id} className={`border-b hover:bg-gray-50 ${highlightedIds.has(student.id) ? 'student-glow' : ''}`}>
                {/* Copy cell rendering from original lines 919-996 verbatim */}
                {/* Uses currentUserId instead of appState.currentUser.id */}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
```

**Props:** `filteredStudents`, `highlightedIds`, `sortColumn`, `sortDirection`, `handleSort`, `viewStudentDetails`, `handleApprove`, `handleReject`, `handleUnlink`, `handleDelete`, `handleLink`, `currentUserId`

**Important:** The original uses `appState.currentUser.id` to check `student.teacher_id === appState.currentUser.id`. Pass `currentUserId` as a prop from the shell instead.

- [ ] **Step 2: Commit**

```bash
git add src/components/teachers/manageStudents/StudentTable.jsx
git commit -m "refactor: extract StudentTable from ManageStudents"
```

---

## Task 5: Create `CreateStudentModal` sub-component

**Files:**
- Create: `src/components/teachers/manageStudents/CreateStudentModal.jsx`

Extract original lines 1006-1187. Create student form with validation + success credentials display with copy buttons.

- [ ] **Step 1: Create `src/components/teachers/manageStudents/CreateStudentModal.jsx`**

```jsx
import React from "react";
import { CheckCircle, Clock, Copy } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function CreateStudentModal({
  showCreateModal,
  closeCreateStudentModal,
  handleCreateStudent,
  newStudentForm,
  setNewStudentForm,
  creatingStudent,
  createStudentError,
  createStudentSuccess,
  resetCreateStudentState,
}) {
  const { t } = useTranslation();

  if (!showCreateModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        {/* Copy header from original lines 1010-1018 verbatim */}
        {/* Copy form from original lines 1020-1184 verbatim */}
        {/* The success state shows credentials with Copy buttons */}
        {/* The form state shows 5 inputs (name, email, studentId, password, confirmPassword) */}
      </div>
    </div>
  );
}
```

**Props:** `showCreateModal`, `closeCreateStudentModal`, `handleCreateStudent`, `newStudentForm`, `setNewStudentForm`, `creatingStudent`, `createStudentError`, `createStudentSuccess`, `resetCreateStudentState`

- [ ] **Step 2: Commit**

```bash
git add src/components/teachers/manageStudents/CreateStudentModal.jsx
git commit -m "refactor: extract CreateStudentModal from ManageStudents"
```

---

## Task 6: Create `StudentDetailsModal` sub-component

**Files:**
- Create: `src/components/teachers/manageStudents/StudentDetailsModal.jsx`

Extract original lines 1189-1408. Student info display / edit form + performance stats + approve/reject/delete action buttons.

- [ ] **Step 1: Create `src/components/teachers/manageStudents/StudentDetailsModal.jsx`**

```jsx
import React from "react";
import { Award, TrendingUp, CheckCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function StudentDetailsModal({
  showDetails,
  setShowDetails,
  selectedStudent,
  isEditing,
  setIsEditing,
  editForm,
  setEditForm,
  handleUpdateStudent,
  updatingStudent,
  handleApprove,
  handleReject,
  handleDelete,
  currentUserId,
}) {
  const { t } = useTranslation();

  if (!showDetails || !selectedStudent) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Copy header from original lines 1193-1203 verbatim */}
        {/* Copy content div from original lines 1205-1405 verbatim */}
        {/* Uses currentUserId instead of appState.currentUser.id for edit button visibility */}
      </div>
    </div>
  );
}
```

**Props:** `showDetails`, `setShowDetails`, `selectedStudent`, `isEditing`, `setIsEditing`, `editForm`, `setEditForm`, `handleUpdateStudent`, `updatingStudent`, `handleApprove`, `handleReject`, `handleDelete`, `currentUserId`

**Important:** The original uses `appState.currentUser.id` to check if edit button should show (line 1210). Pass `currentUserId` as a prop instead.

- [ ] **Step 2: Commit**

```bash
git add src/components/teachers/manageStudents/StudentDetailsModal.jsx
git commit -m "refactor: extract StudentDetailsModal from ManageStudents"
```

---

## Task 7: Rewire `ManageStudents.jsx` as layout shell

**Files:**
- Modify: `src/components/teachers/ManageStudents.jsx`

Replace the entire file content with a slim layout shell that imports the hook + 5 sub-components.

- [ ] **Step 1: Rewrite `ManageStudents.jsx`**

```jsx
import React from "react";
import { UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import VerticalNav from "../layout/VerticalNav";
import AlertModal from "../common/AlertModal";
import ConfirmModal from "../common/ConfirmModal";
import useManageStudents from "../../hooks/useManageStudents";
import StatsCards from "./manageStudents/StatsCards";
import SearchFilter from "./manageStudents/SearchFilter";
import StudentTable from "./manageStudents/StudentTable";
import CreateStudentModal from "./manageStudents/CreateStudentModal";
import StudentDetailsModal from "./manageStudents/StudentDetailsModal";

export default function ManageStudents({ setView, appState }) {
  const { t } = useTranslation();
  const ms = useManageStudents(appState);

  if (ms.loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <VerticalNav currentView="manage-students" setView={setView} appState={appState} />
        <div className="flex-1 ml-64 flex items-center justify-center">
          <p className="text-xl text-gray-600">{t("manageStudents.loadingStudents")}</p>
        </div>
      </div>
    );
  }

  if (ms.error) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <VerticalNav currentView="manage-students" setView={setView} appState={appState} />
        <div className="flex-1 ml-64 flex items-center justify-center">
          <div className="text-center">
            <p className="text-xl text-red-600 mb-4">{t("manageStudents.errorTitle")}: {ms.error}</p>
            <button
              onClick={() => setView("teacher-dashboard")}
              className="bg-blue-700 text-white px-6 py-3 rounded-lg hover:bg-blue-800"
            >
              {t("manageStudents.backToDashboard")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <VerticalNav currentView="manage-students" setView={setView} appState={appState} />

      <div className="flex-1 ml-64">
        <nav className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 relative z-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <h1 className="text-2xl font-bold text-green-600">{t("manageStudents.title")}</h1>
            <button
              onClick={() => {
                ms.resetCreateStudentState();
                ms.setShowCreateModal(true);
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition self-start md:self-auto"
            >
              <UserPlus size={18} />
              {t("manageStudents.createStudentButton")}
            </button>
          </div>
        </nav>

        <div className="container mx-auto p-6 relative z-0">
          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              <strong>{t("common.note")}:</strong> {t("manageStudents.teacherCodeNote")}
            </p>
          </div>

          <StatsCards students={ms.students} pendingStudents={ms.pendingStudents} />

          <SearchFilter
            searchTerm={ms.searchTerm}
            setSearchTerm={ms.setSearchTerm}
            filterStatus={ms.filterStatus}
            setFilterStatus={ms.setFilterStatus}
          />

          <StudentTable
            filteredStudents={ms.filteredStudents}
            highlightedIds={ms.highlightedIds}
            sortColumn={ms.sortColumn}
            sortDirection={ms.sortDirection}
            handleSort={ms.handleSort}
            viewStudentDetails={ms.viewStudentDetails}
            handleApprove={ms.handleApprove}
            handleReject={ms.handleReject}
            handleUnlink={ms.handleUnlink}
            handleDelete={ms.handleDelete}
            handleLink={ms.handleLink}
            currentUserId={appState.currentUser.id}
          />
        </div>
      </div>

      <CreateStudentModal
        showCreateModal={ms.showCreateModal}
        closeCreateStudentModal={ms.closeCreateStudentModal}
        handleCreateStudent={ms.handleCreateStudent}
        newStudentForm={ms.newStudentForm}
        setNewStudentForm={ms.setNewStudentForm}
        creatingStudent={ms.creatingStudent}
        createStudentError={ms.createStudentError}
        createStudentSuccess={ms.createStudentSuccess}
        resetCreateStudentState={ms.resetCreateStudentState}
      />

      <StudentDetailsModal
        showDetails={ms.showDetails}
        setShowDetails={ms.setShowDetails}
        selectedStudent={ms.selectedStudent}
        isEditing={ms.isEditing}
        setIsEditing={ms.setIsEditing}
        editForm={ms.editForm}
        setEditForm={ms.setEditForm}
        handleUpdateStudent={ms.handleUpdateStudent}
        updatingStudent={ms.updatingStudent}
        handleApprove={ms.handleApprove}
        handleReject={ms.handleReject}
        handleDelete={ms.handleDelete}
        currentUserId={appState.currentUser.id}
      />

      <AlertModal
        isOpen={ms.alertModal.isOpen}
        title={ms.alertModal.title}
        message={ms.alertModal.message}
        type={ms.alertModal.type}
        onClose={() => ms.setAlertModal(prev => ({ ...prev, isOpen: false }))}
      />
      <ConfirmModal
        isOpen={ms.confirmModal.isOpen}
        title={ms.confirmModal.title}
        message={ms.confirmModal.message}
        onConfirm={ms.confirmModal.onConfirm}
        onCancel={() => ms.setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        confirmStyle="danger"
      />
    </div>
  );
}
```

**Note:** The AlertModal `onClose` and ConfirmModal `onCancel` use functional updaters to fix stale closure bugs from the original.

- [ ] **Step 2: Run build to verify**

Run: `npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 3: Run tests**

Run: `npx vitest run --reporter=verbose`
Expected: All existing tests pass

- [ ] **Step 4: Commit**

```bash
git add src/components/teachers/ManageStudents.jsx
git commit -m "refactor: rewire ManageStudents.jsx as layout shell with hook + sub-components"
```

---

## Task 8: Smoke test

**Files:**
- Create: `src/test/useManageStudents.test.js`

- [ ] **Step 1: Create smoke test**

```js
import { describe, it, expect } from "vitest";
import useManageStudents from "../hooks/useManageStudents";

describe("useManageStudents", () => {
  it("exports a function", () => {
    expect(typeof useManageStudents).toBe("function");
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run --reporter=verbose`
Expected: All tests pass including new smoke test

- [ ] **Step 3: Commit**

```bash
git add src/test/useManageStudents.test.js
git commit -m "test: add smoke test for useManageStudents hook"
```
