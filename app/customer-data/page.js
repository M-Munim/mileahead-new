'use client';

import { useState, useMemo, useCallback } from 'react';
import { Search, RotateCcw, Download, Megaphone, Users, X, Info } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Toast from '../components/Toast';
import { useFocusTrap } from '@/app/hooks/useFocusTrap';
import { DISCOUNTS, PAYMENT_METHODS } from '../../utils/priceList';

// ─────────────────────────────────────────────────────────────
// Customer types (segments)
// ─────────────────────────────────────────────────────────────
const SEGMENTS = ['Repeat', 'Occasional', 'Rare', 'New', 'Inactive'];

const SEGMENT_META = {
  Repeat:     { pill: 'bg-green-100 text-green-700',   rule: '4 or more visits, and visited in the last 60 days' },
  Occasional: { pill: 'bg-blue-100 text-blue-700',     rule: '2 to 3 visits, and visited in the last 60 days' },
  Rare:       { pill: 'bg-amber-100 text-amber-700',   rule: 'Only 1 visit, more than 30 days ago' },
  New:        { pill: 'bg-violet-100 text-violet-700', rule: 'First visit in the last 30 days' },
  Inactive:   { pill: 'bg-red-100 text-red-700',       rule: 'No visit for more than 60 days' },
};

/** Applies the rules above. Inactive wins, then single-visit customers split into New / Rare. */
const getSegment = ({ visits, daysSinceVisit }) => {
  if (daysSinceVisit > 60) return 'Inactive';
  if (visits === 1) return daysSinceVisit <= 30 ? 'New' : 'Rare';
  if (visits <= 3) return 'Occasional';
  return 'Repeat';
};

const STATUS_PILL = {
  Paid:   'bg-green-100 text-green-700 hover:bg-green-200',
  Unpaid: 'bg-red-100 text-red-700 hover:bg-red-200',
};

const PROMO_TEMPLATES = [
  { label: 'Weekend offer',  text: 'Hi {name}, enjoy 20% off any wash this weekend at Magic Track. Book now!' },
  { label: 'We miss you',    text: 'Hi {name}, we miss you! Come back this week and get a free interior freshener with your wash.' },
  { label: 'Loyalty reward', text: 'Hi {name}, thank you for being a loyal customer. Your next Body Polishing is 15% off.' },
];

// ─────────────────────────────────────────────────────────────
// Dummy data (client request: no real data at this stage)
// ─────────────────────────────────────────────────────────────
// Services and vehicle types follow the Magic Track price list (utils/priceList.js).
const SAMPLE_CUSTOMERS = [
  ['Mohammed A.', '+974 3344 5566', '3456', 'SUV',             'Body Wash – In & Out',          'Fleet Discount', 8, 5,   2640, 'Partner Credit', 'Paid'],
  ['Jane Doe',    '+974 5511 2233', '1234', 'Sedan',           'Body Wash – In & Out',          'Loyalty Free',   6, 3,   720,  'Fawran',         'Paid'],
  ['Khalid B.',   '+974 6677 3344', '2345', '7-Seater',        'Full Interior Cleaning',        'Coupon',         5, 9,   1610, 'Paylater',       'Unpaid'],
  ['Noor S.',     '+974 5544 8822', '7890', 'Sedan',           'Glass Polish',                  'Loyalty Free',   4, 12,  480,  'Fawran',         'Paid'],
  ['Sara K.',     '+974 7788 9900', '4567', 'SUV',             'Body Wash – In & Out',          'Coupon',         3, 20,  455,  'Fawran',         'Paid'],
  ['Fahad Q.',    '+974 6611 2200', '8901', 'SUV',             'Body Polishing',                'Fleet Discount', 2, 35,  700,  'Partner Credit', 'Paid'],
  ['Hind A.',     '+974 5522 6611', '6789', 'Crossover',       'Paint Protection Film (PPF)',   'Coupon',         2, 48,  7035, 'Paylater',       'Unpaid'],
  ['Omar F.',     '+974 6633 1188', '5678', 'SUV',             'Nano Ceramic Tint',             'Loyalty Free',   1, 4,   1200, 'Fawran',         'Paid'],
  ['Aisha M.',    '+974 5599 2277', '9012', 'Sedan',           'Body Wash – In & Out',          'Coupon',         1, 10,  30,   'Paylater',       'Paid'],
  ['Yusuf R.',    '+974 6611 4477', '0123', '7-Seater',        'Body Wash – In & Out',          'Fleet Discount', 1, 45,  40,   'Partner Credit', 'Unpaid'],
  ['Layla H.',    '+974 5522 3311', '1357', 'SUV',             'Glass Polish',                  'Loyalty Free',   3, 75,  540,  'Fawran',         'Paid'],
  ['Ahmed T.',    '+974 3300 7766', '2468', 'Sedan',           'Full Interior Cleaning',        'Coupon',         1, 92,  280,  'Paylater',       'Unpaid'],
  ['Mariam D.',   '+974 5511 8899', '3691', 'GMC / Large SUV', 'Paint Protection Film (PPF)',   'Fleet Discount', 5, 80,  9600, 'Partner Credit', 'Paid'],
  ['Ali H.',      '+974 6600 5511', '4820', 'SUV',             'Interior & Exterior Polishing', 'Loyalty Free',   1, 120, 650,  'Fawran',         'Paid'],
  ['Reem N.',     '+974 5533 2244', '5931', 'Sedan',           'Body Wash – In & Out',          'Coupon',         2, 66,  60,   'Paylater',       'Unpaid'],
].map(([name, phone, plate, vehicle, service, discount, visits, daysSinceVisit, spent, payment, status], i) => {
  const customer = { id: `C-${i + 1}`, name, phone, plate, vehicle, service, discount, visits, daysSinceVisit, spent, payment, status };
  return { ...customer, segment: getSegment(customer) };
});

const EMPTY_FILTERS = {
  q: '', segment: '', lastVisit: '', visits: '', service: '', vehicle: '',
  discount: '', payment: '', status: '', spent: '',
};

const uniqueSorted = (key) => [...new Set(SAMPLE_CUSTOMERS.map((c) => c[key]))].sort();
const SERVICES = uniqueSorted('service');
const VEHICLES = uniqueSorted('vehicle');

function matchesFilters(c, f) {
  const q = f.q.trim().toLowerCase();
  if (q && !`${c.name} ${c.phone} ${c.plate}`.toLowerCase().includes(q)) return false;
  if (f.segment && c.segment !== f.segment) return false;

  if (f.lastVisit === 'old' && c.daysSinceVisit <= 60) return false;
  if (f.lastVisit && f.lastVisit !== 'old' && c.daysSinceVisit > Number(f.lastVisit)) return false;

  if (f.visits === '1' && c.visits !== 1) return false;
  if (f.visits === '2' && (c.visits < 2 || c.visits > 3)) return false;
  if (f.visits === '4' && c.visits < 4) return false;

  if (f.service && c.service !== f.service) return false;
  if (f.vehicle && c.vehicle !== f.vehicle) return false;
  if (f.discount && c.discount !== f.discount) return false;
  if (f.payment && c.payment !== f.payment) return false;
  if (f.status && c.status !== f.status) return false;

  if (f.spent === '0-300' && c.spent >= 300) return false;
  if (f.spent === '300-800' && (c.spent < 300 || c.spent >= 800)) return false;
  if (f.spent === '800+' && c.spent < 800) return false;
  return true;
}

/** "5 Oct (3d ago)" — relative to the viewer's today. */
const lastVisitLabel = (days) => {
  if (days === 0) return 'Today';
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} (${days}d ago)`;
};

const firstName = (name) => (name || '').split(' ')[0] || 'Customer';

/** CSV that opens cleanly in Excel (BOM + quoted cells). */
function downloadCsv(list) {
  const header = ['Name', 'Phone', 'Plate', 'Vehicle', 'Service', 'Discount', 'Visits', 'Days since last visit', 'Spent (QAR)', 'Payment method', 'Status', 'Type'];
  const rows = list.map((c) => [c.name, c.phone, c.plate, c.vehicle, c.service, c.discount, c.visits, c.daysSinceVisit, c.spent, c.payment, c.status, c.segment]);
  const csv = [header, ...rows]
    .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\r\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'magic-track-customers.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────
// Send promotion modal (demo — nothing is actually sent)
// ─────────────────────────────────────────────────────────────
function PromotionModal({ allList, filteredList, selectedList, onClose, onSend }) {
  const modalRef = useFocusTrap(true, onClose);
  const [target, setTarget] = useState(selectedList.length > 0 ? 'selected' : 'all');
  const [channel, setChannel] = useState('WhatsApp');
  const [template, setTemplate] = useState('');
  const [message, setMessage] = useState('');

  const recipients = target === 'selected' ? selectedList : target === 'filtered' ? filteredList : allList;
  const preview = (message || 'Your message will appear here').replaceAll('{name}', firstName(recipients[0]?.name));
  const canSend = recipients.length > 0 && message.trim().length > 0;

  const targets = [
    { key: 'all',      label: 'All customers',                         count: allList.length },
    { key: 'filtered', label: 'Customers in the current filter',       count: filteredList.length },
    { key: 'selected', label: 'Selected customers (tick in the table)', count: selectedList.length },
  ];

  return (
    <div className="fixed inset-0 bg-black/40 modal-backdrop z-50 flex items-center justify-center p-4">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="promo-title"
        className="bg-white shadow-xl w-full max-w-lg max-h-[92vh] overflow-y-auto animate-fade-in-scale"
      >
        <div className="sticky top-0 z-10 bg-white flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 id="promo-title" className="text-base font-semibold text-gray-900">Send promotion</h2>
            <p className="text-xs text-gray-500 mt-0.5">Write one message and send it to your customers.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="btn-icon p-1.5 hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6">
          <fieldset>
            <legend className="text-[13px] font-medium text-gray-700 mb-1.5">Send to</legend>
            {targets.map((t) => {
              const disabled = t.key === 'selected' && t.count === 0;
              return (
                <label
                  key={t.key}
                  className={`flex items-center gap-2.5 px-3 py-2.5 mb-2 border text-sm font-normal transition-colors ${
                    target === t.key ? 'border-[var(--primary)] bg-[var(--primary-light)]' : 'border-gray-200'
                  } ${disabled ? 'opacity-45 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <input
                    type="radio"
                    name="promo-target"
                    value={t.key}
                    checked={target === t.key}
                    disabled={disabled}
                    onChange={() => setTarget(t.key)}
                    className="accent-[var(--primary)]"
                  />
                  <span className="text-gray-800">{t.label} <b>({t.count})</b></span>
                </label>
              );
            })}
          </fieldset>

          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label htmlFor="promo-channel">Send via</label>
              <select id="promo-channel" value={channel} onChange={(e) => setChannel(e.target.value)}>
                <option>WhatsApp</option>
                <option>SMS</option>
              </select>
            </div>
            <div>
              <label htmlFor="promo-template">Template</label>
              <select
                id="promo-template"
                value={template}
                onChange={(e) => {
                  setTemplate(e.target.value);
                  if (e.target.value !== '') setMessage(PROMO_TEMPLATES[Number(e.target.value)].text);
                }}
              >
                <option value="">Choose a template</option>
                {PROMO_TEMPLATES.map((t, i) => <option key={t.label} value={i}>{t.label}</option>)}
              </select>
            </div>
          </div>

          <div className="mt-3">
            <label htmlFor="promo-message">
              Message <span className="font-normal text-gray-500">(use {'{name}'} to add the customer&apos;s name)</span>
            </label>
            <textarea
              id="promo-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Hi {name}, enjoy 20% off your next wash this weekend!"
            />
          </div>

          <div className="mt-3">
            <span className="block text-[13px] font-medium text-gray-700 mb-1.5">Preview</span>
            <div className="bg-green-50 border border-green-100 px-3 py-2.5 text-sm text-gray-800 whitespace-pre-wrap break-words">
              {preview}
            </div>
          </div>

          <div className="form-footer">
            <button type="button" onClick={onClose} className="px-5 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
              Cancel
            </button>
            <button
              type="button"
              disabled={!canSend}
              onClick={() => onSend(recipients.length, channel)}
              className="px-5 py-2 text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send to {recipients.length} customer{recipients.length === 1 ? '' : 's'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Filter field
// ─────────────────────────────────────────────────────────────
function FilterSelect({ id, label, value, onChange, options, allLabel = 'All' }) {
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{allLabel}</option>
        {options.map((o) => {
          const [val, text] = Array.isArray(o) ? o : [o, o];
          return <option key={val} value={val}>{text}</option>;
        })}
      </select>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────
export default function CustomerDataPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [customers, setCustomers] = useState(SAMPLE_CUSTOMERS);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [showPromo, setShowPromo] = useState(false);
  const [toast, setToast] = useState(null);

  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);
  const closePromo = useCallback(() => setShowPromo(false), []);
  const setFilter = (key) => (value) => setFilters((prev) => ({ ...prev, [key]: value }));

  const filtered = useMemo(() => customers.filter((c) => matchesFilters(c, filters)), [customers, filters]);
  const selectedList = useMemo(() => customers.filter((c) => selectedIds.has(c.id)), [customers, selectedIds]);
  const segmentCounts = useMemo(() => {
    const counts = Object.fromEntries(SEGMENTS.map((s) => [s, 0]));
    customers.forEach((c) => { counts[c.segment] += 1; });
    return counts;
  }, [customers]);

  const allShownSelected = filtered.length > 0 && filtered.every((c) => selectedIds.has(c.id));
  const hasFilters = Object.values(filters).some(Boolean);

  const toggleSelected = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAllShown = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filtered.forEach((c) => (allShownSelected ? next.delete(c.id) : next.add(c.id)));
      return next;
    });
  };

  const updateCustomer = (id, changes) => {
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, ...changes } : c)));
  };

  const handleExport = () => {
    if (filtered.length === 0) {
      setToast({ message: 'No customers to export with these filters.', type: 'warning' });
      return;
    }
    downloadCsv(filtered);
    setToast({ message: `Exported ${filtered.length} customer${filtered.length === 1 ? '' : 's'}`, type: 'success' });
  };

  const handleSend = (count, channel) => {
    setShowPromo(false);
    setToast({ message: `Demo: promotion sent to ${count} customer${count === 1 ? '' : 's'} via ${channel}. (Nothing was actually sent.)`, type: 'success' });
  };

  const segmentCards = [{ key: '', label: 'All customers', count: customers.length }]
    .concat(SEGMENTS.map((s) => ({ key: s, label: `${s} customers`, count: segmentCounts[s] })));

  return (
    <div className="flex min-h-screen bg-gray-50 overflow-x-hidden">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={toggleSidebar} aria-hidden="true" />
      )}

      <div className="flex-1 flex flex-col min-h-screen lg:ml-[240px] w-full lg:w-auto overflow-x-hidden">
        <div className="px-4 md:px-6 pt-4 md:pt-6">
          <Header title="Customer Data" toggleSidebar={toggleSidebar} />
        </div>

        <main className="flex-1 px-4 md:px-6 pb-6 overflow-x-hidden">
          <div className="max-w-6xl mx-auto space-y-4">
            {/* Segment cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {segmentCards.map((card) => {
                const active = filters.segment === card.key;
                return (
                  <button
                    key={card.key || 'all'}
                    type="button"
                    onClick={() => setFilter('segment')(card.key)}
                    aria-pressed={active}
                    className={`text-left bg-white border px-4 py-3 transition-all ${
                      active
                        ? 'border-[var(--primary)] ring-2 ring-[var(--primary)]/20'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="block text-2xl font-bold text-gray-900">{card.count}</span>
                    <span className="block text-xs text-gray-500 mt-0.5">{card.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              {/* Panel header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-[var(--primary)]" aria-hidden="true" />
                </div>
                <div>
                  <h1 className="text-base font-semibold text-gray-900">Customers</h1>
                  <p className="text-xs text-gray-500">Filter your customers, export a list, or send them a promotion</p>
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 px-5 pt-4">
                <div>
                  <label htmlFor="f-q">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                    <input
                      id="f-q"
                      type="text"
                      value={filters.q}
                      onChange={(e) => setFilter('q')(e.target.value)}
                      placeholder="Name, phone or plate"
                      className="pl-9 pr-3"
                    />
                  </div>
                </div>
                <FilterSelect id="f-segment" label="Customer type" value={filters.segment} onChange={setFilter('segment')} options={SEGMENTS} />
                <FilterSelect
                  id="f-last" label="Last visit" value={filters.lastVisit} onChange={setFilter('lastVisit')} allLabel="Any time"
                  options={[['7', 'Last 7 days'], ['30', 'Last 30 days'], ['90', 'Last 90 days'], ['old', 'More than 60 days ago']]}
                />
                <FilterSelect
                  id="f-visits" label="Number of visits" value={filters.visits} onChange={setFilter('visits')} allLabel="Any"
                  options={[['1', '1 visit'], ['2', '2 – 3 visits'], ['4', '4+ visits']]}
                />
                <FilterSelect id="f-service" label="Service" value={filters.service} onChange={setFilter('service')} options={SERVICES} />
                <FilterSelect id="f-vehicle" label="Vehicle type" value={filters.vehicle} onChange={setFilter('vehicle')} options={VEHICLES} />
                <FilterSelect id="f-discount" label="Discount" value={filters.discount} onChange={setFilter('discount')} options={DISCOUNTS} />
                <FilterSelect id="f-payment" label="Payment method" value={filters.payment} onChange={setFilter('payment')} options={PAYMENT_METHODS} />
                <FilterSelect id="f-status" label="Status" value={filters.status} onChange={setFilter('status')} options={['Paid', 'Unpaid']} />
                <FilterSelect
                  id="f-spent" label="Total spent" value={filters.spent} onChange={setFilter('spent')} allLabel="Any"
                  options={[['0-300', 'Below QAR 300'], ['300-800', 'QAR 300 – 799'], ['800+', 'QAR 800+']]}
                />
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2 px-5 pt-4">
                <button
                  type="button"
                  onClick={() => setFilters(EMPTY_FILTERS)}
                  disabled={!hasFilters}
                  className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" /> Clear filters
                </button>
                <button
                  type="button"
                  onClick={handleExport}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors"
                >
                  <Download className="w-4 h-4" aria-hidden="true" /> Export to Excel (CSV)
                </button>
                <button
                  type="button"
                  onClick={() => setShowPromo(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
                >
                  <Megaphone className="w-4 h-4" aria-hidden="true" /> Send promotion
                </button>
                {selectedIds.size > 0 && (
                  <span className="text-xs text-gray-500">
                    {selectedIds.size} selected ·{' '}
                    <button type="button" onClick={() => setSelectedIds(new Set())} className="text-[var(--primary)] hover:text-[var(--primary-hover)] font-medium">
                      Clear
                    </button>
                  </span>
                )}
                <span className="ml-auto text-sm text-gray-500">
                  Showing {filtered.length} of {customers.length} customers
                </span>
              </div>

              {/* Table */}
              <div className="p-4 sm:p-5">
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full border-collapse min-w-[1250px]">
                    <thead>
                      <tr>
                        <th className="bg-gray-50 pl-3.5 pr-1 py-2.5 border-b border-gray-200 w-8">
                          <input
                            type="checkbox"
                            checked={allShownSelected}
                            onChange={toggleAllShown}
                            className="w-4 h-4 accent-[var(--primary)]"
                            aria-label="Select all customers shown"
                          />
                        </th>
                        {['Customer', 'Phone', 'Plate', 'Vehicle', 'Favourite service', 'Discount', 'Visits', 'Last visit', 'Spent (QAR)', 'Payment method', 'Status', 'Type'].map((h) => (
                          <th key={h} className="text-left text-[10px] uppercase tracking-wide text-gray-500 font-semibold bg-gray-50 px-3 py-2.5 border-b border-gray-200 whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((c) => (
                        <tr key={c.id} className="hover:bg-gray-50 border-b border-gray-100 last:border-0">
                          <td className="pl-3.5 pr-1 py-3">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(c.id)}
                              onChange={() => toggleSelected(c.id)}
                              className="w-4 h-4 accent-[var(--primary)]"
                              aria-label={`Select ${c.name}`}
                            />
                          </td>
                          <td className="px-3 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{c.name}</td>
                          <td className="px-3 py-3 text-sm text-gray-700 whitespace-nowrap">{c.phone}</td>
                          <td className="px-3 py-3 text-sm text-gray-700 whitespace-nowrap">{c.plate}</td>
                          <td className="px-3 py-3 text-sm text-gray-700 whitespace-nowrap">{c.vehicle}</td>
                          <td className="px-3 py-3 text-sm text-gray-700 whitespace-nowrap">{c.service}</td>
                          <td className="px-3 py-3">
                            <select
                              value={c.discount}
                              onChange={(e) => updateCustomer(c.id, { discount: e.target.value })}
                              className="text-[13px] min-w-[140px]"
                              style={{ paddingTop: 4, paddingBottom: 4 }}
                              aria-label={`Discount for ${c.name}`}
                            >
                              {DISCOUNTS.map((d) => <option key={d}>{d}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-700">{c.visits}</td>
                          <td className="px-3 py-3 text-sm text-gray-700 whitespace-nowrap" suppressHydrationWarning>
                            {lastVisitLabel(c.daysSinceVisit)}
                          </td>
                          <td className="px-3 py-3 text-sm font-medium text-gray-900">{c.spent.toLocaleString('en-US')}</td>
                          <td className="px-3 py-3">
                            <select
                              value={c.payment}
                              onChange={(e) => updateCustomer(c.id, { payment: e.target.value })}
                              className="text-[13px] min-w-[140px]"
                              style={{ paddingTop: 4, paddingBottom: 4 }}
                              aria-label={`Payment method for ${c.name}`}
                            >
                              {PAYMENT_METHODS.map((p) => <option key={p}>{p}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-3">
                            <button
                              type="button"
                              onClick={() => updateCustomer(c.id, { status: c.status === 'Paid' ? 'Unpaid' : 'Paid' })}
                              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${STATUS_PILL[c.status]}`}
                              title="Click to change status"
                            >
                              {c.status}
                            </button>
                          </td>
                          <td className="px-3 py-3">
                            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${SEGMENT_META[c.segment].pill}`}>
                              {c.segment}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {filtered.length === 0 && (
                    <div className="text-center py-14 text-gray-500">
                      <Users className="w-10 h-10 mx-auto mb-3 text-gray-300" aria-hidden="true" />
                      <p className="text-sm">No customers match these filters</p>
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 mt-3">
                  Change a discount or payment method from the list · click Paid / Unpaid to switch it · tick customers to send them a promotion
                </p>
              </div>
            </div>

            {/* Segment rules */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-5 py-4">
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-[var(--primary)]" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-gray-900">How customer types are decided</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {SEGMENTS.map((s) => (
                  <div key={s} className="border border-gray-100 bg-gray-50 px-3 py-3">
                    <span className={`inline-flex px-3 py-0.5 rounded-full text-xs font-semibold ${SEGMENT_META[s].pill}`}>{s}</span>
                    <p className="text-xs text-gray-600 mt-2 leading-relaxed">{SEGMENT_META[s].rule}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>

      {showPromo && (
        <PromotionModal
          allList={customers}
          filteredList={filtered}
          selectedList={selectedList}
          onClose={closePromo}
          onSend={handleSend}
        />
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
