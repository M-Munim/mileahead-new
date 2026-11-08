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

/** The first reason Meta would refuse this text, or ''. */
export function templateTextProblem(body, footer) {
  const text = String(body || '').trim();
  if (!text) return 'Write the message.';
  if (text.length > MAX_BODY) return `Keep the message under ${MAX_BODY} characters.`;
  const tags = text.match(/\{\{[^}]*\}\}/g) || [];
  if (tags.some((t) => t !== NAME_TAG)) return 'Only the customer name ({{name}}) can be filled in. Remove other {{ }} parts.';
  if (tags.length > 1) return 'Use the customer name only once.';
  if (text.startsWith(NAME_TAG) || text.endsWith(NAME_TAG)) {
    return 'Meta does not allow the customer name as the very first or last word. Add a word before or after it.';
  }
  const foot = String(footer || '').trim();
  if (foot.length > MAX_FOOTER) return `Keep the footer under ${MAX_FOOTER} characters.`;
  if (/\{\{|\}\}/.test(foot)) return 'The footer cannot have the customer name.';
  return '';
}
