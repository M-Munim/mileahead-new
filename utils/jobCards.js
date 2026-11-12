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
  ready: [['delivered', 'Delivered to customer', 'primary'], ['in_progress', 'Back to work', 'warn']],
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
