'use client';

import { useState } from 'react';
import { Loader2, AlertCircle, CheckCircle2, Info, KeyRound, Copy, PlugZap, Webhook } from 'lucide-react';
import { broadcastService } from '../../utils/axiosInstance';
import { copyText } from '../../utils/location';

/**
 * Meta WhatsApp Business details (Super Admin). The access token and app
 * secret are write-only: the server keeps them encrypted and only says
 * whether one is saved. `onSaved(settings, message)` runs after every save.
 */
const META_ID = /^\d{5,30}$/;
const APP_SECRET = /^[A-Za-z0-9]{16,64}$/;

/** A read-only value with a Copy button (webhook URL, verify token). */
function CopyField({ id, label, value, hint }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (await copyText(value)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <div className="flex gap-2">
        <input id={id} readOnly dir="ltr" value={value || ''} placeholder="Not available" className="font-mono text-xs" onFocus={(e) => e.target.select()} />
        <button
          type="button"
          onClick={copy}
          disabled={!value}
          className="shrink-0 flex items-center gap-1 px-3 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <Copy className="w-3.5 h-3.5" aria-hidden="true" /> {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      {hint && <p className="mt-1 text-[11px] text-gray-500">{hint}</p>}
    </div>
  );
}

export default function WhatsAppSettingsForm({ settings, onSaved }) {
  const [businessId, setBusinessId] = useState(settings?.business_account_id || '');
  const [phoneId, setPhoneId] = useState(settings?.phone_number_id || '');
  const [displayNumber, setDisplayNumber] = useState(settings?.display_number || '');
  const [token, setToken] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [check, setCheck] = useState(null); // { ok, text }

  const save = async (body, message) => {
    setSaving(true);
    setError('');
    try {
      const res = await broadcastService.saveSettings(body);
      const next = res.data?.data;
      // Show what the server kept (e.g. the number as digits), even when the
      // form isn't re-created because nothing else changed this second.
      setBusinessId(next?.business_account_id || '');
      setPhoneId(next?.phone_number_id || '');
      setDisplayNumber(next?.display_number || '');
      setToken('');
      setAppSecret('');
      onSaved(next, message);
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
    if (appSecret.trim() && !APP_SECRET.test(appSecret.trim())) {
      setError('The app secret is the letters and numbers under App settings > Basic in Meta.');
      return;
    }
    save({
      business_account_id: businessId.trim(),
      phone_number_id: phoneId.trim(),
      display_number: displayNumber.trim(),
      ...(token.trim() ? { access_token: token.trim() } : {}),
      ...(appSecret.trim() ? { app_secret: appSecret.trim() } : {}),
    }, 'WhatsApp settings saved');
  };

  const checkConnection = async () => {
    setChecking(true);
    setCheck(null);
    try {
      const res = await broadcastService.checkConnection();
      const d = res.data?.data || {};
      setCheck({
        ok: true,
        text: `Connected: ${d.verified_name || 'WhatsApp number'} ${d.display_phone_number ? `(${d.display_phone_number})` : ''}${d.quality_rating ? ` · quality ${d.quality_rating.toLowerCase()}` : ''}${d.business_account_name ? ` · account "${d.business_account_name}"` : ''}${d.test_account ? '. This is Meta\'s free test account: it can send Meta\'s sample templates (like hello_world) but not your own until the real number is connected.' : ''}`,
      });
    } catch (err) {
      setCheck({ ok: false, text: err?.message || 'Could not reach Meta.' });
    } finally {
      setChecking(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-5 max-w-2xl" noValidate>
      {settings?.sending_switched_off ? (
        <div className="mb-4 px-4 py-3 flex items-start gap-2.5 text-sm bg-red-50 border border-red-200 text-red-800">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span><b>Sending is switched off on the server</b> (WHATSAPP_SENDING=off). Nothing goes to customers until it is switched back on.</span>
        </div>
      ) : settings?.sending_enabled ? (
        <div className="mb-4 px-4 py-3 flex flex-wrap items-center gap-2.5 text-sm bg-green-50 border border-green-200 text-green-800">
          <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span className="mr-auto"><b>Connected.</b> Broadcasts and scheduled messages are sent from this number.</span>
          <button
            type="button"
            onClick={checkConnection}
            disabled={checking}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-green-800 bg-white border border-green-300 hover:bg-green-100 transition-colors disabled:opacity-60"
          >
            {checking ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <PlugZap className="w-3.5 h-3.5" aria-hidden="true" />} Check with Meta
          </button>
        </div>
      ) : (
        <div className="mb-4 px-4 py-3 flex items-start gap-2.5 text-sm bg-amber-50 border border-amber-200 text-amber-800">
          <Info className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span><b>Not connected.</b> Save the Business Account ID, Phone Number ID and access token from Meta to start sending.</span>
        </div>
      )}

      {check && (
        <div
          className={`mb-4 px-3 py-2 flex items-start gap-2 text-sm border ${check.ok ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-700'}`}
          role={check.ok ? 'status' : 'alert'}
        >
          {check.ok ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />}
          <span>{check.text}</span>
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
          <p className="mt-1 text-[11px] text-gray-500">Both IDs are on the WhatsApp &gt; API Setup page in Meta. Meta may call the Business Account ID &quot;Messaging account ID&quot;.</p>
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

        <div className="pt-2 border-t border-gray-100 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Webhook className="w-4 h-4 text-[var(--primary)]" aria-hidden="true" /> Delivery reports and STOP replies
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              In Meta: your app &gt; WhatsApp &gt; Configuration &gt; Webhook. Paste these two, then subscribe to
              <b> messages</b> and <b>message_template_status_update</b>.
            </p>
          </div>
          <CopyField id="wa-webhook-url" label="Callback URL" value={settings?.webhook_url} />
          <CopyField id="wa-verify-token" label="Verify token" value={settings?.webhook_verify_token} />
          <div>
            <label htmlFor="wa-app-secret">App secret</label>
            <input
              id="wa-app-secret"
              type="password"
              autoComplete="new-password"
              value={appSecret}
              onChange={(e) => setAppSecret(e.target.value)}
              placeholder={settings?.app_secret_saved ? 'Saved. Leave empty to keep it' : 'From App settings > Basic in Meta'}
            />
            <p className="mt-1 text-[11px] text-gray-500 flex items-center gap-1">
              <KeyRound className="w-3 h-3 shrink-0" aria-hidden="true" /> Proves the reports really come from Meta. Stored encrypted.
            </p>
          </div>
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
