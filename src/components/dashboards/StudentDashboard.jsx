import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  ClipboardList,
  RefreshCw,
  ShieldAlert,
  Trophy,
  UserPlus,
  Users,
  Link as LinkIcon,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  IconButton,
  Input,
  PageHeader,
  Skeleton,
  useToast,
} from "../ui";
import { useJoinQuiz } from "../../hooks/useJoinQuiz";
import { useStudentDashboard } from "../../hooks/useStudentDashboard";
import { GamePinSchema } from "../../schemas/dashboard";
import { clearActiveSession } from "../../utils/sessionPersistence";
import CreateTeam from "../students/CreateTeam";
import JoinTeam from "../students/JoinTeam";
import StudentResults from "../students/StudentResults";

export default function StudentDashboard({
  appState,
  setAppState: _setAppState,
  setView,
  error,
  setError,
  initialPin = "",
  refreshProfile,
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const student = appState?.currentUser;
  const isApproved = Boolean(student?.approved);

  const [subView, setSubView] = useState(() => {
    try {
      if (sessionStorage.getItem("quizapp_switch_team_session_id")) {
        return "create-team";
      }
    } catch {
      // Ignore storage error
    }
    return "dashboard";
  });

  const [pinOverride, setPinOverride] = useState(null);
  const [pinFieldError, setPinFieldError] = useState(null);
  const [checkingApproval, setCheckingApproval] = useState(false);
  const autoJoinedPinRef = useRef("");

  const pin = pinOverride ?? initialPin;
  const displayedPinError = pinFieldError ?? error ?? null;

  const {
    data: summary,
    loading,
    refetch,
    dismissActiveSession,
  } = useStudentDashboard(student?.id, isApproved);

  const joinQuiz = useJoinQuiz({
    userId: student?.id,
    isApproved,
    onSuccess: (sessionId) => {
      setView("student-quiz", sessionId);
    },
    onError: (msg) => {
      setPinFieldError(msg);
      setError?.(msg);
    },
  });

  useEffect(() => {
    if (
      initialPin &&
      isApproved &&
      GamePinSchema.safeParse(initialPin).success &&
      autoJoinedPinRef.current !== initialPin
    ) {
      autoJoinedPinRef.current = initialPin;
      const timer = window.setTimeout(() => {
        joinQuiz.joinByPin(initialPin);
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [initialPin, isApproved, joinQuiz]);

  const handlePinSubmit = (e) => {
    e.preventDefault();
    const parsed = GamePinSchema.safeParse(pin);
    if (!parsed.success) {
      setPinFieldError(t("student.enterValid6DigitPIN"));
      return;
    }
    setPinFieldError(null);
    joinQuiz.joinByPin(parsed.data);
  };

  const handleCheckApprovalAgain = async () => {
    if (!refreshProfile) return;
    setCheckingApproval(true);
    try {
      const updated = await refreshProfile();
      if (updated?.approved) {
        toast.success(t("student.approvedNow", "Your account has been approved!"));
        refetch();
      } else {
        toast.info(t("student.stillPendingApproval", "Still awaiting teacher approval."));
      }
    } finally {
      setCheckingApproval(false);
    }
  };

  const handleDismissActiveSession = () => {
    clearActiveSession();
    dismissActiveSession();
  };

  if (subView === "create-team") {
    return (
      <CreateTeam
        appState={appState}
        setView={setView}
        error={error}
        setError={setError}
        onBack={() => {
          setSubView("dashboard");
          setError?.(null);
        }}
        isApproved={isApproved}
      />
    );
  }

  if (subView === "results") {
    return (
      <StudentResults
        appState={appState}
        onBack={() => {
          setSubView("dashboard");
          setError?.(null);
        }}
      />
    );
  }

  if (joinQuiz.showJoinTeamByCode && joinQuiz.teamModeSession) {
    return (
      <JoinTeam
        appState={appState}
        setView={setView}
        session={joinQuiz.teamModeSession}
        onBack={() => {
          joinQuiz.setShowJoinTeamByCode(false);
          joinQuiz.setShowTeamModeOptions(true);
        }}
      />
    );
  }

  if (joinQuiz.showTeamModeOptions && joinQuiz.teamModeSession) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <Card>
          <CardBody className="space-y-5 text-center p-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <Users className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-ink">{t("student.teamModeQuiz")}</h1>
              <p className="mt-1 text-sm text-ink-muted">{t("student.teamModeDescription")}</p>
            </div>
            <div className="space-y-3">
              <Button
                className="w-full justify-start p-4 h-auto text-left"
                onClick={() => {
                  if (joinQuiz.teamModeSession?.id) {
                    try {
                      sessionStorage.setItem("quizapp_switch_team_session_id", joinQuiz.teamModeSession.id);
                      sessionStorage.setItem("quizapp_create_team_direct", "1");
                    } catch {
                      // Ignore storage error
                    }
                  }
                  joinQuiz.setShowTeamModeOptions(false);
                  setSubView("create-team");
                }}
              >
                <UserPlus className="h-5 w-5 shrink-0" aria-hidden="true" />
                <div>
                  <div className="font-semibold">{t("student.createNewTeam")}</div>
                  <div className="text-xs opacity-90">{t("student.createNewTeamDesc")}</div>
                </div>
              </Button>
              <Button
                variant="secondary"
                className="w-full justify-start p-4 h-auto text-left"
                onClick={() => {
                  joinQuiz.setShowTeamModeOptions(false);
                  joinQuiz.setShowJoinTeamByCode(true);
                }}
              >
                <LinkIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
                <div>
                  <div className="font-semibold">{t("student.joinExistingTeam")}</div>
                  <div className="text-xs text-ink-muted">{t("student.joinExistingTeamDesc")}</div>
                </div>
              </Button>
              <Button variant="ghost" className="w-full" onClick={joinQuiz.cancelJoinTeam}>
                {t("common.cancel")}
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (joinQuiz.foundTeam) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <Card>
          <CardBody className="space-y-4 text-center p-6">
            <h2 className="text-xl font-bold text-ink">{t("student.joinTeam")}</h2>
            <p className="text-sm text-ink-muted">
              {t("student.yourTeamIsAlreadyInSession", {
                teamName:
                  joinQuiz.foundTeam.teams?.team_name || joinQuiz.foundTeam.teams?.name || "",
              })}
            </p>
            <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
              <p className="font-bold text-brand-800">
                {joinQuiz.foundTeam.teams?.team_name || joinQuiz.foundTeam.teams?.name}
              </p>
            </div>
            <div className="space-y-2">
              <Button
                className="w-full"
                loading={joinQuiz.loading}
                onClick={joinQuiz.confirmJoinTeam}
              >
                {t("student.joinAsTeamMember")}
              </Button>
              <Button variant="secondary" className="w-full" onClick={joinQuiz.cancelJoinTeam}>
                {t("common.cancel")}
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (joinQuiz.availableTeams.length > 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <Card>
          <CardBody className="space-y-4 p-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-ink">{t("student.selectTeam")}</h2>
              <p className="mt-1 text-sm text-ink-muted">{t("student.selectTeamDescription")}</p>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {joinQuiz.availableTeams.map((teamEntry) => (
                <Button
                  key={teamEntry.team_id}
                  variant="secondary"
                  className="w-full justify-between"
                  onClick={() => joinQuiz.handleSelectTeam(teamEntry)}
                >
                  <span>
                    {teamEntry.teams?.name || teamEntry.teams?.team_name || "Team"}
                  </span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              ))}
            </div>
            <Button variant="ghost" className="w-full" onClick={joinQuiz.cancelJoinTeam}>
              {t("common.cancel")}
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      <PageHeader
        title={t("student.welcome", { name: student?.name || t("auth.student") })}
        description={t("student.studentDashboard")}
      />

      <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
        {!isApproved ? (
          <Card className="mx-auto max-w-xl">
            <CardBody className="space-y-4 p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-700">
                <ShieldAlert className="h-7 w-7" aria-hidden="true" />
              </div>
              <h2 className="text-xl font-bold text-ink">{t("student.awaitingTeacherApproval")}</h2>
              <p className="text-sm text-ink-muted">{t("student.approvalMessage")}</p>
              <p className="text-xs text-ink-muted">
                {t(
                  "student.approvalNextSteps",
                  "Your teacher has been notified of your registration. Once approved, click Check again or refresh to start joining quizzes.",
                )}
              </p>
              {refreshProfile && (
                <div className="pt-2">
                  <Button loading={checkingApproval} onClick={handleCheckApprovalAgain}>
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    {t("student.checkAgain", "Check again")}
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>
        ) : (
          <>
            {/* Rejoin Active Session Banner */}
            {summary?.activeSession && (
              <Card className="border-amber-300 bg-amber-50">
                <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-4">
                  <div className="flex items-start gap-3">
                    <RefreshCw className="mt-0.5 h-5 w-5 text-amber-700 shrink-0" aria-hidden="true" />
                    <div>
                      <p className="font-semibold text-amber-950">
                        {t("student.activeQuizFound")}
                      </p>
                      <p className="text-sm text-amber-900">
                        {t("student.ongoingQuiz")}:{" "}
                        <span className="font-semibold">{summary.activeSession.quizTitle}</span> ·{" "}
                        {t("student.currentScore")}: {summary.activeSession.participantScore}{" "}
                        {t("quiz.points")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      onClick={() => setView("student-quiz", summary.activeSession.id)}
                    >
                      {t("student.rejoinQuiz")}
                    </Button>
                    <IconButton
                      aria-label={t("student.dismissActiveSession", "Dismiss")}
                      variant="secondary"
                      onClick={handleDismissActiveSession}
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </IconButton>
                  </div>
                </CardBody>
              </Card>
            )}

            {/* Task-first Join by PIN hero band */}
            <Card className="border-brand-200 bg-gradient-to-br from-brand-50 via-surface to-surface">
              <CardBody className="p-6 sm:p-8">
                <div className="mx-auto max-w-xl space-y-4">
                  <div>
                    <h2 className="text-xl font-bold text-ink">{t("student.joinQuiz")}</h2>
                    <p className="mt-1 text-sm text-ink-muted">
                      {t("student.enterPinFromTeacher")}
                    </p>
                  </div>

                  <form onSubmit={handlePinSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-start">
                    <div className="flex-1">
                      <Field
                        label={t("session.enterPin")}
                        error={displayedPinError}
                        className="space-y-1"
                      >
                        <Input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={6}
                          value={pin}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
                            setPinOverride(digits);
                            if (pinFieldError) setPinFieldError(null);
                            if (error) setError?.(null);
                          }}
                          placeholder={t("student.enterGamePin", "Enter 6-digit game PIN")}
                          className="h-12 text-center font-mono text-xl font-bold tracking-widest"
                        />
                      </Field>
                    </div>
                    <Button
                      type="submit"
                      size="lg"
                      loading={joinQuiz.loading}
                      className="sm:mt-6 h-12 px-7"
                    >
                      {joinQuiz.loading
                        ? t("student.joining")
                        : t("student.joinButton", "Join")}
                    </Button>
                  </form>

                  <div className="flex items-center justify-between pt-1 text-sm">
                    <button
                      type="button"
                      onClick={() => setSubView("create-team")}
                      className="inline-flex items-center gap-1.5 font-medium text-accent-500 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 rounded"
                    >
                      <Users className="h-4 w-4" aria-hidden="true" />
                      {t("student.joinAsTeamLink", "Join as a team")}
                    </button>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Assignments & Recent Results */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-brand-600" aria-hidden="true" />
                    <h2 className="text-base font-semibold text-ink">
                      {t("student.dueAssignmentsTitle", "Assigned quizzes")}
                    </h2>
                    {(summary?.pendingAssignmentsCount ?? 0) > 0 && (
                      <Badge variant="warning">
                        {t("student.dueCount", { count: summary.pendingAssignmentsCount })}
                      </Badge>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setView("assigned-quizzes")}>
                    {t("student.viewAll", "View all")}
                  </Button>
                </CardHeader>
                <CardBody className="divide-y divide-line p-0">
                  {loading ? (
                    <div className="space-y-3 p-5">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : !summary || summary.dueAssignments.length === 0 ? (
                    <p className="p-5 text-sm text-ink-muted">{t("assignedQuizzes.noPendingHint")}</p>
                  ) : (
                    summary.dueAssignments.map((assignment) => (
                      <div
                        key={assignment.id}
                        className="flex items-center justify-between gap-3 px-5 py-3.5"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-ink">{assignment.quizTitle}</p>
                          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-muted">
                            <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>
                              {t("assignedQuizzes.deadline")}:{" "}
                              {new Date(assignment.deadline).toLocaleDateString()}
                            </span>
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() =>
                            navigate(`/student/assignments/${encodeURIComponent(assignment.id)}`)
                          }
                        >
                          {assignment.status === "in_progress"
                            ? t("assignedQuizzes.continueQuiz")
                            : t("actions.start")}
                        </Button>
                      </div>
                    ))
                  )}
                </CardBody>
              </Card>

              <Card>
                <CardHeader className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-brand-600" aria-hidden="true" />
                    <h2 className="text-base font-semibold text-ink">
                      {t("student.recentResultsTitle", "Recent results")}
                    </h2>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setView("student-results")}>
                    {t("student.viewAll", "View all")}
                  </Button>
                </CardHeader>
                <CardBody className="divide-y divide-line p-0">
                  {loading ? (
                    <div className="space-y-3 p-5">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : !summary || summary.recentResults.length === 0 ? (
                    <p className="p-5 text-sm text-ink-muted">
                      {t(
                        "student.noRecentResults",
                        "No completed quizzes yet. Join a live quiz or complete an assignment to see your results.",
                      )}
                    </p>
                  ) : (
                    summary.recentResults.map((result) => (
                      <div
                        key={`${result.source}-${result.id}`}
                        className="flex items-center justify-between gap-3 px-5 py-3.5"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-ink">{result.quizTitle}</p>
                          <p className="text-xs text-ink-muted">
                            {result.correctCount}/{result.totalCount} ·{" "}
                            {new Date(result.completedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge
                            variant={
                              result.accuracyPct >= 80
                                ? "success"
                                : result.accuracyPct >= 60
                                  ? "warning"
                                  : "neutral"
                            }
                          >
                            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                            {result.accuracyPct}%
                          </Badge>
                          <span className="text-sm font-bold text-ink">{result.score}</span>
                        </div>
                      </div>
                    ))
                  )}
                </CardBody>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
