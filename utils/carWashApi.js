// Magic Track ↔ backend (api-magic.milesahead.services) for car wash orders,
// appointments and kiosk orders. Everything goes through the booking endpoints
// of the Postman collection (magictrack_collection.json):
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
//   status           'unpaid' | 'paid'  (appointments: 'scheduled' | 'cancelled')
//   Service          'car wash'  (appointments: 'appointment')
//   service_type     where the order came from: 'walk-in' (dashboard) | 'kiosk' | 'appointment'
//   package / sub_Service   main service (appointments: Detailing / Polishing / Graphene)
//   package_price    main service price for the vehicle
//   car_name         vehicle type      car_number   number plate
//   add_ons          other services, comma separated      add_ons_price  their total
//   payment_method   Cash / Card       payment_channel   payment type (Fawran / Paylater / Partner Credit)
//   price            final total (after the coupon)
//   special_instructions   notes
//
// Not in the backend yet (requested from the backend developer — see
// BACKEND_REQUESTS.md): discount, coupon_serial, subtotal. Flip the flag below
// once those columns exist and they will be saved and shown automatically.

import { bookingService } from './axiosInstance';
import { extractArray } from './extractArray';
import { servicePrice, findExtra } from './priceList';

export const BACKEND_HAS_DISCOUNT_FIELDS = false;

export const CAR_WASH_SERVICE = 'car wash';
export const APPOINTMENT_SERVICE = 'appointment';
export const ORDER_SOURCE = { DASHBOARD: 'walk-in', KIOSK: 'kiosk', APPOINTMENT: 'appointment' };

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

/** Kiosk queue number shown to the customer, derived from the booking number. */
export const queueNumberFor = (booking) => `A${booking.booking_number || booking.id}`;

/** Backend booking → dashboard order. */
export function mapBookingToOrder(b) {
  const isKiosk = b.service_type === ORDER_SOURCE.KIOSK;
  const subtotal = b.subtotal != null
    ? num(b.subtotal)
    : num(b.package_price) + num(b.add_ons_price) + num(b.vehicle_price);
  return {
    id: String(b.booking_number || b.id),
    originalId: b.id,
    source: isKiosk ? 'kiosk' : 'dashboard',
    queue: isKiosk ? queueNumberFor(b) : undefined,
    customer: { name: b.passenger_name || 'Walk-in customer', phone: b.contact_number || '' },
    service: b.package || b.sub_Service || '',
    vehicle: b.car_name || '',
    extras: splitList(b.add_ons),
    numberPlate: b.car_number || '',
    discount: b.discount || '',
    couponSerial: b.coupon_serial || '',
    paymentMethod: b.payment_method || '',
    paymentType: b.payment_channel || '',
    status: String(b.status || '').toLowerCase() === 'paid' ? 'paid' : 'unpaid',
    time: formatSlot(b.date, b.time, b.date_time),
    bookedAt: formatCreated(b.created_at),
    date: b.date || '',            // YYYY-MM-DD, used for customer visit history
    createdAt: b.created_at || '',
    subtotal,
    total: num(b.price),
    cleaner: null,
    notes: b.special_instructions || '',
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
 * customerName, phone, service, vehicle, extras[], numberPlate, date, time,
 * discount, couponSerial, paymentMethod, paymentType, paymentStatus, subtotal,
 * total, notes.
 */
export async function createCarWashOrder(values, source = ORDER_SOURCE.DASHBOARD) {
  const extrasTotal = (values.extras || []).reduce((sum, name) => sum + (findExtra(name)?.price ?? 0), 0);
  const mainPrice = values.service ? servicePrice(values.service, values.vehicle) : undefined;
  const fields = {
    status: values.paymentStatus === 'paid' ? 'paid' : 'unpaid',
    Service: CAR_WASH_SERVICE,
    service_type: source,
    passenger_name: values.customerName,
    contact_number: values.phone,
    package: values.service,
    sub_Service: values.service,
    package_price: mainPrice,
    car_name: values.vehicle,
    car_number: values.numberPlate,
    add_ons: (values.extras || []).join(', '),
    add_ons_price: values.extras?.length ? extrasTotal : undefined,
    date: values.date,
    time: values.time,
    date_time: values.date && values.time ? `${values.date} ${values.time}` : undefined,
    price: values.total,
    payment_method: values.paymentMethod,
    payment_channel: values.paymentType,
    special_instructions: values.notes,
    ...(BACKEND_HAS_DISCOUNT_FIELDS
      ? { discount: values.discount, coupon_serial: values.couponSerial, subtotal: values.subtotal }
      : {}),
  };
  const res = await bookingService.createBooking(toFormData(fields), MULTIPART);
  if (res.data?.success === false) throw new Error(res.data?.message || 'The server did not save the order.');
  const booking = bookingFromResponse(res);
  return booking ? mapBookingToOrder(booking) : null;
}

/** Paid / Unpaid. */
export const setOrderPaymentStatus = (order, status) =>
  bookingService.updateStatus({ bookingId: order.originalId, newStatus: status });

/** Payment method (Cash / Card) or payment type (Fawran…) changed from the table. */
const FIELD_COLUMNS = { paymentMethod: 'payment_method', paymentType: 'payment_channel' };
export const updateOrderField = (order, field, value) =>
  bookingService.updateBooking(order.originalId, toFormData({ [FIELD_COLUMNS[field]]: value }), MULTIPART);

export const deleteOrder = (order) => bookingService.deleteBooking(order.originalId);

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
