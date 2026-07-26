'use client';

import { useState } from 'react';
import { X, Star, Send } from 'lucide-react';
import { useFocusTrap } from '@/app/hooks/useFocusTrap';

export default function CustomerDetailsModal({ customer, onClose, onUpdate }) {
  const modalRef = useFocusTrap(true, onClose);
  const [activeTab, setActiveTab] = useState('profile');
  const [chatMessage, setChatMessage] = useState('');
  const [formData, setFormData] = useState({
    firstname: customer?.name?.split(' ')[0] || '',
    lastname: customer?.name?.split(' ').slice(1).join(' ') || '',
    email: customer?.email || '',
    phone: customer?.phone || '',
    status: customer?.accountStatus?.toLowerCase() || 'active',
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
      onUpdate(customer.id, formData);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'bookingHistory', label: 'Booking History' },
    { id: 'paymentMethods', label: 'Payment Methods' },
    { id: 'rating', label: 'Rating' },
    { id: 'complaints', label: 'Complaints' },
    { id: 'supportTicket', label: 'Support Ticket' },
  ];

  const bookingHistoryData = [
    {
      id: 'MC27609794',
      dateTime: '26/01/2025-17:10',
      pickupAddress: '44 Harrington Gardens, London, UK',
      destinationAddress: 'Hyde Park International...',
    },
    // ... more booking history data
  ];

  const ratingData = [
    {
      id: 'MC27609794',
      dateTime: '26/01/2025-17:10',
      rating: 4.5,
      driverName: 'Rawabi',
      review: 'Hyde Park International In...',
    },
    // ... more rating data
  ];

  const complaintsData = [
    {
      id: 'MC27609794',
      dateTime: '26/01/2025-17:10',
      subject: 'Complaint',
      description: 'Hyde Park International Inverness Terrace, London, L',
    },
    // ... more complaints data
  ];

  const supportTickets = [
    { id: '#12345', status: 'open' },
    { id: '#12345', status: 'open' },
    { id: '#12345', status: 'open' },
  ];

  const chatMessages = [
    {
      sender: 'agent',
      name: 'Support Agent',
      time: '3:34 PM',
      message: "Hey Esther, Sorry I can't text the price.",
    },
    {
      sender: 'customer',
      name: 'Rawabi Alarabi',
      time: '3:15PM',
      message:
        "Okay Wilson, I'm okay with price. can you tell me about your phone specification and warranty",
    },
  ];

  const renderStars = (rating) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    return (
      <div className="flex gap-0.5">
        {[...Array(fullStars)].map((_, i) => (
          <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
        ))}
        {hasHalfStar && (
          <div className="relative">
            <Star className="w-4 h-4 text-yellow-400" />
            <Star
              className="w-4 h-4 fill-yellow-400 text-yellow-400 absolute top-0 left-0"
              style={{ clipPath: 'inset(0 50% 0 0)' }}
            />
          </div>
        )}
        {[...Array(5 - Math.ceil(rating))].map((_, i) => (
          <Star key={`empty-${i}`} className="w-4 h-4 text-yellow-400" />
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/40 modal-backdrop flex items-center justify-center z-50 p-4">
      <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="customer-modal-title" className="bg-white w-full max-w-4xl max-h-[90vh] flex flex-col animate-fade-in-scale">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 id="customer-modal-title" className="text-xl font-semibold text-gray-900">
            Customer Details
          </h2>
          <button
            onClick={onClose}
            aria-label="Close customer details"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" aria-hidden="true" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 px-6">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
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
              <div>
                <label>
                  First Name
                </label>
                <input
                  type="text"
                  name="firstname"
                  value={formData.firstname}
                  onChange={handleInputChange}

                />
              </div>
              <div>
                <label>
                  Last Name
                </label>
                <input
                  type="text"
                  name="lastname"
                  value={formData.lastname}
                  onChange={handleInputChange}

                />
              </div>
              <div>
                <label>
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}

                />
              </div>
              <div>
                <label>
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}

                />
              </div>
              <div>
                <label>
                  Total Bookings
                </label>
                <input
                  type="text"

                  value={customer?.totalBookings || '0 Bookings'}
                  readOnly
                />
              </div>
              <div>
                <label>
                  Last Booking Date
                </label>
                <input
                  type="text"

                  value={customer?.lastBookingDate || 'N/A'}
                  readOnly
                />
              </div>
              <div>
                <label>
                  Account Status
                </label>
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

          {activeTab === 'bookingHistory' && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-full">
                <thead className="bg-[#14b8a6] text-white">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">
                      Booking ID
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">
                      Date-Time
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold hidden md:table-cell">
                      Pickup Address
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold hidden md:table-cell">
                      Destination Address
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold md:hidden">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {bookingHistoryData.map((booking, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {booking.id}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {booking.dateTime}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 hidden md:table-cell">
                        {booking.pickupAddress}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 hidden md:table-cell">
                        {booking.destinationAddress}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 md:hidden">
                        <div className="flex flex-col">
                          <span>{booking.pickupAddress}</span>
                          <span className="text-gray-500">{booking.destinationAddress}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-between mt-4">
                <button className="px-4 py-2 text-sm text-gray-600">
                  Previous
                </button>
                <div className="flex gap-2">
                  <button className="w-8 h-8 rounded bg-[#14b8a6] text-white text-sm flex items-center justify-center">
                    1
                  </button>
                  <button className="w-8 h-8 rounded bg-gray-100 text-gray-600 text-sm flex items-center justify-center">
                    2
                  </button>
                  <button className="w-8 h-8 rounded bg-gray-100 text-gray-600 text-sm flex items-center justify-center">
                    3
                  </button>
                </div>
                <button className="px-4 py-2 text-sm text-gray-600">
                  Next
                </button>
              </div>
            </div>
          )}

          {activeTab === 'paymentMethods' && (
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label>
                  Card Type
                </label>
                <input
                  type="text"

                  defaultValue="Rawabi Alarabi"
                />
              </div>
              <div>
                <label>
                  Card Number
                </label>
                <input
                  type="text"

                  defaultValue="customer@email.com"
                />
              </div>
              <div>
                <label>
                  Expiry Date
                </label>
                <input
                  type="text"

                  defaultValue="+44 1234 1234 12345"
                />
              </div>
              <div>
                <label>
                  Card Status
                </label>
                <input
                  type="text"

                  defaultValue="Active"
                />
              </div>
            </div>
          )}

          {activeTab === 'rating' && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-full">
                <thead className="bg-[#14b8a6] text-white">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">
                      Booking ID
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">
                      Date-Time
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">
                      Rating
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold hidden md:table-cell">
                      Driver Name
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold hidden md:table-cell">
                      Review
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold md:hidden">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ratingData.map((rating, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {rating.id}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {rating.dateTime}
                      </td>
                      <td className="px-4 py-3">{renderStars(rating.rating)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 hidden md:table-cell">
                        {rating.driverName}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 hidden md:table-cell">
                        {rating.review}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 md:hidden">
                        <div className="flex flex-col">
                          <span>{rating.driverName}</span>
                          <span className="text-gray-500">{rating.review}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-between mt-4">
                <button className="px-4 py-2 text-sm text-gray-600">
                  Previous
                </button>
                <div className="flex gap-2">
                  <button className="w-8 h-8 rounded bg-[#14b8a6] text-white text-sm flex items-center justify-center">
                    1
                  </button>
                  <button className="w-8 h-8 rounded bg-gray-100 text-gray-600 text-sm flex items-center justify-center">
                    2
                  </button>
                  <button className="w-8 h-8 rounded bg-gray-100 text-gray-600 text-sm flex items-center justify-center">
                    3
                  </button>
                </div>
                <button className="px-4 py-2 text-sm text-gray-600">
                  Next
                </button>
              </div>
            </div>
          )}

          {activeTab === 'complaints' && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-full">
                <thead className="bg-[#14b8a6] text-white">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">
                      Complaint ID
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">
                      Date-Time
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold hidden md:table-cell">
                      Subject
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold hidden md:table-cell">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold md:hidden">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {complaintsData.map((complaint, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {complaint.id}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {complaint.dateTime}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 hidden md:table-cell">
                        {complaint.subject}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 hidden md:table-cell">
                        {complaint.description}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 md:hidden">
                        <div className="flex flex-col">
                          <span>{complaint.subject}</span>
                          <span className="text-gray-500">{complaint.description}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-between mt-4">
                <button className="px-4 py-2 text-sm text-gray-600">
                  Previous
                </button>
                <div className="flex gap-2">
                  <button className="w-8 h-8 rounded bg-[#14b8a6] text-white text-sm flex items-center justify-center">
                    1
                  </button>
                  <button className="w-8 h-8 rounded bg-gray-100 text-gray-600 text-sm flex items-center justify-center">
                    2
                  </button>
                  <button className="w-8 h-8 rounded bg-gray-100 text-gray-600 text-sm flex items-center justify-center">
                    3
                  </button>
                </div>
                <button className="px-4 py-2 text-sm text-gray-600">
                  Next
                </button>
              </div>
            </div>
          )}

          {activeTab === 'supportTicket' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Support Tickets
                </h3>
                <div className="space-y-2">
                  {supportTickets.map((ticket, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                    >
                      <span className="text-sm font-medium text-gray-900">
                        {ticket.id}
                      </span>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2 border-t md:border-t-0 md:border-l-0 border-gray-200 pt-4 md:pt-0 md:pl-0 md:pl-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Rawabi Alarabi
                  </h3>
                  <span className="px-3 py-1 bg-[#14b8a6] text-white text-xs font-medium rounded-full">
                    TODAY
                  </span>
                </div>

                <div className="space-y-4 mb-4 max-h-[300px] overflow-y-auto">
                  {chatMessages.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex gap-3 ${
                        msg.sender === 'customer' ? 'flex-row-reverse' : ''
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0 flex items-center justify-center">
                        {msg.sender === 'agent' ? (
                          <span className="text-xs font-semibold">SA</span>
                        ) : (
                          <span className="text-xs font-semibold">RA</span>
                        )}
                      </div>
                      <div
                        className={`flex-1 ${
                          msg.sender === 'customer' ? 'text-right' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-900">
                            {msg.name}
                          </span>
                          <span className="text-xs text-gray-500">
                            {msg.time}
                          </span>
                        </div>
                        <div
                          className={`inline-block px-4 py-2 rounded-lg text-sm ${
                            msg.sender === 'customer'
                              ? 'bg-gray-100 text-gray-900'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          {msg.message}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type your message..."
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    className="flex-1"
                  />
                  <button className="p-2 bg-[#14b8a6] text-white rounded-lg hover:bg-[#0d9488]">
                    <Send className="w-5 h-5" />
                  </button>
                </div>
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

