'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ClipboardCheck, RefreshCw, Download, FileDown, Printer, MessageCircle, Loader2, AlertCircle,
  Banknote, CreditCard, Zap, Hourglass, Receipt, Tag, Wrench, MonitorSmartphone,
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Toast from '../components/Toast';
import { useAuth } from '../contexts/AuthContext';
import { fetchCarWashOrders } from '../../utils/carWashApi';
import { formatQar } from '../../utils/priceList';
import { getWhatsAppUrl } from '../../utils/location';
import { downloadDayReportPdf } from '../../utils/dayClosePdf';
import {
  buildDayReport, dayReportCsv, dayReportText, rangeLabel, isoDate, timeOf, paymentModeOf, summaryLines,
} from '../../utils/dayClose';

/**
 * Day Close: the daily closing report the client used to rebuild by hand in
 * Excel. Pick a day (or a range): totals by Cash / Card / Online, what is still
 * to collect, discounts, work done, and every order of the day — then export
 * it to Excel, print it, or send the summary on WhatsApp.
 */

/** Quick report periods. The week starts on Sunday, as in Qatar. */
function presets() {
  const now = new Date();
  const day = (offset) => { const d = new Date(now); d.setDate(d.getDate() + offset); return isoDate(d); };
  const today = isoDate(now);
  const weekStart = day(-now.getDay());
  const monthStart = isoDate(new Date(now.getFullYear(), now.getMonth(), 1));
  const lastMonthStart = isoDate(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const lastMonthEnd = isoDate(new Date(now.getFullYear(), now.getMonth(), 0));
  return [
    { label: 'Today', from: today, to: today },
    { label: 'Yesterday', from: day(-1), to: day(-1) },
    { label: 'This week', from: weekStart, to: today },
    { label: 'This month', from: monthStart, to: today },
    { label: 'Last month', from: lastMonthStart, to: lastMonthEnd },
  ];
}

const PAYMENT_MODE_PILL = {
  Cash: 'bg-green-100 text-green-700',
  Card: 'bg-blue-100 text-blue-700',
  Online: 'bg-violet-100 text-violet-700',
  Paid: 'bg-gray-100 text-gray-700',
};

function StatCard({ icon: Icon, label, value, sub, tone = 'default' }) {
  const tones = {
    primary: 'bg-[var(--primary)] text-white border-[var(--primary)]',
    warn: 'bg-red-50 text-red-800 border-red-200',
    default: 'bg-white text-gray-900 border-gray-200',
  };
  return (
    <div className={`border px-4 py-3.5 ${tones[tone]}`}>
      <div className={`flex items-center gap-1.5 text-xs font-semibold ${tone === 'primary' ? 'text-white/85' : 'text-gray-500'}`}>
        <Icon className="w-3.5 h-3.5" aria-hidden="true" /> {label}
      </div>
      <div className="text-2xl font-extrabold mt-1 tabular-nums">{value}</div>
      {sub && <div className={`text-[11px] mt-0.5 ${tone === 'primary' ? 'text-white/80' : 'text-gray-500'}`}>{sub}</div>}
    </div>
  );
}

function Panel({ icon: Icon, title, children }) {
  return (
    <section className="bg-white border border-gray-200 p-4 break-inside-avoid">
      <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-[var(--primary)]" aria-hidden="true" /> {title}
      </h2>
      {children}
    </section>
  );
}

// On paper the cells wrap and shrink so the whole table fits the page width.
const TH = 'text-left text-[10px] uppercase tracking-wide text-gray-500 font-semibold bg-gray-50 px-3 py-2 border-b border-gray-200 whitespace-nowrap print:px-1.5 print:py-1 print:text-[8px] print:whitespace-normal';
const TD = 'px-3 py-2 text-[13px] text-gray-700 whitespace-nowrap print:px-1.5 print:py-1 print:text-[9px] print:whitespace-normal';

export default function DayClosePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [from, setFrom] = useState(() => isoDate());
  const [to, setTo] = useState(() => isoDate());
  const [toast, setToast] = useState(null);
  const { user } = useAuth();

  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);

  const load = useCallback(async () => {
    try {
      setOrders(await fetchCarWashOrders());
      setLoadError(null);
    } catch (error) {
      console.error('Day Close: could not load orders', error);
      setLoadError(error?.message || 'Could not load orders from the server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(load, 0);
    return () => clearTimeout(first);
  }, [load]);

  const refresh = async () => {
    setLoading(true);
    await load();
  };

  // "To" can't be before "From".
  const start = from <= to ? from : to;
  const end = from <= to ? to : from;
  const report = useMemo(() => buildDayReport(orders, start, end), [orders, start, end]);
  const label = rangeLabel(start, end);

  const today = isoDate();
  const periods = presets();

  const exportExcel = () => {
    if (report.orders.length === 0) {
      setToast({ message: 'No orders on this day to export.', type: 'warning' });
      return;
    }
    const url = URL.createObjectURL(new Blob([dayReportCsv(report)], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = start === end ? `MagicTrack-DayClose-${start}.csv` : `MagicTrack-DayClose-${start}_to_${end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setToast({ message: `Day Close exported (${report.orders.length} orders)`, type: 'success' });
  };

  const [makingPdf, setMakingPdf] = useState(false);
  const downloadPdf = async () => {
    if (report.orders.length === 0) {
      setToast({ message: 'No orders in this period to put in a PDF.', type: 'warning' });
      return;
    }
    setMakingPdf(true);
    try {
      await downloadDayReportPdf(report, { printedBy: user?.username });
      setToast({ message: 'PDF downloaded', type: 'success' });
    } catch (error) {
      console.error('Day Close PDF error', error);
      setToast({ message: 'Could not make the PDF. Please try again.', type: 'error' });
    } finally {
      setMakingPdf(false);
    }
  };

  const shareWhatsApp = () => window.open(getWhatsAppUrl(dayReportText(report)), '_blank', 'noopener,noreferrer');

  return (
    // print-color-adjust: keep the coloured cards and red unpaid rows on paper,
    // without the "Background graphics" print setting.
    <div
      className="flex min-h-screen bg-gray-50 overflow-x-hidden print:block print:min-h-0 print:overflow-visible print:bg-white"
      style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
    >
      <div className="print:hidden">
        <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden print:hidden" onClick={toggleSidebar} aria-hidden="true" />
      )}

      <div className="flex-1 flex flex-col min-h-screen lg:ml-[240px] print:ml-0 w-full lg:w-auto overflow-x-hidden print:block print:min-h-0 print:overflow-visible">
        <div className="px-4 md:px-6 pt-4 md:pt-6 print:hidden">
          <Header title="Day Close" toggleSidebar={toggleSidebar} />
        </div>

        <main className="flex-1 px-4 md:px-6 pb-6 print:p-0 overflow-x-hidden print:overflow-visible">
          <div className="space-y-4">
            {/* Paper: A4 landscape, so the order table fits across the page. */}
            <style>{'@media print { @page { size: A4 landscape; margin: 10mm; } }'}</style>

            {/* Printed header (paper only) */}
            <div className="hidden print:block border-b-2 border-black pb-2">
              <h1 className="text-xl font-bold">Magic Track — Day Close Report</h1>
              <p className="text-sm">{label} · Printed {new Date().toLocaleString('en-GB')}{user?.username ? ` by ${user.username}` : ''}</p>
            </div>

            {/* Controls */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 print:hidden">
              <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
                    <ClipboardCheck className="w-5 h-5 text-[var(--primary)]" aria-hidden="true" />
                  </div>
                  <div>
                    <h1 className="text-base font-semibold text-gray-900">Daily Report — {label}</h1>
                    <p className="text-xs text-gray-500">Everything collected on the day, ready to export, print or share. Only <b>paid</b> orders count as collected.</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <div>
                    <label htmlFor="dc-period" className="text-[11px]">Report period</label>
                    {/* The option matching the From / To dates is selected; any other range is "Custom dates". */}
                    <select
                      id="dc-period"
                      value={periods.find((p) => p.from === start && p.to === end)?.label || 'custom'}
                      onChange={(e) => {
                        const p = periods.find((x) => x.label === e.target.value);
                        if (p) { setFrom(p.from); setTo(p.to); }
                      }}
                      style={{ width: 170 }}
                    >
                      {periods.map((p) => <option key={p.label} value={p.label}>{p.label}</option>)}
                      <option value="custom">Custom dates</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="dc-from" className="text-[11px]">From</label>
                    <input id="dc-from" type="date" value={from} max={today} onChange={(e) => e.target.value && setFrom(e.target.value)} style={{ width: 150 }} />
                  </div>
                  <div>
                    <label htmlFor="dc-to" className="text-[11px]">To</label>
                    <input id="dc-to" type="date" value={to} max={today} onChange={(e) => e.target.value && setTo(e.target.value)} style={{ width: 150 }} />
                  </div>
                  <button
                    type="button"
                    onClick={refresh}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" /> Refresh
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 px-5 pb-4">
                <button
                  type="button"
                  onClick={exportExcel}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors"
                >
                  <Download className="w-4 h-4" aria-hidden="true" /> Export to Excel
                </button>
                <button
                  type="button"
                  onClick={downloadPdf}
                  disabled={makingPdf}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-[var(--brand-black)] text-white hover:bg-[var(--brand-black-soft)] transition-colors disabled:opacity-60"
                >
                  {makingPdf ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <FileDown className="w-4 h-4" aria-hidden="true" />}
                  {makingPdf ? 'Making PDF…' : 'Download PDF'}
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Printer className="w-4 h-4" aria-hidden="true" /> Print
                </button>
                <button
                  type="button"
                  onClick={shareWhatsApp}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" aria-hidden="true" /> Send summary on WhatsApp
                </button>
              </div>
              {loadError && (
                <div className="mx-5 mb-4 px-3 py-2 flex items-center gap-2 text-sm bg-red-50 border border-red-200 text-red-700" role="alert">
                  <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="mr-auto">Could not load orders: {loadError}</span>
                  <button onClick={refresh} className="text-xs font-semibold underline">Try again</button>
                </div>
              )}
            </div>

            {loading && orders.length === 0 ? (
              <div className="bg-white border border-gray-200 py-16 text-center text-gray-500">
                <Loader2 className="w-8 h-8 mx-auto mb-3 text-[var(--primary)] animate-spin" aria-hidden="true" />
                <p className="text-sm">Loading the day…</p>
              </div>
            ) : (
              <>
                {/* Totals */}
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                  <StatCard icon={Receipt} label="Total collected" value={formatQar(report.collected)} sub={`${report.paidCount} paid orders`} tone="primary" />
                  <StatCard icon={Banknote} label="Cash" value={formatQar(report.byChannel.cash.amount)} sub={`${report.byChannel.cash.count} orders`} />
                  <StatCard icon={CreditCard} label="Card" value={formatQar(report.byChannel.card.amount)} sub={`${report.byChannel.card.count} orders`} />
                  <StatCard icon={Zap} label="Online (Fawran)" value={formatQar(report.byChannel.online.amount)} sub={`${report.byChannel.online.count} orders`} />
                  <StatCard
                    icon={Hourglass}
                    label="Still to collect"
                    value={formatQar(report.stillToCollect.amount)}
                    sub={`${report.stillToCollect.count} unpaid${report.credit.count ? ` · ${report.credit.count} on credit` : ''}`}
                    tone={report.stillToCollect.count ? 'warn' : 'default'}
                  />
                  <StatCard icon={Tag} label="Discounts given" value={formatQar(report.discountTotal)} sub={`${report.orders.length} orders in total`} />
                </div>

                {report.byChannel.unspecified.count > 0 && (
                  <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2">
                    {report.byChannel.unspecified.count} paid order{report.byChannel.unspecified.count === 1 ? ' has' : 's have'} no payment method recorded
                    ({formatQar(report.byChannel.unspecified.amount)}). It is included in the total collected; set Cash or Card on the order to put it in the right column.
                  </p>
                )}

                {/* Breakdowns */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <Panel icon={Receipt} title="Totals">
                    <dl className="text-[13px]">
                      {summaryLines(report).map((l) => (
                        <div
                          key={l.label}
                          className={`flex items-baseline gap-2 py-1.5 ${l.strong ? 'border-t-2 border-gray-300 mt-1 pt-2.5 text-[15px] font-extrabold text-gray-900' : 'text-gray-700'}`}
                        >
                          <dt>{l.label}</dt>
                          <span className="flex-1 border-b border-dotted border-gray-300 translate-y-[-3px]" aria-hidden="true" />
                          <dd className={`tabular-nums ${l.strong ? '' : 'font-semibold text-gray-900'}`}>{formatQar(l.amount)}</dd>
                        </div>
                      ))}
                      <div className="flex items-baseline gap-2 pt-3 text-red-700">
                        <dt>Still to collect ({report.stillToCollect.count} unpaid)</dt>
                        <span className="flex-1 border-b border-dotted border-red-200 translate-y-[-3px]" aria-hidden="true" />
                        <dd className="tabular-nums font-semibold">{formatQar(report.stillToCollect.amount)}</dd>
                      </div>
                    </dl>
                    <p className="text-[10px] text-gray-400 mt-2">Cheque, refunds and cancellations aren&apos;t recorded in the system yet, so they show 0.</p>
                  </Panel>

                  <Panel icon={Wrench} title="Work done">
                    {report.services.length === 0 ? (
                      <p className="text-sm text-gray-500 py-4 text-center">No orders on this day.</p>
                    ) : (
                      <ul className="divide-y divide-gray-100 max-h-[260px] overflow-auto print:max-h-none">
                        {report.services.map((s) => (
                          <li key={s.name} className="flex justify-between gap-3 py-1.5 text-[13px]">
                            <span className="text-gray-700">{s.name}</span>
                            <span className="font-semibold text-gray-900 tabular-nums">{s.count}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Panel>

                  <Panel icon={MonitorSmartphone} title="Discounts & sources">
                    <table className="w-full border-collapse mb-3">
                      <thead><tr><th className={TH}>Discount</th><th className={TH}>Orders</th><th className={`${TH} text-right`}>Given</th></tr></thead>
                      <tbody>
                        {report.discounts.length === 0 ? (
                          <tr><td className={TD} colSpan={3}>No discounts</td></tr>
                        ) : report.discounts.map((d) => (
                          <tr key={d.type} className="border-b border-gray-100">
                            <td className={TD}>{d.type}</td>
                            <td className={TD}>{d.count}</td>
                            <td className={`${TD} text-right font-semibold text-gray-900`}>{formatQar(d.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <table className="w-full border-collapse">
                      <thead><tr><th className={TH}>Placed at</th><th className={TH}>Orders</th><th className={`${TH} text-right`}>Collected</th></tr></thead>
                      <tbody>
                        {[['Customer kiosk', report.sources.kiosk], ['Counter (staff)', report.sources.counter]].map(([name, v]) => (
                          <tr key={name} className="border-b border-gray-100">
                            <td className={TD}>{name}</td>
                            <td className={TD}>{v.count}</td>
                            <td className={`${TD} text-right font-semibold text-gray-900`}>{formatQar(v.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Panel>
                </div>

                {/* Every order of the day */}
                <section className="bg-white border border-gray-200">
                  <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 px-4 pt-4 pb-3">
                    <Receipt className="w-4 h-4 text-[var(--primary)]" aria-hidden="true" /> Orders ({report.orders.length})
                    {report.unpaid.length > 0 && <span className="text-xs font-normal text-red-700">· {report.unpaid.length} unpaid (shown in red)</span>}
                  </h2>
                  <div className="overflow-auto max-h-[70vh] print:max-h-none print:overflow-visible">
                    <table className="w-full border-collapse min-w-[1100px] print:min-w-0">
                      <thead>
                        <tr>
                          {['#', 'Order', 'Time', 'Name', 'Phone', 'Plate', 'Vehicle', 'Services', 'Discount', 'Amount', 'Payment Mode'].map((h) => (
                            <th key={h} className={`${TH} sticky top-0 z-10 print:static ${h === 'Amount' ? 'text-right' : ''}`}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {report.orders.map((o, i) => {
                          const paid = o.status === 'paid';
                          const mode = paymentModeOf(o);
                          return (
                            <tr key={o.id} className={`border-b border-gray-100 ${paid ? '' : 'bg-red-50/60'}`}>
                              <td className={`${TD} text-gray-400`}>{i + 1}</td>
                              <td className={`${TD} font-semibold text-gray-900`}>
                                #{o.id}
                                {o.tokens?.length > 0 && <span className="block text-[10px] font-normal text-gray-400">{o.tokens.join(' · ')}</span>}
                              </td>
                              <td className={TD}>{start === end ? timeOf(o) : `${o.date} ${timeOf(o)}`}</td>
                              <td className={TD}>{o.customer?.name || '—'}</td>
                              <td className={TD}>{o.customer?.phone || '—'}</td>
                              <td className={TD}>{o.numberPlate || '—'}</td>
                              <td className={TD}>{o.vehicle || '—'}</td>
                              <td className={`${TD} whitespace-normal min-w-[200px] print:min-w-0`}>
                                {(o.services || []).join(' + ') || '—'}
                                {o.extras?.length > 0 && <span className="block text-[11px] text-gray-500">+ {o.extras.join(', ')}</span>}
                              </td>
                              <td className={TD}>{o.discount || '—'}</td>
                              <td className={`${TD} text-right font-semibold text-gray-900`}>{formatQar(o.total)}</td>
                              <td className={TD}>
                                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${PAYMENT_MODE_PILL[mode] || 'bg-red-100 text-red-700'}`}>
                                  {mode}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      {report.orders.length > 0 && (
                        <tfoot>
                          <tr className="bg-gray-50 border-t-2 border-gray-300">
                            <td className={`${TD} font-bold text-gray-900`} colSpan={9}>Total Net Amount (paid orders)</td>
                            <td className={`${TD} text-right font-extrabold text-gray-900`}>{formatQar(report.collected)}</td>
                            <td className={TD} />
                          </tr>
                        </tfoot>
                      )}
                    </table>
                    {report.orders.length === 0 && (
                      <p className="text-center text-sm text-gray-500 py-12">No orders on {label}.</p>
                    )}
                  </div>
                </section>
              </>
            )}
          </div>
        </main>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
