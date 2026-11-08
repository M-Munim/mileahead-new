'use client';

import { Fragment, useState } from 'react';
import { ChevronDown, ChevronRight, History } from 'lucide-react';
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

export default function BroadcastHistory({ broadcasts, loading }) {
  const [openId, setOpenId] = useState(null);
  const rows = broadcasts.filter((b) => HISTORY_STATUSES.includes(b.status));

  if (rows.length === 0) {
    return (
      <div className="py-12 px-5 text-center text-gray-500">
        <History className="w-8 h-8 mx-auto mb-3 text-gray-300" aria-hidden="true" />
        <p className="text-sm">
          {loading ? 'Loading history…' : 'Nothing sent yet. Sent broadcasts show here once the Meta account is connected.'}
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
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${STATUS_PILL[b.status]}`}>{b.status}</span>
                  </td>
                </tr>
                {open && (
                  <tr className="border-b border-gray-50 bg-gray-50/60">
                    <td colSpan={8} className="px-5 py-3">
                      <p className="text-xs text-gray-500 mb-1">
                        Template <span className="font-mono">{b.template_name}</span> · {b.template_language}
                        {b.created_by ? ` · by ${b.created_by}` : ''}
                      </p>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{b.message_body}</p>
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
