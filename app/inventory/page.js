'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Boxes, RefreshCw, AlertCircle, AlertTriangle, Plus, Search, Pencil, Trash2, History,
  ArrowDownToLine, ArrowUpFromLine, ShoppingCart, ClipboardList, Wallet, PackageOpen, TrendingUp, Truck, Loader2,
  Download, ShoppingBag,
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Toast from '../components/Toast';
import InventoryItemModal from '../components/InventoryItemModal';
import StockMoveModal from '../components/StockMoveModal';
import InventoryDeleteModal from '../components/InventoryDeleteModal';
import InventoryHistory from '../components/InventoryHistory';
import ReorderModal from '../components/ReorderModal';
import { useAuth } from '../contexts/AuthContext';
import { inventoryService } from '../../utils/axiosInstance';
import { isoDate } from '../../utils/dayClose';
import { KIND_LABEL, KIND_PILL, CATEGORIES, qty, qar, stockCsv, downloadCsv } from '../../utils/inventory';
import InventoryConsumption from '../components/InventoryConsumption';
import MachineryList from '../components/MachineryList';

/**
 * Inventory (basic): wash supplies the team uses up and products sold to
 * customers. Staff record stock that came in, what was used or sold, and a
 * count when the shelf doesn't match. Low stock is flagged; the History tab
 * shows every change with who made it.
 */

const TABS = [
  { key: 'stock', label: 'Stock' },
  { key: 'consumption', label: 'Consumption' },
  { key: 'machinery', label: 'Machinery' },
  { key: 'history', label: 'History' },
];

function StatCard({ icon: Icon, label, value, sub, tone = 'default', onClick }) {
  const tones = {
    warn: 'bg-red-50 text-red-800 border-red-200',
    default: 'bg-white text-gray-900 border-gray-200',
  };
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      {...(onClick ? { type: 'button', onClick } : {})}
      className={`border px-4 py-3.5 text-left ${tones[tone]} ${onClick ? 'hover:border-red-300 transition-colors' : ''}`}
    >
      <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
        <Icon className="w-3.5 h-3.5" aria-hidden="true" /> {label}
      </div>
      <div className="text-xl font-extrabold mt-1 tabular-nums">{value}</div>
      {sub && <div className="text-[11px] mt-0.5 text-gray-500">{sub}</div>}
    </Tag>
  );
}

function monthRange() {
  const now = new Date();
  return { from: isoDate(new Date(now.getFullYear(), now.getMonth(), 1)), to: isoDate(now) };
}

export default function InventoryPage() {
  const { hasPermission } = useAuth();
  const canDelete = hasPermission('canDeleteInventory');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tab, setTab] = useState('stock');
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState('');
  const [category, setCategory] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [editing, setEditing] = useState(undefined); // undefined = closed, null = new item
  const [moving, setMoving] = useState(null); // { item, type }
  const [deleting, setDeleting] = useState(null);
  const [reorderOpen, setReorderOpen] = useState(false);
  const [historyItem, setHistoryItem] = useState('');
  const [historyKey, setHistoryKey] = useState(0);
  const [toast, setToast] = useState(null);

  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);

  const loadAll = useCallback(async () => {
    const results = await Promise.allSettled([inventoryService.getItems(), inventoryService.getSummary(monthRange())]);
    const [itemsResult, summaryResult] = results;
    if (itemsResult.status === 'fulfilled') setItems(itemsResult.value.data?.data || []);
    if (summaryResult.status === 'fulfilled') setSummary(summaryResult.value.data?.data || null);
    const failed = results.find((r) => r.status === 'rejected');
    if (failed) {
      console.error('Load inventory error:', failed.reason);
      setLoadError(failed.reason?.status === 404
        ? 'The server is not updated for inventory yet. This page works once the backend update is live.'
        : failed.reason?.message || 'Could not load the inventory.');
    } else {
      setLoadError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const first = setTimeout(loadAll, 0);
    return () => clearTimeout(first);
  }, [loadAll]);

  const refreshNow = () => {
    setLoading(true);
    loadAll();
    setHistoryKey((k) => k + 1);
  };

  // The client's categories first, then any other an older item still has
  const categories = useMemo(
    () => [...CATEGORIES, ...[...new Set(items.map((i) => i.category).filter((c) => c && !CATEGORIES.includes(c)))].sort()],
    [items],
  );
  const lowItems = useMemo(() => items.filter((i) => i.low_stock), [items]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) =>
      (!kind || i.kind === kind)
      && (!category || i.category === category)
      && (!lowOnly || i.low_stock)
      && (!q || [i.name, i.code, i.category, i.supplier].some((v) => String(v || '').toLowerCase().includes(q))));
  }, [items, search, kind, category, lowOnly]);

  // ---- actions ----
  const saveItem = async (body) => {
    if (editing) {
      await inventoryService.updateItem(editing.id, body);
      setToast({ message: `${body.name} saved`, type: 'success' });
    } else {
      await inventoryService.addItem(body);
      setToast({ message: `${body.name} added`, type: 'success' });
    }
    setEditing(undefined);
    await loadAll();
  };

  const saveMove = async (body) => {
    const res = await inventoryService.addMovement(body);
    const item = res.data?.data?.item;
    setToast({
      message: `${res.data?.message || 'Saved'}${item ? `: ${item.name} now ${qty(item.quantity)} ${item.unit}` : ''}`,
      type: 'success',
    });
    setMoving(null);
    setHistoryKey((k) => k + 1);
    await loadAll();
  };

  const deleteItem = async (reason) => {
    await inventoryService.removeItem(deleting.id, reason);
    setToast({ message: `${deleting.name} deleted`, type: 'success' });
    setDeleting(null);
    await loadAll();
  };

  const openHistory = (item) => {
    setHistoryItem(String(item.id));
    setTab('history');
  };

  const filtered = search || kind || category || lowOnly;

  const downloadStock = () => {
    const today = isoDate(new Date());
    downloadCsv(stockCsv(shown, new Date().toLocaleString('en-GB')), `MagicTrack-Stock-${today}.csv`);
    setToast({ message: `Stock list downloaded (${shown.length} items)`, type: 'success' });
  };

  return (
    <div className="flex min-h-screen bg-gray-50 overflow-x-hidden">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={toggleSidebar} aria-hidden="true" />
      )}

      <div className="flex-1 flex flex-col min-h-screen lg:ml-[240px] w-full lg:w-auto overflow-x-hidden">
        <div className="px-4 md:px-6 pt-4 md:pt-6">
          <Header title="Inventory" toggleSidebar={toggleSidebar} />
        </div>

        <main className="flex-1 px-4 md:px-6 pb-6 overflow-x-hidden space-y-4">
          {/* Totals */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <StatCard icon={Boxes} label="Items" value={items.length} sub={`${items.filter((i) => i.kind === 'product').length} for sale`} />
            <StatCard icon={Wallet} label="Stock value" value={qar(summary?.stock_value)} sub="At cost price" />
            <StatCard
              icon={AlertTriangle}
              label="Low stock"
              value={lowItems.length}
              sub={lowItems.length ? 'Tap to see them' : 'All stocked'}
              tone={lowItems.length ? 'warn' : 'default'}
              onClick={lowItems.length ? () => { setTab('stock'); setLowOnly(true); } : undefined}
            />
            <StatCard
              icon={TrendingUp}
              label="Sold this month"
              value={qar(summary?.sold_value)}
              sub={summary ? `${summary.sales_count} sales · profit ${qar(summary.sales_profit)}` : ' '}
            />
            <StatCard
              icon={Truck}
              label="Bought this month"
              value={qar(summary?.bought_value)}
              sub={summary ? `Used in washing: ${qar(summary.used_value)}` : ' '}
            />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            {/* Panel header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
                  <Boxes className="w-5 h-5 text-[var(--primary)]" aria-hidden="true" />
                </div>
                <div>
                  <h1 className="text-base font-semibold text-gray-900">Inventory</h1>
                  <p className="text-xs text-gray-500">Wash supplies and products for sale: what is in stock, what came in, what was used or sold</p>
                </div>
              </div>
              <div className="flex gap-2 self-start sm:self-auto">
                <button
                  onClick={refreshNow}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" /> Refresh
                </button>
                <button
                  onClick={() => setEditing(null)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" /> Add item
                </button>
              </div>
            </div>

            {loadError && (
              <div className="mx-5 mt-4 px-3 py-2 flex items-center gap-2 text-sm bg-red-50 border border-red-200 text-red-700" role="alert">
                <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="mr-auto">{loadError}</span>
                <button onClick={refreshNow} className="text-xs font-semibold underline">Try again</button>
              </div>
            )}

            {/* Tabs */}
            <div role="tablist" aria-label="Inventory sections" className="flex gap-1 px-5 pt-4 border-b border-gray-100 overflow-x-auto">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.key}
                  onClick={() => { if (t.key === 'history') setHistoryItem(''); setTab(t.key); }}
                  className={`px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                    tab === t.key ? 'border-[var(--primary)] text-[var(--primary-dark)]' : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {t.label}
                  {t.key === 'stock' && items.length > 0 ? ` (${items.length})` : ''}
                </button>
              ))}
            </div>

            {tab === 'stock' && (
              <>
                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-gray-100">
                  <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                    <input
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search item, code, category or supplier"
                      aria-label="Search items"
                      className="!pl-9"
                    />
                  </div>
                  <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Type" className="!w-auto">
                    <option value="">All types</option>
                    <option value="supply">Wash supplies</option>
                    <option value="product">For sale</option>
                  </select>
                  {(
                    <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category" className="!w-auto">
                      <option value="">All categories</option>
                      {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  )}
                  <label className="flex items-center gap-2 text-sm text-gray-700 !mb-0 cursor-pointer">
                    <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} className="!w-4 !h-4" />
                    Low stock only
                  </label>
                  {filtered && (
                    <button
                      type="button"
                      onClick={() => { setSearch(''); setKind(''); setCategory(''); setLowOnly(false); }}
                      className="text-xs font-medium text-gray-600 hover:text-gray-900 underline"
                    >
                      Clear
                    </button>
                  )}
                  <div className="flex gap-2 sm:ml-auto">
                    <button
                      type="button"
                      onClick={() => setReorderOpen(true)}
                      disabled={lowItems.length === 0}
                      title={lowItems.length ? 'Order the low-stock items from suppliers' : 'Nothing is low on stock'}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-700 bg-white border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-40"
                    >
                      <ShoppingBag className="w-4 h-4" aria-hidden="true" /> Reorder list{lowItems.length ? ` (${lowItems.length})` : ''}
                    </button>
                    <button
                      type="button"
                      onClick={downloadStock}
                      disabled={shown.length === 0}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-40"
                    >
                      <Download className="w-4 h-4" aria-hidden="true" /> Excel
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-left text-xs font-semibold text-gray-500">
                        <th className="px-5 py-3">Item</th>
                        <th className="px-3 py-3">Type</th>
                        <th className="px-3 py-3 text-right">In stock</th>
                        <th className="px-3 py-3 text-right">Price / unit</th>
                        <th className="px-3 py-3 text-right">Stock value</th>
                        <th className="px-3 py-3 text-right">Sell price</th>
                        <th className="px-5 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading && items.length === 0 ? (
                        <tr><td colSpan={7} className="py-12 text-center text-gray-500"><Loader2 className="w-5 h-5 animate-spin inline" aria-hidden="true" /> Loading…</td></tr>
                      ) : shown.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-gray-500">
                            <PackageOpen className="w-7 h-7 mx-auto mb-2 text-gray-300" aria-hidden="true" />
                            {items.length === 0 ? (
                              <>
                                No items yet.{' '}
                                <button type="button" onClick={() => setEditing(null)} className="text-[var(--primary)] font-medium underline">Add the first item</button>
                              </>
                            ) : 'No items match these filters.'}
                          </td>
                        </tr>
                      ) : shown.map((i) => (
                        <tr key={i.id} className={`border-b border-gray-50 ${i.low_stock ? 'bg-red-50/40' : 'hover:bg-gray-50/60'}`}>
                          <td className="px-5 py-3">
                            <div className="font-medium text-gray-900">
                              {i.name}
                              {i.code && <span className="ml-1.5 font-mono text-[11px] font-normal text-gray-500">{i.code}</span>}
                            </div>
                            <div className="text-[11px] text-gray-500">
                              {[i.category, i.supplier].filter(Boolean).join(' · ') || '—'}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${KIND_PILL[i.kind]}`}>{KIND_LABEL[i.kind]}</span>
                          </td>
                          <td className="px-3 py-3 text-right whitespace-nowrap">
                            <span className={`tabular-nums font-semibold ${i.low_stock ? 'text-red-700' : 'text-gray-900'}`}>{qty(i.quantity)}</span>{' '}
                            <span className="text-gray-500">{i.unit}</span>
                            {i.low_stock && (
                              <span className="ml-1.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                                <AlertTriangle className="w-3 h-3" aria-hidden="true" /> {i.quantity === 0 ? 'Out' : 'Low'}
                              </span>
                            )}
                            <div className="text-[11px] text-gray-500">Alert at {qty(i.min_quantity)}</div>
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums text-gray-700 whitespace-nowrap">{i.cost_price != null ? qar(i.cost_price) : '—'}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-gray-700 whitespace-nowrap">{i.stock_value != null ? qar(i.stock_value) : '—'}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-gray-700 whitespace-nowrap">{i.sell_price != null ? qar(i.sell_price) : '—'}</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => setMoving({ item: i, type: 'in' })}
                                className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-green-700 border border-green-200 hover:bg-green-50 whitespace-nowrap"
                              >
                                <ArrowDownToLine className="w-3.5 h-3.5" aria-hidden="true" /> In
                              </button>
                              <button
                                type="button"
                                onClick={() => setMoving({ item: i, type: i.kind === 'product' ? 'sell' : 'use' })}
                                disabled={i.quantity <= 0}
                                className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-amber-800 border border-amber-200 hover:bg-amber-50 whitespace-nowrap disabled:opacity-40"
                              >
                                {i.kind === 'product'
                                  ? <><ShoppingCart className="w-3.5 h-3.5" aria-hidden="true" /> Sell</>
                                  : <><ArrowUpFromLine className="w-3.5 h-3.5" aria-hidden="true" /> Use</>}
                              </button>
                              <button type="button" onClick={() => setMoving({ item: i, type: 'adjust' })} title="Count / fix stock" aria-label={`Count ${i.name}`} className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100">
                                <ClipboardList className="w-4 h-4" aria-hidden="true" />
                              </button>
                              <button type="button" onClick={() => openHistory(i)} title="History" aria-label={`History of ${i.name}`} className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100">
                                <History className="w-4 h-4" aria-hidden="true" />
                              </button>
                              <button type="button" onClick={() => setEditing(i)} title="Edit" aria-label={`Edit ${i.name}`} className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100">
                                <Pencil className="w-4 h-4" aria-hidden="true" />
                              </button>
                              {canDelete && (
                                <button type="button" onClick={() => setDeleting(i)} title="Delete" aria-label={`Delete ${i.name}`} className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50">
                                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {tab === 'consumption' && <InventoryConsumption reloadKey={historyKey} />}
            {tab === 'machinery' && (
              <MachineryList canDelete={canDelete} reloadKey={historyKey} onToast={(message, type = 'success') => setToast({ message, type })} />
            )}
            {tab === 'history' && <InventoryHistory items={items} reloadKey={historyKey} initialItemId={historyItem} />}
          </div>
        </main>
      </div>

      {editing !== undefined && (
        <InventoryItemModal item={editing} onClose={() => setEditing(undefined)} onSubmit={saveItem} />
      )}
      {moving && (
        <StockMoveModal item={moving.item} type={moving.type} onClose={() => setMoving(null)} onSubmit={saveMove} />
      )}
      {reorderOpen && <ReorderModal items={items} onClose={() => setReorderOpen(false)} />}
      {deleting && (
        <InventoryDeleteModal item={deleting} onClose={() => setDeleting(null)} onSubmit={deleteItem} />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
