'use client';

import { useState } from 'react';
import { Plus, Trash2, Fuel } from 'lucide-react';
import { FUEL_LEVELS, SERVICE_OPTIONS, listPrice } from '../../utils/jobCards';
import { qar, readAmount } from '../../utils/inventory';

/** Starting values for the form from a job card (or empty for a new one). */
export const detailsFrom = (job) => ({
  mileage: job?.mileage != null ? String(job.mileage) : '',
  fuel_level: job?.fuel_level || '',
  damage_notes: job?.damage_notes || '',
  complaints: job?.complaints || '',
  services: (job?.services || []).map((s) => ({ name: s.name, price: String(s.price ?? '') })),
  technician: job?.technician || '',
  promised_at: job?.promised_at ? String(job.promised_at).replace(' ', 'T').slice(0, 16) : '',
  notes: job?.notes || '',
});

/** Form values → the API body, or an error string. */
export function detailsBody(d) {
  if (d.mileage.trim() && !/^\d{1,7}$/.test(d.mileage.trim())) return 'Mileage must be a whole number of km.';
  const services = [];
  for (const s of d.services) {
    if (!s.name.trim()) return 'Each service line needs a name.';
    const price = s.price.trim() ? readAmount(s.price) : 0;
    if (price === null) return `The price of ${s.name} must be a number.`;
    services.push({ name: s.name.trim(), price });
  }
  return {
    mileage: d.mileage.trim(),
    fuel_level: d.fuel_level || null,
    damage_notes: d.damage_notes.trim(),
    complaints: d.complaints.trim(),
    services,
    technician: d.technician.trim(),
    promised_at: d.promised_at || '',
    notes: d.notes.trim(),
  };
}

/**
 * The job card's details: mileage, fuel, existing damage, what the customer
 * wants, services (from the price list for this vehicle type, or typed), the
 * technician and when the car is promised. Controlled: `value` / `onChange`.
 */
export default function JobDetailsForm({ value, onChange, vehicleType, technicians = [] }) {
  const [pick, setPick] = useState('');
  const set = (key, v) => onChange({ ...value, [key]: v });
  const setLine = (i, key, v) => set('services', value.services.map((s, j) => (j === i ? { ...s, [key]: v } : s)));
  const addService = (name) => {
    if (!name) return;
    set('services', [...value.services, { name, price: listPrice(name, vehicleType) }]);
    setPick('');
  };
  const total = value.services.reduce((sum, s) => sum + (readAmount(s.price) || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="jc-mileage">Mileage (km)</label>
          <input id="jc-mileage" inputMode="numeric" value={value.mileage} onChange={(e) => set('mileage', e.target.value.replace(/[^\d]/g, ''))} placeholder="e.g. 84500" />
        </div>
        <div>
          <span className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1"><Fuel className="w-3.5 h-3.5" aria-hidden="true" /> Fuel level</span>
          <div className="grid grid-cols-5 gap-1" role="radiogroup" aria-label="Fuel level">
            {FUEL_LEVELS.map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={value.fuel_level === key}
                onClick={() => set('fuel_level', value.fuel_level === key ? '' : key)}
                className={`py-2 text-sm font-semibold border transition-colors ${
                  value.fuel_level === key ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary-dark)]' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="jc-damage">Existing damage</label>
        <textarea id="jc-damage" rows={2} value={value.damage_notes} onChange={(e) => set('damage_notes', e.target.value)} maxLength={2000} placeholder="e.g. Scratch on rear bumper, small dent on left door" />
      </div>
      <div>
        <label htmlFor="jc-complaints">Customer&apos;s complaints / requests</label>
        <textarea id="jc-complaints" rows={2} value={value.complaints} onChange={(e) => set('complaints', e.target.value)} maxLength={2000} placeholder="e.g. Bad smell inside, wants extra care on the seats" />
      </div>

      <div>
        <span className="block text-sm font-medium text-gray-700 mb-1">Services to be done</span>
        {value.services.length > 0 && (
          <div className="border border-gray-200 divide-y divide-gray-100 mb-2">
            {value.services.map((s, i) => (
               
              <div key={i} className="flex items-center gap-2 px-2 py-1.5">
                <input value={s.name} onChange={(e) => setLine(i, 'name', e.target.value)} maxLength={150} aria-label={`Service ${i + 1}`} className="flex-1 min-w-0" />
                <input value={s.price} onChange={(e) => setLine(i, 'price', e.target.value)} inputMode="decimal" aria-label={`Price of service ${i + 1}`} placeholder="Price" className="!w-24 text-right" />
                <button type="button" onClick={() => set('services', value.services.filter((_, j) => j !== i))} aria-label={`Remove ${s.name || 'service'}`} className="p-1.5 text-red-500 hover:bg-red-50">
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            ))}
            <div className="flex justify-between px-3 py-2 text-sm bg-gray-50">
              <span className="font-medium text-gray-700">Total</span>
              <span className="font-bold tabular-nums text-gray-900">{qar(total)}</span>
            </div>
          </div>
        )}
        <div className="flex gap-2">
          <select value={pick} onChange={(e) => addService(e.target.value)} aria-label="Add a service from the price list" className="flex-1">
            <option value="">+ Add a service from the price list…</option>
            {[...new Set(SERVICE_OPTIONS.map((o) => o.group))].map((g) => (
              <optgroup key={g} label={g}>
                {SERVICE_OPTIONS.filter((o) => o.group === g).map((o) => <option key={o.name} value={o.name}>{o.name}</option>)}
              </optgroup>
            ))}
          </select>
          <button type="button" onClick={() => set('services', [...value.services, { name: '', price: '' }])} className="shrink-0 flex items-center gap-1 px-3 text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-50">
            <Plus className="w-4 h-4" aria-hidden="true" /> Other
          </button>
        </div>
        {!vehicleType && <p className="mt-1 text-[11px] text-gray-500">The vehicle has no type saved, so prices aren&apos;t filled in. Type them.</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="jc-tech">Technician</label>
          <input id="jc-tech" list="jc-techs" value={value.technician} onChange={(e) => set('technician', e.target.value)} maxLength={100} placeholder="Who does the work" />
          <datalist id="jc-techs">{technicians.map((t) => <option key={t} value={t} />)}</datalist>
        </div>
        <div>
          <label htmlFor="jc-promised">Promised for</label>
          <input id="jc-promised" type="datetime-local" value={value.promised_at} onChange={(e) => set('promised_at', e.target.value)} />
        </div>
      </div>
      <div>
        <label htmlFor="jc-notes">Notes</label>
        <input id="jc-notes" value={value.notes} onChange={(e) => set('notes', e.target.value)} maxLength={255} placeholder="Optional" />
      </div>
    </div>
  );
}
