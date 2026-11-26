// Day Close report: what came in on a day (or a range of days), built from the
// car wash orders already loaded by the dashboard.
//
// Rules agreed with the client (26 Oct 2026):
//   - A day's money = orders dated that day AND marked Paid.
//   - Cash / Card come from Payment Method; Payment Type "Fawran" counts as
//     Online (bank transfer), whatever the method says.
//   - Paylater and Partner Credit are credit: not collected until marked Paid,
//     shown under "Still to collect" with every other unpaid order.
//
// Customer wallet (Nov 2026): a top-up is money in on the day it is paid, in
// its own channel (Cash / Card / Fawran = Online). An order paid from the
// wallet is a sale but not new money, so it is shown on its own and left out
// of the money collected. A wallet refund is money out (Total Refund).

import { OTHER_SERVICES_TITLE } from './priceList';

export const CHANNELS = [
  { key: 'cash', label: 'Cash' },
  { key: 'card', label: 'Card' },
  { key: 'online', label: 'Online (Fawran)' },
  { key: 'unspecified', label: 'Method not recorded' },
  { key: 'wallet', label: 'Paid from wallet' },
];

/** Wallet top-up / refund payment method → channel. */
const WALLET_CHANNEL = { Cash: 'cash', Card: 'card', Fawran: 'online' };

const CREDIT_TYPES = ['Paylater', 'Partner Credit'];

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/** Where the money of a paid order went. */
export const channelOf = (order) => {
  if (order.paymentMethod === 'Wallet') return 'wallet';
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

/**
 * Wallet top-ups, bonus credit and refunds made from..to (local days), from
 * GET /wallet/transactions.
 */
export function walletDay(transactions, from, to) {
  const blank = () => ({ cash: 0, card: 0, online: 0, total: 0, count: 0 });
  const out = { topups: blank(), refunds: blank(), bonus: 0, bonusCount: 0 };
  (transactions || []).forEach((t) => {
    const day = isoDate(new Date(t.created_at));
    if (day < from || day > to) return;
    if (t.type === 'bonus') {
      out.bonus = round2(out.bonus + Number(t.amount));
      out.bonusCount += 1;
      return;
    }
    const bucket = t.type === 'topup' ? out.topups : t.type === 'refund' ? out.refunds : null;
    if (!bucket) return; // order payments come from the orders themselves
    const amount = Math.abs(Number(t.amount) || 0);
    const ch = WALLET_CHANNEL[t.payment_method] || 'cash';
    bucket[ch] = round2(bucket[ch] + amount);
    bucket.total = round2(bucket.total + amount);
    bucket.count += 1;
  });
  return out;
}

/** Everything the Day Close page, the Excel file and the WhatsApp summary show. */
export function buildDayReport(orders, from, to, walletTransactions = []) {
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
  // Money in: paid orders (not the wallet-paid ones) + wallet top-ups − wallet refunds
  const wallet = walletDay(walletTransactions, from, to);
  const ordersMoney = round2(paid.filter((o) => channelOf(o) !== 'wallet').reduce((sum, o) => sum + (Number(o.total) || 0), 0));
  const collected = round2(ordersMoney + wallet.topups.total - wallet.refunds.total);

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
    wallet,
    // Each channel's money: its orders plus the wallet top-ups paid that way
    moneyIn: {
      cash: round2(byChannel.cash.amount + wallet.topups.cash),
      card: round2(byChannel.card.amount + wallet.topups.card),
      online: round2(byChannel.online.amount + wallet.topups.online),
    },
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
  return { cash: 'Cash', card: 'Card', online: 'Online', unspecified: 'Paid', wallet: 'Wallet' }[channelOf(order)];
}

/**
 * The totals block of the client's handwritten "Daily Report", in his order.
 * Cheque, refunds and cancellations aren't recorded in the system, so they
 * are always 0 — kept so the report matches the format he uses.
 */
export function summaryLines(report) {
  return [
    { label: 'Total Cash', amount: report.moneyIn.cash },
    { label: 'Total Card', amount: report.moneyIn.card },
    { label: 'Total Cheque', amount: 0 },
    { label: 'Total Online Payment', amount: report.moneyIn.online },
    ...(report.byChannel.unspecified.count
      ? [{ label: 'Paid, method not recorded', amount: report.byChannel.unspecified.amount }]
      : []),
    ...(report.wallet.topups.count
      ? [{ label: 'of which wallet top-ups', amount: report.wallet.topups.total, note: true }]
      : []),
    ...(report.byChannel.wallet.count
      ? [{ label: 'Orders paid from wallet (not new money)', amount: report.byChannel.wallet.amount, note: true }]
      : []),
    ...(report.wallet.bonus
      ? [{ label: 'Wallet bonus credit given', amount: report.wallet.bonus, note: true }]
      : []),
    { label: 'Total Refund', amount: report.wallet.refunds.total },
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
