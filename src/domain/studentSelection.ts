export interface LinkableStudent {
  id: string;
  teacher_id?: string | null;
  school_id?: string | null;
}

export interface SelectionState {
  allVisibleSelected: boolean;
  someVisibleSelected: boolean;
  visibleSelectedCount: number;
  totalSelectedCount: number;
}

/**
 * Returns IDs of students currently linked to the given teacher.
 */
export function getUnlinkableStudentIds(
  students: readonly LinkableStudent[],
  teacherId: string | null | undefined,
): string[] {
  if (!teacherId) return [];
  return students
    .filter((student) => student.teacher_id === teacherId)
    .map((student) => student.id);
}

/**
 * Returns IDs of unlinked students eligible to be linked by a teacher in the same school.
 */
export function getLinkableStudentIds(
  students: readonly LinkableStudent[],
  teacherSchoolId: string | null | undefined,
): string[] {
  return students
    .filter((student) => {
      if (student.teacher_id !== null) return false;
      if (teacherSchoolId && student.school_id !== teacherSchoolId) return false;
      return true;
    })
    .map((student) => student.id);
}

/**
 * Returns IDs eligible for batch selection under the active filter tab.
 */
export function getSelectableStudentIds(
  students: readonly LinkableStudent[],
  filterStatus: string,
  teacherId: string | null | undefined,
  teacherSchoolId?: string | null,
): string[] {
  if (filterStatus === "unlinked") {
    return getLinkableStudentIds(students, teacherSchoolId);
  }
  return getUnlinkableStudentIds(students, teacherId);
}

/**
 * Toggles a single student ID in an immutable selection set.
 */
export function toggleStudentSelection(
  selectedIds: ReadonlySet<string>,
  studentId: string,
): Set<string> {
  const next = new Set(selectedIds);
  if (next.has(studentId)) {
    next.delete(studentId);
  } else {
    next.add(studentId);
  }
  return next;
}

/**
 * Selects or deselects a contiguous range between anchorId and targetId within
 * the ordered visible student IDs (for Shift+click range selection).
 */
export function toggleStudentRangeSelection(
  selectedIds: ReadonlySet<string>,
  orderedVisibleIds: readonly string[],
  anchorId: string | null,
  targetId: string,
): Set<string> {
  if (!anchorId) {
    return toggleStudentSelection(selectedIds, targetId);
  }

  const startIdx = orderedVisibleIds.indexOf(anchorId);
  const endIdx = orderedVisibleIds.indexOf(targetId);

  if (startIdx === -1 || endIdx === -1) {
    return toggleStudentSelection(selectedIds, targetId);
  }

  const [from, to] = startIdx <= endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
  const rangeIds = orderedVisibleIds.slice(from, to + 1);
  const shouldSelect = !selectedIds.has(targetId);

  const next = new Set(selectedIds);
  for (const id of rangeIds) {
    if (shouldSelect) {
      next.add(id);
    } else {
      next.delete(id);
    }
  }
  return next;
}

/**
 * Selects all visible selectable students if any are unselected; otherwise
 * deselects all visible selectable students while preserving non-visible selections.
 */
export function toggleSelectAllVisible(
  selectedIds: ReadonlySet<string>,
  visibleSelectableIds: readonly string[],
): Set<string> {
  const next = new Set(selectedIds);
  if (visibleSelectableIds.length === 0) return next;

  const allVisibleSelected = visibleSelectableIds.every((id) => next.has(id));
  if (allVisibleSelected) {
    for (const id of visibleSelectableIds) {
      next.delete(id);
    }
  } else {
    for (const id of visibleSelectableIds) {
      next.add(id);
    }
  }
  return next;
}

/**
 * Drops any selected IDs that are no longer present in the valid selectable set.
 */
export function pruneSelectedIds(
  selectedIds: ReadonlySet<string>,
  validIds: ReadonlySet<string>,
): Set<string> {
  if (selectedIds.size === 0) return new Set();
  const next = new Set<string>();
  for (const id of selectedIds) {
    if (validIds.has(id)) {
      next.add(id);
    }
  }
  return next;
}

/**
 * Computes checkbox and toolbar selection summary for the currently visible rows.
 */
export function getSelectionState(
  selectedIds: ReadonlySet<string>,
  visibleSelectableIds: readonly string[],
): SelectionState {
  let visibleSelectedCount = 0;
  for (const id of visibleSelectableIds) {
    if (selectedIds.has(id)) {
      visibleSelectedCount += 1;
    }
  }

  const allVisibleSelected =
    visibleSelectableIds.length > 0 && visibleSelectedCount === visibleSelectableIds.length;
  const someVisibleSelected = visibleSelectedCount > 0 && !allVisibleSelected;

  return {
    allVisibleSelected,
    someVisibleSelected,
    visibleSelectedCount,
    totalSelectedCount: selectedIds.size,
  };
}

/**
 * Splits an array of unique IDs into fixed-size chunks for safe batched queries.
 */
export function chunkIds(ids: readonly string[], chunkSize = 100): string[][] {
  if (chunkSize <= 0) {
    throw new RangeError("chunkSize must be a positive integer.");
  }
  const uniqueIds = Array.from(new Set(ids));
  const chunks: string[][] = [];
  for (let i = 0; i < uniqueIds.length; i += chunkSize) {
    chunks.push(uniqueIds.slice(i, i + chunkSize));
  }
  return chunks;
}
