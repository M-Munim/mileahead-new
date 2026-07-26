'use client';

import { AlertTriangle } from 'lucide-react';
import { useFocusTrap } from '@/app/hooks/useFocusTrap';

const ConfirmationDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to perform this action?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning'
}) => {
  const modalRef = useFocusTrap(isOpen, onClose);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    onClose();
  };

  const getTypeStyles = () => {
    switch (type) {
      case 'error':
        return 'bg-red-50 text-red-600';
      case 'warning':
        return 'bg-yellow-50 text-yellow-600';
      default:
        return 'bg-blue-50 text-blue-600';
    }
  };

  const getTypeIcon = () => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-500" aria-hidden="true" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" aria-hidden="true" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-blue-500" aria-hidden="true" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 modal-backdrop overflow-y-auto">
      <div
        ref={modalRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        className="bg-white shadow-xl w-full max-w-xs sm:max-w-sm md:max-w-md mx-auto animate-fade-in-scale"
      >
        <div className="p-5 sm:p-6">
          <div className="flex items-center mb-4">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full mr-3 ${getTypeStyles()}`}>
              {getTypeIcon()}
            </div>
            <h3 id="confirm-dialog-title" className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>

          <p id="confirm-dialog-message" className="text-gray-600 mb-6 text-sm sm:text-base">{message}</p>

          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors w-full sm:w-auto"
            >
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-[var(--primary)] border border-transparent hover:bg-[var(--primary-hover)] transition-colors w-full sm:w-auto"
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog;
