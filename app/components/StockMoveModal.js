'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle, ArrowDownToLine, ArrowUpFromLine, ShoppingCart, ClipboardList } from 'lucide-react';
import { useFocusTrap } from '@/app/hooks/useFocusTrap';
import { qty, qar, readAmount } from '../../utils/inventory';

/**
 * Record a stock change for one item:
 *   in     stock that came in (bought), with the price paid
 *   use    used in washing (wash supplies)
 *   sell   sold to a customer (items for sale), at the selling price
 *   adjust the count found on the shelf, with why it was different
 * `onSubmit(body)` saves and closes; it throws { message } to show an error.
 */
const TYPES = {
  in: { label: 'Stock in', icon: ArrowDownToLine, button: 'Add stock' },
  use: { label: 'Use', icon: ArrowUpFromLine, button: 'Record use' },
  sell: { label: 'Sell', icon: ShoppingCart, button: 'Record sale' },
  adjust: { label: 'Count', icon: ClipboardList, button: 'Save count' },
};

export default function StockMoveModal({ item, type: startType = 'in', onClose, onSubmit }) {
  const modalRef = useFocusTrap(true, onClose);
  const choices = ['in', item.kind === 'product' ? 'sell' : 'use', 'adjust'];
  // The usual price for this kind of change, ready to change
  const usualPrice = (t) => {
    const p = t === 'in' ? item.cost_price : t === 'sell' ? item.sell_price : null;
    return p != null ? String(p) : '';
  };
  const [type, setTypeState] = useState(choices.includes(startType) ? startType : 'in');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState(() => usualPrice(choices.includes(startType) ? startType : 'in'));
  const setType = (t) => {
    setTypeState(t);
    setPrice(usualPrice(t));
    setError('');
  };
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const n = readAmount(amount);
  const after = n === null ? null : type === 'in' ? item.quantity + n : type === 'adjust' ? n : item.quantity - n;
  const hasPrice = type === 'in' || type === 'sell';
  const p = readAmount(price);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    let problem = null;
    if (n === null) problem = type === 'adjust' ? 'Enter how many you counted.' : 'Enter the quantity (a number, up to 2 decimals).';
    else if (type !== 'adjust' && n === 0) problem = 'The quantity must be more than 0.';
    else if ((type === 'use' || type === 'sell') && n > item.quantity) problem = `Only ${qty(item.quantity)} ${item.unit} in stock.`;
    else if (type === 'adjust' && n === item.quantity) problem = `The stock is already ${qty(item.quantity)} ${item.unit}.`;
    else if (hasPrice && price.trim() && p === null) problem = 'The price must be a number, e.g. 45 or 12.50.';
    else if (type === 'adjust' && !note.trim()) problem = 'Please write why the count is different (e.g. damaged, found extra).';
    if (problem) {
      setError(problem);
      return;
    }
    const body = { item_id: item.id, type, note: note.trim() };
    if (type === 'adjust') body.counted = n;
    else body.quantity = n;
    if (hasPrice && price.trim()) body.unit_price = p;
    setSaving(true);
    setError('');
    try {
      await onSubmit(body);
    } catch (err) {
      setError(err?.message || 'Could not save.');
      setSaving(false);
    }
  };

  const Icon = TYPES[type].icon;

  return (
    <div className="fixed inset-0 bg-black/40 modal-backdrop z-50 flex items-center justify-center p-4">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="stock-move-title"
        className="bg-white shadow-xl w-full max-w-md max-h-[92vh] flex flex-col animate-fade-in-scale"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5 min-w-0">
            <Icon className="w-5 h-5 text-[var(--primary)] shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <h2 id="stock-move-title" className="text-base font-semibold text-gray-900 truncate">{item.name}</h2>
              <p className="text-xs text-gray-500">In stock now: <b>{qty(item.quantity)} {item.unit}</b></p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="btn-icon p-1.5 hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto" noValidate>
          <div className="grid grid-cols-3 gap-1 mb-4" role="tablist" aria-label="What happened">
            {choices.map((t) => {
              const C = TYPES[t].icon;
              return (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={type === t}
                  onClick={() => setType(t)}
                  className={`flex items-center justify-center gap-1.5 px-2 py-2 text-sm font-medium border transition-colors ${
                    type === t ? 'border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--primary-dark)]' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <C className="w-4 h-4" aria-hidden="true" /> {TYPES[t].label}
                </button>
              );
            })}
          </div>

          <fieldset disabled={saving} className="space-y-4">
            <div>
              <label htmlFor="move-amount">
                {type === 'in' ? 'How many came in' : type === 'use' ? 'How many were used' : type === 'sell' ? 'How many were sold' : 'How many are on the shelf'}
                <span className="text-gray-500 font-normal"> ({item.unit})</span>
                <span className="text-red-500" aria-hidden="true"> *</span>
              </label>
              <input id="move-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" autoFocus />
              {after !== null && (
                <p className={`mt-1 text-[11px] ${after < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                  Stock after: <b>{qty(after)} {item.unit}</b>
                </p>
              )}
            </div>

            {hasPrice && (
              <div>
                <label htmlFor="move-price">{type === 'in' ? 'Price paid per' : 'Price per'} {item.unit} (QAR)</label>
                <input id="move-price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Optional" />
                {n !== null && n > 0 && p !== null && (
                  <p className="mt-1 text-[11px] text-gray-500">Total: <b>{qar(n * p)}</b></p>
                )}
                {type === 'in' && <p className="mt-1 text-[11px] text-gray-500">Saved as the item&apos;s cost price.</p>}
              </div>
            )}

            <div>
              <label htmlFor="move-note">
                {type === 'adjust' ? 'Why is it different?' : 'Note'}
                {type === 'adjust' && <span className="text-red-500" aria-hidden="true"> *</span>}
              </label>
              <input
                id="move-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={255}
                placeholder={type === 'in' ? 'e.g. Invoice 1043' : type === 'adjust' ? 'e.g. 1 bottle leaked' : 'Optional'}
              />
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
              {saving ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Icon className="w-4 h-4" aria-hidden="true" />}
              {TYPES[type].button}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
