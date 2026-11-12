import Image from 'next/image';
import logo from '../../public/magic-track-logo.png';

/**
 * Public privacy policy (no login). Meta needs this link before the
 * WhatsApp app can go Live (App settings > Basic > Privacy policy URL).
 */
export const metadata = {
  title: 'Privacy Policy',
  description: 'How Magic Track Car Wash and Auto Care uses customer information and WhatsApp messages.',
};

const UPDATED = '9 November 2026';
const EMAIL = 'info@magictrack.com.qa';
const PHONE = '+974 5170 1605';

function Section({ id, title, children }) {
  return (
    <section id={id} className="scroll-mt-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-2">{title}</h2>
      <div className="space-y-2 text-[15px] leading-relaxed text-gray-700">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <article className="mx-auto max-w-3xl bg-white border border-gray-200 px-6 py-8 sm:px-10 sm:py-10 space-y-7">
        <header className="space-y-4">
          <Image src={logo} alt="Magic Track Car Wash and Auto Care" className="h-14 w-auto" priority />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Privacy Policy</h1>
            <p className="mt-1 text-sm text-gray-500">Last updated: {UPDATED}</p>
          </div>
          <p className="text-[15px] leading-relaxed text-gray-700">
            This policy explains how <b>MAGIC TRACK CAR WASH AND AUTO CARE W.L.L.</b> (&quot;Magic Track&quot;, &quot;we&quot;)
            collects and uses information about our customers, including when we send you messages on WhatsApp.
          </p>
        </header>

        <Section id="collect" title="What we collect">
          <ul className="list-disc pl-5 space-y-1">
            <li>Your name and mobile number, given when you book or visit us.</li>
            <li>Your car details (for example the plate number) and the services you choose.</li>
            <li>Your booking history: dates, services, prices and payments.</li>
            <li>Delivery and read status of the WhatsApp messages we send you, and your replies.</li>
          </ul>
        </Section>

        <Section id="use" title="How we use it">
          <ul className="list-disc pl-5 space-y-1">
            <li>To take your booking, wash and look after your car, and tell you when it is ready.</li>
            <li>To keep records of our services and payments.</li>
            <li>To send you news and offers from Magic Track on WhatsApp. You can stop these at any time.</li>
          </ul>
          <p>We do not sell your information, and we do not share it with other companies for their own marketing.</p>
        </Section>

        <Section id="whatsapp" title="WhatsApp messages">
          <p>
            We send WhatsApp messages through the WhatsApp Business Platform from Meta Platforms, Inc. To deliver them,
            your phone number and the message are passed to WhatsApp. WhatsApp&apos;s own use of this information is covered
            by the{' '}
            <a href="https://www.whatsapp.com/legal/privacy-policy" className="text-[var(--primary)] underline" target="_blank" rel="noopener noreferrer">
              WhatsApp Privacy Policy
            </a>.
          </p>
          <p>
            <b>To stop our offers,</b> reply <b>STOP</b> (or <b>توقف</b>) to any of our messages. We will not send you more offers.
            Reply <b>START</b> if you want them again.
          </p>
        </Section>

        <Section id="keep" title="How long we keep it and how we protect it">
          <p>
            We keep your information while you are our customer and as long as the law requires us to keep business records.
            It is stored on secured servers, and only authorised Magic Track staff can see it.
          </p>
        </Section>

        <Section id="delete" title="Your choices and deleting your data">
          <p>
            You can ask us to show, correct or delete your information. Email <a href={`mailto:${EMAIL}`} className="text-[var(--primary)] underline">{EMAIL}</a>{' '}
            or call {PHONE} from the number we have for you. We reply within 30 days. Records we must keep by law may be kept
            until that time ends.
          </p>
        </Section>

        <Section id="contact" title="Contact us">
          <address className="not-italic">
            MAGIC TRACK CAR WASH AND AUTO CARE W.L.L.<br />
            Building 25, Street 318, Zone 50, Al Thumama, Doha, Qatar<br />
            Phone: {PHONE}<br />
            Email: <a href={`mailto:${EMAIL}`} className="text-[var(--primary)] underline">{EMAIL}</a>
          </address>
          <p>If we change this policy, we will update the date at the top of this page.</p>
        </Section>
      </article>
    </main>
  );
}
