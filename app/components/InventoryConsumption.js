'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertCircle, Download, CalendarDays, PackageOpen } from 'lucide-react';
import { inventoryService } from '../../utils/axiosInstance';
import { isoDate } from '../../utils/dayClose';
import { qty, qar, consumptionCsv, downloadCsv } from '../../utils/inventory';

/** Quick periods. The week starts on Sunday, as in Qatar. */
function presets() {
  const now = new Date();
  const day = (offset) => { const d = new Date(now); d.setDate(d.getDate() + offset); return isoDate(d); };
  const today = isoDate(now);
  return [
    { label: 'Today', from: today, to: today },
    { label: 'Yesterday', from: day(-1), to: day(-1) },
    { label: 'This week', from: day(-now.getDay()), to: today },
    { label: 'This month', from: isoDate(new Date(now.getFullYear(), now.getMonth(), 1)), to: today },
  ];
}

const dayText = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

/**
 * Stock consumption by calendar: pick a day (or a range) and see what was
 * used in washing and sold, per item, with its value.
 */
export default function InventoryConsumption({ reloadKey }) {
  const [from, setFrom] = useState(() => isoDate(new Date()));
  const [to, setTo] = useState(() => isoDate(new Date()));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!from || !to || from > to) return;
    setLoading(true);
    setError('');
    try {
      const res = await inventoryService.getConsumption({ from, to });
      setData(res.data?.data || null);
    } catch (err) {
      console.error('Load consumption error:', err);
      setError(err?.message || 'Could not load the consumption.');
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load, reloadKey]);

  const rangeText = from === to ? dayText(from) : `${dayText(from)} – ${dayText(to)}`;
  const items = data?.items || [];

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 px-5 py-4 border-b border-gray-100">
        <div className="flex flex-wrap gap-1">
          {presets().map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => { setFrom(p.from); setTo(p.to); }}
              className={`px-3 py-2 text-xs font-medium border transition-colors ${
                from === p.from && to === p.to ? 'border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--primary-dark)]' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div>
          <label htmlFor="cons-from" className="text-xs">From</label>
          <input id="cons-from" type="date" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} />
        </div>
        <div>
          <label htmlFor="cons-to" className="text-xs">To</label>
          <input id="cons-to" type="date" value={to} min={from} onChange={(e) => e.target.value && setTo(e.target.value)} />
        </div>
        <button
          type="button"
          onClick={() => downloadCsv(consumptionCsv(data, rangeText), `MagicTrack-Consumption-${from}${from === to ? '' : `_to_${to}`}.csv`)}
          disabled={!items.length}
          className="sm:ml-auto flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-40"
        >
          <Download className="w-4 h-4" aria-hidden="true" /> Excel
        </button>
      </div>

      {error && (
        <div className="mx-5 mt-4 px-3 py-2 flex items-center gap-2 text-sm bg-red-50 border border-red-200 text-red-700" role="alert">
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span className="mr-auto">{error}</span>
          <button onClick={load} className="text-xs font-semibold underline">Try again</button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 px-5 pt-4 text-sm">
        <span className="flex items-center gap-1.5 font-semibold text-gray-900">
          <CalendarDays className="w-4 h-4 text-[var(--primary)]" aria-hidden="true" /> {rangeText}
        </span>
        {data && (
          <>
            <span className="text-gray-600">Used in washing: <b className="text-gray-900">{qar(data.used_value)}</b></span>
            <span className="text-gray-600">Sold: <b className="text-gray-900">{qar(data.sold_value)}</b></span>
          </>
        )}
      </div>

      <div className="overflow-x-auto mt-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs font-semibold text-gray-500">
              <th className="px-5 py-3">Item</th>
              <th className="px-3 py-3">Category</th>
              <th className="px-3 py-3 text-right">Used</th>
              <th className="px-3 py-3 text-right">Sold</th>
              <th className="px-3 py-3 text-right">Value used</th>
              <th className="px-5 py-3 text-right">Sales</th>
            </tr>
          </thead>
          <tbody>
            {loading && !data ? (
              <tr><td colSpan={6} className="py-12 text-center text-gray-500"><Loader2 className="w-5 h-5 animate-spin inline" aria-hidden="true" /> Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-gray-500">
                  <PackageOpen className="w-7 h-7 mx-auto mb-2 text-gray-300" aria-hidden="true" />
                  Nothing was used or sold on {from === to ? 'this day' : 'these days'}.
                </td>
              </tr>
            ) : items.map((i) => (
              <tr key={i.item_id} className="border-b border-gray-50 hover:bg-gray-50/60">
                <td className="px-5 py-2.5 text-gray-900">
                  {i.name}
                  {i.code && <span className="ml-1.5 font-mono text-[11px] text-gray-500">{i.code}</span>}
                  {i.item_deleted && <span className="ml-1 text-[11px] text-red-600">(deleted)</span>}
                </td>
                <td className="px-3 py-2.5 text-gray-600">{i.category || '—'}</td>
                <td className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap">{i.used ? `${qty(i.used)} ${i.unit}` : '—'}</td>
                <td className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap">{i.sold ? `${qty(i.sold)} ${i.unit}` : '—'}</td>
                <td className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap text-gray-700">{i.used ? qar(i.used_value) : '—'}</td>
                <td className="px-5 py-2.5 text-right tabular-nums whitespace-nowrap text-gray-700">{i.sold ? qar(i.sold_value) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
