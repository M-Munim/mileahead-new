// Labels for the Expenses page (running costs: bills, rent, salaries).

export const EXPENSE_TYPES = ['utility', 'shop_rent', 'room_rent', 'salary', 'other'];

export const EXPENSE_LABEL = {
  utility: 'Utility bill',
  shop_rent: 'Wash center rent',
  room_rent: "Workers' room rent",
  salary: 'Worker salary',
  other: 'Other',
};

export const EXPENSE_PILL = {
  utility: 'bg-sky-100 text-sky-700',
  shop_rent: 'bg-amber-100 text-amber-800',
  room_rent: 'bg-orange-100 text-orange-800',
  salary: 'bg-violet-100 text-violet-700',
  other: 'bg-gray-100 text-gray-700',
};

/** What the "paid to" box is called, and an example, for each type. */
export const PAID_TO = {
  utility: ['Company', 'e.g. Kahramaa, Ooredoo'],
  shop_rent: ['Landlord', 'e.g. landlord or company name'],
  room_rent: ['Landlord', 'e.g. landlord name'],
  salary: ['Worker name', 'e.g. Ramesh'],
  other: ['Paid to', 'Optional'],
};

export const NOTE_EXAMPLE = {
  utility: 'e.g. Electricity & water, October',
  shop_rent: 'e.g. November rent',
  room_rent: 'e.g. November rent',
  salary: 'e.g. October salary',
  other: 'What was it for?',
};

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

/** Expenses → CSV text Excel opens with Arabic intact (BOM + CRLF). */
export function expensesCsv(rows, periodText) {
  const total = rows.reduce((s, e) => s + (e.amount || 0), 0);
  return '﻿' + [
    ['Magic Track — Expenses'],
    ['Period', periodText],
    [],
    ['Date', 'Type', 'Paid to', 'Note', 'Amount (QAR)', 'Bill saved', 'Added by'],
    ...rows.map((e) => [e.expense_date, EXPENSE_LABEL[e.type], e.paid_to || '', e.note || '', e.amount, e.has_bill ? 'Yes' : 'No', e.created_by || '']),
    [],
    ['', '', '', 'Total', Math.round(total * 100) / 100],
  ].map((r) => r.map(csvCell).join(',')).join('\r\n');
}

/** Bill files the server accepts. */
export const BILL_ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp';
export const BILL_MAX_BYTES = 10 * 1024 * 1024;
