import React from "react";
import AlertModal from "../../common/AlertModal";
import ConfirmModal from "../../common/ConfirmModal";

export default function BackgroundWrapper({
  backgroundConfig,
  alertModal,
  confirmModal,
  setAlertModal,
  setConfirmModal,
  overlayStrength = 0.45,
  children,
}) {
  const useOverlay = backgroundConfig.overlay;

  return (
    <>
      <div className="min-h-screen relative" style={backgroundConfig.style}>
        {useOverlay && (
          <div
            className="absolute inset-0"
            style={{ backgroundColor: `rgba(0, 0, 0, ${overlayStrength})` }}
          />
        )}
        <div className="relative z-10 min-h-screen flex flex-col">
          {children}
        </div>
      </div>
      <AlertModal
        isOpen={alertModal.isOpen}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
      />
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        confirmStyle="danger"
      />
    </>
  );
}
