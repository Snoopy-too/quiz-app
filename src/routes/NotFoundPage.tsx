import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Compass } from "lucide-react";
import { Button, Card, CardBody } from "../components/ui";
import { resolveLandingPath } from "../domain/auth";
import { useAppAuth } from "./authContext";

export default function NotFoundPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { appState } = useAppAuth();

  const destination = appState.currentUser ? resolveLandingPath(appState.currentUser) : "/login";

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardBody className="p-8 space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <Compass className="h-7 w-7" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-ink">{t("notFound.title", "Page not found")}</h1>
          <p className="text-sm text-ink-muted">
            {t("notFound.description", "The page you requested does not exist or has moved.")}
          </p>
          <Button onClick={() => navigate(destination)} className="w-full">
            {t("notFound.goToDashboard", "Go to dashboard")}
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
