import { useEffect } from 'react';

export default function AlertModal({
  isOpen,
  title,
  message,
  onClose,
  buttonText = "OK",
  type = "info" // "info", "success", "error"
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const typeStyles = {
    info: "text-blue-600",
    success: "text-green-600",
    error: "text-red-600"
  };

  const buttonStyles = {
    info: "bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600",
    success: "bg-green-600 hover:bg-green-700",
    error: "bg-red-600 hover:bg-red-700"
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-50" />

      {/* Modal */}
      <div
        className="relative bg-white rounded-lg shadow-2xl max-w-md w-full animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 pb-4">
          <h3 className={`text-xl font-semibold ${typeStyles[type]}`}>
            {title}
          </h3>
        </div>

        {/* Body */}
        <div className="px-6 pb-6">
          <p className="text-gray-600 whitespace-pre-line">
            {message}
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 pb-6">
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg font-medium text-white transition-colors ${buttonStyles[type]}`}
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
}
