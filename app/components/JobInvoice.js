'use client';

import { useState } from 'react';
import { Loader2, AlertCircle, MessageCircle, Receipt, CheckCircle } from 'lucide-react';
import { jobCardService } from '../../utils/axiosInstance';
import { PAYMENT_METHODS, PAYMENT_TYPES, formatQar } from '../../utils/priceList';
import { mapBookingToOrder, saveOrderReceipt } from '../../utils/carWashApi';
import { getWhatsAppUrl, toWhatsAppNumber } from '../../utils/location';

/**
 * "Invoice and deliver" on a Ready job card: the payment, then the server turns
 * the job card into a normal car wash order (Car Wash Orders, Day Close,
 * receipt) and closes it as Delivered.
 */
export function InvoiceForm({ job, onDone, onCancel }) {
  const [method, setMethod] = useState('Cash');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('paid');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await jobCardService.invoice(job.id, {
        payment_method: method,
        payment_status: status,
        ...(type ? { payment_type: type } : {}),
      });
      onDone(res.data.data, res.data.message);
    } catch (err) {
      setError(err?.message || 'Could not make the invoice.');
      setBusy(false);
    }
  };

  return (
    <div className="border border-gray-200 bg-gray-50 p-3 space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold text-gray-900">Invoice and deliver</p>
        <p className="text-sm text-gray-700">Total <b className="tabular-nums">{formatQar(job.total)}</b></p>
      </div>
      {job.services.length === 0 && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1.5">This job card has no services, so the invoice is for QAR 0. Add the services first with Back to work, or go ahead if the work is free.</p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label htmlFor="jc-inv-method">Payment method</label>
          <select id="jc-inv-method" value={method} onChange={(e) => setMethod(e.target.value)}>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="jc-inv-type">Payment type</label>
          <select id="jc-inv-type" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">None</option>
            {PAYMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <fieldset>
          <legend className="text-sm font-medium text-gray-700 mb-1">Payment</legend>
          <div className="flex gap-3 pt-1.5">
            {[['paid', 'Paid'], ['unpaid', 'Not paid yet']].map(([v, label]) => (
              <label key={v} className="flex items-center gap-1.5 text-sm font-normal">
                <input type="radio" name="jc-inv-status" value={v} checked={status === v} onChange={() => setStatus(v)} className="w-auto" />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      <p className="text-[11px] text-gray-500">This makes an order in Car Wash Orders (it counts in Day Close) and closes the job card as Delivered. It can only be done once.</p>
      {error && (
        <div className="flex items-start gap-2 px-3 py-2 text-xs bg-red-50 border border-red-200 text-red-700" role="alert">
          <AlertCircle className="w-4 h-4 shrink-0 mt-px" aria-hidden="true" /><span>{error}</span>
        </div>
      )}
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} disabled={busy} className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 hover:bg-gray-100">Back</button>
        <button type="button" onClick={submit} disabled={busy} className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-50">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Receipt className="w-4 h-4" aria-hidden="true" />} Make invoice
        </button>
      </div>
    </div>
  );
}

const receiptMessage = (job, order, url) => [
  `*Magic Track — Receipt for Order #${order.id}*`,
  '',
  `Hi ${job.customer.name}, thank you for choosing Magic Track!`,
  '',
  `Job card: ${job.job_number}`,
  `Car: ${[order.vehicle, order.numberPlate].filter(Boolean).join(' · ') || '—'}`,
  `Services: ${order.services.join(', ') || '—'}`,
  `Total: ${formatQar(order.total)} (${order.status === 'paid' ? 'Paid' : 'Unpaid'})`,
  '',
  `Your receipt (PDF): ${url}`,
].join('\n');

/** The order made from the job card, with "Send receipt on WhatsApp". */
export function InvoicedOrder({ job }) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [openLink, setOpenLink] = useState('');
  const [sent, setSent] = useState(false);
  if (!job.order) return null;
  const order = mapBookingToOrder(job.order);
  const number = toWhatsAppNumber(job.customer.phone);

  const send = async () => {
    setError('');
    setOpenLink('');
    setSent(false);
    if (!number) {
      setError('The customer has no valid WhatsApp number.');
      return;
    }
    // Opened during the click so it isn't blocked as a pop-up
    const tab = window.open('', '_blank');
    if (tab) {
      tab.opener = null;
      tab.document.title = 'Opening WhatsApp…';
      tab.document.body.innerHTML = '<p style="font:16px sans-serif;padding:24px">Preparing the receipt…</p>';
    }
    setSending(true);
    try {
      const url = await saveOrderReceipt(order);
      const link = getWhatsAppUrl(receiptMessage(job, order, url), number);
      if (tab && !tab.closed) tab.location.href = link;
      else setOpenLink(link);
      setSent(true);
    } catch (e) {
      tab?.close();
      setError(`Could not make the receipt: ${e.message || 'server error'}. Please try again.`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border border-violet-200 bg-violet-50 p-3 space-y-2">
      <p className="text-sm text-violet-900 flex items-center gap-1.5">
        <CheckCircle className="w-4 h-4" aria-hidden="true" />
        Invoiced as order <b>#{order.id}</b> · {formatQar(order.total)} · {order.status === 'paid' ? 'Paid' : 'Not paid yet'}
        {order.paymentMethod ? ` · ${[order.paymentMethod, order.paymentType].filter(Boolean).join(' · ')}` : ''}
      </p>
      {order.status !== 'paid' && <p className="text-xs text-violet-800">Mark it Paid in Car Wash Orders when the customer pays.</p>}
      <button
        type="button"
        onClick={send}
        disabled={sending}
        className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
      >
        {sending ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <MessageCircle className="w-4 h-4" aria-hidden="true" />}
        {sending ? 'Preparing receipt…' : 'Send receipt on WhatsApp'}
      </button>
      {error ? (
        <p className="text-xs text-red-700" role="alert">{error}</p>
      ) : openLink ? (
        <a href={openLink} target="_blank" rel="noopener noreferrer" className="block text-xs font-semibold text-green-700 underline">Receipt ready, click here to open WhatsApp</a>
      ) : sent ? (
        <p className="text-xs text-green-700" role="status">WhatsApp opened with the receipt. Press Send there.</p>
      ) : null}
    </div>
  );
}

/** "Tell the customer the car is ready" (opens WhatsApp with the message written). */
export function ReadyWhatsAppButton({ job, message }) {
  const number = toWhatsAppNumber(job.customer.phone);
  if (!number) return <p className="text-xs text-gray-500">The customer has no valid WhatsApp number to notify.</p>;
  return (
    <a
      href={getWhatsAppUrl(message, number)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-green-600 text-white hover:bg-green-700"
    >
      <MessageCircle className="w-4 h-4" aria-hidden="true" /> Tell the customer it&apos;s ready
    </a>
  );
}
