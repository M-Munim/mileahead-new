'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

const Toast = ({ message, type = 'info', duration = 5000, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      setIsVisible(false);
      if (onClose) onClose();
    }, 200);
  };

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-white border-l-4 border-l-green-500 border-gray-200';
      case 'error':
        return 'bg-white border-l-4 border-l-red-500 border-gray-200';
      case 'warning':
        return 'bg-white border-l-4 border-l-yellow-500 border-gray-200';
      default:
        return 'bg-white border-l-4 border-l-blue-500 border-gray-200';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" aria-hidden="true" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" aria-hidden="true" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" aria-hidden="true" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" aria-hidden="true" />;
    }
  };

  if (!isVisible) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`fixed top-4 right-4 z-[100] flex items-start p-4 border shadow-lg max-w-sm w-full ${getTypeStyles()} ${
        isLeaving ? 'opacity-0 translate-x-4' : 'animate-slide-in-right'
      }`}
      style={{ transition: isLeaving ? 'all 0.2s ease-in' : undefined }}
    >
      <div className="flex-shrink-0 mr-3">
        {getIcon()}
      </div>
      <div className="flex-1 text-sm font-medium text-gray-800">
        {message}
      </div>
      <button
        onClick={handleClose}
        className="flex-shrink-0 ml-3 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
};

export default Toast;
