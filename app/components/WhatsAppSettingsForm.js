'use client';

import { useState } from 'react';
import { Loader2, AlertCircle, CheckCircle2, Info, KeyRound } from 'lucide-react';
import { broadcastService } from '../../utils/axiosInstance';

/**
 * Meta WhatsApp Business details (Super Admin). The access token is write-only:
 * the server keeps it encrypted and only says whether one is saved.
 * `onSaved(settings, message)` runs after every successful save.
 */
const META_ID = /^\d{5,30}$/;

export default function WhatsAppSettingsForm({ settings, onSaved }) {
  const [businessId, setBusinessId] = useState(settings?.business_account_id || '');
  const [phoneId, setPhoneId] = useState(settings?.phone_number_id || '');
  const [displayNumber, setDisplayNumber] = useState(settings?.display_number || '');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async (body, message) => {
    setSaving(true);
    setError('');
    try {
      const res = await broadcastService.saveSettings(body);
      setToken('');
      onSaved(res.data?.data, message);
    } catch (err) {
      console.error('Save WhatsApp settings error:', err);
      setError(err?.message || 'Could not save the settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (saving) return;
    const ids = { 'Business Account ID': businessId.trim(), 'Phone Number ID': phoneId.trim() };
    const wrong = Object.keys(ids).find((label) => ids[label] && !META_ID.test(ids[label]));
    if (wrong) {
      setError(`${wrong} must be the number from Meta (digits only).`);
      return;
    }
    save({
      business_account_id: businessId.trim(),
      phone_number_id: phoneId.trim(),
      display_number: displayNumber.trim(),
      ...(token.trim() ? { access_token: token.trim() } : {}),
    }, 'WhatsApp settings saved');
  };

  return (
    <form onSubmit={handleSubmit} className="p-5 max-w-2xl" noValidate>
      {settings?.details_saved ? (
        <div className="mb-4 px-4 py-3 flex items-start gap-2.5 text-sm bg-green-50 border border-green-200 text-green-800">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            <b>Details saved.</b>
            {!settings.sending_enabled && ' Sending is switched on after the first real test with Meta.'}
          </span>
        </div>
      ) : (
        <div className="mb-4 px-4 py-3 flex items-start gap-2.5 text-sm bg-amber-50 border border-amber-200 text-amber-800">
          <Info className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span><b>Not connected.</b> Fill this in once the Meta Business account and the company number are ready.</span>
        </div>
      )}

      {settings?.token_unreadable && (
        <div className="mb-4 px-3 py-2 flex items-start gap-2 text-sm bg-red-50 border border-red-200 text-red-700" role="alert">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span>The saved access token can&apos;t be read any more. Please enter it again.</span>
        </div>
      )}

      <fieldset disabled={saving} className="space-y-4">
        <div>
          <label htmlFor="wa-business-id">WhatsApp Business Account ID</label>
          <input id="wa-business-id" inputMode="numeric" autoComplete="off" value={businessId} onChange={(e) => setBusinessId(e.target.value)} placeholder="e.g. 102938475610293" />
        </div>
        <div>
          <label htmlFor="wa-phone-id">Phone Number ID</label>
          <input id="wa-phone-id" inputMode="numeric" autoComplete="off" value={phoneId} onChange={(e) => setPhoneId(e.target.value)} placeholder="e.g. 109876543210987" />
          <p className="mt-1 text-[11px] text-gray-500">Both IDs are on the WhatsApp &gt; API Setup page in Meta.</p>
        </div>
        <div>
          <label htmlFor="wa-display-number">Company WhatsApp number</label>
          <input id="wa-display-number" type="tel" dir="ltr" autoComplete="off" value={displayNumber} onChange={(e) => setDisplayNumber(e.target.value)} placeholder="+974 5555 0000" />
        </div>
        <div>
          <label htmlFor="wa-token">Access token</label>
          <input
            id="wa-token"
            type="password"
            autoComplete="new-password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder={settings?.token_saved ? `Saved (ends in ${settings.token_last4}). Leave empty to keep it` : 'Paste the permanent token from Meta'}
          />
          <p className="mt-1 text-[11px] text-gray-500 flex items-center gap-1">
            <KeyRound className="w-3 h-3 shrink-0" aria-hidden="true" /> Stored encrypted on the server and never shown again.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2 px-3 py-2 text-xs bg-red-50 border border-red-200 text-red-700" role="alert">
            <AlertCircle className="w-4 h-4 shrink-0 mt-px" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" className="px-5 py-2 text-sm font-medium bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors flex items-center gap-2 disabled:opacity-50">
            {saving && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />} Save settings
          </button>
          {settings?.token_saved && (
            <button
              type="button"
              onClick={() => save({ remove_token: true }, 'Access token removed')}
              className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 hover:bg-red-50 transition-colors"
            >
              Remove token
            </button>
          )}
        </div>
      </fieldset>
    </form>
  );
}
