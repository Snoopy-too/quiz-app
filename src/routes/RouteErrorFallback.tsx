import { isRouteErrorResponse, useNavigate, useRouteError } from "react-router";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { Button, Card, CardBody } from "../components/ui";
import { isChunkLoadError } from "../utils/lazyWithRetry";

export default function RouteErrorFallback() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const error = useRouteError();

  const isChunkError = isChunkLoadError(error);
  const routeResponse = isRouteErrorResponse(error) ? error : null;

  const title = isChunkError
    ? t("routeError.updateTitle", "Update available")
    : routeResponse
      ? `${routeResponse.status} ${routeResponse.statusText || t("routeError.genericTitle", "Something went wrong")}`
      : t("routeError.genericTitle", "Something went wrong");

  const description = isChunkError
    ? t(
        "routeError.updateDescription",
        "A newer version of the app is available or this page could not finish loading. Reload to get the latest version.",
      )
    : t(
        "routeError.genericDescription",
        "This screen hit an unexpected error. Your quiz data and session are still safe on the server.",
      );

  const errorDetail =
    error instanceof Error && error.message
      ? error.message
      : routeResponse && typeof routeResponse.data === "string"
        ? routeResponse.data
        : null;

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardBody className="p-8 space-y-5">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-danger-50 text-danger-600">
            <AlertTriangle className="h-7 w-7" aria-hidden="true" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-ink">{title}</h1>
            <p className="text-sm text-ink-muted">{description}</p>
          </div>

          {errorDetail && (
            <pre className="text-xs text-left text-ink-muted bg-surface-muted border border-line rounded-lg p-3 overflow-auto max-h-32">
              {errorDetail}
            </pre>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={() => window.location.reload()} className="flex-1">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              {t("routeError.reloadPage", "Reload page")}
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate("/", { replace: true })}
              className="flex-1"
            >
              <Home className="h-4 w-4" aria-hidden="true" />
              {t("routeError.goHome", "Go to dashboard")}
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
