/**
 * Pricing Calculator Utility
 * 
 * This utility provides functions to calculate pricing based on three plans:
 * 1. Per-Minute Plan: 3 QAR per minute
 * 2. Hourly Plan: 150 QAR per hour (minimum 2 hours)
 * 3. Monthly Plan: 42.5 QAR per hour (8500 QAR / 200 hours)
 */

// Pricing constants
export const PRICING_RATES = {
  PER_MINUTE: 3, // QAR per minute
  HOURLY: 150, // QAR per hour
  HOURLY_MINIMUM: 2, // Minimum hours charged
  MONTHLY_BASE: 8500, // QAR per month
  MONTHLY_HOURS: 200, // Hours included in monthly plan
  MONTHLY_RATE: 42.5, // QAR per hour (8500 / 200)
};

/**
 * Calculate price for per-minute plan
 * @param {number} durationInMinutes - Duration in minutes
 * @returns {number} Price in QAR
 */
export function calculatePerMinutePlan(durationInMinutes) {
  return durationInMinutes * PRICING_RATES.PER_MINUTE;
}

/**
 * Calculate price for hourly plan (minimum 2 hours)
 * @param {number} durationInMinutes - Duration in minutes
 * @returns {number} Price in QAR
 */
export function calculateHourlyPlan(durationInMinutes) {
  const hours = durationInMinutes / 60;
  const chargedHours = Math.max(hours, PRICING_RATES.HOURLY_MINIMUM);
  return chargedHours * PRICING_RATES.HOURLY;
}

/**
 * Calculate price for monthly plan
 * @param {number} durationInMinutes - Duration in minutes
 * @returns {number} Price in QAR
 */
export function calculateMonthlyPlan(durationInMinutes) {
  const hours = durationInMinutes / 60;
  return hours * PRICING_RATES.MONTHLY_RATE;
}

/**
 * Calculate price for all plans and return the results
 * @param {number} durationInMinutes - Duration in minutes
 * @returns {Object} Object containing prices for all plans
 */
export function calculateAllPlans(durationInMinutes) {
  const hours = durationInMinutes / 60;
  
  return {
    perMinute: {
      plan: 'perMinute',
      name: 'Per-Minute Plan',
      duration: durationInMinutes,
      hours: hours,
      price: calculatePerMinutePlan(durationInMinutes),
      formula: `${durationInMinutes} min × ${PRICING_RATES.PER_MINUTE} QAR`,
    },
    hourly: {
      plan: 'hourly',
      name: 'Hourly Plan',
      duration: durationInMinutes,
      hours: hours,
      chargedHours: Math.max(hours, PRICING_RATES.HOURLY_MINIMUM),
      price: calculateHourlyPlan(durationInMinutes),
      formula: `${Math.max(hours, PRICING_RATES.HOURLY_MINIMUM).toFixed(2)} hrs × ${PRICING_RATES.HOURLY} QAR`,
      hasMinimum: hours < PRICING_RATES.HOURLY_MINIMUM,
    },
    monthly: {
      plan: 'monthly',
      name: 'Monthly Plan',
      duration: durationInMinutes,
      hours: hours,
      price: calculateMonthlyPlan(durationInMinutes),
      formula: `${hours.toFixed(2)} hrs × ${PRICING_RATES.MONTHLY_RATE} QAR`,
    },
  };
}

/**
 * Get the best (cheapest) plan for a given duration
 * @param {number} durationInMinutes - Duration in minutes
 * @returns {Object} Best plan with details
 */
export function getBestPlan(durationInMinutes) {
  const allPlans = calculateAllPlans(durationInMinutes);
  
  const plans = [
    { ...allPlans.perMinute, type: 'perMinute' },
    { ...allPlans.hourly, type: 'hourly' },
    { ...allPlans.monthly, type: 'monthly' },
  ];
  
  // Find the plan with the lowest price
  const bestPlan = plans.reduce((best, current) => 
    current.price < best.price ? current : best
  );
  
  return bestPlan;
}

/**
 * Calculate price based on plan type
 * @param {string} planType - 'perMinute', 'hourly', or 'monthly'
 * @param {number} durationInMinutes - Duration in minutes
 * @returns {number} Price in QAR
 */
export function calculatePrice(planType, durationInMinutes) {
  switch (planType) {
    case 'perMinute':
      return calculatePerMinutePlan(durationInMinutes);
    case 'hourly':
      return calculateHourlyPlan(durationInMinutes);
    case 'monthly':
      return calculateMonthlyPlan(durationInMinutes);
    default:
      throw new Error(`Invalid plan type: ${planType}`);
  }
}

/**
 * Format price for display
 * @param {number} price - Price in QAR
 * @returns {string} Formatted price string
 */
export function formatPrice(price) {
  return `${price.toFixed(2)} QAR`;
}

/**
 * Convert minutes to hours and minutes string
 * @param {number} durationInMinutes - Duration in minutes
 * @returns {string} Formatted duration string
 */
export function formatDuration(durationInMinutes) {
  const hours = Math.floor(durationInMinutes / 60);
  const minutes = durationInMinutes % 60;
  
  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${minutes}m`;
  }
}

// Example usage:
// const result = calculateAllPlans(44); // 44 minutes
// console.log(result.perMinute.price); // 132
// console.log(result.hourly.price); // 300
// console.log(result.monthly.price); // 31.03

// const bestPlan = getBestPlan(44);
// console.log(bestPlan.name); // "Monthly Plan"
// console.log(bestPlan.price); // 31.03

