'use client';

import { useState, useEffect } from 'react';
import { X, ShieldAlert, Loader, AlertCircle } from 'lucide-react';
import { useFocusTrap } from '@/app/hooks/useFocusTrap';

/**
 * Admins can't delete orders. They send a delete request with a reason; the
 * Super Admin sees it and approves (deletes) or keeps the order.
 * `onSubmit(reason)` saves the request and throws on failure.
 */
export default function DeleteRequestModal({ orders, onClose, onSubmit }) {
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
      setError('Please write why this should be deleted.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSubmit(reason.trim());
    } catch (err) {
      console.error('Delete request error', err);
      setError(err?.message || 'Could not send the request. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const ids = orders.map((o) => `#${o.id}`).join(', ');

  return (
    <div className="fixed inset-0 bg-black/40 modal-backdrop z-50 flex items-center justify-center p-4">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-request-title"
        className="bg-white shadow-xl w-full max-w-md animate-fade-in-scale"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-red-600" aria-hidden="true" />
            <div>
              <h2 id="delete-request-title" className="text-base font-semibold text-gray-900">Request delete</h2>
              <p className="text-xs text-gray-500 mt-0.5">The Super Admin will approve or keep {orders.length === 1 ? 'this order' : 'these orders'}.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="btn-icon p-1.5 hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6" noValidate>
          <p className="text-sm text-gray-700 mb-3">
            {orders.length === 1 ? 'Order' : `${orders.length} orders`}: <b>{ids}</b>
          </p>
          <label htmlFor="delete-reason">Reason<span className="text-red-500" aria-hidden="true"> *</span></label>
          <textarea
            id="delete-reason"
            value={reason}
            onChange={(e) => { setReason(e.target.value); if (error) setError(''); }}
            placeholder="e.g. Entered twice by mistake"
            aria-invalid={!!error}
            maxLength={250}
          />
          <p className="mt-1 text-[11px] text-gray-500">Nothing is deleted until the Super Admin approves.</p>

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
              {saving ? <Loader className="w-4 h-4 animate-spin" aria-hidden="true" /> : <ShieldAlert className="w-4 h-4" aria-hidden="true" />}
              {saving ? 'Sending…' : 'Send request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
