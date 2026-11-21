// Customer wallet: a prepaid balance in QAR, one per phone number.

/** How a top-up is paid (and a refund paid back). */
export const WALLET_PAY_METHODS = ['Cash', 'Card', 'Fawran'];

/** Statement wording for each kind of wallet change. */
export const TXN_META = {
  topup: { label: 'Top-up' },
  bonus: { label: 'Bonus' },
  payment: { label: 'Paid for an order' },
  reversal: { label: 'Order payment returned' },
  refund: { label: 'Refunded to customer' },
};

/** "QAR 1,250" or "QAR 12.50" */
export const formatQar = (n) => {
  const v = Math.round((Number(n) || 0) * 100) / 100;
  return `QAR ${v.toLocaleString('en-US', { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 })}`;
};

/** Last 8 digits: matches a Qatar number however it was typed (wallets store 974…). */
export const phoneKey = (phone) => String(phone || '').replace(/\D/g, '').slice(-8);

/** phoneKey → wallet, for looking up a customer's balance. */
export const walletsByPhone = (wallets) => new Map((wallets || []).map((w) => [phoneKey(w.phone), w]));
