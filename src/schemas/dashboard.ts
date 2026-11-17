import { z } from "zod";

export const GamePinSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Please enter a valid 6-digit PIN");

export const LiveSessionSummarySchema = z.object({
  id: z.string(),
  pin: z.string(),
  status: z.string(),
  quizTitle: z.string(),
  playerCount: z.number().int().nonnegative(),
});

export const RecentQuizSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  questionCount: z.number().int().nonnegative(),
  lastPlayedAt: z.string().nullable(),
  createdAt: z.string(),
});

export const TeacherDueAssignmentSchema = z.object({
  quizId: z.string(),
  quizTitle: z.string(),
  deadline: z.string(),
  totalCount: z.number().int().nonnegative(),
  completedCount: z.number().int().nonnegative(),
});

export const TeacherDashboardSummarySchema = z.object({
  totalQuizzes: z.number().int().nonnegative(),
  totalStudents: z.number().int().nonnegative(),
  approvedStudents: z.number().int().nonnegative(),
  pendingApprovals: z.number().int().nonnegative(),
  avgAccuracy7d: z.number().nullable(),
  liveSession: LiveSessionSummarySchema.nullable(),
  recentQuizzes: z.array(RecentQuizSummarySchema),
  allQuizzes: z.array(RecentQuizSummarySchema),
  dueAssignments: z.array(TeacherDueAssignmentSchema),
});

export type TeacherDashboardSummary = z.infer<typeof TeacherDashboardSummarySchema>;
export type RecentQuizSummary = z.infer<typeof RecentQuizSummarySchema>;
export type LiveSessionSummary = z.infer<typeof LiveSessionSummarySchema>;
export type TeacherDueAssignment = z.infer<typeof TeacherDueAssignmentSchema>;

export const StudentDueAssignmentSchema = z.object({
  id: z.string(),
  quizId: z.string(),
  quizTitle: z.string(),
  deadline: z.string(),
  status: z.string(),
  currentQuestionIndex: z.number().int().nonnegative(),
  totalQuestions: z.number().int().nonnegative(),
});

export const StudentRecentResultSchema = z.object({
  id: z.string(),
  source: z.enum(["session", "assignment"]),
  quizTitle: z.string(),
  score: z.number(),
  correctCount: z.number().int().nonnegative(),
  totalCount: z.number().int().nonnegative(),
  accuracyPct: z.number().nonnegative(),
  completedAt: z.string(),
});

export const ActiveRejoinSessionSchema = z.object({
  id: z.string(),
  status: z.string(),
  pin: z.string(),
  quizTitle: z.string(),
  participantScore: z.number(),
});

export const StudentDashboardSummarySchema = z.object({
  pendingAssignmentsCount: z.number().int().nonnegative(),
  dueAssignments: z.array(StudentDueAssignmentSchema),
  recentResults: z.array(StudentRecentResultSchema),
  activeSession: ActiveRejoinSessionSchema.nullable(),
});

export type StudentDashboardSummary = z.infer<typeof StudentDashboardSummarySchema>;
export type StudentDueAssignment = z.infer<typeof StudentDueAssignmentSchema>;
export type StudentRecentResult = z.infer<typeof StudentRecentResultSchema>;
export type ActiveRejoinSession = z.infer<typeof ActiveRejoinSessionSchema>;
