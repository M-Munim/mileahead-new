'use client';

import { useState, useEffect, useMemo } from 'react';
import { Loader, X, User, Droplets, MapPin, CreditCard, AlertCircle } from 'lucide-react';
import { packageService, vehicleService, addonService } from '../../utils/axiosInstance';
import { extractArray } from '../../utils/extractArray';
import { useFocusTrap } from '@/app/hooks/useFocusTrap';

/**
 * Manual car wash order entry — for walk-in / phone customers that an Admin or
 * Manager books on their behalf. Packages, vehicle types and add-ons come from
 * the same pricing endpoints as the Pricing module, so the suggested total
 * matches what the app would charge. The total stays editable.
 *
 * The modal only collects and validates. `onSubmit(values)` does the saving and
 * should throw on failure — the error is shown here and the form is kept.
 */

const OPTION_SOURCES = [
  { key: 'packages', service: packageService, name: (r) => r.package_name || r.name },
  { key: 'vehicles', service: vehicleService, name: (r) => r.vehicle_name || r.name },
  { key: 'addons',   service: addonService,   name: (r) => r.name || r.addon_name },
];

const EMPTY_FORM = {
  customerName: '',
  phone: '',
  packageName: '',
  vehicle: '',
  addOn: '',
  numberPlate: '',
  location: '',
  date: '',
  time: '',
  payment: 'cash',
  notes: '',
  total: '',
};

/** The API sends prices as strings ("35.00"). */
const toPrice = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/** Today as YYYY-MM-DD in the user's local time zone. */
const todayLocal = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

function SectionHeader({ icon: Icon, title }) {
  return (
    <div className="col-span-1 md:col-span-2 flex items-center gap-2 pt-4 mt-2 border-t border-gray-100 first:pt-0 first:mt-0 first:border-0">
      <Icon className="w-4 h-4 text-[var(--primary)]" aria-hidden="true" />
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</span>
    </div>
  );
}

function FieldError({ id, message }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-xs text-red-600" role="alert">{message}</p>
  );
}

const Required = () => <span className="text-red-500" aria-hidden="true"> *</span>;

export default function NewOrderModal({ onClose, onSubmit }) {
  const modalRef = useFocusTrap(true, onClose);
  const [form, setForm] = useState(() => ({ ...EMPTY_FORM, date: todayLocal() }));
  const [priceTouched, setPriceTouched] = useState(false);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [options, setOptions] = useState({ packages: [], vehicles: [], addons: [] });
  const [optionsLoading, setOptionsLoading] = useState(true);

  // Load packages / vehicle types / add-ons. Any list that fails or comes back
  // empty falls back to a free-text field so an order can always be entered.
  useEffect(() => {
    let cancelled = false;
    Promise.allSettled(OPTION_SOURCES.map((s) => s.service.getAll())).then((results) => {
      if (cancelled) return;
      const next = {};
      OPTION_SOURCES.forEach((source, i) => {
        const result = results[i];
        next[source.key] = result.status === 'fulfilled'
          ? extractArray(result.value)
              .map((row) => ({ id: row.id, name: String(source.name(row) || '').trim(), price: toPrice(row.price) }))
              .filter((o) => o.name)
          : [];
      });
      setOptions(next);
      setOptionsLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  // Close on Escape is handled by useFocusTrap; lock page scroll while open.
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const priceOf = (list, name) => list.find((o) => o.name === name)?.price;

  const packagePrice = priceOf(options.packages, form.packageName);
  const vehiclePrice = priceOf(options.vehicles, form.vehicle);
  const addOnPrice = priceOf(options.addons, form.addOn);

  // Package + vehicle surcharge + add-on, the same way the Pricing module adds up.
  const calculatedTotal = useMemo(
    () => (packagePrice ?? 0) + (vehiclePrice ?? 0) + (addOnPrice ?? 0),
    [packagePrice, vehiclePrice, addOnPrice]
  );
  const totalValue = priceTouched ? form.total : (calculatedTotal > 0 ? String(calculatedTotal) : '');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleTotalChange = (e) => {
    setPriceTouched(true);
    setForm((prev) => ({ ...prev, total: e.target.value }));
    if (errors.total) setErrors((prev) => ({ ...prev, total: '' }));
  };

  const resetToCalculatedTotal = () => {
    setPriceTouched(false);
    setForm((prev) => ({ ...prev, total: '' }));
    setErrors((prev) => ({ ...prev, total: '' }));
  };

  const validate = (values) => {
    const next = {};
    if (!values.customerName) next.customerName = 'Customer name is required';
    if (!values.phone) next.phone = 'Phone number is required';
    else if (values.phone.replace(/\D/g, '').length < 7) next.phone = 'Enter a valid phone number';
    if (!values.packageName) next.packageName = 'Package is required';
    if (!values.vehicle) next.vehicle = 'Vehicle type is required';
    if (!values.location) next.location = 'Location is required';
    if (!values.date) next.date = 'Date is required';
    if (!values.time) next.time = 'Time is required';
    if (totalValue === '' || !Number.isFinite(Number(totalValue)) || Number(totalValue) < 0) {
      next.total = 'Enter a valid total of 0 or more';
    }
    return next;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    const values = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])
    );
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    setSaving(true);
    setSubmitError('');
    try {
      await onSubmit({
        ...values,
        total: Number(totalValue),
        packagePrice,
        vehiclePrice,
        addOnPrice: values.addOn ? addOnPrice : undefined,
      });
    } catch (err) {
      console.error('Create car wash order error', err);
      setSubmitError(err?.message || 'Could not create the order. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const fieldProps = (name) => ({
    id: `new-order-${name}`,
    name,
    value: form[name],
    onChange: handleChange,
    'aria-invalid': !!errors[name],
    'aria-describedby': errors[name] ? `new-order-${name}-error` : undefined,
  });

  /** A select when the API gave us a list, otherwise a plain text field. */
  const renderChoice = (name, list, placeholder, { optional = false } = {}) => {
    if (optionsLoading) {
      return <input {...fieldProps(name)} disabled placeholder="Loading…" />;
    }
    if (list.length === 0) {
      return <input {...fieldProps(name)} placeholder={placeholder} />;
    }
    return (
      <select {...fieldProps(name)}>
        <option value="">{optional ? 'None' : `Select ${placeholder.toLowerCase()}`}</option>
        {list.map((o) => (
          <option key={o.id ?? o.name} value={o.name}>
            {o.name}{o.price ? ` — QAR ${o.price}` : ''}
          </option>
        ))}
      </select>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/40 modal-backdrop z-50 flex items-center justify-center p-4">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-order-modal-title"
        className="bg-white shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in-scale"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 id="new-order-modal-title" className="text-base font-semibold text-gray-900">New Car Wash Order</h2>
            <p className="text-xs text-gray-500 mt-0.5">Enter a customer&apos;s booking manually. It starts as Pending.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="btn-icon p-1.5 hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6" noValidate>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
            {/* Customer */}
            <SectionHeader icon={User} title="Customer" />
            <div>
              <label htmlFor="new-order-customerName">Customer Name<Required /></label>
              <input {...fieldProps('customerName')} placeholder="Full name" autoComplete="off" />
              <FieldError id="new-order-customerName-error" message={errors.customerName} />
            </div>
            <div>
              <label htmlFor="new-order-phone">Phone Number<Required /></label>
              <input {...fieldProps('phone')} type="tel" placeholder="+974 XXXX XXXX" autoComplete="off" />
              <FieldError id="new-order-phone-error" message={errors.phone} />
            </div>

            {/* Service */}
            <SectionHeader icon={Droplets} title="Service" />
            <div>
              <label htmlFor="new-order-packageName">Package<Required /></label>
              {renderChoice('packageName', options.packages, 'Package')}
              <FieldError id="new-order-packageName-error" message={errors.packageName} />
            </div>
            <div>
              <label htmlFor="new-order-vehicle">Vehicle Type<Required /></label>
              {renderChoice('vehicle', options.vehicles, 'Vehicle type')}
              <FieldError id="new-order-vehicle-error" message={errors.vehicle} />
            </div>
            <div>
              <label htmlFor="new-order-addOn">Add-on</label>
              {renderChoice('addOn', options.addons, 'Add-on (optional)', { optional: true })}
            </div>
            <div>
              <label htmlFor="new-order-numberPlate">Number Plate</label>
              <input {...fieldProps('numberPlate')} placeholder="e.g. 123456" autoComplete="off" />
            </div>

            {/* Location & schedule */}
            <SectionHeader icon={MapPin} title="Location & Time" />
            <div className="md:col-span-2">
              <label htmlFor="new-order-location">Location<Required /></label>
              <input {...fieldProps('location')} placeholder="Street, area, Doha" autoComplete="off" />
              <FieldError id="new-order-location-error" message={errors.location} />
            </div>
            <div>
              <label htmlFor="new-order-date">Date<Required /></label>
              <input {...fieldProps('date')} type="date" />
              <FieldError id="new-order-date-error" message={errors.date} />
            </div>
            <div>
              <label htmlFor="new-order-time">Time<Required /></label>
              <input {...fieldProps('time')} type="time" />
              <FieldError id="new-order-time-error" message={errors.time} />
            </div>

            {/* Payment */}
            <SectionHeader icon={CreditCard} title="Payment" />
            <div>
              <label htmlFor="new-order-payment">Payment Method</label>
              <select {...fieldProps('payment')}>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
              </select>
            </div>
            <div>
              <label htmlFor="new-order-total">Total (QAR)<Required /></label>
              <input
                id="new-order-total"
                name="total"
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                value={totalValue}
                onChange={handleTotalChange}
                placeholder="0"
                aria-invalid={!!errors.total}
                aria-describedby={errors.total ? 'new-order-total-error' : 'new-order-total-hint'}
              />
              <FieldError id="new-order-total-error" message={errors.total} />
              {!errors.total && (
                <p id="new-order-total-hint" className="mt-1 text-[11px] text-gray-500">
                  {priceTouched && calculatedTotal > 0 && Number(totalValue) !== calculatedTotal ? (
                    <>
                      Edited manually.{' '}
                      <button type="button" onClick={resetToCalculatedTotal} className="text-[var(--primary)] hover:text-[var(--primary-hover)] font-medium underline">
                        Use QAR {calculatedTotal}
                      </button>
                    </>
                  ) : calculatedTotal > 0 ? (
                    'Package + vehicle + add-on. You can change it.'
                  ) : (
                    'Filled in from the package prices when available.'
                  )}
                </p>
              )}
            </div>

            <div className="md:col-span-2 pt-3 mt-2 border-t border-gray-100">
              <label htmlFor="new-order-notes">Notes</label>
              <textarea {...fieldProps('notes')} placeholder="Gate code, parking spot, special requests…" />
            </div>
          </div>

          {submitError && (
            <div className="mt-4 flex items-start gap-2 px-3 py-2 text-xs bg-red-50 border border-red-200 text-red-700" role="alert">
              <AlertCircle className="w-4 h-4 shrink-0 mt-px" aria-hidden="true" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Footer */}
          <div className="form-footer">
            <button type="button" onClick={onClose} className="px-5 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-5 py-2 text-sm font-medium bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors flex items-center gap-2 disabled:opacity-50">
              {saving && <Loader className="w-4 h-4 animate-spin" aria-hidden="true" />}
              {saving ? 'Saving…' : 'Create Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
