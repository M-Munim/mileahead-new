'use client';

import { useState } from 'react';
import { ShieldCheck, Printer, Pencil, Loader2, Save, AlertCircle } from 'lucide-react';
import { jobCardService } from '../../utils/axiosInstance';
import {
  TINT_FILMS, TINT_WINDOWS, TINT_SHADES, DEFAULT_WARRANTY_YEARS,
  warrantyNumber, installedOn, warrantyExpiry, cardDate, phoneText,
} from '../../utils/jobCards';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---- form values (strings) <-> API ----

/** Form values from a job card's tint_details (empty for a new one). */
export const tintFrom = (t) => ({
  film_brand: t?.film_brand || '',
  shades: Object.fromEntries(TINT_WINDOWS.map(([k]) => [k, t?.shades?.[k] != null ? String(t.shades[k]) : ''])),
  installed_on: t?.installed_on || '',
  warranty_years: String(t?.warranty_years || DEFAULT_WARRANTY_YEARS),
  authorized_by: t?.authorized_by || '',
});

/** Form values → the API's tint_details, or an error string. */
export function tintBody(v) {
  const shades = {};
  for (const [k, label] of TINT_WINDOWS) {
    const raw = String(v.shades[k] || '').trim().replace(/%$/, '');
    if (raw && (!/^\d{1,3}$/.test(raw) || Number(raw) > 100)) return `${label}: the shade must be a % from 0 to 100.`;
    shades[k] = raw;
  }
  const years = String(v.warranty_years || '').trim();
  if (!/^\d{1,2}$/.test(years) || Number(years) < 1 || Number(years) > 10) return 'Warranty must be from 1 to 10 years.';
  return {
    film_brand: v.film_brand,
    shades,
    installed_on: v.installed_on || '',
    warranty_years: years,
    authorized_by: v.authorized_by.trim(),
  };
}

/** "Front windshield 10% · Front side windows 20% · …" */
export const shadesText = (shades) =>
  TINT_WINDOWS.filter(([k]) => shades?.[k] != null && shades[k] !== '').map(([k, label]) => `${label} ${shades[k]}%`).join(' · ');

/** Film, shade per window and the warranty. Controlled: value / onChange (see tintFrom). */
export function TintFields({ value, onChange, idPrefix = 'tint' }) {
  const set = (key, v) => onChange({ ...value, [key]: v });
  const setShade = (k, v) => onChange({ ...value, shades: { ...value.shades, [k]: v.replace(/[^\d]/g, '').slice(0, 3) } });
  const expiry = warrantyExpiry(value.installed_on, value.warranty_years);

  return (
    <fieldset className="border border-[var(--primary)]/30 bg-[var(--primary-light)] p-3 space-y-3">
      <legend className="px-1 text-sm font-semibold text-gray-900">Window tint and warranty</legend>
      <div>
        <span className="block text-sm font-medium text-gray-700 mb-1">Film</span>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tint film">
          {TINT_FILMS.map((f) => (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={value.film_brand === f}
              onClick={() => set('film_brand', value.film_brand === f ? '' : f)}
              className={`py-2 text-sm font-medium border transition-colors ${
                value.film_brand === f ? 'border-[var(--primary)] bg-[var(--primary)] text-white' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="block text-sm font-medium text-gray-700 mb-1">Tint shade (%)</span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {TINT_WINDOWS.map(([k, label]) => (
            <div key={k}>
              <label htmlFor={`${idPrefix}-shade-${k}`} className="!text-xs !font-normal text-gray-600">{label}</label>
              <div className="relative">
                <input
                  id={`${idPrefix}-shade-${k}`}
                  list={`${idPrefix}-shades`}
                  inputMode="numeric"
                  value={value.shades[k]}
                  onChange={(e) => setShade(k, e.target.value)}
                  placeholder="e.g. 20"
                  className="pr-7 bg-white"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-gray-500" aria-hidden="true">%</span>
              </div>
            </div>
          ))}
        </div>
        <datalist id={`${idPrefix}-shades`}>{TINT_SHADES.map((s) => <option key={s} value={s} />)}</datalist>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label htmlFor={`${idPrefix}-installed`}>Installation date</label>
          <input id={`${idPrefix}-installed`} type="date" value={value.installed_on} onChange={(e) => set('installed_on', e.target.value)} className="bg-white" />
          <p className="mt-0.5 text-[11px] text-gray-500">Empty = the day it&apos;s invoiced.</p>
        </div>
        <div>
          <label htmlFor={`${idPrefix}-years`}>Warranty (years)</label>
          <input id={`${idPrefix}-years`} inputMode="numeric" value={value.warranty_years} onChange={(e) => set('warranty_years', e.target.value.replace(/[^\d]/g, '').slice(0, 2))} className="bg-white" />
          {expiry && <p className="mt-0.5 text-[11px] text-gray-500">Expires {cardDate(expiry)}</p>}
        </div>
        <div>
          <label htmlFor={`${idPrefix}-by`}>Authorized by</label>
          <input id={`${idPrefix}-by`} value={value.authorized_by} onChange={(e) => set('authorized_by', e.target.value)} maxLength={100} placeholder="Name on the card" className="bg-white" />
        </div>
      </div>
    </fieldset>
  );
}

/** Opens the warranty card (front) and its terms (back) in the print dialog. */
export function printWarranty(job) {
  const w = window.open('', '_blank', 'width=900,height=1000');
  if (!w) return;
  const t = job.tint_details || {};
  const installed = installedOn(job);
  const expiry = warrantyExpiry(installed, t.warranty_years);
  const years = t.warranty_years || DEFAULT_WARRANTY_YEARS;
  const v = job.vehicle || {};
  const makeModel = [v.make, v.model, v.year].filter(Boolean).join(' ') || v.vehicle_type || '';
  const shadeRows = TINT_WINDOWS.map(([k, label]) => `<div class="shade"><span>${esc(label)}</span><b>${t.shades?.[k] != null ? `${esc(t.shades[k])}%` : '—'}</b></div>`).join('');
  const line = (label, value) => `<div class="line"><span class="lbl">${esc(label)}</span><span class="val">${esc(value || '')}</span></div>`;
  const logo = `${window.location.origin}/magic-track-logo.png`;

  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Warranty ${esc(warrantyNumber(job))}</title>
<style>
  @page { size: A5 landscape; margin: 8mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #222; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .card { width: 194mm; height: 132mm; border: 1px solid #ccc; border-radius: 4mm; overflow: hidden; display: flex; flex-direction: column; page-break-after: always; }
  .head { background: #3a3a3a; color: #fff; display: flex; justify-content: space-between; align-items: center; padding: 5mm 7mm; border-bottom: 1.2mm solid #f7931e; }
  .head h1 { margin: 0; font-size: 20pt; letter-spacing: .5px; } .head h1 span { color: #f7931e; }
  .head .years { color: #f7931e; font-weight: bold; font-size: 11pt; margin-top: 1mm; }
  .wno { text-align: right; font-size: 9pt; } .wno b { display: block; background: #fff; color: #222; font-size: 13pt; padding: 1.5mm 4mm; margin-top: 1mm; border-radius: 1mm; }
  .body { flex: 1; display: flex; padding: 4mm 7mm; gap: 7mm; }
  .col { flex: 1; } .col + .col { border-left: 1px solid #bbb; padding-left: 7mm; }
  h2 { color: #c8742b; font-size: 10pt; margin: 0 0 2mm; text-transform: uppercase; }
  .line { display: flex; gap: 2mm; font-size: 9.5pt; margin-bottom: 2.2mm; } .lbl { white-space: nowrap; color: #444; }
  .val { flex: 1; border-bottom: 1px solid #555; font-weight: bold; min-height: 4.5mm; }
  .svc { font-weight: bold; font-size: 10pt; margin-bottom: 2.5mm; }
  .shade { display: flex; justify-content: space-between; font-size: 9pt; border-bottom: 1px dotted #999; padding: .8mm 0; }
  .dates { display: flex; padding: 0 7mm 2mm; gap: 7mm; } .dates div { flex: 1; text-align: center; font-size: 9pt; }
  .dates b { display: block; font-size: 12pt; margin-top: 1mm; }
  .sign { display: flex; padding: 2mm 7mm 3mm; gap: 7mm; align-items: flex-end; font-size: 8.5pt; color: #c8742b; font-weight: bold; }
  .sign > div { flex: 1; } .sign .by { color: #222; font-weight: bold; border-bottom: 1px solid #555; min-height: 5mm; font-size: 9.5pt; }
  .stamp { height: 15mm; border: 1px dashed #999; color: #999; display: flex; align-items: center; justify-content: center; font-weight: normal; }
  .foot { background: #3a3a3a; color: #fff; display: flex; align-items: center; justify-content: space-between; padding: 2.5mm 7mm; font-size: 9pt; }
  .foot b { color: #fff; font-size: 11pt; } .foot small { color: #f7931e; display: block; font-size: 7pt; font-weight: bold; }
  .foot img { height: 9mm; }
  .terms { padding: 6mm 8mm; } .terms h1 { font-size: 15pt; margin: 0 0 4mm; } .terms h1 span { color: #f7931e; }
  .two { display: flex; gap: 8mm; } .two > div { flex: 1; } ul { margin: 0; padding: 0; list-style: none; font-size: 9.5pt; } li { margin: 1.2mm 0; }
  .ok li::before { content: "✓  "; color: #2e7d32; font-weight: bold; } .no li::before { content: "✕  "; color: #c62828; font-weight: bold; }
  .terms p { font-size: 8.5pt; line-height: 1.45; margin: 1.5mm 0 4mm; } .terms h3 { color: #c8742b; font-size: 10pt; margin: 4mm 0 0; }
  .terms .sig { display: flex; gap: 10mm; font-size: 9pt; margin-top: 6mm; } .terms .sig div { flex: 1; border-top: 1px solid #555; padding-top: 1.5mm; }
</style></head><body>
<div class="card">
  <div class="head">
    <div><h1>WINDOW TINT <span>WARRANTY CARD</span></h1><div class="years">${esc(years)} YEAR WARRANTY</div></div>
    <div class="wno">WARRANTY NO.<b>${esc(warrantyNumber(job))}</b></div>
  </div>
  <div class="body">
    <div class="col">
      <h2>Customer details</h2>
      ${line('Customer Name:', job.customer?.name)}${line('Mobile No.:', phoneText(job.customer?.phone))}
      <h2 style="margin-top:3mm">Vehicle details</h2>
      ${line('Make / Model:', makeModel)}${line('Plate No.:', v.plate)}
    </div>
    <div class="col">
      <h2>Service provided</h2>
      <div class="svc">WINDOW TINTING</div>
      ${line('Film Brand:', t.film_brand)}
      <div class="lbl" style="font-size:9.5pt;margin-bottom:1mm">Tint Shade:</div>
      ${shadeRows}
    </div>
  </div>
  <div class="dates">
    <div>INSTALLATION DATE<b>${esc(cardDate(installed)) || '___ / ___ / ______'}</b></div>
    <div>WARRANTY EXPIRY DATE<b>${esc(cardDate(expiry)) || '___ / ___ / ______'}</b></div>
  </div>
  <div class="sign">
    <div>AUTHORIZED BY<div class="by">${esc(t.authorized_by || '')}</div></div>
    <div class="stamp">COMPANY STAMP</div>
    <div>CUSTOMER SIGNATURE<div class="by"></div></div>
  </div>
  <div class="foot">
    <div><b>5170 1605</b><small>MOBILE</small></div>
    <div><b>4052 1406</b><small>LANDLINE</small></div>
    <div><small>FOLLOW US ON INSTAGRAM</small>@magic.track.qa</div>
    <img src="${esc(logo)}" alt="Magic Track">
  </div>
</div>
<div class="card terms">
  <h1>WINDOW TINT <span>WARRANTY TERMS &amp; CONDITIONS</span> · ${esc(years)} YEAR WARRANTY</h1>
  <div class="two">
    <div><h3 style="color:#2e7d32;margin-top:0">THIS ${esc(years)}-YEAR WARRANTY COVERS:</h3>
      <ul class="ok"><li>Peeling</li><li>Bubbling</li><li>Cracking</li><li>Delamination</li><li>Excessive Fading</li><li>Manufacturing Defects</li></ul></div>
    <div><h3 style="color:#c62828;margin-top:0">WARRANTY DOES NOT COVER:</h3>
      <ul class="no"><li>Accidents or Collisions</li><li>Misuse or Negligence</li><li>Damage Caused by Third-Party Work</li><li>Improper Cleaning or Maintenance</li><li>Intentional Damage</li></ul></div>
  </div>
  <h3>QATAR COMPLIANCE NOTICE</h3>
  <p>The vehicle owner is responsible for ensuring compliance with all applicable Qatar traffic laws and regulations regarding window tinting, including the legal tint percentage limits. Warranty coverage applies only to product and installation defects and does not cover fines, penalties, inspection failures, or legal compliance issues. The warranty must always be presented in original copy with the invoice.</p>
  <h3>CUSTOMER ACCEPTANCE</h3>
  <p>I confirm that the service has been completed to my satisfaction and I have received the warranty information.</p>
  <div class="sig"><div>Customer Signature</div><div>Authorized Representative</div></div>
  <div class="sig" style="margin-top:8mm"><div>Date: ${esc(cardDate(installed))}</div><div>Date: ${esc(cardDate(installed))}</div></div>
</div>
</body></html>`);
  w.document.close();
  w.focus();
  // let the logo load before printing
  setTimeout(() => w.print(), 400);
}

/**
 * The tint details on a job card (read only), the "Warranty card" print
 * button, and, once delivered, editing just these details.
 */
export function TintSummary({ job, onChanged }) {
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const t = job.tint_details || {};
  const installed = installedOn(job);
  const expiry = warrantyExpiry(installed, t.warranty_years);
  const canEditHere = job.status === 'delivered';

  const save = async () => {
    const body = tintBody(editing);
    if (typeof body === 'string') return setError(body);
    setBusy(true);
    setError('');
    try {
      const res = await jobCardService.update(job.id, { tint_details: body });
      setEditing(null);
      onChanged(res.data.data, 'Warranty details saved');
    } catch (err) {
      setError(err?.message || 'Could not save.');
    } finally {
      setBusy(false);
    }
  };

  if (editing) {
    return (
      <div className="space-y-2">
        <TintFields value={editing} onChange={setEditing} idPrefix="tint-edit" />
        {error && (
          <div className="flex items-start gap-2 px-3 py-2 text-xs bg-red-50 border border-red-200 text-red-700" role="alert">
            <AlertCircle className="w-4 h-4 shrink-0 mt-px" aria-hidden="true" /><span>{error}</span>
          </div>
        )}
        <div className="flex gap-2">
          <button type="button" onClick={() => { setEditing(null); setError(''); }} className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 hover:bg-gray-100">Cancel</button>
          <button type="button" onClick={save} disabled={busy} className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-50">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Save className="w-4 h-4" aria-hidden="true" />} Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
        <p className="text-[11px] font-semibold text-gray-500 flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" /> Window tint · Warranty {warrantyNumber(job)}</p>
        <div className="flex gap-1.5">
          {canEditHere && (
            <button type="button" onClick={() => { setEditing(tintFrom(job.tint_details)); setError(''); }} className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-700 border border-gray-300 hover:bg-gray-50">
              <Pencil className="w-3.5 h-3.5" aria-hidden="true" /> Edit
            </button>
          )}
          <button type="button" onClick={() => printWarranty(job)} className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)]">
            <Printer className="w-3.5 h-3.5" aria-hidden="true" /> Warranty card
          </button>
        </div>
      </div>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <div><dt className="inline text-gray-500">Film: </dt><dd className="inline text-gray-900">{t.film_brand || '—'}</dd></div>
        <div><dt className="inline text-gray-500">Warranty: </dt><dd className="inline text-gray-900">{t.warranty_years || DEFAULT_WARRANTY_YEARS} years{t.authorized_by ? ` · by ${t.authorized_by}` : ''}</dd></div>
        <div className="sm:col-span-2"><dt className="inline text-gray-500">Shades: </dt><dd className="inline text-gray-900">{shadesText(t.shades) || '—'}</dd></div>
        <div><dt className="inline text-gray-500">Installed: </dt><dd className="inline text-gray-900">{installed ? cardDate(installed) : 'when invoiced'}</dd></div>
        <div><dt className="inline text-gray-500">Expires: </dt><dd className="inline text-gray-900">{expiry ? cardDate(expiry) : '—'}</dd></div>
      </dl>
      {!t.film_brand && <p className="mt-1.5 text-[11px] text-amber-800">Fill in the film and shades (Edit details) before printing the warranty card.</p>}
    </div>
  );
}
