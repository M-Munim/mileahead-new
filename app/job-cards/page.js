'use client';

import { useState, useEffect, useCallback } from 'react';
import { ClipboardList, RefreshCw, AlertCircle, Plus, Search, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Toast from '../components/Toast';
import NewJobCardModal from '../components/NewJobCardModal';
import JobCardModal from '../components/JobCardModal';
import { jobCardService } from '../../utils/axiosInstance';
import { STATUS_LABEL, STATUS_PILL, OPEN_STATUSES, vehicleText, phoneText } from '../../utils/jobCards';
import { qar } from '../../utils/inventory';

/**
 * Job Cards: the work order for each visit. Find or add the customer, pick the
 * vehicle, record mileage / fuel / damage / requests / services, then move it
 * along: open → in progress → quality check → ready → delivered.
 */

const PAGE_SIZE = 50;
const TABS = [
  { key: 'active', label: 'Active' },
  ...OPEN_STATUSES.map((s) => ({ key: s, label: STATUS_LABEL[s] })),
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: '', label: 'All' },
];

const when = (d) => new Date(String(d).replace(' ', 'T')).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function JobCardsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tab, setTab] = useState('active');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({});
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [toast, setToast] = useState(null);

  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);

  useEffect(() => {
    const t = setTimeout(() => { setQuery(search.trim()); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: PAGE_SIZE };
      if (tab) params.status = tab;
      if (query) params.search = query;
      const [res, techs] = await Promise.all([jobCardService.getAll(params), jobCardService.technicians().catch(() => null)]);
      setRows(res.data?.data || []);
      setTotal(res.data?.total || 0);
      setCounts(res.data?.counts || {});
      if (techs) setTechnicians(techs.data?.data || []);
      setLoadError(null);
    } catch (err) {
      console.error('Load job cards error:', err);
      setLoadError(err?.status === 404
        ? 'The server is not updated for job cards yet. This page works once the backend update is live.'
        : err?.message || 'Could not load the job cards.');
    } finally {
      setLoading(false);
    }
  }, [tab, query, page]);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  const countFor = (key) => (key === 'active' ? OPEN_STATUSES.reduce((s, k) => s + (counts[k] || 0), 0)
    : key === '' ? Object.values(counts).reduce((s, n) => s + n, 0) : counts[key] || 0);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex min-h-screen bg-gray-50 overflow-x-hidden">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={toggleSidebar} aria-hidden="true" />}

      <div className="flex-1 flex flex-col min-h-screen lg:ml-[240px] w-full lg:w-auto overflow-x-hidden">
        <div className="px-4 md:px-6 pt-4 md:pt-6">
          <Header title="Job Cards" toggleSidebar={toggleSidebar} />
        </div>

        <main className="flex-1 px-4 md:px-6 pb-6 overflow-x-hidden">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
                  <ClipboardList className="w-5 h-5 text-[var(--primary)]" aria-hidden="true" />
                </div>
                <div>
                  <h1 className="text-base font-semibold text-gray-900">Job Cards</h1>
                  <p className="text-xs text-gray-500">The work order for each visit: checks, services, technician and progress</p>
                </div>
              </div>
              <div className="flex gap-2 self-start sm:self-auto">
                <button onClick={load} disabled={loading} className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60">
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" /> Refresh
                </button>
                <button onClick={() => setCreating(true)} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors">
                  <Plus className="w-4 h-4" aria-hidden="true" /> New job card
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

            <div role="tablist" aria-label="Job card status" className="flex gap-1 px-5 pt-4 border-b border-gray-100 overflow-x-auto">
              {TABS.map((t) => (
                <button
                  key={t.key || 'all'}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.key}
                  onClick={() => { setTab(t.key); setPage(1); }}
                  className={`px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                    tab === t.key ? 'border-[var(--primary)] text-[var(--primary-dark)]' : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {t.label} ({countFor(t.key)})
                </button>
              ))}
            </div>

            <div className="px-5 py-4 border-b border-gray-100">
              <div className="relative max-w-sm">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search job number, customer, phone or plate" aria-label="Search job cards" className="!pl-9" />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-semibold text-gray-500">
                    <th className="px-5 py-3">Job</th>
                    <th className="px-3 py-3">Customer</th>
                    <th className="px-3 py-3">Vehicle</th>
                    <th className="px-3 py-3">Services</th>
                    <th className="px-3 py-3">Technician</th>
                    <th className="px-3 py-3 text-right">Total</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && rows.length === 0 ? (
                    <tr><td colSpan={7} className="py-12 text-center text-gray-500"><Loader2 className="w-5 h-5 animate-spin inline" aria-hidden="true" /> Loading…</td></tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-500">
                        <ClipboardList className="w-7 h-7 mx-auto mb-2 text-gray-300" aria-hidden="true" />
                        No job cards {query ? 'match this search' : 'here'}.{' '}
                        <button type="button" onClick={() => setCreating(true)} className="text-[var(--primary)] font-medium underline">Create one</button>
                      </td>
                    </tr>
                  ) : rows.map((j) => (
                    <tr key={j.id} onClick={() => setOpenId(j.id)} className="border-b border-gray-50 hover:bg-gray-50/60 cursor-pointer">
                      <td className="px-5 py-3">
                        <button type="button" onClick={(e) => { e.stopPropagation(); setOpenId(j.id); }} className="font-semibold text-[var(--primary)] hover:underline">{j.job_number}</button>
                        <span className="block text-[11px] text-gray-500 whitespace-nowrap">{when(j.created_at)}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="block text-gray-900">{j.customer.name}</span>
                        <span className="block text-[11px] text-gray-500" dir="ltr">{phoneText(j.customer.phone)}</span>
                      </td>
                      <td className="px-3 py-3 text-gray-700 max-w-[220px]">{vehicleText(j.vehicle)}</td>
                      <td className="px-3 py-3 text-gray-600 max-w-[240px] truncate">{j.services.map((s) => s.name).join(', ') || '—'}</td>
                      <td className="px-3 py-3 text-gray-700">{j.technician || '—'}</td>
                      <td className="px-3 py-3 text-right tabular-nums font-semibold text-gray-900 whitespace-nowrap">{qar(j.total)}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${STATUS_PILL[j.status]}`}>{STATUS_LABEL[j.status]}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {total > PAGE_SIZE && (
              <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-gray-100 text-sm text-gray-600">
                <span>{total} job cards · page {page} of {pages}</span>
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

      {creating && (
        <NewJobCardModal
          technicians={technicians}
          onClose={() => setCreating(false)}
          onCreated={(job) => {
            setCreating(false);
            setToast({ message: `Job card ${job.job_number} created`, type: 'success' });
            setOpenId(job.id);
            load();
          }}
          onOpenExisting={(id) => { setCreating(false); setOpenId(id); }}
        />
      )}
      {openId && (
        <JobCardModal
          key={openId}
          id={openId}
          technicians={technicians}
          onClose={() => setOpenId(null)}
          onChanged={(job, message) => { setToast({ message: message || `${job.job_number} saved`, type: 'success' }); load(); }}
        />
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
