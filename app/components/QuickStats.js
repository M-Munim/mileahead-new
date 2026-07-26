'use client';

import { Star } from 'lucide-react';

export default function QuickStats({
  totalCustomers = 0,
  totalDrivers = 0,
  completionRate = 0,
  cancellationRate = 0,
  averageRating = 0,
  loading = false,
}) {
  const total = totalCustomers + totalDrivers;
  const customerRatio = total > 0 ? totalCustomers / total : 0;
  const circumference = 2 * Math.PI * 40;

  const formatNumber = (num) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toLocaleString();
  };

  const fullStars = Math.floor(averageRating);
  const hasHalfStar = averageRating - fullStars >= 0.25;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  if (loading) {
    return (
      <div className="bg-white p-4 sm:p-6 shadow-sm border border-gray-100">
        <h3 className="text-base font-semibold text-gray-900 mb-5">Quick Stats</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-gray-50 p-4">
              <div className="h-20 animate-shimmer rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 sm:p-6 shadow-sm border border-gray-100 animate-fade-in-up">
      <h3 className="text-base font-semibold text-gray-900 mb-5">Quick Stats</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 stagger-fade-in">
        {/* Total Circle Card */}
        <div className="bg-gray-50 p-4 flex flex-row items-center border border-gray-100 card-hover">
          <div className="relative w-24 h-24 shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="48" cy="48" r="40" stroke="#e5e7eb" strokeWidth="8" fill="none" />
              <circle
                cx="48" cy="48" r="40"
                stroke="var(--primary)"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${circumference * customerRatio} ${circumference}`}
                strokeLinecap="round"
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider">Total</span>
              <span className="text-sm font-bold text-gray-900">{formatNumber(total)}</span>
            </div>
          </div>
          <div className="ml-4 flex flex-col justify-center">
            <div className="text-xs text-gray-400">Customers</div>
            <div className="text-sm font-semibold text-gray-900">{formatNumber(totalCustomers)}</div>
            <div className="text-xs text-gray-400 mt-2">Drivers</div>
            <div className="text-sm font-semibold text-gray-900">{formatNumber(totalDrivers)}</div>
          </div>
        </div>

        {/* Completion Rate Card */}
        <div className="bg-gray-50 p-4 flex flex-col items-start justify-center border border-gray-100 card-hover">
          <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Completion rate</div>
          <div className="text-3xl font-bold text-gray-900 mb-3">{completionRate}%</div>
          <div className="w-full bg-gray-200 h-1.5">
            <div
              className="bg-green-500 h-1.5 transition-all duration-700"
              style={{ width: `${Math.min(completionRate, 100)}%` }}
            />
          </div>
        </div>

        {/* Cancellation Rate Card */}
        <div className="bg-gray-50 p-4 flex flex-col items-start justify-center border border-gray-100 card-hover">
          <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Cancellation rate</div>
          <div className="text-3xl font-bold text-gray-900 mb-3">{cancellationRate}%</div>
          <div className="w-full bg-gray-200 h-1.5">
            <div
              className="bg-red-500 h-1.5 transition-all duration-700"
              style={{ width: `${Math.min(cancellationRate, 100)}%` }}
            />
          </div>
        </div>

        {/* Average Rating Card */}
        <div className="bg-gray-50 p-4 flex flex-col items-start justify-center border border-gray-100 card-hover">
          <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Average rating</div>
          <div className="text-3xl font-bold text-gray-900 mb-3">{averageRating.toFixed(1)}</div>
          <div className="flex gap-0.5">
            {Array.from({ length: fullStars }).map((_, i) => (
              <Star key={`full-${i}`} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            ))}
            {hasHalfStar && (
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" style={{ clipPath: 'inset(0 50% 0 0)' }} />
            )}
            {Array.from({ length: emptyStars }).map((_, i) => (
              <Star key={`empty-${i}`} className="w-4 h-4 text-gray-300" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
