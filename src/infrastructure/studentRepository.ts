import { supabase } from "../supabaseClient";
import type { Database } from "./database.types";
import { chunkIds } from "../domain/studentSelection";
import {
  batchLinkStudentsSchema,
  batchUnlinkStudentsSchema,
  type BatchLinkStudentsInput,
  type BatchUnlinkStudentsInput,
} from "../schemas/studentManagement";

type UserUpdate = Database["public"]["Tables"]["users"]["Update"];

const DEFAULT_BATCH_SIZE = 100;

export interface BatchUnlinkResult {
  unlinkedCount: number;
}

export interface BatchLinkResult {
  linkedCount: number;
}

/**
 * Unlinks a batch of students from a teacher in chunks so large selections
 * stay within PostgREST query-length limits.
 *
 * Intentionally avoids `.select()` on the update to prevent PostgreSQL
 * UPDATE...RETURNING SELECT-RLS rejections when a teacher or student lacks a
 * school_id.
 */
export async function unlinkStudentsBatch(
  input: BatchUnlinkStudentsInput,
  batchSize = DEFAULT_BATCH_SIZE,
): Promise<BatchUnlinkResult> {
  const parsed = batchUnlinkStudentsSchema.parse(input);
  const chunks = chunkIds(parsed.studentIds, batchSize);
  const payload: UserUpdate = { teacher_id: null };

  let unlinkedCount = 0;

  for (const idChunk of chunks) {
    const { error } = await supabase
      .from("users")
      .update(payload)
      .in("id", idChunk)
      .eq("teacher_id", parsed.teacherId)
      .eq("role", "student");

    if (error) {
      throw error;
    }

    unlinkedCount += idChunk.length;
  }

  return { unlinkedCount };
}

/**
 * Links a batch of currently unlinked students to a teacher in chunks.
 *
 * Scopes updates to `teacher_id IS NULL` and `role = 'student'` (and `school_id`
 * when present) so students already assigned to another teacher or belonging to
 * another school are never overwritten.
 */
export async function linkStudentsBatch(
  input: BatchLinkStudentsInput,
  batchSize = DEFAULT_BATCH_SIZE,
): Promise<BatchLinkResult> {
  const parsed = batchLinkStudentsSchema.parse(input);
  const chunks = chunkIds(parsed.studentIds, batchSize);
  const payload: UserUpdate = { teacher_id: parsed.teacherId };

  let linkedCount = 0;

  for (const idChunk of chunks) {
    let query = supabase
      .from("users")
      .update(payload)
      .in("id", idChunk)
      .is("teacher_id", null)
      .eq("role", "student");

    if (parsed.schoolId) {
      query = query.eq("school_id", parsed.schoolId);
    }

    const { error } = await query;

    if (error) {
      throw error;
    }

    linkedCount += idChunk.length;
  }

  return { linkedCount };
}
