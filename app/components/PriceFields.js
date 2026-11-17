'use client';

import { priceKeys, priceLabel, MAX_VALUE } from '../../utils/broadcastText';

/**
 * One input per price blank in `body` ({{price_1}} …). Controlled:
 * `values` = { price_1: '100' }, `onChange(nextValues)`. Renders nothing when
 * the message has no price blanks.
 */
export default function PriceFields({ body, values = {}, onChange, idPrefix, title, hint, required = false }) {
  const keys = priceKeys(body);
  if (!keys.length) return null;
  return (
    <fieldset className="border border-gray-200 p-3">
      <legend className="px-1 text-sm font-medium text-gray-700">
        {title}{required && <span className="text-red-500" aria-hidden="true"> *</span>}
      </legend>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {keys.map((key) => (
          <div key={key}>
            <label htmlFor={`${idPrefix}-${key}`} className="!text-xs">
              {priceLabel(key)} <span className="font-mono font-normal text-gray-400">{`{{${key}}}`}</span>
            </label>
            <input
              id={`${idPrefix}-${key}`}
              dir="auto"
              autoComplete="off"
              maxLength={MAX_VALUE}
              value={values[key] ?? ''}
              onChange={(e) => onChange({ ...values, [key]: e.target.value })}
              placeholder="e.g. 100"
              aria-required={required || undefined}
            />
          </div>
        ))}
      </div>
      {hint && <p className="mt-2 text-[11px] text-gray-500">{hint}</p>}
    </fieldset>
  );
}
