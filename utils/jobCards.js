// Labels for job cards (the work order for one visit).
import { SERVICE_GROUPS, EXTRAS, servicePrice, findExtra } from './priceList';

export const STATUS_LABEL = {
  open: 'Open',
  in_progress: 'In progress',
  quality_check: 'Quality check',
  ready: 'Ready',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export const STATUS_PILL = {
  open: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  quality_check: 'bg-amber-100 text-amber-800',
  ready: 'bg-green-100 text-green-700',
  delivered: 'bg-violet-100 text-violet-700',
  cancelled: 'bg-red-100 text-red-700',
};

/** The buttons for each status: [next status, label, kind]. Mirrors the server's rules. */
export const ACTIONS = {
  open: [['in_progress', 'Start work', 'primary'], ['cancelled', 'Cancel job', 'danger']],
  in_progress: [['quality_check', 'Send to quality check', 'primary'], ['cancelled', 'Cancel job', 'danger']],
  quality_check: [['ready', 'Passed: ready for delivery', 'primary'], ['in_progress', 'Failed: back to work', 'warn']],
  // 'invoice' isn't a status: it opens the invoice form (order + payment), which closes the job as Delivered
  ready: [['invoice', 'Invoice and deliver', 'primary'], ['in_progress', 'Back to work', 'warn']],
  delivered: [],
  cancelled: [],
};

/** Moves that need a note (and what to ask). */
export const NOTE_FOR = {
  cancelled: 'Why is the job cancelled?',
  in_progress_back: 'What needs fixing?',
};

export const FUEL_LEVELS = [
  ['empty', 'E'],
  ['quarter', '¼'],
  ['half', '½'],
  ['three_quarters', '¾'],
  ['full', 'F'],
];
export const FUEL_LABEL = { empty: 'Empty', quarter: '1/4', half: '1/2', three_quarters: '3/4', full: 'Full' };

export const OPEN_STATUSES = ['open', 'in_progress', 'quality_check', 'ready'];

/** Quality check before "ready". Same keys as the server (QC_ITEMS in jobCardService.js). */
export const QC_ITEMS = [
  ['services_done', 'All requested services done'],
  ['exterior_clean', 'Exterior clean, no soap or water marks'],
  ['interior_clean', 'Interior clean and vacuumed'],
  ['glass_clean', 'Windows and mirrors clean'],
  ['tyres_rims', 'Tyres and rims clean'],
  ['no_new_damage', 'No new damage (checked against check-in)'],
  ['items_returned', "Customer's items and mats back in place"],
];

export const MAX_PHOTOS = 30;
export const PHOTOS_PER_UPLOAD = 6;

/** WhatsApp message: the car is ready to collect. */
export function readyMessage(job) {
  const name = job.customer?.name ? ` ${job.customer.name}` : '';
  return [
    '*Magic Track*',
    '',
    `Hi${name}, your car${job.vehicle?.plate ? ` (${job.vehicle.plate})` : ''} is ready for collection.`,
    `Job card: ${job.job_number}`,
    job.total ? `Amount: QAR ${Number(job.total).toLocaleString('en-US')}` : null,
    '',
    'Thank you for choosing Magic Track.',
  ].filter((l) => l !== null).join('\n');
}

/** Every service on the price list, for the job card's service picker. */
export const SERVICE_OPTIONS = [
  ...SERVICE_GROUPS.flatMap((g) => g.services.map((s) => ({ name: s.name, group: g.title }))),
  ...EXTRAS.map((e) => ({ name: e.name, group: 'Other Services' })),
];

/** Price-list price for a service on this vehicle type ('' when unknown). */
export function listPrice(name, vehicleType) {
  const p = servicePrice(name, vehicleType);
  if (p !== undefined) return String(p);
  const extra = findExtra(name);
  return extra ? String(extra.price) : '';
}

export const vehicleText = (v) => [v?.plate, [v?.make, v?.model].filter(Boolean).join(' '), v?.vehicle_type, v?.color].filter(Boolean).join(' · ');

/** "97455123456" → "+974 5512 3456" */
export const phoneText = (p) => {
  const d = String(p || '');
  return d.startsWith('974') && d.length === 11 ? `+974 ${d.slice(3, 7)} ${d.slice(7)}` : d ? `+${d}` : '';
};
