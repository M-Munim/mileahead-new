import { useEffect, useRef } from 'react';

/**
 * Traps focus within a modal/dialog element.
 * Also closes on Escape key press.
 * @param {boolean} isOpen - Whether the modal is open
 * @param {function} onClose - Callback to close the modal
 * @returns {React.RefObject} ref to attach to the modal container
 */
export function useFocusTrap(isOpen, onClose) {
  const ref = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const element = ref.current;
    if (!element) return;

    const focusableSelectors = 'a[href], button:not([disabled]), textarea, input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key !== 'Tab') return;

      const focusableElements = element.querySelectorAll(focusableSelectors);
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    // Focus the first focusable element
    const focusableElements = element.querySelectorAll(focusableSelectors);
    if (focusableElements.length > 0) {
      setTimeout(() => focusableElements[0].focus(), 0);
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return ref;
}
