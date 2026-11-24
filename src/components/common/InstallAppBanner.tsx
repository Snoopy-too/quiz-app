import { useState } from "react";
import { Download, Smartphone, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePwaInstall } from "../../hooks/usePwaInstall";
import { Button, Card, CardBody, IconButton, useToast } from "../ui";
import InstallGuideDialog from "./InstallGuideDialog";

/**
 * Calm, non-intrusive card shown on the student dashboard when the app is
 * opened in a mobile browser (not yet launched from the Home Screen).
 */
export function InstallAppBanner() {
  const { t } = useTranslation();
  const toast = useToast();
  const {
    platform,
    isInAppBrowser,
    canNativeInstall,
    shouldShowBanner,
    triggerNativeInstall,
    dismissBanner,
  } = usePwaInstall();

  const [guideOpen, setGuideOpen] = useState(false);

  if (!shouldShowBanner) {
    return null;
  }

  const handleActionClick = async () => {
    if (canNativeInstall) {
      const outcome = await triggerNativeInstall();
      if (outcome === "accepted") {
        toast.success(t("pwa.installedToast"));
        return;
      }
      if (outcome === "unavailable") {
        setGuideOpen(true);
      }
      return;
    }
    setGuideOpen(true);
  };

  return (
    <>
      <Card className="border-line bg-surface">
        <CardBody className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/icons/icon-192.png"
              alt=""
              aria-hidden="true"
              className="h-10 w-10 shrink-0 rounded-xl shadow-card"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">{t("pwa.bannerTitle")}</p>
              <p className="text-xs text-ink-muted">{t("pwa.bannerSubtitle")}</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 shrink-0">
            <Button size="sm" variant="secondary" onClick={handleActionClick}>
              {canNativeInstall ? (
                <Download className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Smartphone className="h-4 w-4" aria-hidden="true" />
              )}
              {canNativeInstall ? t("pwa.addNow") : t("pwa.showHow")}
            </Button>
            <IconButton
              aria-label={t("pwa.dismiss")}
              size="sm"
              variant="ghost"
              onClick={dismissBanner}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </IconButton>
          </div>
        </CardBody>
      </Card>

      <InstallGuideDialog
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        platform={platform}
        isInAppBrowser={isInAppBrowser}
      />
    </>
  );
}

export default InstallAppBanner;
