'use client';

import { useState, useEffect, useMemo } from 'react';
import { Loader, X, User, Droplets, Clock, CreditCard, Tag, AlertCircle } from 'lucide-react';
import { useFocusTrap } from '@/app/hooks/useFocusTrap';
import {
  SERVICE_GROUPS, EXTRAS, DISCOUNTS, PAYMENT_METHODS,
  vehiclesForService, servicePrice, priceFor,
} from '../../utils/priceList';

/**
 * Manual order entry — the person running the car wash center enters each
 * customer who comes in. Services, vehicle types and extras follow the Magic
 * Track price list; the total is suggested from it and stays editable.
 * Dummy data only (client request): nothing is sent to the API.
 *
 * The modal only collects and validates. `onSubmit(values)` adds the order.
 */

const pad = (n) => String(n).padStart(2, '0');

/** Today's date (YYYY-MM-DD) and the current time (HH:MM), local time zone. */
const nowLocal = () => {
  const d = new Date();
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
};

const EMPTY_FORM = {
  customerName: '',
  phone: '',
  service: '',
  vehicle: '',
  extras: [],
  numberPlate: '',
  date: '',
  time: '',
  discount: '',
  couponSerial: '',
  payment: '',
  paymentStatus: 'unpaid',
  notes: '',
  total: '',
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
  const [form, setForm] = useState(() => ({ ...EMPTY_FORM, ...nowLocal() }));
  const [priceTouched, setPriceTouched] = useState(false);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Close on Escape is handled by useFocusTrap; lock page scroll while open.
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const vehicleOptions = vehiclesForService(form.service);
  const calculatedTotal = useMemo(
    () => priceFor(form.service, form.vehicle, form.extras),
    [form.service, form.vehicle, form.extras]
  );
  const totalValue = priceTouched ? form.total : (calculatedTotal > 0 ? String(calculatedTotal) : '');
  const hasStartingPrice = form.extras.some((name) => EXTRAS.find((e) => e.name === name)?.from);

  const clearError = (...names) => {
    if (names.some((n) => errors[n])) {
      setErrors((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => !names.includes(k))));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      // PPF and wash services use different vehicle sizes — drop a vehicle the new service doesn't offer.
      if (name === 'service' && !vehiclesForService(value).includes(prev.vehicle)) next.vehicle = '';
      if (name === 'discount' && value !== 'Coupon') next.couponSerial = '';
      return next;
    });
    clearError(name);
  };

  const toggleExtra = (name) => {
    setForm((prev) => ({
      ...prev,
      extras: prev.extras.includes(name) ? prev.extras.filter((x) => x !== name) : [...prev.extras, name],
    }));
    clearError('service');
  };

  const handleTotalChange = (e) => {
    setPriceTouched(true);
    setForm((prev) => ({ ...prev, total: e.target.value }));
    clearError('total');
  };

  const resetToCalculatedTotal = () => {
    setPriceTouched(false);
    setForm((prev) => ({ ...prev, total: '' }));
    clearError('total');
  };

  const validate = (values) => {
    const next = {};
    if (!values.customerName) next.customerName = 'Customer name is required';
    if (!values.phone) next.phone = 'Phone number is required';
    else if (values.phone.replace(/\D/g, '').length < 7) next.phone = 'Enter a valid phone number';
    if (!values.service && values.extras.length === 0) next.service = 'Choose a service or at least one extra';
    if (!values.vehicle) next.vehicle = 'Vehicle type is required';
    if (!values.date) next.date = 'Date is required';
    if (!values.time) next.time = 'Time is required';
    if (values.discount === 'Coupon' && !values.couponSerial) next.couponSerial = 'Coupon serial number is required';
    if (!values.payment) next.payment = 'Payment method is required';
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
      await onSubmit({ ...values, total: Number(totalValue) });
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
            <p className="text-xs text-gray-500 mt-0.5">Enter the details of the customer at the center.</p>
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
              <label htmlFor="new-order-service">Service</label>
              <select {...fieldProps('service')}>
                <option value="">Select service</option>
                {SERVICE_GROUPS.map((group) => (
                  <optgroup key={group.key} label={group.title}>
                    {group.services.map((s) => (
                      <option key={s.name} value={s.name}>{s.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <FieldError id="new-order-service-error" message={errors.service} />
              {!errors.service && (
                <p className="mt-1 text-[11px] text-gray-500">Leave empty if the customer only wants extras.</p>
              )}
            </div>
            <div>
              <label htmlFor="new-order-vehicle">Vehicle Type<Required /></label>
              <select {...fieldProps('vehicle')}>
                <option value="">Select vehicle type</option>
                {vehicleOptions.map((v) => {
                  const price = servicePrice(form.service, v);
                  return (
                    <option key={v} value={v}>{v}{price !== undefined ? ` — QAR ${price.toLocaleString('en-US')}` : ''}</option>
                  );
                })}
              </select>
              <FieldError id="new-order-vehicle-error" message={errors.vehicle} />
            </div>
            <div className="md:col-span-2">
              <span className="block text-[13px] font-medium text-gray-700 mb-1.5">Upholstery & Interior Extras</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {EXTRAS.map((extra) => {
                  const checked = form.extras.includes(extra.name);
                  return (
                    <label
                      key={extra.name}
                      className={`flex items-center gap-2.5 px-3 py-2 mb-0 border text-sm font-normal cursor-pointer transition-colors ${
                        checked ? 'border-[var(--primary)] bg-[var(--primary-light)]' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleExtra(extra.name)}
                        className="w-4 h-4 accent-[var(--primary)]"
                      />
                      <span className="flex-1 text-gray-800">{extra.name}</span>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {extra.from ? 'From ' : ''}QAR {extra.price}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div>
              <label htmlFor="new-order-numberPlate">Number Plate</label>
              <input {...fieldProps('numberPlate')} placeholder="e.g. 123456" autoComplete="off" />
            </div>

            {/* Date & time */}
            <SectionHeader icon={Clock} title="Date & Time" />
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

            {/* Discount */}
            <SectionHeader icon={Tag} title="Discount" />
            <div>
              <label htmlFor="new-order-discount">Discount</label>
              <select {...fieldProps('discount')}>
                <option value="">No discount</option>
                {DISCOUNTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            {form.discount === 'Coupon' && (
              <div>
                <label htmlFor="new-order-couponSerial">Coupon Serial Number<Required /></label>
                <input {...fieldProps('couponSerial')} placeholder="e.g. MT-2041" autoComplete="off" />
                <FieldError id="new-order-couponSerial-error" message={errors.couponSerial} />
              </div>
            )}

            {/* Payment */}
            <SectionHeader icon={CreditCard} title="Payment" />
            <div>
              <label htmlFor="new-order-payment">Payment Method<Required /></label>
              <select {...fieldProps('payment')}>
                <option value="">Select payment method</option>
                {PAYMENT_METHODS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <FieldError id="new-order-payment-error" message={errors.payment} />
            </div>
            <fieldset>
              <legend className="text-[13px] font-medium text-gray-700 mb-1.5">Payment Status<Required /></legend>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'paid', label: 'Paid', on: 'border-green-600 bg-green-50 text-green-700' },
                  { value: 'unpaid', label: 'Unpaid', on: 'border-red-500 bg-red-50 text-red-700' },
                ].map((opt) => {
                  const checked = form.paymentStatus === opt.value;
                  return (
                    <label
                      key={opt.value}
                      className={`flex items-center justify-center gap-2 px-3 py-2 mb-0 border text-sm font-semibold cursor-pointer transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--primary)] ${
                        checked ? opt.on : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentStatus"
                        value={opt.value}
                        checked={checked}
                        onChange={handleChange}
                        className="sr-only"
                      />
                      {opt.label}
                    </label>
                  );
                })}
              </div>
            </fieldset>
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
                        Use price list: QAR {calculatedTotal.toLocaleString('en-US')}
                      </button>
                    </>
                  ) : hasStartingPrice ? (
                    'Includes a starting price (Floor Mat / Seat Cover) — change the total if needed.'
                  ) : calculatedTotal > 0 ? (
                    'From the price list. Change it for a discount if needed.'
                  ) : (
                    'Filled in from the price list once you pick a service and vehicle.'
                  )}
                </p>
              )}
            </div>

            <div className="md:col-span-2 pt-3 mt-2 border-t border-gray-100">
              <label htmlFor="new-order-notes">Notes</label>
              <textarea {...fieldProps('notes')} placeholder="Any special requests…" />
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
