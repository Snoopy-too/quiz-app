import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  Check,
  Clock,
  Copy,
  Edit2,
  Link2,
  Play,
  Plus,
  QrCode,
  Radio,
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import QRCode from "react-qr-code";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Dialog,
  EmptyState,
  PageHeader,
  Skeleton,
  useToast,
} from "../ui";
import { useTeacherDashboard } from "../../hooks/useTeacherDashboard";
import {
  cancelActiveTeacherSessions,
  startQuizSession,
} from "../../infrastructure/dashboardRepository";
import { supabase } from "../../supabaseClient";
import { formatTeacherCode, generateTeacherCode } from "../../utils/teacherCode";

function getGreetingKey() {
  const hour = new Date().getHours();
  if (hour < 12) return "teacher.greetingMorning";
  if (hour < 18) return "teacher.greetingAfternoon";
  return "teacher.greetingEvening";
}

export default function TeacherDashboard({ appState, setAppState, setView }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const teacher = appState?.currentUser;
  const { data: summary, loading, error, refetch } = useTeacherDashboard(teacher?.id);

  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [showQrDialog, setShowQrDialog] = useState(false);
  const [showHostDialog, setShowHostDialog] = useState(false);
  const [startingQuizId, setStartingQuizId] = useState(null);
  const [showEndSessionConfirm, setShowEndSessionConfirm] = useState(false);
  const [endingSession, setEndingSession] = useState(false);

  useEffect(() => {
    const ensureTeacherCode = async () => {
      if (teacher && teacher.role === "teacher" && !teacher.teacher_code) {
        setGeneratingCode(true);
        try {
          let newCode = "";
          let codeExists = true;
          while (codeExists) {
            newCode = generateTeacherCode();
            const { data: existing } = await supabase
              .from("users")
              .select("id")
              .eq("teacher_code", newCode)
              .maybeSingle();
            codeExists = Boolean(existing);
          }

          const { error: updateErr } = await supabase
            .from("users")
            .update({ teacher_code: newCode })
            .eq("id", teacher.id);

          if (!updateErr) {
            setAppState((prev) => ({
              ...prev,
              currentUser: { ...prev.currentUser, teacher_code: newCode },
            }));
          }
        } catch (err) {
          console.error("Error generating teacher code:", err);
        } finally {
          setGeneratingCode(false);
        }
      }
    };

    ensureTeacherCode();
  }, [teacher?.id, teacher?.role, teacher?.teacher_code, setAppState]);

  const formattedCode = teacher?.teacher_code ? formatTeacherCode(teacher.teacher_code) : "";
  const inviteUrl = formattedCode
    ? `${window.location.origin}/register?teacher=${encodeURIComponent(formattedCode)}`
    : "";

  const handleCopyCode = async () => {
    if (!formattedCode) return;
    try {
      await navigator.clipboard.writeText(formattedCode);
      setCopiedCode(true);
      toast.success(t("teacher.inviteCodeCopied", "Teacher code copied!"));
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      toast.error(t("errors.somethingWentWrong"));
    }
  };

  const handleCopyInviteLink = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedLink(true);
      toast.success(t("teacher.inviteLinkCopied", "Invite link copied!"));
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error(t("errors.somethingWentWrong"));
    }
  };

  const handleHostQuiz = async (quizId) => {
    if (!teacher?.id) return;
    setStartingQuizId(quizId);
    try {
      const sessionId = await startQuizSession(quizId, teacher.id);
      setShowHostDialog(false);
      setView("teacher-control", sessionId);
    } catch (err) {
      if (err instanceof Error && err.message === "NO_QUESTIONS") {
        toast.error(t("errors.noQuestions"));
      } else {
        toast.error(
          `${t("errors.errorStartingQuiz")}: ${err instanceof Error ? err.message : "Error"}`,
        );
      }
    } finally {
      setStartingQuizId(null);
    }
  };

  const handleEndActiveSession = async () => {
    if (!teacher?.id || !summary?.liveSession || endingSession) return;
    setEndingSession(true);
    try {
      await cancelActiveTeacherSessions(teacher.id, summary.liveSession.id);
      setShowEndSessionConfirm(false);
      toast.success(t("teacher.sessionEnded", "Live session ended."));
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("errors.somethingWentWrong"));
    } finally {
      setEndingSession(false);
    }
  };

  const renderInviteCard = () => {
    if (!generatingCode && !teacher?.teacher_code) return null;

    return (
      <Card>
        <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink">
              {t("teacher.yourTeacherInvitationCode")}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">{t("teacher.shareCodeWithStudents")}</p>
          </div>

          {generatingCode ? (
            <Skeleton className="h-10 w-44" />
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg border border-brand-200 bg-brand-50 px-3.5 py-2 font-mono text-base font-bold tracking-wider text-brand-800">
                {formattedCode}
              </span>
              <Button variant="secondary" size="sm" onClick={handleCopyCode}>
                {copiedCode ? (
                  <Check className="h-4 w-4 text-success-600" aria-hidden="true" />
                ) : (
                  <Copy className="h-4 w-4" aria-hidden="true" />
                )}
                {copiedCode ? t("teacher.copied") : t("teacher.copyCode")}
              </Button>
              <Button variant="secondary" size="sm" onClick={handleCopyInviteLink}>
                {copiedLink ? (
                  <Check className="h-4 w-4 text-success-600" aria-hidden="true" />
                ) : (
                  <Link2 className="h-4 w-4" aria-hidden="true" />
                )}
                {t("teacher.copyInviteLink", "Copy invite link")}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setShowQrDialog(true)}>
                <QrCode className="h-4 w-4" aria-hidden="true" />
                {t("teacher.showQr", "Show QR")}
              </Button>
            </div>
          )}
        </CardBody>
      </Card>
    );
  };

  const hasApprovedStudents = (summary?.approvedStudents || 0) > 0;

  return (
    <div className="min-h-screen bg-canvas">
      <PageHeader
        title={t(getGreetingKey(), { name: teacher?.name || t("auth.teacher") })}
        description={t("teacher.teacherDashboard")}
        actions={
          <>
            <Button variant="secondary" onClick={() => setShowHostDialog(true)}>
              <Play className="h-4 w-4" aria-hidden="true" />
              {t("teacher.hostQuiz", "Host a quiz")}
            </Button>
            <Button variant="primary" onClick={() => setView("create-quiz")}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t("nav.newQuiz", "New quiz")}
            </Button>
          </>
        }
      />

      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        {/* Live session banner */}
        {summary?.liveSession && (
          <Card className="border-brand-300 bg-brand-50/70">
            <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-white shrink-0">
                  <Radio className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="brand">{t("teacher.liveNow", "Live now")}</Badge>
                    <span className="font-semibold text-ink">{summary.liveSession.quizTitle}</span>
                  </div>
                  <p className="text-sm text-ink-muted">
                    {t("session.pin")}: <span className="font-mono font-semibold">{summary.liveSession.pin}</span> ·{" "}
                    {t("teacher.livePlayers", {
                      count: 1,
                      players: summary.liveSession.playerCount,
                    })}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Button
                  variant="secondary"
                  disabled={endingSession}
                  onClick={() => setShowEndSessionConfirm(true)}
                >
                  {t("teacher.endSession", "End session")}
                </Button>
                <Button onClick={() => setView("teacher-control", summary.liveSession.id)}>
                  {t("teacher.resumeSession", "Resume")}
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Error state */}
        {error && (
          <Card className="border-danger-600/40">
            <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 text-danger-600">
                <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
                <p className="text-sm font-medium">{error}</p>
              </div>
              <Button variant="secondary" size="sm" onClick={refetch}>
                {t("common.refresh")}
              </Button>
            </CardBody>
          </Card>
        )}

        {/* 4 Stat cards */}
        <section aria-label={t("teacher.statistics")} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, idx) => (
              <Card key={idx}>
                <CardBody className="space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                </CardBody>
              </Card>
            ))
          ) : (
            <>
              <Card interactive onClick={() => setView("manage-quizzes")}>
                <CardBody className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-ink-muted">
                      {t("teacher.statQuizzes", "Quizzes")}
                    </p>
                    <p className="mt-1 text-3xl font-bold text-ink">{summary?.totalQuizzes ?? 0}</p>
                  </div>
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <BookOpen className="h-5 w-5" aria-hidden="true" />
                  </span>
                </CardBody>
              </Card>

              <Card interactive onClick={() => setView("manage-students")}>
                <CardBody className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-ink-muted">
                      {t("teacher.statStudents", "Students")}
                    </p>
                    <p className="mt-1 text-3xl font-bold text-ink">{summary?.totalStudents ?? 0}</p>
                  </div>
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <Users className="h-5 w-5" aria-hidden="true" />
                  </span>
                </CardBody>
              </Card>

              <Card interactive onClick={() => navigate("/teacher/students?filter=pending")}>
                <CardBody className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-ink-muted">
                      {t("teacher.statPending", "Pending approvals")}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <p className="text-3xl font-bold text-ink">{summary?.pendingApprovals ?? 0}</p>
                      {(summary?.pendingApprovals ?? 0) > 0 && (
                        <Badge variant="warning">{t("teacher.pendingApproval")}</Badge>
                      )}
                    </div>
                  </div>
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                    <Clock className="h-5 w-5" aria-hidden="true" />
                  </span>
                </CardBody>
              </Card>

              <Card interactive onClick={() => setView("reports")}>
                <CardBody className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-ink-muted">
                      {t("teacher.statAvgScore", "Avg accuracy (7 days)")}
                    </p>
                    <p className="mt-1 text-3xl font-bold text-ink">
                      {summary?.avgAccuracy7d !== null && summary?.avgAccuracy7d !== undefined
                        ? `${summary.avgAccuracy7d}%`
                        : "—"}
                    </p>
                  </div>
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <BarChart3 className="h-5 w-5" aria-hidden="true" />
                  </span>
                </CardBody>
              </Card>
            </>
          )}
        </section>

        {/* Show invite card above fold if teacher has 0 approved students */}
        {!hasApprovedStudents && renderInviteCard()}

        {/* First-run empty state or recent quizzes + due assignments */}
        {!loading && summary && summary.totalQuizzes === 0 ? (
          <EmptyState
            icon={<Plus className="h-6 w-6" aria-hidden="true" />}
            title={t("quiz.noQuizzes")}
            description={t("manager.getStarted")}
            primaryAction={{
              label: t("manager.createYourFirstQuiz"),
              onClick: () => setView("create-quiz"),
            }}
            secondaryAction={{
              label: t("teacher.browseLibrary", "Browse the library"),
              onClick: () => setView("public-quizzes"),
            }}
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Recently created unplayed quizzes */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-ink">
                  {t(
                    "teacher.recentQuizzes",
                    "Recently Created Quizzes That Have Not Had A Live Play Yet",
                  )}
                </h2>
                <Button variant="ghost" size="sm" onClick={() => setView("manage-quizzes")}>
                  {t("student.viewAll", "View all")}
                </Button>
              </CardHeader>
              <CardBody className="divide-y divide-line p-0">
                {loading ? (
                  <div className="space-y-3 p-5">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : !summary || summary.recentQuizzes.length === 0 ? (
                  <p className="p-5 text-sm text-ink-muted">
                    {t(
                      "teacher.noUnplayedQuizzes",
                      "No unplayed quizzes — all of your quizzes have had a live play.",
                    )}
                  </p>
                ) : (
                  summary.recentQuizzes.map((quiz) => (
                    <div
                      key={quiz.id}
                      className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-ink">{quiz.title}</p>
                        <p className="text-xs text-ink-muted">
                          {quiz.questionCount}{" "}
                          {quiz.questionCount === 1 ? t("quiz.question") : t("quiz.questions")} ·{" "}
                          {quiz.lastPlayedAt
                            ? new Date(quiz.lastPlayedAt).toLocaleDateString()
                            : t("teacher.lastPlayedNever", "Not hosted yet")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="primary"
                          loading={startingQuizId === quiz.id}
                          onClick={() => handleHostQuiz(quiz.id)}
                        >
                          <Play className="h-3.5 w-3.5" aria-hidden="true" />
                          {t("teacher.hostAction", "Host")}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setView("edit-quiz", quiz.id)}
                        >
                          <Edit2 className="h-3.5 w-3.5" aria-hidden="true" />
                          {t("common.edit")}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardBody>
            </Card>

            {/* Assignments due this week */}
            <Card>
              <CardHeader>
                <h2 className="text-base font-semibold text-ink">
                  {t("teacher.dueAssignments", "Assignments due this week")}
                </h2>
              </CardHeader>
              <CardBody className="space-y-4">
                {loading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-14 w-full" />
                    <Skeleton className="h-14 w-full" />
                  </div>
                ) : !summary || summary.dueAssignments.length === 0 ? (
                  <p className="text-sm text-ink-muted">
                    {t("teacher.noDueAssignments", "No assignments due this week.")}
                  </p>
                ) : (
                  summary.dueAssignments.map((item) => {
                    const pct =
                      item.totalCount > 0
                        ? Math.round((item.completedCount / item.totalCount) * 100)
                        : 0;
                    return (
                      <div key={`${item.quizId}-${item.deadline}`} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <span className="truncate font-medium text-ink">{item.quizTitle}</span>
                          <span className="text-xs text-ink-muted shrink-0">
                            {item.completedCount}/{item.totalCount}
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
                          <div
                            className="h-full rounded-full bg-brand-600 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-xs text-ink-muted">
                          {t("assignedQuizzes.deadline")}:{" "}
                          {new Date(item.deadline).toLocaleDateString()}
                        </p>
                      </div>
                    );
                  })
                )}
              </CardBody>
            </Card>
          </div>
        )}

        {/* Below fold once teacher has >= 1 approved student */}
        {hasApprovedStudents && renderInviteCard()}
      </div>

      {/* Host a Quiz Picker Dialog */}
      <Dialog
        open={showHostDialog}
        onClose={() => setShowHostDialog(false)}
        title={t("teacher.selectQuizToHost", "Select a quiz to host")}
        size="lg"
      >
        <div className="max-h-96 divide-y divide-line overflow-y-auto -mx-2 px-2">
          {!summary || summary.allQuizzes.length === 0 ? (
            <div className="py-6 text-center space-y-3">
              <p className="text-sm text-ink-muted">{t("quiz.noQuizzes")}</p>
              <Button
                onClick={() => {
                  setShowHostDialog(false);
                  setView("create-quiz");
                }}
              >
                {t("manager.createYourFirstQuiz")}
              </Button>
            </div>
          ) : (
            summary.allQuizzes.map((quiz) => (
              <div key={quiz.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{quiz.title}</p>
                  <p className="text-xs text-ink-muted">
                    {quiz.questionCount}{" "}
                    {quiz.questionCount === 1 ? t("quiz.question") : t("quiz.questions")}
                  </p>
                </div>
                <Button
                  size="sm"
                  loading={startingQuizId === quiz.id}
                  onClick={() => handleHostQuiz(quiz.id)}
                >
                  <Play className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("teacher.hostAction", "Host")}
                </Button>
              </div>
            ))
          )}
        </div>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog
        open={showQrDialog}
        onClose={() => setShowQrDialog(false)}
        title={t("teacher.inviteQrTitle", "Student Registration QR Code")}
        description={t(
          "teacher.inviteQrDesc",
          "Students can scan this code to open the registration page with your teacher code pre-filled.",
        )}
        footer={
          <Button variant="secondary" onClick={() => setShowQrDialog(false)}>
            {t("common.close")}
          </Button>
        }
      >
        {inviteUrl && (
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="rounded-xl border border-line bg-white p-4">
              <QRCode value={inviteUrl} size={192} />
            </div>
            <p className="font-mono text-lg font-bold tracking-wider text-brand-700">
              {formattedCode}
            </p>
          </div>
        )}
      </Dialog>

      {/* End Live Session Confirmation Dialog */}
      <Dialog
        open={showEndSessionConfirm}
        onClose={() => !endingSession && setShowEndSessionConfirm(false)}
        busy={endingSession}
        showCloseButton={false}
        title={t("teacher.endSessionConfirmTitle", "End live session?")}
        description={t("teacher.endSessionConfirmMessage", {
          title: summary?.liveSession?.quizTitle || t("quiz.quiz"),
          pin: summary?.liveSession?.pin || "",
        })}
        footer={
          <>
            <Button
              variant="secondary"
              disabled={endingSession}
              onClick={() => setShowEndSessionConfirm(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="danger"
              loading={endingSession}
              onClick={handleEndActiveSession}
            >
              {t("teacher.endSession", "End session")}
            </Button>
          </>
        }
      />
    </div>
  );
}
