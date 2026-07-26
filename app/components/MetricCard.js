'use client';

export default function MetricCard({
  icon: Icon,
  value,
  label,
  bgColor,
  iconColor,
  cardColor,
  onClick,
}) {
  const isClickable = !!onClick;

  const handleKeyDown = (e) => {
    if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      aria-label={`${label}: ${value}`}
      className={`${cardColor} px-3 py-4 sm:px-5 shadow-sm border border-gray-100 ${isClickable ? 'cursor-pointer' : ''} card-hover transition-all`}
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <div
          className={`w-9 h-9 ${bgColor} flex items-center justify-center`}
        >
          <Icon className={`w-4 h-4 ${iconColor}`} aria-hidden="true" />
        </div>
        <div className="text-lg sm:text-xl font-bold text-gray-900">{value}</div>
        <div className="text-xs sm:text-sm text-gray-500 font-medium">{label}</div>
      </div>
    </div>
  );
}
