'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Search, Phone, X, Clock, Droplets, CheckCircle,
  RefreshCw, ClipboardList, Copy, Trash2, MessageCircle, Plus, CalendarPlus, CalendarDays,
  Loader2, AlertCircle,
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Toast from '../components/Toast';
import ConfirmationDialog from '../components/ConfirmationDialog';
import NewOrderModal from '../components/NewOrderModal';
import AppointmentModal from '../components/AppointmentModal';
import { useAuth } from '../contexts/AuthContext';
import { copyText, getWhatsAppUrl } from '../../utils/location';
import {
  formatQar, couponApplies, COUPON_RATE,
  PAYMENT_METHODS, PAYMENT_TYPES, OTHER_SERVICES_TITLE,
} from '../../utils/priceList';
import {
  fetchCarWashOrders, createCarWashOrder, setOrderPaymentStatus, updateOrderField as saveOrderField,
  deleteOrder, fetchAppointments, createAppointment, cancelAppointment,
} from '../../utils/carWashApi';

/** Orders refresh in the background so kiosk orders from any device show up. */
const REFRESH_MS = 30000;

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
  { key: 'appointments', label: 'Appointments' },
];

const APPOINTMENT_PILL = {
  Detailing: 'bg-blue-100 text-blue-700',
  Polishing: 'bg-violet-100 text-violet-700',
  Graphene:  'bg-orange-100 text-orange-800',
};

// ─────────────────────────────────────────────────────────────
// Future appointments (Detailing / Polishing / Graphene)
// ─────────────────────────────────────────────────────────────
/** "Mon, 13 Oct 2026" from YYYY-MM-DD (read as a local date, not UTC). */
const formatDay = (iso) => {
  const [y, m, d] = String(iso).split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

/** "4:30 PM" from HH:MM. */
const formatTime = (hhmm) => {
  const [h, m] = String(hhmm).split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  return new Date(2000, 0, 1, h, m).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

const byDateTime = (a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`);

const getInitial = (name) => (name?.trim()?.[0] || '?').toUpperCase();
const telHref = (phone) => `tel:${(phone || '').replace(/[^\d+]/g, '')}`;
const timeNow = () =>
  new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

const serviceLabel = (order) => order.service || `${OTHER_SERVICES_TITLE} only`;
const discountLabel = (order) =>
  couponApplies(order.discount, order.couponSerial)
    ? `Coupon · ${order.couponSerial} (${COUPON_RATE * 100}% off)`
    : order.discount || '—';

/** Job sheet sent to the cleaner (WhatsApp / copy-paste). */
const buildCleanerMessage = (order) => {
  const lines = [
    `*Magic Track — Car Wash Job #${order.id}*`,
    '',
    `Date & Time: ${order.time}`,
    `Service: ${serviceLabel(order)}`,
    order.extras?.length ? `${OTHER_SERVICES_TITLE}: ${order.extras.join(', ')}` : null,
    `Vehicle: ${order.vehicle}`,
    `Number Plate: ${order.numberPlate || '—'}`,
    '',
    `Customer: ${order.customer.name}`,
    `Contact: ${order.customer.phone}`,
    '',
    `Amount: ${formatQar(order.total)} (${[order.paymentMethod, order.paymentType, STATUS_META[order.status].label].filter(Boolean).join(' · ')})`,
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
function OrderDrawer({ order, onClose, onTogglePaid, onCopyMessage, canDelete, onDelete, busy }) {
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
    ...(order.source === 'kiosk' ? [['Placed from', `Kiosk · Queue ${order.queue}`]] : []),
    ['Service', serviceLabel(order)],
    ['Vehicle', order.vehicle],
    [OTHER_SERVICES_TITLE, order.extras?.length ? order.extras.join(', ') : '—'],
    ['Number Plate', order.numberPlate || '—'],
    ['Date & Time', order.time],
    ['Discount', discountLabel(order)],
    ['Payment Method', order.paymentMethod || '—'],
    ['Payment Type', order.paymentType || '—'],
    ...(couponApplies(order.discount, order.couponSerial) && order.subtotal
      ? [['Subtotal', formatQar(order.subtotal)], [`Coupon (${COUPON_RATE * 100}% off)`, `− ${formatQar(order.subtotal - order.total)}`]]
      : []),
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
                disabled={busy}
                className="text-[12px] text-gray-500 hover:text-gray-800 underline disabled:opacity-50"
              >
                Mark as Unpaid
              </button>
            </>
          ) : (
            <button
              onClick={() => onTogglePaid(order)}
              disabled={busy}
              className={`w-full py-3 text-[13px] font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-60 ${TONE.green}`}
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <CheckCircle className="w-4 h-4" aria-hidden="true" />} Mark as Paid
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
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [busyIds, setBusyIds] = useState(() => new Set()); // orders with a save in progress
  const knownOrderIds = useRef(null);
  const [activeTab, setActiveTab] = useState('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [toast, setToast] = useState(null);
  const [checkedIds, setCheckedIds] = useState(() => new Set());
  const [pendingDelete, setPendingDelete] = useState(null); // orders awaiting confirmation
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [showAppointment, setShowAppointment] = useState(false);
  const [pendingCancel, setPendingCancel] = useState(null); // appointment awaiting confirmation
  const { hasPermission } = useAuth();
  const canDelete = hasPermission('canDeleteRecords');
  const canCreate = hasPermission('canManageBookings');

  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);
  const closeNewOrder = useCallback(() => setShowNewOrder(false), []);
  const closeAppointment = useCallback(() => setShowAppointment(false), []);
  const isAppointmentsTab = activeTab === 'appointments';

  const setBusy = useCallback((id, on) => {
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id); else next.delete(id);
      return next;
    });
  }, []);

  /**
   * Loads orders + appointments from the backend. `background` = the 30s
   * refresh: no spinner, and a toast when a new kiosk order arrives.
   */
  const loadData = useCallback(async ({ background = false } = {}) => {
    const [ordersResult, appointmentsResult] = await Promise.allSettled([fetchCarWashOrders(), fetchAppointments()]);

    if (ordersResult.status === 'fulfilled') {
      const list = ordersResult.value;
      if (background && knownOrderIds.current) {
        const fresh = list.filter((o) => !knownOrderIds.current.has(o.id));
        const kiosk = fresh.filter((o) => o.source === 'kiosk');
        if (kiosk.length === 1) {
          setToast({ message: `New kiosk order — queue ${kiosk[0].queue} (${serviceLabel(kiosk[0])}, ${formatQar(kiosk[0].total)})`, type: 'success' });
        } else if (fresh.length > 0) {
          setToast({ message: `${fresh.length} new order${fresh.length === 1 ? '' : 's'} received`, type: 'success' });
        }
      }
      knownOrderIds.current = new Set(list.map((o) => o.id));
      setOrders(list);
      setLoadError(null);
    } else if (!background) {
      console.error('Error loading car wash orders:', ordersResult.reason);
      setLoadError(ordersResult.reason?.message || 'Could not load orders from the server.');
    }

    if (appointmentsResult.status === 'fulfilled') {
      setAppointments(appointmentsResult.value);
    } else if (!background) {
      console.error('Error loading appointments:', appointmentsResult.reason);
    }
    if (!background) setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') loadData({ background: true });
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [loadData]);

  const refreshNow = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setSelectedId(null);
    setCheckedIds(new Set());
    await loadData();
  }, [loadData]);

  const counts = useMemo(() => {
    const c = { all: orders.length, appointments: appointments.length };
    for (const s of STATUSES) c[s] = 0;
    for (const o of orders) c[o.status] = (c[o.status] || 0) + 1;
    return c;
  }, [orders, appointments]);

  const visibleOrders = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      if (activeTab !== 'all' && o.status !== activeTab) return false;
      if (!q) return true;
      return [
        o.id, o.customer.name, o.customer.phone, serviceLabel(o), o.vehicle,
        o.numberPlate, o.discount, o.couponSerial, o.paymentMethod, o.paymentType,
      ].some((v) => (v || '').toLowerCase().includes(q));
    });
  }, [orders, activeTab, query]);

  const visibleAppointments = useMemo(() => {
    const q = query.trim().toLowerCase();
    return appointments
      .filter((a) => !q || [a.id, a.type, a.customer.name, a.customer.phone, a.notes]
        .some((v) => (v || '').toLowerCase().includes(q)))
      .sort(byDateTime);
  }, [appointments, query]);

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

  // Every action below saves to the backend (utils/carWashApi.js).
  const confirmDelete = useCallback(async () => {
    const list = pendingDelete || [];
    if (list.length === 0 || !canDelete) return;
    const deleted = [];
    let lastError = null;
    for (const order of list) {
      try {
        await deleteOrder(order);
        deleted.push(order.id);
      } catch (error) {
        console.error(`Error deleting order #${order.id}:`, error);
        lastError = error;
      }
    }
    if (deleted.length > 0) {
      setOrders((prev) => prev.filter((o) => !deleted.includes(o.id)));
      setCheckedIds((prev) => {
        const next = new Set(prev);
        deleted.forEach((id) => next.delete(id));
        return next;
      });
      if (deleted.includes(selectedId)) setSelectedId(null);
    }
    if (!lastError) {
      setToast({ message: deleted.length === 1 ? `Order #${deleted[0]} deleted` : `${deleted.length} orders deleted`, type: 'success' });
    } else {
      setToast({ message: `${list.length - deleted.length} of ${list.length} order(s) could not be deleted: ${lastError.message || 'server error'}`, type: 'error' });
    }
  }, [pendingDelete, canDelete, selectedId]);

  // New order: saved on the server first; throws so the form keeps the data and shows why.
  const handleCreateOrder = useCallback(async (values) => {
    const created = await createCarWashOrder(values);
    if (created) setOrders((prev) => [created, ...prev.filter((o) => o.id !== created.id)]);
    else await loadData();
    setShowNewOrder(false);
    setActiveTab('all');
    setQuery('');
    setToast({ message: `Order${created ? ` #${created.id}` : ''} for ${values.customerName} saved`, type: 'success' });
  }, [loadData]);

  // Payment method / type changed from the table: shown at once, undone if the save fails.
  const updateOrderField = useCallback(async (order, field, value, label) => {
    const previous = order[field];
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, [field]: value } : o)));
    setBusy(order.id, true);
    try {
      await saveOrderField(order, field, value);
      setToast({ message: `#${order.id} ${label}: ${value}`, type: 'success' });
    } catch (error) {
      console.error(`Error updating ${field} for #${order.id}:`, error);
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, [field]: previous } : o)));
      setToast({ message: `Could not save the ${label} for #${order.id}: ${error.message || 'server error'}`, type: 'error' });
    } finally {
      setBusy(order.id, false);
    }
  }, [setBusy]);

  // Future appointment (saved as a booking with Service = 'appointment').
  const handleCreateAppointment = useCallback(async (values) => {
    const created = await createAppointment(values);
    if (created) setAppointments((prev) => [...prev, created]);
    else await loadData();
    setShowAppointment(false);
    setActiveTab('appointments');
    setQuery('');
    setToast({ message: `${values.type} appointment booked for ${values.customerName} — ${formatDay(values.date)}, ${formatTime(values.time)}`, type: 'success' });
  }, [loadData]);

  const confirmCancelAppointment = useCallback(async () => {
    const appointment = pendingCancel;
    if (!appointment) return;
    try {
      await cancelAppointment(appointment);
      setAppointments((prev) => prev.filter((a) => a.id !== appointment.id));
      setToast({ message: `Appointment for ${appointment.customer.name} cancelled`, type: 'success' });
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      setToast({ message: `Could not cancel the appointment: ${error.message || 'server error'}`, type: 'error' });
    }
  }, [pendingCancel]);

  const togglePaid = useCallback(async (order) => {
    if (busyIds.has(order.id)) return;
    const next = order.status === 'paid' ? 'unpaid' : 'paid';
    const changes = { status: next, paidAt: next === 'paid' ? timeNow() : undefined };
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, ...changes } : o)));
    setBusy(order.id, true);
    try {
      await setOrderPaymentStatus(order, next);
      setToast({ message: `#${order.id} marked as ${STATUS_META[next].label}`, type: 'success' });
    } catch (error) {
      console.error(`Error updating status for #${order.id}:`, error);
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: order.status, paidAt: order.paidAt } : o)));
      setToast({ message: `Could not mark #${order.id} as ${STATUS_META[next].label}: ${error.message || 'server error'}`, type: 'error' });
    } finally {
      setBusy(order.id, false);
    }
  }, [busyIds, setBusy]);

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
                    onClick={refreshNow}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap disabled:opacity-60"
                    title="Load the latest orders from the server"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" /> Refresh
                  </button>
                  {canCreate && (
                    <button
                      onClick={() => setShowAppointment(true)}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap bg-white text-[var(--primary)] border border-[var(--primary)] hover:bg-[var(--primary-light)]"
                    >
                      <CalendarPlus className="w-4 h-4" aria-hidden="true" /> Take Appointment
                    </button>
                  )}
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
              {!isAppointmentsTab && checkedOrders.length > 0 && (
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

              {loadError && (
                <div className="mx-5 mt-3 px-3 py-2 flex flex-wrap items-center gap-2 text-sm bg-red-50 border border-red-200 text-red-700" role="alert">
                  <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="mr-auto">Could not load orders from the server: {loadError}</span>
                  <button onClick={refreshNow} className="text-xs font-semibold underline">Try again</button>
                </div>
              )}

              {/* Table */}
              <div className="p-4 sm:p-5">
                {isAppointmentsTab ? (
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="w-full border-collapse min-w-[860px]">
                      <thead>
                        <tr>
                          {['Appointment', 'Customer', 'Date', 'Time', 'Notes', ''].map((h, i) => (
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
                        {visibleAppointments.map((a) => (
                          <tr key={a.id} className="hover:bg-gray-50 border-b border-gray-100 last:border-0">
                            <td className="px-3.5 py-3 whitespace-nowrap">
                              <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${APPOINTMENT_PILL[a.type] || 'bg-gray-100 text-gray-700'}`}>
                                {a.type}
                              </span>
                              <div className="text-[11px] text-gray-400 mt-1">#{a.id}</div>
                            </td>
                            <td className="px-3.5 py-3">
                              <div className="text-sm font-medium text-gray-900 whitespace-nowrap">{a.customer.name}</div>
                              <div className="text-[11px] text-gray-500 whitespace-nowrap">{a.customer.phone}</div>
                            </td>
                            <td className="px-3.5 py-3 text-sm text-gray-700 whitespace-nowrap">{formatDay(a.date)}</td>
                            <td className="px-3.5 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{formatTime(a.time)}</td>
                            <td className="px-3.5 py-3 text-sm text-gray-600">
                              <div className="max-w-[280px] truncate" title={a.notes}>{a.notes || '—'}</div>
                            </td>
                            <td className="px-3.5 py-3 text-right whitespace-nowrap">
                              <a
                                href={telHref(a.customer.phone)}
                                className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 mr-1.5 align-middle transition-colors ${TONE.ghost}`}
                                aria-label={`Call ${a.customer.name}`}
                              >
                                <Phone className="w-3.5 h-3.5" aria-hidden="true" /> Call
                              </a>
                              {canCreate && (
                                <button
                                  onClick={() => setPendingCancel(a)}
                                  className="text-xs font-medium px-3 py-1.5 align-middle text-red-600 bg-white border border-red-200 hover:bg-red-50 transition-colors"
                                >
                                  Cancel
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {visibleAppointments.length === 0 && (
                      <div className="text-center py-14 text-gray-500">
                        <CalendarDays className="w-10 h-10 mx-auto mb-3 text-gray-300" aria-hidden="true" />
                        <p className="text-sm">{loading ? 'Loading appointments…' : `No appointments${query.trim() ? ' match your search' : ' booked yet'}`}</p>
                      </div>
                    )}
                  </div>
                ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full border-collapse min-w-[1320px]">
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
                        {['Order', 'Customer', 'Service', 'Number Plate', 'Discount', 'Payment Method', 'Payment Type', 'Total', 'Time', 'Status', ''].map((h, i) => (
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
                          <td className="px-3.5 py-3 text-sm font-semibold text-gray-900 whitespace-nowrap">
                            #{o.id}
                            {o.source === 'kiosk' && (
                              <span className="block mt-1 w-fit px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--primary-light)] text-[var(--primary-dark)]">
                                Kiosk · {o.queue}
                              </span>
                            )}
                          </td>
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
                              value={o.paymentMethod}
                              onChange={(e) => updateOrderField(o, 'paymentMethod', e.target.value, 'payment method')}
                              disabled={busyIds.has(o.id)}
                              className="text-[13px] min-w-[100px]"
                              style={{ paddingTop: 4, paddingBottom: 4 }}
                              aria-label={`Payment method for order ${o.id}`}
                            >
                              {!o.paymentMethod && <option value="">—</option>}
                              {PAYMENT_METHODS.map((p) => <option key={p}>{p}</option>)}
                            </select>
                          </td>
                          <td className="px-3.5 py-3" onClick={(e) => e.stopPropagation()}>
                            <select
                              value={o.paymentType}
                              onChange={(e) => updateOrderField(o, 'paymentType', e.target.value, 'payment type')}
                              disabled={busyIds.has(o.id)}
                              className="text-[13px] min-w-[140px]"
                              style={{ paddingTop: 4, paddingBottom: 4 }}
                              aria-label={`Payment type for order ${o.id}`}
                            >
                              {!o.paymentType && <option value="">—</option>}
                              {PAYMENT_TYPES.map((p) => <option key={p}>{p}</option>)}
                            </select>
                          </td>
                          <td className="px-3.5 py-3 text-sm font-semibold text-gray-900 whitespace-nowrap">{formatQar(o.total)}</td>
                          <td className="px-3.5 py-3 text-sm text-gray-700 whitespace-nowrap">{o.time}</td>
                          <td className="px-3.5 py-3"><StatusPill status={o.status} /></td>
                          <td className="px-3.5 py-3 text-right whitespace-nowrap">
                            {o.status === 'unpaid' ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); togglePaid(o); }}
                                disabled={busyIds.has(o.id)}
                                className={`text-xs font-medium px-3 py-1.5 transition-colors disabled:opacity-60 ${TONE.green}`}
                              >
                                {busyIds.has(o.id) ? 'Saving…' : 'Mark Paid'}
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
                      {loading ? (
                        <>
                          <Loader2 className="w-8 h-8 mx-auto mb-3 text-[var(--primary)] animate-spin" aria-hidden="true" />
                          <p className="text-sm">Loading orders…</p>
                        </>
                      ) : (
                        <>
                          <ClipboardList className="w-10 h-10 mx-auto mb-3 text-gray-300" aria-hidden="true" />
                          <p className="text-sm">{orders.length === 0 && !loadError ? 'No orders yet — add one with New Order' : 'No orders in this view'}</p>
                        </>
                      )}
                    </div>
                  )}
                </div>
                )}

                <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-3">
                  <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                  {isAppointmentsTab
                    ? 'Future appointments, soonest first · use Take Appointment to book one'
                    : `Tap a row to open the order · Mark Paid when the customer pays · tick orders to send them to a cleaner${canDelete ? ' or delete them' : ''}`}
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
          busy={busyIds.has(selectedOrder.id)}
        />
      )}

      {showNewOrder && (
        <NewOrderModal onClose={closeNewOrder} onSubmit={handleCreateOrder} />
      )}

      {showAppointment && (
        <AppointmentModal onClose={closeAppointment} onSubmit={handleCreateAppointment} />
      )}

      <ConfirmationDialog
        isOpen={!!pendingCancel}
        onClose={() => setPendingCancel(null)}
        onConfirm={confirmCancelAppointment}
        type="warning"
        title="Cancel appointment?"
        message={pendingCancel
          ? `Cancel the ${pendingCancel.type} appointment for ${pendingCancel.customer.name} on ${formatDay(pendingCancel.date)} at ${formatTime(pendingCancel.time)}?`
          : ''}
        confirmText="Cancel Appointment"
        cancelText="Keep"
      />

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
