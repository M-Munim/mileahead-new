'use client';

import { useState } from 'react';
import { X, Star, Eye, Download } from 'lucide-react';
import { useFocusTrap } from '@/app/hooks/useFocusTrap';

export default function DriverDetailsModal({ driver, onClose, onUpdate }) {
  const modalRef = useFocusTrap(true, onClose);
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState({
    firstname: driver?.name?.split(' ')[0] || '',
    lastname: driver?.name?.split(' ').slice(1).join(' ') || '',
    email: driver?.email || '',
    phone: driver?.phone || '',
    status: driver?.accountStatus?.toLowerCase() || 'active',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = () => {
    if (onUpdate) {
      onUpdate(driver.id, formData);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'vehicle', label: 'Vehicle' },
    { id: 'documents', label: 'Documents' },
    { id: 'performance', label: 'Performance' },
    { id: 'earnings', label: 'Earnings' },
  ];

  const documentsData = [
    {
      type: 'License',
      expiry: '20/01/2025-17:10',
      status: 'Verified',
    },
    {
      type: 'License',
      expiry: '20/01/2025-17:10',
      status: 'Rejected',
    },
    {
      type: 'License',
      expiry: '20/01/2025-17:10',
      status: 'Expiring Soon',
    },
    {
      type: 'License',
      expiry: '20/01/2025-17:10',
      status: 'Expired',
    },
    {
      type: 'License',
      expiry: '20/01/2025-17:10',
      status: 'Missing',
    },
    {
      type: 'License',
      expiry: '20/01/2025-17:10',
      status: 'Renewal Submitted',
    },
  ];

  const earningsData = [
    {
      dateTime: '26/01/2025-17:10',
      amount: '$ 2,560.00',
      status: 'Pending',
    },
    {
      dateTime: '26/01/2025-17:10',
      amount: '$ 2,560.00',
      status: 'Paid',
    },
    {
      dateTime: '26/01/2025-17:10',
      amount: '$ 2,560.00',
      status: 'Pending',
    },
    {
      dateTime: '26/01/2025-17:10',
      amount: '$ 2,560.00',
      status: 'Paid',
    },
    {
      dateTime: '26/01/2025-17:10',
      amount: '$ 2,560.00',
      status: 'Pending',
    },
    {
      dateTime: '26/01/2025-17:10',
      amount: '$ 2,560.00',
      status: 'Paid',
    },
    {
      dateTime: '26/01/2025-17:10',
      amount: '$ 2,560.00',
      status: 'Pending',
    },
  ];

  const renderStars = (rating) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    return (
      <div className="flex gap-0.5">
        {[...Array(fullStars)].map((_, i) => (
          <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
        ))}
        {hasHalfStar && (
          <div className="relative">
            <Star className="w-5 h-5 text-yellow-400" />
            <Star className="w-5 h-5 fill-yellow-400 text-yellow-400 absolute top-0 left-0" style={{ clipPath: 'inset(0 50% 0 0)' }} />
          </div>
        )}
        {[...Array(5 - Math.ceil(rating))].map((_, i) => (
          <Star key={`empty-${i}`} className="w-5 h-5 text-yellow-400" />
        ))}
      </div>
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Verified':
        return 'bg-green-100 text-green-700';
      case 'Rejected':
        return 'bg-red-100 text-red-700';
      case 'Expiring Soon':
        return 'bg-yellow-100 text-yellow-700';
      case 'Expired':
        return 'bg-red-100 text-red-700';
      case 'Missing':
        return 'bg-gray-100 text-gray-700';
      case 'Renewal Submitted':
        return 'bg-blue-100 text-blue-700';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'Paid':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 modal-backdrop flex items-center justify-center z-50 p-4">
      <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="driver-modal-title" className="bg-white w-full max-w-4xl max-h-[90vh] flex flex-col animate-fade-in-scale">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 id="driver-modal-title" className="text-xl font-semibold text-gray-900">Driver Details</h2>
          <button
            onClick={onClose}
            aria-label="Close driver details"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" aria-hidden="true" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 px-6">
          <div className="flex gap-2 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-[#14b8a6] text-[#14b8a6]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'profile' && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div className="col-span-2">
                <div className="w-full h-48 bg-gray-200 rounded-lg overflow-hidden mb-6">
                  <img
                    src="https://tse2.mm.bing.net/th/id/OIP.0w9Ot94P5KyfeNvkvkUEjwHaE8?pid=Api&P=0&h=220"
                    alt="Driver"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div>
                <label>First Name</label>
                <input
                  type="text"
                  name="firstname"
                  value={formData.firstname}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <label>Last Name</label>
                <input
                  type="text"
                  name="lastname"
                  value={formData.lastname}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <label>Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <label>Total Bookings</label>
                <input
                  type="text"
                  value={driver?.totalBookings || '0 Bookings'}
                  readOnly
                />
              </div>
              <div>
                <label>Last Booking Date</label>
                <input
                  type="text"
                  value={driver?.lastBookingDate || 'N/A'}
                  readOnly
                />
              </div>
              <div>
                <label>Account Status</label>
                <select 
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'vehicle' && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div className="col-span-2">
                <div className="w-full h-48 bg-gray-200 rounded-lg overflow-hidden mb-6">
                  <img
                    src="https://tse3.mm.bing.net/th/id/OIP.cRTr32b_BIaJKtZXQUefAAHaFj?pid=Api&P=0&h=220"
                    alt="Vehicle"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div>
                <label>Make</label>
                <input
                  type="text"
                  defaultValue="E-200"
                />
              </div>
              <div>
                <label>Registration No</label>
                <input
                  type="text"
                  defaultValue="UK1234"
                />
              </div>
              <div>
                <label>Model</label>
                <input
                  type="text"
                  defaultValue="Mercedes"
                />
              </div>
              <div>
                <label>Color</label>
                <input
                  type="text"
                  defaultValue="White"
                />
              </div>
              <div>
                <label>Last Inspection On</label>
                <input
                  type="text"
                  defaultValue="01-10-2025"
                />
              </div>
              <div>
                <button className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors">
                  Schedule Inspection
                </button>
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#14b8a6] text-white">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Documents</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Documents Expiry</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {documentsData.map((doc, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="px-4 py-3 text-sm text-gray-900">{doc.type}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{doc.expiry}</td>
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(doc.status)}`}>
                          {doc.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button className="p-1.5 text-[#14b8a6] hover:bg-teal-50 rounded">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-1.5 text-[#14b8a6] hover:bg-teal-50 rounded">
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        {activeTab === 'performance' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Chart, Stats, and Rating */}
              <div className="flex flex-col gap-6">
                <div className="bg-gray-100 p-4 md:p-6 rounded-lg">
                  <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                    <div className="relative w-32 h-32 sm:w-48 sm:h-48">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 192 192">
                        <circle
                          cx="96"
                          cy="96"
                          r="80"
                          stroke="#e5e7eb"
                          strokeWidth="16"
                          fill="none"
                        />
                        <circle
                          cx="96"
                          cy="96"
                          r="80"
                          stroke="#10b981"
                          strokeWidth="16"
                          fill="none"
                          strokeDasharray={`${2000 * 0.75} ${2000 * 0.25}`}
                          strokeLinecap="round"
                        />
                        <circle
                          cx="96"
                          cy="96"
                          r="80"
                          stroke="#ef4444"
                          strokeWidth="16"
                          fill="none"
                          strokeDasharray={`${2000 * 0.15} ${2000 * 0.85}`}
                          strokeDashoffset={`-${2000 * 0.75}`}
                          strokeLinecap="round"
                        />
                        <circle
                          cx="96"
                          cy="96"
                          r="80"
                          stroke="#fbbf24"
                          strokeWidth="16"
                          fill="none"
                          strokeDasharray={`${2000 * 0.1} ${2000 * 0.9}`}
                          strokeDashoffset={`-${2000 * 0.9}`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className="text-lg sm:text-3xl font-bold text-gray-900">Total</div>
                        <div className="text-base sm:text-2xl font-semibold text-gray-700">2,400</div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 sm:gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-500 rounded-full"></div>
                        <span className="text-xs sm:text-sm text-gray-700">Completed</span>
                        <span className="text-xs sm:text-sm font-semibold text-gray-900">2,000</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 sm:w-4 sm:h-4 bg-red-500 rounded-full"></div>
                        <span className="text-xs sm:text-sm text-gray-700">Cancelled</span>
                        <span className="text-xs sm:text-sm font-semibold text-gray-900">450</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 sm:w-4 sm:h-4 bg-yellow-400 rounded-full"></div>
                        <span className="text-xs sm:text-sm text-gray-700">Pending</span>
                        <span className="text-xs sm:text-sm font-semibold text-gray-900">200</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-100 p-4 md:p-6 rounded-lg text-center">
                  <div className="text-base sm:text-lg font-semibold text-gray-900 mb-1 sm:mb-2">Average rating</div>
                  <div className="text-2xl sm:text-4xl font-bold text-gray-900 mb-1 sm:mb-2">4.5</div>
                  <div className="flex items-center justify-center">
                    {renderStars(4.5)}
                  </div>
                </div>
              </div>

              {/* Right Column: Rate Bars */}
              <div className="flex flex-col justify-between gap-4 sm:gap-6">
                <div className="bg-gray-100 p-4 md:p-6 rounded-lg text-center">
                  <div className="text-xs sm:text-sm text-gray-700 mb-1 sm:mb-2">Completion rate</div>
                  <div className="text-lg sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">75%</div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                  </div>
                </div>
                <div className="bg-gray-100 p-4 md:p-6 rounded-lg text-center">
                  <div className="text-xs sm:text-sm text-gray-700 mb-1 sm:mb-2">Cancellation rate</div>
                  <div className="text-lg sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">15%</div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-red-500 h-2 rounded-full" style={{ width: '15%' }}></div>
                  </div>
                </div>
                <div className="bg-gray-100 p-4 md:p-6 rounded-lg text-center">
                  <div className="text-xs sm:text-sm text-gray-700 mb-1 sm:mb-2">Pending rate</div>
                  <div className="text-lg sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">10%</div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '10%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'earnings' && (
            <div>
              <div className="mb-6">
                <div className="text-sm text-gray-700 mb-2">Current Earnings</div>
                <div className="text-3xl font-bold text-gray-900">$ 2,560.00</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#14b8a6] text-white">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Date & Time</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Amount</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {earningsData.map((earning, index) => (
                      <tr key={index} className="border-b border-gray-100">
                        <td className="px-4 py-3 text-sm text-gray-900">{earning.dateTime}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{earning.amount}</td>
                        <td className="px-4 py-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(earning.status)}`}>
                            {earning.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
          <button 
            onClick={handleSave}
            className="px-5 py-2 text-sm font-medium bg-[#14b8a6] text-white hover:bg-[#0d9488] transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

