'use client';

import { useState, useEffect } from 'react';
import { Car, TrendingUp, TrendingDown, MapPin, DollarSign, Clock, Download, Printer } from 'lucide-react';
import { driverService } from '../../utils/axiosInstance';
import { extractArray } from '../../utils/extractArray';
import { exportToCSV, printReport, buildTableHtml } from '../../utils/exportData';

export default function ActiveDriversReport() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    activeDrivers: 0,
    onlineDrivers: 0,
    availableDrivers: 0,
    busyDrivers: 0,
    totalDrivers: 0,
    averageEarnings: 0,
    topDrivers: [],
  });
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    const controller = new AbortController();
    fetchActiveDriversData(controller);
    return () => controller.abort();
  }, []);

  const fetchActiveDriversData = async (controller) => {
    try {
      setLoading(true);

      // Fetch all drivers
      const response = await driverService.getAllDrivers({
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

      const drivers = extractArray(response);

      // Calculate metrics
      const activeDrivers = drivers.filter(d => {
        const status = d.status?.toLowerCase();
        const accountStatus = d.accountStatus?.toLowerCase();
        const driverStatus = d.driver_status?.toLowerCase();
        return status === 'active' || accountStatus === 'active' || driverStatus === 'online' ||
          d.status === 1 || d.is_active === 1 || d.is_active === true ||
          d.active === 1 || d.active === true || d.isActive === 1;
      }).length;

      const onlineDrivers = drivers.filter(d => d.is_online === 1 || d.is_online === true || d.driver_status === 'online').length;
      const availableDrivers = drivers.filter(d => (d.is_available === 1 || d.is_available === true) && (d.is_online === 1 || d.is_online === true)).length;
      const busyDrivers = onlineDrivers - availableDrivers;

      // Calculate total earnings
      const totalEarnings = drivers.reduce((sum, driver) => {
        const earning = parseFloat(driver.earning || driver.earnings || 0);
        return sum + earning;
      }, 0);

      const averageEarnings = drivers.length > 0 ? totalEarnings / drivers.length : 0;

      // Get top 5 drivers by earnings
      const topDrivers = drivers
        .filter(d => d.earning || d.earnings)
        .sort((a, b) => {
          const earningA = parseFloat(a.earning || a.earnings || 0);
          const earningB = parseFloat(b.earning || b.earnings || 0);
          return earningB - earningA;
        })
        .slice(0, 5)
        .map(d => ({
          name: `${d.firstname || ''} ${d.lastname || ''}`.trim() || d.username || 'Unknown',
          earnings: parseFloat(d.earning || d.earnings || 0),
          status: d.is_online ? 'online' : 'offline'
        }));

      if (controller?.signal?.aborted) return;

      setMetrics({
        activeDrivers,
        onlineDrivers,
        availableDrivers,
        busyDrivers,
        totalDrivers: drivers.length,
        averageEarnings: averageEarnings.toFixed(2),
        topDrivers,
      });

      // Generate status distribution for chart
      setChartData([
        { label: 'Available', value: availableDrivers, color: 'bg-green-500' },
        { label: 'Busy', value: busyDrivers, color: 'bg-yellow-500' },
        { label: 'Offline', value: drivers.length - onlineDrivers, color: 'bg-gray-400' },
      ]);

    } catch (error) {
      if (controller?.signal?.aborted) return;
      console.error('Error fetching active drivers data:', error);
    } finally {
      if (!controller?.signal?.aborted) {
        setLoading(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6" role="status">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
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
          <h2 className="text-xl font-semibold text-gray-900">Active Drivers Report</h2>
          <p className="text-sm text-gray-500 mt-1">Driver availability and performance metrics</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchActiveDriversData()}
            className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] transition-colors text-sm font-medium"
          >
            Refresh
          </button>
          <button
            onClick={() => {
              const data = [
                { metric: 'Online Drivers', value: metrics.onlineDrivers, detail: 'Currently online' },
                { metric: 'Available Drivers', value: metrics.availableDrivers, detail: 'Ready for bookings' },
                { metric: 'Busy Drivers', value: metrics.busyDrivers, detail: 'Currently on ride' },
                { metric: 'Total Drivers', value: metrics.totalDrivers, detail: 'All registered' },
                { metric: 'Avg Earnings (QAR)', value: metrics.averageEarnings, detail: 'Per driver' },
                ...metrics.topDrivers.map((d, i) => ({
                  metric: `Top Driver #${i + 1}`,
                  value: `${d.earnings.toFixed(2)} QAR`,
                  detail: `${d.name} (${d.status})`,
                })),
              ];
              exportToCSV(data, ['metric', 'value', 'detail'], { metric: 'Metric', value: 'Value', detail: 'Details' }, 'active_drivers_report');
            }}
            className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
            aria-label="Export as CSV"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            CSV
          </button>
          <button
            onClick={() => {
              const data = [
                { metric: 'Online Drivers', value: metrics.onlineDrivers, detail: 'Currently online' },
                { metric: 'Available Drivers', value: metrics.availableDrivers, detail: 'Ready for bookings' },
                { metric: 'Busy Drivers', value: metrics.busyDrivers, detail: 'Currently on ride' },
                { metric: 'Total Drivers', value: metrics.totalDrivers, detail: 'All registered' },
                { metric: 'Avg Earnings (QAR)', value: metrics.averageEarnings, detail: 'Per driver' },
                ...metrics.topDrivers.map((d, i) => ({
                  metric: `Top Driver #${i + 1}`,
                  value: `${d.earnings.toFixed(2)} QAR`,
                  detail: `${d.name} (${d.status})`,
                })),
              ];
              const html = buildTableHtml(data, ['metric', 'value', 'detail'], { metric: 'Metric', value: 'Value', detail: 'Details' });
              printReport('Active Drivers Report — Miles Ahead', html);
            }}
            className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
            aria-label="Print report"
          >
            <Printer className="w-4 h-4" aria-hidden="true" />
            Print
          </button>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Online Drivers */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center">
              <Car className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{metrics.onlineDrivers}</div>
          <div className="text-sm text-gray-600 mt-1">Online Drivers</div>
          <div className="text-xs text-gray-500 mt-1">Currently online</div>
        </div>

        {/* Available Drivers */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{metrics.availableDrivers}</div>
          <div className="text-sm text-gray-600 mt-1">Available Drivers</div>
          <div className="text-xs text-gray-500 mt-1">Ready for bookings</div>
        </div>

        {/* Busy Drivers */}
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 border border-yellow-200">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-lg bg-yellow-500 flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{metrics.busyDrivers}</div>
          <div className="text-sm text-gray-600 mt-1">Busy Drivers</div>
          <div className="text-xs text-gray-500 mt-1">Currently on ride</div>
        </div>

        {/* Average Earnings */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{metrics.averageEarnings} QAR</div>
          <div className="text-sm text-gray-600 mt-1">Avg Earnings</div>
          <div className="text-xs text-gray-500 mt-1">Per driver</div>
        </div>
      </div>

      {/* Driver Status Distribution */}
      <div className="border-t border-gray-200 pt-6 mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Driver Status Distribution</h3>
        <div className="space-y-3">
          {chartData.map((item, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="w-24 text-sm text-gray-700 font-medium">{item.label}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-100 rounded-full h-8 relative overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full flex items-center justify-end pr-3 transition-all duration-500`}
                      style={{ width: `${Math.min((item.value / metrics.totalDrivers) * 100, 100)}%` }}
                      aria-hidden="true"
                    >
                      {item.value > 0 && (
                        <span className="text-xs font-semibold text-white">{item.value}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-gray-600 w-16 text-right">
                    {metrics.totalDrivers > 0 ? ((item.value / metrics.totalDrivers) * 100).toFixed(0) : 0}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Earning Drivers */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Top Earning Drivers</h3>
        <div className="space-y-3">
          {metrics.topDrivers.length > 0 ? (
            metrics.topDrivers.map((driver, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] flex items-center justify-center text-white font-semibold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{driver.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        driver.status === 'online' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          driver.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                        }`}></div>
                        {driver.status}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-[var(--primary)]">{driver.earnings.toFixed(2)} QAR</div>
                  <div className="text-xs text-gray-500">Total earnings</div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              No earnings data available
            </div>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-3 gap-4 pt-6 border-t border-gray-200">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{metrics.totalDrivers}</div>
          <div className="text-sm text-gray-600">Total Drivers</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {metrics.totalDrivers > 0 ? ((metrics.onlineDrivers / metrics.totalDrivers) * 100).toFixed(1) : 0}%
          </div>
          <div className="text-sm text-gray-600">Online Rate</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {metrics.totalDrivers > 0 ? ((metrics.availableDrivers / metrics.totalDrivers) * 100).toFixed(1) : 0}%
          </div>
          <div className="text-sm text-gray-600">Availability Rate</div>
        </div>
      </div>
    </div>
  );
}
