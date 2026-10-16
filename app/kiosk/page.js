'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import NextImage from 'next/image';
import {
  Droplets, Sparkles, Gem, Armchair, WandSparkles, Sun, ShieldCheck, Shield, Tag, Award, Building2,
  Car, CarFront, Bus, Truck, Banknote, CreditCard, Zap, Clock, Handshake, Check,
  Languages, ArrowLeft, ArrowRight, CircleCheck, Ticket, AlertCircle, Loader2, Hand,
} from 'lucide-react';
import logo from '../../public/magic-track-logo.png';
import {
  SERVICE_GROUPS, EXTRAS, PAYMENT_METHODS, PAYMENT_TYPES, DISCOUNTS, COUPON_RATE,
  vehiclesForServices, servicesPrice, servicePrice, priceFor, applyDiscount, couponApplies,
} from '../../utils/priceList';
import { createCarWashOrder, ORDER_SOURCE } from '../../utils/carWashApi';

/**
 * Customer self-service screen, placed at the front of the car wash center.
 * The customer fills in the same fields staff have in "New Order" (one or more
 * services, car type, other services, details, discount, payment), places the
 * order and gets a queue number. The order is saved on the backend as a
 * booking with service_type = 'kiosk' (no login needed) and shows up on the
 * dashboard as Unpaid on any device.
 *
 * Made for a touch screen in the office, like a fast-food ordering kiosk: a
 * welcome screen while nobody is using it, a reset when a customer walks away
 * mid-order, and no zooming, text selection, right-click or going back. For a
 * full lock-down, run the screen's browser in kiosk mode (chrome --kiosk).
 */

// ─────────────────────────────────────────────────────────────
// Options
// ─────────────────────────────────────────────────────────────
const SERVICE_ICONS = {
  'Body Wash – In & Out': Droplets,
  'Body Polishing': Sparkles,
  'Glass Polish': Gem,
  'Full Interior Cleaning': Armchair,
  'Interior & Exterior Polishing': WandSparkles,
  'Nano Ceramic Tint': Sun,
  'Nano Ceramic Coating – Graphene Pro': ShieldCheck,
  'Paint Protection Film (PPF)': Shield,
};

const VEHICLE_ICONS = { Sedan: Car, Crossover: CarFront, SUV: CarFront, '7-Seater': Bus, 'GMC / Large SUV': Truck };
const METHOD_ICONS = { Cash: Banknote, Card: CreditCard };
const TYPE_ICONS = { Fawran: Zap, Paylater: Clock, 'Partner Credit': Handshake };
const DISCOUNT_ICONS = { Coupon: Ticket, 'Loyalty Free': Award, 'Fleet Discount': Building2 };

const SLOTS = [
  { key: 'Now', minutes: 0 },
  { key: '15 min', minutes: 15 },
  { key: '30 min', minutes: 30 },
  { key: '45 min', minutes: 45 },
  { key: '1 hour', minutes: 60 },
  { key: '2 hours', minutes: 120 },
];

const STEPS = ['1. Service', '2. Car Type', '3. Other Services', '4. Details & Payment'];
const DONE_RESET_SECONDS = 30;
const IDLE_SECONDS = 60;      // no touch for this long → "Are you still there?"
const IDLE_WARN_SECONDS = 15; // …then back to the welcome screen

// ─────────────────────────────────────────────────────────────
// Arabic text (English is the key)
// ─────────────────────────────────────────────────────────────
const AR = {
  'Touch the screen to start your order': 'المس الشاشة لتبدأ طلبك',
  'Are you still there?': 'هل ما زلت هنا؟', 'Tap anywhere to continue your order.': 'المس الشاشة لمتابعة طلبك.',
  'Starting over in': 'سيبدأ من جديد بعد', "I'm still here": 'نعم، أنا هنا',
  'Watch the queue screen for your number.': 'تابع رقمك على شاشة الانتظار.',
  '1. Service': '1. الخدمة', '2. Car Type': '2. نوع السيارة', '3. Other Services': '3. خدمات أخرى', '4. Details & Payment': '4. البيانات والدفع',
  'Choose your service': 'اختر الخدمة', 'Tap the service you want today.': 'اختر الخدمة التي تريدها اليوم.',
  'Car Wash, Polishing & Protection': 'غسيل وتلميع وحماية السيارة', 'Paint Protection Film (PPF)': 'فيلم حماية الطلاء (PPF)',
  'Other services only': 'خدمات أخرى فقط', 'Seat covers, floor mats and more': 'أغطية المقاعد ودواسات الأرضية وغيرها',
  'From': 'من', 'What are you driving?': 'ما نوع سيارتك؟', 'Price depends on your car size.': 'السعر حسب حجم السيارة.',
  'Add other services': 'أضف خدمات أخرى', 'Optional. Tap to add or remove.': 'اختياري. المس للإضافة أو الإزالة.',
  'Choose at least one service.': 'اختر خدمة واحدة على الأقل.',
  'Tap one or more services.': 'اختر خدمة واحدة أو أكثر.',
  'Only want seat covers or floor mats? Skip to step 3.': 'تريد أغطية المقاعد أو دواسات الأرضية فقط؟ انتقل إلى الخطوة 3.',
  'Not available for': 'غير متوفرة لـ', 'services': 'خدمات',
  'Your details': 'بياناتك', 'Discount': 'الخصم', 'No discount': 'بدون خصم', 'Payment': 'الدفع',
  'Loyalty Free': 'مجاناً (برنامج الولاء)', 'Fleet Discount': 'خصم الأسطول',
  'Our staff will confirm this discount at the counter.': 'سيؤكد الموظفون هذا الخصم عند الكاشير.',
  'Enter your coupon number': 'أدخل رقم القسيمة',
  'Notes': 'ملاحظات', 'Anything we should know?': 'هل هناك ما يجب أن نعرفه؟',
  'Your details and payment': 'بياناتك والدفع', 'Fill in your details and choose how to pay.': 'أدخل بياناتك واختر طريقة الدفع.',
  'Your name': 'اسمك', '(optional)': '(اختياري)', 'Mobile number': 'رقم الجوال', 'Plate number': 'رقم اللوحة',
  'Coupon number': 'رقم القسيمة', 'Payment method': 'طريقة الدفع', 'Payment type': 'نوع الدفع',
  'When do you want to start?': 'متى تريد أن نبدأ؟', 'Coupon applied': 'تم تطبيق القسيمة', 'off': 'خصم',
  'Your order': 'طلبك', 'Nothing selected yet.': 'لم تختر شيئاً بعد.', 'Subtotal': 'المجموع الفرعي', 'Coupon': 'القسيمة', 'Total': 'المجموع',
  'Includes a starting price — final price confirmed at the counter.': 'يشمل سعراً مبدئياً — يتم تأكيد السعر النهائي عند الكاشير.',
  'Back': 'رجوع', 'Next': 'التالي', 'Place order': 'تأكيد الطلب',
  'Order placed': 'تم تأكيد الطلب', 'Your queue number': 'رقم دورك', 'Please pay at the counter.': 'يرجى الدفع عند الكاشير.',
  'Drive to the wash bay when your number is called.': 'توجّه إلى مسار الغسيل عند نداء رقمك.',
  'Starting now': 'نبدأ الآن', 'In': 'بعد', 'Start new order': 'طلب جديد', 'This screen resets in': 'تعود الشاشة للبداية بعد', 'seconds': 'ثانية',
  'Could not save your order. Please ask our staff for help.': 'تعذر حفظ طلبك. يرجى طلب المساعدة من الموظفين.',
  'Placing your order…': 'جارٍ إرسال طلبك…',
  'Enter a valid mobile number': 'أدخل رقم جوال صحيح',
  'Still needed:': 'مطلوب أيضاً:', 'Choose a service': 'اختر خدمة', 'Choose your car type': 'اختر نوع السيارة',
  'Choose a service or another service': 'اختر خدمة أو خدمة أخرى',
  'Choose a service first to see prices.': 'اختر خدمة أولاً لعرض الأسعار.',
  Now: 'الآن', '15 min': '15 دقيقة', '30 min': '30 دقيقة', '45 min': '45 دقيقة', '1 hour': 'ساعة', '2 hours': 'ساعتان',
  // Price list
  'Body Wash – In & Out': 'غسيل الجسم – داخلي وخارجي', 'Body Polishing': 'تلميع الجسم', 'Glass Polish': 'تلميع الزجاج',
  'Full Interior Cleaning': 'تنظيف داخلي كامل', 'Interior & Exterior Polishing': 'تلميع داخلي وخارجي',
  'Nano Ceramic Tint': 'تظليل نانو سيراميك', 'Nano Ceramic Coating – Graphene Pro': 'طلاء نانو سيراميك – جرافين برو',
  Sedan: 'سيدان', Crossover: 'كروس أوفر', SUV: 'دفع رباعي', '7-Seater': '٧ مقاعد', 'GMC / Large SUV': 'جي إم سي / دفع رباعي كبير',
  'Floor Mat': 'دواسات الأرضية', 'Dashboard Cover': 'غطاء لوحة القيادة', 'Steering Wheel Cover': 'غطاء المقود',
  'Handrest Cover': 'غطاء مسند اليد', 'Side Door Cover': 'غطاء الباب الجانبي', 'Roof / Ceiling Modification': 'تعديل السقف',
  'Seat Cover': 'غطاء المقاعد',
  Cash: 'نقداً', Card: 'بطاقة', Fawran: 'فوران', Paylater: 'ادفع لاحقاً', 'Partner Credit': 'رصيد الشركاء',
};

const pad = (n) => String(n).padStart(2, '0');

/** Date (YYYY-MM-DD) and time (HH:MM) the customer wants to start, local time. */
const startAt = (offsetMinutes = 0) => {
  const d = new Date(Date.now() + offsetMinutes * 60000);
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
};

const FRESH = {
  step: 0, services: [], vehicle: '', extras: [], name: '', phone: '', plate: '',
  discount: '', coupon: '', paymentMethod: '', paymentType: '', slot: 'Now', notes: '',
};

// ─────────────────────────────────────────────────────────────
// Building blocks
// ─────────────────────────────────────────────────────────────
function Tile({ selected, onClick, icon: Icon, title, subtitle, price }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`relative text-start flex flex-col gap-2 p-5 min-h-[150px] border-2 transition-all active:scale-[0.98] ${
        selected
          ? 'border-[var(--primary)] bg-[var(--primary-light)] shadow-sm'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      {selected && (
        <span className="absolute top-3 end-3 w-7 h-7 rounded-full bg-[var(--primary)] text-white flex items-center justify-center">
          <Check className="w-4 h-4" aria-hidden="true" />
        </span>
      )}
      {Icon && (
        <span className={`w-11 h-11 flex items-center justify-center ${selected ? 'bg-[var(--primary)] text-white' : 'bg-[var(--primary)]/10 text-[var(--primary)]'}`}>
          <Icon className="w-6 h-6" aria-hidden="true" />
        </span>
      )}
      <span className="text-lg font-bold text-gray-900 leading-snug pe-8">{title}</span>
      {subtitle && <span className="text-sm text-gray-500 leading-snug">{subtitle}</span>}
      {price && <span className="mt-auto text-lg font-extrabold text-[var(--primary)]">{price}</span>}
    </button>
  );
}

const BIG_INPUT = { fontSize: '1.125rem', padding: '0.875rem 1rem' };

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────
export default function KioskPage() {
  const [started, setStarted] = useState(false); // false = welcome screen
  const [idleLeft, setIdleLeft] = useState(null);  // seconds left on "Are you still there?"
  const [lang, setLang] = useState('en');
  const [s, setS] = useState(FRESH);
  const [done, setDone] = useState(null); // { queue, slot, service, vehicle, total }
  const [saveError, setSaveError] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(DONE_RESET_SECONDS);

  const ar = lang === 'ar';
  const t = (text) => (ar && AR[text]) || text;
  const qar = (n) => {
    const v = Number(n || 0).toLocaleString('en-US');
    return ar ? `${v} ر.ق` : `QAR ${v}`;
  };

  const vehicleOptions = vehiclesForServices(s.services);
  const subtotal = useMemo(() => priceFor(s.services, s.vehicle, s.extras), [s.services, s.vehicle, s.extras]);
  const couponOn = couponApplies(s.discount, s.coupon);
  const total = applyDiscount(subtotal, s.discount, s.coupon);
  const hasSomething = s.services.length > 0 || s.extras.length > 0;
  const hasStartingPrice = s.extras.some((n) => EXTRAS.find((e) => e.name === n)?.from);
  const phoneOk = s.phone.replace(/\D/g, '').length >= 7;

  // A step is complete when everything it asks for is filled in.
  // Same rules as the New Order form. The plate stays required here: staff
  // need it to find the car, and the queue screen shows it.
  const couponMissing = s.discount === 'Coupon' && !s.coupon.trim();
  const stepOk = [
    hasSomething,
    s.vehicle !== '',
    hasSomething,
    s.name.trim() !== '' && phoneOk && s.plate.trim() !== '' && s.paymentMethod !== '' && !couponMissing,
  ];
  const firstIncomplete = stepOk.findIndex((ok) => !ok);
  const missing = [
    !hasSomething && { step: 0, label: 'Choose a service or another service' },
    !stepOk[1] && { step: 1, label: 'Choose your car type' },
    !s.name.trim() && { step: 3, label: 'Your name' },
    !phoneOk && { step: 3, label: 'Mobile number' },
    !s.plate.trim() && { step: 3, label: 'Plate number' },
    couponMissing && { step: 3, label: 'Coupon number' },
    !s.paymentMethod && { step: 3, label: 'Payment method' },
  ].filter(Boolean);

  const set = (changes) => setS((prev) => ({ ...prev, ...changes }));

  const toggleService = (name) => {
    setS((prev) => {
      const services = prev.services.includes(name) ? prev.services.filter((x) => x !== name) : [...prev.services, name];
      // PPF and wash services use different car sizes — drop a car type they don't all offer.
      const vehicle = vehiclesForServices(services).includes(prev.vehicle) ? prev.vehicle : '';
      return { ...prev, services, vehicle };
    });
  };

  const toggleExtra = (name) =>
    setS((prev) => ({
      ...prev,
      extras: prev.extras.includes(name) ? prev.extras.filter((x) => x !== name) : [...prev.extras, name],
    }));

  /** Back to the welcome screen for the next customer. */
  const resetKiosk = useCallback(() => {
    setS(FRESH);
    setDone(null);
    setSaveError(false);
    setSecondsLeft(DONE_RESET_SECONDS);
    setIdleLeft(null);
    setLang('en');
    setStarted(false);
  }, []);

  const begin = (language) => {
    setLang(language);
    setStarted(true);
    // Fullscreen needs a tap, so it is asked for here. Ignored where not allowed.
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
  };

  const placeOrder = async () => {
    if (firstIncomplete !== -1 || placing) return;
    const slot = SLOTS.find((x) => x.key === s.slot) || SLOTS[0];
    setPlacing(true);
    setSaveError(false);
    try {
      const created = await createCarWashOrder({
        customerName: s.name.trim(),
        phone: s.phone.trim(),
        services: s.services,
        vehicle: s.vehicle,
        extras: s.extras,
        numberPlate: s.plate.trim(),
        ...startAt(slot.minutes),
        discount: s.discount,
        couponSerial: s.discount === 'Coupon' ? s.coupon.trim() : '',
        paymentMethod: s.paymentMethod,
        paymentType: s.paymentType,
        paymentStatus: 'unpaid',
        subtotal,
        total,
        notes: [slot.minutes ? `Customer wants to start in ${slot.key}` : '', s.notes.trim()].filter(Boolean).join(' · '),
      }, ORDER_SOURCE.KIOSK);
      setSecondsLeft(DONE_RESET_SECONDS);
      setDone({ queue: created?.queue || '—', slot: slot.key, services: s.services, vehicle: s.vehicle, total });
    } catch (error) {
      console.error('Kiosk order error:', error);
      setSaveError(true);
    } finally {
      setPlacing(false);
    }
  };

  // After an order, count down and go back to the start for the next customer.
  useEffect(() => {
    if (!done) return undefined;
    const timer = setInterval(() => {
      setSecondsLeft((n) => {
        if (n <= 1) {
          clearInterval(timer);
          setTimeout(resetKiosk, 0);
          return DONE_RESET_SECONDS;
        }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [done, resetKiosk]);

  // A customer who walks away mid-order: ask, then start over.
  useEffect(() => {
    if (!started || done || placing) return undefined;
    let lastTouch = Date.now();
    const touched = () => { lastTouch = Date.now(); };
    const events = ['pointerdown', 'keydown', 'input'];
    events.forEach((name) => window.addEventListener(name, touched, true));
    const timer = setInterval(() => {
      const idle = (Date.now() - lastTouch) / 1000;
      if (idle >= IDLE_SECONDS + IDLE_WARN_SECONDS) resetKiosk();
      else if (idle >= IDLE_SECONDS) setIdleLeft(Math.ceil(IDLE_SECONDS + IDLE_WARN_SECONDS - idle));
      else setIdleLeft((v) => (v === null ? v : null));
    }, 500);
    return () => {
      events.forEach((name) => window.removeEventListener(name, touched, true));
      clearInterval(timer);
    };
  }, [started, done, placing, resetKiosk]);

  // Lock-down: no right-click / long-press menu, pinch zoom, dragging, pull-to-refresh or Back.
  useEffect(() => {
    const block = (e) => e.preventDefault();
    const stayHere = () => window.history.pushState(null, '', window.location.href);
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', stayHere);
    document.addEventListener('contextmenu', block);
    document.addEventListener('dragstart', block);
    document.addEventListener('gesturestart', block); // Safari pinch
    const root = document.documentElement;
    const previousOverscroll = root.style.overscrollBehavior;
    root.style.overscrollBehavior = 'none';
    return () => {
      window.removeEventListener('popstate', stayHere);
      document.removeEventListener('contextmenu', block);
      document.removeEventListener('dragstart', block);
      document.removeEventListener('gesturestart', block);
      root.style.overscrollBehavior = previousOverscroll;
    };
  }, []);

  // ── Order summary lines ────────────────────────────────────
  const lines = [];
  s.services.forEach((name) => {
    const price = s.vehicle ? servicePrice(name, s.vehicle) : undefined;
    lines.push({ label: t(name), sub: s.vehicle ? t(s.vehicle) : '', price: price !== undefined ? qar(price) : '' });
  });
  s.extras.forEach((name) => {
    const extra = EXTRAS.find((e) => e.name === name);
    lines.push({ label: t(name), price: `${extra?.from ? `${t('From')} ` : ''}${qar(extra?.price)}` });
  });

  // ── Step content ───────────────────────────────────────────
  let content = null;
  if (s.step === 0) {
    content = (
      <>
        <h2 className="text-3xl font-bold text-gray-900">{t('Choose your service')}</h2>
        <p className="text-lg text-gray-500 mt-1 mb-6">{t('Tap one or more services.')} {t('Only want seat covers or floor mats? Skip to step 3.')}</p>
        {SERVICE_GROUPS.map((group) => (
          <div key={group.key} className="mb-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-3">{t(group.title)}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {group.services.map((svc) => {
                const from = Math.min(...Object.values(svc.prices));
                const forCar = s.vehicle ? svc.prices[s.vehicle] : undefined;
                return (
                  <Tile
                    key={svc.name}
                    selected={s.services.includes(svc.name)}
                    onClick={() => toggleService(svc.name)}
                    icon={SERVICE_ICONS[svc.name]}
                    title={t(svc.name)}
                    subtitle={s.vehicle && forCar === undefined ? `${t('Not available for')} ${t(s.vehicle)}` : ''}
                    price={forCar !== undefined ? qar(forCar) : `${t('From')} ${qar(from)}`}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </>
    );
  } else if (s.step === 1) {
    content = (
      <>
        <h2 className="text-3xl font-bold text-gray-900">{t('What are you driving?')}</h2>
        <p className="text-lg text-gray-500 mt-1 mb-6">
          {t('Price depends on your car size.')}{s.services.length === 0 && <> {t('Choose a service first to see prices.')}</>}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {vehicleOptions.map((v) => {
            const price = servicesPrice(s.services, v);
            return (
              <Tile
                key={v}
                selected={s.vehicle === v}
                onClick={() => set({ vehicle: v })}
                icon={VEHICLE_ICONS[v] || Car}
                title={t(v)}
                subtitle={s.services.length === 1 ? t(s.services[0]) : s.services.length > 1 ? `${s.services.length} ${t('services')}` : ''}
                price={price !== undefined ? qar(price) : ''}
              />
            );
          })}
        </div>
      </>
    );
  } else if (s.step === 2) {
    content = (
      <>
        <h2 className="text-3xl font-bold text-gray-900">{t('Add other services')}</h2>
        <p className="text-lg text-gray-500 mt-1 mb-6">
          {s.services.length === 0 ? t('Choose at least one service.') : t('Optional. Tap to add or remove.')}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {EXTRAS.map((extra) => (
            <Tile
              key={extra.name}
              selected={s.extras.includes(extra.name)}
              onClick={() => toggleExtra(extra.name)}
              icon={Armchair}
              title={t(extra.name)}
              price={`+ ${extra.from ? `${t('From')} ` : ''}${qar(extra.price)}`}
            />
          ))}
        </div>
      </>
    );
  } else {
    // `optional`: tapping the chosen button again clears it.
    const choiceRow = (options, value, field, icons, { optional = false, labels = {} } = {}) => (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {options.map((o) => {
          const Icon = icons[o];
          const on = value === o;
          return (
            <button
              key={o || 'none'}
              type="button"
              aria-pressed={on}
              onClick={() => set({ [field]: on && optional ? '' : o, ...(field === 'discount' && o !== 'Coupon' ? { coupon: '' } : {}) })}
              className={`flex items-center justify-center gap-2 py-4 px-3 border-2 text-lg font-bold transition-colors ${
                on ? 'border-[var(--primary)] bg-[var(--primary)] text-white' : 'border-gray-200 bg-white text-gray-800 hover:border-gray-300'
              }`}
            >
              {Icon && <Icon className="w-5 h-5" aria-hidden="true" />}
              {t(labels[o] || o)}
            </button>
          );
        })}
      </div>
    );

    content = (
      <>
        <h2 className="text-3xl font-bold text-gray-900">{t('Your details and payment')}</h2>
        <p className="text-lg text-gray-500 mt-1 mb-6">{t('Fill in your details and choose how to pay.')}</p>

        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-3">{t('Your details')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="k-name" className="text-base font-semibold text-gray-700 mb-2">{t('Your name')} <span className="text-red-500">*</span></label>
            <input
              id="k-name" autoComplete="off" value={s.name} onChange={(e) => set({ name: e.target.value })} style={BIG_INPUT}
            />
          </div>
          <div>
            <label htmlFor="k-phone" className="text-base font-semibold text-gray-700 mb-2">{t('Mobile number')} <span className="text-red-500">*</span></label>
            <input
              id="k-phone" type="tel" inputMode="tel" dir="ltr" autoComplete="off" placeholder="+974 5555 0000"
              value={s.phone} onChange={(e) => set({ phone: e.target.value })} style={BIG_INPUT}
              aria-invalid={s.phone !== '' && !phoneOk}
            />
            {s.phone !== '' && !phoneOk && <p className="mt-1 text-sm text-red-600">{t('Enter a valid mobile number')}</p>}
          </div>
          <div>
            <label htmlFor="k-plate" className="text-base font-semibold text-gray-700 mb-2">{t('Plate number')} <span className="text-red-500">*</span></label>
            <input
              id="k-plate" inputMode="numeric" dir="ltr" autoComplete="off" placeholder="123456"
              value={s.plate} onChange={(e) => set({ plate: e.target.value })} style={BIG_INPUT}
            />
          </div>
        </div>

        <div className="mt-7">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-3">{t('Discount')}</h3>
          {choiceRow(['', ...DISCOUNTS], s.discount, 'discount', DISCOUNT_ICONS, { labels: { '': 'No discount' } })}
          {s.discount === 'Coupon' && (
            <div className="mt-4 max-w-md">
              <label htmlFor="k-coupon" className="text-base font-semibold text-gray-700 mb-2">{t('Coupon number')} <span className="text-red-500">*</span></label>
              <input
                id="k-coupon" dir="ltr" autoComplete="off" placeholder="MT-0000"
                value={s.coupon} onChange={(e) => set({ coupon: e.target.value })} style={BIG_INPUT}
              />
              <p className={`mt-1 text-sm font-semibold flex items-center gap-1.5 ${couponOn ? 'text-green-700' : 'text-gray-500'}`}>
                <Ticket className="w-4 h-4" aria-hidden="true" />
                {couponOn ? `${t('Coupon applied')}: ${COUPON_RATE * 100}% ${t('off')}` : t('Enter your coupon number')}
              </p>
            </div>
          )}
          {(s.discount === 'Loyalty Free' || s.discount === 'Fleet Discount') && (
            <p className="mt-3 text-base text-gray-600 flex items-center gap-2">
              <Tag className="w-4 h-4 text-[var(--primary)]" aria-hidden="true" /> {t('Our staff will confirm this discount at the counter.')}
            </p>
          )}
        </div>

        <div className="mt-7">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-3">{t('Payment')}</h3>
          <span className="block text-base font-semibold text-gray-700 mb-2">{t('Payment method')} <span className="text-red-500">*</span></span>
          {choiceRow(PAYMENT_METHODS, s.paymentMethod, 'paymentMethod', METHOD_ICONS)}
          <span className="block text-base font-semibold text-gray-700 mt-5 mb-2">{t('Payment type')} <span className="font-normal text-gray-400">{t('(optional)')}</span></span>
          {choiceRow(PAYMENT_TYPES, s.paymentType, 'paymentType', TYPE_ICONS, { optional: true })}
        </div>

        <div className="mt-6">
          <span className="block text-base font-semibold text-gray-700 mb-2">{t('When do you want to start?')}</span>
          <div className="flex flex-wrap gap-2.5">
            {SLOTS.map((slot) => {
              const on = s.slot === slot.key;
              return (
                <button
                  key={slot.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => set({ slot: slot.key })}
                  className={`btn-icon px-5 py-3 text-base font-bold border-2 transition-colors ${
                    on ? 'border-[var(--primary)] bg-[var(--primary)] text-white' : 'border-gray-200 bg-white text-gray-800 hover:border-gray-300'
                  }`}
                >
                  {t(slot.key)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6">
          <label htmlFor="k-notes" className="text-base font-semibold text-gray-700 mb-2">{t('Notes')} <span className="font-normal text-gray-400">{t('(optional)')}</span></label>
          <textarea
            id="k-notes" rows={2} autoComplete="off" placeholder={t('Anything we should know?')}
            value={s.notes} onChange={(e) => set({ notes: e.target.value })} style={BIG_INPUT}
          />
        </div>
      </>
    );
  }

  return (
    <div
      dir={ar ? 'rtl' : 'ltr'}
      lang={lang}
      translate="no"
      className="min-h-screen flex flex-col bg-gray-100 select-none [&_input]:select-text [&_textarea]:select-text"
      style={{ touchAction: 'pan-x pan-y', WebkitTouchCallout: 'none' }}
    >
      {!started ? (
        /* ── Welcome screen (shown while nobody is ordering) ── */
        <div className="flex-1 flex flex-col items-center justify-center gap-10 px-6 py-12 bg-[var(--brand-black)] text-white text-center">
          <NextImage src={logo} alt="Magic Track — Car Wash & Auto Care" className="w-[min(520px,80vw)] h-auto" priority />
          <div>
            <h1 className="text-5xl sm:text-6xl font-black tracking-tight">Welcome to Magic Track</h1>
            <p className="text-4xl sm:text-5xl font-bold text-white/80 mt-3" dir="rtl" lang="ar">أهلاً بكم في ماجيك تراك</p>
          </div>
          <div className="flex flex-wrap items-stretch justify-center gap-5">
            <button
              type="button"
              onClick={() => begin('en')}
              className="flex items-center gap-3 px-12 py-7 text-3xl font-extrabold bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] active:scale-[0.98] transition"
            >
              <Hand className="w-8 h-8" aria-hidden="true" /> Start order
            </button>
            <button
              type="button"
              onClick={() => begin('ar')}
              dir="rtl"
              lang="ar"
              className="flex items-center gap-3 px-12 py-7 text-3xl font-extrabold bg-white text-gray-900 hover:bg-gray-100 active:scale-[0.98] transition"
            >
              <Hand className="w-8 h-8" aria-hidden="true" /> ابدأ الطلب
            </button>
          </div>
          <p className="text-2xl text-white/60 animate-pulse">
            Touch a button to start your order · <span dir="rtl" lang="ar">اختر لغة لبدء طلبك</span>
          </p>
        </div>
      ) : (
      <>
      {/* Header */}
      <header className="bg-[var(--brand-black)] border-b-[3px] border-[var(--primary)] px-4 sm:px-8 py-3 flex items-center justify-between gap-4">
        <NextImage src={logo} alt="Magic Track — Car Wash & Auto Care" className="h-16 w-auto" priority />
        <span className="hidden md:block text-white/70 text-lg">{t('Touch the screen to start your order')}</span>
        <button
          type="button"
          onClick={() => setLang(ar ? 'en' : 'ar')}
          className="btn-icon flex items-center gap-2 bg-white text-gray-900 px-5 py-2.5 text-lg font-extrabold hover:bg-gray-100"
        >
          <Languages className="w-5 h-5" aria-hidden="true" />
          {ar ? 'English' : 'العربية'}
        </button>
      </header>

      {done ? (
        /* ── Order placed ── */
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="bg-white border border-gray-200 shadow-sm max-w-xl w-full text-center px-8 py-12 animate-fade-in-scale">
            <CircleCheck className="w-16 h-16 text-green-600 mx-auto" aria-hidden="true" />
            <h2 className="text-4xl font-bold text-gray-900 mt-4">{t('Order placed')}</h2>
            <p className="text-lg text-gray-500 mt-6">{t('Your queue number')}</p>
            <div className="text-8xl font-black text-[var(--primary)] leading-none mt-2" dir="ltr">{done.queue}</div>
            <p className="text-lg text-gray-700 mt-6">
              {done.services.length ? done.services.map(t).join(' + ') : t('Other services only')} · {t(done.vehicle)} ·{' '}
              {done.slot === 'Now' ? t('Starting now') : `${t('In')} ${t(done.slot)}`}
            </p>
            <p className="text-2xl font-extrabold text-gray-900 mt-2">{t('Total')}: {qar(done.total)}</p>
            <p className="text-base text-gray-500 mt-4">
              {t('Please pay at the counter.')} {t('Watch the queue screen for your number.')}
            </p>
            <button
              type="button"
              onClick={resetKiosk}
              className="mt-8 w-full py-5 text-xl font-extrabold bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors"
            >
              {t('Start new order')}
            </button>
            <p className="text-sm text-gray-400 mt-3">
              {t('This screen resets in')} {secondsLeft} {t('seconds')}
            </p>
          </div>
        </main>
      ) : (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_380px]">
          {/* ── Steps ── */}
          <section className="flex flex-col min-w-0 p-4 sm:p-6 lg:pe-0">
            <div role="tablist" aria-label="Order steps" className="flex gap-2 overflow-x-auto">
              {STEPS.map((label, i) => {
                const active = s.step === i;
                const complete = !active && stepOk[i];
                return (
                  <button
                    key={label}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => set({ step: i })}
                    className={`flex-1 min-w-[150px] py-4 px-3 flex items-center justify-center gap-2 text-base sm:text-lg font-bold transition-colors ${
                      active
                        ? 'bg-[var(--primary)] text-white'
                        : complete
                        ? 'bg-[var(--primary-light)] text-[var(--primary-dark)]'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                  >
                    {complete && <Check className="w-5 h-5" aria-hidden="true" />}
                    {t(label)}
                  </button>
                );
              })}
            </div>
            <main className="flex-1 bg-white border border-gray-200 border-t-0 p-5 sm:p-7">{content}</main>
          </section>

          {/* ── Summary ── */}
          <aside className="bg-white lg:border-s border-t lg:border-t-0 border-gray-200 p-6 flex flex-col lg:sticky lg:top-0 lg:h-[calc(100vh-91px)]">
            <h3 className="text-2xl font-bold text-gray-900 mb-3">{t('Your order')}</h3>
            <div className="flex-1 overflow-y-auto">
              {lines.length === 0 ? (
                <p className="text-gray-500 py-3">{t('Nothing selected yet.')}</p>
              ) : (
                lines.map((line, i) => (
                  <div key={i} className="flex justify-between gap-3 py-3 border-b border-gray-100 text-base">
                    <span className="text-gray-900 font-medium">
                      {line.label}
                      {line.sub && <span className="block text-sm text-gray-500 font-normal">{line.sub}</span>}
                    </span>
                    <span className="text-gray-900 font-semibold whitespace-nowrap">{line.price}</span>
                  </div>
                ))
              )}
              {s.paymentMethod && (
                <div className="flex justify-between gap-3 py-3 border-b border-gray-100 text-base">
                  <span className="text-gray-500">{t('Payment method')}</span>
                  <span className="text-gray-900 font-semibold">{t(s.paymentMethod)}{s.paymentType ? ` · ${t(s.paymentType)}` : ''}</span>
                </div>
              )}
            </div>

            <div className="pt-4 border-t-2 border-gray-200 mt-3">
              {couponOn && subtotal > 0 && (
                <>
                  <div className="flex justify-between text-base text-gray-600 py-1">
                    <span>{t('Subtotal')}</span><span>{qar(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-base text-green-700 font-semibold py-1">
                    <span>{t('Coupon')} ({COUPON_RATE * 100}%)</span><span>− {qar(subtotal - total)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between items-baseline text-2xl font-extrabold text-gray-900 py-1">
                <span>{t('Total')}</span><span>{qar(total)}</span>
              </div>
              {hasStartingPrice && (
                <p className="text-xs text-gray-500 mt-1">{t('Includes a starting price — final price confirmed at the counter.')}</p>
              )}
              {saveError && (
                <p className="mt-3 flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2" role="alert">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  {t('Could not save your order. Please ask our staff for help.')}
                </p>
              )}
              {s.step === STEPS.length - 1 && missing.length > 0 && (
                <div className="mt-3 text-sm bg-[var(--primary-light)] border border-[var(--primary)]/30 px-3 py-2">
                  <span className="font-semibold text-gray-800">{t('Still needed:')}</span>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                    {missing.map((m) => (
                      <button
                        key={m.label}
                        type="button"
                        onClick={() => set({ step: m.step })}
                        className="text-[var(--primary-dark)] font-medium underline"
                      >
                        {t(m.label)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-3 mt-4">
                {s.step > 0 && (
                  <button
                    type="button"
                    onClick={() => set({ step: s.step - 1 })}
                    className="flex-1 flex items-center justify-center gap-2 py-5 text-xl font-bold border-2 border-gray-300 bg-white text-gray-800 hover:bg-gray-50"
                  >
                    <ArrowLeft className="w-5 h-5 rtl:-scale-x-100" aria-hidden="true" /> {t('Back')}
                  </button>
                )}
                {s.step < STEPS.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => set({ step: s.step + 1 })}
                    className="flex-1 flex items-center justify-center gap-2 py-5 text-xl font-bold bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {t('Next')} <ArrowRight className="w-5 h-5 rtl:-scale-x-100" aria-hidden="true" />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={firstIncomplete !== -1 || placing}
                    onClick={placeOrder}
                    className="flex-1 flex items-center justify-center gap-2 py-5 text-xl font-bold bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {placing ? <Loader2 className="w-6 h-6 animate-spin" aria-hidden="true" /> : <Check className="w-6 h-6" aria-hidden="true" />}
                    {placing ? t('Placing your order…') : t('Place order')}
                  </button>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}
      </>
      )}

      {/* ── "Are you still there?" ── */}
      {idleLeft !== null && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6" role="alertdialog" aria-modal="true" aria-labelledby="idle-title">
          <div className="bg-white max-w-lg w-full text-center px-8 py-10 animate-fade-in-scale">
            <h2 id="idle-title" className="text-4xl font-bold text-gray-900">{t('Are you still there?')}</h2>
            <p className="text-lg text-gray-500 mt-3">{t('Tap anywhere to continue your order.')}</p>
            <p className="text-lg text-gray-700 mt-6">{t('Starting over in')}</p>
            <div className="text-7xl font-black text-[var(--primary)] leading-none mt-2 tabular-nums">{idleLeft}</div>
            <button
              type="button"
              onClick={() => setIdleLeft(null)}
              className="mt-8 w-full py-5 text-xl font-extrabold bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors"
            >
              {t("I'm still here")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
