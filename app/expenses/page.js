'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Receipt, RefreshCw, AlertCircle, Plus, Search, Pencil, Trash2, Download, FileText, Loader2,
  Zap, Building2, BedDouble, Users, Wallet, CircleEllipsis, ChevronLeft, ChevronRight,
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Toast from '../components/Toast';
import ExpenseModal from '../components/ExpenseModal';
import DeleteWithReasonModal from '../components/DeleteWithReasonModal';
import { expenseService } from '../../utils/axiosInstance';
import { isoDate } from '../../utils/dayClose';
import { qar, downloadCsv } from '../../utils/inventory';
import { EXPENSE_TYPES, EXPENSE_LABEL, EXPENSE_PILL, expensesCsv } from '../../utils/expenses';

/**
 * Expenses (Super Admin): utility bills, the wash center rent, the workers'
 * room rent, salaries and other costs, each with its bill saved (PDF/photo).
 * Totals per type for the chosen period, Excel download.
 */

const PAGE_SIZE = 50;
const TYPE_ICON = { utility: Zap, shop_rent: Building2, room_rent: BedDouble, salary: Users, other: CircleEllipsis };

function periods() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  return [
    { key: 'this_month', label: 'This month', from: isoDate(new Date(y, m, 1)), to: isoDate(new Date(y, m + 1, 0)) },
    { key: 'last_month', label: 'Last month', from: isoDate(new Date(y, m - 1, 1)), to: isoDate(new Date(y, m, 0)) },
    { key: 'this_year', label: 'This year', from: `${y}-01-01`, to: `${y}-12-31` },
    { key: 'all', label: 'All time', from: '', to: '' },
  ];
}

const dayText = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export default function ExpensesPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [periodKey, setPeriodKey] = useState('this_month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState(''); // search, applied after typing stops
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [amount, setAmount] = useState(0);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [editing, setEditing] = useState(undefined); // undefined = closed, null = new
  const [deleting, setDeleting] = useState(null);
  const [openingBill, setOpeningBill] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState(null);

  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);

  const range = useMemo(() => {
    if (periodKey === 'custom') return { from: customFrom, to: customTo };
    const p = periods().find((x) => x.key === periodKey);
    return { from: p.from, to: p.to };
  }, [periodKey, customFrom, customTo]);

  const periodText = periodKey === 'custom'
    ? `${customFrom ? dayText(customFrom) : '…'} – ${customTo ? dayText(customTo) : '…'}`
    : periods().find((x) => x.key === periodKey).label;

  useEffect(() => {
    const t = setTimeout(() => { setQuery(search.trim()); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const params = useCallback((extra = {}) => {
    const p = { ...extra };
    if (range.from) p.from = range.from;
    if (range.to) p.to = range.to;
    if (type) p.type = type;
    if (query) p.search = query;
    return p;
  }, [range, type, query]);

  const load = useCallback(async () => {
    setLoading(true);
    const summaryParams = {};
    if (range.from) summaryParams.from = range.from;
    if (range.to) summaryParams.to = range.to;
    const results = await Promise.allSettled([
      expenseService.getAll(params({ page, limit: PAGE_SIZE })),
      expenseService.getSummary(summaryParams),
    ]);
    const [listResult, summaryResult] = results;
    if (listResult.status === 'fulfilled') {
      const d = listResult.value.data || {};
      setRows(d.data || []);
      setTotal(d.total || 0);
      setAmount(d.amount || 0);
    }
    if (summaryResult.status === 'fulfilled') setSummary(summaryResult.value.data?.data || null);
    const failed = results.find((r) => r.status === 'rejected');
    if (failed) {
      console.error('Load expenses error:', failed.reason);
      setLoadError(failed.reason?.status === 404
        ? 'The server is not updated for expenses yet. This page works once the backend update is live.'
        : failed.reason?.message || 'Could not load the expenses.');
    } else {
      setLoadError(null);
    }
    setLoading(false);
  }, [params, range, page]);

  useEffect(() => {
    if (periodKey === 'custom' && customFrom && customTo && customFrom > customTo) return undefined;
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load, periodKey, customFrom, customTo]);

  const save = async (formData) => {
    if (editing) await expenseService.update(editing.id, formData);
    else await expenseService.add(formData);
    setToast({ message: editing ? 'Expense updated' : 'Expense saved', type: 'success' });
    setEditing(undefined);
    await load();
  };

  const remove = async (reason) => {
    await expenseService.remove(deleting.id, reason);
    setToast({ message: 'Expense deleted', type: 'success' });
    setDeleting(null);
    await load();
  };

  // The bill needs the login, so it is fetched and opened as a local file.
  const openBill = async (e) => {
    const win = window.open('', '_blank');
    setOpeningBill(e.id);
    try {
      const res = await expenseService.getBill(e.id);
      const url = URL.createObjectURL(res.data);
      if (win) win.location.href = url;
      else window.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      win?.close();
      console.error('Open bill error:', err);
      setToast({ message: err?.status === 404 ? 'The bill file could not be found.' : 'Could not open the bill.', type: 'error' });
    } finally {
      setOpeningBill(null);
    }
  };

  const exportExcel = async () => {
    setExporting(true);
    try {
      const all = [];
      for (let p = 1; p <= 20; p += 1) {
        const res = await expenseService.getAll(params({ page: p, limit: 500 }));
        const batch = res.data?.data || [];
        all.push(...batch);
        if (all.length >= (res.data?.total || 0) || batch.length < 500) break;
      }
      const name = range.from || range.to ? `${range.from || 'start'}_to_${range.to || 'now'}` : 'all';
      downloadCsv(expensesCsv(all, `${periodText}${type ? ` · ${EXPENSE_LABEL[type]}` : ''}`), `MagicTrack-Expenses-${name}.csv`);
    } catch (err) {
      setToast({ message: err?.message || 'Could not download.', type: 'error' });
    } finally {
      setExporting(false);
    }
  };

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const by = summary?.by_type || {};

  return (
    <div className="flex min-h-screen bg-gray-50 overflow-x-hidden">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={toggleSidebar} aria-hidden="true" />}

      <div className="flex-1 flex flex-col min-h-screen lg:ml-[240px] w-full lg:w-auto overflow-x-hidden">
        <div className="px-4 md:px-6 pt-4 md:pt-6">
          <Header title="Expenses" toggleSidebar={toggleSidebar} />
        </div>

        <main className="flex-1 px-4 md:px-6 pb-6 overflow-x-hidden space-y-4">
          {/* Totals for the period, per type. Tapping one filters the list. */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <div className="border px-4 py-3.5 bg-[var(--primary)] text-white border-[var(--primary)]">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-white/85">
                <Wallet className="w-3.5 h-3.5" aria-hidden="true" /> Total · {periodText}
              </div>
              <div className="text-xl font-extrabold mt-1 tabular-nums">{qar(summary?.total)}</div>
              <div className="text-[11px] mt-0.5 text-white/80">{summary?.count || 0} expenses</div>
            </div>
            {EXPENSE_TYPES.map((t) => {
              const Icon = TYPE_ICON[t];
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setType(type === t ? '' : t); setPage(1); }}
                  aria-pressed={type === t}
                  className={`border px-4 py-3.5 text-left transition-colors ${type === t ? 'border-[var(--primary)] bg-[var(--primary)]/5' : 'bg-white border-gray-200 hover:border-gray-300'}`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                    <Icon className="w-3.5 h-3.5" aria-hidden="true" /> {EXPENSE_LABEL[t]}
                  </div>
                  <div className="text-xl font-extrabold mt-1 tabular-nums text-gray-900">{qar(by[t]?.amount)}</div>
                  <div className="text-[11px] mt-0.5 text-gray-500">{by[t]?.count || 0} entries</div>
                </button>
              );
            })}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
                  <Receipt className="w-5 h-5 text-[var(--primary)]" aria-hidden="true" />
                </div>
                <div>
                  <h1 className="text-base font-semibold text-gray-900">Expenses</h1>
                  <p className="text-xs text-gray-500">Utility bills, rent, workers&apos; room and salaries, with the bills saved. Only the Super Admin sees this page.</p>
                </div>
              </div>
              <div className="flex gap-2 self-start sm:self-auto">
                <button onClick={load} disabled={loading} className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60">
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" /> Refresh
                </button>
                <button onClick={() => setEditing(null)} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors">
                  <Plus className="w-4 h-4" aria-hidden="true" /> Add expense
                </button>
              </div>
            </div>

            {loadError && (
              <div className="mx-5 mt-4 px-3 py-2 flex items-center gap-2 text-sm bg-red-50 border border-red-200 text-red-700" role="alert">
                <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="mr-auto">{loadError}</span>
                <button onClick={load} className="text-xs font-semibold underline">Try again</button>
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap items-end gap-3 px-5 py-4 border-b border-gray-100">
              <div className="flex flex-wrap gap-1">
                {[...periods(), { key: 'custom', label: 'Pick dates' }].map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => { setPeriodKey(p.key); setPage(1); }}
                    className={`px-3 py-2 text-xs font-medium border transition-colors ${
                      periodKey === p.key ? 'border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--primary-dark)]' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              {periodKey === 'custom' && (
                <>
                  <div>
                    <label htmlFor="exp-from" className="text-xs">From</label>
                    <input id="exp-from" type="date" value={customFrom} max={customTo || undefined} onChange={(e) => { setCustomFrom(e.target.value); setPage(1); }} />
                  </div>
                  <div>
                    <label htmlFor="exp-to" className="text-xs">To</label>
                    <input id="exp-to" type="date" value={customTo} min={customFrom || undefined} onChange={(e) => { setCustomTo(e.target.value); setPage(1); }} />
                  </div>
                </>
              )}
              <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} aria-label="Type" className="!w-auto">
                <option value="">All types</option>
                {EXPENSE_TYPES.map((t) => <option key={t} value={t}>{EXPENSE_LABEL[t]}</option>)}
              </select>
              <div className="relative flex-1 min-w-[180px] max-w-xs">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or note" aria-label="Search expenses" className="!pl-9" />
              </div>
              <button
                type="button"
                onClick={exportExcel}
                disabled={exporting || total === 0}
                className="sm:ml-auto flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-40"
              >
                {exporting ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Download className="w-4 h-4" aria-hidden="true" />} Excel
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-semibold text-gray-500">
                    <th className="px-5 py-3">Date</th>
                    <th className="px-3 py-3">Type</th>
                    <th className="px-3 py-3">Paid to</th>
                    <th className="px-3 py-3">Note</th>
                    <th className="px-3 py-3 text-right">Amount</th>
                    <th className="px-3 py-3">Bill</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && rows.length === 0 ? (
                    <tr><td colSpan={7} className="py-12 text-center text-gray-500"><Loader2 className="w-5 h-5 animate-spin inline" aria-hidden="true" /> Loading…</td></tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-500">
                        <Receipt className="w-7 h-7 mx-auto mb-2 text-gray-300" aria-hidden="true" />
                        No expenses {type || query ? 'match these filters' : 'in this period'}.{' '}
                        <button type="button" onClick={() => setEditing(null)} className="text-[var(--primary)] font-medium underline">Add one</button>
                      </td>
                    </tr>
                  ) : rows.map((e) => (
                    <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50/60">
                      <td className="px-5 py-3 text-gray-700 whitespace-nowrap">{dayText(e.expense_date)}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${EXPENSE_PILL[e.type]}`}>{EXPENSE_LABEL[e.type]}</span>
                      </td>
                      <td className="px-3 py-3 text-gray-900">{e.paid_to || '—'}</td>
                      <td className="px-3 py-3 text-gray-600 max-w-[260px]">{e.note || '—'}</td>
                      <td className="px-3 py-3 text-right tabular-nums font-semibold text-gray-900 whitespace-nowrap">{qar(e.amount)}</td>
                      <td className="px-3 py-3">
                        {e.has_bill ? (
                          <button
                            type="button"
                            onClick={() => openBill(e)}
                            disabled={openingBill === e.id}
                            className="flex items-center gap-1 text-xs font-medium text-[var(--primary)] hover:underline disabled:opacity-60"
                          >
                            {openingBill === e.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <FileText className="w-3.5 h-3.5" aria-hidden="true" />} View
                          </button>
                        ) : <span className="text-xs text-gray-400">None</span>}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button type="button" onClick={() => setEditing(e)} title="Edit" aria-label="Edit expense" className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100">
                            <Pencil className="w-4 h-4" aria-hidden="true" />
                          </button>
                          <button type="button" onClick={() => setDeleting(e)} title="Delete" aria-label="Delete expense" className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50">
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {rows.length > 0 && (
                  <tfoot>
                    <tr className="bg-gray-50">
                      <td colSpan={4} className="px-5 py-3 text-sm font-semibold text-gray-700">
                        Total{type || query ? ' (filtered)' : ''} · {total} expense{total === 1 ? '' : 's'}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums font-extrabold text-gray-900 whitespace-nowrap">{qar(amount)}</td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {total > PAGE_SIZE && (
              <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-gray-100 text-sm text-gray-600">
                <span>Page {page} of {pages}</span>
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
        </main>
      </div>

      {editing !== undefined && <ExpenseModal expense={editing} onClose={() => setEditing(undefined)} onSubmit={save} />}
      {deleting && (
        <DeleteWithReasonModal
          title="Delete this expense?"
          detail={`${EXPENSE_LABEL[deleting.type]} · ${dayText(deleting.expense_date)} · ${qar(deleting.amount)}${deleting.paid_to ? ` · ${deleting.paid_to}` : ''}`}
          onClose={() => setDeleting(null)}
          onSubmit={remove}
        />
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
