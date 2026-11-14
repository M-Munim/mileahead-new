'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, AlertCircle, Info, Lock, Pencil, Trash2, Send, X, FileText, Save, RefreshCw, Smartphone, MessageCircle } from 'lucide-react';
import ConfirmationDialog from './ConfirmationDialog';
import WhatsAppPreview from './WhatsAppPreview';
import { broadcastService } from '../../utils/axiosInstance';
import {
  NAME_TAG,
  SAMPLE_NAME,
  TEMPLATE_NAME,
  MAX_BODY,
  MAX_FOOTER,
  TEMPLATE_LANGUAGES,
  TEMPLATE_CATEGORIES,
  TEMPLATE_STATUS,
  templateTextProblem,
  buttonProblem,
  dateText,
  MAX_BUTTON_TEXT,
  CHAT_BUTTON_TEXT,
  CHAT_NUMBER,
  CHAT_NUMBER_TEXT,
  chatLink,
} from '../../utils/broadcastText';

/**
 * Message templates (Super Admin). Meta must approve every broadcast message,
 * so each one is written here, sent to Meta for review and then picked in
 * New broadcast. `onChanged(message)` reloads the list and shows a toast.
 */
const REVIEWED = ['approved', 'rejected', 'paused', 'disabled'];
const SUBMITTABLE = ['draft', 'rejected'];

const errorText = (err, fallback) =>
  (err?.status === 404 ? 'The server is not updated for message templates yet.' : err?.message || fallback);

/** "Eid offer 2026" → "eid_offer_2026" while typing. */
const toTemplateName = (value) => value.toLowerCase().replace(/[\s-]+/g, '_');

function TemplateForm({ editing, onSaved, onCancel }) {
  const [name, setName] = useState(editing?.name || '');
  const [language, setLanguage] = useState(editing?.language || 'en');
  const [category, setCategory] = useState(editing?.category || 'MARKETING');
  const [body, setBody] = useState(editing?.body || '');
  const [footer, setFooter] = useState(editing?.footer || '');
  const [sampleName, setSampleName] = useState(editing?.sample_name || '');
  const [buttonText, setButtonText] = useState(editing?.button_text || '');
  const [buttonUrl, setButtonUrl] = useState(editing?.button_url || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const bodyBox = useRef(null);
  const lockedName = !!editing?.submitted_at;

  const insertName = () => {
    const box = bodyBox.current;
    const at = box?.selectionStart ?? body.length;
    setBody(`${body.slice(0, at)}${NAME_TAG}${body.slice(box?.selectionEnd ?? at)}`);
    box?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    const problem = !TEMPLATE_NAME.test(name.trim())
      ? 'Give the template a name: lowercase letters, numbers and _ only (e.g. eid_offer_2026).'
      : templateTextProblem(body, footer) || buttonProblem(buttonText, buttonUrl);
    setError(problem);
    if (problem) return;

    setSaving(true);
    const fields = {
      name: name.trim(),
      language,
      category,
      body: body.trim(),
      footer: footer.trim(),
      sample_name: sampleName.trim(),
      button_text: buttonText.trim(),
      button_url: buttonUrl.trim(),
    };
    try {
      let res;
      if (editing) {
        // Only what changed; the name and language are fixed once sent to Meta.
        const changed = Object.fromEntries(
          Object.entries(fields).filter(([k, v]) => v !== (editing[k] ?? '')),
        );
        if (Object.keys(changed).length === 0) {
          onCancel();
          return;
        }
        res = await broadcastService.updateTemplate(editing.id, changed);
      } else {
        res = await broadcastService.addTemplate(fields);
      }
      await onSaved(res.data?.message || 'Template saved');
    } catch (err) {
      console.error('Save template error:', err);
      setError(errorText(err, 'Could not save the template.'));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5 p-5 border-b border-gray-100">
      <fieldset disabled={saving} className="space-y-4 min-w-0">
        {editing && (
          <div className="flex items-center justify-between gap-3 px-3 py-2 text-sm bg-[var(--primary-light)] border border-[var(--primary)]/30">
            <span className="text-gray-800">Editing <b>{editing.name}</b></span>
            <button type="button" onClick={onCancel} className="flex items-center gap-1 text-xs font-semibold underline text-gray-700">
              <X className="w-3.5 h-3.5" aria-hidden="true" /> Cancel
            </button>
          </div>
        )}
        {editing && REVIEWED.includes(editing.status) && (
          <div className="flex items-start gap-2 px-3 py-2 text-xs bg-amber-50 border border-amber-200 text-amber-800">
            <Info className="w-4 h-4 shrink-0 mt-px" aria-hidden="true" />
            <span>Saving changes makes this a draft again. It must be sent to Meta and approved again before it can be used.</span>
          </div>
        )}
        {editing?.status === 'rejected' && editing.rejection_reason && (
          <div className="flex items-start gap-2 px-3 py-2 text-xs bg-red-50 border border-red-200 text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0 mt-px" aria-hidden="true" />
            <span><b>Meta&apos;s reason:</b> {editing.rejection_reason}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_150px_200px] gap-4">
          <div>
            <label htmlFor="tpl-name">Template name<span className="text-red-500" aria-hidden="true"> *</span></label>
            <input
              id="tpl-name"
              dir="ltr"
              autoComplete="off"
              maxLength={150}
              value={name}
              disabled={lockedName}
              onChange={(e) => setName(toTemplateName(e.target.value))}
              placeholder="e.g. eid_offer_2026"
            />
            <p className="mt-1 text-[11px] text-gray-500">
              {lockedName ? 'Fixed once sent to Meta.' : 'Only the team sees this. Lowercase, numbers and _.'}
            </p>
          </div>
          <div>
            <label htmlFor="tpl-language">Language</label>
            <select id="tpl-language" value={language} disabled={lockedName} onChange={(e) => setLanguage(e.target.value)}>
              {TEMPLATE_LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="tpl-category">Type</label>
            <select id="tpl-category" value={category} onChange={(e) => setCategory(e.target.value)}>
              {TEMPLATE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <div className="flex items-end justify-between gap-3">
            <label htmlFor="tpl-body">Message<span className="text-red-500" aria-hidden="true"> *</span></label>
            <button type="button" onClick={insertName} className="mb-1 px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors">
              + Customer name
            </button>
          </div>
          <textarea
            id="tpl-body"
            ref={bodyBox}
            dir="auto"
            rows={6}
            maxLength={MAX_BODY}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={`Hi ${NAME_TAG}, Eid Mubarak! Enjoy 20% off any wash this week at Magic Track.`}
          />
          <div className="mt-1 flex justify-between gap-3 text-[11px] text-gray-500">
            <span>Use *stars* for bold. The customer name can be used once, not as the first or last word.</span>
            <span className="tabular-nums shrink-0">{body.length} / {MAX_BODY}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_200px] gap-4">
          <div>
            <label htmlFor="tpl-footer">Footer <span className="text-gray-400 font-normal">(optional)</span></label>
            <input id="tpl-footer" dir="auto" autoComplete="off" maxLength={MAX_FOOTER} value={footer} onChange={(e) => setFooter(e.target.value)} placeholder="Reply STOP to opt out" />
          </div>
          <div>
            <label htmlFor="tpl-sample">Example name for Meta</label>
            <input id="tpl-sample" dir="auto" autoComplete="off" maxLength={60} value={sampleName} onChange={(e) => setSampleName(e.target.value)} placeholder={SAMPLE_NAME} />
          </div>
        </div>

        <div className="border border-gray-200 p-3 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium text-gray-700">Button <span className="text-gray-400 font-normal">(optional)</span></span>
            {buttonText || buttonUrl ? (
              <button type="button" onClick={() => { setButtonText(''); setButtonUrl(''); }} className="text-xs font-medium text-red-600 hover:underline">
                Remove button
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { setButtonText(CHAT_BUTTON_TEXT); setButtonUrl(chatLink(CHAT_NUMBER)); }}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-[#25D366] hover:bg-[#1ebe5a]"
              >
                <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" /> Add &quot;{CHAT_BUTTON_TEXT}&quot; ({CHAT_NUMBER_TEXT})
              </button>
            )}
          </div>
          {(buttonText || buttonUrl) && (
            <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-3">
              <div>
                <label htmlFor="tpl-btn-text">Button text</label>
                <input id="tpl-btn-text" dir="auto" maxLength={MAX_BUTTON_TEXT} value={buttonText} onChange={(e) => setButtonText(e.target.value)} placeholder={CHAT_BUTTON_TEXT} />
              </div>
              <div>
                <label htmlFor="tpl-btn-url">Opens this link</label>
                <input id="tpl-btn-url" dir="ltr" value={buttonUrl} onChange={(e) => setButtonUrl(e.target.value.trim())} placeholder={chatLink(CHAT_NUMBER)} />
              </div>
            </div>
          )}
          <p className="text-[11px] text-gray-500">
            Customers can&apos;t reply to the broadcast number in the dashboard, so this button sends them to the WhatsApp the team answers.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2 px-3 py-2 text-xs bg-red-50 border border-red-200 text-red-700" role="alert">
            <AlertCircle className="w-4 h-4 shrink-0 mt-px" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <button type="submit" className="px-5 py-2 text-sm font-medium bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors flex items-center gap-2 disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Save className="w-4 h-4" aria-hidden="true" />}
          {editing ? 'Save changes' : 'Save template'}
        </button>
      </fieldset>

      <aside className="min-w-0">
        <h2 className="text-sm font-semibold text-gray-900 mb-2">Preview</h2>
        <WhatsAppPreview body={body} footer={footer} sampleName={sampleName} buttonText={buttonText} />
      </aside>
    </form>
  );
}

// The last number a test went to, for the next test (this browser only)
const TEST_NUMBER_KEY = 'mt.broadcast.testNumber';
const readTestNumber = () => {
  try {
    return localStorage.getItem(TEST_NUMBER_KEY) || '';
  } catch {
    return '';
  }
};

/** Sends an approved template to one phone, to see it for real. */
function TestSend({ template, onClose, onToast }) {
  const [phone, setPhone] = useState(readTestNumber);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const send = async (e) => {
    e.preventDefault();
    if (sending) return;
    if (!phone.trim()) {
      setError('Enter the WhatsApp number, with the country code.');
      return;
    }
    setSending(true);
    setError('');
    try {
      const res = await broadcastService.sendTestTemplate(template.id, { phone: phone.trim() });
      try { localStorage.setItem(TEST_NUMBER_KEY, phone.trim()); } catch { /* private mode */ }
      onToast(res.data?.message || 'Test sent', 'success');
      onClose();
    } catch (err) {
      console.error('Test send error:', err);
      setError(errorText(err, 'Could not send the test.'));
      setSending(false);
    }
  };

  return (
    <form onSubmit={send} noValidate className="mx-5 mt-4 p-4 border border-[var(--primary)]/30 bg-[var(--primary-light)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-gray-800">
          Send <b className="font-mono">{template.name}</b> to one phone to see it as customers will.
        </p>
        <button type="button" onClick={onClose} aria-label="Close" className="text-gray-500 hover:text-gray-800">
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
      <fieldset disabled={sending} className="mt-3 flex flex-col sm:flex-row gap-2 sm:items-end">
        <div className="flex-1">
          <label htmlFor="tpl-test-phone">WhatsApp number</label>
          <input id="tpl-test-phone" type="tel" dir="ltr" autoComplete="off" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+974 5555 0000" />
        </div>
        <button type="submit" className="px-4 py-2 text-sm font-medium bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Send className="w-4 h-4" aria-hidden="true" />} Send test
        </button>
      </fieldset>
      <p className="mt-2 text-[11px] text-gray-600">
        The customer name shows as &quot;{template.sample_name || SAMPLE_NAME}&quot;. With Meta&apos;s test number, only numbers on its allowed list get it.
      </p>
      {error && (
        <div className="mt-2 flex items-start gap-2 px-3 py-2 text-xs bg-red-50 border border-red-200 text-red-700" role="alert">
          <AlertCircle className="w-4 h-4 shrink-0 mt-px" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
    </form>
  );
}

export default function TemplateManager({ templates, loading, sendingEnabled, onChanged, onToast }) {
  const [editing, setEditing] = useState(null);
  const [formKey, setFormKey] = useState(0);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [submittingId, setSubmittingId] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [testing, setTesting] = useState(null);
  const autoSynced = useRef(false);
  const anyPending = templates.some((t) => t.status === 'pending');

  const sync = async (quiet = false) => {
    setSyncing(true);
    try {
      const res = await broadcastService.syncTemplates();
      if (quiet && /up to date/i.test(res.data?.message || '')) return;
      await onChanged(res.data?.message || 'Checked with Meta');
    } catch (err) {
      console.error('Sync templates error:', err);
      if (!quiet) onToast(errorText(err, 'Could not check with Meta.'), 'error');
    } finally {
      setSyncing(false);
    }
  };

  // Templates in review: ask Meta once when the tab opens, in case the
  // webhook is not set up (or missed one).
  useEffect(() => {
    if (!sendingEnabled || !anyPending || autoSynced.current) return;
    autoSynced.current = true;
    sync(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sendingEnabled, anyPending]);

  const closeForm = () => {
    setEditing(null);
    setFormKey((k) => k + 1);
  };

  // The form is above the list; bring it into view.
  const startEdit = (tpl) => {
    setEditing(tpl);
    setTimeout(() => document.getElementById('tpl-body')?.focus(), 0);
  };

  const handleSaved = async (message) => {
    closeForm();
    await onChanged(message);
  };

  const submit = async (tpl) => {
    setSubmittingId(tpl.id);
    try {
      const res = await broadcastService.submitTemplate(tpl.id);
      await onChanged(`"${tpl.name}": ${res.data?.message || 'sent to Meta for review'}`);
    } catch (err) {
      console.error('Submit template error:', err);
      onToast(errorText(err, 'Could not send it to Meta.'), 'error');
    } finally {
      setSubmittingId(null);
    }
  };

  const confirmDelete = async () => {
    const tpl = pendingDelete;
    if (!tpl) return;
    try {
      await broadcastService.removeTemplate(tpl.id);
      if (editing?.id === tpl.id) closeForm();
      await onChanged(`"${tpl.name}" deleted`);
    } catch (err) {
      console.error('Delete template error:', err);
      onToast(errorText(err, 'Could not delete the template.'), 'error');
    }
  };

  return (
    <div>
      <div className="mx-5 mt-4 px-4 py-3 flex items-start gap-2.5 text-sm bg-blue-50 border border-blue-200 text-blue-900">
        <Info className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
        <span>
          Meta must approve every broadcast message. Write it here, send it to Meta, then pick it under New broadcast.
          Approval usually takes from a few minutes to 24 hours, sometimes 1–3 working days.
          {!sendingEnabled && ' Sending to Meta unlocks once the Meta account is connected.'}
        </span>
        {sendingEnabled && templates.some((t) => t.submitted_at) && (
          <button
            type="button"
            onClick={() => sync(false)}
            disabled={syncing}
            className="ml-auto shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-900 bg-white border border-blue-200 hover:bg-blue-100 transition-colors disabled:opacity-60 whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} aria-hidden="true" /> Check Meta status
          </button>
        )}
      </div>

      {testing && <TestSend key={testing.id} template={testing} onClose={() => setTesting(null)} onToast={onToast} />}

      <TemplateForm
        key={editing ? `edit-${editing.id}` : `new-${formKey}`}
        editing={editing}
        onSaved={handleSaved}
        onCancel={closeForm}
      />

      {templates.length === 0 ? (
        <div className="py-12 text-center text-gray-500">
          <FileText className="w-8 h-8 mx-auto mb-3 text-gray-300" aria-hidden="true" />
          <p className="text-sm">{loading ? 'Loading templates…' : 'No message templates yet. Write the first one above.'}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="px-5 py-3 font-medium">Template</th>
                <th className="px-3 py-3 font-medium">Message</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Changed</th>
                <th className="px-5 py-3 font-medium"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => {
                const status = TEMPLATE_STATUS[t.status] || TEMPLATE_STATUS.draft;
                return (
                  <tr key={t.id} className="border-b border-gray-50 last:border-0 align-top">
                    <td className="px-5 py-3">
                      <div className="font-medium text-gray-900 font-mono text-[13px]">{t.name}</div>
                      <div className="text-xs text-gray-500">
                        {(TEMPLATE_LANGUAGES.find((l) => l.value === t.language) || { label: t.language }).label}
                        {' · '}{t.category === 'UTILITY' ? 'Utility' : 'Marketing'}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-gray-700 max-w-sm">
                      <p className="line-clamp-2 break-words" dir="auto">{t.body}</p>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${status.pill}`}>{status.label}</span>
                      {t.status === 'rejected' && t.rejection_reason && (
                        <span className="block mt-1 text-xs text-red-700">{t.rejection_reason}</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-gray-700 whitespace-nowrap">
                      {dateText(t.updated_at)}
                      {t.updated_by && <span className="block text-xs text-gray-500">by {t.updated_by}</span>}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {SUBMITTABLE.includes(t.status) && (
                          <button
                            type="button"
                            onClick={() => submit(t)}
                            disabled={!sendingEnabled || submittingId === t.id}
                            title={sendingEnabled ? undefined : 'Connect the Meta account first'}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] transition-colors disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed whitespace-nowrap"
                          >
                            {submittingId === t.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                              : sendingEnabled ? <Send className="w-3.5 h-3.5" aria-hidden="true" /> : <Lock className="w-3.5 h-3.5" aria-hidden="true" />} Send to Meta
                          </button>
                        )}
                        {t.status === 'approved' && sendingEnabled && (
                          <button
                            type="button"
                            onClick={() => setTesting(t)}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors whitespace-nowrap"
                          >
                            <Smartphone className="w-3.5 h-3.5" aria-hidden="true" /> Send test
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => startEdit(t)}
                          disabled={t.status === 'pending'}
                          title={t.status === 'pending' ? 'In review at Meta' : undefined}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Pencil className="w-3.5 h-3.5" aria-hidden="true" /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDelete(t)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 bg-white border border-red-200 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmationDialog
        isOpen={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        type="error"
        title="Delete template?"
        message={`This removes "${pendingDelete?.name}" from the dashboard.`}
        confirmText="Delete"
      />
    </div>
  );
}
