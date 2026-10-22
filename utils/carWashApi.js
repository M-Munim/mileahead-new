// Magic Track ↔ backend (api-magic.milesahead.services) for car wash orders,
// appointments and kiosk orders. Everything goes through the booking endpoints
// of the Postman collection (MagicTrack.postman_collection1.json):
//
//   POST /api/v1/booking/booking                 create (multipart, no login needed)
//   POST /api/v1/booking/all-bookings            list   (filter by Service)
//   POST /api/v1/booking/update-status           { bookingId, newStatus }
//   PUT  /api/v1/booking/update-booking/:id      edit fields (multipart)
//   PUT  /api/v1/booking/delete-booking/:id      delete (not in the collection — verified on the live API)
//
// Verified on the live backend (13 Oct 2026): the booking endpoint writes every
// field it receives straight into the bookings table, so an UNKNOWN field makes
// the whole save fail ("Unknown column …"). Only send columns that exist.
//
// How Magic Track data maps onto the existing booking columns:
//   status           wash stage: 'waiting' | 'washing' | 'ready' | 'collected'
//                    (appointments: 'scheduled' | 'cancelled'). Orders before 15 Oct 2026
//                    have 'paid' / 'unpaid' here instead; they read as 'collected'.
//   Service          'car wash'  (appointments: 'appointment')
//   service_type     where the order came from: 'walk-in' (dashboard) | 'kiosk' | 'appointment'
//   package / sub_Service   main service(s), comma separated, e.g. "Body Wash – In & Out, Nano Ceramic Tint"
//                    (appointments: Detailing / Polishing / Graphene)
//   package_price    price of the main service(s) for the vehicle
//   car_name         vehicle type      car_number   number plate
//   add_ons          other services, comma separated      add_ons_price  their total
//   payment_method   Cash / Card
//   payment_type     payment type (Fawran / Paylater / Partner Credit); also written to
//                    payment_channel, where orders before 15 Oct 2026 have it
//   payment_status   'paid' | 'unpaid' (older orders: taken from status when this is empty)
//   discount         Coupon / Loyalty Free / Fleet Discount
//   coupon_serial    coupon serial number      fleet_discount   amount taken off for a fleet discount
//   subtotal         price before the discount
//   price            final total (after the discount)
//   special_instructions   notes
//
// discount … payment_status were added by the backend developer on 15 Oct 2026.
// Their column types are not documented, so if the server rejects them the
// order is saved again without them rather than lost (see createCarWashOrder).

import { bookingService } from './axiosInstance';
import { BASE_URL } from './apiPaths';
import { extractArray } from './extractArray';
import { servicesPrice, findExtra, joinServices, splitServices, tokensFor } from './priceList';


export const CAR_WASH_SERVICE = 'car wash';
export const APPOINTMENT_SERVICE = 'appointment';
export const ORDER_SOURCE = { DASHBOARD: 'walk-in', KIOSK: 'kiosk', APPOINTMENT: 'appointment' };

/** Where the car is. Shown on the queue screen (/queue) and changed from the dashboard. */
export const STAGES = ['waiting', 'washing', 'ready', 'collected'];

// Multipart, not JSON. ('Content-Type': undefined would NOT override the instance's
// JSON default in axios 1.x — axios would turn the FormData into JSON.) In the
// browser axios then drops this header so the browser adds the boundary itself.
const MULTIPART = { headers: { 'Content-Type': 'multipart/form-data' } };
const PAGE_SIZE = 100;
const MAX_PAGES = 20;

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const splitList = (value) =>
  String(value || '').split(',').map((s) => s.trim()).filter(Boolean);

/** "13 Oct 2026, 10:00 AM" from the booking's date / time. */
function formatSlot(date, time, dateTime) {
  const [d, t] = dateTime ? String(dateTime).split(' ') : [date, time];
  const [y, m, day] = String(d || '').split('-').map(Number);
  const [h, min] = String(t || '').split(':').map(Number);
  if (!y || !m || !day) return dateTime || date || '—';
  const when = new Date(y, m - 1, day, Number.isNaN(h) ? 0 : h, Number.isNaN(min) ? 0 : min);
  const datePart = when.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  if (Number.isNaN(h)) return datePart;
  return `${datePart}, ${when.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}

/** "13 Oct · 2:32 PM" from created_at (ISO, UTC). */
function formatCreated(iso) {
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return '—';
  return `${when.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · ${when.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}

/**
 * Token numbers shown to the customer and on the queue screen: one per kind of
 * work, from the booking number (W172 · T172 · P172). See tokensFor in priceList.
 */
const bookingNumber = (booking) => booking.booking_number || booking.id;

/**
 * The backend's package and add_ons columns hold only 50 characters (checked
 * 21 Oct 2026), so a long list doesn't fit. The full service list goes in
 * sub_Service (the backend stores it as a list, no such limit); package and
 * add_ons get a label that fits, and a shortened add_ons list is also written
 * out in full in the notes.
 */
const SHORT_COLUMN = 50;
const EXTRAS_NOTE = 'Other services: ';
const extrasFromNotes = (notes) => {
  const part = String(notes || '').split(' · ').find((p) => p.startsWith(EXTRAS_NOTE));
  return part ? splitList(part.slice(EXTRAS_NOTE.length)) : null;
};
function fitLabel(list) {
  const full = list.join(', ');
  if (full.length <= SHORT_COLUMN) return full;
  const label = `${list[0]} +${list.length - 1} more`;
  return label.length <= SHORT_COLUMN ? label : `${list.length} items`;
}
const isShortLabel = (text) => / \+\d+ more$|^\d+ items$/.test(text);

/** Main services of a booking: the list in sub_Service, else package. */
function bookingServices(b) {
  let list = b.sub_Service;
  if (typeof list === 'string' && list.trim().startsWith('[')) {
    try { list = JSON.parse(list); } catch { /* plain text */ }
  }
  if (Array.isArray(list)) return list.map((x) => String(x).trim()).filter(Boolean);
  return splitServices(list || b.package);
}

/** Backend booking → dashboard order. */
export function mapBookingToOrder(b) {
  const isKiosk = b.service_type === ORDER_SOURCE.KIOSK;
  const rawStatus = String(b.status || '').toLowerCase();
  const paymentStatus = String(b.payment_status || '').toLowerCase();
  const paidFrom = paymentStatus || rawStatus;
  const subtotal = b.subtotal != null
    ? num(b.subtotal)
    : num(b.package_price) + num(b.add_ons_price) + num(b.vehicle_price);
  const services = bookingServices(b);
  // A shortened add_ons label ("Seat Cover +3 more") → the full list from the notes.
  const extras = isShortLabel(b.add_ons || '')
    ? extrasFromNotes(b.special_instructions) || splitList(b.add_ons)
    : splitList(b.add_ons);
  // Tokens issued by the server (W101 · T101, own counter per letter, daily);
  // older orders without them get letter + order number.
  const serverTokens = Array.isArray(b.tokens) ? b.tokens : String(b.tokens || '').split(',').map((t) => t.trim()).filter(Boolean);
  const tokens = serverTokens.length ? serverTokens : tokensFor(bookingNumber(b), services, extras);
  return {
    id: String(b.booking_number || b.id),
    originalId: b.id,
    source: isKiosk ? 'kiosk' : 'dashboard',
    tokens,
    queue: tokens.join(' · '), // for text: toasts, messages, search
    customer: { name: b.passenger_name || 'Walk-in customer', phone: b.contact_number || '' },
    services,
    service: joinServices(services), // for display and search
    vehicle: b.car_name || '',
    extras,
    numberPlate: b.car_number || '',
    discount: b.discount || '',
    couponSerial: b.coupon_serial || '',
    paymentMethod: b.payment_method || '',
    paymentType: b.payment_type || b.payment_channel || '',
    status: paidFrom === 'paid' ? 'paid' : 'unpaid',
    hasPaymentStatus: paymentStatus !== '',
    stage: STAGES.includes(rawStatus) ? rawStatus : 'collected',
    time: formatSlot(b.date, b.time, b.date_time),
    bookedAt: formatCreated(b.created_at),
    date: b.date || '',            // YYYY-MM-DD, used for customer visit history
    createdAt: b.created_at || '',
    subtotal,
    total: num(b.price),
    cleaner: null,
    notes: b.special_instructions || '',
    deleteRequest: Number(b.delete_requested) === 1
      ? { reason: b.delete_reason || '', by: b.delete_requested_by || '', at: b.delete_requested_at || '' }
      : null,
  };
}

/** Backend booking → appointment row. */
export function mapBookingToAppointment(b) {
  return {
    id: String(b.booking_number || b.id),
    originalId: b.id,
    type: b.package || b.sub_Service || 'Appointment',
    customer: { name: b.passenger_name || '—', phone: b.contact_number || '' },
    date: b.date || '',
    time: String(b.time || '').slice(0, 5),
    notes: b.special_instructions || '',
    status: String(b.status || '').toLowerCase(),
  };
}

/** Every booking for one Service, all pages, newest first. */
async function fetchAllBookings(Service) {
  const all = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const res = await bookingService.getAllBookings({
      status: 'all',
      Service, // backend filter key is case-sensitive
      field: '',
      search: '',
      sorting: { field: 'id', order: 'desc' },
      page,
      limit: PAGE_SIZE,
    });
    const rows = extractArray(res);
    all.push(...rows);
    const totalPages = num(res.data?.data?.total_pages) || 1;
    if (page >= totalPages || rows.length < PAGE_SIZE) break;
  }
  return all;
}

function toFormData(fields) {
  const fd = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    fd.append(key, String(value));
  });
  return fd;
}

const bookingFromResponse = (res) => res.data?.booking || res.data?.data || null;

// ─────────────────────────────────────────────────────────────
// Orders
// ─────────────────────────────────────────────────────────────
export async function fetchCarWashOrders() {
  return (await fetchAllBookings(CAR_WASH_SERVICE)).map(mapBookingToOrder);
}

/**
 * Creates a car wash order. `values` is what NewOrderModal / the kiosk collect:
 * customerName, phone, services[], vehicle, extras[], numberPlate, date, time,
 * discount, couponSerial, paymentMethod, paymentType, paymentStatus, subtotal,
 * total, notes.
 */
export async function createCarWashOrder(values, source = ORDER_SOURCE.DASHBOARD) {
  const extrasTotal = (values.extras || []).reduce((sum, name) => sum + (findExtra(name)?.price ?? 0), 0);
  // values.services = list of main services (older callers pass one values.service).
  const services = values.services ?? (values.service ? [values.service] : []);
  const mainService = joinServices(services) || undefined;
  const extras = values.extras || [];
  const extrasLabel = fitLabel(extras);
  const notes = [values.notes, extrasLabel !== extras.join(', ') ? `${EXTRAS_NOTE}${extras.join(', ')}` : '']
    .filter(Boolean).join(' · ');
  const mainPrice = services.length ? servicesPrice(services, values.vehicle) : undefined;
  const status = values.paymentStatus === 'paid' ? 'paid' : 'unpaid';
  const fields = {
    status: 'waiting',
    Service: CAR_WASH_SERVICE,
    service_type: source,
    passenger_name: values.customerName,
    contact_number: values.phone,
    package: services.length ? fitLabel(services) : undefined,
    sub_Service: mainService,
    package_price: mainPrice,
    car_name: values.vehicle,
    car_number: values.numberPlate,
    add_ons: extrasLabel,
    add_ons_price: values.extras?.length ? extrasTotal : undefined,
    date: values.date,
    time: values.time,
    date_time: values.date && values.time ? `${values.date} ${values.time}` : undefined,
    price: values.total,
    payment_method: values.paymentMethod,
    payment_channel: values.paymentType,
    special_instructions: notes,
  };
  const newFields = {
    payment_type: values.paymentType,
    payment_status: status,
    discount: values.discount,
    coupon_serial: values.discount === 'Coupon' ? values.couponSerial : undefined,
    fleet_discount: values.discount === 'Fleet Discount' && num(values.subtotal) > num(values.total)
      ? Math.round((num(values.subtotal) - num(values.total)) * 100) / 100
      : undefined,
    subtotal: values.subtotal || undefined,
  };

  let res;
  try {
    res = await createBooking({ ...fields, ...newFields });
  } catch (error) {
    // A SQL error means nothing was inserted, so it is safe to send the order
    // again with only the long-standing columns. (Never retry other failures,
    // e.g. a timeout: the first request may already have saved the order.)
    if (!isRejectedField(error)) throw error;
    console.warn('Booking rejected the new discount/payment fields, saving without them:', error.message);
    // Without payment_status, Paid / Unpaid has to go in status (as before 15 Oct 2026).
    res = await createBooking({ ...fields, status });
  }
  const booking = bookingFromResponse(res);
  if (!booking) return null;
  // Tokens from what was ordered, in case the reply leaves the services out.
  const order = mapBookingToOrder(booking);
  const tokens = order.tokens?.length && !order.tokens[0].startsWith('A') ? order.tokens : tokensFor(order.id, services, extras);
  return { ...order, tokens, queue: tokens.join(' · ') };
}

async function createBooking(fields) {
  const res = await bookingService.createBooking(toFormData(fields), MULTIPART);
  if (res.data?.success === false) {
    throw { status: res.status, message: res.data?.message || 'The server did not save the order.' };
  }
  return res;
}

/** MySQL errors about a column or a value that does not fit it. */
const isRejectedField = (error) =>
  /unknown column|incorrect .* value|data truncated|out of range|too long for column/i.test(error?.message || '');

/** Paid / Unpaid (payment_status). */
export const setOrderPaymentStatus = (order, status) =>
  bookingService.updateBooking(order.originalId, toFormData({ payment_status: status }), MULTIPART);

/** Waiting → Washing → Ready → Collected (status). */
export async function setOrderStage(order, stage) {
  // Older orders keep Paid / Unpaid in status. Copy it to payment_status first so
  // it is not lost when status starts holding the stage.
  if (!order.hasPaymentStatus) await setOrderPaymentStatus(order, order.status);
  return bookingService.updateStatus({ bookingId: order.originalId, newStatus: stage });
}

/** Today's cars that are not collected yet, for the queue screen. Oldest first. */
export async function fetchQueue() {
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const fromAllBookings = async () => (await fetchCarWashOrders())
    .filter((o) => o.stage !== 'collected' && o.date === today)
    .sort((a, b) => a.originalId - b.originalId);

  // Logged in: the full list has the services, so the screen shows W / T / P tokens.
  const loggedIn = typeof window !== 'undefined' && !!window.localStorage?.getItem('token');
  if (loggedIn) {
    try {
      return await fromAllBookings();
    } catch (error) {
      console.warn('all bookings failed, using the public queue instead:', error?.message);
    }
  }

  // Public route (no login needed on the display): booking_number, status and
  // the last 3 digits of car_number only, so tokens are shown as plain numbers.
  try {
    // Plain fetch, no token: an old or expired token on the display must not block a public route.
    const res = await fetch(`${BASE_URL}/api/v1/booking/queue-today`, { cache: 'no-store' });
    const body = res.ok ? await res.json() : null;
    if (body?.success && Array.isArray(body.data)) {
      return body.data
        .map((b) => {
          const status = String(b.status || '').toLowerCase();
          return {
            id: String(b.booking_number),
            originalId: Number(b.booking_number) || 0,
            tokens: Array.isArray(b.tokens) && b.tokens.length ? b.tokens : [String(b.booking_number)],
            queue: String(b.booking_number),
            stage: STAGES.includes(status) ? status : 'collected',
            numberPlate: b.car_number || '',
          };
        })
        .filter((o) => o.stage !== 'collected')
        .sort((a, b) => a.originalId - b.originalId);
    }
  } catch (error) {
    console.warn('queue-today failed, reading all bookings instead:', error?.message);
  }
  return fromAllBookings();
}

/** Payment method (Cash / Card) or payment type (Fawran…) changed from the table. */
const FIELD_COLUMNS = {
  paymentMethod: ['payment_method'],
  paymentType: ['payment_type', 'payment_channel'],
};
export const updateOrderField = (order, field, value) => {
  const fd = new FormData();
  // Sent even when empty, so choosing "—" clears the value.
  FIELD_COLUMNS[field].forEach((column) => fd.append(column, value ?? ''));
  return bookingService.updateBooking(order.originalId, fd, MULTIPART);
};

export const deleteOrder = (order) => bookingService.deleteBooking(order.originalId);

// ── Delete requests (Admins can't delete; the Super Admin approves) ──
// Columns delete_requested, delete_reason, delete_requested_by, delete_requested_at
// are requested from the backend developer (BACKEND_REQUESTS.md, section 9).
const nowSql = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

async function saveDeleteFields(order, fields) {
  try {
    return await bookingService.updateBooking(order.originalId, toFormData(fields), MULTIPART);
  } catch (error) {
    if (isRejectedField(error)) throw new Error('Delete requests need a server update from the backend developer first.');
    throw error;
  }
}

/** Admin: ask the Super Admin to delete this order. Nothing is removed. */
export function requestOrderDelete(order, reason, requestedBy) {
  const at = nowSql();
  return saveDeleteFields(order, {
    delete_requested: 1,
    delete_reason: reason,
    delete_requested_by: requestedBy,
    delete_requested_at: at,
  }).then(() => ({ reason, by: requestedBy, at }));
}

/** Super Admin: keep the order. (Approving = deleteOrder.) */
export const rejectDeleteRequest = (order) => saveDeleteFields(order, { delete_requested: 0 });

// ─────────────────────────────────────────────────────────────
// Appointments (bookings with Service = 'appointment')
// ─────────────────────────────────────────────────────────────
export async function fetchAppointments() {
  return (await fetchAllBookings(APPOINTMENT_SERVICE))
    .map(mapBookingToAppointment)
    .filter((a) => a.status !== 'cancelled');
}

export async function createAppointment(values) {
  const fields = {
    status: 'scheduled',
    Service: APPOINTMENT_SERVICE,
    service_type: ORDER_SOURCE.APPOINTMENT,
    package: values.type,
    sub_Service: values.type,
    passenger_name: values.customerName,
    contact_number: values.phone,
    date: values.date,
    time: values.time,
    date_time: `${values.date} ${values.time}`,
    special_instructions: values.notes,
  };
  const res = await bookingService.createBooking(toFormData(fields), MULTIPART);
  if (res.data?.success === false) throw new Error(res.data?.message || 'The server did not save the appointment.');
  const booking = bookingFromResponse(res);
  return booking ? mapBookingToAppointment(booking) : null;
}

export const cancelAppointment = (appointment) =>
  bookingService.updateStatus({ bookingId: appointment.originalId, newStatus: 'cancelled' });
