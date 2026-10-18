'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import NextImage from 'next/image';
import { Volume2, VolumeX, Maximize, WifiOff, LogIn } from 'lucide-react';
import logo from '../../public/magic-track-logo.png';
import { fetchQueue } from '../../utils/carWashApi';
import {
  fetchActiveScreenAds, fetchScreenSettings, DEFAULT_SETTINGS, DEFAULT_IMAGE_SECONDS, MAX_VIDEO_SECONDS,
} from '../../utils/screenAds';
import PromoSlide from '../components/PromoSlide';

/**
 * Queue screen for the display in the waiting area (like the order board at
 * McDonald's / KFC). Shows today's cars by stage; staff move them along from
 * the dashboard (Car Wash Orders → Stage). Refreshes every few seconds and
 * chimes when a car is ready.
 *
 * Between queue views it plays one ad full screen (Screen Ads in the
 * dashboard), with a bar that keeps showing the ready numbers. A car that
 * becomes ready cuts the ad short.
 *
 * Fits a portrait signage screen (43", 1080×1920) as well as a landscape TV;
 * all sizes are in vmin. URL options for each screen:
 *   ?queue=60    seconds the queue shows between ads (otherwise the dashboard setting)
 *   ?ads=off     no ads on this screen
 *   ?sound=on    try to turn the chime and ad sound on without a tap (works
 *                where the browser allows autoplay, e.g. a kiosk browser app)
 */

const REFRESH_MS = 8000;
const ADS_REFRESH_MS = 5 * 60 * 1000;
const RELOAD_MS = 6 * 60 * 60 * 1000; // reload now and then: picks up updates, frees memory
const NEW_READY_MS = 30000; // a car that just became ready blinks this long
const MAX_CARDS = { waiting: 15, washing: 8, ready: 9 };

const COLUMNS = [
  { key: 'waiting', en: 'Waiting',          ar: 'في الانتظار' },
  { key: 'washing', en: 'Washing',          ar: 'قيد الغسيل' },
  { key: 'ready',   en: 'Ready to collect', ar: 'جاهزة للاستلام' },
];

// Landscape: Waiting | Washing | Ready side by side. Portrait: Ready on top, then Washing, then Waiting.
const COLUMN_STYLE = {
  waiting: {
    head: 'bg-white/10 text-white', card: 'bg-white/10 text-white', plate: 'text-white/60',
    order: 'portrait:order-3', grid: 'grid-cols-2 xl:grid-cols-3 portrait:grid-cols-5',
  },
  washing: {
    head: 'bg-[var(--primary)] text-white', card: 'bg-[var(--primary)]/15 text-white border border-[var(--primary)]/50', plate: 'text-white/70',
    order: 'portrait:order-2', grid: 'grid-cols-2 xl:grid-cols-3 portrait:grid-cols-4',
  },
  ready: {
    head: 'bg-green-600 text-white', card: 'bg-green-600 text-white', plate: 'text-white/85',
    order: 'portrait:order-1', grid: 'grid-cols-2 portrait:grid-cols-3',
  },
};

/** Only the end of the plate, so the board doesn't list full plates. */
const plateTail = (plate) => {
  const p = String(plate || '').replace(/\s+/g, '');
  if (!p) return '';
  return p.length > 3 ? `•••${p.slice(-3)}` : p;
};

const clockText = (d) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

/** Short two-tone chime (Web Audio, no sound file needed). */
function playChime(ctx) {
  [880, 1320].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = ctx.currentTime + i * 0.28;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.35, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.6);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.65);
  });
}

// ─────────────────────────────────────────────────────────────
// One ad, full screen. Calls onDone when it has played (or failed).
// ─────────────────────────────────────────────────────────────
function AdPlayer({ ad, soundOn, onDone }) {
  const video = useRef(null);

  // Images / promo slides: their own duration. Videos: until they end, with a safety cap.
  useEffect(() => {
    const seconds = ad.type === 'video' ? MAX_VIDEO_SECONDS : ad.seconds || DEFAULT_IMAGE_SECONDS;
    const timer = setTimeout(onDone, seconds * 1000);
    return () => clearTimeout(timer);
    // ad.id, not ad: the ad list reloads every few minutes and must not restart the ad on screen.
  }, [ad.id, ad.type, ad.seconds, onDone]);

  // Unmuted autoplay is often blocked; fall back to muted, then skip.
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    v.muted = !soundOn;
    v.play().catch(() => {
      v.muted = true;
      v.play().catch(onDone);
    });
  }, [ad.url, soundOn, onDone]);

  if (ad.type === 'promo') return <PromoSlide promo={ad.promo} />;
  if (ad.type === 'video') {
    return (
      <video
        ref={video}
        key={ad.url}
        src={ad.url}
        className="w-full h-full object-contain bg-black"
        playsInline
        preload="auto"
        onEnded={onDone}
        onError={onDone}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- ad files come from the server or public/ads, any size
    <img src={ad.url} alt={ad.title || 'Advertisement'} className="w-full h-full object-contain bg-black" onError={onDone} />
  );
}

export default function QueuePage() {
  const [cars, setCars] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [offline, setOffline] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false); // the order list needs a staff login
  const [clock, setClock] = useState('');
  const [newReady, setNewReady] = useState({}); // order id → time it became ready
  const [soundOn, setSoundOn] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [ads, setAds] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [options, setOptions] = useState({ queueSeconds: null, adsOff: false });
  const [adIndex, setAdIndex] = useState(0);
  const [showingAd, setShowingAd] = useState(false);
  const readyIds = useRef(null);
  const audio = useRef(null);

  const load = useCallback(async () => {
    try {
      const list = await fetchQueue();
      const ready = list.filter((c) => c.stage === 'ready').map((c) => c.id);
      if (readyIds.current) {
        const fresh = ready.filter((id) => !readyIds.current.has(id));
        if (fresh.length > 0) {
          const now = Date.now();
          setNewReady((prev) => ({ ...prev, ...Object.fromEntries(fresh.map((id) => [id, now])) }));
          setShowingAd(false); // a newly ready car cuts the ad short
          if (audio.current) playChime(audio.current);
        }
      }
      readyIds.current = new Set(ready);
      setCars(list);
      setOffline(false);
      setNeedsLogin(false);
    } catch (error) {
      console.error('Queue screen: could not load orders', error);
      if (error?.status === 401 || error?.status === 403) setNeedsLogin(true);
      else setOffline(true); // keep showing the last list
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(load, 0);
    const timer = setInterval(load, REFRESH_MS);
    return () => { clearTimeout(first); clearInterval(timer); };
  }, [load]);

  // Ads and their timing; a failed load keeps what the screen already has.
  useEffect(() => {
    const loadAds = async () => {
      const [adsResult, settingsResult] = await Promise.allSettled([fetchActiveScreenAds(), fetchScreenSettings()]);
      if (adsResult.status === 'fulfilled') setAds(adsResult.value);
      else console.error('Queue screen: could not load ads', adsResult.reason);
      if (settingsResult.status === 'fulfilled') setSettings(settingsResult.value);
    };
    const first = setTimeout(loadAds, 0);
    const timer = setInterval(loadAds, ADS_REFRESH_MS);
    return () => { clearTimeout(first); clearInterval(timer); };
  }, []);

  // Per-screen URL options, and an optional sound-on start for kiosk browser apps.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queueSeconds = Number(params.get('queue'));
    const timer = setTimeout(() => {
      setOptions({ queueSeconds: queueSeconds >= 5 ? queueSeconds : null, adsOff: params.get('ads') === 'off' });
      if (params.get('sound') === 'on') {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (Ctx) {
          audio.current = new Ctx();
          audio.current.resume?.().catch(() => {});
          setSoundOn(true);
        }
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Queue for a while, then the next ad.
  const queueSeconds = options.queueSeconds || settings.queueSeconds;
  const adsEnabled = !options.adsOff && ads.length > 0 && !needsLogin;
  useEffect(() => {
    if (!adsEnabled || showingAd) return undefined;
    const timer = setTimeout(() => setShowingAd(true), queueSeconds * 1000);
    return () => clearTimeout(timer);
  }, [adsEnabled, showingAd, queueSeconds]);

  const adDone = useCallback(() => {
    setShowingAd(false);
    setAdIndex((i) => i + 1);
  }, []);
  const currentAd = adsEnabled && showingAd ? ads[adIndex % ads.length] : null;

  // Clock, and stop the "just ready" blink after a while.
  useEffect(() => {
    const tick = () => {
      setClock(clockText(new Date()));
      const cutoff = Date.now() - NEW_READY_MS;
      setNewReady((prev) => {
        const kept = Object.fromEntries(Object.entries(prev).filter(([, at]) => at > cutoff));
        return Object.keys(kept).length === Object.keys(prev).length ? prev : kept;
      });
    };
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 1000);
    return () => { clearTimeout(first); clearInterval(timer); };
  }, []);

  // Signage: keep the screen awake, and reload every few hours.
  useEffect(() => {
    let lock = null;
    const keepAwake = async () => {
      try {
        if (document.visibilityState === 'visible') lock = await navigator.wakeLock?.request('screen');
      } catch { /* not supported or not allowed */ }
    };
    keepAwake();
    document.addEventListener('visibilitychange', keepAwake);
    const reload = setTimeout(() => window.location.reload(), RELOAD_MS);
    return () => {
      document.removeEventListener('visibilitychange', keepAwake);
      clearTimeout(reload);
      lock?.release?.().catch(() => {});
    };
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // Browsers only allow sound after a tap, so sound is switched on by hand once.
  const toggleSound = () => {
    if (soundOn) {
      setSoundOn(false);
      audio.current = null;
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audio.current = new Ctx();
    playChime(audio.current);
    setSoundOn(true);
  };

  const goFullscreen = () => document.documentElement.requestFullscreen?.().catch(() => {});

  const byStage = (stage) => cars.filter((c) => c.stage === stage);
  const readyNow = byStage('ready');

  return (
    <div translate="no" className="notranslate h-dvh flex flex-col bg-[var(--brand-black)] text-white select-none overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between gap-[2vmin] px-[3vmin] py-[1.6vmin] border-b-[0.5vmin] border-[var(--primary)]">
        <NextImage src={logo} alt="Magic Track — Car Wash & Auto Care" className="h-[7vmin] w-auto" priority />
        <div className="text-center">
          <h1 className="text-[4.4vmin] font-black tracking-tight leading-tight">Order Status</h1>
          <p className="text-[3vmin] font-bold text-white/70" dir="rtl" lang="ar">حالة الطلبات</p>
        </div>
        <div className="text-end">
          <div className="text-[4.4vmin] font-black tabular-nums" aria-live="off">{clock}</div>
          {offline && (
            <div className="flex items-center justify-end gap-1.5 text-[1.8vmin] text-yellow-300 mt-1">
              <WifiOff className="w-[2vmin] h-[2vmin]" aria-hidden="true" /> Reconnecting…
            </div>
          )}
        </div>
      </header>

      {needsLogin && (
        <div className="fixed inset-0 z-50 bg-[var(--brand-black)]/95 flex items-center justify-center p-6" role="alert">
          <div className="max-w-lg text-center">
            <h2 className="text-4xl font-black">Staff login needed</h2>
            <p className="text-xl text-white/70 mt-3">
              The queue screen reads today&apos;s orders, which need a staff login. Log in once on this screen and it comes back here.
            </p>
            <a
              href="/auth/login?next=/queue"
              className="mt-8 inline-flex items-center gap-2 px-8 py-4 text-xl font-extrabold bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]"
            >
              <LogIn className="w-6 h-6" aria-hidden="true" /> Staff login
            </a>
          </div>
        </div>
      )}

      {/* Columns (rows on a portrait screen) */}
      <main className="flex-1 grid gap-[1.8vmin] p-[2.2vmin] min-h-0 grid-cols-1 landscape:grid-cols-[1fr_1fr_1.25fr] portrait:grid-rows-[1.3fr_1fr_1fr]">
        {COLUMNS.map((col) => {
          const style = COLUMN_STYLE[col.key];
          const list = byStage(col.key);
          const shown = list.slice(0, MAX_CARDS[col.key]);
          const big = col.key === 'ready';
          return (
            <section key={col.key} className={`flex flex-col min-h-0 overflow-hidden bg-white/[0.04] border border-white/10 ${style.order}`} aria-label={col.en}>
              <h2 className={`flex items-baseline justify-between gap-3 px-[2.2vmin] py-[1.4vmin] ${style.head}`}>
                <span className="text-[3.6vmin] font-black">{col.en}</span>
                <span className="text-[3vmin] font-bold opacity-90" dir="rtl" lang="ar">{col.ar}</span>
              </h2>
              <div className={`flex-1 grid content-start gap-[1.2vmin] p-[1.6vmin] ${style.grid}`} aria-live="polite">
                {shown.map((car) => (
                  <div
                    key={car.id}
                    className={`flex flex-col items-center justify-center text-center ${big ? 'py-[2.4vmin]' : 'py-[1.6vmin]'} ${style.card} ${newReady[car.id] ? 'animate-pulse ring-[0.5vmin] ring-white' : ''}`}
                  >
                    <span className={`${big ? 'text-[7.5vmin]' : 'text-[5vmin]'} font-black leading-none tabular-nums`} dir="ltr">{car.queue}</span>
                    {plateTail(car.numberPlate) && (
                      <span className={`mt-[0.8vmin] text-[2.2vmin] font-semibold tabular-nums ${style.plate}`} dir="ltr">{plateTail(car.numberPlate)}</span>
                    )}
                  </div>
                ))}
                {list.length > shown.length && (
                  <div className="col-span-full text-center text-[2.6vmin] font-bold text-white/60 py-[1vmin]">
                    + {list.length - shown.length} more
                  </div>
                )}
                {loaded && list.length === 0 && (
                  <p className="col-span-full text-center text-[3vmin] text-white/30 py-[3vmin]">—</p>
                )}
              </div>
            </section>
          );
        })}
      </main>

      {/* Footer */}
      <footer className="flex flex-wrap items-center justify-between gap-x-[3vmin] gap-y-[0.6vmin] px-[3vmin] py-[1.2vmin] text-[2vmin] text-white/60 border-t border-white/10">
        <span>Order at the kiosk · Pay at the counter · Collect your car when your number is ready</span>
        <span dir="rtl" lang="ar">اطلب من الشاشة · ادفع عند الكاشير · استلم سيارتك عند ظهور رقمك</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleSound}
            className="btn-icon flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold bg-white/10 hover:bg-white/20 text-white"
            title={soundOn ? 'Turn the chime off' : 'Turn on a chime when a car is ready'}
          >
            {soundOn ? <Volume2 className="w-4 h-4" aria-hidden="true" /> : <VolumeX className="w-4 h-4" aria-hidden="true" />}
            {soundOn ? 'Sound on' : 'Sound off'}
          </button>
          {!isFullscreen && (
            <button
              type="button"
              onClick={goFullscreen}
              className="btn-icon flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold bg-white/10 hover:bg-white/20 text-white"
            >
              <Maximize className="w-4 h-4" aria-hidden="true" /> Full screen
            </button>
          )}
        </div>
      </footer>

      {/* ── Ad, full screen, with the ready numbers kept in view ── */}
      {currentAd && (
        <div className="fixed inset-0 z-40 flex flex-col bg-black animate-fade-in">
          <div className="flex-1 min-h-0">
            <AdPlayer ad={currentAd} soundOn={soundOn} onDone={adDone} />
          </div>
          <div className="flex items-center gap-[2.5vmin] px-[3vmin] py-[1.6vmin] bg-[var(--brand-black)] border-t-[0.5vmin] border-green-600">
            <span className="shrink-0 text-[3vmin] font-black text-green-500">
              Ready <span className="font-bold text-white/60" dir="rtl" lang="ar">· جاهزة</span>
            </span>
            <div className="flex-1 flex flex-wrap gap-[1.2vmin] min-w-0">
              {readyNow.length > 0 ? (
                readyNow.slice(0, 10).map((car) => (
                  <span key={car.id} className="px-[1.8vmin] py-[0.6vmin] bg-green-600 text-[4vmin] font-black leading-tight tabular-nums" dir="ltr">
                    {car.queue}
                  </span>
                ))
              ) : (
                <span className="text-[2.6vmin] text-white/50">Order at the kiosk · <span dir="rtl" lang="ar">اطلب من الشاشة</span></span>
              )}
            </div>
            <span className="shrink-0 text-[3.4vmin] font-black tabular-nums">{clock}</span>
          </div>
        </div>
      )}
    </div>
  );
}
