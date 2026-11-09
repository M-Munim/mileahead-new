'use client';

import { useState, useEffect, useCallback } from 'react';
import { Megaphone, RefreshCw, Loader2, AlertCircle, Pencil, Trash2, Send } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Toast from '../components/Toast';
import ConfirmationDialog from '../components/ConfirmationDialog';
import BroadcastComposer from '../components/BroadcastComposer';
import WhatsAppSettingsForm from '../components/WhatsAppSettingsForm';
import BroadcastHistory, { HISTORY_STATUSES } from '../components/BroadcastHistory';
import OptOutList from '../components/OptOutList';
import TemplateManager from '../components/TemplateManager';
import { broadcastService } from '../../utils/axiosInstance';
import { audienceText, dateText } from '../../utils/broadcastText';

/**
 * WhatsApp Broadcast (Super Admin): write message templates for Meta to
 * approve, pick the customers and save a broadcast, see what was sent, keep
 * the opt-out list, plus the Meta connection details. Sending works once the
 * Meta details are saved under WhatsApp settings.
 */

const TABS = [
  { key: 'new', label: 'New broadcast' },
  { key: 'templates', label: 'Message templates' },
  { key: 'saved', label: 'Drafts & scheduled' },
  { key: 'history', label: 'History' },
  { key: 'optouts', label: 'Opt-out list' },
  { key: 'settings', label: 'WhatsApp settings' },
];

const OPEN_STATUSES = ['draft', 'scheduled'];

const STATUS_PILL = {
  draft: 'bg-gray-100 text-gray-700',
  scheduled: 'bg-blue-100 text-blue-700',
};

// A scheduled time that has passed but the server hasn't sent yet
const isOverdue = (b) => b.status === 'scheduled' && b.scheduled_at && new Date(b.scheduled_at).getTime() < Date.now();
const POLL_MS = 5000; // while a broadcast is sending

export default function BroadcastPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tab, setTab] = useState('new');
  const [broadcasts, setBroadcasts] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [formKey, setFormKey] = useState(0); // a new key empties the form
  const [pendingDelete, setPendingDelete] = useState(null);
  const [pendingSend, setPendingSend] = useState(null);
  const [sendingId, setSendingId] = useState(null);
  const [toast, setToast] = useState(null);

  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);

  const loadAll = useCallback(async () => {
    const results = await Promise.allSettled([
      broadcastService.getAll(),
      broadcastService.getSettings(),
      broadcastService.getTemplates(),
    ]);
    const [listResult, settingsResult, templatesResult] = results;
    const failed = results.find((r) => r.status === 'rejected');
    if (listResult.status === 'fulfilled') setBroadcasts(listResult.value.data?.data || []);
    if (settingsResult.status === 'fulfilled') setSettings(settingsResult.value.data?.data || null);
    if (templatesResult.status === 'fulfilled') setTemplates(templatesResult.value.data?.data || []);
    if (failed) {
      console.error('Error loading broadcasts:', failed.reason);
      setLoadError(failed.reason?.status === 404
        ? 'The server is not updated for broadcasts yet. This page works once the backend update is live.'
        : failed.reason?.message || 'Could not load the broadcasts.');
    } else {
      setLoadError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const first = setTimeout(loadAll, 0);
    return () => clearTimeout(first);
  }, [loadAll]);

  // Counts rise while a broadcast goes out; refresh until it's done.
  const anySending = broadcasts.some((b) => b.status === 'sending');
  useEffect(() => {
    if (!anySending) return undefined;
    const timer = setInterval(loadAll, POLL_MS);
    return () => clearInterval(timer);
  }, [anySending, loadAll]);

  const refreshNow = async () => {
    setLoading(true);
    await loadAll();
  };

  const saved = broadcasts.filter((b) => OPEN_STATUSES.includes(b.status));
  const templateOf = (b) => templates.find((t) => t.id === b.template_id);
  const canSend = (b) => !!settings?.sending_enabled && templateOf(b)?.status === 'approved';

  const confirmSend = async () => {
    const broadcast = pendingSend;
    if (!broadcast) return;
    setSendingId(broadcast.id);
    try {
      const res = await broadcastService.send(broadcast.id);
      setToast({ message: `"${broadcast.title}": ${res.data?.message || 'sending'}`, type: 'success' });
      setTab('history');
      await loadAll();
    } catch (error) {
      console.error('Send broadcast error:', error);
      setToast({ message: error.message || 'Could not send.', type: 'error' });
      await loadAll();
    } finally {
      setSendingId(null);
    }
  };
  const historyCount = broadcasts.filter((b) => HISTORY_STATUSES.includes(b.status)).length;

  const closeForm = () => {
    setEditing(null);
    setFormKey((k) => k + 1);
  };

  const handleSaved = async (message) => {
    closeForm();
    setTab('saved');
    setToast({ message, type: 'success' });
    await loadAll();
  };

  const startEdit = (broadcast) => {
    setEditing(broadcast);
    setTab('new');
  };

  const confirmDelete = async () => {
    const broadcast = pendingDelete;
    if (!broadcast) return;
    try {
      await broadcastService.remove(broadcast.id);
      if (editing?.id === broadcast.id) closeForm();
      setToast({ message: `"${broadcast.title}" deleted`, type: 'success' });
      await loadAll();
    } catch (error) {
      console.error('Delete broadcast error:', error);
      setToast({ message: error.message || 'Could not delete.', type: 'error' });
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 overflow-x-hidden">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={toggleSidebar} aria-hidden="true" />
      )}

      <div className="flex-1 flex flex-col min-h-screen lg:ml-[240px] w-full lg:w-auto overflow-x-hidden">
        <div className="px-4 md:px-6 pt-4 md:pt-6">
          <Header title="WhatsApp Broadcast" toggleSidebar={toggleSidebar} />
        </div>

        <main className="flex-1 px-4 md:px-6 pb-6 overflow-x-hidden">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            {/* Panel header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
                  <Megaphone className="w-5 h-5 text-[var(--primary)]" aria-hidden="true" />
                </div>
                <div>
                  <h1 className="text-base font-semibold text-gray-900">WhatsApp Broadcast</h1>
                  <p className="text-xs text-gray-500">Send one message to many customers from the company WhatsApp number</p>
                </div>
              </div>
              <button
                onClick={refreshNow}
                disabled={loading}
                className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" /> Refresh
              </button>
            </div>

            {loadError && (
              <div className="mx-5 mt-4 px-3 py-2 flex items-center gap-2 text-sm bg-red-50 border border-red-200 text-red-700" role="alert">
                <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="mr-auto">{loadError}</span>
                <button onClick={refreshNow} className="text-xs font-semibold underline">Try again</button>
              </div>
            )}

            {/* Tabs */}
            <div role="tablist" aria-label="Broadcast sections" className="flex gap-1 px-5 pt-4 border-b border-gray-100 overflow-x-auto">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                    tab === t.key ? 'border-[var(--primary)] text-[var(--primary-dark)]' : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {t.label}
                  {t.key === 'saved' && saved.length > 0 ? ` (${saved.length})` : ''}
                  {t.key === 'history' && historyCount > 0 ? ` (${historyCount})` : ''}
                </button>
              ))}
            </div>

            {/* Hidden, not removed: a half-written message survives a look at another tab. */}
            <div hidden={tab !== 'new'}>
              <BroadcastComposer
                key={editing ? `edit-${editing.id}` : `new-${formKey}`}
                editing={editing}
                templates={templates}
                sendingEnabled={!!settings?.sending_enabled}
                onSaved={handleSaved}
                onCancelEdit={closeForm}
                onGoToTemplates={() => setTab('templates')}
              />
            </div>

            {tab === 'saved' && (
              loading && saved.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  <Loader2 className="w-8 h-8 mx-auto mb-3 text-[var(--primary)] animate-spin" aria-hidden="true" />
                  <p className="text-sm">Loading broadcasts…</p>
                </div>
              ) : saved.length === 0 ? (
                <p className="py-12 text-center text-sm text-gray-500">No drafts yet. Write one under New broadcast.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                        <th className="px-5 py-3 font-medium">Broadcast</th>
                        <th className="px-3 py-3 font-medium">Audience</th>
                        <th className="px-3 py-3 font-medium">Customers</th>
                        <th className="px-3 py-3 font-medium">Status</th>
                        <th className="px-3 py-3 font-medium">Scheduled for</th>
                        <th className="px-5 py-3 font-medium"><span className="sr-only">Actions</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {saved.map((b) => (
                        <tr key={b.id} className="border-b border-gray-50 last:border-0">
                          <td className="px-5 py-3">
                            <div className="font-medium text-gray-900">{b.title}</div>
                            <div className="text-xs text-gray-500">{b.template_name}</div>
                            {b.last_error && <div className="mt-1 text-xs text-amber-700 max-w-xs">{b.last_error}</div>}
                          </td>
                          <td className="px-3 py-3 text-gray-700">{audienceText(b.audience)}</td>
                          <td className="px-3 py-3 text-gray-700 tabular-nums">{b.recipient_count}</td>
                          <td className="px-3 py-3">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${STATUS_PILL[b.status]}`}>{b.status}</span>
                          </td>
                          <td className="px-3 py-3 text-gray-700 whitespace-nowrap">
                            {dateText(b.scheduled_at)}
                            {isOverdue(b) && (
                              <span className="block text-xs text-amber-700">
                                {settings?.sending_enabled ? 'Due now: goes out within a minute' : 'Not sent: WhatsApp not connected yet'}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-end gap-1.5">
                              {settings?.sending_enabled && (
                                <button
                                  type="button"
                                  onClick={() => setPendingSend(b)}
                                  disabled={!canSend(b) || sendingId === b.id}
                                  title={canSend(b) ? undefined : 'Meta has not approved this message yet'}
                                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] transition-colors disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed whitespace-nowrap"
                                >
                                  {sendingId === b.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <Send className="w-3.5 h-3.5" aria-hidden="true" />} Send now
                                </button>
                              )}
                              <button type="button" onClick={() => startEdit(b)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors">
                                <Pencil className="w-3.5 h-3.5" aria-hidden="true" /> Edit
                              </button>
                              <button type="button" onClick={() => setPendingDelete(b)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 bg-white border border-red-200 hover:bg-red-50 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {tab === 'templates' && (
              <TemplateManager
                templates={templates}
                loading={loading}
                sendingEnabled={!!settings?.sending_enabled}
                onToast={(message, type) => setToast({ message, type })}
                onChanged={async (message) => {
                  setToast({ message, type: 'success' });
                  await loadAll();
                }}
              />
            )}

            {tab === 'history' && <BroadcastHistory broadcasts={broadcasts} loading={loading} sendingEnabled={!!settings?.sending_enabled} />}

            {tab === 'optouts' && <OptOutList onToast={(message, type) => setToast({ message, type })} />}

            {/* Only once loaded: an empty form saved by mistake would wipe the saved details. */}
            {tab === 'settings' && !settings && (
              <p className="py-12 text-center text-sm text-gray-500">
                {loading ? 'Loading settings…' : 'The settings could not be loaded. Refresh and try again.'}
              </p>
            )}

            {tab === 'settings' && settings && (
              <WhatsAppSettingsForm
                key={settings?.updated_at || 'empty'}
                settings={settings}
                onSaved={(next, message) => {
                  setSettings(next);
                  setToast({ message, type: 'success' });
                }}
              />
            )}
          </div>
        </main>
      </div>

      <ConfirmationDialog
        isOpen={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        type="error"
        title="Delete broadcast?"
        message={`This removes "${pendingDelete?.title}". This cannot be undone.`}
        confirmText="Delete"
      />

      <ConfirmationDialog
        isOpen={!!pendingSend}
        onClose={() => setPendingSend(null)}
        onConfirm={confirmSend}
        type="warning"
        title="Send this broadcast now?"
        message={`"${pendingSend?.title}" goes to about ${pendingSend?.recipient_count ?? 0} customers on WhatsApp right away. This can't be undone.`}
        confirmText="Send now"
      />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
