'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Search, Phone, X, MapPin, Clock, Droplets, CheckCircle,
  RotateCcw, ClipboardList,
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Toast from '../components/Toast';

// ─────────────────────────────────────────────────────────────
// Order lifecycle model
// ─────────────────────────────────────────────────────────────
const STATUS_FLOW = ['pending', 'confirmed', 'enroute', 'arrived', 'completed'];

// Status pill colors follow the app's existing palette (see RidesManagement.js).
const STATUS_META = {
  pending:   { label: 'Pending Confirmation', pill: 'bg-yellow-100 text-yellow-700' },
  confirmed: { label: 'Confirmed',            pill: 'bg-blue-100 text-blue-700' },
  enroute:   { label: 'Cleaner En Route',     pill: 'bg-purple-100 text-purple-700' },
  arrived:   { label: 'Cleaner Arrived',      pill: 'bg-teal-100 text-teal-700' },
  completed: { label: 'Completed',            pill: 'bg-green-100 text-green-700' },
};

// Button tones use the app's design tokens.
const TONE = {
  primary: 'bg-[var(--primary)] text-white border border-transparent hover:bg-[var(--primary-hover)]',
  green:   'bg-green-600 text-white border border-transparent hover:bg-green-700',
  ghost:   'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50',
};

// What the admin taps next for each status (one tap advances the order).
const NEXT_ACTION = {
  pending:   { next: 'confirmed', row: 'Confirm',        full: 'Confirm Order',     tone: 'primary' },
  confirmed: { next: 'enroute',   row: 'Mark En Route',  full: 'Mark En Route',     tone: 'primary' },
  enroute:   { next: 'arrived',   row: 'Mark Arrived',   full: 'Mark as Arrived',   tone: 'primary', notify: true },
  arrived:   { next: 'completed', row: 'Mark Completed', full: 'Mark as Completed', tone: 'green',   notify: true },
};

const TABS = [
  { key: 'all',       label: 'All' },
  { key: 'pending',   label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'enroute',   label: 'En Route' },
  { key: 'arrived',   label: 'Arrived' },
  { key: 'completed', label: 'Completed' },
];

const STORAGE_KEY = 'miles_carwash_orders';

// ─────────────────────────────────────────────────────────────
// Demo data (persists locally as the admin clicks through statuses)
// ─────────────────────────────────────────────────────────────
const SAMPLE_ORDERS = [
  // Pending (3)
  { id: 'CW-1042', customer: { name: 'Jane Doe', phone: '+974 5511 2233' }, package: 'Classic Care', addOn: '—', vehicle: 'Sedan', location: 'Al Waab St', time: 'Today, 4:00 PM', bookedAt: 'Today · 12:40 PM', total: 55, status: 'pending', cleaner: null, history: {} },
  { id: 'CW-1045', customer: { name: 'Omar F.', phone: '+974 6633 1188' }, package: 'Premium Detail', addOn: '—', vehicle: 'SUV', location: 'Lusail Marina', time: 'Today, 5:30 PM', bookedAt: 'Today · 1:05 PM', total: 90, status: 'pending', cleaner: null, history: {} },
  { id: 'CW-1046', customer: { name: 'Aisha M.', phone: '+974 5599 2277' }, package: 'Quick Shine', addOn: '—', vehicle: 'Hatchback', location: 'Al Sadd', time: 'Today, 6:00 PM', bookedAt: 'Today · 1:20 PM', total: 40, status: 'pending', cleaner: null, history: {} },

  // Confirmed (4)
  { id: 'CW-1041', customer: { name: 'Mohammed A.', phone: '+974 3344 5566' }, package: 'Premium Detail', addOn: '—', vehicle: 'SUV', location: 'Villa 22, West Bay', time: 'Today, 3:30 PM', bookedAt: 'Today · 11:50 AM', total: 90, status: 'confirmed', cleaner: { name: 'Rajesh (Cleaner)', phone: '+974 3311 9900' }, history: { confirmed: '2:10 PM' } },
  { id: 'CW-1040', customer: { name: 'Noor S.', phone: '+974 5544 8822' }, package: 'Classic Care', addOn: '—', vehicle: 'Sedan', location: 'Al Gharrafa', time: 'Today, 3:00 PM', bookedAt: 'Today · 11:30 AM', total: 55, status: 'confirmed', cleaner: { name: 'Mahesh (Cleaner)', phone: '+974 3300 1122' }, history: { confirmed: '1:50 PM' } },
  { id: 'CW-1038', customer: { name: 'Khalid B.', phone: '+974 6677 3344' }, package: 'Quick Shine + Hygiene', addOn: 'Hygiene Plus', vehicle: '4x4', location: 'The Pearl', time: 'Today, 2:45 PM', bookedAt: 'Today · 11:10 AM', total: 70, status: 'confirmed', cleaner: { name: 'Suresh (Cleaner)', phone: '+974 3322 7788' }, history: { confirmed: '1:30 PM' } },
  { id: 'CW-1036', customer: { name: 'Hind A.', phone: '+974 5522 6611' }, package: 'Classic Care', addOn: '—', vehicle: 'Van', location: 'Al Wakrah', time: 'Today, 2:30 PM', bookedAt: 'Today · 10:55 AM', total: 65, status: 'confirmed', cleaner: { name: 'Rajesh (Cleaner)', phone: '+974 3311 9900' }, history: { confirmed: '1:15 PM' } },

  // En Route (2)
  { id: 'CW-1039', customer: { name: 'Sara K.', phone: '+974 7788 9900' }, package: 'Quick Shine', addOn: 'Hygiene Plus', vehicle: '4x4 / Pickup', location: 'The Pearl, Zone 66', time: 'Today, 2:15 PM', bookedAt: 'Today · 12:40 PM', total: 70, status: 'enroute', cleaner: { name: 'Mahesh (Cleaner)', phone: '+974 3300 1122' }, history: { confirmed: '12:45 PM', enroute: '1:55 PM' } },
  { id: 'CW-1035', customer: { name: 'Fahad Q.', phone: '+974 6611 2200' }, package: 'Premium Detail', addOn: '—', vehicle: 'SUV', location: 'West Bay', time: 'Today, 1:45 PM', bookedAt: 'Today · 11:00 AM', total: 90, status: 'enroute', cleaner: { name: 'Suresh (Cleaner)', phone: '+974 3322 7788' }, history: { confirmed: '12:30 PM', enroute: '1:20 PM' } },

  // Arrived (1)
  { id: 'CW-1037', customer: { name: 'Yusuf R.', phone: '+974 6611 4477' }, package: 'Classic Care', addOn: '—', vehicle: 'Van', location: 'Al Sadd', time: 'Today, 1:00 PM', bookedAt: 'Today · 10:30 AM', total: 65, status: 'arrived', cleaner: { name: 'Suresh (Cleaner)', phone: '+974 3322 7788' }, history: { confirmed: '11:45 AM', enroute: '12:30 PM', arrived: '12:55 PM' } },

  // Completed (5)
  { id: 'CW-0981', customer: { name: 'Layla H.', phone: '+974 5522 3311' }, package: 'Quick Shine', addOn: '—', vehicle: 'SUV', location: 'Villa 22, West Bay', time: 'Sat, 12 Jul', bookedAt: 'Sat, 12 Jul · 9:10 AM', total: 60, status: 'completed', cleaner: { name: 'Mahesh (Cleaner)', phone: '+974 3300 1122' }, history: { confirmed: '9:20 AM', enroute: '9:55 AM', arrived: '10:15 AM', completed: '10:50 AM' } },
  { id: 'CW-0980', customer: { name: 'Ahmed T.', phone: '+974 3300 7766' }, package: 'Premium Detail', addOn: '—', vehicle: 'Sedan', location: 'Al Waab St', time: 'Sat, 12 Jul', bookedAt: 'Sat, 12 Jul · 8:40 AM', total: 85, status: 'completed', cleaner: { name: 'Rajesh (Cleaner)', phone: '+974 3311 9900' }, history: { confirmed: '8:50 AM', enroute: '9:20 AM', arrived: '9:40 AM', completed: '10:25 AM' } },
  { id: 'CW-0979', customer: { name: 'Mariam D.', phone: '+974 5511 8899' }, package: 'Classic Care', addOn: '—', vehicle: '4x4', location: 'Lusail', time: 'Fri, 11 Jul', bookedAt: 'Fri, 11 Jul · 3:15 PM', total: 60, status: 'completed', cleaner: { name: 'Suresh (Cleaner)', phone: '+974 3322 7788' }, history: { confirmed: '3:25 PM', enroute: '3:55 PM', arrived: '4:10 PM', completed: '4:45 PM' } },
  { id: 'CW-0978', customer: { name: 'Ali H.', phone: '+974 6600 5511' }, package: 'Quick Shine + Hygiene', addOn: 'Hygiene Plus', vehicle: 'SUV', location: 'The Pearl', time: 'Fri, 11 Jul', bookedAt: 'Fri, 11 Jul · 1:00 PM', total: 70, status: 'completed', cleaner: { name: 'Mahesh (Cleaner)', phone: '+974 3300 1122' }, history: { confirmed: '1:10 PM', enroute: '1:40 PM', arrived: '2:00 PM', completed: '2:40 PM' } },
  { id: 'CW-0977', customer: { name: 'Reem N.', phone: '+974 5533 2244' }, package: 'Classic Care', addOn: '—', vehicle: 'Sedan', location: 'Al Sadd', time: 'Thu, 10 Jul', bookedAt: 'Thu, 10 Jul · 11:20 AM', total: 55, status: 'completed', cleaner: { name: 'Rajesh (Cleaner)', phone: '+974 3311 9900' }, history: { confirmed: '11:30 AM', enroute: '12:00 PM', arrived: '12:20 PM', completed: '12:55 PM' } },
];

const getInitial = (name) => (name?.trim()?.[0] || '?').toUpperCase();
const telHref = (phone) => `tel:${(phone || '').replace(/[^\d+]/g, '')}`;
const timeNow = () =>
  new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

// ─────────────────────────────────────────────────────────────
// Status pill
// ─────────────────────────────────────────────────────────────
function StatusPill({ status }) {
  const meta = STATUS_META[status] || STATUS_META.pending;
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${meta.pill}`}>
      {meta.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Order detail drawer
// ─────────────────────────────────────────────────────────────
function OrderDrawer({ order, onClose, onAdvance }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  if (!order) return null;

  const action = NEXT_ACTION[order.status];
  const flowIndex = STATUS_FLOW.indexOf(order.status);

  const steps = [
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'enroute',   label: 'Cleaner En Route' },
    { key: 'arrived',   label: 'Cleaner Arrived' },
    { key: 'completed', label: 'Service Completed' },
  ];

  const kv = [
    ['Package', order.package],
    ['Add-on', order.addOn || '—'],
    ['Vehicle', order.vehicle],
    ['Location', order.location],
    ['Slot', order.time],
    ['Total', `QAR ${order.total}`],
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 modal-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className="relative w-full max-w-[380px] bg-white h-full flex flex-col shadow-2xl animate-slide-in-right"
        role="dialog"
        aria-modal="true"
        aria-label={`Order ${order.id}`}
      >
        {/* Head */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <div className="text-[15px] font-bold text-gray-900">#{order.id}</div>
            <div className="text-[11px] text-gray-500 mt-0.5">Booked {order.bookedAt}</div>
          </div>
          <button
            onClick={onClose}
            className="btn-icon w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            aria-label="Close order details"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Customer */}
          <div className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold mb-2">Customer</div>
          <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] font-bold text-sm flex items-center justify-center">
              {getInitial(order.customer.name)}
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-gray-900 truncate">{order.customer.name}</div>
              <div className="text-[11px] text-gray-500">{order.customer.phone}</div>
            </div>
            <a
              href={telHref(order.customer.phone)}
              className="ml-auto w-8 h-8 rounded-full bg-[var(--primary)] text-white flex items-center justify-center shrink-0 hover:bg-[var(--primary-hover)] transition-colors"
              aria-label={`Call ${order.customer.name}`}
            >
              <Phone className="w-4 h-4" aria-hidden="true" />
            </a>
          </div>

          {/* Order details */}
          <div className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold mt-4 mb-2">Order Details</div>
          <div>
            {kv.map(([k, v]) => (
              <div key={k} className="flex justify-between text-[12px] py-1.5 border-b border-dashed border-gray-200 last:border-0">
                <span className="text-gray-500">{k}</span>
                <span className="font-semibold text-gray-900 text-right">{v}</span>
              </div>
            ))}
          </div>

          {/* Cleaner */}
          <div className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold mt-4 mb-2">Cleaner Assigned</div>
          {order.cleaner ? (
            <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] font-bold text-sm flex items-center justify-center">
                {getInitial(order.cleaner.name)}
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-gray-900 truncate">{order.cleaner.name}</div>
                <div className="text-[11px] text-gray-500">{order.cleaner.phone}</div>
              </div>
              <a
                href={telHref(order.cleaner.phone)}
                className="ml-auto w-8 h-8 rounded-full bg-[var(--primary)] text-white flex items-center justify-center shrink-0 hover:bg-[var(--primary-hover)] transition-colors"
                aria-label={`Call ${order.cleaner.name}`}
              >
                <Phone className="w-4 h-4" aria-hidden="true" />
              </a>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-[11.5px] text-yellow-700">
              No cleaner assigned yet — call to assign one for this slot.
            </div>
          )}

          {/* Progress */}
          <div className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold mt-4 mb-1">Order Progress</div>
          <div className="mt-1">
            {steps.map((step, i) => {
              const stepIndex = i + 1; // confirmed=1 … completed=4 in STATUS_FLOW
              const done = flowIndex >= stepIndex;
              const now = flowIndex === stepIndex;
              const ts = order.history?.[step.key];
              return (
                <div
                  key={step.key}
                  className={`flex items-center gap-2 text-[11.5px] py-1.5 ${done ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}
                >
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      now ? 'bg-[var(--primary)] ring-4 ring-[var(--primary)]/15' : done ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                    aria-hidden="true"
                  />
                  <span>{step.label}{ts ? ` — ${ts}` : ''}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-gray-200 flex flex-col gap-2">
          {action ? (
            <>
              <button
                onClick={() => onAdvance(order)}
                className={`w-full py-3 text-[13px] font-semibold flex items-center justify-center gap-2 transition-colors ${TONE[action.tone]}`}
              >
                {action.tone === 'green'
                  ? <CheckCircle className="w-4 h-4" aria-hidden="true" />
                  : <MapPin className="w-4 h-4" aria-hidden="true" />}
                {action.full}
              </button>
              {action.notify && (
                <p className="text-[10px] text-gray-500 text-center">
                  Sends an instant alert to the customer&apos;s app
                </p>
              )}
            </>
          ) : (
            <div className="w-full py-3 text-[13px] font-semibold flex items-center justify-center gap-2 bg-green-50 text-green-700 rounded">
              <CheckCircle className="w-4 h-4" aria-hidden="true" /> Service Completed
            </div>
          )}
          <a
            href={telHref(order.customer.phone)}
            className={`w-full py-3 text-[13px] font-semibold flex items-center justify-center gap-2 transition-colors ${TONE.ghost}`}
          >
            <Phone className="w-4 h-4" aria-hidden="true" /> Call Customer
          </a>
        </div>
      </aside>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────
export default function OrdersPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [orders, setOrders] = useState(SAMPLE_ORDERS);
  const [activeTab, setActiveTab] = useState('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [toast, setToast] = useState(null);
  const loadedRef = useRef(false);

  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);

  // Load any previously saved state (kept hydration-safe: first render uses SAMPLE_ORDERS).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length) setOrders(parsed);
      }
    } catch { /* ignore corrupt storage */ }
    loadedRef.current = true;
  }, []);

  // Persist after the initial load has run.
  useEffect(() => {
    if (!loadedRef.current) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(orders)); } catch { /* ignore */ }
  }, [orders]);

  const counts = useMemo(() => {
    const c = { all: orders.length };
    for (const s of STATUS_FLOW) c[s] = 0;
    for (const o of orders) c[o.status] = (c[o.status] || 0) + 1;
    return c;
  }, [orders]);

  const visibleOrders = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      if (activeTab !== 'all' && o.status !== activeTab) return false;
      if (!q) return true;
      return (
        o.id.toLowerCase().includes(q) ||
        o.customer.name.toLowerCase().includes(q) ||
        o.customer.phone.toLowerCase().includes(q) ||
        o.location.toLowerCase().includes(q) ||
        o.package.toLowerCase().includes(q)
      );
    });
  }, [orders, activeTab, query]);

  const selectedOrder = useMemo(
    () => orders.find((o) => o.id === selectedId) || null,
    [orders, selectedId]
  );

  const advanceOrder = useCallback((order) => {
    const action = NEXT_ACTION[order.status];
    if (!action) return;
    setOrders((prev) =>
      prev.map((o) =>
        o.id === order.id
          ? { ...o, status: action.next, history: { ...o.history, [action.next]: timeNow() } }
          : o
      )
    );
    const label = STATUS_META[action.next].label;
    setToast({
      message: action.notify
        ? `Customer notified — ${label}`
        : `#${order.id} → ${label}`,
      type: 'success',
    });
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-50 overflow-x-hidden">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={toggleSidebar} aria-hidden="true" />
      )}

      <div className="flex-1 flex flex-col min-h-screen lg:ml-[240px] w-full lg:w-auto overflow-x-hidden">
        <div className="px-4 md:px-6 pt-4 md:pt-6">
          <Header title="Car Wash Orders" toggleSidebar={toggleSidebar} />
        </div>

        <main className="flex-1 px-4 md:px-6 pb-6 overflow-x-hidden">
          <div className="max-w-6xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              {/* Panel header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
                    <Droplets className="w-5 h-5 text-[var(--primary)]" aria-hidden="true" />
                  </div>
                  <div>
                    <h1 className="text-base font-semibold text-gray-900">Orders</h1>
                    <p className="text-xs text-gray-500">Manage bookings and update status as cleaners report in</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search order, customer, phone…"
                      className="pl-9 pr-3 py-2 text-sm w-full sm:w-[240px] border border-gray-300"
                      aria-label="Search orders"
                    />
                  </div>
                  <button
                    onClick={() => { setOrders(SAMPLE_ORDERS); setToast({ message: 'Demo data reset', type: 'info' }); }}
                    className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap"
                    aria-label="Reset demo data"
                    title="Restore the sample orders"
                  >
                    <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" /> Reset
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 px-5 pt-4 pb-1 overflow-x-auto">
                {TABS.map((tab) => {
                  const active = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`text-xs font-medium px-3.5 py-1.5 rounded-full whitespace-nowrap border transition-colors ${
                        active
                          ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                      }`}
                      aria-pressed={active}
                    >
                      {tab.label} <span className={active ? 'opacity-80' : 'text-gray-400'}>{counts[tab.key] ?? 0}</span>
                    </button>
                  );
                })}
              </div>

              {/* Table */}
              <div className="p-4 sm:p-5">
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full border-collapse min-w-[760px]">
                    <thead>
                      <tr>
                        {['Order', 'Customer', 'Service', 'Location', 'Time', 'Status', ''].map((h, i) => (
                          <th
                            key={i}
                            className="text-left text-[10px] uppercase tracking-wide text-gray-500 font-semibold bg-gray-50 px-3.5 py-2.5 border-b border-gray-200"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {visibleOrders.map((o) => {
                        const action = NEXT_ACTION[o.status];
                        return (
                          <tr
                            key={o.id}
                            onClick={() => setSelectedId(o.id)}
                            className="cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-0"
                          >
                            <td className="px-3.5 py-3 text-sm font-semibold text-gray-900 whitespace-nowrap">#{o.id}</td>
                            <td className="px-3.5 py-3">
                              <div className="text-sm font-medium text-gray-900">{o.customer.name}</div>
                              <div className="text-[11px] text-gray-500">{o.customer.phone}</div>
                            </td>
                            <td className="px-3.5 py-3 text-sm text-gray-700 whitespace-nowrap">
                              {o.package} <span className="text-gray-400">· {o.vehicle}</span>
                            </td>
                            <td className="px-3.5 py-3 text-sm text-gray-700 whitespace-nowrap">{o.location}</td>
                            <td className="px-3.5 py-3 text-sm text-gray-700 whitespace-nowrap">{o.time}</td>
                            <td className="px-3.5 py-3"><StatusPill status={o.status} /></td>
                            <td className="px-3.5 py-3 text-right whitespace-nowrap">
                              {action ? (
                                <button
                                  onClick={(e) => { e.stopPropagation(); advanceOrder(o); }}
                                  className={`text-xs font-medium px-3 py-1.5 transition-colors ${TONE[action.tone]}`}
                                >
                                  {action.row}
                                </button>
                              ) : (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setSelectedId(o.id); }}
                                  className={`text-xs font-medium px-3 py-1.5 transition-colors ${TONE.ghost}`}
                                >
                                  View
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {visibleOrders.length === 0 && (
                    <div className="text-center py-14 text-gray-500">
                      <ClipboardList className="w-10 h-10 mx-auto mb-3 text-gray-300" aria-hidden="true" />
                      <p className="text-sm">No orders in this view</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-3">
                  <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                  Tap a row to open the order · one tap advances the status
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {selectedOrder && (
        <OrderDrawer
          order={selectedOrder}
          onClose={() => setSelectedId(null)}
          onAdvance={advanceOrder}
        />
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
