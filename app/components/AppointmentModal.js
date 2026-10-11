'use client';

import { useState, useEffect } from 'react';
import { X, CalendarPlus } from 'lucide-react';
import { useFocusTrap } from '@/app/hooks/useFocusTrap';
import { APPOINTMENT_TYPES } from '../../utils/priceList';

/**
 * Future appointment — for a customer who wants to come back on a later date
 * for Detailing, Polishing or Graphene. Dummy data only: `onSubmit(values)`
 * adds it to the list on screen.
 */

const pad = (n) => String(n).padStart(2, '0');

/** Today as YYYY-MM-DD in the user's local time zone. */
const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

function FieldError({ id, message }) {
  if (!message) return null;
  return <p id={id} className="mt-1 text-xs text-red-600" role="alert">{message}</p>;
}

const Required = () => <span className="text-red-500" aria-hidden="true"> *</span>;

export default function AppointmentModal({ onClose, onSubmit }) {
  const modalRef = useFocusTrap(true, onClose);
  const [type, setType] = useState(APPOINTMENT_TYPES[0]);
  const [form, setForm] = useState({ customerName: '', phone: '', date: '', time: '', notes: '' });
  const [errors, setErrors] = useState({});
  const today = todayLocal();

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const values = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim()]));
    const next = {};
    if (!values.customerName) next.customerName = 'Customer name is required';
    if (!values.phone) next.phone = 'Phone number is required';
    else if (values.phone.replace(/\D/g, '').length < 7) next.phone = 'Enter a valid phone number';
    if (!values.date) next.date = 'Date is required';
    else if (values.date < today) next.date = 'Pick today or a future date';
    if (!values.time) next.time = 'Time is required';
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    onSubmit({ ...values, type });
  };

  const fieldProps = (name) => ({
    id: `appt-${name}`,
    name,
    value: form[name],
    onChange: handleChange,
    'aria-invalid': !!errors[name],
    'aria-describedby': errors[name] ? `appt-${name}-error` : undefined,
  });

  return (
    <div className="fixed inset-0 bg-black/40 modal-backdrop z-50 flex items-center justify-center p-4">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="appt-modal-title"
        className="bg-white shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in-scale"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 id="appt-modal-title" className="text-base font-semibold text-gray-900">Take Appointment</h2>
            <p className="text-xs text-gray-500 mt-0.5">Book a future visit for the customer.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="btn-icon p-1.5 hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6" noValidate>
          {/* Appointment type tabs */}
          <div role="tablist" aria-label="Appointment type" className="grid grid-cols-3 gap-2 mb-5">
            {APPOINTMENT_TYPES.map((t) => {
              const active = type === t;
              return (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setType(t)}
                  className={`py-2.5 text-sm font-semibold border transition-colors ${
                    active
                      ? 'bg-[var(--primary)] border-[var(--primary)] text-white'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
            <div>
              <label htmlFor="appt-customerName">Customer Name<Required /></label>
              <input {...fieldProps('customerName')} placeholder="Full name" autoComplete="off" />
              <FieldError id="appt-customerName-error" message={errors.customerName} />
            </div>
            <div>
              <label htmlFor="appt-phone">Phone Number<Required /></label>
              <input {...fieldProps('phone')} type="tel" placeholder="+974 XXXX XXXX" autoComplete="off" />
              <FieldError id="appt-phone-error" message={errors.phone} />
            </div>
            <div>
              <label htmlFor="appt-date">Date<Required /></label>
              <input {...fieldProps('date')} type="date" min={today} />
              <FieldError id="appt-date-error" message={errors.date} />
            </div>
            <div>
              <label htmlFor="appt-time">Time<Required /></label>
              <input {...fieldProps('time')} type="time" />
              <FieldError id="appt-time-error" message={errors.time} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="appt-notes">Notes</label>
              <textarea {...fieldProps('notes')} placeholder={`Anything to know for the ${type.toLowerCase()} appointment…`} />
            </div>
          </div>

          <div className="form-footer">
            <button type="button" onClick={onClose} className="px-5 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 text-sm font-medium bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors flex items-center gap-2">
              <CalendarPlus className="w-4 h-4" aria-hidden="true" /> Book {type} Appointment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
