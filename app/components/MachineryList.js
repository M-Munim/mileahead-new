'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertCircle, Plus, Pencil, Trash2, Wrench, X, Save, Download } from 'lucide-react';
import { useFocusTrap } from '@/app/hooks/useFocusTrap';
import { inventoryService } from '../../utils/axiosInstance';
import { isoDate } from '../../utils/dayClose';
import { qar, readAmount, machineryCsv, downloadCsv } from '../../utils/inventory';
import DeleteWithReasonModal from './DeleteWithReasonModal';

const dayText = (iso) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

/** Add / edit one machine: name, purchase date, amount (+ supplier, notes). */
function MachineModal({ machine, onClose, onSubmit }) {
  const modalRef = useFocusTrap(true, onClose);
  const [name, setName] = useState(machine?.name || '');
  const [date, setDate] = useState(machine?.purchase_date || isoDate(new Date()));
  const [amount, setAmount] = useState(machine ? String(machine.amount) : '');
  const [supplier, setSupplier] = useState(machine?.supplier || '');
  const [notes, setNotes] = useState(machine?.notes || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    const problem = !name.trim() ? 'Please enter the machine name.'
      : !date ? 'Please pick the date of purchase.'
      : date > isoDate(new Date()) ? 'The date of purchase can\'t be in the future.'
      : readAmount(amount) === null ? 'Please enter the amount paid, e.g. 2400.'
      : null;
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSubmit({ name: name.trim(), purchase_date: date, amount: readAmount(amount), supplier: supplier.trim(), notes: notes.trim() });
    } catch (err) {
      setError(err?.message || 'Could not save.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 modal-backdrop z-50 flex items-center justify-center p-4">
      <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="machine-title" className="bg-white shadow-xl w-full max-w-md max-h-[92vh] flex flex-col animate-fade-in-scale">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <Wrench className="w-5 h-5 text-[var(--primary)]" aria-hidden="true" />
            <h2 id="machine-title" className="text-base font-semibold text-gray-900">{machine ? `Edit ${machine.name}` : 'Add machine'}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="btn-icon p-1.5 hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto" noValidate>
          <fieldset disabled={saving} className="space-y-4">
            <div>
              <label htmlFor="machine-name">Item<span className="text-red-500" aria-hidden="true"> *</span></label>
              <input id="machine-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={150} placeholder="e.g. Pressure washer" autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="machine-date">Date of purchase<span className="text-red-500" aria-hidden="true"> *</span></label>
                <input id="machine-date" type="date" value={date} max={isoDate(new Date())} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <label htmlFor="machine-amount">Amount (QAR)<span className="text-red-500" aria-hidden="true"> *</span></label>
                <input id="machine-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 2400" />
              </div>
            </div>
            <div>
              <label htmlFor="machine-supplier">Supplier</label>
              <input id="machine-supplier" value={supplier} onChange={(e) => setSupplier(e.target.value)} maxLength={150} placeholder="Optional" />
            </div>
            <div>
              <label htmlFor="machine-notes">Notes</label>
              <input id="machine-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={255} placeholder="e.g. 1 year warranty" />
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
              {machine ? 'Save changes' : 'Add machine'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** Machinery stock record: item, date of purchase, amount. */
export default function MachineryList({ canDelete, reloadKey, onToast }) {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(undefined); // undefined = closed, null = new
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await inventoryService.getMachinery();
      setMachines(res.data?.data || []);
    } catch (err) {
      console.error('Load machinery error:', err);
      setError(err?.message || 'Could not load the machinery.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load, reloadKey]);

  const save = async (body) => {
    if (editing) await inventoryService.updateMachine(editing.id, body);
    else await inventoryService.addMachine(body);
    onToast(`${body.name} ${editing ? 'saved' : 'added'}`);
    setEditing(undefined);
    await load();
  };

  const remove = async (reason) => {
    await inventoryService.removeMachine(deleting.id, reason);
    onToast(`${deleting.name} deleted`);
    setDeleting(null);
    await load();
  };

  const total = machines.reduce((s, m) => s + (m.amount || 0), 0);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-gray-100">
        <p className="text-sm text-gray-600 mr-auto">
          {machines.length} machine{machines.length === 1 ? '' : 's'} · total paid <b className="text-gray-900">{qar(total)}</b>
        </p>
        <button
          type="button"
          onClick={() => downloadCsv(machineryCsv(machines), `MagicTrack-Machinery-${isoDate(new Date())}.csv`)}
          disabled={!machines.length}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-40"
        >
          <Download className="w-4 h-4" aria-hidden="true" /> Excel
        </button>
        <button
          type="button"
          onClick={() => setEditing(null)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors"
        >
          <Plus className="w-4 h-4" aria-hidden="true" /> Add machine
        </button>
      </div>

      {error && (
        <div className="mx-5 mt-4 px-3 py-2 flex items-center gap-2 text-sm bg-red-50 border border-red-200 text-red-700" role="alert">
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span className="mr-auto">{error}</span>
          <button onClick={load} className="text-xs font-semibold underline">Try again</button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs font-semibold text-gray-500">
              <th className="px-5 py-3">Item</th>
              <th className="px-3 py-3">Date of purchase</th>
              <th className="px-3 py-3 text-right">Amount</th>
              <th className="px-3 py-3">Supplier</th>
              <th className="px-3 py-3">Notes</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && machines.length === 0 ? (
              <tr><td colSpan={6} className="py-12 text-center text-gray-500"><Loader2 className="w-5 h-5 animate-spin inline" aria-hidden="true" /> Loading…</td></tr>
            ) : machines.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-gray-500">
                  <Wrench className="w-7 h-7 mx-auto mb-2 text-gray-300" aria-hidden="true" />
                  No machines yet.{' '}
                  <button type="button" onClick={() => setEditing(null)} className="text-[var(--primary)] font-medium underline">Add the first one</button>
                </td>
              </tr>
            ) : machines.map((m) => (
              <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50/60">
                <td className="px-5 py-3 font-medium text-gray-900">{m.name}</td>
                <td className="px-3 py-3 text-gray-700 whitespace-nowrap">{dayText(m.purchase_date)}</td>
                <td className="px-3 py-3 text-right tabular-nums text-gray-900 whitespace-nowrap">{qar(m.amount)}</td>
                <td className="px-3 py-3 text-gray-600">{m.supplier || '—'}</td>
                <td className="px-3 py-3 text-gray-600 max-w-[240px]">{m.notes || '—'}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button type="button" onClick={() => setEditing(m)} title="Edit" aria-label={`Edit ${m.name}`} className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100">
                      <Pencil className="w-4 h-4" aria-hidden="true" />
                    </button>
                    {canDelete && (
                      <button type="button" onClick={() => setDeleting(m)} title="Delete" aria-label={`Delete ${m.name}`} className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50">
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing !== undefined && <MachineModal machine={editing} onClose={() => setEditing(undefined)} onSubmit={save} />}
      {deleting && (
        <DeleteWithReasonModal
          title={`Delete ${deleting.name}?`}
          detail={`Bought ${dayText(deleting.purchase_date)} for ${qar(deleting.amount)}.`}
          placeholder="e.g. Sold / broken / entered twice"
          onClose={() => setDeleting(null)}
          onSubmit={remove}
        />
      )}
    </div>
  );
}
