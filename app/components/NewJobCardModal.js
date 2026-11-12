'use client';

import { useState, useEffect } from 'react';
import { X, Search, Loader2, AlertCircle, UserPlus, Car, Plus, ChevronLeft, Save, History, ClipboardList } from 'lucide-react';
import { useFocusTrap } from '@/app/hooks/useFocusTrap';
import { walkInCustomerService, jobCardService } from '../../utils/axiosInstance';
import { ALL_VEHICLES } from '../../utils/priceList';
import { vehicleText, phoneText } from '../../utils/jobCards';
import JobDetailsForm, { detailsFrom, detailsBody } from './JobDetailsForm';

const emptyVehicle = { plate: '', vehicle_type: '', make: '', model: '', color: '', year: '' };

/** Plate, type, make, model, colour, year. */
function VehicleFields({ value, onChange, idPrefix }) {
  const set = (k, v) => onChange({ ...value, [k]: v });
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <div>
        <label htmlFor={`${idPrefix}-plate`}>Plate<span className="text-red-500" aria-hidden="true"> *</span></label>
        <input id={`${idPrefix}-plate`} value={value.plate} onChange={(e) => set('plate', e.target.value.toUpperCase())} maxLength={30} placeholder="e.g. 123456" dir="ltr" />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-type`}>Type</label>
        <select id={`${idPrefix}-type`} value={value.vehicle_type} onChange={(e) => set('vehicle_type', e.target.value)}>
          <option value="">—</option>
          {ALL_VEHICLES.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor={`${idPrefix}-make`}>Make</label>
        <input id={`${idPrefix}-make`} value={value.make} onChange={(e) => set('make', e.target.value)} maxLength={60} placeholder="e.g. Toyota" />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-model`}>Model</label>
        <input id={`${idPrefix}-model`} value={value.model} onChange={(e) => set('model', e.target.value)} maxLength={60} placeholder="e.g. Land Cruiser" />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-color`}>Colour</label>
        <input id={`${idPrefix}-color`} value={value.color} onChange={(e) => set('color', e.target.value)} maxLength={40} placeholder="e.g. White" />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-year`}>Year</label>
        <input id={`${idPrefix}-year`} inputMode="numeric" value={value.year} onChange={(e) => set('year', e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="e.g. 2022" />
      </div>
    </div>
  );
}

const vehicleBody = (v) => ({ ...v, plate: v.plate.trim(), year: v.year.trim() });

/**
 * New job card: find the customer by phone / plate (saved customers and people
 * from past orders), or add a new one; pick (or add) the vehicle; then fill in
 * the job details. `onCreated(job)` after saving; `onOpenExisting(id)` when the
 * vehicle already has an open job card.
 */
export default function NewJobCardModal({ technicians, onClose, onCreated, onOpenExisting }) {
  const modalRef = useFocusTrap(true, onClose);
  const [step, setStep] = useState('customer'); // customer | details
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [newCustomer, setNewCustomer] = useState(null); // { name, phone, vehicle }
  const [newVehicle, setNewVehicle] = useState(null); // vehicle fields for the chosen customer
  const [details, setDetails] = useState(() => detailsFrom(null));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [existingId, setExistingId] = useState(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // search as staff type (after a short pause)
  useEffect(() => {
    const text = q.trim();
    if (text.length < 2) return undefined;
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await walkInCustomerService.search(text);
        setResults(res.data?.data || { customers: [], past_orders: [] });
      } catch (err) {
        setError(err?.message || 'Search failed.');
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const run = async (fn) => {
    setBusy(true);
    setError('');
    setExistingId(null);
    try {
      await fn();
    } catch (err) {
      setError(err?.message || 'Something went wrong.');
      if (err?.data?.job_card_id) setExistingId(err.data.job_card_id);
      return err;
    } finally {
      setBusy(false);
    }
    return null;
  };

  const choose = (c, v) => {
    setCustomer(c);
    setVehicle(v || null);
    setNewVehicle(v ? null : c.vehicles?.length ? null : { ...emptyVehicle });
    if (v) setStep('details');
  };

  // A person from past orders → saved as a customer with that vehicle
  const savePast = (p) => run(async () => {
    try {
      const res = await walkInCustomerService.add({
        name: p.name || 'Customer',
        phone: p.phone,
        ...(p.plate ? { vehicle: { plate: p.plate, vehicle_type: ALL_VEHICLES.includes(p.vehicle_type) ? p.vehicle_type : '' } } : {}),
      });
      const c = res.data.data;
      choose(c, c.vehicles[0]);
    } catch (err) {
      // already saved (phone): open that customer instead
      if (err?.status === 409 && err?.data?.customer_id) {
        const res = await walkInCustomerService.getOne(err.data.customer_id);
        choose(res.data.data, null);
        return;
      }
      throw err;
    }
  });

  const saveNewCustomer = () => run(async () => {
    const nc = newCustomer;
    if (!nc.name.trim()) throw { message: 'Please enter the customer name.' };
    if (nc.phone.replace(/\D/g, '').length < 8) throw { message: 'Please enter the phone number.' };
    if (!nc.vehicle.plate.trim()) throw { message: 'Please enter the plate number.' };
    const res = await walkInCustomerService.add({ name: nc.name.trim(), phone: nc.phone.trim(), vehicle: vehicleBody(nc.vehicle) });
    const c = res.data.data;
    setNewCustomer(null);
    choose(c, c.vehicles[0]);
  });

  const saveNewVehicle = () => run(async () => {
    if (!newVehicle.plate.trim()) throw { message: 'Please enter the plate number.' };
    const res = await walkInCustomerService.addVehicle(customer.id, vehicleBody(newVehicle));
    const v = res.data.data;
    setCustomer({ ...customer, vehicles: [...(customer.vehicles || []), v] });
    setNewVehicle(null);
    setVehicle(v);
    setStep('details');
  });

  const create = () => run(async () => {
    const body = detailsBody(details);
    if (typeof body === 'string') throw { message: body };
    const res = await jobCardService.add({ ...body, customer_id: customer.id, vehicle_id: vehicle.id });
    onCreated(res.data.data);
  });

  const startNew = () => {
    const digits = q.replace(/\D/g, '');
    setNewCustomer({ name: '', phone: digits.length >= 8 ? q.trim() : '', vehicle: { ...emptyVehicle, plate: digits.length >= 8 ? '' : q.trim().toUpperCase() } });
  };

  return (
    <div className="fixed inset-0 bg-black/40 modal-backdrop z-50 flex items-center justify-center p-4">
      <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="new-jc-title" className="bg-white shadow-xl w-full max-w-2xl max-h-[94vh] flex flex-col animate-fade-in-scale">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <ClipboardList className="w-5 h-5 text-[var(--primary)]" aria-hidden="true" />
            <div>
              <h2 id="new-jc-title" className="text-base font-semibold text-gray-900">New job card</h2>
              <p className="text-xs text-gray-500">{step === 'customer' ? 'Step 1 of 2: customer and vehicle' : 'Step 2 of 2: what to do'}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="btn-icon p-1.5 hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {step === 'customer' && !customer && !newCustomer && (
            <>
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <input
                  type="search"
                  value={q}
                  onChange={(e) => { setQ(e.target.value); if (e.target.value.trim().length < 2) setResults(null); }}
                  placeholder="Search phone number, plate or name"
                  aria-label="Search customer"
                  className="!pl-9"
                  autoFocus
                />
                {searching && <Loader2 className="w-4 h-4 animate-spin text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" aria-hidden="true" />}
              </div>

              {results && (
                <div className="space-y-3">
                  {results.customers.map((c) => (
                    <div key={c.id} className="border border-gray-200">
                      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                          <p className="text-xs text-gray-500" dir="ltr">{phoneText(c.phone)}</p>
                        </div>
                        <button type="button" onClick={() => choose(c, null)} className="text-xs font-medium text-[var(--primary)] underline shrink-0">Other vehicle</button>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {c.vehicles.map((v) => (
                          <button key={v.id} type="button" onClick={() => choose(c, v)} className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--primary)]/5">
                            <Car className="w-4 h-4 text-gray-400 shrink-0" aria-hidden="true" />
                            <span className="flex-1 truncate">{vehicleText(v)}</span>
                            <span className="text-xs font-medium text-[var(--primary)]">Select</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  {results.past_orders.length > 0 && (
                    <div>
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-1"><History className="w-3.5 h-3.5" aria-hidden="true" /> From past orders (not saved as customers yet)</p>
                      <div className="border border-gray-200 divide-y divide-gray-100">
                        {results.past_orders.map((p) => (
                          <button key={`${p.phone}|${p.plate}`} type="button" disabled={busy} onClick={() => savePast(p)} className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--primary)]/5 disabled:opacity-60">
                            <span className="flex-1 min-w-0">
                              <span className="block font-medium text-gray-900 truncate">{p.name || 'No name'} · <span dir="ltr">{phoneText(p.phone)}</span></span>
                              <span className="block text-xs text-gray-500 truncate">{[p.plate, p.vehicle_type].filter(Boolean).join(' · ') || 'No plate'} · {p.visits} visit{p.visits === 1 ? '' : 's'}</span>
                            </span>
                            <span className="text-xs font-medium text-[var(--primary)] shrink-0">Save &amp; select</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {!results.customers.length && !results.past_orders.length && !searching && (
                    <p className="text-sm text-gray-500">No customer found for &quot;{q.trim()}&quot;.</p>
                  )}
                </div>
              )}

              <button type="button" onClick={startNew} className="w-full flex items-center justify-center gap-2 px-3 py-3 border border-dashed border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">
                <UserPlus className="w-4 h-4" aria-hidden="true" /> New customer
              </button>
            </>
          )}

          {step === 'customer' && newCustomer && (
            <div className="space-y-4">
              <button type="button" onClick={() => setNewCustomer(null)} className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900"><ChevronLeft className="w-4 h-4" aria-hidden="true" /> Back to search</button>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="nc-name">Customer name<span className="text-red-500" aria-hidden="true"> *</span></label>
                  <input id="nc-name" value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} maxLength={150} autoFocus />
                </div>
                <div>
                  <label htmlFor="nc-phone">Phone<span className="text-red-500" aria-hidden="true"> *</span></label>
                  <input id="nc-phone" type="tel" dir="ltr" value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} maxLength={20} placeholder="5512 3456" />
                </div>
              </div>
              <VehicleFields idPrefix="nc" value={newCustomer.vehicle} onChange={(v) => setNewCustomer({ ...newCustomer, vehicle: v })} />
              <button type="button" onClick={saveNewCustomer} disabled={busy} className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-50">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Save className="w-4 h-4" aria-hidden="true" />} Save customer and continue
              </button>
            </div>
          )}

          {step === 'customer' && customer && (
            <div className="space-y-3">
              <button type="button" onClick={() => { setCustomer(null); setNewVehicle(null); }} className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900"><ChevronLeft className="w-4 h-4" aria-hidden="true" /> Back to search</button>
              <p className="text-sm"><b>{customer.name}</b> · <span dir="ltr">{phoneText(customer.phone)}</span></p>
              {(customer.vehicles || []).length > 0 && (
                <div className="border border-gray-200 divide-y divide-gray-100">
                  {customer.vehicles.map((v) => (
                    <button key={v.id} type="button" onClick={() => choose(customer, v)} className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--primary)]/5">
                      <Car className="w-4 h-4 text-gray-400 shrink-0" aria-hidden="true" />
                      <span className="flex-1 truncate">{vehicleText(v)}</span>
                      <span className="text-xs font-medium text-[var(--primary)]">Select</span>
                    </button>
                  ))}
                </div>
              )}
              {newVehicle ? (
                <div className="space-y-3 border border-gray-200 p-3">
                  <p className="text-sm font-semibold text-gray-900">Add a vehicle</p>
                  <VehicleFields idPrefix="nv" value={newVehicle} onChange={setNewVehicle} />
                  <button type="button" onClick={saveNewVehicle} disabled={busy} className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-50">
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Save className="w-4 h-4" aria-hidden="true" />} Save vehicle and continue
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => setNewVehicle({ ...emptyVehicle })} className="flex items-center gap-1.5 text-sm font-medium text-[var(--primary)]">
                  <Plus className="w-4 h-4" aria-hidden="true" /> Add another vehicle
                </button>
              )}
            </div>
          )}

          {step === 'details' && customer && vehicle && (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3 px-3 py-2.5 bg-gray-50 border border-gray-200">
                <div className="min-w-0 text-sm">
                  <p className="font-semibold text-gray-900 truncate">{customer.name} · <span dir="ltr">{phoneText(customer.phone)}</span></p>
                  <p className="text-gray-600 truncate">{vehicleText(vehicle)}</p>
                </div>
                <button type="button" onClick={() => setStep('customer')} className="text-xs font-medium text-[var(--primary)] underline shrink-0">Change</button>
              </div>
              <JobDetailsForm value={details} onChange={setDetails} vehicleType={vehicle.vehicle_type} technicians={technicians} />
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 px-3 py-2 text-xs bg-red-50 border border-red-200 text-red-700" role="alert">
              <AlertCircle className="w-4 h-4 shrink-0 mt-px" aria-hidden="true" />
              <span className="mr-auto">{error}</span>
              {existingId && (
                <button type="button" onClick={() => onOpenExisting(existingId)} className="font-semibold underline shrink-0">Open it</button>
              )}
            </div>
          )}
        </div>

        {step === 'details' && (
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-5 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200">Cancel</button>
            <button type="button" onClick={create} disabled={busy} className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-50">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Save className="w-4 h-4" aria-hidden="true" />} Create job card
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
