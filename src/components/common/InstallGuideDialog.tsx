import { Check, ExternalLink, MoreVertical, PlusSquare, Share } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { InstallPlatform } from "../../domain/pwaInstall";
import { Button, Dialog } from "../ui";

export interface InstallGuideDialogProps {
  open: boolean;
  onClose: () => void;
  platform: InstallPlatform;
  isInAppBrowser: boolean;
}

export function InstallGuideDialog({
  open,
  onClose,
  platform,
  isInAppBrowser,
}: InstallGuideDialogProps) {
  const { t } = useTranslation();

  const steps =
    platform === "ios-safari"
      ? [
          { icon: Share, text: t("pwa.iosSafariStep1") },
          { icon: PlusSquare, text: t("pwa.iosSafariStep2") },
          { icon: Check, text: t("pwa.iosSafariStep3") },
        ]
      : platform === "ios-other"
        ? [
            { icon: Share, text: t("pwa.iosOtherStep1") },
            { icon: PlusSquare, text: t("pwa.iosOtherStep2") },
            { icon: Check, text: t("pwa.iosOtherStep3") },
          ]
        : [
            { icon: MoreVertical, text: t("pwa.androidStep1") },
            { icon: PlusSquare, text: t("pwa.androidStep2") },
            { icon: Check, text: t("pwa.androidStep3") },
          ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      title={t("pwa.guideTitle")}
      description={t("pwa.guideSubtitle")}
      footer={
        <Button className="w-full sm:w-auto" onClick={onClose}>
          {t("pwa.gotIt")}
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Visual preview of the actual icon that will appear on the student's phone */}
        <div className="flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 p-3">
          <img
            src="/icons/icon-192.png"
            alt="QuizMaster"
            className="h-12 w-12 shrink-0 rounded-xl shadow-card"
          />
          <div className="min-w-0">
            <p className="text-sm font-bold text-ink">QuizMaster</p>
            <p className="text-xs text-ink-muted">{t("pwa.iconPreviewLabel")}</p>
          </div>
        </div>

        {/* Gentle note if opened inside LINE / Instagram / Messenger */}
        {isInAppBrowser && (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950">
            <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
            <p>{t("pwa.inAppNotice")}</p>
          </div>
        )}

        {/* 3 calm, clearly numbered steps */}
        <ol className="space-y-3">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            return (
              <li
                key={index}
                className="flex items-start gap-3 rounded-xl border border-line bg-surface-muted/60 p-3"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-700 text-xs font-bold text-white">
                  {index + 1}
                </span>
                <p className="flex-1 text-sm leading-relaxed text-ink">{step.text}</p>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-brand-700">
                  <StepIcon className="h-4 w-4" aria-hidden="true" />
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </Dialog>
  );
}

export default InstallGuideDialog;
