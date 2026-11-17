/** Labels the broadcast screens share. */

const AUDIENCE_LABEL = {
  all: () => 'All customers',
  recent: (days) => `Visited in the last ${days} days`,
  inactive: (days) => `No visit for ${days} days`,
};

/** { type, days, service } → "No visit for 30 days · Full Wash" */
export const audienceText = (audience) => {
  const label = (AUDIENCE_LABEL[audience?.type] || AUDIENCE_LABEL.all)(audience?.days);
  return audience?.service ? `${label} · ${audience.service}` : label;
};

export const dateText = (value) =>
  (value ? new Date(value).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—');

// ---- message templates (same rules as the server) ----

export const NAME_TAG = '{{name}}';
export const SAMPLE_NAME = 'Ahmed';
export const TEMPLATE_NAME = /^[a-z0-9_]{1,150}$/;
export const MAX_BODY = 1024;
export const MAX_FOOTER = 60;

export const TEMPLATE_LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'en_US', label: 'English (US)' },
  { value: 'ar', label: 'Arabic' },
];

export const TEMPLATE_CATEGORIES = [
  { value: 'MARKETING', label: 'Marketing (offers, news)' },
  { value: 'UTILITY', label: 'Utility (service updates)' },
];

export const TEMPLATE_STATUS = {
  draft: { label: 'Draft', pill: 'bg-gray-100 text-gray-700' },
  pending: { label: 'In review', pill: 'bg-amber-100 text-amber-800' },
  approved: { label: 'Approved', pill: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejected', pill: 'bg-red-100 text-red-700' },
  paused: { label: 'Paused by Meta', pill: 'bg-orange-100 text-orange-700' },
  disabled: { label: 'Disabled by Meta', pill: 'bg-red-100 text-red-700' },
};

// ---- price blanks: {{price_1}} … {{price_9}} ----
// Meta approves the wording once; each broadcast types its own prices, so a
// price change needs no new approval. Same rules as the server.
export const PRICE_TAG = /^\{\{price_([1-9])\}\}$/;
export const MAX_PRICES = 9;
export const MAX_VALUE = 30;
const ANY_TAG = /\{\{[^}]*\}\}/g;

/** The price blanks in the message, in order: ['price_1', 'price_2']. */
export const priceKeys = (body) =>
  (String(body || '').match(ANY_TAG) || []).filter((t) => PRICE_TAG.test(t)).map((t) => t.slice(2, -2));

/** "price_2" → "Price 2" */
export const priceLabel = (key) => `Price ${String(key).replace('price_', '')}`;

/** The next free blank, e.g. {{price_3}}, or '' when all 9 are used. */
export function nextPriceTag(body) {
  const used = new Set(priceKeys(body));
  for (let n = 1; n <= MAX_PRICES; n += 1) if (!used.has(`price_${n}`)) return `{{price_${n}}}`;
  return '';
}

/** The first price blank without a value, as a message, or ''. */
export function valuesProblem(body, values, what = 'the price') {
  for (const key of priceKeys(body)) {
    const v = String(values?.[key] ?? '').trim();
    if (!v) return `Type ${what} for ${priceLabel(key)}.`;
    if (v.length > MAX_VALUE) return `${priceLabel(key)} must be ${MAX_VALUE} characters or less.`;
  }
  return '';
}

/** Only the values for the message's blanks, trimmed (what the server keeps). */
export const valuesFor = (body, values) =>
  Object.fromEntries(priceKeys(body).map((k) => [k, String(values?.[k] ?? '').trim()]));

/** The message with the name and prices filled in; an empty price shows as [Price 1]. */
export function fillBlanks(body, { name, values } = {}) {
  return String(body || '').replace(ANY_TAG, (tag) => {
    if (tag === NAME_TAG) return name ?? tag;
    if (!PRICE_TAG.test(tag)) return tag;
    const key = tag.slice(2, -2);
    return String(values?.[key] ?? '').trim() || `[${priceLabel(key)}]`;
  });
}

/** The first reason Meta would refuse this text, or ''. */
export function templateTextProblem(body, footer) {
  const text = String(body || '').trim();
  if (!text) return 'Write the message.';
  if (text.length > MAX_BODY) return `Keep the message under ${MAX_BODY} characters.`;
  const tags = text.match(ANY_TAG) || [];
  if (tags.some((t) => t !== NAME_TAG && !PRICE_TAG.test(t))) {
    return 'Only the customer name ({{name}}) and price blanks ({{price_1}} … {{price_9}}) can be filled in. Remove other {{ }} parts.';
  }
  const repeated = tags.find((t, i) => tags.indexOf(t) !== i);
  if (repeated) return repeated === NAME_TAG ? 'Use the customer name only once.' : `Use ${repeated} only once.`;
  if (/^\{\{[^}]*\}\}/.test(text) || /\{\{[^}]*\}\}$/.test(text)) {
    return 'Meta does not allow the customer name or a price blank as the very first or last word. Add a word before or after it.';
  }
  if (/\}\}\s*\{\{/.test(text)) return 'Put some words between two blanks. Meta does not allow them side by side.';
  const foot = String(footer || '').trim();
  if (foot.length > MAX_FOOTER) return `Keep the footer under ${MAX_FOOTER} characters.`;
  if (/\{\{|\}\}/.test(foot)) return 'The footer cannot have the customer name.';
  return '';
}

// ---- optional link button on a template ----
export const MAX_BUTTON_TEXT = 25; // Meta's limit
export const CHAT_BUTTON_TEXT = 'Chat with us';
/** The WhatsApp the team answers on the phone (client, Nov 2026). */
export const CHAT_NUMBER = '97451701605';
export const CHAT_NUMBER_TEXT = '+974 5170 1605';
/**
 * Meta refuses wa.me links in template buttons, so the button opens /chat on
 * the live dashboard, which forwards to https://wa.me/97451701605 (next.config).
 */
export const CHAT_LINK = 'https://app-magic.milesahead.services/chat';
export const isWhatsAppLink = (url) => /^https?:\/\/(wa\.me|api\.whatsapp\.com|(www\.)?whatsapp\.com)\b/i.test(String(url || '').trim());

/** Why Meta would refuse this button, or '' (none at all is fine). */
export function buttonProblem(text, url) {
  const t = String(text || '').trim();
  const u = String(url || '').trim();
  if (!t && !u) return '';
  if (!t) return 'Write the button text, or remove the button.';
  if (!u) return 'Add the link the button opens, or remove the button.';
  if (t.length > MAX_BUTTON_TEXT) return `Keep the button text under ${MAX_BUTTON_TEXT} characters.`;
  if (/\{\{|\}\}/.test(t) || /\{\{|\}\}/.test(u)) return 'The button cannot have the customer name.';
  if (!/^https:\/\/[^\s/]+\.[^\s]+$/.test(u)) return `The button link must be a full https:// address, e.g. ${CHAT_LINK}`;
  if (isWhatsAppLink(u)) return `Meta does not allow WhatsApp links (wa.me) in buttons. Use ${CHAT_LINK} instead, it opens the same chat.`;
  return '';
}
