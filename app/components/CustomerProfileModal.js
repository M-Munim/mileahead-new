'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle, Car, Phone, Mail } from 'lucide-react';
import { useFocusTrap } from '@/app/hooks/useFocusTrap';
import { walkInCustomerService } from '../../utils/axiosInstance';
import { STATUS_LABEL, STATUS_PILL, vehicleText, phoneText } from '../../utils/jobCards';
import { qar } from '../../utils/inventory';

const day = (d) => (d ? new Date(String(d).replace(' ', 'T')).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

function Stat({ label, value }) {
  return (
    <div className="border border-gray-200 px-3 py-2">
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className="text-base font-semibold text-gray-900 tabular-nums">{value}</p>
    </div>
  );
}

/**
 * A customer's profile: contact, vehicles, job cards and past car wash orders
 * (found by phone or plate, also from before customers were saved).
 */
export default function CustomerProfileModal({ customerId, onClose }) {
  const modalRef = useFocusTrap(true, onClose);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    walkInCustomerService.history(customerId)
      .then((res) => { if (alive) setData(res.data.data); })
      .catch((err) => {
        if (!alive) return;
        setError(err?.status === 404 && !err?.message?.includes('Customer')
          ? 'The server is not updated for customer profiles yet.'
          : err?.message || 'Could not load the customer.');
      });
    return () => { alive = false; };
  }, [customerId]);

  const c = data?.customer;

  return (
    <div className="fixed inset-0 bg-black/40 modal-backdrop z-[60] flex items-center justify-center p-4">
      <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="cp-title" className="bg-white shadow-xl w-full max-w-3xl max-h-[94vh] flex flex-col animate-fade-in-scale">
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-gray-100">
          <h2 id="cp-title" className="text-base font-semibold text-gray-900">{c ? c.name : 'Customer'}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="btn-icon p-1.5 hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {!data && !error && <p className="py-10 text-center text-gray-500"><Loader2 className="w-5 h-5 animate-spin inline" aria-hidden="true" /> Loading…</p>}
          {error && (
            <div className="flex items-start gap-2 px-3 py-2 text-xs bg-red-50 border border-red-200 text-red-700" role="alert">
              <AlertCircle className="w-4 h-4 shrink-0 mt-px" aria-hidden="true" /><span>{error}</span>
            </div>
          )}

          {data && (
            <>
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-700">
                <span className="flex items-center gap-1.5"><Phone className="w-4 h-4 text-gray-400" aria-hidden="true" /><span dir="ltr">{phoneText(c.phone)}</span></span>
                {c.email && <span className="flex items-center gap-1.5"><Mail className="w-4 h-4 text-gray-400" aria-hidden="true" />{c.email}</span>}
                <span className="text-gray-500">Customer since {day(c.created_at)}</span>
              </div>
              {c.notes && <p className="text-sm text-gray-600"><b>Notes:</b> {c.notes}</p>}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Stat label="Car wash visits" value={data.stats.visits} />
                <Stat label="Paid total" value={qar(data.stats.spent)} />
                <Stat label="Job cards" value={data.job_cards.length} />
                <Stat label="Last visit" value={day(data.stats.last_visit)} />
              </div>

              <section>
                <p className="text-xs font-semibold text-gray-500 mb-2">Vehicles ({c.vehicles.length})</p>
                {c.vehicles.length === 0 ? <p className="text-sm text-gray-500">No vehicles saved.</p> : (
                  <ul className="space-y-1">
                    {c.vehicles.map((v) => (
                      <li key={v.id} className="flex items-center gap-2 text-sm text-gray-900"><Car className="w-4 h-4 text-gray-400" aria-hidden="true" />{vehicleText(v)}</li>
                    ))}
                  </ul>
                )}
              </section>

              <section>
                <p className="text-xs font-semibold text-gray-500 mb-2">Job cards ({data.job_cards.length})</p>
                {data.job_cards.length === 0 ? <p className="text-sm text-gray-500">No job cards yet.</p> : (
                  <div className="overflow-x-auto border border-gray-200">
                    <table className="w-full text-sm">
                      <thead><tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500"><th className="px-3 py-2">Job card</th><th className="px-3 py-2">Date</th><th className="px-3 py-2">Vehicle</th><th className="px-3 py-2">Status</th><th className="px-3 py-2 text-right">Total</th></tr></thead>
                      <tbody>
                        {data.job_cards.map((j) => (
                          <tr key={j.id} className="border-t border-gray-100">
                            <td className="px-3 py-2 font-medium whitespace-nowrap">{j.job_number}</td>
                            <td className="px-3 py-2 whitespace-nowrap">{day(j.created_at)}</td>
                            <td className="px-3 py-2">{j.vehicle.plate}</td>
                            <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_PILL[j.status]}`}>{STATUS_LABEL[j.status]}</span></td>
                            <td className="px-3 py-2 text-right tabular-nums">{qar(j.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section>
                <p className="text-xs font-semibold text-gray-500 mb-2">Car wash orders ({data.orders.length})</p>
                {data.orders.length === 0 ? <p className="text-sm text-gray-500">No orders found for this phone number or plates.</p> : (
                  <div className="overflow-x-auto border border-gray-200">
                    <table className="w-full text-sm">
                      <thead><tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500"><th className="px-3 py-2">Order</th><th className="px-3 py-2">Date</th><th className="px-3 py-2">Services</th><th className="px-3 py-2">Plate</th><th className="px-3 py-2 text-right">Total</th><th className="px-3 py-2">Payment</th></tr></thead>
                      <tbody>
                        {data.orders.map((o) => (
                          <tr key={o.id} className="border-t border-gray-100 align-top">
                            <td className="px-3 py-2 whitespace-nowrap">#{o.booking_number}{o.source === 'job-card' && <span className="block text-[10.5px] text-violet-700">from job card</span>}</td>
                            <td className="px-3 py-2 whitespace-nowrap">{day(o.created_at)}</td>
                            <td className="px-3 py-2">{o.services.join(', ') || '—'}</td>
                            <td className="px-3 py-2 whitespace-nowrap">{o.plate || '—'}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{qar(o.total)}</td>
                            <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${o.paid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{o.paid ? 'Paid' : 'Unpaid'}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {data.orders.length === 100 && <p className="text-[11px] text-gray-500 mt-1">Showing the latest 100 orders.</p>}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
