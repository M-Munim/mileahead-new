'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Loader2, AlertCircle, Pencil, Save, Printer, Clock, User, Car, Gauge, Fuel, Wrench, ShieldCheck } from 'lucide-react';
import { useFocusTrap } from '@/app/hooks/useFocusTrap';
import { jobCardService } from '../../utils/axiosInstance';
import {
  STATUS_LABEL, STATUS_PILL, ACTIONS, NOTE_FOR, FUEL_LABEL, OPEN_STATUSES, QC_ITEMS,
  vehicleText, phoneText, readyMessage,
} from '../../utils/jobCards';
import { qar } from '../../utils/inventory';
import JobDetailsForm, { detailsFrom, detailsBody } from './JobDetailsForm';
import JobCardPhotos from './JobCardPhotos';
import CustomerProfileModal from './CustomerProfileModal';
import { InvoiceForm, InvoicedOrder, ReadyWhatsAppButton } from './JobInvoice';

const when = (d) => (d ? new Date(String(d).replace(' ', 'T')).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function Info({ icon: Icon, label, children }) {
  return (
    <div className="flex gap-2 text-sm">
      <Icon className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" aria-hidden="true" />
      <div className="min-w-0"><span className="block text-[11px] text-gray-500">{label}</span><span className="text-gray-900 break-words">{children || '—'}</span></div>
    </div>
  );
}

/** A printable job card (opens the print dialog in a new window). */
function printJob(job) {
  const w = window.open('', '_blank', 'width=820,height=1000');
  if (!w) return;
  const row = (label, value) => `<tr><th>${esc(label)}</th><td>${esc(value || '—')}</td></tr>`;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(job.job_number)}</title>
    <style>body{font-family:Arial,sans-serif;padding:28px;color:#111;font-size:13px}h1{font-size:20px;margin:0}
    .sub{color:#555;margin:2px 0 18px}table{width:100%;border-collapse:collapse;margin-bottom:16px}
    th,td{border:1px solid #ccc;padding:6px 8px;text-align:left;vertical-align:top}th{background:#f3f3f3;width:30%}
    .services td:last-child,.services th:last-child{text-align:right;width:25%}.sign{display:flex;gap:40px;margin-top:40px}
    .sign div{flex:1;border-top:1px solid #333;padding-top:6px;color:#555}</style></head><body>
    <h1>Magic Track — Job Card ${esc(job.job_number)}</h1>
    <p class="sub">${esc(STATUS_LABEL[job.status])} · Created ${esc(when(job.created_at))}${job.created_by ? ` by ${esc(job.created_by)}` : ''}</p>
    <table>${row('Customer', `${job.customer.name} · ${phoneText(job.customer.phone)}`)}${row('Vehicle', vehicleText(job.vehicle))}
    ${row('Mileage', job.mileage != null ? `${job.mileage.toLocaleString('en-US')} km` : '')}${row('Fuel level', FUEL_LABEL[job.fuel_level])}
    ${row('Existing damage', job.damage_notes)}${row("Customer's requests", job.complaints)}${row('Technician', job.technician)}
    ${row('Promised for', job.promised_at ? when(job.promised_at) : '')}${row('Notes', job.notes)}
    ${job.qc_at ? row('Quality check', `Passed ${when(job.qc_at)}${job.qc_by ? ` by ${job.qc_by}` : ''}`) : ''}
    ${job.order ? row('Invoice', `Order #${job.order.booking_number}`) : ''}</table>
    <table class="services"><tr><th>Service</th><th>Price</th></tr>
    ${job.services.map((s) => `<tr><td>${esc(s.name)}</td><td>${esc(qar(s.price))}</td></tr>`).join('') || '<tr><td colspan="2">—</td></tr>'}
    <tr><th>Total</th><th>${esc(qar(job.total))}</th></tr></table>
    <div class="sign"><div>Customer signature</div><div>Received by</div></div></body></html>`);
  w.document.close();
  w.focus();
  w.print();
}

/**
 * One job card: customer, vehicle, checks, services, the status buttons
 * (with a note where the server needs one), editing while it's open, the
 * timeline, and print. `onChanged(job, message)` after every save.
 */
export default function JobCardModal({ id, technicians = [], onClose, onChanged }) {
  const [profileOpen, setProfileOpen] = useState(false);
  // While the customer profile is open on top, Esc / Tab belong to it
  const modalRef = useFocusTrap(!profileOpen, onClose);
  const [job, setJob] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null); // form values while editing
  const [pending, setPending] = useState(null); // { status, label, needsNote, askTech, qc }
  const [note, setNote] = useState('');
  const [tech, setTech] = useState('');
  const [ticked, setTicked] = useState([]); // QC checklist keys
  const [invoicing, setInvoicing] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await jobCardService.getOne(id);
      setJob(res.data.data);
    } catch (err) {
      setError(err?.message || 'Could not load the job card.');
    }
  }, [id]);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  const ask = (status, label) => {
    setError('');
    if (status === 'invoice') {
      setInvoicing(true);
      return;
    }
    const back = status === 'in_progress' && ['quality_check', 'ready'].includes(job.status);
    setPending({
      status,
      label,
      needsNote: status === 'cancelled' || back,
      back,
      askTech: status === 'in_progress' && job.status === 'open',
      qc: status === 'ready' && job.status === 'quality_check',
    });
    setNote('');
    setTech(job.technician || '');
    setTicked([]);
  };

  const toggleTick = (key) => setTicked((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const changed = (fresh, message) => {
    setJob(fresh);
    onChanged(fresh, message);
  };

  const move = async () => {
    if (pending.needsNote && !note.trim()) {
      setError(pending.status === 'cancelled' ? NOTE_FOR.cancelled : NOTE_FOR.in_progress_back);
      return;
    }
    if (pending.qc && ticked.length < QC_ITEMS.length) {
      setError('Tick every item to pass the quality check. If something is not right, use "Failed: back to work" instead.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await jobCardService.setStatus(id, {
        status: pending.status,
        ...(note.trim() ? { note: note.trim() } : {}),
        ...(pending.askTech ? { technician: tech.trim() } : {}),
        ...(pending.qc ? { qc: ticked } : {}),
      });
      setPending(null);
      changed(res.data.data, res.data.message);
    } catch (err) {
      setError(err?.message || 'Could not change the status.');
      if (err?.status === 409) load();
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async () => {
    const body = detailsBody(editing);
    if (typeof body === 'string') {
      setError(body);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await jobCardService.update(id, body);
      const fresh = (await jobCardService.getOne(id)).data.data;
      setJob(fresh);
      setEditing(null);
      onChanged(fresh, res.data.message);
    } catch (err) {
      setError(err?.message || 'Could not save.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 modal-backdrop z-50 flex items-center justify-center p-4">
      <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="jc-title" className="bg-white shadow-xl w-full max-w-3xl max-h-[94vh] flex flex-col animate-fade-in-scale">
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5 min-w-0">
            <h2 id="jc-title" className="text-base font-semibold text-gray-900">{job ? `Job card ${job.job_number}` : 'Job card'}</h2>
            {job && <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_PILL[job.status]}`}>{STATUS_LABEL[job.status]}</span>}
          </div>
          <div className="flex items-center gap-1">
            {job && !editing && (
              <button type="button" onClick={() => printJob(job)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-700 border border-gray-300 hover:bg-gray-50">
                <Printer className="w-3.5 h-3.5" aria-hidden="true" /> Print
              </button>
            )}
            <button type="button" onClick={onClose} aria-label="Close" className="btn-icon p-1.5 hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {!job && !error && <p className="py-10 text-center text-gray-500"><Loader2 className="w-5 h-5 animate-spin inline" aria-hidden="true" /> Loading…</p>}

          {job && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Info icon={User} label="Customer">
                  <button type="button" onClick={() => setProfileOpen(true)} className="text-[var(--primary-dark)] underline underline-offset-2 hover:no-underline text-left" title="Open the customer profile: vehicles, job cards and past orders">
                    {job.customer.name}
                  </button>
                  {' · '}<span dir="ltr">{phoneText(job.customer.phone)}</span>
                </Info>
                <Info icon={Car} label="Vehicle">{vehicleText(job.vehicle)}</Info>
              </div>

              {editing ? (
                <JobDetailsForm value={editing} onChange={setEditing} vehicleType={job.vehicle.vehicle_type} technicians={technicians} />
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Info icon={Gauge} label="Mileage">{job.mileage != null ? `${job.mileage.toLocaleString('en-US')} km` : ''}</Info>
                    <Info icon={Fuel} label="Fuel">{FUEL_LABEL[job.fuel_level]}</Info>
                    <Info icon={Wrench} label="Technician">{job.technician}</Info>
                    <Info icon={Clock} label="Promised for">{job.promised_at ? when(job.promised_at) : ''}</Info>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="border border-gray-200 px-3 py-2">
                      <p className="text-[11px] font-semibold text-gray-500 mb-0.5">Existing damage</p>
                      <p className="text-sm text-gray-900 whitespace-pre-line">{job.damage_notes || '—'}</p>
                    </div>
                    <div className="border border-gray-200 px-3 py-2">
                      <p className="text-[11px] font-semibold text-gray-500 mb-0.5">Customer&apos;s complaints / requests</p>
                      <p className="text-sm text-gray-900 whitespace-pre-line">{job.complaints || '—'}</p>
                    </div>
                  </div>
                  <table className="w-full text-sm border border-gray-200">
                    <thead><tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500"><th className="px-3 py-2">Service</th><th className="px-3 py-2 text-right">Price</th></tr></thead>
                    <tbody>
                      {job.services.length === 0 && <tr><td colSpan={2} className="px-3 py-2 text-gray-500">No services added yet.</td></tr>}
                      {job.services.map((s, i) => (
                         
                        <tr key={i} className="border-t border-gray-100"><td className="px-3 py-2">{s.name}</td><td className="px-3 py-2 text-right tabular-nums">{qar(s.price)}</td></tr>
                      ))}
                      <tr className="border-t border-gray-200 bg-gray-50 font-semibold"><td className="px-3 py-2">Total</td><td className="px-3 py-2 text-right tabular-nums">{qar(job.total)}</td></tr>
                    </tbody>
                  </table>
                  {job.notes && <p className="text-sm text-gray-600"><b>Notes:</b> {job.notes}</p>}
                  {job.qc_at && (
                    <p className="text-sm text-green-800 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4" aria-hidden="true" /> Quality check passed {when(job.qc_at)}{job.qc_by ? ` by ${job.qc_by}` : ''}
                    </p>
                  )}
                </>
              )}

              {/* Ready: tell the customer */}
              {!editing && job.status === 'ready' && (
                <div className="border border-green-200 bg-green-50 p-3 flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
                  <p className="text-sm text-green-900">The car is ready. Let the customer know on WhatsApp.</p>
                  <ReadyWhatsAppButton job={job} message={readyMessage(job)} />
                </div>
              )}

              {/* Delivered from an invoice: the order and its receipt */}
              {!editing && job.order && <InvoicedOrder job={job} />}

              {invoicing && (
                <InvoiceForm
                  job={job}
                  onCancel={() => setInvoicing(false)}
                  onDone={(fresh, message) => { setInvoicing(false); changed(fresh, message); }}
                />
              )}

              {/* Status buttons */}
              {!editing && !invoicing && ACTIONS[job.status].length > 0 && !pending && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {ACTIONS[job.status].map(([status, label, kind]) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => ask(status, label)}
                      className={`px-4 py-2 text-sm font-medium transition-colors ${
                        kind === 'primary' ? 'bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]'
                          : kind === 'danger' ? 'text-red-600 border border-red-200 hover:bg-red-50'
                          : 'text-amber-800 border border-amber-300 hover:bg-amber-50'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                  {OPEN_STATUSES.includes(job.status) && (
                    <button type="button" onClick={() => { setEditing(detailsFrom(job)); setError(''); }} className="ml-auto flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-50">
                      <Pencil className="w-4 h-4" aria-hidden="true" /> Edit details
                    </button>
                  )}
                </div>
              )}

              {pending && (
                <div className="border border-gray-200 bg-gray-50 p-3 space-y-3">
                  <p className="text-sm font-semibold text-gray-900">{pending.label}</p>
                  {pending.qc && (
                    <fieldset>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <legend className="text-sm font-medium text-gray-700">Quality check ({ticked.length}/{QC_ITEMS.length})</legend>
                        <button
                          type="button"
                          onClick={() => setTicked(ticked.length === QC_ITEMS.length ? [] : QC_ITEMS.map(([k]) => k))}
                          className="text-xs font-medium text-[var(--primary-dark)] underline underline-offset-2"
                        >
                          {ticked.length === QC_ITEMS.length ? 'Untick all' : 'Tick all'}
                        </button>
                      </div>
                      <ul className="space-y-1">
                        {QC_ITEMS.map(([key, label]) => (
                          <li key={key}>
                            <label className="flex items-center gap-2 text-sm font-normal text-gray-900 cursor-pointer">
                              <input type="checkbox" checked={ticked.includes(key)} onChange={() => toggleTick(key)} className="w-4 h-4" />
                              {label}
                            </label>
                          </li>
                        ))}
                      </ul>
                    </fieldset>
                  )}
                  {pending.askTech && (
                    <div>
                      <label htmlFor="jc-move-tech">Technician</label>
                      <input id="jc-move-tech" list="jc-move-techs" value={tech} onChange={(e) => setTech(e.target.value)} maxLength={100} placeholder="Who does the work" autoFocus />
                      <datalist id="jc-move-techs">{technicians.map((t) => <option key={t} value={t} />)}</datalist>
                    </div>
                  )}
                  <div>
                    <label htmlFor="jc-move-note">
                      {pending.status === 'cancelled' ? NOTE_FOR.cancelled : pending.back ? NOTE_FOR.in_progress_back : 'Note (optional)'}
                      {pending.needsNote && <span className="text-red-500" aria-hidden="true"> *</span>}
                    </label>
                    <input id="jc-move-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={255} autoFocus={!pending.askTech} />
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setPending(null)} className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 hover:bg-gray-100">Back</button>
                    <button type="button" onClick={move} disabled={busy} className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-50">
                      {busy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />} Confirm
                    </button>
                  </div>
                </div>
              )}

              {!editing && job.status !== 'cancelled' && <JobCardPhotos job={job} onChanged={changed} />}

              {/* Timeline */}
              {!editing && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">Timeline</p>
                  <ol className="border-l-2 border-gray-200 ml-1.5 space-y-2.5">
                    {job.events.map((e, i) => (
                       
                      <li key={i} className="relative pl-4 text-sm">
                        <span className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-[var(--primary)]" aria-hidden="true" />
                        <span className="font-medium text-gray-900">{STATUS_LABEL[e.to_status] || e.to_status}</span>
                        <span className="text-gray-500"> · {when(e.created_at)}{e.created_by ? ` · ${e.created_by}` : ''}</span>
                        {e.note && <span className="block text-gray-600">{e.note}</span>}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </>
          )}

          {error && (
            <div className="flex items-start gap-2 px-3 py-2 text-xs bg-red-50 border border-red-200 text-red-700" role="alert">
              <AlertCircle className="w-4 h-4 shrink-0 mt-px" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {editing && (
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
            <button type="button" onClick={() => { setEditing(null); setError(''); }} className="px-5 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200">Cancel</button>
            <button type="button" onClick={saveEdit} disabled={busy} className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-50">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Save className="w-4 h-4" aria-hidden="true" />} Save changes
            </button>
          </div>
        )}
      </div>
      {profileOpen && job && <CustomerProfileModal customerId={job.customer.id} onClose={() => setProfileOpen(false)} />}
    </div>
  );
}
