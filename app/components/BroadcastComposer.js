'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2, AlertCircle, Users, Lock, Save, CalendarClock, X } from 'lucide-react';
import { broadcastService } from '../../utils/axiosInstance';
import { SERVICE_GROUPS } from '../../utils/priceList';

/**
 * Write a broadcast, pick who gets it and save it as a draft or scheduled.
 * Meta only delivers broadcasts from approved templates, so the message here
 * is a copy of the template text, used for the preview. {{name}} is the
 * customer's name. Pass `editing` to change a saved broadcast; give the
 * component `key={editing?.id}` so the form starts fresh for each one.
 */
const TEMPLATE_NAME = /^[a-z0-9_]{1,150}$/;
const MAX_MESSAGE = 1024;
const NAME_TAG = '{{name}}';
const SAMPLE_NAME = 'Ahmed';

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'en_US', label: 'English (US)' },
  { value: 'ar', label: 'Arabic' },
];

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

/** *bold* the way WhatsApp shows it. */
function WhatsAppText({ text }) {
  return text.split(/(\*[^*\n]+\*)/g).map((part, i) => (
    /^\*[^*\n]+\*$/.test(part) ? <b key={i}>{part.slice(1, -1)}</b> : part
  ));
}

export default function BroadcastComposer({ editing, sendingEnabled, onSaved, onCancelEdit }) {
  const [title, setTitle] = useState(editing?.title || '');
  const [templateName, setTemplateName] = useState(editing?.template_name || '');
  const [language, setLanguage] = useState(editing?.template_language || 'en');
  const [message, setMessage] = useState(editing?.message_body || '');
  const [type, setType] = useState(editing?.audience?.type || 'all');
  const [days, setDays] = useState(String(editing?.audience?.days || 30));
  const [service, setService] = useState(editing?.audience?.service || '');
  const [when, setWhen] = useState(toLocalInput(editing?.scheduled_at));
  const [count, setCount] = useState(null);
  const [counting, setCounting] = useState(true);
  const [countError, setCountError] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const messageBox = useRef(null);

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

  const insertName = () => {
    const box = messageBox.current;
    const at = box?.selectionStart ?? message.length;
    setMessage(`${message.slice(0, at)}${NAME_TAG}${message.slice(box?.selectionEnd ?? at)}`);
    box?.focus();
  };

  const firstProblem = () => {
    if (!title.trim()) return 'Give this broadcast a name.';
    if (!TEMPLATE_NAME.test(templateName.trim())) return 'Enter the Meta template name: lowercase letters, numbers and _ only.';
    if (!message.trim()) return 'Write the message.';
    if (!daysOk) return 'Enter a number of days from 1 to 3650.';
    if (when && new Date(when).getTime() < Date.now()) return 'Choose a time in the future.';
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
      template_name: templateName.trim(),
      template_language: language,
      message_body: message.trim(),
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

  const preview = message.trim().replaceAll(NAME_TAG, SAMPLE_NAME);

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

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px] gap-4">
          <div>
            <label htmlFor="bc-template">Meta template name<span className="text-red-500" aria-hidden="true"> *</span></label>
            <input id="bc-template" dir="ltr" value={templateName} onChange={(e) => setTemplateName(e.target.value)} maxLength={150} autoComplete="off" placeholder="e.g. eid_offer_2026" />
          </div>
          <div>
            <label htmlFor="bc-language">Template language</label>
            <select id="bc-language" value={language} onChange={(e) => setLanguage(e.target.value)}>
              {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <div className="flex items-end justify-between gap-3">
            <label htmlFor="bc-message">Message<span className="text-red-500" aria-hidden="true"> *</span></label>
            <button type="button" onClick={insertName} className="mb-1 px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors">
              + Customer name
            </button>
          </div>
          <textarea
            id="bc-message"
            ref={messageBox}
            dir="auto"
            rows={6}
            maxLength={MAX_MESSAGE}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={`Hi ${NAME_TAG}, Eid Mubarak! Enjoy 20% off any wash this week.\n\nReply STOP to opt out.`}
          />
          <div className="mt-1 flex justify-between gap-3 text-[11px] text-gray-500">
            <span>Must match the approved Meta template. Use *stars* for bold.</span>
            <span className="tabular-nums shrink-0">{message.length} / {MAX_MESSAGE}</span>
          </div>
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
          <div className="bg-[#e5ddd5] p-3 min-h-[160px]">
            {preview ? (
              <div className="bg-white shadow-sm px-3 py-2 text-sm text-gray-900 whitespace-pre-wrap break-words max-w-[92%]" dir="auto">
                <WhatsAppText text={preview} />
              </div>
            ) : (
              <p className="text-xs text-gray-600 text-center pt-12">The message shows here as customers will see it.</p>
            )}
          </div>
          {message.includes(NAME_TAG) && (
            <p className="mt-1 text-[11px] text-gray-500">&quot;{SAMPLE_NAME}&quot; is an example. Each customer sees their own name.</p>
          )}
        </div>
      </aside>
    </form>
  );
}
