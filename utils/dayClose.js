// Day Close report: what came in on a day (or a range of days), built from the
// car wash orders already loaded by the dashboard.
//
// Rules agreed with the client (26 Oct 2026):
//   - A day's money = orders dated that day AND marked Paid.
//   - Cash / Card come from Payment Method; Payment Type "Fawran" counts as
//     Online (bank transfer), whatever the method says.
//   - Paylater and Partner Credit are credit: not collected until marked Paid,
//     shown under "Still to collect" with every other unpaid order.

import { OTHER_SERVICES_TITLE } from './priceList';

export const CHANNELS = [
  { key: 'cash', label: 'Cash' },
  { key: 'card', label: 'Card' },
  { key: 'online', label: 'Online (Fawran)' },
  { key: 'unspecified', label: 'Method not recorded' },
];

const CREDIT_TYPES = ['Paylater', 'Partner Credit'];

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/** Where the money of a paid order went. */
export const channelOf = (order) => {
  if (order.paymentType === 'Fawran') return 'online';
  if (order.paymentMethod === 'Cash') return 'cash';
  if (order.paymentMethod === 'Card') return 'card';
  return 'unspecified';
};

/** Discount given on an order: price-list subtotal minus what was charged. */
const discountAmount = (order) => {
  const diff = round2((Number(order.subtotal) || 0) - (Number(order.total) || 0));
  return diff > 0 ? diff : 0;
};

/** "10:24 AM" from the order's "24 Oct 2026, 10:24 AM". */
export const timeOf = (order) => String(order.time || '').split(', ').slice(1).join(', ') || '—';

/** YYYY-MM-DD for a local date. */
export const isoDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** "Sun, 26 Oct 2026" or "24 Oct – 26 Oct 2026". */
export function rangeLabel(from, to) {
  const fmt = (iso, withYear) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
      weekday: from === to ? 'short' : undefined,
      day: 'numeric',
      month: 'short',
      year: withYear ? 'numeric' : undefined,
    });
  };
  return from === to ? fmt(from, true) : `${fmt(from, false)} – ${fmt(to, true)}`;
}

/** Everything the Day Close page, the Excel file and the WhatsApp summary show. */
export function buildDayReport(orders, from, to) {
  const inRange = orders
    .filter((o) => o.date && o.date >= from && o.date <= to)
    .sort((a, b) => (a.originalId || 0) - (b.originalId || 0)); // oldest first, like a receipt book

  const paid = inRange.filter((o) => o.status === 'paid');
  const unpaid = inRange.filter((o) => o.status !== 'paid');

  const byChannel = Object.fromEntries(CHANNELS.map((c) => [c.key, { count: 0, amount: 0 }]));
  paid.forEach((o) => {
    const c = byChannel[channelOf(o)];
    c.count += 1;
    c.amount = round2(c.amount + (Number(o.total) || 0));
  });
  const collected = round2(paid.reduce((sum, o) => sum + (Number(o.total) || 0), 0));

  const credit = unpaid.filter((o) => CREDIT_TYPES.includes(o.paymentType));
  const owed = (list) => round2(list.reduce((sum, o) => sum + (Number(o.total) || 0), 0));

  // Discounts by type (Coupon / Loyalty Free / Fleet Discount).
  const discounts = {};
  inRange.forEach((o) => {
    if (!o.discount) return;
    const d = (discounts[o.discount] ||= { count: 0, amount: 0 });
    d.count += 1;
    d.amount = round2(d.amount + discountAmount(o));
  });

  // Work done: each main service, plus each other service, across all orders of the day.
  const services = new Map();
  const bump = (name) => services.set(name, (services.get(name) || 0) + 1);
  inRange.forEach((o) => {
    (o.services || []).forEach(bump);
    (o.extras || []).forEach((x) => bump(`${OTHER_SERVICES_TITLE}: ${x}`));
  });

  // Where orders came from (customer kiosk vs staff at the counter).
  const sources = { kiosk: { count: 0, amount: 0 }, counter: { count: 0, amount: 0 } };
  inRange.forEach((o) => {
    const s = sources[o.source === 'kiosk' ? 'kiosk' : 'counter'];
    s.count += 1;
    if (o.status === 'paid') s.amount = round2(s.amount + (Number(o.total) || 0));
  });

  return {
    from,
    to,
    orders: inRange,
    paidCount: paid.length,
    unpaid,
    collected,
    byChannel,
    stillToCollect: { count: unpaid.length, amount: owed(unpaid) },
    credit: { count: credit.length, amount: owed(credit) },
    discounts: Object.entries(discounts).map(([type, v]) => ({ type, ...v })),
    discountTotal: round2(Object.values(discounts).reduce((sum, d) => sum + d.amount, 0)),
    services: [...services.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    sources,
  };
}

/**
 * "Payment Mode" column of the client's daily report: Cash / Card / Online for
 * paid orders; unpaid ones say so (with the credit type when there is one).
 */
export function paymentModeOf(order) {
  if (order.status !== 'paid') {
    return CREDIT_TYPES.includes(order.paymentType) ? `Unpaid (${order.paymentType})` : 'Unpaid';
  }
  return { cash: 'Cash', card: 'Card', online: 'Online', unspecified: 'Paid' }[channelOf(order)];
}

/**
 * The totals block of the client's handwritten "Daily Report", in his order.
 * Cheque, refunds and cancellations aren't recorded in the system, so they
 * are always 0 — kept so the report matches the format he uses.
 */
export function summaryLines(report) {
  return [
    { label: 'Total Cash', amount: report.byChannel.cash.amount },
    { label: 'Total Card', amount: report.byChannel.card.amount },
    { label: 'Total Cheque', amount: 0 },
    { label: 'Total Online Payment', amount: report.byChannel.online.amount },
    ...(report.byChannel.unspecified.count
      ? [{ label: 'Paid, method not recorded', amount: report.byChannel.unspecified.amount }]
      : []),
    { label: 'Total Refund', amount: 0 },
    { label: 'Total Cancelled', amount: 0 },
    { label: 'Total Net Amount', amount: report.collected, strong: true },
  ];
}

/**
 * CSV in the client's own "Daily Report" layout: a title, one numbered row per
 * order (Name, Phone, Plate, Vehicle, Services, Discount, Amount, Payment
 * Mode), then the totals block. Opens straight in Excel (BOM + quoted cells).
 */
export function dayReportCsv(report) {
  const rows = [
    ['Magic Track — Daily Report'],
    ['Date', rangeLabel(report.from, report.to)],
    [],
    ['#', 'Order No', 'Name', 'Phone', 'Plate', 'Vehicle', 'Services', 'Discount', 'Amount', 'Payment Mode'],
    ...report.orders.map((o, i) => [
      i + 1,
      `#${o.id}`,
      o.customer?.name || '',
      o.customer?.phone || '',
      o.numberPlate || '',
      o.vehicle || '',
      [(o.services || []).join(' + '), (o.extras || []).join(', ')].filter(Boolean).join(' + '),
      o.discount || '',
      round2(o.total),
      paymentModeOf(o),
    ]),
    [],
    ...summaryLines(report).map((l) => ['', '', '', '', '', '', l.label, '', l.amount]),
    [],
    ['', '', '', '', '', '', 'Still to collect (unpaid)', `${report.stillToCollect.count} orders`, report.stillToCollect.amount],
    ['', '', '', '', '', '', 'Discounts given', '', report.discountTotal],
  ];

  return '﻿' + rows
    .map((row) => row.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\r\n');
}

/** Short text for WhatsApp. */
export function dayReportText(report) {
  const q = (n) => `QAR ${Number(n || 0).toLocaleString('en-US')}`;
  const lines = [
    `*Magic Track — Daily Report*`,
    rangeLabel(report.from, report.to),
    '',
    ...summaryLines(report)
      .filter((l) => l.amount || l.strong || ['Total Cash', 'Total Card', 'Total Online Payment'].includes(l.label))
      .map((l) => (l.strong ? `*${l.label}: ${q(l.amount)}*` : `• ${l.label}: ${q(l.amount)}`)),
    '',
    `⏳ Still to collect: ${q(report.stillToCollect.amount)} (${report.stillToCollect.count} orders)`,
    `🏷 Discounts given: ${q(report.discountTotal)}`,
    `🚗 Orders: ${report.orders.length} (${report.paidCount} paid, ${report.unpaid.length} unpaid)`,
  ];
  return lines.filter((l) => l !== null).join('\n');
}
