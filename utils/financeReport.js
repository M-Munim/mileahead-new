// Builds daily / weekly / monthly financial reports from the bookings list.
// All grouping uses the browser's local time (Qatar), not UTC, so a booking
// made at 1 AM lands on the right day.

export const REPORT_TYPES = {
    daily: { label: 'Daily', periods: 30, current: 'Today', previous: 'yesterday' },
    weekly: { label: 'Weekly', periods: 12, current: 'This Week', previous: 'last week' },
    monthly: { label: 'Monthly', periods: 12, current: 'This Month', previous: 'last month' },
};

const pad = (n) => String(n).padStart(2, '0');

export function getBookingDate(b) {
    const raw = b.created_at || b.createdAt || b.date_time || b.date || b.updated_at;
    if (!raw) return null;
    const dt = new Date(raw);
    return Number.isNaN(dt.getTime()) ? null : dt;
}

export function getBookingPrice(b) {
    return parseFloat(b.price || b.amount || b.total_price || b.total || 0) || 0;
}

export function getBookingService(b) {
    const s = String(b.Service || b.service || '').toLowerCase();
    return s.includes('wash') ? 'carwash' : 'rides';
}

export function getBookingStatus(b) {
    const s = String(b.status ?? '').toLowerCase();
    if (s.includes('complete')) return 'completed';
    if (s.includes('cancel') || s.includes('reject')) return 'cancelled';
    return 'open';
}

/** Start of the day / week (Monday) / month containing `date`. */
export function periodStart(date, type) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    if (type === 'weekly') {
        const day = d.getDay() || 7; // Sunday -> 7
        d.setDate(d.getDate() - day + 1);
    } else if (type === 'monthly') {
        d.setDate(1);
    }
    return d;
}

function shiftPeriod(date, type, n) {
    const d = new Date(date);
    if (type === 'daily') d.setDate(d.getDate() + n);
    else if (type === 'weekly') d.setDate(d.getDate() + 7 * n);
    else d.setMonth(d.getMonth() + n);
    return d;
}

export function periodKey(start) {
    return `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
}

export function periodLabel(start, type) {
    if (type === 'monthly') {
        return start.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    }
    if (type === 'weekly') {
        const end = shiftPeriod(start, 'daily', 6);
        const fmt = (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        return `${fmt(start)} – ${fmt(end)} ${end.getFullYear()}`;
    }
    return start.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

const emptyTotals = () => ({
    orders: 0,
    completed: 0,
    cancelled: 0,
    open: 0,
    revenue: 0,
    carWashRevenue: 0,
    ridesRevenue: 0,
    pendingValue: 0,
});

function addBooking(totals, b) {
    const status = getBookingStatus(b);
    const price = getBookingPrice(b);
    totals.orders += 1;
    totals[status] += 1;
    if (status === 'completed') {
        totals.revenue += price;
        if (getBookingService(b) === 'carwash') totals.carWashRevenue += price;
        else totals.ridesRevenue += price;
    } else if (status === 'open') {
        totals.pendingValue += price;
    }
}

/**
 * Returns one row per period, newest first, including empty periods so the
 * report has no gaps. Revenue counts completed bookings only; open bookings are
 * shown separately as "pending value"; cancelled bookings earn nothing.
 */
export function buildReport(bookings, type, now = new Date()) {
    const count = REPORT_TYPES[type].periods;
    const current = periodStart(now, type);
    const rows = [];
    const byKey = {};

    for (let i = 0; i < count; i += 1) {
        const start = shiftPeriod(current, type, -i);
        const row = { key: periodKey(start), start, label: periodLabel(start, type), bookings: [], ...emptyTotals() };
        rows.push(row);
        byKey[row.key] = row;
    }

    bookings.forEach((b) => {
        const date = getBookingDate(b);
        if (!date) return;
        const row = byKey[periodKey(periodStart(date, type))];
        if (!row) return;
        addBooking(row, b);
        row.bookings.push(b);
    });

    rows.forEach((row) => {
        row.avgOrderValue = row.completed > 0 ? row.revenue / row.completed : 0;
        row.bookings.sort((a, b) => (getBookingDate(b) || 0) - (getBookingDate(a) || 0));
    });

    const totals = emptyTotals();
    rows.forEach((row) => {
        Object.keys(totals).forEach((k) => { totals[k] += row[k]; });
    });
    totals.avgOrderValue = totals.completed > 0 ? totals.revenue / totals.completed : 0;

    return { rows, totals };
}

export const formatQAR = (value) =>
    `${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} QAR`;
