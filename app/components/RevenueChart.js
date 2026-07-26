'use client';

import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';

// Dummy data as fallback
const dummyData = [
  { day: 'Mon', earnings: 25, commission: 8, pending: 5 },
  { day: 'Tue', earnings: 30, commission: 10, pending: 7 },
  { day: 'Wed', earnings: 28, commission: 9, pending: 6 },
  { day: 'Thu', earnings: 32, commission: 11, pending: 8 },
  { day: 'Fri', earnings: 35, commission: 12, pending: 9 },
  { day: 'Sat', earnings: 30, commission: 10, pending: 7 },
  { day: 'Sun', earnings: 27, commission: 15, pending: 8 },
];

export default function RevenueChart({ bookingsData = [] }) {
  const [activeTab, setActiveTab] = useState('weekly');

  const data = useMemo(() => {
    if (!bookingsData || bookingsData.length === 0) {
      return getDummyDataForTab(activeTab);
    }

    let revenueData = [];

    if (activeTab === 'daily') {
      revenueData = generateDailyData(bookingsData);
    } else if (activeTab === 'weekly') {
      revenueData = generateWeeklyData(bookingsData);
    } else if (activeTab === 'monthly') {
      revenueData = generateMonthlyData(bookingsData);
    }

    const hasRealData = revenueData.some(d => d.earnings > 0 || d.commission > 0);
    if (!hasRealData) {
      return getDummyDataForTab(activeTab);
    }

    return revenueData;
  }, [bookingsData, activeTab]);

  const yAxisTicks = useMemo(() => {
    const maxValue = Math.max(
      ...data.map(d => Math.max(d.earnings || 0, d.commission || 0, d.pending || 0)),
      1
    );
    const tickCount = 6;
    const rawStep = maxValue / (tickCount - 1);
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep || 1)));
    const step = Math.ceil(rawStep / magnitude) * magnitude;
    return Array.from({ length: tickCount }, (_, i) => i * step);
  }, [data]);

  // Helper function to get dummy data based on tab
  function getDummyDataForTab(tab) {
    if (tab === 'daily') {
      return [
        { day: 'Mon', earnings: 120, commission: 35, pending: 20 },
        { day: 'Tue', earnings: 150, commission: 45, pending: 25 },
        { day: 'Wed', earnings: 180, commission: 50, pending: 30 },
        { day: 'Thu', earnings: 140, commission: 40, pending: 22 },
        { day: 'Fri', earnings: 200, commission: 60, pending: 35 },
        { day: 'Sat', earnings: 170, commission: 50, pending: 28 },
        { day: 'Sun', earnings: 130, commission: 38, pending: 24 },
      ];
    } else if (tab === 'monthly') {
      return [
        { day: 'Jan', earnings: 3200, commission: 950, pending: 400 },
        { day: 'Feb', earnings: 2800, commission: 850, pending: 350 },
        { day: 'Mar', earnings: 3500, commission: 1100, pending: 450 },
        { day: 'Apr', earnings: 3100, commission: 920, pending: 380 },
        { day: 'May', earnings: 3800, commission: 1200, pending: 500 },
        { day: 'Jun', earnings: 3400, commission: 1000, pending: 420 },
      ];
    }
    // Default weekly
    return dummyData;
  }

  // Generate daily data (last 7 days)
  function generateDailyData(bookings) {
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return daysOfWeek.map((day, index) => {
      const dayBookings = bookings.filter(booking => {
        const bookingDate = booking.date || booking.created_at || booking.date_time;
        if (!bookingDate) return false;
        const date = new Date(bookingDate);
        return date.getDay() === index;
      });

      return calculateRevenueForBookings(dayBookings, day);
    });
  }

  // Generate weekly data (current week by day)
  function generateWeeklyData(bookings) {
    const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return daysOfWeek.map((day, index) => {
      // Adjust index for Monday start (0=Mon, 6=Sun)
      const dayIndex = (index + 1) % 7;
      const dayBookings = bookings.filter(booking => {
        const bookingDate = booking.date || booking.created_at || booking.date_time;
        if (!bookingDate) return false;
        const date = new Date(bookingDate);
        return date.getDay() === dayIndex;
      });

      return calculateRevenueForBookings(dayBookings, day);
    });
  }

  // Generate monthly data (last 6 months)
  function generateMonthlyData(bookings) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    const last6Months = [];
    
    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      last6Months.push(months[monthIndex]);
    }

    return last6Months.map((month, index) => {
      const monthIndex = (currentMonth - 5 + index + 12) % 12;
      const monthBookings = bookings.filter(booking => {
        const bookingDate = booking.date || booking.created_at || booking.date_time;
        if (!bookingDate) return false;
        const date = new Date(bookingDate);
        return date.getMonth() === monthIndex;
      });

      return calculateRevenueForBookings(monthBookings, month);
    });
  }

  // Calculate revenue for a set of bookings
  function calculateRevenueForBookings(bookings, label) {
    const earnings = bookings.reduce((sum, booking) => {
      const price = parseFloat(booking.price || booking.amount || booking.total_price || 0);
      return sum + price;
    }, 0);

    const commission = bookings.reduce((sum, booking) => {
      const comm = parseFloat(booking.commission || booking.admin_commission || 0);
      return sum + comm;
    }, 0);

    const pending = bookings.reduce((sum, booking) => {
      if (booking.payment_status === 'pending' || booking.status === 'pending') {
        const price = parseFloat(booking.price || booking.amount || 0);
        return sum + price;
      }
      return sum;
    }, 0);

    return {
      day: label,
      earnings: Math.round(earnings),
      commission: Math.round(commission),
      pending: Math.round(pending)
    };
  }

  return (
    <div className="bg-white p-4 sm:p-6 shadow-sm border border-gray-100 h-96 sm:h-80 flex flex-col animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 sm:mb-0">Revenue Metrics</h3>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab('daily')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              activeTab === 'daily' 
                ? 'bg-gray-100 text-gray-900 font-medium' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Daily
          </button>
          <button
            onClick={() => setActiveTab('weekly')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              activeTab === 'weekly' 
                ? 'bg-[#14b8a6] text-white font-medium' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setActiveTab('monthly')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              activeTab === 'monthly' 
                ? 'bg-gray-100 text-gray-900 font-medium' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 ">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#9ca3af', fontSize: 12 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            ticks={yAxisTicks}
            domain={[0, yAxisTicks[yAxisTicks.length - 1] || 'auto']}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            formatter={(value) => {
              const labels = {
                earnings: 'Earnings',
                commission: 'Commission Earned',
                pending: 'Pending Payments'
              };
              return <span className="text-sm text-gray-600 mt-7">{labels[value]}</span>;
            }}
          />
          <Bar dataKey="earnings" fill="#14b8a6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="commission" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="pending" fill="#f59e0b" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}
