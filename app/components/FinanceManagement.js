'use client';

import { useState, useEffect, useMemo } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Wallet, CreditCard, Car, Calendar, Download, Printer } from 'lucide-react';
import { bookingService, driverService } from '../../utils/axiosInstance';
import { extractArray } from '../../utils/extractArray';
import { exportToCSV, printReport, buildTableHtml } from '../../utils/exportData';

export default function FinanceManagement() {
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('month'); // day, week, month
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    revenueGrowth: 0,
    totalBookings: 0,
    averageBookingValue: 0,
    driverEarnings: 0,
    platformCommission: 0,
    pendingPayments: 0,
    completedPayments: 0,
  });
  const [allBookings, setAllBookings] = useState([]);

  useEffect(() => {
    const controller = new AbortController();
    fetchFinanceData(controller);
    return () => controller.abort();
  }, [timeframe]);

  const getBookingDate = (booking) => {
    const raw = booking.created_at || booking.date_time || booking.updated_at || booking.timeStamp;
    const dt = new Date(raw);
    return Number.isNaN(dt.getTime()) ? null : dt;
  };

  const getPrice = (booking) => (
    parseFloat(booking.price || booking.amount || booking.total_price || 0) || 0
  );

  const getProfitData = (booking) => {
    const price = getPrice(booking);
    const commission = parseFloat(booking.commission || booking.admin_commission || 0) || 0;
    const driverPrice = parseFloat(booking.driver_price || booking.driver_amount || booking.driver_earnings || 0) || 0;
    if (commission > 0) {
      return {
        price,
        driverPayout: Math.max(price - commission, 0),
        profit: commission,
      };
    }
    if (driverPrice > 0) {
      return {
        price,
        driverPayout: driverPrice,
        profit: Math.max(price - driverPrice, 0),
      };
    }
    return {
      price,
      driverPayout: price * 0.8,
      profit: price * 0.2,
    };
  };

  const formatCurrency = (value) => Number(value || 0).toFixed(2);

  const fetchFinanceData = async (controller) => {
    try {
      setLoading(true);

      // Fetch all bookings
      const bookingsResponse = await bookingService.getAllBookings({
        status: "all",
        field: "",
        search: "",
        sorting: {
          field: "id",
          order: "desc"
        },
        page: 1,
        limit: 1000
      });

      if (controller?.signal?.aborted) return;

      // Fetch all drivers for earnings
      const driversResponse = await driverService.getAllDrivers({
        status: "all",
        field: "",
        search: "",
        sorting: {
          field: "id",
          order: "desc"
        },
        page: 1,
        limit: 1000
      });

      if (controller?.signal?.aborted) return;

      const bookings = extractArray(bookingsResponse);
      const drivers = extractArray(driversResponse);

      // Calculate date range based on timeframe
      const now = new Date();
      const startDate = new Date();

      if (timeframe === 'day') {
        startDate.setDate(now.getDate() - 1);
      } else if (timeframe === 'week') {
        startDate.setDate(now.getDate() - 7);
      } else if (timeframe === 'month') {
        startDate.setMonth(now.getMonth() - 1);
      }

      // Filter bookings by timeframe
      const filteredBookings = bookings.filter(booking => {
        const bookingDate = getBookingDate(booking);
        return bookingDate && bookingDate >= startDate;
      });

      // Calculate metrics
      const totalRevenue = filteredBookings.reduce((sum, booking) => sum + getPrice(booking), 0);

      const totalBookings = filteredBookings.length;
      const averageBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

      // Calculate driver earnings
      const driverEarnings = drivers.reduce((sum, driver) => {
        const earning = parseFloat(driver.earning || driver.earnings || 0);
        return sum + earning;
      }, 0);

      // Calculate platform commission (assuming 20% commission)
      const platformCommission = filteredBookings.reduce((sum, booking) => {
        const { profit } = getProfitData(booking);
        return sum + profit;
      }, 0);

      // Calculate pending vs completed payments
      const completedBookings = filteredBookings.filter(b => b.status === 'completed');
      const pendingBookings = filteredBookings.filter(b => b.status !== 'completed' && b.status !== 'cancelled');

      const completedPayments = completedBookings.reduce((sum, booking) => sum + getPrice(booking), 0);
      const pendingPayments = pendingBookings.reduce((sum, booking) => sum + getPrice(booking), 0);

      // Calculate growth by comparing current period vs previous period
      const previousStartDate = new Date(startDate);
      if (timeframe === 'day') {
        previousStartDate.setDate(previousStartDate.getDate() - 1);
      } else if (timeframe === 'week') {
        previousStartDate.setDate(previousStartDate.getDate() - 7);
      } else if (timeframe === 'month') {
        previousStartDate.setMonth(previousStartDate.getMonth() - 1);
      }

      const previousPeriodBookings = bookings.filter(booking => {
        const bookingDate = getBookingDate(booking);
        return bookingDate && bookingDate >= previousStartDate && bookingDate < startDate;
      });
      const previousRevenue = previousPeriodBookings.reduce((sum, booking) => sum + getPrice(booking), 0);
      const revenueGrowth = previousRevenue > 0
        ? ((totalRevenue - previousRevenue) / previousRevenue) * 100
        : (totalRevenue > 0 ? 100 : 0);

      if (controller?.signal?.aborted) return;

      setMetrics({
        totalRevenue: formatCurrency(totalRevenue),
        revenueGrowth: revenueGrowth.toFixed(1),
        totalBookings,
        averageBookingValue: formatCurrency(averageBookingValue),
        driverEarnings: formatCurrency(driverEarnings),
        platformCommission: formatCurrency(platformCommission),
        pendingPayments: formatCurrency(pendingPayments),
        completedPayments: formatCurrency(completedPayments),
      });

      setAllBookings(bookings);
    } catch (error) {
      if (controller?.signal?.aborted) return;
      console.error('Error fetching finance data:', error);
    } finally {
      if (!controller?.signal?.aborted) {
        setLoading(false);
      }
    }
  };

  const normalizeRide = (booking) => {
    const bookingDate = getBookingDate(booking);
    const { price, driverPayout, profit } = getProfitData(booking);
    return {
      id: booking.id,
      bookingNumber: booking.booking_number || `BK${booking.id}`,
      date: bookingDate,
      dateLabel: bookingDate ? bookingDate.toLocaleString() : 'N/A',
      price,
      driverPayout,
      profit,
      status: booking.status || 'pending',
      from: booking.from_address || 'N/A',
      to: booking.to_address || 'N/A',
    };
  };

  const groupBy = (items, getKey) => {
    return items.reduce((acc, item) => {
      const key = getKey(item);
      if (!key) return acc;
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  };

  const formatDateKey = (date) => date.toISOString().slice(0, 10);

  const getWeekKey = (date) => {
    const d = new Date(date);
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
    const key = d.toISOString().slice(0, 10);
    return `Week of ${key}`;
  };

  const getMonthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

  const financeExportColumns = ['bookingNumber', 'dateLabel', 'from', 'to', 'status', 'price', 'driverPayout', 'profit'];
  const financeExportHeaders = {
    bookingNumber: 'Booking #', dateLabel: 'Date', from: 'Pickup', to: 'Dropoff',
    status: 'Status', price: 'Total (QAR)', driverPayout: 'Driver Payout (QAR)', profit: 'Profit (QAR)',
  };

  const handleExportCSV = () => {
    const data = allBookings.map(normalizeRide).filter(r => r.date);
    exportToCSV(data, financeExportColumns, financeExportHeaders, 'financial_report');
  };

  const handlePrintReport = () => {
    const data = allBookings.map(normalizeRide).filter(r => r.date);
    const html = buildTableHtml(data, financeExportColumns, financeExportHeaders);
    printReport('Financial Report — Miles Ahead', html);
  };

  const rides = useMemo(() => allBookings.map(normalizeRide).filter(r => r.date), [allBookings]);

  const dailyGroups = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const recent = rides.filter(r => r.date >= cutoff);
    return groupBy(recent, (r) => formatDateKey(r.date));
  }, [rides]);

  const weeklyGroups = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 84);
    const recent = rides.filter(r => r.date >= cutoff);
    return groupBy(recent, (r) => getWeekKey(r.date));
  }, [rides]);

  const monthlyGroups = useMemo(() => {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 12);
    const recent = rides.filter(r => r.date >= cutoff);
    return groupBy(recent, (r) => getMonthKey(r.date));
  }, [rides]);

  const renderGroupList = (grouped) => {
    const keys = Object.keys(grouped).sort((a, b) => (a < b ? 1 : -1));
    if (keys.length === 0) {
      return <div className="text-sm text-gray-500">No rides found for this range.</div>;
    }

    return (
      <div className="space-y-4 max-h-[420px] overflow-y-auto pr-2">
        {keys.map((key) => {
          const groupRides = grouped[key];
          const totals = groupRides.reduce((acc, r) => {
            acc.profit += r.profit;
            acc.price += r.price;
            return acc;
          }, { profit: 0, price: 0 });

          return (
            <div key={key} className="border border-gray-200 rounded-lg p-4 bg-white">
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold text-gray-900">{key}</div>
                <div className="text-sm text-gray-600">
                  {groupRides.length} rides • Profit {formatCurrency(totals.profit)} QAR
                </div>
              </div>
              <div className="space-y-2">
                {groupRides.map((ride) => (
                  <div key={ride.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-700">
                      <div className="font-medium text-gray-900">{ride.bookingNumber}</div>
                      <div className="text-xs text-gray-500">{ride.dateLabel}</div>
                      <div className="text-xs text-gray-500">{ride.from} → {ride.to}</div>
                    </div>
                    <div className="text-sm text-gray-700">
                      <div>Total {formatCurrency(ride.price)} QAR</div>
                      <div className="text-green-700 font-semibold">Profit {formatCurrency(ride.profit)} QAR</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6" role="status">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Finance Management</h2>
          <p className="text-sm text-gray-500 mt-1">Revenue and financial overview</p>
        </div>
        <div className="flex gap-2">
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-sm"
          >
            <option value="day">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
          </select>
          <button
            onClick={() => fetchFinanceData()}
            className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] transition-colors text-sm font-medium"
          >
            Refresh
          </button>
          <button
            onClick={handleExportCSV}
            disabled={allBookings.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Export as CSV"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            CSV
          </button>
          <button
            onClick={handlePrintReport}
            disabled={allBookings.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Print report"
          >
            <Printer className="w-4 h-4" aria-hidden="true" />
            Print
          </button>
        </div>
      </div>

      {/* Main Revenue Card */}
      <div className="bg-linear-to-br from-[var(--primary)] to-[var(--primary-hover)] rounded-xl p-6 mb-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-white/80 text-sm mb-2">Total Revenue</div>
            <div className="text-4xl font-bold">{metrics.totalRevenue} QAR</div>
          </div>
          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <DollarSign className="w-8 h-8" aria-hidden="true" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {parseFloat(metrics.revenueGrowth) > 0 ? (
            <>
              <TrendingUp className="w-4 h-4" aria-hidden="true" />
              <span className="text-sm font-medium">+{metrics.revenueGrowth}% from last period</span>
            </>
          ) : (
            <>
              <TrendingDown className="w-4 h-4" aria-hidden="true" />
              <span className="text-sm font-medium">{metrics.revenueGrowth}% from last period</span>
            </>
          )}
        </div>
      </div>

      {/* Financial Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Bookings */}
        <div className="bg-linear-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{metrics.totalBookings}</div>
          <div className="text-sm text-gray-600 mt-1">Total Bookings</div>
        </div>

        {/* Average Booking Value */}
        <div className="bg-linear-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{metrics.averageBookingValue} QAR</div>
          <div className="text-sm text-gray-600 mt-1">Avg Booking Value</div>
        </div>

        {/* Driver Earnings */}
        <div className="bg-linear-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center">
              <Car className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{metrics.driverEarnings} QAR</div>
          <div className="text-sm text-gray-600 mt-1">Driver Earnings</div>
        </div>

        {/* Platform Commission */}
        <div className="bg-linear-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{metrics.platformCommission} QAR</div>
          <div className="text-sm text-gray-600 mt-1">Platform Commission</div>
        </div>
      </div>

      {/* Payment Status */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Payment Status</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Completed Payments */}
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green-500 flex items-center justify-center shrink-0">
                <DollarSign className="w-6 h-6 text-white" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <div className="text-2xl font-bold text-green-700">{metrics.completedPayments} QAR</div>
                <div className="text-sm text-gray-600">Completed Payments</div>
              </div>
            </div>
          </div>

          {/* Pending Payments */}
          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-yellow-500 flex items-center justify-center shrink-0">
                <Wallet className="w-6 h-6 text-white" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <div className="text-2xl font-bold text-yellow-700">{metrics.pendingPayments} QAR</div>
                <div className="text-sm text-gray-600">Pending Payments</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Breakdown */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Revenue Breakdown</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-700">Gross Revenue</span>
            <span className="text-sm font-semibold text-gray-900">{metrics.totalRevenue} QAR</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-700">Driver Payouts</span>
            <span className="text-sm font-semibold text-red-600">-{metrics.driverEarnings} QAR</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
            <span className="text-sm font-medium text-gray-900">Net Platform Revenue</span>
            <span className="text-sm font-bold text-green-700">{metrics.platformCommission} QAR</span>
          </div>
        </div>
      </div>

      {/* Profit Breakdown */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-4 h-4 text-gray-500" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-gray-900">Profit by Ride</h3>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Daily, weekly, and monthly profit details based on completed ride pricing and commission data.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="text-sm font-semibold text-gray-900 mb-3">Daily (last 30 days)</div>
            {renderGroupList(dailyGroups)}
          </div>
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="text-sm font-semibold text-gray-900 mb-3">Weekly (last 12 weeks)</div>
            {renderGroupList(weeklyGroups)}
          </div>
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="text-sm font-semibold text-gray-900 mb-3">Monthly (last 12 months)</div>
            {renderGroupList(monthlyGroups)}
          </div>
        </div>
      </div>
    </div>
  );
}
