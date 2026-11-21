'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Wallet, Loader2, AlertCircle, Plus, Undo2 } from 'lucide-react';
import { useFocusTrap } from '@/app/hooks/useFocusTrap';
import { useAuth } from '../contexts/AuthContext';
import { walletService } from '../../utils/axiosInstance';
import { WALLET_PAY_METHODS, TXN_META, formatQar } from '../../utils/wallet';

/** "21 Nov 2026, 3:05 PM" */
const formatWhen = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
};

const toNumber = (v) => {
  const n = Number(String(v ?? '').trim());
  return Number.isFinite(n) ? n : 0;
};

/**
 * One customer's wallet: balance, add balance (top-up with an optional bonus),
 * refund (Super Admin) and the statement. `customer` = { name, phone }.
 * `onChanged(wallet)` runs after every top-up or refund.
 */
export default function WalletModal({ customer, onClose, onChanged }) {
  const modalRef = useFocusTrap(true, onClose);
  const { hasPermission } = useAuth();
  const canRefund = hasPermission('canRefundWallet');

  const [data, setData] = useState(null); // { wallet, transactions }
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [mode, setMode] = useState('topup'); // topup | refund
  const [form, setForm] = useState({ amount: '', bonus: '', method: 'Cash', note: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [done, setDone] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await walletService.get(customer.phone);
      setData(res.data.data);
      setLoadError('');
    } catch (err) {
      setLoadError(err?.message || 'Could not load the wallet.');
    } finally {
      setLoading(false);
    }
  }, [customer.phone]);

  useEffect(() => { load(); }, [load]);

  const balance = data?.wallet?.balance ?? 0;
  const amount = toNumber(form.amount);
  const bonus = mode === 'topup' ? toNumber(form.bonus) : 0;
  const set = (key) => (e) => { setForm((f) => ({ ...f, [key]: e.target.value })); setFormError(''); setDone(''); };

  const switchMode = (next) => {
    setMode(next);
    setForm({ amount: '', bonus: '', method: 'Cash', note: '' });
    setFormError('');
    setDone('');
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!(amount > 0)) { setFormError('Enter the amount.'); return; }
    if (mode === 'topup' && bonus > amount) { setFormError('The bonus can’t be more than the amount paid.'); return; }
    if (mode === 'refund' && amount > balance) { setFormError(`The wallet only has ${formatQar(balance)}.`); return; }
    if (mode === 'refund' && !form.note.trim()) { setFormError('Write why the balance is refunded.'); return; }

    setSaving(true);
    try {
      const body = { phone: customer.phone, amount: form.amount.trim(), payment_method: form.method, note: form.note.trim() || undefined };
      const res = mode === 'topup'
        ? await walletService.topUp({ ...body, name: customer.name, bonus: form.bonus.trim() || undefined })
        : await walletService.refund(body);
      const wallet = res.data.data;
      setDone(mode === 'topup'
        ? `Added ${formatQar(amount + bonus)}. New balance ${formatQar(wallet.balance)}.`
        : `Refunded ${formatQar(amount)}. New balance ${formatQar(wallet.balance)}.`);
      setForm({ amount: '', bonus: '', method: form.method, note: '' });
      onChanged?.(wallet);
      await load();
    } catch (err) {
      setFormError(err?.message || 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const transactions = data?.transactions || [];

  return (
    <div className="fixed inset-0 bg-black/40 modal-backdrop z-50 flex items-center justify-center p-4">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wallet-title"
        className="bg-white shadow-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto animate-fade-in-scale"
      >
        <div className="sticky top-0 z-10 bg-white flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5 text-[var(--primary)]" aria-hidden="true" />
            </div>
            <div>
              <h2 id="wallet-title" className="text-base font-semibold text-gray-900">Wallet · {customer.name || 'Customer'}</h2>
              <p className="text-xs text-gray-500 mt-0.5">{customer.phone}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="btn-icon p-1.5 hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {loading ? (
            <div className="text-center py-10 text-gray-500">
              <Loader2 className="w-7 h-7 mx-auto mb-2 text-[var(--primary)] animate-spin" aria-hidden="true" />
              <p className="text-sm">Loading wallet…</p>
            </div>
          ) : loadError ? (
            <div className="px-3 py-2 flex items-center gap-2 text-sm bg-red-50 border border-red-200 text-red-700" role="alert">
              <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="mr-auto">{loadError}</span>
              <button type="button" onClick={() => { setLoading(true); load(); }} className="text-xs font-semibold underline">Try again</button>
            </div>
          ) : (
            <>
              {/* Balance */}
              <div className="bg-[var(--primary-light)] border border-[var(--primary)]/20 px-5 py-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <span className="block text-xs text-gray-600">Balance</span>
                  <span className="block text-3xl font-bold text-gray-900" aria-live="polite">{formatQar(balance)}</span>
                </div>
                {!data?.wallet && <span className="text-xs text-gray-500">No wallet yet. It starts with the first top-up.</span>}
              </div>

              {/* Add balance / refund */}
              <form onSubmit={submit} className="border border-gray-200 px-4 py-4">
                <div className="flex gap-2 mb-3" role="tablist" aria-label="Wallet action">
                  <button
                    type="button" role="tab" aria-selected={mode === 'topup'} onClick={() => switchMode('topup')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border transition-colors ${mode === 'topup' ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                  >
                    <Plus className="w-4 h-4" aria-hidden="true" /> Add balance
                  </button>
                  {canRefund && (
                    <button
                      type="button" role="tab" aria-selected={mode === 'refund'} onClick={() => switchMode('refund')}
                      disabled={!(balance > 0)}
                      title={balance > 0 ? 'Pay unused balance back to the customer' : 'Nothing to refund'}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border transition-colors disabled:opacity-45 disabled:cursor-not-allowed ${mode === 'refund' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                    >
                      <Undo2 className="w-4 h-4" aria-hidden="true" /> Refund
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="w-amount">{mode === 'topup' ? 'Customer pays (QAR)' : 'Refund (QAR)'}</label>
                    <input id="w-amount" type="number" inputMode="decimal" min="0" step="0.01" value={form.amount} onChange={set('amount')} placeholder="500" />
                  </div>
                  {mode === 'topup' && (
                    <div>
                      <label htmlFor="w-bonus">Bonus (QAR) <span className="font-normal text-gray-500">optional</span></label>
                      <input id="w-bonus" type="number" inputMode="decimal" min="0" step="0.01" value={form.bonus} onChange={set('bonus')} placeholder="0" />
                    </div>
                  )}
                  <div>
                    <label htmlFor="w-method">{mode === 'topup' ? 'Paid by' : 'Paid back by'}</label>
                    <select id="w-method" value={form.method} onChange={set('method')}>
                      {WALLET_PAY_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
                <div className="mt-3">
                  <label htmlFor="w-note">Note {mode === 'topup' && <span className="font-normal text-gray-500">optional</span>}</label>
                  <input
                    id="w-note" type="text" maxLength={255} value={form.note} onChange={set('note')}
                    placeholder={mode === 'topup' ? 'e.g. Monthly package' : 'Why is the balance refunded?'}
                  />
                </div>

                {amount > 0 && (
                  <p className="text-sm text-gray-700 mt-3">
                    {mode === 'topup'
                      ? <>Customer pays <b>{formatQar(amount)}</b>{bonus > 0 && <>, gets <b>{formatQar(amount + bonus)}</b></>}. New balance <b>{formatQar(balance + amount + bonus)}</b>.</>
                      : <>New balance <b>{formatQar(Math.max(0, balance - amount))}</b>.</>}
                  </p>
                )}
                {formError && <p className="text-sm text-red-600 mt-2" role="alert">{formError}</p>}
                {done && <p className="text-sm text-green-700 mt-2" role="status">{done}</p>}

                <div className="flex justify-end mt-3">
                  <button
                    type="submit" disabled={saving}
                    className={`flex items-center gap-1.5 px-5 py-2 text-sm font-medium text-white transition-colors disabled:opacity-60 ${mode === 'topup' ? 'bg-[var(--primary)] hover:bg-[var(--primary-hover)]' : 'bg-red-600 hover:bg-red-700'}`}
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                    {mode === 'topup' ? 'Add balance' : 'Refund'}
                  </button>
                </div>
              </form>

              {/* Statement */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Statement</h3>
                {transactions.length === 0 ? (
                  <p className="text-sm text-gray-500 border border-dashed border-gray-200 px-4 py-6 text-center">No wallet activity yet.</p>
                ) : (
                  <div className="overflow-x-auto border border-gray-200">
                    <table className="w-full border-collapse min-w-[560px]">
                      <thead>
                        <tr>
                          {['Date', 'What', 'Amount', 'Balance', 'By'].map((h) => (
                            <th key={h} className={`text-[10px] uppercase tracking-wide text-gray-500 font-semibold bg-gray-50 px-3 py-2 border-b border-gray-200 ${h === 'Amount' || h === 'Balance' ? 'text-right' : 'text-left'}`}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map((t) => {
                          const meta = TXN_META[t.type] || { label: t.type };
                          return (
                            <tr key={t.id} className="border-b border-gray-100 last:border-0">
                              <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{formatWhen(t.created_at)}</td>
                              <td className="px-3 py-2 text-sm text-gray-800">
                                {meta.label}
                                {t.payment_method && <span className="text-gray-500"> · {t.payment_method}</span>}
                                {t.booking_id && <span className="text-gray-500"> · order #{t.booking_id}</span>}
                                {t.note && <span className="block text-xs text-gray-500">{t.note}</span>}
                              </td>
                              <td className={`px-3 py-2 text-sm font-semibold text-right whitespace-nowrap ${t.amount < 0 ? 'text-red-600' : 'text-green-700'}`}>
                                {t.amount < 0 ? '−' : '+'}{formatQar(Math.abs(t.amount))}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-800 text-right whitespace-nowrap">{formatQar(t.balance_after)}</td>
                              <td className="px-3 py-2 text-xs text-gray-600">{t.created_by || '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
