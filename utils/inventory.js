// Labels and number formats for the Inventory page.

export const KIND_LABEL = { supply: 'Wash supply', product: 'For sale' };

/** The item categories the client gave (Jira, 12 Nov 2026). */
export const CATEGORIES = [
  'Window Tints',
  'Polishing',
  'Detailing',
  'Car Wash',
  'Dashboards',
  'Seat Cover',
  'Roof Modification',
  'Floor Modification',
];

export const KIND_PILL = {
  supply: 'bg-sky-100 text-sky-700',
  product: 'bg-violet-100 text-violet-700',
};

/** What each stock change is called on screen. */
export const MOVE_LABEL = { in: 'Stock in', use: 'Used', sell: 'Sold', adjust: 'Count fix' };

export const MOVE_PILL = {
  in: 'bg-green-100 text-green-700',
  use: 'bg-amber-100 text-amber-800',
  sell: 'bg-violet-100 text-violet-700',
  adjust: 'bg-gray-100 text-gray-700',
};

/** Suggestions for the unit box (any word can be typed). */
export const UNITS = ['piece', 'bottle', 'litre', 'gallon', 'can', 'box', 'pack', 'roll', 'kg', 'pair'];

/** 12 → "12", 2.5 → "2.5" */
export const qty = (n) => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });

/** QAR 1,234.5 (no decimals when whole). */
export const qar = (n) =>
  `QAR ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

// ---- Excel (CSV) ----

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
/** Rows → CSV text Excel opens with Arabic intact (BOM + CRLF). */
const toCsv = (rows) => '﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n');

/** Saves `text` as a .csv file. */
export function downloadCsv(text, fileName) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function stockCsv(items, dateText) {
  return toCsv([
    ['Magic Track — Stock list'],
    ['Date', dateText],
    [],
    ['Stock No.', 'Item', 'Type', 'Category', 'In stock', 'Unit', 'Low-stock alert at', 'Status', 'Cost / unit (QAR)', 'Stock value (QAR)', 'Sell price (QAR)', 'Supplier', 'Supplier phone'],
    ...items.map((i) => [
      i.code || '',
      i.name,
      KIND_LABEL[i.kind],
      i.category || '',
      i.quantity,
      i.unit,
      i.min_quantity,
      i.quantity <= 0 ? 'Out' : i.low_stock ? 'Low' : 'OK',
      i.cost_price ?? '',
      i.stock_value ?? '',
      i.sell_price ?? '',
      i.supplier || '',
      i.supplier_phone ? `+${i.supplier_phone}` : '',
    ]),
    [],
    ['', 'Total stock value', '', '', '', '', '', '', '', items.reduce((s, i) => s + (i.stock_value || 0), 0)],
  ]);
}

export function historyCsv(rows, filterText) {
  return toCsv([
    ['Magic Track — Stock history'],
    ...(filterText ? [['Filter', filterText]] : []),
    [],
    ['Date', 'Time', 'Item', 'Change', 'Qty', 'Unit', 'Stock after', 'Price / unit (QAR)', 'Total (QAR)', 'Note', 'By'],
    ...rows.map((m) => {
      const d = new Date(m.created_at);
      return [
        d.toLocaleDateString('en-GB'),
        d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        m.item_name + (m.item_deleted ? ' (deleted)' : ''),
        MOVE_LABEL[m.type],
        m.change,
        m.item_unit,
        m.balance,
        m.unit_price ?? '',
        m.unit_price != null ? Math.round(Math.abs(m.change) * m.unit_price * 100) / 100 : '',
        m.note || '',
        m.created_by || '',
      ];
    }),
  ]);
}

export function consumptionCsv(data, rangeText) {
  const items = data?.items || [];
  return toCsv([
    ['Magic Track — Stock consumption'],
    ['Period', rangeText],
    [],
    ['Stock No.', 'Item', 'Category', 'Unit', 'Used', 'Sold', 'Value used (QAR)', 'Sales (QAR)'],
    ...items.map((i) => [i.code || '', i.name + (i.item_deleted ? ' (deleted)' : ''), i.category || '', i.unit, i.used, i.sold, i.used_value, i.sold_value]),
    [],
    ['', 'Total', '', '', '', '', data?.used_value ?? 0, data?.sold_value ?? 0],
  ]);
}

export function machineryCsv(machines) {
  return toCsv([
    ['Magic Track — Machinery'],
    [],
    ['Item', 'Date of purchase', 'Amount (QAR)', 'Supplier', 'Notes'],
    ...machines.map((m) => [m.name, m.purchase_date, m.amount, m.supplier || '', m.notes || '']),
    [],
    ['Total', '', machines.reduce((s, m) => s + (m.amount || 0), 0)],
  ]);
}

// ---- reorder list ----

/** A sensible amount to order: back up to twice the alert level (at least 1). */
export const suggestedOrder = (i) => Math.max(1, Math.ceil(Math.max(i.min_quantity * 2, 1) - i.quantity));

/** Low items grouped by supplier ("" = no supplier saved), suppliers A–Z, no-supplier last. */
export function reorderGroups(items) {
  const groups = new Map();
  for (const i of items.filter((x) => x.low_stock)) {
    const key = (i.supplier || '').trim();
    if (!groups.has(key)) groups.set(key, { supplier: key, phone: i.supplier_phone || '', items: [] });
    const g = groups.get(key);
    if (!g.phone && i.supplier_phone) g.phone = i.supplier_phone;
    g.items.push(i);
  }
  return [...groups.values()].sort((a, b) => (!a.supplier) - (!b.supplier) || a.supplier.localeCompare(b.supplier));
}

/** The order message for one supplier. `amounts` = { itemId: quantity text }. */
export function reorderText(group, amounts) {
  const lines = group.items.map((i) => {
    const amount = String(amounts[i.id] ?? suggestedOrder(i)).trim() || String(suggestedOrder(i));
    return `• ${i.name}${i.code ? ` (${i.code})` : ''}: ${amount} ${i.unit}`;
  });
  return [
    group.supplier ? `Hello ${group.supplier},` : 'Hello,',
    '',
    'Magic Track Car Wash would like to order:',
    ...lines,
    '',
    'Please confirm the price and delivery time. Thank you!',
  ].join('\n');
}

/** A typed amount as a number, or null when blank / not a number with up to 2 decimals. */
export const readAmount = (text) => {
  const t = String(text ?? '').trim();
  return /^\d+(\.\d{1,2})?$/.test(t) ? Number(t) : null;
};
