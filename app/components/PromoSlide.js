import NextImage from 'next/image';
import logo from '../../public/magic-track-logo.png';
import { SERVICE_GROUPS } from '../../utils/priceList';

/**
 * Built-in ad slides for the queue screen, drawn from the price list so the
 * prices are always current. Sized in vmin so they fill a portrait (1080×1920)
 * or landscape screen alike.
 */

const PROTECTION = ['Nano Ceramic Tint', 'Nano Ceramic Coating – Graphene Pro', 'Paint Protection Film (PPF)'];

const ALL_SERVICES = SERVICE_GROUPS.flatMap((g) => g.services);
const fromPrice = (svc) => Math.min(...Object.values(svc.prices));

const SLIDES = {
  wash: {
    en: 'Make it shine',
    ar: 'اجعلها تلمع',
    services: ALL_SERVICES.filter((s) => !PROTECTION.includes(s.name)),
  },
  protect: {
    en: 'Protect your car',
    ar: 'احمِ سيارتك',
    services: ALL_SERVICES.filter((s) => PROTECTION.includes(s.name)),
  },
};

export default function PromoSlide({ promo }) {
  const slide = SLIDES[promo] || SLIDES.wash;
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-[4vmin] px-[6vmin] bg-[var(--brand-black)] text-white text-center">
      <NextImage src={logo} alt="Magic Track — Car Wash & Auto Care" className="w-[45vmin] h-auto" />
      <div>
        <h2 className="text-[9vmin] font-black leading-none tracking-tight">{slide.en}</h2>
        <p className="text-[6vmin] font-bold text-[var(--primary)] mt-[1.5vmin]" dir="rtl" lang="ar">{slide.ar}</p>
      </div>
      <ul className="w-full max-w-[90vmin] flex flex-col gap-[1.6vmin]">
        {slide.services.map((svc) => (
          <li key={svc.name} className="flex items-baseline justify-between gap-[3vmin] px-[3vmin] py-[1.8vmin] bg-white/[0.06] border-s-[0.8vmin] border-[var(--primary)]">
            <span className="text-[3.6vmin] font-bold text-start">{svc.name}</span>
            <span className="text-[3.6vmin] font-black text-[var(--primary)] whitespace-nowrap">
              <span className="text-[2.4vmin] font-semibold text-white/60">from </span>QAR {fromPrice(svc).toLocaleString('en-US')}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-[3.4vmin] font-bold text-white/80">
        Order at the kiosk · <span dir="rtl" lang="ar">اطلب من الشاشة</span>
      </p>
    </div>
  );
}
