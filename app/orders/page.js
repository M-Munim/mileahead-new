'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search, Phone, X, Clock, Droplets, CheckCircle,
  RotateCcw, ClipboardList, Copy, Send, Trash2, MessageCircle, Plus,
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Toast from '../components/Toast';
import ConfirmationDialog from '../components/ConfirmationDialog';
import NewOrderModal from '../components/NewOrderModal';
import { useAuth } from '../contexts/AuthContext';
import { copyText, getWhatsAppUrl } from '../../utils/location';
import { priceFor, formatQar, PAYMENT_METHODS } from '../../utils/priceList';

// ─────────────────────────────────────────────────────────────
// Payment status (client revision: replaces Pending → Confirmed → Completed)
// ─────────────────────────────────────────────────────────────
const STATUSES = ['unpaid', 'paid'];

const STATUS_META = {
  unpaid: { label: 'Unpaid', pill: 'bg-red-100 text-red-700' },
  paid:   { label: 'Paid',   pill: 'bg-green-100 text-green-700' },
};

// Button tones use the app's design tokens.
const TONE = {
  primary: 'bg-[var(--primary)] text-white border border-transparent hover:bg-[var(--primary-hover)]',
  green:   'bg-green-600 text-white border border-transparent hover:bg-green-700',
  ghost:   'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50',
};

const TABS = [
  { key: 'all',    label: 'All' },
  { key: 'unpaid', label: 'Unpaid' },
  { key: 'paid',   label: 'Paid' },
];

// ─────────────────────────────────────────────────────────────
// Demo data (client request: dummy data only). Services, vehicles and prices
// follow the Magic Track price list.
// ─────────────────────────────────────────────────────────────
const CLEANERS = {
  rajesh: { name: 'Rajesh (Cleaner)', phone: '+974 3311 9900' },
  mahesh: { name: 'Mahesh (Cleaner)', phone: '+974 3300 1122' },
  suresh: { name: 'Suresh (Cleaner)', phone: '+974 3322 7788' },
};

const SAMPLE_ORDERS = [
  // id, customer, phone, service, vehicle, extras, plate, discount, coupon serial, payment, status, time, booked, cleaner
  ['CW-1046', 'Aisha M.',    '+974 5599 2277', 'Body Wash – In & Out',                'Sedan',           [],                                         '9012', '',               '',        'Fawran',         'unpaid', 'Today, 4:30 PM', 'Today · 4:22 PM',  null],
  ['CW-1045', 'Omar F.',     '+974 6633 1188', 'Body Polishing',                      'SUV',             [],                                         '5678', 'Coupon',         'MT-2041', 'Paylater',       'unpaid', 'Today, 4:15 PM', 'Today · 4:05 PM',  'rajesh'],
  ['CW-1044', 'Jane Doe',    '+974 5511 2233', 'Full Interior Cleaning',              'Sedan',           ['Floor Mat'],                              '1234', 'Loyalty Free',   '',        'Fawran',         'unpaid', 'Today, 3:50 PM', 'Today · 3:41 PM',  'mahesh'],
  ['CW-1043', 'Khalid B.',   '+974 6677 3344', 'Paint Protection Film (PPF)',         'GMC / Large SUV', [],                                         '2345', 'Fleet Discount', '',        'Partner Credit', 'unpaid', 'Today, 2:30 PM', 'Today · 2:18 PM',  'suresh'],
  ['CW-1042', 'Mohammed A.', '+974 3344 5566', 'Nano Ceramic Coating – Graphene Pro', 'SUV',             [],                                         '3456', 'Fleet Discount', '',        'Partner Credit', 'paid',   'Today, 1:40 PM', 'Today · 1:32 PM',  'rajesh'],
  ['CW-1041', 'Noor S.',     '+974 5544 8822', 'Body Wash – In & Out',                '7-Seater',        ['Dashboard Cover'],                        '7890', '',               '',        'Fawran',         'paid',   'Today, 1:10 PM', 'Today · 1:02 PM',  'mahesh'],
  ['CW-1040', 'Sara K.',     '+974 7788 9900', 'Glass Polish',                        'SUV',             [],                                         '4567', 'Coupon',         'MT-1987', 'Fawran',         'paid',   'Today, 12:20 PM', 'Today · 12:11 PM', 'suresh'],
  ['CW-1039', 'Fahad Q.',    '+974 6611 2200', 'Interior & Exterior Polishing',       'SUV',             ['Seat Cover'],                             '8901', '',               '',        'Paylater',       'unpaid', 'Today, 11:30 AM', 'Today · 11:24 AM', 'rajesh'],
  ['CW-1038', 'Hind A.',     '+974 5522 6611', 'Nano Ceramic Tint',                   'Sedan',           [],                                         '6789', 'Loyalty Free',   '',        'Fawran',         'paid',   'Today, 10:45 AM', 'Today · 10:38 AM', 'mahesh'],
  ['CW-1037', 'Yusuf R.',    '+974 6611 4477', 'Body Wash – In & Out',                'SUV',             ['Steering Wheel Cover', 'Handrest Cover'], '0123', '',               '',        'Paylater',       'unpaid', 'Today, 10:00 AM', 'Today · 9:52 AM',  'suresh'],
  ['CW-1036', 'Layla H.',    '+974 5522 3311', 'Paint Protection Film (PPF)',         'Crossover',       [],                                         '1357', '',               '',        'Fawran',         'paid',   'Sat, 12 Jul',    'Sat, 12 Jul · 9:10 AM',  'mahesh'],
  ['CW-1035', 'Ahmed T.',    '+974 3300 7766', 'Full Interior Cleaning',              '7-Seater',        ['Side Door Cover'],                        '2468', 'Coupon',         'MT-1902', 'Paylater',       'paid',   'Sat, 12 Jul',    'Sat, 12 Jul · 8:40 AM',  'rajesh'],
  ['CW-1034', 'Mariam D.',   '+974 5511 8899', 'Body Polishing',                      'Sedan',           [],                                         '3691', 'Fleet Discount', '',        'Partner Credit', 'paid',   'Fri, 11 Jul',    'Fri, 11 Jul · 3:15 PM',  'suresh'],
  ['CW-1033', 'Ali H.',      '+974 6600 5511', '',                                    'SUV',             ['Roof / Ceiling Modification'],            '4820', '',               '',        'Fawran',         'unpaid', 'Fri, 11 Jul',    'Fri, 11 Jul · 1:00 PM',  null],
  ['CW-1032', 'Reem N.',     '+974 5533 2244', 'Body Wash – In & Out',                'Sedan',           [],                                         '5931', 'Loyalty Free',   '',        'Fawran',         'paid',   'Thu, 10 Jul',    'Thu, 10 Jul · 11:20 AM', 'rajesh'],
].map(([id, name, phone, service, vehicle, extras, numberPlate, discount, couponSerial, payment, status, time, bookedAt, cleaner]) => ({
  id,
  customer: { name, phone },
  service,
  vehicle,
  extras,
  numberPlate,
  discount,
  couponSerial,
  payment,
  status,
  time,
  bookedAt,
  total: priceFor(service, vehicle, extras),
  cleaner: cleaner ? CLEANERS[cleaner] : null,
  notes: '',
}));

const getInitial = (name) => (name?.trim()?.[0] || '?').toUpperCase();
const telHref = (phone) => `tel:${(phone || '').replace(/[^\d+]/g, '')}`;
const timeNow = () =>
  new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

const formatDateTime = (date, time) => {
  if (date && time) return `${date}, ${time}`;
  return date || time || 'N/A';
};

const serviceLabel = (order) => order.service || 'Extras only';
const discountLabel = (order) =>
  order.discount === 'Coupon' && order.couponSerial
    ? `Coupon · ${order.couponSerial}`
    : order.discount || '—';

/** A manually entered order, in the same shape as the sample orders. */
const buildLocalOrder = (values) => ({
  id: `CW-${String(Date.now()).slice(-6)}`,
  customer: { name: values.customerName, phone: values.phone },
  service: values.service,
  vehicle: values.vehicle,
  extras: values.extras,
  numberPlate: values.numberPlate,
  discount: values.discount,
  couponSerial: values.couponSerial,
  payment: values.payment,
  status: values.paymentStatus,
  paidAt: values.paymentStatus === 'paid' ? timeNow() : undefined,
  time: formatDateTime(values.date, values.time),
  bookedAt: `Today · ${timeNow()}`,
  total: values.total,
  cleaner: null,
  notes: values.notes,
});

/** Job sheet sent to the cleaner (WhatsApp / copy-paste). */
const buildCleanerMessage = (order) => {
  const lines = [
    `*Magic Track — Car Wash Job #${order.id}*`,
    '',
    `Date & Time: ${order.time}`,
    `Service: ${serviceLabel(order)}`,
    order.extras?.length ? `Extras: ${order.extras.join(', ')}` : null,
    `Vehicle: ${order.vehicle}`,
    `Number Plate: ${order.numberPlate || '—'}`,
    '',
    `Customer: ${order.customer.name}`,
    `Contact: ${order.customer.phone}`,
    '',
    `Amount: ${formatQar(order.total)} (${order.payment} · ${STATUS_META[order.status].label})`,
    order.discount ? `Discount: ${discountLabel(order)}` : null,
    order.notes ? `Notes: ${order.notes}` : null,
  ];
  return lines.filter((l) => l !== null).join('\n').replace(/\n{3,}/g, '\n\n');
};

// ─────────────────────────────────────────────────────────────
// Status pill
// ─────────────────────────────────────────────────────────────
function StatusPill({ status }) {
  const meta = STATUS_META[status] || STATUS_META.unpaid;
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${meta.pill}`}>
      {meta.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Order detail drawer
// ─────────────────────────────────────────────────────────────
function OrderDrawer({ order, onClose, onTogglePaid, onCopyMessage, canDelete, onDelete }) {
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

  const isPaid = order.status === 'paid';
  const kv = [
    ['Service', serviceLabel(order)],
    ['Vehicle', order.vehicle],
    ['Extras', order.extras?.length ? order.extras.join(', ') : '—'],
    ['Number Plate', order.numberPlate || '—'],
    ['Date & Time', order.time],
    ['Discount', discountLabel(order)],
    ['Payment Method', order.payment],
    ['Total', formatQar(order.total)],
    ...(order.notes ? [['Notes', order.notes]] : []),
  ];
  const cleanerMessage = buildCleanerMessage(order);

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
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-bold text-gray-900">#{order.id}</span>
              <StatusPill status={order.status} />
            </div>
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
              <div key={k} className="flex justify-between gap-4 text-[12px] py-1.5 border-b border-dashed border-gray-200 last:border-0">
                <span className="text-gray-500 shrink-0">{k}</span>
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
              No cleaner assigned yet.
            </div>
          )}

          {/* Job sheet for the cleaner */}
          <div className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold mt-4 mb-2">Send to Cleaner</div>
          <pre className="bg-gray-50 border border-gray-100 rounded-lg p-3 text-[11px] leading-relaxed text-gray-700 whitespace-pre-wrap break-words font-sans">
            {cleanerMessage}
          </pre>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button
              type="button"
              onClick={() => onCopyMessage(order)}
              className={`py-2 text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-colors ${TONE.ghost}`}
            >
              <Copy className="w-3.5 h-3.5" aria-hidden="true" /> Copy Job
            </button>
            <a
              href={getWhatsAppUrl(cleanerMessage, order.cleaner?.phone || '')}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 text-[12px] font-semibold flex items-center justify-center gap-1.5 bg-green-600 text-white hover:bg-green-700 transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" /> WhatsApp
            </a>
          </div>
          <p className="text-[10px] text-gray-500 mt-1.5">
            {order.cleaner
              ? `WhatsApp opens a chat with ${order.cleaner.name}.`
              : 'No cleaner assigned — WhatsApp will ask who to send it to.'}
          </p>

          {canDelete && (
            <button
              type="button"
              onClick={() => onDelete([order])}
              className="w-full mt-5 py-2 text-[12px] font-semibold flex items-center justify-center gap-1.5 text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" /> Delete Order
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-gray-200 flex flex-col gap-2">
          {isPaid ? (
            <>
              <div className="w-full py-3 text-[13px] font-semibold flex items-center justify-center gap-2 bg-green-50 text-green-700 rounded">
                <CheckCircle className="w-4 h-4" aria-hidden="true" /> Paid{order.paidAt ? ` at ${order.paidAt}` : ''}
              </div>
              <button
                type="button"
                onClick={() => onTogglePaid(order)}
                className="text-[12px] text-gray-500 hover:text-gray-800 underline"
              >
                Mark as Unpaid
              </button>
            </>
          ) : (
            <button
              onClick={() => onTogglePaid(order)}
              className={`w-full py-3 text-[13px] font-semibold flex items-center justify-center gap-2 transition-colors ${TONE.green}`}
            >
              <CheckCircle className="w-4 h-4" aria-hidden="true" /> Mark as Paid
            </button>
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
  const [checkedIds, setCheckedIds] = useState(() => new Set());
  const [pendingDelete, setPendingDelete] = useState(null); // orders awaiting confirmation
  const [showNewOrder, setShowNewOrder] = useState(false);
  const { hasPermission } = useAuth();
  const canDelete = hasPermission('canDeleteRecords');
  const canCreate = hasPermission('canManageBookings');

  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);
  const closeNewOrder = useCallback(() => setShowNewOrder(false), []);

  const counts = useMemo(() => {
    const c = { all: orders.length };
    for (const s of STATUSES) c[s] = 0;
    for (const o of orders) c[o.status] = (c[o.status] || 0) + 1;
    return c;
  }, [orders]);

  const visibleOrders = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      if (activeTab !== 'all' && o.status !== activeTab) return false;
      if (!q) return true;
      return [
        o.id, o.customer.name, o.customer.phone, serviceLabel(o), o.vehicle,
        o.numberPlate, o.discount, o.couponSerial, o.payment,
      ].some((v) => (v || '').toLowerCase().includes(q));
    });
  }, [orders, activeTab, query]);

  const selectedOrder = useMemo(
    () => orders.find((o) => o.id === selectedId) || null,
    [orders, selectedId]
  );

  const checkedOrders = useMemo(
    () => orders.filter((o) => checkedIds.has(o.id)),
    [orders, checkedIds]
  );
  const allVisibleChecked = visibleOrders.length > 0 && visibleOrders.every((o) => checkedIds.has(o.id));

  const toggleChecked = useCallback((id) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleAllVisible = useCallback(() => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleChecked) visibleOrders.forEach((o) => next.delete(o.id));
      else visibleOrders.forEach((o) => next.add(o.id));
      return next;
    });
  }, [allVisibleChecked, visibleOrders]);

  const handleCopyMessage = useCallback(async (list) => {
    const items = Array.isArray(list) ? list : [list];
    if (items.length === 0) return;
    const text = items.map(buildCleanerMessage).join('\n\n────────────\n\n');
    const ok = await copyText(text);
    setToast(ok
      ? { message: items.length === 1 ? `Job #${items[0].id} copied — paste it to the cleaner` : `${items.length} jobs copied — paste them to the cleaner`, type: 'success' }
      : { message: 'Could not copy — please copy it manually.', type: 'error' });
  }, []);

  const handleShareSelected = useCallback(() => {
    if (checkedOrders.length === 0) return;
    const text = checkedOrders.map(buildCleanerMessage).join('\n\n────────────\n\n');
    window.open(getWhatsAppUrl(text), '_blank', 'noopener,noreferrer');
  }, [checkedOrders]);

  // Dummy data only (client request): every action below changes the list on
  // this screen and never calls the API.
  const confirmDelete = useCallback(() => {
    const list = pendingDelete || [];
    if (list.length === 0 || !canDelete) return;
    const ids = list.map((o) => o.id);
    setOrders((prev) => prev.filter((o) => !ids.includes(o.id)));
    setCheckedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
    if (ids.includes(selectedId)) setSelectedId(null);
    setToast({ message: ids.length === 1 ? `Order #${ids[0]} deleted` : `${ids.length} orders deleted`, type: 'success' });
  }, [pendingDelete, canDelete, selectedId]);

  // Manual entry: the new order goes to the top of the list.
  const handleCreateOrder = useCallback((values) => {
    const newOrder = buildLocalOrder(values);
    setOrders((prev) => [newOrder, ...prev]);
    setShowNewOrder(false);
    setActiveTab('all');
    setQuery('');
    setToast({ message: `Order #${newOrder.id} for ${values.customerName} created`, type: 'success' });
  }, []);

  const resetOrdersView = useCallback(() => {
    setOrders(SAMPLE_ORDERS);
    setActiveTab('all');
    setQuery('');
    setSelectedId(null);
    setCheckedIds(new Set());
    setToast({ message: 'Filters reset and sample orders restored', type: 'info' });
  }, []);

  // Payment method can be changed straight from the table.
  const updatePayment = useCallback((order, payment) => {
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, payment } : o)));
    setToast({ message: `#${order.id} payment method: ${payment}`, type: 'success' });
  }, []);

  const togglePaid = useCallback((order) => {
    const next = order.status === 'paid' ? 'unpaid' : 'paid';
    setOrders((prev) =>
      prev.map((o) =>
        o.id === order.id
          ? { ...o, status: next, paidAt: next === 'paid' ? timeNow() : undefined }
          : o
      )
    );
    setToast({ message: `#${order.id} marked as ${STATUS_META[next].label}`, type: 'success' });
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
                    <p className="text-xs text-gray-500">Enter each customer at the center and track who has paid</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 min-w-[180px] sm:flex-none">
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
                    onClick={resetOrdersView}
                    className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap"
                    aria-label="Reset order filters"
                    title="Reset filters and restore the sample orders"
                  >
                    <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" /> Reset
                  </button>
                  {canCreate && (
                    <button
                      onClick={() => setShowNewOrder(true)}
                      className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${TONE.primary}`}
                    >
                      <Plus className="w-4 h-4" aria-hidden="true" /> New Order
                    </button>
                  )}
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

              {/* Bulk actions */}
              {checkedOrders.length > 0 && (
                <div className="mx-5 mt-3 px-3 py-2 flex flex-wrap items-center gap-2 bg-[var(--primary)]/5 border border-[var(--primary)]/20 text-sm">
                  <span className="font-medium text-gray-800 mr-auto">{checkedOrders.length} selected</span>
                  <button
                    onClick={() => handleCopyMessage(checkedOrders)}
                    className={`text-xs font-medium px-3 py-1.5 flex items-center gap-1.5 ${TONE.ghost}`}
                  >
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" /> Copy Jobs
                  </button>
                  <button
                    onClick={handleShareSelected}
                    className="text-xs font-medium px-3 py-1.5 flex items-center gap-1.5 bg-green-600 text-white hover:bg-green-700"
                  >
                    <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" /> WhatsApp
                  </button>
                  {canDelete && (
                    <button
                      onClick={() => setPendingDelete(checkedOrders)}
                      className="text-xs font-medium px-3 py-1.5 flex items-center gap-1.5 text-red-600 bg-white border border-red-200 hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" /> Delete
                    </button>
                  )}
                  <button
                    onClick={() => setCheckedIds(new Set())}
                    className="text-xs text-gray-500 hover:text-gray-800 px-2"
                  >
                    Clear
                  </button>
                </div>
              )}

              {/* Table */}
              <div className="p-4 sm:p-5">
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full border-collapse min-w-[1180px]">
                    <thead>
                      <tr>
                        <th className="bg-gray-50 pl-3.5 pr-1 py-2.5 border-b border-gray-200 w-8">
                          <input
                            type="checkbox"
                            checked={allVisibleChecked}
                            onChange={toggleAllVisible}
                            className="w-4 h-4 accent-[var(--primary)]"
                            aria-label="Select all orders in this view"
                          />
                        </th>
                        {['Order', 'Customer', 'Service', 'Number Plate', 'Discount', 'Payment Method', 'Total', 'Time', 'Status', ''].map((h, i) => (
                          <th
                            key={i}
                            className="text-left text-[10px] uppercase tracking-wide text-gray-500 font-semibold bg-gray-50 px-3.5 py-2.5 border-b border-gray-200 whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {visibleOrders.map((o) => (
                        <tr
                          key={o.id}
                          onClick={() => setSelectedId(o.id)}
                          className="cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-0"
                        >
                          <td className="pl-3.5 pr-1 py-3" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={checkedIds.has(o.id)}
                              onChange={() => toggleChecked(o.id)}
                              className="w-4 h-4 accent-[var(--primary)]"
                              aria-label={`Select order ${o.id}`}
                            />
                          </td>
                          <td className="px-3.5 py-3 text-sm font-semibold text-gray-900 whitespace-nowrap">#{o.id}</td>
                          <td className="px-3.5 py-3">
                            <div className="text-sm font-medium text-gray-900 whitespace-nowrap">{o.customer.name}</div>
                            <div className="text-[11px] text-gray-500 whitespace-nowrap">{o.customer.phone}</div>
                          </td>
                          <td className="px-3.5 py-3 text-sm text-gray-700">
                            <div className="max-w-[240px] truncate" title={`${serviceLabel(o)} · ${o.vehicle}`}>
                              {serviceLabel(o)} <span className="text-gray-400">· {o.vehicle}</span>
                            </div>
                            {o.extras?.length > 0 && (
                              <div className="text-[11px] text-gray-500 max-w-[240px] truncate" title={o.extras.join(', ')}>
                                + {o.extras.join(', ')}
                              </div>
                            )}
                          </td>
                          <td className="px-3.5 py-3 text-sm text-gray-700 whitespace-nowrap font-medium">{o.numberPlate || '—'}</td>
                          <td className="px-3.5 py-3 text-sm text-gray-700 whitespace-nowrap">{discountLabel(o)}</td>
                          <td className="px-3.5 py-3" onClick={(e) => e.stopPropagation()}>
                            <select
                              value={o.payment}
                              onChange={(e) => updatePayment(o, e.target.value)}
                              className="text-[13px] min-w-[140px]"
                              style={{ paddingTop: 4, paddingBottom: 4 }}
                              aria-label={`Payment method for order ${o.id}`}
                            >
                              {PAYMENT_METHODS.map((p) => <option key={p}>{p}</option>)}
                            </select>
                          </td>
                          <td className="px-3.5 py-3 text-sm font-semibold text-gray-900 whitespace-nowrap">{formatQar(o.total)}</td>
                          <td className="px-3.5 py-3 text-sm text-gray-700 whitespace-nowrap">{o.time}</td>
                          <td className="px-3.5 py-3"><StatusPill status={o.status} /></td>
                          <td className="px-3.5 py-3 text-right whitespace-nowrap">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleCopyMessage(o); }}
                              className="inline-flex items-center justify-center w-7 h-7 mr-1.5 align-middle text-gray-500 border border-gray-200 hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors"
                              title="Copy job details for the cleaner"
                              aria-label={`Copy job details for order ${o.id}`}
                            >
                              <Send className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                            {o.status === 'unpaid' ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); togglePaid(o); }}
                                className={`text-xs font-medium px-3 py-1.5 transition-colors ${TONE.green}`}
                              >
                                Mark Paid
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
                      ))}
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
                  Tap a row to open the order · Mark Paid when the customer pays · tick orders to send them to a cleaner{canDelete ? ' or delete them' : ''}
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
          onTogglePaid={togglePaid}
          onCopyMessage={handleCopyMessage}
          canDelete={canDelete}
          onDelete={setPendingDelete}
        />
      )}

      {showNewOrder && (
        <NewOrderModal onClose={closeNewOrder} onSubmit={handleCreateOrder} />
      )}

      <ConfirmationDialog
        isOpen={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        type="error"
        title={pendingDelete?.length > 1 ? `Delete ${pendingDelete.length} orders?` : 'Delete order?'}
        message={
          pendingDelete?.length > 1
            ? `This permanently removes ${pendingDelete.length} orders (${pendingDelete.map((o) => `#${o.id}`).join(', ')}). This cannot be undone.`
            : `This permanently removes order #${pendingDelete?.[0]?.id}. This cannot be undone.`
        }
        confirmText="Delete"
      />

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
