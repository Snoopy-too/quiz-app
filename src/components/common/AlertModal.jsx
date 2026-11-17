import { useTranslation } from "react-i18next";
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from "lucide-react";
import { Button, Dialog } from "../ui";

const TYPE_CONFIG = {
  info: {
    icon: Info,
    iconClass: "text-brand-600 bg-brand-50",
    titleClass: "text-ink",
    buttonVariant: "primary",
  },
  success: {
    icon: CheckCircle2,
    iconClass: "text-success-600 bg-emerald-50",
    titleClass: "text-success-600",
    buttonVariant: "primary",
  },
  error: {
    icon: AlertCircle,
    iconClass: "text-danger-600 bg-red-50",
    titleClass: "text-danger-600",
    buttonVariant: "danger",
  },
  warning: {
    icon: AlertTriangle,
    iconClass: "text-warning-500 bg-amber-50",
    titleClass: "text-amber-700",
    buttonVariant: "primary",
  },
};

export default function AlertModal({
  isOpen,
  title,
  message,
  onClose,
  buttonText,
  type = "info", // "info", "success", "error", "warning"
}) {
  const { t } = useTranslation();
  const finalButtonText = buttonText || t("common.ok") || "OK";
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.info;
  const IconComponent = cfg.icon;

  return (
    <Dialog
      open={Boolean(isOpen)}
      onClose={onClose}
      showCloseButton={false}
      title={
        <span className={`inline-flex items-center gap-2.5 ${cfg.titleClass}`}>
          <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${cfg.iconClass}`}>
            <IconComponent className="h-4 w-4" aria-hidden="true" />
          </span>
          <span>{title}</span>
        </span>
      }
      description={message}
      footer={
        <Button variant={cfg.buttonVariant} onClick={onClose}>
          {finalButtonText}
        </Button>
      }
    />
  );
}
