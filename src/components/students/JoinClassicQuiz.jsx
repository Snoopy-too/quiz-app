import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Link as LinkIcon, UserPlus, Users } from "lucide-react";
import { Button, Card, CardBody, Field, Input } from "../ui";
import { useJoinQuiz } from "../../hooks/useJoinQuiz";
import JoinTeam from "./JoinTeam";

export default function JoinClassicQuiz({
  appState,
  setView,
  error,
  setError,
  onBack,
  isApproved,
}) {
  const { t } = useTranslation();
  const [joinPin, setJoinPin] = useState("");

  const joinQuiz = useJoinQuiz({
    userId: appState?.currentUser?.id,
    isApproved: Boolean(isApproved),
    onSuccess: (sessionId) => setView("student-quiz", sessionId),
    onError: (msg) => setError?.(msg),
  });

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
      <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardBody className="space-y-5 p-6 text-center">
            <Button variant="ghost" size="sm" onClick={joinQuiz.cancelJoinTeam} className="self-start">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {t("common.back")}
            </Button>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <Users className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-ink">{t("student.teamModeQuiz")}</h1>
              <p className="mt-1 text-sm text-ink-muted">{t("student.teamModeDescription")}</p>
            </div>
            <div className="space-y-3">
              <Button
                className="w-full justify-start h-auto p-4 text-left"
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
                  setView("create-team");
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
                className="w-full justify-start h-auto p-4 text-left"
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
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (joinQuiz.foundTeam) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardBody className="space-y-4 p-6 text-center">
            <h2 className="text-xl font-bold text-ink">{t("student.joinTeam")}</h2>
            <p className="text-sm text-ink-muted">
              {t("student.yourTeamIsAlreadyInSession", {
                teamName:
                  joinQuiz.foundTeam.teams?.team_name || joinQuiz.foundTeam.teams?.name || "",
              })}
            </p>
            <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
              <h3 className="font-bold text-brand-800">
                {joinQuiz.foundTeam.teams?.team_name || joinQuiz.foundTeam.teams?.name}
              </h3>
            </div>
            <div className="space-y-2">
              <Button className="w-full" loading={joinQuiz.loading} onClick={joinQuiz.confirmJoinTeam}>
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
      <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardBody className="space-y-4 p-6 text-center">
            <h2 className="text-xl font-bold text-ink">{t("student.selectTeam")}</h2>
            <p className="text-sm text-ink-muted">{t("student.selectTeamDescription")}</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {joinQuiz.availableTeams.map((teamEntry) => (
                <Button
                  key={teamEntry.team_id}
                  variant="secondary"
                  className="w-full justify-between"
                  onClick={() => joinQuiz.handleSelectTeam(teamEntry)}
                >
                  <span>{teamEntry.teams?.name || teamEntry.teams?.team_name || "Unknown Team"}</span>
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
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardBody className="space-y-5 p-6 sm:p-8">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t("student.backToDashboard")}
          </Button>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-ink">{t("student.joinQuiz")}</h1>
            <p className="mt-1 text-sm text-ink-muted">{t("student.enterPinFromTeacher")}</p>
          </div>
          <Field label={t("session.enterPin")} error={error}>
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder={t("session.enterPin")}
              value={joinPin}
              onChange={(e) => setJoinPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="h-12 text-center font-mono text-2xl font-bold tracking-widest"
              maxLength={6}
            />
          </Field>
          <Button
            size="lg"
            className="w-full"
            loading={joinQuiz.loading}
            disabled={!isApproved}
            onClick={() => joinQuiz.joinByPin(joinPin)}
          >
            {joinQuiz.loading ? t("student.joining") : t("student.joinQuiz")}
          </Button>
          {!isApproved && (
            <p className="text-center text-xs text-ink-muted">
              {t("student.waitingForTeacherApprovalMessage")}
            </p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
