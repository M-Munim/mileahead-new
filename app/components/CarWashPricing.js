'use client';

import { useState, useEffect, useCallback } from 'react';
import { Package, Car, PlusCircle, Save, RotateCcw, AlertCircle } from 'lucide-react';
import { packageService, vehicleService, addonService } from '../../utils/axiosInstance';
import { extractArray } from '../../utils/extractArray';
import Toast from './Toast';

/**
 * Car wash pricing editor.
 *
 * Unlike the ride-plan calculator on this page, these prices are real: they are
 * read from and written back to the live API, and they drive what customers are
 * actually charged for a car wash booking.
 *
 * Packages and add-ons are sent as JSON. Vehicles go as multipart/form-data
 * because that endpoint also takes an image — we leave the file out so the
 * existing image is kept.
 */

const GROUPS = [
  {
    key: 'packages',
    title: 'Packages',
    description: 'Wash tiers a customer picks from.',
    icon: Package,
    service: packageService,
    nameField: 'package_name',
    buildBody: (row, price) => ({
      package_name: row.package_name,
      price,
      description: row.description ?? '',
    }),
  },
  {
    key: 'vehicles',
    title: 'Vehicle Types',
    description: 'Surcharge added on top of the package, by vehicle size.',
    icon: Car,
    service: vehicleService,
    nameField: 'vehicle_name',
    buildBody: (row, price) => {
      // FormData, not JSON — and no `images` key, so the current image survives.
      const fd = new FormData();
      fd.append('vehicle_name', row.vehicle_name ?? '');
      fd.append('price', String(price));
      return fd;
    },
  },
  {
    key: 'addons',
    title: 'Add-ons',
    description: 'Optional extras a customer can attach to a booking.',
    icon: PlusCircle,
    service: addonService,
    nameField: 'name',
    buildBody: (row, price) => ({
      name: row.name,
      price,
      description: row.description ?? '',
    }),
  },
];

/** The API returns price as a string ("35.00"); normalise for display. */
function toPriceInput(value) {
  const n = Number(value);
  return Number.isFinite(n) ? String(n) : '';
}

export default function CarWashPricing() {
  const [rows, setRows] = useState({ packages: [], vehicles: [], addons: [] });
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const responses = await Promise.all(GROUPS.map((g) => g.service.getAll()));
      const next = {};
      const nextDrafts = {};
      GROUPS.forEach((group, i) => {
        const list = extractArray(responses[i]);
        next[group.key] = list;
        list.forEach((row) => {
          nextDrafts[`${group.key}:${row.id}`] = toPriceInput(row.price);
        });
      });
      setRows(next);
      setDrafts(nextDrafts);
    } catch (error) {
      setLoadError(error?.message || 'Could not load car wash prices.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDraftChange = (groupKey, id, value) => {
    setDrafts((prev) => ({ ...prev, [`${groupKey}:${id}`]: value }));
  };

  const handleSave = async (group, row) => {
    const key = `${group.key}:${row.id}`;
    const raw = drafts[key];
    const price = Number(raw);

    if (raw === '' || !Number.isFinite(price) || price < 0) {
      setToast({ message: 'Enter a valid price of 0 or more.', type: 'error' });
      return;
    }

    setSavingId(key);
    try {
      await group.service.update(row.id, group.buildBody(row, price));

      // Reflect the saved value locally so the row is no longer "changed".
      setRows((prev) => ({
        ...prev,
        [group.key]: prev[group.key].map((item) =>
          item.id === row.id ? { ...item, price: price.toFixed(2) } : item
        ),
      }));
      setDrafts((prev) => ({ ...prev, [key]: String(price) }));

      setToast({
        message: `${row[group.nameField]} updated to ${price.toFixed(2)} QAR.`,
        type: 'success',
      });
    } catch (error) {
      setToast({
        message: error?.message || `Could not update ${row[group.nameField]}.`,
        type: 'error',
      });
    } finally {
      setSavingId(null);
    }
  };

  const handleReset = (group, row) => {
    setDrafts((prev) => ({
      ...prev,
      [`${group.key}:${row.id}`]: toPriceInput(row.price),
    }));
  };

  if (loading) {
    return (
      <div className="bg-white shadow-sm border border-gray-100 p-12 text-center">
        <div className="inline-block w-8 h-8 border-2 border-gray-200 border-t-[var(--primary)] rounded-full animate-spin" />
        <p className="text-gray-500 mt-4">Loading live car wash prices...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="bg-white shadow-sm border border-gray-100 p-8 text-center">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" aria-hidden="true" />
        <p className="text-gray-900 font-medium mb-1">Could not load prices</p>
        <p className="text-sm text-gray-500 mb-5">{loadError}</p>
        <button
          onClick={load}
          className="px-4 py-2 bg-[var(--primary)] text-white text-sm hover:bg-[var(--primary-hover)] transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-green-50 border border-green-200 p-4">
        <p className="text-sm text-green-800">
          <strong>These prices are live.</strong> Saving a change here updates what
          customers are charged for a car wash straight away.
        </p>
      </div>

      {GROUPS.map((group) => {
        const GroupIcon = group.icon;
        const list = rows[group.key] || [];

        return (
          <section key={group.key} className="bg-white shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
                <GroupIcon className="w-5 h-5 text-[var(--primary)]" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{group.title}</h3>
              <span className="text-xs text-gray-400">({list.length})</span>
            </div>
            <p className="text-sm text-gray-500 mb-5 ml-12">{group.description}</p>

            {list.length === 0 ? (
              <p className="text-sm text-gray-500 py-4">Nothing set up yet.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {list.map((row) => {
                  const key = `${group.key}:${row.id}`;
                  const draft = drafts[key] ?? '';
                  const changed = draft !== toPriceInput(row.price);
                  const isSaving = savingId === key;

                  return (
                    <li
                      key={row.id}
                      className="py-3 flex flex-wrap items-center gap-3 sm:gap-4"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {row[group.nameField]}
                        </p>
                        {row.description && (
                          <p className="text-xs text-gray-500 truncate">{row.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <label htmlFor={`price-${key}`} className="sr-only">
                          Price for {row[group.nameField]} in QAR
                        </label>
                        <input
                          id={`price-${key}`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={draft}
                          onChange={(e) => handleDraftChange(group.key, row.id, e.target.value)}
                          className={`w-28 px-3 py-2 border text-sm text-right text-gray-900 ${
                            changed ? 'border-amber-400 bg-amber-50' : 'border-gray-300'
                          }`}
                        />
                        <span className="text-sm text-gray-500 w-9">QAR</span>

                        <button
                          type="button"
                          onClick={() => handleReset(group, row)}
                          disabled={!changed || isSaving}
                          title="Undo change"
                          className="p-2 text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <RotateCcw className="w-4 h-4" aria-hidden="true" />
                          <span className="sr-only">Undo change to {row[group.nameField]}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSave(group, row)}
                          disabled={!changed || isSaving}
                          className="inline-flex items-center gap-1.5 px-3 py-2 bg-[var(--primary)] text-white text-xs font-medium hover:bg-[var(--primary-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          <Save className="w-3.5 h-3.5" aria-hidden="true" />
                          {isSaving ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
