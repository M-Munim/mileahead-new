// Ads shown full screen on the queue screen (/queue) between queue views, and
// managed from the dashboard (Screen Ads page).
//
// Backend (requested — see BACKEND_REQUESTS.md, "Screen ads"):
//   GET  /api/v1/screen-ads/active            public: active ads, in order (for the screen)
//   GET  /api/v1/screen-ads/all               admin / manager: every ad
//   POST /api/v1/screen-ads/add               multipart: file, title, seconds, sort_order, is_active
//   PUT  /api/v1/screen-ads/update/:id        title, seconds, sort_order, is_active
//   PUT  /api/v1/screen-ads/delete/:id
//   GET  /api/v1/screen-ads/settings          public: { queue_seconds }
//   PUT  /api/v1/screen-ads/settings          { queue_seconds }
//
// Until those exist (flag below), the screen plays the built-in ads: two
// Magic Track promo slides made from the price list, plus any files listed in
// public/ads/manifest.json. The time between ads can be set per screen with
// /queue?queue=60.

import { api } from './axiosInstance';

export const BACKEND_HAS_SCREEN_ADS = false;

const ADS = '/api/v1/screen-ads';
const MULTIPART = { headers: { 'Content-Type': 'multipart/form-data' } };

export const DEFAULT_SETTINGS = { queueSeconds: 45 };
export const DEFAULT_IMAGE_SECONDS = 10;
export const MAX_VIDEO_SECONDS = 180; // safety cap, in case a video never reports "ended"

/** Promo slides drawn by the app itself (app/components/PromoSlide.js); no file needed. */
export const BUILT_IN_ADS = [
  { id: 'promo-wash', type: 'promo', promo: 'wash', title: 'Car wash & polishing prices', seconds: 12, active: true, builtIn: true },
  { id: 'promo-protect', type: 'promo', promo: 'protect', title: 'Tint, Graphene & PPF', seconds: 12, active: true, builtIn: true },
];

const VIDEO_EXT = /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i;

/** 'video' or 'image', from the backend's type or the file name. */
const adType = (type, url) => {
  const t = String(type || '').toLowerCase();
  if (t === 'video' || t === 'image') return t;
  return VIDEO_EXT.test(url || '') ? 'video' : 'image';
};

/** Backend ad row → screen ad. */
function mapAd(row) {
  const url = row.file_url || row.url || row.image || '';
  return {
    id: String(row.id),
    type: adType(row.type, url),
    url,
    title: row.title || '',
    seconds: Number(row.seconds) || DEFAULT_IMAGE_SECONDS,
    order: Number(row.sort_order) || 0,
    active: row.is_active === undefined ? true : !!Number(row.is_active),
    builtIn: false,
  };
}

const rowsOf = (res) => {
  const d = res?.data?.data ?? res?.data;
  return Array.isArray(d) ? d : Array.isArray(d?.results) ? d.results : [];
};

/** Files dropped into public/ads and listed in public/ads/manifest.json. */
async function manifestAds() {
  try {
    const res = await fetch('/ads/manifest.json', { cache: 'no-store' });
    if (!res.ok) return [];
    const list = await res.json();
    return (Array.isArray(list) ? list : []).map((a, i) => ({
      id: `file-${i}`,
      type: adType(a.type, a.file),
      url: `/ads/${a.file}`,
      title: a.title || a.file,
      seconds: Number(a.seconds) || DEFAULT_IMAGE_SECONDS,
      order: i,
      active: a.active !== false,
      builtIn: true,
    }));
  } catch {
    return [];
  }
}

/** Every ad, in play order (the dashboard list). */
export async function fetchAllScreenAds() {
  if (BACKEND_HAS_SCREEN_ADS) {
    return rowsOf(await api.get(`${ADS}/all`)).map(mapAd).sort((a, b) => a.order - b.order);
  }
  return [...BUILT_IN_ADS, ...(await manifestAds())];
}

/** Active ads, in play order (the queue screen). */
export async function fetchActiveScreenAds() {
  if (BACKEND_HAS_SCREEN_ADS) {
    return rowsOf(await api.get(`${ADS}/active`)).map(mapAd).filter((a) => a.active).sort((a, b) => a.order - b.order);
  }
  return (await fetchAllScreenAds()).filter((a) => a.active);
}

export async function fetchScreenSettings() {
  if (!BACKEND_HAS_SCREEN_ADS) return DEFAULT_SETTINGS;
  const d = (await api.get(`${ADS}/settings`)).data?.data || {};
  return { queueSeconds: Number(d.queue_seconds) || DEFAULT_SETTINGS.queueSeconds };
}

// ── Dashboard actions (need the backend) ─────────────────────
const needsBackend = () => {
  if (!BACKEND_HAS_SCREEN_ADS) throw new Error('Uploading ads needs the server update from the backend developer.');
};

export async function uploadScreenAd(file, { title, seconds, order }) {
  needsBackend();
  const fd = new FormData();
  fd.append('file', file);
  fd.append('title', title || file.name);
  fd.append('type', file.type.startsWith('video/') ? 'video' : 'image');
  fd.append('seconds', String(seconds || DEFAULT_IMAGE_SECONDS));
  fd.append('sort_order', String(order ?? 0));
  fd.append('is_active', '1');
  return api.post(`${ADS}/add`, fd, { ...MULTIPART, timeout: 10 * 60 * 1000 });
}

export async function updateScreenAd(ad, changes) {
  needsBackend();
  const body = {};
  if ('title' in changes) body.title = changes.title;
  if ('seconds' in changes) body.seconds = changes.seconds;
  if ('order' in changes) body.sort_order = changes.order;
  if ('active' in changes) body.is_active = changes.active ? 1 : 0;
  return api.put(`${ADS}/update/${ad.id}`, body);
}

export async function deleteScreenAd(ad) {
  needsBackend();
  return api.put(`${ADS}/delete/${ad.id}`);
}

export async function saveScreenSettings({ queueSeconds }) {
  needsBackend();
  return api.put(`${ADS}/settings`, { queue_seconds: queueSeconds });
}
