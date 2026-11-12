'use client';

import { useState, useEffect } from 'react';
import { X, Save, Loader2, AlertCircle, PackagePlus, Pencil } from 'lucide-react';
import { useFocusTrap } from '@/app/hooks/useFocusTrap';
import { UNITS, CATEGORIES, readAmount } from '../../utils/inventory';

/**
 * Add or edit an inventory item. Staff pick one of the client's categories
 * first (an older item keeps its own category as an option). `item` = the
 * item to edit, or null for a new one. `onSubmit(body)` saves and closes; it
 * throws { message } to show an error here.
 */
export default function InventoryItemModal({ item, onClose, onSubmit }) {
  const modalRef = useFocusTrap(true, onClose);
  const editing = !!item;
  const categoryOptions = item?.category && !CATEGORIES.includes(item.category) ? [...CATEGORIES, item.category] : CATEGORIES;
  const [name, setName] = useState(item?.name || '');
  const [code, setCode] = useState(item?.code || '');
  const [supplierPhone, setSupplierPhone] = useState(item?.supplier_phone ? `+${item.supplier_phone}` : '');
  const [kind, setKind] = useState(item?.kind || 'supply');
  const [category, setCategory] = useState(item?.category || '');
  const [unit, setUnit] = useState(item?.unit || 'piece');
  const [opening, setOpening] = useState('');
  const [minQty, setMinQty] = useState(item ? String(item.min_quantity ?? 0) : '');
  const [cost, setCost] = useState(item?.cost_price != null ? String(item.cost_price) : '');
  const [sell, setSell] = useState(item?.sell_price != null ? String(item.sell_price) : '');
  const [supplier, setSupplier] = useState(item?.supplier || '');
  const [notes, setNotes] = useState(item?.notes || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    const checks = [
      [!category, 'Please select the category.'],
      [!name.trim(), 'Please enter the item name.'],
      [!unit.trim(), 'Please enter the unit (e.g. bottle).'],
      [code.trim() && !/^[A-Za-z0-9][A-Za-z0-9._\-/]{0,39}$/.test(code.trim()), 'Stock number: letters, numbers and . _ - / only, no spaces.'],
      [cost.trim() && readAmount(cost) === null, 'Price must be a number, e.g. 45 or 12.50.'],
      [supplierPhone.trim() && supplierPhone.replace(/\D/g, '').length < 8, 'Supplier phone looks too short.'],
      [!editing && opening.trim() && readAmount(opening) === null, 'Stock now must be a number (up to 2 decimals).'],
      [minQty.trim() && readAmount(minQty) === null, 'Low-stock alert must be a number.'],
      [sell.trim() && readAmount(sell) === null, 'Selling price must be a number, e.g. 25.'],
      [kind === 'product' && !sell.trim(), 'Please enter the selling price for an item for sale.'],
    ];
    const problem = checks.find(([bad]) => bad);
    if (problem) {
      setError(problem[1]);
      return;
    }
    const body = {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      supplier_phone: supplierPhone.trim(),
      kind,
      category: category.trim(),
      unit: unit.trim(),
      min_quantity: minQty.trim() ? readAmount(minQty) : 0,
      cost_price: cost.trim() ? readAmount(cost) : null,
      sell_price: kind === 'product' && sell.trim() ? readAmount(sell) : null,
      supplier: supplier.trim(),
      notes: notes.trim(),
      ...(!editing && opening.trim() ? { quantity: readAmount(opening) } : {}),
    };
    setSaving(true);
    setError('');
    try {
      await onSubmit(body);
    } catch (err) {
      setError(err?.message || 'Could not save the item.');
      setSaving(false);
    }
  };

  const Icon = editing ? Pencil : PackagePlus;

  return (
    <div className="fixed inset-0 bg-black/40 modal-backdrop z-50 flex items-center justify-center p-4">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="inv-item-title"
        className="bg-white shadow-xl w-full max-w-xl max-h-[92vh] flex flex-col animate-fade-in-scale"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <Icon className="w-5 h-5 text-[var(--primary)]" aria-hidden="true" />
            <h2 id="inv-item-title" className="text-base font-semibold text-gray-900">{editing ? `Edit ${item.name}` : 'Add item'}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="btn-icon p-1.5 hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto" noValidate>
          <fieldset disabled={saving} className="space-y-4">
            <div>
              <label htmlFor="inv-category">Category<span className="text-red-500" aria-hidden="true"> *</span></label>
              <select id="inv-category" value={category} onChange={(e) => setCategory(e.target.value)} autoFocus={!editing}>
                <option value="">Select a category…</option>
                {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_150px] gap-4">
              <div>
                <label htmlFor="inv-name">Item name<span className="text-red-500" aria-hidden="true"> *</span></label>
                <input id="inv-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={150} placeholder="e.g. Ceramic coating 50ml" />
              </div>
              <div>
                <label htmlFor="inv-code">Stock number</label>
                <input id="inv-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={40} placeholder="e.g. PL-001" className="font-mono" />
              </div>
            </div>

            <div>
              <span className="block text-sm font-medium text-gray-700 mb-1">Type</span>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Type">
                {[
                  ['supply', 'Wash supply', 'Used in washing'],
                  ['product', 'For sale', 'Sold to customers'],
                ].map(([value, label, hint]) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={kind === value}
                    onClick={() => setKind(value)}
                    className={`px-3 py-2 text-left border transition-colors ${
                      kind === value ? 'border-[var(--primary)] bg-[var(--primary)]/5' : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className="block text-sm font-medium text-gray-900">{label}</span>
                    <span className="block text-[11px] text-gray-500">{hint}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="inv-unit">Unit<span className="text-red-500" aria-hidden="true"> *</span></label>
                <input id="inv-unit" list="inv-units" value={unit} onChange={(e) => setUnit(e.target.value)} maxLength={30} placeholder="bottle" />
                <datalist id="inv-units">
                  {UNITS.map((u) => <option key={u} value={u} />)}
                </datalist>
              </div>
              {!editing && (
                <div>
                  <label htmlFor="inv-opening">Stock now</label>
                  <input id="inv-opening" inputMode="decimal" value={opening} onChange={(e) => setOpening(e.target.value)} placeholder="0" />
                  <p className="mt-1 text-[11px] text-gray-500">How many are on the shelf today.</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="inv-min">Low-stock alert at</label>
                <input id="inv-min" inputMode="decimal" value={minQty} onChange={(e) => setMinQty(e.target.value)} placeholder="0" />
                <p className="mt-1 text-[11px] text-gray-500">Marked &quot;Low&quot; at this amount or less.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="inv-cost">Price per {unit.trim() || 'unit'} (QAR)</label>
                <input id="inv-cost" inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="e.g. 45" />
              </div>
              {kind === 'product' && (
                <div>
                  <label htmlFor="inv-sell">Selling price per {unit.trim() || 'unit'} (QAR)<span className="text-red-500" aria-hidden="true"> *</span></label>
                  <input id="inv-sell" inputMode="decimal" value={sell} onChange={(e) => setSell(e.target.value)} placeholder="e.g. 25" />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="inv-supplier">Supplier</label>
                <input id="inv-supplier" value={supplier} onChange={(e) => setSupplier(e.target.value)} maxLength={150} placeholder="Company or shop name" />
              </div>
              <div>
                <label htmlFor="inv-supplier-phone">Supplier phone / WhatsApp</label>
                <input id="inv-supplier-phone" type="tel" dir="ltr" value={supplierPhone} onChange={(e) => setSupplierPhone(e.target.value)} maxLength={20} placeholder="+974 5512 3456" />
                <p className="mt-1 text-[11px] text-gray-500">Used to send the reorder list.</p>
              </div>
            </div>
            <div>
              <label htmlFor="inv-notes">Notes</label>
              <input id="inv-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={255} placeholder="Optional" />
            </div>

            {error && (
              <div className="flex items-start gap-2 px-3 py-2 text-xs bg-red-50 border border-red-200 text-red-700" role="alert">
                <AlertCircle className="w-4 h-4 shrink-0 mt-px" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}
          </fieldset>

          <div className="form-footer">
            <button type="button" onClick={onClose} className="px-5 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-5 py-2 text-sm font-medium bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors flex items-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Save className="w-4 h-4" aria-hidden="true" />}
              {editing ? 'Save changes' : 'Add item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
