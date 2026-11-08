'use client';

import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, Users, Lock, Save, CalendarClock, X, CheckCircle2, Info } from 'lucide-react';
import WhatsAppPreview from './WhatsAppPreview';
import { broadcastService } from '../../utils/axiosInstance';
import { SERVICE_GROUPS } from '../../utils/priceList';
import { TEMPLATE_STATUS } from '../../utils/broadcastText';

/**
 * Pick a message template, pick who gets it and save it as a draft or
 * scheduled. Meta only delivers approved templates, so only an approved one
 * can be scheduled. Pass `editing` to change a saved broadcast; give the
 * component `key={editing?.id}` so the form starts fresh for each one.
 */

const AUDIENCES = [
  { value: 'all', label: 'All customers' },
  { value: 'recent', label: 'Visited recently' },
  { value: 'inactive', label: "Haven't come back" },
];

const SERVICES = SERVICE_GROUPS.flatMap((group) => group.services.map((s) => s.name));

const pad = (n) => String(n).padStart(2, '0');

/** ISO time → the value a datetime-local input wants, in local time. */
const toLocalInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function BroadcastComposer({ editing, templates = [], sendingEnabled, onSaved, onCancelEdit, onGoToTemplates }) {
  const [title, setTitle] = useState(editing?.title || '');
  const [templateId, setTemplateId] = useState(editing?.template_id ? String(editing.template_id) : '');
  const [type, setType] = useState(editing?.audience?.type || 'all');
  const [days, setDays] = useState(String(editing?.audience?.days || 30));
  const [service, setService] = useState(editing?.audience?.service || '');
  const [when, setWhen] = useState(toLocalInput(editing?.scheduled_at));
  const [count, setCount] = useState(null);
  const [counting, setCounting] = useState(true);
  const [countError, setCountError] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const selected = templates.find((t) => String(t.id) === templateId) || null;
  const approved = selected?.status === 'approved';

  const daysNumber = Number(days);
  const daysOk = type === 'all' || (Number.isInteger(daysNumber) && daysNumber >= 1 && daysNumber <= 3650);

  // Live count, a moment after the choice stops changing.
  useEffect(() => {
    if (!daysOk) return undefined;
    let stale = false;
    const timer = setTimeout(async () => {
      setCounting(true);
      setCountError('');
      try {
        const res = await broadcastService.previewAudience({
          type,
          days: type === 'all' ? null : daysNumber,
          service: service || null,
        });
        if (!stale) setCount(res.data?.data || null);
      } catch (err) {
        console.error('Audience count error:', err);
        if (!stale) setCountError(err?.status === 404 ? 'The server is not updated for broadcasts yet.' : 'Could not count the customers.');
      } finally {
        if (!stale) setCounting(false);
      }
    }, 400);
    return () => { stale = true; clearTimeout(timer); };
  }, [type, daysNumber, daysOk, service]);

  const firstProblem = () => {
    if (!title.trim()) return 'Give this broadcast a name.';
    if (!templateId) return 'Pick the message to send.';
    if (!selected) return 'That message template no longer exists. Pick another one.';
    if (!daysOk) return 'Enter a number of days from 1 to 3650.';
    if (when && new Date(when).getTime() < Date.now()) return 'Choose a time in the future.';
    if (when && !approved) return 'Only a message Meta has approved can be scheduled. Leave the time empty to save a draft.';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    const problem = firstProblem();
    setError(problem);
    if (problem) return;

    setSaving(true);
    const body = {
      title: title.trim(),
      template_id: Number(templateId),
      audience: { type, days: type === 'all' ? null : daysNumber, service: service || null },
      scheduled_at: when ? new Date(when).toISOString() : null,
    };
    try {
      if (editing) await broadcastService.update(editing.id, body);
      else await broadcastService.add(body);
      await onSaved(when ? 'Broadcast scheduled' : 'Draft saved');
    } catch (err) {
      console.error('Save broadcast error:', err);
      setError(err?.status === 404 ? 'The server is not updated for broadcasts yet.' : err?.message || 'Could not save the broadcast.');
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5 p-5" noValidate>
      <fieldset disabled={saving} className="space-y-5 min-w-0">
        {editing && (
          <div className="flex items-center justify-between gap-3 px-3 py-2 text-sm bg-[var(--primary-light)] border border-[var(--primary)]/30">
            <span className="text-gray-800">Editing <b>{editing.title}</b></span>
            <button type="button" onClick={onCancelEdit} className="flex items-center gap-1 text-xs font-semibold underline text-gray-700">
              <X className="w-3.5 h-3.5" aria-hidden="true" /> Cancel
            </button>
          </div>
        )}

        <div>
          <label htmlFor="bc-title">Broadcast name<span className="text-red-500" aria-hidden="true"> *</span></label>
          <input id="bc-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} autoComplete="off" placeholder="e.g. Eid offer" />
          <p className="mt-1 text-[11px] text-gray-500">For the Magic Track team only. Customers don&apos;t see it.</p>
        </div>

        <div>
          <label htmlFor="bc-template">Message<span className="text-red-500" aria-hidden="true"> *</span></label>
          {templates.length === 0 ? (
            <div className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm bg-gray-50 border border-gray-200 text-gray-700">
              <span className="mr-auto">No message templates yet.</span>
              <button type="button" onClick={onGoToTemplates} className="text-xs font-semibold underline text-[var(--primary-dark)]">
                Write one under Message templates
              </button>
            </div>
          ) : (
            <>
              <select id="bc-template" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                <option value="">Pick a message template</option>
                {editing?.template_id && !selected && <option value={templateId}>(deleted template)</option>}
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({(TEMPLATE_STATUS[t.status] || TEMPLATE_STATUS.draft).label})
                  </option>
                ))}
              </select>
              {selected && (approved ? (
                <p className="mt-1 text-[11px] text-green-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 shrink-0" aria-hidden="true" /> Approved by Meta. Ready to use.
                </p>
              ) : (
                <p className="mt-1 text-[11px] text-amber-700 flex items-center gap-1">
                  <Info className="w-3 h-3 shrink-0" aria-hidden="true" /> Not approved by Meta yet. You can save a draft; scheduling needs approval.
                </p>
              ))}
            </>
          )}
        </div>

        <div>
          <span className="block text-sm font-medium text-gray-700 mb-2">Who gets it?</span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2" role="group" aria-label="Who gets it?">
            {AUDIENCES.map((a) => (
              <button
                key={a.value}
                type="button"
                aria-pressed={type === a.value}
                onClick={() => setType(a.value)}
                className={`px-3 py-2 text-sm font-medium border transition-colors ${
                  type === a.value ? 'border-[var(--primary)] bg-[var(--primary)] text-white' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
            {type !== 'all' && (
              <div>
                <label htmlFor="bc-days">{type === 'recent' ? 'Visited in the last (days)' : 'No visit for (days)'}</label>
                <input id="bc-days" type="number" min="1" max="3650" value={days} onChange={(e) => setDays(e.target.value)} aria-invalid={!daysOk} />
              </div>
            )}
            <div>
              <label htmlFor="bc-service">Only customers who had</label>
              <select id="bc-service" value={service} onChange={(e) => setService(e.target.value)}>
                <option value="">Any service</option>
                {SERVICES.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="max-w-xs">
          <label htmlFor="bc-when">Schedule (optional)</label>
          <input id="bc-when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          <p className="mt-1 text-[11px] text-gray-500">Leave empty to save a draft.</p>
        </div>

        {error && (
          <div className="flex items-start gap-2 px-3 py-2 text-xs bg-red-50 border border-red-200 text-red-700" role="alert">
            <AlertCircle className="w-4 h-4 shrink-0 mt-px" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="submit" className="px-5 py-2 text-sm font-medium bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors flex items-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                : when ? <CalendarClock className="w-4 h-4" aria-hidden="true" /> : <Save className="w-4 h-4" aria-hidden="true" />}
              {when ? 'Schedule' : 'Save draft'}
            </button>
            {!sendingEnabled && (
              <button type="button" disabled className="px-5 py-2 text-sm font-medium bg-gray-100 text-gray-400 flex items-center gap-2 cursor-not-allowed">
                <Lock className="w-4 h-4" aria-hidden="true" /> Send now
              </button>
            )}
          </div>
          {!sendingEnabled && (
            <p className="mt-2 text-[11px] text-gray-500">
              Connect the Meta account first. Until then nothing is sent to customers, including scheduled broadcasts.
            </p>
          )}
        </div>
      </fieldset>

      <aside className="space-y-4 min-w-0">
        <div className="border border-gray-200 p-4" aria-live="polite">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-[var(--primary)]" aria-hidden="true" /> Customers
            {counting && daysOk && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" aria-hidden="true" />}
          </h2>
          {!daysOk ? (
            <p className="mt-2 text-sm text-gray-500">Enter the number of days.</p>
          ) : countError ? (
            <p className="mt-2 text-sm text-red-700">{countError}</p>
          ) : count ? (
            <>
              <p className="mt-1 text-3xl font-bold text-gray-900 tabular-nums">{count.count.toLocaleString('en-US')}</p>
              <p className="text-xs text-gray-500">will get this message</p>
              {(count.opted_out > 0 || count.invalid_numbers > 0) && (
                <p className="mt-2 text-[11px] text-gray-500">
                  Left out: {count.opted_out} opted out, {count.invalid_numbers} with a number that can&apos;t be on WhatsApp.
                </p>
              )}
            </>
          ) : (
            <p className="mt-2 text-sm text-gray-500">Counting…</p>
          )}
        </div>

        <div>
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Preview</h2>
          <WhatsAppPreview
            body={selected?.body}
            footer={selected?.footer}
            sampleName={selected?.sample_name}
            emptyText="Pick a message to see it as customers will."
          />
        </div>
      </aside>
    </form>
  );
}
