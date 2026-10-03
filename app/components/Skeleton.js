'use client';

/**
 * Reusable Skeleton Loader Components
 * Usage:
 *   <Skeleton.Text />          - single line
 *   <Skeleton.Text lines={3} /> - multiple lines
 *   <Skeleton.Circle size={40} />
 *   <Skeleton.Card />
 *   <Skeleton.TableRows rows={5} cols={6} />
 *   <Skeleton.MetricCards count={4} />
 *   <Skeleton.PageLoader />
 *   <Skeleton.DashboardLoader />
 */

function Base({ className = '', style }) {
  return (
    <div
      className={`animate-shimmer ${className}`}
      style={style}
    />
  );
}

function Text({ lines = 1, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`} role="status" aria-label="Loading" aria-busy="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Base
          key={i}
          className="h-3.5 rounded"
          style={{ width: i === lines - 1 && lines > 1 ? '70%' : '100%' }}
        />
      ))}
    </div>
  );
}

function Circle({ size = 40, className = '' }) {
  return (
    <Base
      className={`rounded-full shrink-0 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

function Card({ className = '' }) {
  return (
    <div className={`bg-white border border-gray-100 p-4 space-y-3 ${className}`} role="status" aria-label="Loading" aria-busy="true">
      <div className="flex items-center gap-3">
        <Circle size={36} />
        <div className="flex-1 space-y-2">
          <Base className="h-4 rounded w-1/3" />
          <Base className="h-3 rounded w-1/2" />
        </div>
      </div>
      <Base className="h-3 rounded w-full" />
      <Base className="h-3 rounded w-4/5" />
    </div>
  );
}

function TableRows({ rows = 5, cols = 6 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <tr key={rowIdx} className="border-b border-gray-50">
          {Array.from({ length: cols }).map((_, colIdx) => (
            <td key={colIdx} className="px-4 py-4">
              <Base
                className="h-3.5 rounded"
                style={{ width: `${55 + Math.random() * 35}%` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function MetricCards({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-4 gap-3" role="status" aria-label="Loading" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-gray-50 px-3 py-4 sm:px-5 border border-gray-100">
          <div className="flex flex-col items-center gap-3 text-center">
            <Base className="w-9 h-9 rounded" />
            <Base className="h-5 rounded w-12" />
            <Base className="h-3 rounded w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50" role="status" aria-label="Loading" aria-busy="true">
      <div className="flex flex-col items-center gap-3">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border-2 border-gray-200"></div>
          <div className="absolute inset-0 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin"></div>
        </div>
        <span className="text-sm text-gray-400">Loading...</span>
      </div>
    </div>
  );
}

function DashboardLoader() {
  return (
    <div className="space-y-6 animate-fade-in" role="status" aria-label="Loading" aria-busy="true">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-5 border border-gray-100">
          <Base className="h-5 rounded w-36 mb-2" />
          <Base className="h-3 rounded w-24 mb-4" />
          <MetricCards />
        </div>
        <div className="bg-white p-5 border border-gray-100 h-[250px]">
          <Base className="h-4 rounded w-32 mb-4" />
          <Base className="h-full rounded" />
        </div>
      </div>
      {/* Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-white p-5 border border-gray-100 h-80">
          <Base className="h-4 rounded w-28 mb-4" />
          <Base className="h-[calc(100%-2rem)] rounded" />
        </div>
        <div className="lg:col-span-2 bg-white p-5 border border-gray-100">
          <Base className="h-4 rounded w-24 mb-4" />
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Circle size={16} />
                  <Base className="h-3 rounded w-20" />
                </div>
                <Base className="h-5 rounded-full w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TableLoader({ cols = 6, rows = 8 }) {
  return (
    <div className="overflow-x-auto" role="status" aria-label="Loading" aria-busy="true">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="px-4 py-3">
                <Base className="h-3 rounded w-16" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <TableRows rows={rows} cols={cols} />
        </tbody>
      </table>
    </div>
  );
}

const Skeleton = {
  Base,
  Text,
  Circle,
  Card,
  TableRows,
  TableLoader,
  MetricCards,
  PageLoader,
  DashboardLoader,
};

export default Skeleton;
