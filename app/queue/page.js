'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import NextImage from 'next/image';
import { Volume2, VolumeX, Maximize, WifiOff } from 'lucide-react';
import logo from '../../public/magic-track-logo.png';
import { fetchQueue } from '../../utils/carWashApi';

/**
 * Queue screen for the TV in the waiting area (like the order board at
 * McDonald's / KFC). Shows today's cars by stage; staff move them along from
 * the dashboard (Car Wash Orders → Stage). Refreshes every few seconds and
 * chimes when a car is ready.
 */

const REFRESH_MS = 8000;
const NEW_READY_MS = 30000; // a car that just became ready blinks this long
const MAX_CARDS = { waiting: 12, washing: 8, ready: 8 };

const COLUMNS = [
  { key: 'waiting', en: 'Waiting',          ar: 'في الانتظار' },
  { key: 'washing', en: 'Washing',          ar: 'قيد الغسيل' },
  { key: 'ready',   en: 'Ready to collect', ar: 'جاهزة للاستلام' },
];

const COLUMN_STYLE = {
  waiting: { head: 'bg-white/10 text-white',            card: 'bg-white/10 text-white',            plate: 'text-white/60' },
  washing: { head: 'bg-[var(--primary)] text-white',     card: 'bg-[var(--primary)]/15 text-white border border-[var(--primary)]/50', plate: 'text-white/70' },
  ready:   { head: 'bg-green-600 text-white',            card: 'bg-green-600 text-white',           plate: 'text-white/85' },
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

export default function QueuePage() {
  const [cars, setCars] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [offline, setOffline] = useState(false);
  const [clock, setClock] = useState('');
  const [newReady, setNewReady] = useState({}); // order id → time it became ready
  const [soundOn, setSoundOn] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
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
          if (audio.current) playChime(audio.current);
        }
      }
      readyIds.current = new Set(ready);
      setCars(list);
      setOffline(false);
    } catch (error) {
      console.error('Queue screen: could not load orders', error);
      setOffline(true); // keep showing the last list
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(load, 0);
    const timer = setInterval(load, REFRESH_MS);
    return () => { clearTimeout(first); clearInterval(timer); };
  }, [load]);

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

  return (
    <div translate="no" className="notranslate min-h-screen flex flex-col bg-[var(--brand-black)] text-white select-none overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between gap-6 px-8 py-4 border-b-4 border-[var(--primary)]">
        <NextImage src={logo} alt="Magic Track — Car Wash & Auto Care" className="h-16 w-auto" priority />
        <div className="text-center">
          <h1 className="text-4xl font-black tracking-tight">Order Status</h1>
          <p className="text-2xl font-bold text-white/70" dir="rtl" lang="ar">حالة الطلبات</p>
        </div>
        <div className="text-end">
          <div className="text-4xl font-black tabular-nums" aria-live="off">{clock}</div>
          {offline && (
            <div className="flex items-center justify-end gap-1.5 text-sm text-yellow-300 mt-1">
              <WifiOff className="w-4 h-4" aria-hidden="true" /> Reconnecting…
            </div>
          )}
        </div>
      </header>

      {/* Columns */}
      <main className="flex-1 grid grid-cols-1 md:grid-cols-[1fr_1fr_1.25fr] gap-5 p-6 min-h-0">
        {COLUMNS.map((col) => {
          const style = COLUMN_STYLE[col.key];
          const list = cars.filter((c) => c.stage === col.key);
          const shown = list.slice(0, MAX_CARDS[col.key]);
          const big = col.key === 'ready';
          return (
            <section key={col.key} className="flex flex-col min-h-0 bg-white/[0.04] border border-white/10" aria-label={col.en}>
              <h2 className={`flex items-baseline justify-between gap-3 px-5 py-4 ${style.head}`}>
                <span className="text-3xl font-black">{col.en}</span>
                <span className="text-2xl font-bold opacity-90" dir="rtl" lang="ar">{col.ar}</span>
              </h2>
              <div className={`flex-1 grid content-start gap-3 p-4 ${big ? 'grid-cols-2' : 'grid-cols-2 xl:grid-cols-3'}`} aria-live="polite">
                {shown.map((car) => (
                  <div
                    key={car.id}
                    className={`flex flex-col items-center justify-center text-center ${big ? 'py-6' : 'py-4'} ${style.card} ${newReady[car.id] ? 'animate-pulse ring-4 ring-white' : ''}`}
                  >
                    <span className={`${big ? 'text-6xl' : 'text-4xl'} font-black leading-none tabular-nums`} dir="ltr">{car.queue}</span>
                    {plateTail(car.numberPlate) && (
                      <span className={`mt-2 text-lg font-semibold tabular-nums ${style.plate}`} dir="ltr">{plateTail(car.numberPlate)}</span>
                    )}
                  </div>
                ))}
                {list.length > shown.length && (
                  <div className="col-span-full text-center text-xl font-bold text-white/60 py-2">
                    + {list.length - shown.length} more
                  </div>
                )}
                {loaded && list.length === 0 && (
                  <p className="col-span-full text-center text-xl text-white/40 py-10">—</p>
                )}
              </div>
            </section>
          );
        })}
      </main>

      {/* Footer */}
      <footer className="flex items-center justify-between gap-4 px-8 py-3 text-lg text-white/60 border-t border-white/10">
        <span>Order at the kiosk · Pay at the counter · Collect your car when your number is ready</span>
        <span dir="rtl" lang="ar" className="hidden lg:inline">اطلب من الشاشة · ادفع عند الكاشير · استلم سيارتك عند ظهور رقمك</span>
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
    </div>
  );
}
