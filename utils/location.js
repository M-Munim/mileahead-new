// Helpers for sharing a booking's location (copy / open in Google Maps).

const isValidCoord = (lat, lng) => {
    const la = Number(lat);
    const ln = Number(lng);
    return (
        lat !== null && lat !== undefined && lat !== '' &&
        lng !== null && lng !== undefined && lng !== '' &&
        Number.isFinite(la) && Number.isFinite(ln) &&
        Math.abs(la) <= 90 && Math.abs(ln) <= 180 &&
        !(la === 0 && ln === 0)
    );
};

/**
 * Google Maps link for a booking. Prefers exact coordinates (pin drops where
 * the customer placed it) and falls back to searching the address text.
 */
export function getMapsUrl({ lat, lng, address } = {}) {
    if (isValidCoord(lat, lng)) {
        return `https://www.google.com/maps/search/?api=1&query=${Number(lat)},${Number(lng)}`;
    }
    if (address && address !== 'N/A') {
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    }
    return '';
}

/** Copies text to the clipboard, with a fallback for non-secure contexts (http on LAN). */
export async function copyText(text) {
    if (!text) return false;
    try {
        if (navigator?.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch {
        // fall through to the legacy path
    }
    try {
        const el = document.createElement('textarea');
        el.value = text;
        el.setAttribute('readonly', '');
        el.style.position = 'fixed';
        el.style.opacity = '0';
        document.body.appendChild(el);
        el.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(el);
        return ok;
    } catch {
        return false;
    }
}

/** wa.me link. With a phone it opens that chat; without one WhatsApp asks who to send to. */
export function getWhatsAppUrl(message, phone) {
    const digits = String(phone || '').replace(/\D/g, '');
    const base = digits ? `https://wa.me/${digits}` : 'https://wa.me/';
    return `${base}?text=${encodeURIComponent(message)}`;
}
