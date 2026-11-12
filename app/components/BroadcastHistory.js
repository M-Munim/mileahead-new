'use client';

import { Fragment, useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, History, Loader2 } from 'lucide-react';
import { broadcastService } from '../../utils/axiosInstance';
import { audienceText, dateText } from '../../utils/broadcastText';

/**
 * Broadcasts that have gone out (or tried to), newest first, with how many
 * customers got, received and read each one. The counts come from Meta's
 * delivery reports, so they keep rising for a while after sending.
 */
export const HISTORY_STATUSES = ['sending', 'sent', 'failed', 'cancelled'];

const STATUS_PILL = {
  sending: 'bg-amber-100 text-amber-800',
  sent: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-600',
};

/** "120 (85%)", the share of the messages that were sent. */
const ofSent = (value, sent) => {
  const n = Number(value) || 0;
  return sent > 0 ? `${n} (${Math.round((n / sent) * 100)}%)` : String(n);
};

const RECIPIENT_STATUS = {
  pending: { label: 'Waiting', cls: 'text-gray-500' },
  sent: { label: 'Sent', cls: 'text-gray-700' },
  delivered: { label: 'Delivered', cls: 'text-blue-700' },
  read: { label: 'Read', cls: 'text-green-700' },
  failed: { label: 'Failed', cls: 'text-red-600' },
};

/** Each customer of one broadcast; failed ones first, with Meta's reason. */
function Recipients({ broadcast }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  // Re-read when the counts move (delivery reports coming in)
  const version = `${broadcast.status}-${broadcast.sent_count}-${broadcast.delivered_count}-${broadcast.read_count}-${broadcast.failed_count}`;

  useEffect(() => {
    let stale = false;
    broadcastService.getRecipients(broadcast.id)
      .then((res) => { if (!stale) { setRows(res.data?.data || []); setError(''); } })
      .catch((err) => { if (!stale) setError(err?.message || 'Could not load the customers.'); });
    return () => { stale = true; };
  }, [broadcast.id, version]);

  if (error) return <p className="text-xs text-red-700">{error}</p>;
  if (!rows) {
    return <p className="text-xs text-gray-500 flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> Loading customers…</p>;
  }
  if (!rows.length) return <p className="text-xs text-gray-500">No customer list for this broadcast.</p>;

  const sorted = [...rows].sort((a, b) => (a.status === 'failed' ? 0 : 1) - (b.status === 'failed' ? 0 : 1));
  return (
    <div className="max-h-72 overflow-y-auto border border-gray-200 bg-white">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-gray-50">
          <tr className="text-left text-gray-500">
            <th className="px-3 py-2 font-medium">Customer</th>
            <th className="px-3 py-2 font-medium">Number</th>
            <th className="px-3 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => {
            const s = RECIPIENT_STATUS[r.status] || RECIPIENT_STATUS.pending;
            return (
              <tr key={r.phone} className="border-t border-gray-100 align-top">
                <td className="px-3 py-1.5 text-gray-800" dir="auto">{r.name || '—'}</td>
                <td className="px-3 py-1.5 text-gray-700 tabular-nums" dir="ltr">+{r.phone}</td>
                <td className={`px-3 py-1.5 ${s.cls}`}>
                  <span className="font-medium">{s.label}</span>
                  {r.error && <span className="block text-[11px] text-red-600">{r.error}</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function BroadcastHistory({ broadcasts, loading, sendingEnabled }) {
  const [openId, setOpenId] = useState(null);
  const rows = broadcasts.filter((b) => HISTORY_STATUSES.includes(b.status));

  if (rows.length === 0) {
    return (
      <div className="py-12 px-5 text-center text-gray-500">
        <History className="w-8 h-8 mx-auto mb-3 text-gray-300" aria-hidden="true" />
        <p className="text-sm">
          {loading ? 'Loading history…'
            : sendingEnabled ? 'Nothing sent yet. Sent broadcasts show here with who got and read them.'
              : 'Nothing sent yet. Sent broadcasts show here once the Meta account is connected.'}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
            <th className="px-5 py-3 font-medium">Broadcast</th>
            <th className="px-3 py-3 font-medium">Sent on</th>
            <th className="px-3 py-3 font-medium">Customers</th>
            <th className="px-3 py-3 font-medium">Sent</th>
            <th className="px-3 py-3 font-medium">Delivered</th>
            <th className="px-3 py-3 font-medium">Read</th>
            <th className="px-3 py-3 font-medium">Failed</th>
            <th className="px-5 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => {
            const sent = Number(b.sent_count) || 0;
            const open = openId === b.id;
            return (
              <Fragment key={b.id}>
                <tr className="border-b border-gray-50">
                  <td className="px-5 py-3">
                    <button
                      type="button"
                      onClick={() => setOpenId(open ? null : b.id)}
                      aria-expanded={open}
                      className="flex items-start gap-1.5 text-left"
                    >
                      {open
                        ? <ChevronDown className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" aria-hidden="true" />
                        : <ChevronRight className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" aria-hidden="true" />}
                      <span>
                        <span className="block font-medium text-gray-900">{b.title}</span>
                        <span className="block text-xs text-gray-500">{audienceText(b.audience)}</span>
                      </span>
                    </button>
                  </td>
                  <td className="px-3 py-3 text-gray-700 whitespace-nowrap">{dateText(b.sent_at)}</td>
                  <td className="px-3 py-3 text-gray-700 tabular-nums">{b.recipient_count}</td>
                  <td className="px-3 py-3 text-gray-700 tabular-nums">{sent}</td>
                  <td className="px-3 py-3 text-gray-700 tabular-nums whitespace-nowrap">{ofSent(b.delivered_count, sent)}</td>
                  <td className="px-3 py-3 text-gray-700 tabular-nums whitespace-nowrap">{ofSent(b.read_count, sent)}</td>
                  <td className={`px-3 py-3 tabular-nums ${Number(b.failed_count) > 0 ? 'text-red-600 font-medium' : 'text-gray-700'}`}>
                    {Number(b.failed_count) || 0}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${STATUS_PILL[b.status]}`}>
                      {b.status === 'sending' && <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />}{b.status}
                    </span>
                    {b.last_error && (
                      <span className={`block mt-1 text-xs max-w-[220px] ${b.status === 'sending' ? 'text-amber-700' : 'text-red-700'}`}>{b.last_error}</span>
                    )}
                  </td>
                </tr>
                {open && (
                  <tr className="border-b border-gray-50 bg-gray-50/60">
                    <td colSpan={8} className="px-5 py-3 space-y-3">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">
                          Template <span className="font-mono">{b.template_name}</span> · {b.template_language}
                          {b.created_by ? ` · by ${b.created_by}` : ''}
                        </p>
                        <p className="text-sm text-gray-800 whitespace-pre-wrap break-words" dir="auto">{b.message_body}</p>
                      </div>
                      <Recipients broadcast={b} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
