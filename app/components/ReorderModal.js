'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, ShoppingBag, MessageCircle, Copy, Printer, Check } from 'lucide-react';
import { useFocusTrap } from '@/app/hooks/useFocusTrap';
import { copyText, getWhatsAppUrl } from '../../utils/location';
import { qty, reorderGroups, reorderText, suggestedOrder } from '../../utils/inventory';

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/**
 * The low-stock items, grouped by supplier, with an amount to order for each
 * (a suggestion staff can change). Each supplier's list can go out on
 * WhatsApp (to the supplier's saved number) or be copied; the whole list prints.
 */
export default function ReorderModal({ items, onClose }) {
  const modalRef = useFocusTrap(true, onClose);
  const groups = useMemo(() => reorderGroups(items), [items]);
  const [amounts, setAmounts] = useState(() => Object.fromEntries(
    items.filter((i) => i.low_stock).map((i) => [i.id, String(suggestedOrder(i))]),
  ));
  const [copied, setCopied] = useState('');

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const copy = async (g) => {
    if (await copyText(reorderText(g, amounts))) {
      setCopied(g.supplier);
      setTimeout(() => setCopied(''), 1500);
    }
  };

  const whatsapp = (g) => window.open(getWhatsAppUrl(reorderText(g, amounts), g.phone), '_blank', 'noopener,noreferrer');

  const print = () => {
    const w = window.open('', '_blank', 'width=800,height=900');
    if (!w) return;
    const body = groups.map((g) => `
      <h2>${escapeHtml(g.supplier || 'No supplier saved')}${g.phone ? ` <small>+${escapeHtml(g.phone)}</small>` : ''}</h2>
      <table><thead><tr><th>Item</th><th>Code</th><th>In stock</th><th>Order</th></tr></thead><tbody>
      ${g.items.map((i) => `<tr><td>${escapeHtml(i.name)}</td><td>${escapeHtml(i.code || '')}</td><td>${escapeHtml(`${qty(i.quantity)} ${i.unit}`)}</td><td><b>${escapeHtml(`${amounts[i.id] || suggestedOrder(i)} ${i.unit}`)}</b></td></tr>`).join('')}
      </tbody></table>`).join('');
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Magic Track — Reorder list</title>
      <style>body{font-family:Arial,sans-serif;padding:24px;color:#111}h1{font-size:20px;margin:0 0 4px}p{color:#555;margin:0 0 16px}
      h2{font-size:15px;margin:20px 0 6px}small{font-weight:normal;color:#555}table{width:100%;border-collapse:collapse;font-size:13px}
      th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}th{background:#f3f3f3}</style></head>
      <body><h1>Magic Track — Reorder list</h1><p>${escapeHtml(new Date().toLocaleString('en-GB'))}</p>${body}</body></html>`);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <div className="fixed inset-0 bg-black/40 modal-backdrop z-50 flex items-center justify-center p-4">
      <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="reorder-title" className="bg-white shadow-xl w-full max-w-2xl max-h-[92vh] flex flex-col animate-fade-in-scale">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-[var(--primary)]" aria-hidden="true" />
            <div>
              <h2 id="reorder-title" className="text-base font-semibold text-gray-900">Reorder list</h2>
              <p className="text-xs text-gray-500">Items at or below their alert level. Change the amounts, then send each supplier their list.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="btn-icon p-1.5 hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          {groups.length === 0 && <p className="py-8 text-center text-sm text-gray-500">Nothing is low on stock.</p>}
          {groups.map((g) => (
            <section key={g.supplier || '-'} className="border border-gray-200">
              <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                <div className="mr-auto min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900">{g.supplier || 'No supplier saved'}</h3>
                  <p className="text-[11px] text-gray-500">{g.phone ? `+${g.phone}` : 'No phone saved: WhatsApp lets you pick the contact'}</p>
                </div>
                <button type="button" onClick={() => whatsapp(g)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-[#25D366] hover:bg-[#1ebe5a] transition-colors">
                  <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" /> WhatsApp
                </button>
                <button type="button" onClick={() => copy(g)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors">
                  {copied === g.supplier ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : <Copy className="w-3.5 h-3.5" aria-hidden="true" />}
                  {copied === g.supplier ? 'Copied' : 'Copy'}
                </button>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-gray-500 border-b border-gray-100">
                    <th className="px-4 py-2">Item</th>
                    <th className="px-3 py-2 text-right">In stock</th>
                    <th className="px-4 py-2 text-right">Order</th>
                  </tr>
                </thead>
                <tbody>
                  {g.items.map((i) => (
                    <tr key={i.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-2">
                        <span className="text-gray-900">{i.name}</span>
                        {i.code && <span className="ml-1.5 font-mono text-[11px] text-gray-500">{i.code}</span>}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap text-red-700">
                        {qty(i.quantity)} {i.unit}
                        <span className="block text-[11px] text-gray-500">alert at {qty(i.min_quantity)}</span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-end gap-1.5">
                          <input
                            inputMode="decimal"
                            value={amounts[i.id] ?? ''}
                            onChange={(e) => setAmounts((a) => ({ ...a, [i.id]: e.target.value }))}
                            aria-label={`Amount of ${i.name} to order`}
                            className="!w-20 text-right"
                          />
                          <span className="text-xs text-gray-500 w-12">{i.unit}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-5 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
            Close
          </button>
          {groups.length > 0 && (
            <button type="button" onClick={print} className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors">
              <Printer className="w-4 h-4" aria-hidden="true" /> Print list
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
