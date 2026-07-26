'use client';

import { useState, useEffect } from 'react';
import { Clock, DollarSign } from 'lucide-react';

// Pricing configuration
const PRICING_CONFIG = {
  perMinute: {
    name: 'Per-Minute Plan',
    rate: 3, // QAR per minute
    formula: (minutes) => minutes * 3,
    description: '3 QAR × total minutes'
  },
  hourly: {
    name: 'Hourly Plan',
    rate: 150, // QAR per hour
    minimumHours: 2,
    formula: (hours) => {
      const actualHours = Math.max(hours, 2); // Minimum 2 hours
      return actualHours * 150;
    },
    description: '150 QAR × total hours (minimum 2 hours)'
  },
  monthly: {
    name: 'Monthly Plan',
    rate: 42.5, // QAR per hour (8500 / 200)
    basePrice: 8500, // QAR per month
    includedHours: 200, // hours included in monthly plan
    formula: (hours) => hours * 42.5,
    description: '8500 QAR per 200 hours (42.5 QAR/hour)'
  }
};

export default function PricingCard({ duration = 0, onPlanSelect, selectedPlan = 'perMinute' }) {
  const [activePlan, setActivePlan] = useState(selectedPlan);
  const [calculatedPrice, setCalculatedPrice] = useState(0);
  const [durationHours, setDurationHours] = useState(0);
  const [durationMinutes, setDurationMinutes] = useState(duration);
  const [perMinuteRate, setPerMinuteRate] = useState(PRICING_CONFIG.perMinute.rate);
  const [hourlyRate, setHourlyRate] = useState(PRICING_CONFIG.hourly.rate);
  const [monthlyRate, setMonthlyRate] = useState(PRICING_CONFIG.monthly.rate);

  // Calculate duration in hours and minutes
  useEffect(() => {
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    setDurationHours(hours);
    setDurationMinutes(duration);

    // Calculate price based on active plan
    calculatePrice(activePlan, duration);
  }, [duration, activePlan, perMinuteRate, hourlyRate, monthlyRate]);

  const calculatePrice = (plan, durationInMinutes) => {
    let price = 0;
    const hours = durationInMinutes / 60;

    switch (plan) {
      case 'perMinute':
        price = durationInMinutes * perMinuteRate;
        break;
      case 'hourly':
        price = Math.max(hours, 2) * hourlyRate;
        break;
      case 'monthly':
        price = hours * monthlyRate;
        break;
      default:
        price = durationInMinutes * perMinuteRate;
    }

    setCalculatedPrice(price.toFixed(2));

    // Notify parent component
    if (onPlanSelect) {
      onPlanSelect({ plan, price: price.toFixed(2), duration: durationInMinutes });
    }
  };

  const handlePlanClick = (plan) => {
    setActivePlan(plan);
    calculatePrice(plan, durationMinutes);
  };

  const formatDuration = () => {
    const hours = Math.floor(durationMinutes / 60);
    const mins = durationMinutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <div className="space-y-4">
      {/* Duration Display */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#14b8a6]" />
            <span className="text-sm font-medium text-gray-700">Duration:</span>
          </div>
          <span className="text-lg font-bold text-gray-900">
            {formatDuration()} ({(durationMinutes / 60).toFixed(2)} hours)
          </span>
        </div>
      </div>

      {/* Pricing Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Per-Minute Plan */}
        <div
          onClick={() => handlePlanClick('perMinute')}
          className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
            activePlan === 'perMinute'
              ? 'border-[#14b8a6] bg-[#14b8a6]/5'
              : 'border-gray-200 hover:border-[#14b8a6]/50'
          }`}
        >
          <div className="text-left">
            <h3 className="font-semibold text-gray-900 mb-1">
              {PRICING_CONFIG.perMinute.name}
            </h3>
            <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
              <input
                type="number"
                value={perMinuteRate}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setPerMinuteRate(parseFloat(e.target.value) || 0)}
                className="w-16 px-1 py-0.5 border border-gray-300 rounded text-center text-xs focus:ring-1 focus:ring-[#14b8a6] focus:border-transparent"
                min="0"
                step="0.5"
              />
              <span>QAR × total minutes</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-[#14b8a6]">
                {(durationMinutes * perMinuteRate).toFixed(2)}
              </span>
              <span className="text-sm text-gray-600">QAR</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {durationMinutes} min × {perMinuteRate} QAR
            </p>
          </div>
        </div>

        {/* Hourly Plan */}
        <div
          onClick={() => handlePlanClick('hourly')}
          className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
            activePlan === 'hourly'
              ? 'border-[#14b8a6] bg-[#14b8a6]/5'
              : 'border-gray-200 hover:border-[#14b8a6]/50'
          }`}
        >
          <div className="text-left">
            <h3 className="font-semibold text-gray-900 mb-1">
              {PRICING_CONFIG.hourly.name}
            </h3>
            <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
              <input
                type="number"
                value={hourlyRate}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setHourlyRate(parseFloat(e.target.value) || 0)}
                className="w-16 px-1 py-0.5 border border-gray-300 rounded text-center text-xs focus:ring-1 focus:ring-[#14b8a6] focus:border-transparent"
                min="0"
                step="5"
              />
              <span>QAR × total hours (min 2 hrs)</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-[#14b8a6]">
                {(Math.max(durationMinutes / 60, 2) * hourlyRate).toFixed(2)}
              </span>
              <span className="text-sm text-gray-600">QAR</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {Math.max((durationMinutes / 60).toFixed(2), 2)} hrs × {hourlyRate} QAR
              {(durationMinutes / 60) < 2 && (
                <span className="block text-orange-600 mt-1">
                  (Minimum 2 hours charged)
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Monthly Plan */}
        <div
          onClick={() => handlePlanClick('monthly')}
          className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
            activePlan === 'monthly'
              ? 'border-[#14b8a6] bg-[#14b8a6]/5'
              : 'border-gray-200 hover:border-[#14b8a6]/50'
          }`}
        >
          <div className="text-left">
            <h3 className="font-semibold text-gray-900 mb-1">
              {PRICING_CONFIG.monthly.name}
            </h3>
            <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
              <input
                type="number"
                value={monthlyRate}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setMonthlyRate(parseFloat(e.target.value) || 0)}
                className="w-16 px-1 py-0.5 border border-gray-300 rounded text-center text-xs focus:ring-1 focus:ring-[#14b8a6] focus:border-transparent"
                min="0"
                step="0.5"
              />
              <span>QAR/hr (monthly)</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-[#14b8a6]">
                {(durationMinutes / 60 * monthlyRate).toFixed(2)}
              </span>
              <span className="text-sm text-gray-600">QAR</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {(durationMinutes / 60).toFixed(2)} hrs × {monthlyRate} QAR
            </p>
          </div>
        </div>
      </div>

      {/* Total Price Display */}
      <div className="bg-[#14b8a6] rounded-lg p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            <span className="text-sm font-medium">Total Fare:</span>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{calculatedPrice} QAR</div>
            <div className="text-xs opacity-90">
              {activePlan === 'perMinute' && 'Per-Minute Plan'}
              {activePlan === 'hourly' && 'Hourly Plan'}
              {activePlan === 'monthly' && 'Monthly Plan'}
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h4 className="font-semibold text-gray-900 mb-2 text-sm">Calculation Breakdown:</h4>
        <div className="space-y-1 text-sm text-gray-600">
          {activePlan === 'perMinute' && (
            <>
              <div>Duration: {durationMinutes} minutes</div>
              <div>Rate: {perMinuteRate} QAR per minute</div>
              <div className="font-medium text-gray-900">
                Total: {durationMinutes} × {perMinuteRate} = {calculatedPrice} QAR
              </div>
            </>
          )}
          {activePlan === 'hourly' && (
            <>
              <div>Duration: {(durationMinutes / 60).toFixed(2)} hours</div>
              <div>
                Charged: {Math.max((durationMinutes / 60).toFixed(2), 2)} hours
                {(durationMinutes / 60) < 2 && ' (minimum 2 hours)'}
              </div>
              <div>Rate: {hourlyRate} QAR per hour</div>
              <div className="font-medium text-gray-900">
                Total: {Math.max((durationMinutes / 60).toFixed(2), 2)} × {hourlyRate} = {calculatedPrice} QAR
              </div>
            </>
          )}
          {activePlan === 'monthly' && (
            <>
              <div>Duration: {(durationMinutes / 60).toFixed(2)} hours</div>
              <div>Rate: {monthlyRate} QAR per hour</div>
              <div className="font-medium text-gray-900">
                Total: {(durationMinutes / 60).toFixed(2)} × {monthlyRate} = {calculatedPrice} QAR
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Export pricing configuration for use in other components
export { PRICING_CONFIG };

