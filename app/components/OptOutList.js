'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertCircle, Search, UserX, Trash2, Plus } from 'lucide-react';
import ConfirmationDialog from './ConfirmationDialog';
import { broadcastService } from '../../utils/axiosInstance';
import { toWhatsAppNumber } from '../../utils/location';
import { dateText } from '../../utils/broadcastText';

/**
 * Customers who never get a broadcast, whatever audience is picked: people
 * who asked at the counter, and later people who reply STOP on WhatsApp.
 * `onToast(message, type)` reports each change.
 */
const MAX_REASON = 255;

/** "97455123456" → "+974 5512 3456"; other countries just get a "+". */
const phoneText = (phone) => {
  const m = /^974(\d{4})(\d{4})$/.exec(phone || '');
  return m ? `+974 ${m[1]} ${m[2]}` : `+${phone}`;
};

export default function OptOutList({ onToast }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [pendingRemove, setPendingRemove] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await broadcastService.getOptOuts();
      setList(res.data?.data || []);
      setLoadError('');
    } catch (err) {
      console.error('Load opt-outs error:', err);
      setLoadError(err?.message || 'Could not load the opt-out list.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(load, 0);
    return () => clearTimeout(first);
  }, [load]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (saving) return;
    const number = toWhatsAppNumber(phone);
    if (!number) {
      setFormError('Enter a valid mobile number, e.g. 5512 3456 or +974 5512 3456.');
      return;
    }
    if (reason.trim().length > MAX_REASON) {
      setFormError(`Keep the reason under ${MAX_REASON} characters.`);
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const already = list.some((o) => o.phone === number);
      await broadcastService.addOptOut({ phone: number, name: name.trim(), reason: reason.trim() });
      setPhone('');
      setName('');
      setReason('');
      onToast(already ? `${phoneText(number)} updated` : `${phoneText(number)} will not get broadcasts`, 'success');
      await load();
    } catch (err) {
      console.error('Add opt-out error:', err);
      setFormError(err?.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const confirmRemove = async () => {
    const item = pendingRemove;
    if (!item) return;
    try {
      await broadcastService.removeOptOut(item.phone);
      onToast(`${phoneText(item.phone)} will get broadcasts again`, 'success');
      await load();
    } catch (err) {
      console.error('Remove opt-out error:', err);
      onToast(err?.message || 'Could not remove the number.', 'error');
    }
  };

  const q = query.trim().toLowerCase();
  const qDigits = q.replace(/\D/g, '');
  const shown = q
    ? list.filter((o) => (qDigits && o.phone.includes(qDigits)) || (o.name || '').toLowerCase().includes(q))
    : list;

  return (
    <div className="p-5">
      <p className="text-sm text-gray-600 mb-4 max-w-2xl">
        Numbers on this list never get a broadcast, whichever customers you pick. Add a customer here when they ask
        not to get offers.
      </p>

      <form onSubmit={handleAdd} noValidate className="mb-5 p-4 border border-gray-200 bg-gray-50/60 max-w-3xl">
        <fieldset disabled={saving} className="grid gap-3 sm:grid-cols-[1fr_1fr_1.4fr_auto] sm:items-end">
          <div>
            <label htmlFor="oo-phone">Mobile number</label>
            <input id="oo-phone" type="tel" dir="ltr" autoComplete="off" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="5512 3456" />
          </div>
          <div>
            <label htmlFor="oo-name">Name <span className="text-gray-400 font-normal">(optional)</span></label>
            <input id="oo-name" autoComplete="off" maxLength={255} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label htmlFor="oo-reason">Reason <span className="text-gray-400 font-normal">(optional)</span></label>
            <input id="oo-reason" autoComplete="off" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Asked at the counter" />
          </div>
          <button type="submit" className="px-4 py-2 text-sm font-medium bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Plus className="w-4 h-4" aria-hidden="true" />} Add
          </button>
        </fieldset>
        {formError && (
          <div className="mt-3 flex items-start gap-2 px-3 py-2 text-xs bg-red-50 border border-red-200 text-red-700" role="alert">
            <AlertCircle className="w-4 h-4 shrink-0 mt-px" aria-hidden="true" />
            <span>{formError}</span>
          </div>
        )}
      </form>

      {loadError && (
        <div className="mb-4 px-3 py-2 flex items-center gap-2 text-sm bg-red-50 border border-red-200 text-red-700" role="alert">
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span className="mr-auto">{loadError}</span>
          <button type="button" onClick={() => { setLoading(true); load(); }} className="text-xs font-semibold underline">Try again</button>
        </div>
      )}

      {list.length > 0 && (
        <div className="relative mb-3 max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <input
            type="search"
            aria-label="Search the opt-out list"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search number or name"
            className="w-full pl-9 pr-3"
          />
        </div>
      )}

      {loading && list.length === 0 ? (
        <div className="py-10 text-center text-gray-500">
          <Loader2 className="w-7 h-7 mx-auto mb-2 text-[var(--primary)] animate-spin" aria-hidden="true" />
          <p className="text-sm">Loading the list…</p>
        </div>
      ) : list.length === 0 ? (
        !loadError && (
          <div className="py-10 text-center text-gray-500">
            <UserX className="w-8 h-8 mx-auto mb-3 text-gray-300" aria-hidden="true" />
            <p className="text-sm">No one has opted out yet.</p>
          </div>
        )
      ) : shown.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">No number or name matches &quot;{query}&quot;.</p>
      ) : (
        <div className="overflow-x-auto border border-gray-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="px-4 py-3 font-medium">Number</th>
                <th className="px-3 py-3 font-medium">Name</th>
                <th className="px-3 py-3 font-medium">Reason</th>
                <th className="px-3 py-3 font-medium">Added</th>
                <th className="px-4 py-3 font-medium"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((o) => (
                <tr key={o.phone} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap tabular-nums" dir="ltr">{phoneText(o.phone)}</td>
                  <td className="px-3 py-3 text-gray-700">{o.name || '—'}</td>
                  <td className="px-3 py-3 text-gray-700 break-words">{o.reason || '—'}</td>
                  <td className="px-3 py-3 text-gray-700 whitespace-nowrap">
                    {dateText(o.created_at)}
                    <span className="block text-xs text-gray-500">
                      {o.source === 'customer' ? 'Customer replied STOP' : o.created_by ? `by ${o.created_by}` : 'by staff'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setPendingRemove(o)}
                      aria-label={`Remove ${phoneText(o.phone)}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 bg-white border border-red-200 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" /> Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmationDialog
        isOpen={!!pendingRemove}
        onClose={() => setPendingRemove(null)}
        onConfirm={confirmRemove}
        type="warning"
        title="Remove from the opt-out list?"
        message={`${phoneText(pendingRemove?.phone)} will start getting broadcasts again.`}
        confirmText="Remove"
      />
    </div>
  );
}
