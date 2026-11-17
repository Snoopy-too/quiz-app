import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Dialog } from "../ui";

export default function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText,
  cancelText,
  confirmStyle = "primary", // "primary" or "danger"
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const finalConfirmText = confirmText || t("common.confirm") || "Confirm";
  const finalCancelText = cancelText || t("common.cancel") || "Cancel";
  const effectiveBusy = Boolean(isOpen && busy);

  const handleConfirm = async () => {
    if (effectiveBusy || !onConfirm) return;
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={Boolean(isOpen)}
      onClose={onCancel}
      title={title}
      description={message}
      busy={effectiveBusy}
      showCloseButton={false}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={effectiveBusy}>
            {finalCancelText}
          </Button>
          <Button
            variant={confirmStyle === "danger" ? "danger" : "primary"}
            onClick={handleConfirm}
            loading={effectiveBusy}
          >
            {busy ? `${finalConfirmText}...` : finalConfirmText}
          </Button>
        </>
      }
    />
  );
}
