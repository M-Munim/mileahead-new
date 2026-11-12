'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertCircle, ChevronLeft, ChevronRight, History, Download } from 'lucide-react';
import { inventoryService } from '../../utils/axiosInstance';
import { MOVE_LABEL, MOVE_PILL, qty, qar, historyCsv, downloadCsv } from '../../utils/inventory';

const EXPORT_PAGE = 200;
const EXPORT_MAX_PAGES = 50; // 10,000 rows

const PAGE_SIZE = 50;

const when = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

/**
 * Every stock change, newest first, with filters. `items` fills the item
 * filter; `reloadKey` changes after a new change is recorded elsewhere.
 */
export default function InventoryHistory({ items, reloadKey, initialItemId = '' }) {
  const [itemId, setItemId] = useState(initialItemId ? String(initialItemId) : '');
  const [type, setType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  const filters = useCallback(() => {
    const params = {};
    if (itemId) params.item_id = itemId;
    if (type) params.type = type;
    if (from) params.from = from;
    if (to) params.to = to;
    return params;
  }, [itemId, type, from, to]);

  const exportExcel = async () => {
    setExporting(true);
    setError('');
    try {
      const all = [];
      for (let p = 1; p <= EXPORT_MAX_PAGES; p += 1) {
        const res = await inventoryService.getMovements({ ...filters(), page: p, limit: EXPORT_PAGE });
        const batch = res.data?.data || [];
        all.push(...batch);
        if (all.length >= (res.data?.total || 0) || batch.length < EXPORT_PAGE) break;
      }
      const itemName = items.find((i) => String(i.id) === itemId)?.name;
      const filterText = [
        itemName,
        type && MOVE_LABEL[type],
        (from || to) && `${from || '…'} to ${to || '…'}`,
      ].filter(Boolean).join(' · ');
      downloadCsv(historyCsv(all, filterText), `MagicTrack-StockHistory-${from || 'all'}${to ? `_to_${to}` : ''}.csv`);
    } catch (err) {
      console.error('Export stock history error:', err);
      setError(err?.message || 'Could not download the history.');
    } finally {
      setExporting(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { ...filters(), page, limit: PAGE_SIZE };
      const res = await inventoryService.getMovements(params);
      setRows(res.data?.data || []);
      setTotal(res.data?.total || 0);
    } catch (err) {
      console.error('Load stock history error:', err);
      setError(err?.message || 'Could not load the history.');
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => { load(); }, [load, reloadKey]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filter = (setter) => (e) => { setter(e.target.value); setPage(1); };

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 px-5 py-4 border-b border-gray-100">
        <div className="min-w-[180px] flex-1 sm:flex-none">
          <label htmlFor="hist-item" className="text-xs">Item</label>
          <select id="hist-item" value={itemId} onChange={filter(setItemId)}>
            <option value="">All items</option>
            {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="hist-type" className="text-xs">Change</label>
          <select id="hist-type" value={type} onChange={filter(setType)}>
            <option value="">All</option>
            {Object.entries(MOVE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="hist-from" className="text-xs">From</label>
          <input id="hist-from" type="date" value={from} max={to || undefined} onChange={filter(setFrom)} />
        </div>
        <div>
          <label htmlFor="hist-to" className="text-xs">To</label>
          <input id="hist-to" type="date" value={to} min={from || undefined} onChange={filter(setTo)} />
        </div>
        {(itemId || type || from || to) && (
          <button
            type="button"
            onClick={() => { setItemId(''); setType(''); setFrom(''); setTo(''); setPage(1); }}
            className="px-3 py-2 text-xs font-medium text-gray-600 hover:text-gray-900 underline"
          >
            Clear filters
          </button>
        )}
        <button
          type="button"
          onClick={exportExcel}
          disabled={exporting || total === 0}
          className="sm:ml-auto flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-40"
        >
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Download className="w-4 h-4" aria-hidden="true" />} Excel
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
              <th className="px-5 py-3">When</th>
              <th className="px-3 py-3">Item</th>
              <th className="px-3 py-3">Change</th>
              <th className="px-3 py-3 text-right">Qty</th>
              <th className="px-3 py-3 text-right">Stock after</th>
              <th className="px-3 py-3 text-right">Price</th>
              <th className="px-3 py-3">Note</th>
              <th className="px-5 py-3">By</th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              <tr><td colSpan={8} className="py-12 text-center text-gray-500"><Loader2 className="w-5 h-5 animate-spin inline" aria-hidden="true" /> Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-gray-500">
                  <History className="w-6 h-6 mx-auto mb-2 text-gray-300" aria-hidden="true" />
                  No stock changes {itemId || type || from || to ? 'match these filters' : 'yet'}.
                </td>
              </tr>
            ) : rows.map((m) => (
              <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50/60">
                <td className="px-5 py-2.5 text-gray-700 whitespace-nowrap">{when(m.created_at)}</td>
                <td className="px-3 py-2.5 text-gray-900">
                  {m.item_name}
                  {m.item_deleted && <span className="ml-1 text-[11px] text-red-600">(deleted)</span>}
                </td>
                <td className="px-3 py-2.5">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${MOVE_PILL[m.type]}`}>{MOVE_LABEL[m.type]}</span>
                </td>
                <td className={`px-3 py-2.5 text-right tabular-nums font-medium whitespace-nowrap ${m.change > 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {m.change > 0 ? '+' : '−'}{qty(Math.abs(m.change))} {m.item_unit}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-gray-700 whitespace-nowrap">{qty(m.balance)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-gray-700 whitespace-nowrap">
                  {m.unit_price != null ? (
                    <>
                      {qar(m.unit_price)}
                      <span className="block text-[11px] text-gray-500">total {qar(Math.abs(m.change) * m.unit_price)}</span>
                    </>
                  ) : '—'}
                </td>
                <td className="px-3 py-2.5 text-gray-600 max-w-[240px]">{m.note || '—'}</td>
                <td className="px-5 py-2.5 text-gray-600 whitespace-nowrap">{m.created_by || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-gray-100 text-sm text-gray-600">
          <span>{total} changes · page {page} of {pages}</span>
          <div className="flex gap-1">
            <button type="button" onClick={() => setPage((p) => p - 1)} disabled={page <= 1 || loading} aria-label="Previous page" className="p-2 border border-gray-300 hover:bg-gray-50 disabled:opacity-40">
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => setPage((p) => p + 1)} disabled={page >= pages || loading} aria-label="Next page" className="p-2 border border-gray-300 hover:bg-gray-50 disabled:opacity-40">
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
