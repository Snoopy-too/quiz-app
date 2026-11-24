import { z } from "zod";

const studentIdArraySchema = z
  .array(z.string().uuid("Each selected student must have a valid ID."))
  .min(1, "At least one student must be selected.");

export const batchUnlinkStudentsSchema = z.object({
  teacherId: z.string().uuid("Valid teacher ID is required."),
  studentIds: studentIdArraySchema,
});

export const batchLinkStudentsSchema = z.object({
  teacherId: z.string().uuid("Valid teacher ID is required."),
  schoolId: z.string().uuid("Valid school ID is required.").nullable().optional(),
  studentIds: studentIdArraySchema,
});

export type BatchUnlinkStudentsInput = z.infer<typeof batchUnlinkStudentsSchema>;
export type BatchLinkStudentsInput = z.infer<typeof batchLinkStudentsSchema>;
