'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Save, Loader2, AlertCircle, Receipt, Paperclip, FileText, Trash2 } from 'lucide-react';
import { useFocusTrap } from '@/app/hooks/useFocusTrap';
import { isoDate } from '../../utils/dayClose';
import { readAmount } from '../../utils/inventory';
import { EXPENSE_TYPES, EXPENSE_LABEL, PAID_TO, NOTE_EXAMPLE, BILL_ACCEPT, BILL_MAX_BYTES } from '../../utils/expenses';

/**
 * Add or edit an expense, with an optional bill file (PDF or photo).
 * `onSubmit(formData)` saves and closes; it throws { message } on error.
 */
export default function ExpenseModal({ expense, onClose, onSubmit }) {
  const modalRef = useFocusTrap(true, onClose);
  const fileRef = useRef(null);
  const [type, setType] = useState(expense?.type || 'utility');
  const [date, setDate] = useState(expense?.expense_date || isoDate(new Date()));
  const [amount, setAmount] = useState(expense ? String(expense.amount) : '');
  const [paidTo, setPaidTo] = useState(expense?.paid_to || '');
  const [note, setNote] = useState(expense?.note || '');
  const [file, setFile] = useState(null);
  const [removeBill, setRemoveBill] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const pickFile = (e) => {
    const f = e.target.files?.[0] || null;
    if (f && !BILL_ACCEPT.split(',').includes(f.type)) {
      setError('The bill must be a PDF or a photo (JPG, PNG, WEBP).');
      e.target.value = '';
      return;
    }
    if (f && f.size > BILL_MAX_BYTES) {
      setError('The bill file is larger than 10 MB. Take a smaller photo or scan.');
      e.target.value = '';
      return;
    }
    setError('');
    setFile(f);
    if (f) setRemoveBill(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    const n = readAmount(amount);
    const problem = !date ? 'Please pick the date.'
      : n === null || n <= 0 ? 'Please enter the amount, e.g. 1800 or 450.50.'
      : type === 'salary' && !paidTo.trim() ? 'Please enter the worker\'s name.'
      : null;
    if (problem) {
      setError(problem);
      return;
    }
    const fd = new FormData();
    fd.append('type', type);
    fd.append('expense_date', date);
    fd.append('amount', String(n));
    fd.append('paid_to', paidTo.trim());
    fd.append('note', note.trim());
    if (file) fd.append('bill', file);
    else if (removeBill) fd.append('remove_bill', 'true');
    setSaving(true);
    setError('');
    try {
      await onSubmit(fd);
    } catch (err) {
      setError(err?.message || 'Could not save the expense.');
      setSaving(false);
    }
  };

  const [paidLabel, paidExample] = PAID_TO[type];
  const keepsBill = expense?.has_bill && !removeBill && !file;

  return (
    <div className="fixed inset-0 bg-black/40 modal-backdrop z-50 flex items-center justify-center p-4">
      <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="expense-title" className="bg-white shadow-xl w-full max-w-xl max-h-[92vh] flex flex-col animate-fade-in-scale">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <Receipt className="w-5 h-5 text-[var(--primary)]" aria-hidden="true" />
            <h2 id="expense-title" className="text-base font-semibold text-gray-900">{expense ? 'Edit expense' : 'Add expense'}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="btn-icon p-1.5 hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto" noValidate>
          <fieldset disabled={saving} className="space-y-4">
            <div>
              <span className="block text-sm font-medium text-gray-700 mb-1">Type<span className="text-red-500" aria-hidden="true"> *</span></span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" role="radiogroup" aria-label="Type">
                {EXPENSE_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={type === t}
                    onClick={() => setType(t)}
                    className={`px-3 py-2 text-sm text-left border transition-colors ${
                      type === t ? 'border-[var(--primary)] bg-[var(--primary)]/5 font-medium text-gray-900' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {EXPENSE_LABEL[t]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="exp-date">Date<span className="text-red-500" aria-hidden="true"> *</span></label>
                <input id="exp-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <label htmlFor="exp-amount">Amount (QAR)<span className="text-red-500" aria-hidden="true"> *</span></label>
                <input id="exp-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 1800" autoFocus={!expense} />
              </div>
            </div>

            <div>
              <label htmlFor="exp-paid-to">
                {paidLabel}
                {type === 'salary' && <span className="text-red-500" aria-hidden="true"> *</span>}
              </label>
              <input id="exp-paid-to" value={paidTo} onChange={(e) => setPaidTo(e.target.value)} maxLength={150} placeholder={paidExample} />
            </div>
            <div>
              <label htmlFor="exp-note">Note</label>
              <input id="exp-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={255} placeholder={NOTE_EXAMPLE[type]} />
            </div>

            <div>
              <span className="block text-sm font-medium text-gray-700 mb-1">Bill (PDF or photo)</span>
              {keepsBill ? (
                <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 bg-gray-50 text-sm">
                  <FileText className="w-4 h-4 text-gray-500 shrink-0" aria-hidden="true" />
                  <span className="truncate mr-auto">{expense.bill_name || 'Saved bill'}</span>
                  <button type="button" onClick={() => fileRef.current?.click()} className="text-xs font-medium text-[var(--primary)] underline">Replace</button>
                  <button type="button" onClick={() => setRemoveBill(true)} className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700">
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" /> Remove
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 px-3 py-3 border border-dashed border-gray-300 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <Paperclip className="w-4 h-4" aria-hidden="true" />
                  {file ? <span className="truncate">{file.name}</span> : 'Attach the bill (optional, up to 10 MB)'}
                </button>
              )}
              {file && (
                <button type="button" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ''; }} className="mt-1 text-[11px] text-gray-500 underline">
                  Don&apos;t attach this file
                </button>
              )}
              {removeBill && !file && (
                <p className="mt-1 text-[11px] text-red-600">
                  The saved bill will be removed when you save.{' '}
                  <button type="button" onClick={() => setRemoveBill(false)} className="underline">Keep it</button>
                </p>
              )}
              <input ref={fileRef} type="file" accept={BILL_ACCEPT} onChange={pickFile} className="hidden" aria-hidden="true" tabIndex={-1} />
            </div>

            {error && (
              <div className="flex items-start gap-2 px-3 py-2 text-xs bg-red-50 border border-red-200 text-red-700" role="alert">
                <AlertCircle className="w-4 h-4 shrink-0 mt-px" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}
          </fieldset>

          <div className="form-footer">
            <button type="button" onClick={onClose} className="px-5 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-5 py-2 text-sm font-medium bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors flex items-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Save className="w-4 h-4" aria-hidden="true" />}
              {expense ? 'Save changes' : 'Save expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
