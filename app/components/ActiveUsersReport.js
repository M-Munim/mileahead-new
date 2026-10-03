'use client';

import { useState, useEffect } from 'react';
import { Users, TrendingUp, TrendingDown, Calendar, Activity, Download, Printer } from 'lucide-react';
import { userService } from '../../utils/axiosInstance';
import { extractArray } from '../../utils/extractArray';
import { exportToCSV, printReport, buildTableHtml } from '../../utils/exportData';

export default function ActiveUsersReport() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    mau: 0, // Monthly Active Users
    dau: 0, // Daily Active Users
    wau: 0, // Weekly Active Users
    totalUsers: 0,
    mauGrowth: 0, // Month-over-month growth
    dauGrowth: 0, // Day-over-day growth
    activeRate: 0, // DAU/MAU ratio
  });
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    const controller = new AbortController();
    fetchActiveUsersData(controller);
    return () => controller.abort();
  }, []);

  const fetchActiveUsersData = async (controller) => {
    try {
      setLoading(true);

      // Fetch all users
      const response = await userService.getAllUsers({
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

      const users = extractArray(response);

      // Calculate time-based metrics
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);

      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);

      const twoMonthsAgo = new Date(today);
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

      // Calculate DAU (users active today)
      const dau = users.filter(user => {
        const lastActive = user.last_active_at || user.updated_at || user.created_at;
        if (!lastActive) return false;
        const activeDate = new Date(lastActive);
        return activeDate >= today;
      }).length;

      // Calculate DAU yesterday for growth
      const dauYesterday = users.filter(user => {
        const lastActive = user.last_active_at || user.updated_at || user.created_at;
        if (!lastActive) return false;
        const activeDate = new Date(lastActive);
        return activeDate >= yesterday && activeDate < today;
      }).length;

      // Calculate WAU (users active in last 7 days)
      const wau = users.filter(user => {
        const lastActive = user.last_active_at || user.updated_at || user.created_at;
        if (!lastActive) return false;
        const activeDate = new Date(lastActive);
        return activeDate >= weekAgo;
      }).length;

      // Calculate MAU (users active in last 30 days)
      const mau = users.filter(user => {
        const lastActive = user.last_active_at || user.updated_at || user.created_at;
        if (!lastActive) return false;
        const activeDate = new Date(lastActive);
        return activeDate >= monthAgo;
      }).length;

      // Calculate MAU for previous month for growth
      const mauPrevious = users.filter(user => {
        const lastActive = user.last_active_at || user.updated_at || user.created_at;
        if (!lastActive) return false;
        const activeDate = new Date(lastActive);
        return activeDate >= twoMonthsAgo && activeDate < monthAgo;
      }).length;

      // Calculate growth rates
      const dauGrowth = dauYesterday > 0 ? ((dau - dauYesterday) / dauYesterday * 100).toFixed(1) : 0;
      const mauGrowth = mauPrevious > 0 ? ((mau - mauPrevious) / mauPrevious * 100).toFixed(1) : 0;

      // Calculate DAU/MAU ratio (stickiness)
      const activeRate = mau > 0 ? ((dau / mau) * 100).toFixed(1) : 0;

      if (controller?.signal?.aborted) return;

      setMetrics({
        dau,
        wau,
        mau,
        totalUsers: users.length,
        dauGrowth: parseFloat(dauGrowth),
        mauGrowth: parseFloat(mauGrowth),
        activeRate: parseFloat(activeRate),
      });

      // Generate chart data for last 7 days
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const dayUsers = users.filter(user => {
          const lastActive = user.last_active_at || user.updated_at || user.created_at;
          if (!lastActive) return false;
          const activeDate = new Date(lastActive);
          return activeDate >= date && activeDate < nextDate;
        }).length;

        last7Days.push({
          day: date.toLocaleDateString('en-US', { weekday: 'short' }),
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          users: dayUsers
        });
      }

      if (controller?.signal?.aborted) return;
      setChartData(last7Days);

    } catch (error) {
      if (controller?.signal?.aborted) return;
      console.error('Error fetching active users data:', error);
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
          <h2 className="text-xl font-semibold text-gray-900">Active Users Report</h2>
          <p className="text-sm text-gray-500 mt-1">User engagement and activity metrics</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchActiveUsersData()}
            className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] transition-colors text-sm font-medium"
          >
            Refresh
          </button>
          <button
            onClick={() => {
              const data = [
                { metric: 'Daily Active Users', value: metrics.dau, period: 'Today' },
                { metric: 'Weekly Active Users', value: metrics.wau, period: 'Last 7 days' },
                { metric: 'Monthly Active Users', value: metrics.mau, period: 'Last 30 days' },
                { metric: 'Total Users', value: metrics.totalUsers, period: 'All time' },
                { metric: 'User Stickiness (DAU/MAU)', value: `${metrics.activeRate}%`, period: 'Current' },
                ...chartData.map(d => ({ metric: `Active Users - ${d.day}`, value: d.users, period: d.date })),
              ];
              exportToCSV(data, ['metric', 'value', 'period'], { metric: 'Metric', value: 'Value', period: 'Period' }, 'active_users_report');
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
                { metric: 'Daily Active Users', value: metrics.dau, period: 'Today' },
                { metric: 'Weekly Active Users', value: metrics.wau, period: 'Last 7 days' },
                { metric: 'Monthly Active Users', value: metrics.mau, period: 'Last 30 days' },
                { metric: 'Total Users', value: metrics.totalUsers, period: 'All time' },
                { metric: 'User Stickiness (DAU/MAU)', value: `${metrics.activeRate}%`, period: 'Current' },
                ...chartData.map(d => ({ metric: `Active Users - ${d.day}`, value: d.users, period: d.date })),
              ];
              const html = buildTableHtml(data, ['metric', 'value', 'period'], { metric: 'Metric', value: 'Value', period: 'Period' });
              printReport('Active Users Report — Magic Track', html);
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
        {/* DAU */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
            {metrics.dauGrowth !== 0 && (
              <span className={`flex items-center text-xs font-medium ${
                metrics.dauGrowth > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {metrics.dauGrowth > 0 ? <TrendingUp className="w-3 h-3 mr-1" aria-hidden="true" /> : <TrendingDown className="w-3 h-3 mr-1" aria-hidden="true" />}
                {Math.abs(metrics.dauGrowth)}%
              </span>
            )}
          </div>
          <div className="text-2xl font-bold text-gray-900">{metrics.dau}</div>
          <div className="text-sm text-gray-600 mt-1">Daily Active Users</div>
          <div className="text-xs text-gray-500 mt-1">Active today</div>
        </div>

        {/* WAU */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{metrics.wau}</div>
          <div className="text-sm text-gray-600 mt-1">Weekly Active Users</div>
          <div className="text-xs text-gray-500 mt-1">Active in last 7 days</div>
        </div>

        {/* MAU */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center">
              <Users className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
            {metrics.mauGrowth !== 0 && (
              <span className={`flex items-center text-xs font-medium ${
                metrics.mauGrowth > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {metrics.mauGrowth > 0 ? <TrendingUp className="w-3 h-3 mr-1" aria-hidden="true" /> : <TrendingDown className="w-3 h-3 mr-1" aria-hidden="true" />}
                {Math.abs(metrics.mauGrowth)}%
              </span>
            )}
          </div>
          <div className="text-2xl font-bold text-gray-900">{metrics.mau}</div>
          <div className="text-sm text-gray-600 mt-1">Monthly Active Users</div>
          <div className="text-xs text-gray-500 mt-1">Active in last 30 days</div>
        </div>

        {/* Stickiness (DAU/MAU) */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{metrics.activeRate}%</div>
          <div className="text-sm text-gray-600 mt-1">User Stickiness</div>
          <div className="text-xs text-gray-500 mt-1">DAU/MAU Ratio</div>
        </div>
      </div>

      {/* Chart - Last 7 Days */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Daily Active Users (Last 7 Days)</h3>
        <div className="space-y-3">
          {chartData.map((day, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="w-20 text-xs text-gray-600 font-medium">
                {day.day}
                <div className="text-[10px] text-gray-400">{day.date}</div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-100 rounded-full h-8 relative overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-end pr-3 transition-all duration-500"
                      style={{ width: `${Math.min((day.users / Math.max(...chartData.map(d => d.users))) * 100, 100)}%` }}
                      aria-hidden="true"
                    >
                      {day.users > 0 && (
                        <span className="text-xs font-semibold text-white">{day.users}</span>
                      )}
                    </div>
                  </div>
                  {day.users === 0 && (
                    <span className="text-xs text-gray-400 ml-2">0</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-2 gap-4 pt-6 border-t border-gray-200">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{metrics.totalUsers}</div>
          <div className="text-sm text-gray-600">Total Users</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {metrics.totalUsers > 0 ? ((metrics.mau / metrics.totalUsers) * 100).toFixed(1) : 0}%
          </div>
          <div className="text-sm text-gray-600">Activation Rate</div>
          <div className="text-xs text-gray-500">(MAU / Total)</div>
        </div>
      </div>
    </div>
  );
}
