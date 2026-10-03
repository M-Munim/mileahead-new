'use client';

import { useState, useEffect, useMemo, useCallback, Fragment } from 'react';
import {
  Banknote, TrendingUp, TrendingDown, CheckCircle, Clock, XCircle,
  Download, Printer, RefreshCw, ChevronDown, ChevronRight, FileText,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Toast from '../components/Toast';
import RoleGuard from '../components/RoleGuard';
import { ROLES } from '../contexts/AuthContext';
import { bookingService } from '../../utils/axiosInstance';
import { extractArray } from '../../utils/extractArray';
import { exportToCSV, printReport, buildTableHtml } from '../../utils/exportData';
import {
  REPORT_TYPES, buildReport, formatQAR, getBookingDate, getBookingPrice,
  getBookingService, getBookingStatus,
} from '../../utils/financeReport';

const SERVICE_FILTERS = [
  { key: 'all', label: 'All Services' },
  { key: 'carwash', label: 'Car Wash' },
  { key: 'rides', label: 'Rides' },
];

const STATUS_PILL = {
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  open: 'bg-yellow-100 text-yellow-700',
};

const money = (v) => Number(v || 0).toFixed(2);

function SummaryCard({ icon: Icon, tone, label, value, sub }) {
  return (
    <div className={`p-4 border ${tone.card}`}>
      <div className={`w-10 h-10 flex items-center justify-center mb-3 ${tone.icon}`}>
        <Icon className="w-5 h-5 text-white" aria-hidden="true" />
      </div>
      <div className="text-xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-600 mt-0.5">{label}</div>
      {sub && <div className="text-xs mt-1.5">{sub}</div>}
    </div>
  );
}

export default function FinancePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportType, setReportType] = useState('daily');
  const [service, setService] = useState('all');
  const [expandedKey, setExpandedKey] = useState(null);
  const [toast, setToast] = useState(null);

  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await bookingService.getAllBookings({
        status: 'all',
        Service: '',
        field: '',
        search: '',
        sorting: { field: 'id', order: 'desc' },
        page: 1,
        limit: 1000,
      });
      setBookings(extractArray(response));
    } catch (err) {
      console.error('Error fetching bookings for finance report:', err);
      setError(err?.message || 'Could not load bookings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const filteredBookings = useMemo(
    () => (service === 'all' ? bookings : bookings.filter((b) => getBookingService(b) === service)),
    [bookings, service]
  );

  const report = useMemo(() => buildReport(filteredBookings, reportType), [filteredBookings, reportType]);

  const typeMeta = REPORT_TYPES[reportType];
  const currentRow = report.rows[0];
  const previousRow = report.rows[1];
  const growth = previousRow && previousRow.revenue > 0
    ? ((currentRow.revenue - previousRow.revenue) / previousRow.revenue) * 100
    : null;

  // Oldest → newest for the chart
  const chartData = useMemo(
    () => [...report.rows].reverse().map((r) => ({
      name: reportType === 'monthly'
        ? r.start.toLocaleDateString('en-GB', { month: 'short' })
        : r.start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      revenue: Number(r.revenue.toFixed(2)),
    })),
    [report.rows, reportType]
  );

  const serviceLabel = SERVICE_FILTERS.find((s) => s.key === service)?.label;
  const reportTitle = `${typeMeta.label} Financial Report — ${serviceLabel}`;

  const summaryColumns = ['label', 'orders', 'completed', 'cancelled', 'open', 'carWashRevenue', 'ridesRevenue', 'revenue', 'avgOrderValue', 'pendingValue'];
  const summaryHeaders = {
    label: 'Period',
    orders: 'Orders',
    completed: 'Completed',
    cancelled: 'Cancelled',
    open: 'Open',
    carWashRevenue: 'Car Wash Revenue (QAR)',
    ridesRevenue: 'Rides Revenue (QAR)',
    revenue: 'Total Revenue (QAR)',
    avgOrderValue: 'Avg Order (QAR)',
    pendingValue: 'Pending Value (QAR)',
  };

  const summaryRowsForExport = () => {
    const rows = report.rows.map((r) => ({
      label: r.label,
      orders: r.orders,
      completed: r.completed,
      cancelled: r.cancelled,
      open: r.open,
      carWashRevenue: money(r.carWashRevenue),
      ridesRevenue: money(r.ridesRevenue),
      revenue: money(r.revenue),
      avgOrderValue: money(r.avgOrderValue),
      pendingValue: money(r.pendingValue),
    }));
    const t = report.totals;
    rows.push({
      label: 'TOTAL',
      orders: t.orders,
      completed: t.completed,
      cancelled: t.cancelled,
      open: t.open,
      carWashRevenue: money(t.carWashRevenue),
      ridesRevenue: money(t.ridesRevenue),
      revenue: money(t.revenue),
      avgOrderValue: money(t.avgOrderValue),
      pendingValue: money(t.pendingValue),
    });
    return rows;
  };

  const handleExportSummary = () => {
    exportToCSV(summaryRowsForExport(), summaryColumns, summaryHeaders, `${reportType}_financial_report_${service}`);
  };

  const handleExportDetails = () => {
    const rows = report.rows.flatMap((r) =>
      r.bookings.map((b) => ({
        period: r.label,
        id: b.id,
        date: getBookingDate(b)?.toLocaleString('en-GB') || '',
        customer: b.passenger_name || b.customer_name || '',
        phone: b.contact_number || '',
        service: getBookingService(b) === 'carwash' ? 'Car Wash' : 'Ride',
        item: b.package || b.sub_Service || '',
        status: b.status || '',
        price: money(getBookingPrice(b)),
        payment: b.payment_channel || b.payment_method || '',
      }))
    );
    if (rows.length === 0) {
      setToast({ message: 'No bookings in this report to export.', type: 'info' });
      return;
    }
    exportToCSV(
      rows,
      ['period', 'id', 'date', 'customer', 'phone', 'service', 'item', 'status', 'price', 'payment'],
      {
        period: 'Period', id: 'Booking #', date: 'Booked At', customer: 'Customer', phone: 'Contact',
        service: 'Service', item: 'Package / Type', status: 'Status', price: 'Price (QAR)', payment: 'Payment',
      },
      `${reportType}_financial_details_${service}`
    );
  };

  const handlePrint = () => {
    printReport(`${reportTitle} — Magic Track`, buildTableHtml(summaryRowsForExport(), summaryColumns, summaryHeaders));
  };

  return (
    <RoleGuard allowedRoles={[ROLES.ADMIN, ROLES.MANAGER]}>
      <div className="flex min-h-screen bg-gray-50 overflow-x-hidden">
        <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={toggleSidebar} aria-hidden="true" />
        )}

        <div className="flex-1 flex flex-col min-h-screen lg:ml-[240px] w-full lg:w-auto overflow-x-hidden">
          <div className="px-4 md:px-6 pt-4 md:pt-6">
            <Header title="Financial Reports" toggleSidebar={toggleSidebar} />
          </div>

          <main className="flex-1 px-4 md:px-6 pb-6 overflow-x-hidden">
            <div className="max-w-6xl mx-auto space-y-6">
              {/* Controls */}
              <div className="bg-white shadow-sm border border-gray-100 p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div className="flex flex-wrap gap-2" role="tablist" aria-label="Report type">
                  {Object.entries(REPORT_TYPES).map(([key, meta]) => (
                    <button
                      key={key}
                      role="tab"
                      aria-selected={reportType === key}
                      onClick={() => { setReportType(key); setExpandedKey(null); }}
                      className={`px-4 py-2 text-sm font-medium transition-colors ${
                        reportType === key
                          ? 'bg-[var(--primary)] text-white'
                          : 'text-gray-600 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {meta.label}
                    </button>
                  ))}
                  <select
                    value={service}
                    onChange={(e) => { setService(e.target.value); setExpandedKey(null); }}
                    className="px-3 py-2 border border-gray-300 text-sm"
                    aria-label="Filter by service"
                  >
                    {SERVICE_FILTERS.map((s) => (
                      <option key={s.key} value={s.key}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={fetchBookings}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" /> Refresh
                  </button>
                  <button
                    onClick={handleExportSummary}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" aria-hidden="true" /> Summary CSV
                  </button>
                  <button
                    onClick={handleExportDetails}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <FileText className="w-4 h-4" aria-hidden="true" /> Details CSV
                  </button>
                  <button
                    onClick={handlePrint}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-2 bg-[var(--primary)] text-white text-sm font-medium hover:bg-[var(--primary-hover)] disabled:opacity-50"
                  >
                    <Printer className="w-4 h-4" aria-hidden="true" /> Print / PDF
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4">
                  {error} <button onClick={fetchBookings} className="underline font-medium ml-1">Try again</button>
                </div>
              )}

              {loading ? (
                <div className="bg-white shadow-sm border border-gray-100 p-12 text-center">
                  <div className="inline-block w-8 h-8 border-2 border-gray-200 border-t-[var(--primary)] rounded-full animate-spin" />
                  <p className="text-gray-500 mt-4">Building report...</p>
                </div>
              ) : (
                <>
                  {/* Current period summary */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <SummaryCard
                      icon={Banknote}
                      tone={{ card: 'bg-green-50 border-green-200', icon: 'bg-green-600' }}
                      label={`Revenue — ${typeMeta.current}`}
                      value={formatQAR(currentRow.revenue)}
                      sub={growth === null ? (
                        <span className="text-gray-500">No revenue {typeMeta.previous} to compare</span>
                      ) : (
                        <span className={`inline-flex items-center gap-1 font-medium ${growth >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                          {growth >= 0
                            ? <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
                            : <TrendingDown className="w-3.5 h-3.5" aria-hidden="true" />}
                          {growth >= 0 ? '+' : ''}{growth.toFixed(1)}% vs {typeMeta.previous}
                        </span>
                      )}
                    />
                    <SummaryCard
                      icon={CheckCircle}
                      tone={{ card: 'bg-blue-50 border-blue-200', icon: 'bg-blue-600' }}
                      label={`Completed — ${typeMeta.current}`}
                      value={currentRow.completed}
                      sub={<span className="text-gray-500">of {currentRow.orders} orders · avg {formatQAR(currentRow.avgOrderValue)}</span>}
                    />
                    <SummaryCard
                      icon={Clock}
                      tone={{ card: 'bg-yellow-50 border-yellow-200', icon: 'bg-yellow-500' }}
                      label={`Pending Value — ${typeMeta.current}`}
                      value={formatQAR(currentRow.pendingValue)}
                      sub={<span className="text-gray-500">{currentRow.open} open orders, not yet completed</span>}
                    />
                    <SummaryCard
                      icon={XCircle}
                      tone={{ card: 'bg-red-50 border-red-200', icon: 'bg-red-500' }}
                      label={`Cancelled — ${typeMeta.current}`}
                      value={currentRow.cancelled}
                      sub={<span className="text-gray-500">orders</span>}
                    />
                  </div>

                  {/* Chart */}
                  <div className="bg-white shadow-sm border border-gray-100 p-5">
                    <h2 className="text-base font-semibold text-gray-900">Revenue by {reportType === 'daily' ? 'day' : reportType === 'weekly' ? 'week' : 'month'}</h2>
                    <p className="text-xs text-gray-500 mb-4">
                      Last {typeMeta.periods} {reportType === 'daily' ? 'days' : reportType === 'weekly' ? 'weeks' : 'months'} · completed orders only · QAR
                    </p>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(value) => [formatQAR(value), 'Revenue']} />
                          <Bar dataKey="revenue" fill="var(--primary)" radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Report table */}
                  <div className="bg-white shadow-sm border border-gray-100">
                    <div className="px-5 py-4 border-b border-gray-100">
                      <h2 className="text-base font-semibold text-gray-900">{reportTitle}</h2>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Revenue counts completed orders only. Pending value is open orders that have not been completed yet.
                        Click a row to see its bookings.
                      </p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[860px] text-sm">
                        <thead className="bg-gray-50">
                          <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500">
                            <th className="px-4 py-3 font-semibold">Period</th>
                            <th className="px-4 py-3 font-semibold text-right">Orders</th>
                            <th className="px-4 py-3 font-semibold text-right">Completed</th>
                            <th className="px-4 py-3 font-semibold text-right">Cancelled</th>
                            <th className="px-4 py-3 font-semibold text-right">Car Wash</th>
                            <th className="px-4 py-3 font-semibold text-right">Rides</th>
                            <th className="px-4 py-3 font-semibold text-right">Revenue</th>
                            <th className="px-4 py-3 font-semibold text-right">Avg Order</th>
                            <th className="px-4 py-3 font-semibold text-right">Pending</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.rows.map((r) => {
                            const expanded = expandedKey === r.key;
                            const empty = r.orders === 0;
                            return (
                              <Fragment key={r.key}>
                                <tr
                                  onClick={() => !empty && setExpandedKey(expanded ? null : r.key)}
                                  className={`border-t border-gray-100 ${empty ? 'text-gray-400' : 'cursor-pointer hover:bg-gray-50 text-gray-800'} ${expanded ? 'bg-gray-50' : ''}`}
                                  aria-expanded={empty ? undefined : expanded}
                                >
                                  <td className="px-4 py-3 whitespace-nowrap font-medium">
                                    <span className="inline-flex items-center gap-1.5">
                                      {empty
                                        ? <span className="w-4" />
                                        : expanded
                                          ? <ChevronDown className="w-4 h-4 text-gray-400" aria-hidden="true" />
                                          : <ChevronRight className="w-4 h-4 text-gray-400" aria-hidden="true" />}
                                      {r.label}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-right">{r.orders}</td>
                                  <td className="px-4 py-3 text-right">{r.completed}</td>
                                  <td className="px-4 py-3 text-right">{r.cancelled}</td>
                                  <td className="px-4 py-3 text-right whitespace-nowrap">{money(r.carWashRevenue)}</td>
                                  <td className="px-4 py-3 text-right whitespace-nowrap">{money(r.ridesRevenue)}</td>
                                  <td className={`px-4 py-3 text-right whitespace-nowrap font-semibold ${empty ? '' : 'text-gray-900'}`}>{money(r.revenue)}</td>
                                  <td className="px-4 py-3 text-right whitespace-nowrap">{money(r.avgOrderValue)}</td>
                                  <td className="px-4 py-3 text-right whitespace-nowrap">{money(r.pendingValue)}</td>
                                </tr>
                                {expanded && (
                                  <tr className="bg-gray-50">
                                    <td colSpan={9} className="px-4 pb-4">
                                      <div className="border border-gray-200 bg-white overflow-x-auto">
                                        <table className="w-full text-xs">
                                          <thead className="bg-gray-100 text-gray-500 uppercase tracking-wide">
                                            <tr className="text-left">
                                              <th className="px-3 py-2">Booking</th>
                                              <th className="px-3 py-2">Booked At</th>
                                              <th className="px-3 py-2">Customer</th>
                                              <th className="px-3 py-2">Service</th>
                                              <th className="px-3 py-2">Status</th>
                                              <th className="px-3 py-2 text-right">Price</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {r.bookings.map((b) => {
                                              const status = getBookingStatus(b);
                                              return (
                                                <tr key={b.id} className="border-t border-gray-100">
                                                  <td className="px-3 py-2 font-medium text-gray-900">#{b.id}</td>
                                                  <td className="px-3 py-2 whitespace-nowrap">{getBookingDate(b)?.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                                                  <td className="px-3 py-2">
                                                    {b.passenger_name || b.customer_name || 'N/A'}
                                                    {b.contact_number && <span className="text-gray-400"> · {b.contact_number}</span>}
                                                  </td>
                                                  <td className="px-3 py-2">
                                                    {getBookingService(b) === 'carwash' ? 'Car Wash' : 'Ride'}
                                                    {(b.package || b.sub_Service) && <span className="text-gray-400"> · {b.package || b.sub_Service}</span>}
                                                  </td>
                                                  <td className="px-3 py-2">
                                                    <span className={`px-2 py-0.5 rounded-full ${STATUS_PILL[status]}`}>{b.status || 'pending'}</span>
                                                  </td>
                                                  <td className="px-3 py-2 text-right whitespace-nowrap font-medium">{formatQAR(getBookingPrice(b))}</td>
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </Fragment>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold text-gray-900">
                            <td className="px-4 py-3">Total</td>
                            <td className="px-4 py-3 text-right">{report.totals.orders}</td>
                            <td className="px-4 py-3 text-right">{report.totals.completed}</td>
                            <td className="px-4 py-3 text-right">{report.totals.cancelled}</td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">{money(report.totals.carWashRevenue)}</td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">{money(report.totals.ridesRevenue)}</td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">{formatQAR(report.totals.revenue)}</td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">{money(report.totals.avgOrderValue)}</td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">{money(report.totals.pendingValue)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </main>
        </div>

        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    </RoleGuard>
  );
}
