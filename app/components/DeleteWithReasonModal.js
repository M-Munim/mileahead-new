'use client';

import { useState, useEffect } from 'react';
import { X, Trash2, Loader, AlertCircle } from 'lucide-react';
import { useFocusTrap } from '@/app/hooks/useFocusTrap';

/**
 * "Delete X?" with a required reason (kept in the activity log).
 * `onSubmit(reason)` deletes and closes; it throws { message } on error.
 */
export default function DeleteWithReasonModal({ title, detail, placeholder = 'e.g. Entered by mistake', onClose, onSubmit }) {
  const modalRef = useFocusTrap(true, onClose);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (reason.trim().length < 3) {
      setError('Please write why this is deleted.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSubmit(reason.trim());
    } catch (err) {
      setError(err?.message || 'Could not delete. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 modal-backdrop z-50 flex items-center justify-center p-4">
      <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="delete-reason-title" className="bg-white shadow-xl w-full max-w-md animate-fade-in-scale">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5 min-w-0">
            <Trash2 className="w-5 h-5 text-red-600 shrink-0" aria-hidden="true" />
            <h2 id="delete-reason-title" className="text-base font-semibold text-gray-900 truncate">{title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="btn-icon p-1.5 hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6" noValidate>
          {detail && <p className="text-sm text-gray-700 mb-3">{detail}</p>}
          <label htmlFor="delete-reason">Reason<span className="text-red-500" aria-hidden="true"> *</span></label>
          <textarea
            id="delete-reason"
            value={reason}
            onChange={(e) => { setReason(e.target.value); if (error) setError(''); }}
            placeholder={placeholder}
            aria-invalid={!!error}
            maxLength={250}
            autoFocus
          />
          {error && (
            <div className="mt-3 flex items-start gap-2 px-3 py-2 text-xs bg-red-50 border border-red-200 text-red-700" role="alert">
              <AlertCircle className="w-4 h-4 shrink-0 mt-px" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}
          <div className="form-footer">
            <button type="button" onClick={onClose} className="px-5 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-5 py-2 text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50">
              {saving ? <Loader className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Trash2 className="w-4 h-4" aria-hidden="true" />}
              {saving ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
