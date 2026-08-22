'use client';

import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import PricingCard from '../components/PricingCard';
import CarWashPricing from '../components/CarWashPricing';
import RoleGuard from '../components/RoleGuard';
import { Calculator, Droplets, AlertTriangle } from 'lucide-react';
import { ROLES } from '../contexts/AuthContext';

const TABS = [
  { key: 'carwash', label: 'Car Wash Prices', icon: Droplets },
  { key: 'rides', label: 'Ride Plans', icon: Calculator },
];

export default function PricingPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [duration, setDuration] = useState(44);
  const [selectedPlan, setSelectedPlan] = useState('perMinute');
  const [activeTab, setActiveTab] = useState('carwash');

  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  const handlePlanSelect = ({ plan }) => setSelectedPlan(plan);

  const handleDurationChange = (e) => {
    const val = parseInt(e.target.value);
    setDuration(val >= 0 ? val : 0);
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
            <Header title="Pricing & Fees Management" toggleSidebar={toggleSidebar} />
          </div>

          <main className="flex-1 px-4 md:px-6 pb-6 overflow-x-hidden">
            <div className="max-w-6xl mx-auto">
              {/* Tabs */}
              <div className="bg-white shadow-sm border border-gray-100 mb-6">
                <div className="flex gap-1 p-2" role="tablist" aria-label="Pricing sections">
                  {TABS.map((tab) => {
                    const TabIcon = tab.icon;
                    const isActive = activeTab === tab.key;
                    return (
                      <button
                        key={tab.key}
                        role="tab"
                        aria-selected={isActive}
                        aria-controls={`${tab.key}-panel`}
                        id={`${tab.key}-tab`}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-[var(--primary)] text-white'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <TabIcon className="w-4 h-4" aria-hidden="true" />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Car wash — live, editable prices */}
              {activeTab === 'carwash' && (
                <div role="tabpanel" id="carwash-panel" aria-labelledby="carwash-tab">
                  <CarWashPricing />
                </div>
              )}

              {/* Ride plans — calculator only, not connected to anything */}
              {activeTab === 'rides' && (
                <div role="tabpanel" id="rides-panel" aria-labelledby="rides-tab">
                  {/* The rates below live in the frontend and in the backend
                      separately. Editing them here changes neither. */}
                  <div className="bg-amber-50 border border-amber-300 p-4 mb-6 flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
                    <div className="text-sm text-amber-900">
                      <p className="font-semibold mb-1">Preview only — this does not change what customers pay.</p>
                      <p>
                        You can type different rates below to work out what a trip would
                        cost, but nothing is saved. Refresh the page and your changes are
                        gone. Real ride rates are set in the backend and there is no API to
                        change them yet.
                      </p>
                    </div>
                  </div>

                  {/* Introduction Card */}
                  <div className="bg-white shadow-sm border border-gray-100 p-6 mb-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
                        <Calculator className="w-6 h-6 text-[var(--primary)]" aria-hidden="true" />
                      </div>
                      <div>
                        <h1 className="text-xl font-semibold text-gray-900">Pricing Calculator</h1>
                        <p className="text-sm text-gray-500">Calculate fare based on duration and selected plan</p>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <h2 className="font-semibold text-gray-900 mb-2">Available Plans:</h2>
                      <ul className="space-y-2 text-sm text-gray-600">
                        <li className="flex items-start gap-2">
                          <span className="text-[var(--primary)] mt-0.5" aria-hidden="true">&#8226;</span>
                          <span><strong>Per-Minute Plan:</strong> 3 QAR per minute - Best for short trips</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-[var(--primary)] mt-0.5" aria-hidden="true">&#8226;</span>
                          <span><strong>Hourly Plan:</strong> 150 QAR per hour (minimum 2 hours) - Best for medium trips</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-[var(--primary)] mt-0.5" aria-hidden="true">&#8226;</span>
                          <span><strong>Monthly Plan:</strong> 8500 QAR for 200 hours (42.5 QAR/hour) - Best for frequent users</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  {/* Duration Input */}
                  <div className="bg-white shadow-sm border border-gray-100 p-6 mb-6">
                    <label htmlFor="trip-duration" className="block text-sm font-medium text-gray-700 mb-3">
                      Enter Trip Duration (in minutes)
                    </label>
                    <input
                      id="trip-duration"
                      type="number"
                      min="0"
                      value={duration}
                      onChange={handleDurationChange}
                      placeholder="Enter duration in minutes"
                      aria-describedby="duration-hint"
                    />
                    <p id="duration-hint" className="text-xs text-gray-500 mt-2">
                      Example: For a 44-minute trip, enter 44
                    </p>
                  </div>

                  {/* Pricing Card */}
                  {duration > 0 ? (
                    <div className="bg-white shadow-sm border border-gray-100 p-6">
                      <PricingCard
                        duration={duration}
                        onPlanSelect={handlePlanSelect}
                        selectedPlan={selectedPlan}
                      />
                    </div>
                  ) : (
                    <div className="bg-white shadow-sm border border-gray-100 p-12 text-center">
                      <Calculator className="w-16 h-16 text-gray-300 mx-auto mb-4" aria-hidden="true" />
                      <p className="text-gray-500">Enter a duration to see pricing calculations</p>
                    </div>
                  )}

                  {/* Examples Section */}
                  <div className="bg-white shadow-sm border border-gray-100 p-6 mt-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Pricing Examples</h2>

                    {/* Desktop table */}
                    <div className="overflow-x-auto hidden sm:block">
                      <table className="w-full" aria-label="Pricing examples">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Duration</th>
                            <th scope="col" className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Per-Minute</th>
                            <th scope="col" className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Hourly</th>
                            <th scope="col" className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Monthly</th>
                            <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Best Plan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {[
                            { dur: '44 minutes (0.73 hrs)', pm: '132 QAR', h: '300 QAR*', m: '31.03 QAR' },
                            { dur: '60 minutes (1 hr)', pm: '180 QAR', h: '300 QAR*', m: '42.5 QAR' },
                            { dur: '120 minutes (2 hrs)', pm: '360 QAR', h: '300 QAR', m: '85 QAR' },
                            { dur: '180 minutes (3 hrs)', pm: '540 QAR', h: '450 QAR', m: '127.5 QAR' },
                            { dur: '240 minutes (4 hrs)', pm: '720 QAR', h: '600 QAR', m: '170 QAR' },
                          ].map((row) => (
                            <tr key={row.dur} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-900">{row.dur}</td>
                              <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">{row.pm}</td>
                              <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">{row.h}</td>
                              <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">{row.m}</td>
                              <td className="px-4 py-3 text-center">
                                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Monthly</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="sm:hidden space-y-3">
                      {[
                        { dur: '44 min', pm: '132', h: '300*', m: '31.03' },
                        { dur: '60 min', pm: '180', h: '300*', m: '42.5' },
                        { dur: '120 min', pm: '360', h: '300', m: '85' },
                        { dur: '180 min', pm: '540', h: '450', m: '127.5' },
                        { dur: '240 min', pm: '720', h: '600', m: '170' },
                      ].map((row) => (
                        <div key={row.dur} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-gray-900">{row.dur}</span>
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Monthly best</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <div>
                              <span className="text-gray-500 block text-xs">Per-Min</span>
                              <span className="font-medium">{row.pm} QAR</span>
                            </div>
                            <div>
                              <span className="text-gray-500 block text-xs">Hourly</span>
                              <span className="font-medium">{row.h} QAR</span>
                            </div>
                            <div>
                              <span className="text-gray-500 block text-xs">Monthly</span>
                              <span className="font-medium">{row.m} QAR</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <p className="text-xs text-gray-500 mt-4">
                      * Hourly plan has a minimum charge of 2 hours (300 QAR)
                    </p>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </RoleGuard>
  );
}
