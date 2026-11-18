import { supabase } from "../supabaseClient";
import {
  StudentDashboardSummarySchema,
  TeacherDashboardSummarySchema,
  type ActiveRejoinSession,
  type RecentQuizSummary,
  type StudentDashboardSummary,
  type StudentRecentResult,
  type TeacherDashboardSummary,
  type TeacherDueAssignment,
} from "../schemas/dashboard";
import { clearActiveSession, getActiveSession } from "../utils/sessionPersistence";

const ACTIVE_SESSION_STATUSES = ["waiting", "active", "question_active", "showing_results"];

export async function fetchTeacherDashboardSummary(
  teacherId: string,
): Promise<TeacherDashboardSummary> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const nowIso = new Date().toISOString();
  const nextWeekIso = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const [quizzesRes, studentsRes, liveRes, assignmentsRes, recentSessionsRes] = await Promise.all([
    supabase
      .from("quizzes")
      .select("id, title, created_at, questions(id), quiz_sessions(created_at, status)")
      .eq("created_by", teacherId)
      .order("created_at", { ascending: false }),
    supabase
      .from("users")
      .select("id, approved")
      .eq("teacher_id", teacherId)
      .eq("role", "student"),
    supabase
      .from("quiz_sessions")
      .select("id, pin, status, created_at, quizzes(title), session_participants(id)")
      .eq("host_id", teacherId)
      .in("status", ACTIVE_SESSION_STATUSES)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("quiz_assignments")
      .select("id, quiz_id, deadline, status, quizzes(title)")
      .eq("teacher_id", teacherId)
      .gte("deadline", nowIso)
      .lte("deadline", nextWeekIso)
      .order("deadline", { ascending: true }),
    supabase
      .from("quiz_sessions")
      .select("id, quizzes(is_survey), quiz_answers(is_correct)")
      .eq("host_id", teacherId)
      .eq("status", "completed")
      .gte("created_at", sevenDaysAgo),
  ]);

  if (quizzesRes.error) throw quizzesRes.error;
  if (studentsRes.error) throw studentsRes.error;
  if (liveRes.error) throw liveRes.error;
  if (assignmentsRes.error) throw assignmentsRes.error;

  const quizzesRows = (quizzesRes.data || []) as Array<{
    id: string;
    title: string | null;
    created_at: string;
    questions?: Array<{ id: string }> | null;
    quiz_sessions?: Array<{ created_at: string | null; status: string }> | null;
  }>;

  const allQuizzes: RecentQuizSummary[] = quizzesRows.map((q) => {
    const sessions = (q.quiz_sessions || []).filter((s) => s.created_at);
    const latest = sessions.sort(
      (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime(),
    )[0];
    return {
      id: q.id,
      title: q.title || "Untitled Quiz",
      questionCount: q.questions?.length || 0,
      lastPlayedAt: latest?.created_at || null,
      createdAt: q.created_at,
    };
  });

  const recentQuizzes = allQuizzes
    .filter((q) => !q.lastPlayedAt)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const studentRows = (studentsRes.data || []) as Array<{ id: string; approved: boolean | null }>;
  const approvedStudents = studentRows.filter((s) => Boolean(s.approved)).length;
  const pendingApprovals = studentRows.filter((s) => !s.approved).length;

  const liveRow = (liveRes.data || [])[0] as
    | {
        id: string;
        pin: string;
        status: string;
        quizzes?: { title?: string | null } | null;
        session_participants?: Array<{ id: string }> | null;
      }
    | undefined;

  const liveSession = liveRow
    ? {
        id: liveRow.id,
        pin: liveRow.pin,
        status: liveRow.status,
        quizTitle: liveRow.quizzes?.title || "Live Quiz",
        playerCount: liveRow.session_participants?.length || 0,
      }
    : null;

  // Group assignments due this week by quizId + deadline day
  const dueMap = new Map<string, TeacherDueAssignment>();
  const assignmentRows = (assignmentsRes.data || []) as Array<{
    id: string;
    quiz_id: string;
    deadline: string;
    status: string | null;
    quizzes?: { title?: string | null } | null;
  }>;

  for (const row of assignmentRows) {
    const key = `${row.quiz_id}__${row.deadline}`;
    const existing = dueMap.get(key);
    const isCompleted = row.status === "completed";
    if (existing) {
      existing.totalCount += 1;
      if (isCompleted) existing.completedCount += 1;
    } else {
      dueMap.set(key, {
        quizId: row.quiz_id,
        quizTitle: row.quizzes?.title || "Assigned Quiz",
        deadline: row.deadline,
        totalCount: 1,
        completedCount: isCompleted ? 1 : 0,
      });
    }
  }

  let avgAccuracy7d: number | null = null;
  if (!recentSessionsRes.error && recentSessionsRes.data) {
    let totalAnswers = 0;
    let totalCorrect = 0;
    const rows = recentSessionsRes.data as Array<{
      quizzes?: { is_survey?: boolean | null } | null;
      quiz_answers?: Array<{ is_correct: boolean | null }> | null;
    }>;
    for (const s of rows) {
      if (s.quizzes?.is_survey) continue;
      for (const ans of s.quiz_answers || []) {
        totalAnswers += 1;
        if (ans.is_correct) totalCorrect += 1;
      }
    }
    if (totalAnswers > 0) {
      avgAccuracy7d = Math.round((totalCorrect / totalAnswers) * 100);
    }
  }

  return TeacherDashboardSummarySchema.parse({
    totalQuizzes: allQuizzes.length,
    totalStudents: studentRows.length,
    approvedStudents,
    pendingApprovals,
    avgAccuracy7d,
    liveSession,
    recentQuizzes,
    allQuizzes,
    dueAssignments: Array.from(dueMap.values()).slice(0, 4),
  });
}

async function detectActiveStudentSession(studentId: string): Promise<ActiveRejoinSession | null> {
  const rejoinStatuses = ["waiting", "active", "question_active", "showing_results"];
  const savedSession = getActiveSession() as { sessionId?: string } | null;

  if (savedSession?.sessionId) {
    const { data: dbSession, error: sessionError } = await supabase
      .from("quiz_sessions")
      .select("id, status, pin, quiz_id, quizzes(title)")
      .eq("id", savedSession.sessionId)
      .maybeSingle();

    if (
      !sessionError &&
      dbSession &&
      rejoinStatuses.includes((dbSession as { status: string }).status)
    ) {
      const { data: participant } = await supabase
        .from("session_participants")
        .select("id, score")
        .eq("session_id", savedSession.sessionId)
        .eq("user_id", studentId)
        .maybeSingle();

      if (participant) {
        const typedSession = dbSession as {
          id: string;
          status: string;
          pin: string;
          quizzes?: { title?: string | null } | null;
        };
        return {
          id: typedSession.id,
          status: typedSession.status,
          pin: typedSession.pin,
          quizTitle: typedSession.quizzes?.title || "Quiz",
          participantScore: (participant as { score?: number | null }).score || 0,
        };
      }
    }

    clearActiveSession();
  }

  const { data: activeParticipants } = await supabase
    .from("session_participants")
    .select("session_id, score, quiz_sessions(id, status, pin, quiz_id, quizzes(title))")
    .eq("user_id", studentId)
    .order("joined_at", { ascending: false })
    .limit(5);

  if (activeParticipants) {
    const rows = activeParticipants as unknown as Array<{
      score?: number | null;
      quiz_sessions?: {
        id: string;
        status: string;
        pin: string;
        quizzes?: { title?: string | null } | null;
      } | null;
    }>;
    const active = rows.find(
      (p) => p.quiz_sessions && rejoinStatuses.includes(p.quiz_sessions.status),
    );
    if (active?.quiz_sessions) {
      return {
        id: active.quiz_sessions.id,
        status: active.quiz_sessions.status,
        pin: active.quiz_sessions.pin,
        quizTitle: active.quiz_sessions.quizzes?.title || "Quiz",
        participantScore: active.score || 0,
      };
    }
  }

  return null;
}

export async function fetchStudentDashboardSummary(
  studentId: string,
): Promise<StudentDashboardSummary> {
  const [dueAssignmentsRes, participationsRes, completedAssignmentsRes, activeSession] =
    await Promise.all([
      supabase
        .from("quiz_assignments")
        .select("id, quiz_id, deadline, status, current_question_index, total_questions, quizzes(title)")
        .eq("student_id", studentId)
        .in("status", ["pending", "in_progress"])
        .gt("deadline", new Date().toISOString())
        .order("deadline", { ascending: true }),
      supabase
        .from("session_participants")
        .select(
          "id, score, joined_at, quiz_sessions(status, quizzes(title, is_survey, questions(id))), quiz_answers(is_correct)",
        )
        .eq("user_id", studentId)
        .order("joined_at", { ascending: false })
        .limit(8),
      supabase
        .from("quiz_assignments")
        .select("id, score, completed_at, correct_answers, total_questions, quizzes(title, is_survey)")
        .eq("student_id", studentId)
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(5),
      detectActiveStudentSession(studentId),
    ]);

  if (dueAssignmentsRes.error) throw dueAssignmentsRes.error;
  if (participationsRes.error) throw participationsRes.error;
  if (completedAssignmentsRes.error) throw completedAssignmentsRes.error;

  const dueRows = (dueAssignmentsRes.data || []) as Array<{
    id: string;
    quiz_id: string;
    deadline: string;
    status: string | null;
    current_question_index: number | null;
    total_questions: number | null;
    quizzes?: { title?: string | null } | null;
  }>;

  const dueAssignments = dueRows.slice(0, 5).map((a) => ({
    id: a.id,
    quizId: a.quiz_id,
    quizTitle: a.quizzes?.title || "Assigned Quiz",
    deadline: a.deadline,
    status: a.status || "pending",
    currentQuestionIndex: a.current_question_index || 0,
    totalQuestions: a.total_questions || 0,
  }));

  const sessionResults: StudentRecentResult[] = (
    (participationsRes.data || []) as Array<{
      id: string;
      score: number | null;
      joined_at: string | null;
      quiz_sessions?: {
        status?: string;
        quizzes?: {
          title?: string | null;
          is_survey?: boolean | null;
          questions?: Array<{ id: string }> | null;
        } | null;
      } | null;
      quiz_answers?: Array<{ is_correct: boolean | null }> | null;
    }>
  )
    .filter((p) => p.quiz_sessions?.status === "completed" && !p.quiz_sessions?.quizzes?.is_survey)
    .map((p) => {
      const answers = p.quiz_answers || [];
      const correctCount = answers.filter((a) => a.is_correct).length;
      const totalCount = p.quiz_sessions?.quizzes?.questions?.length || answers.length;
      return {
        id: p.id,
        source: "session" as const,
        quizTitle: p.quiz_sessions?.quizzes?.title || "Quiz",
        score: p.score || 0,
        correctCount,
        totalCount,
        accuracyPct: totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0,
        completedAt: p.joined_at || new Date().toISOString(),
      };
    });

  const assignmentResults: StudentRecentResult[] = (
    (completedAssignmentsRes.data || []) as Array<{
      id: string;
      score: number | null;
      completed_at: string | null;
      correct_answers: number | null;
      total_questions: number | null;
      quizzes?: { title?: string | null; is_survey?: boolean | null } | null;
    }>
  )
    .filter((a) => !a.quizzes?.is_survey)
    .map((a) => {
      const totalCount = a.total_questions || 0;
      const correctCount = a.correct_answers || 0;
      return {
        id: a.id,
        source: "assignment" as const,
        quizTitle: a.quizzes?.title || "Assigned Quiz",
        score: a.score || 0,
        correctCount,
        totalCount,
        accuracyPct: totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0,
        completedAt: a.completed_at || new Date().toISOString(),
      };
    });

  const recentResults = [...sessionResults, ...assignmentResults]
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    .slice(0, 5);

  return StudentDashboardSummarySchema.parse({
    pendingAssignmentsCount: dueRows.length,
    dueAssignments,
    recentResults,
    activeSession,
  });
}

export async function cancelActiveTeacherSessions(
  hostId: string,
  sessionId?: string,
): Promise<void> {
  const { data: activeRows, error: fetchError } = await supabase
    .from("quiz_sessions")
    .select("id")
    .eq("host_id", hostId)
    .in("status", ACTIVE_SESSION_STATUSES);

  if (fetchError) throw fetchError;

  const targetIds = Array.from(
    new Set([
      ...((activeRows || []) as Array<{ id: string }>).map((row) => row.id),
      ...(sessionId ? [sessionId] : []),
    ]),
  );

  if (targetIds.length === 0) return;

  const { error: updateError } = await supabase
    .from("quiz_sessions")
    .update({ status: "cancelled" })
    .eq("host_id", hostId)
    .in("id", targetIds);

  if (updateError) throw updateError;

  for (const id of targetIds) {
    try {
      await supabase.rpc("cleanup_session_teams", { p_session_id: id });
    } catch (cleanupError) {
      console.warn("[Dashboard] Team cleanup skipped/failed:", cleanupError);
    }
  }
}

export async function startQuizSession(quizId: string, hostId: string): Promise<string> {
  const { data: questions, error: qErr } = await supabase
    .from("questions")
    .select("id")
    .eq("quiz_id", quizId);

  if (qErr) throw qErr;
  if (!questions || questions.length === 0) {
    throw new Error("NO_QUESTIONS");
  }

  await cancelActiveTeacherSessions(hostId);

  const pin = Math.floor(100000 + Math.random() * 900000).toString();
  const { data: session, error: sessionError } = await supabase
    .from("quiz_sessions")
    .insert([
      {
        quiz_id: quizId,
        pin,
        status: "waiting",
        current_question_index: 0,
        host_id: hostId,
      },
    ])
    .select("id")
    .single();

  if (sessionError) throw sessionError;
  return (session as { id: string }).id;
}
