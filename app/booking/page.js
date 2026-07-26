'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Eye, Trash2, Edit, Calendar, AreaChart, Loader, ChevronDown } from 'lucide-react';
import Skeleton from '../components/Skeleton';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import CreateBookingModal from '../components/CreateBookingModal';
import Toast from '../components/Toast';
import { bookingService } from '../../utils/axiosInstance';
import { useDebounce } from '../hooks/useDebounce';

export default function BookingPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [bookingsData, setBookingsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentBooking, setCurrentBooking] = useState(null);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [isBookingDropdownOpen, setIsBookingDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Fetch bookings with AbortController
  const fetchBookings = useCallback(async (signal) => {
    try {
      setLoading(true);
      setError(null);

      const statusMap = {
        'Pending Confirmation': 'pending',
        'Scheduled': 'schedule',
        'Accepted': 'accepted',
        'In Progress': 'in progress',
        'Completed': 'completed',
        'Cancelled': 'cancelled',
      };

      const requestBody = {
        status: statusFilter === 'All' ? 'all' : (statusMap[statusFilter] || statusFilter.toLowerCase()),
        field: debouncedSearchTerm && !isNaN(debouncedSearchTerm.trim()) ? "booking_number" : "passenger_name",
        search: debouncedSearchTerm,
        sorting: { field: "id", order: "desc" },
        page: currentPage,
        limit: itemsPerPage
      };

      const response = await bookingService.getAllBookings(requestBody);

      if (signal?.aborted) return;

      if (response.data?.data?.results) {
        const transformedData = response.data.data.results.map((booking) => ({
          id: booking.booking_number || `BK${booking.id}`,
          originalId: booking.id,
          customerName: booking.passenger_name || 'N/A',
          customerPhone: booking.contact_number || 'N/A',
          customerEmail: booking.email || 'N/A',
          driverName: booking.driver_id ? `Driver ${booking.driver_id}` : 'Not Assigned',
          carName: booking.car_name || 'N/A',
          Passengers: booking.no_of_passengers || 'N/A',
          HandLaggage: booking.hand_laggages || 'N/A',
          Luggage: booking.luggage || 'N/A',
          pickupLocation: booking.from_address || 'N/A',
          dropoffLocation: booking.to_address || 'N/A',
          dateTime: booking.date_time || 'N/A',
          status: formatStatus(booking.status),
          rawStatus: booking.status,
          PaymentMethod: booking.payment_method || 'N/A',
          fare: `${booking.price || '0.00'}`,
          vehicleType: booking.car_name || 'N/A',
          ...booking
        }));
        setBookingsData(transformedData);

        const receivedCount = transformedData.length;
        let estimatedTotal;
        if (receivedCount < itemsPerPage) {
          estimatedTotal = (currentPage - 1) * itemsPerPage + receivedCount;
        } else {
          estimatedTotal = currentPage * itemsPerPage + itemsPerPage;
        }
        setTotalItems(estimatedTotal);
      }
    } catch (err) {
      if (!signal?.aborted) {
        console.error('Error fetching bookings:', err);
        setError('Failed to load bookings. Please try again.');
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [currentPage, itemsPerPage, statusFilter, debouncedSearchTerm]);

  useEffect(() => {
    const controller = new AbortController();
    fetchBookings(controller.signal);
    return () => controller.abort();
  }, [fetchBookings]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsBookingDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, statusFilter]);

  const formatStatus = (status) => {
    const statusMap = {
      'pending': 'Pending Confirmation',
      'schedule': 'Scheduled',
      'accepted': 'Accepted',
      'in progress': 'In Progress',
      'completed': 'Completed',
      'cancelled': 'Cancelled',
    };
    return statusMap[status] || status;
  };

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Scheduled':
      case 'Pending Confirmation':
        return 'bg-blue-100 text-blue-700';
      case 'Accepted':
        return 'bg-yellow-100 text-yellow-700';
      case 'In Progress':
        return 'bg-purple-100 text-purple-700';
      case 'Completed':
        return 'bg-green-100 text-green-700';
      case 'Cancelled':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const handleEditClick = (booking) => {
    setCurrentBooking({
      ...booking,
      passenger_name: booking.passenger_name,
      contact_number: booking.contact_number,
      email: booking.email,
      from_address: booking.from_address,
      to_address: booking.to_address,
      date_time: booking.date_time,
      status: booking.rawStatus,
      no_of_passengers: booking.no_of_passengers || '',
      car_name: booking.car_name || '',
      luggage: booking.luggage || '',
      payment_method: booking.payment_method || '',
      price: booking.price || ''
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateBooking = async (e) => {
    e.preventDefault();
    if (!currentBooking) return;

    try {
      setUpdateLoading(true);

      let formattedDate = currentBooking.date_time;
      if (currentBooking.date_time) {
        const dateObj = new Date(currentBooking.date_time);
        if (!isNaN(dateObj.getTime())) {
          const year = dateObj.getFullYear();
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const day = String(dateObj.getDate()).padStart(2, '0');
          const hours = String(dateObj.getHours()).padStart(2, '0');
          const minutes = String(dateObj.getMinutes()).padStart(2, '0');
          const seconds = String(dateObj.getSeconds()).padStart(2, '0');
          formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        }
      }

      const payload = {
        passenger_name: currentBooking.passenger_name,
        contact_number: currentBooking.contact_number,
        email: currentBooking.email,
        from_address: currentBooking.from_address,
        to_address: currentBooking.to_address,
        date_time: formattedDate,
        status: currentBooking.status,
        no_of_passengers: Number(currentBooking.no_of_passengers),
        car_name: currentBooking.car_name,
        luggage: Number(currentBooking.luggage),
        payment_method: currentBooking.payment_method,
        price: Number(currentBooking.price),
      };

      await bookingService.updateBooking(currentBooking.originalId, payload);
      setIsEditModalOpen(false);
      setCurrentBooking(null);
      fetchBookings();
      showToast('Booking updated successfully!', 'success');
    } catch (err) {
      console.error('Error updating booking:', err);
      showToast('Failed to update booking. Please try again.', 'error');
    } finally {
      setUpdateLoading(false);
    }
  };

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  const handleViewBooking = () => {
    setIsBookingDropdownOpen(false);
    showToast('View Booking selected', 'info');
  };

  const handleDisputeResolution = () => {
    setIsBookingDropdownOpen(false);
    showToast('Dispute Resolution selected', 'info');
  };

  const handleAssignToDriver = () => {
    setIsBookingDropdownOpen(false);
    showToast('Assign to Driver selected', 'info');
  };

  const currentBookings = bookingsData;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const indexOfLastItem = Math.min(currentPage * itemsPerPage, totalItems);
  const indexOfFirstItem = totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;

  const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);
  const handlePrevious = () => { if (currentPage > 1) setCurrentPage(currentPage - 1); };
  const handleNext = () => { if (currentPage < totalPages) setCurrentPage(currentPage + 1); };

  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;
    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="flex min-h-screen bg-gray-50 overflow-x-hidden">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={toggleSidebar} aria-hidden="true" />
      )}

      <div className="flex-1 flex flex-col min-h-screen lg:ml-[240px] w-full lg:w-auto overflow-x-hidden">
        <div className="px-4 md:px-6 pt-4 md:pt-6">
          <Header title="Booking / Ride Management" toggleSidebar={toggleSidebar} />
        </div>

        <main className="flex-1 px-4 md:px-6 pb-6 overflow-x-hidden">
          <div className="bg-white shadow-sm border border-gray-100 overflow-hidden animate-fade-in-up">
            {/* Action Buttons */}
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setIsBookingDropdownOpen(!isBookingDropdownOpen)}
                      aria-expanded={isBookingDropdownOpen}
                      aria-haspopup="true"
                      className="px-4 py-3 text-sm font-medium text-white flex items-center gap-2 bg-[var(--primary)] border rounded-lg hover:bg-[var(--primary-hover)] transition-colors"
                    >
                      <Calendar className="w-4 h-4" aria-hidden="true" />
                      Bookings
                      <ChevronDown className={`w-4 h-4 transition-transform ${isBookingDropdownOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                    </button>

                    {isBookingDropdownOpen && (
                      <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50" role="menu">
                        <div className="py-1">
                          <button onClick={handleViewBooking} role="menuitem" className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-[var(--primary)] hover:text-white transition-colors">
                            View Booking
                          </button>
                          <button onClick={handleDisputeResolution} role="menuitem" className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-[var(--primary)] hover:text-white transition-colors">
                            Dispute Resolution
                          </button>
                          <button onClick={handleAssignToDriver} role="menuitem" className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-[var(--primary)] hover:text-white transition-colors">
                            Assign to Driver
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <button className="px-4 py-3 text-sm font-medium text-[var(--primary)] bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2">
                    <AreaChart className="w-4 h-4" aria-hidden="true" />
                    Live Booking monitor
                  </button>
                </div>

                <button onClick={() => setIsCreateModalOpen(true)} className="px-4 py-3 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] transition-colors text-sm font-medium whitespace-nowrap">
                  Create New Booking
                </button>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="p-4 sm:p-5 border-b border-gray-200">
              <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3">
                <div className="relative w-full lg:max-w-xs">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" aria-hidden="true" />
                  <input
                    type="text"
                    placeholder="Search by ID, Customer, or Driver..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3"
                    aria-label="Search bookings"
                  />
                </div>
                <label htmlFor="booking-status-filter" className="sr-only">Filter by status</label>
                <select
                  id="booking-status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-auto lg:ml-auto"
                >
                  <option>All</option>
                  <option>Scheduled</option>
                  <option>Pending Confirmation</option>
                  <option>Accepted</option>
                  <option>In Progress</option>
                  <option>Completed</option>
                  <option>Cancelled</option>
                </select>
              </div>
            </div>

            {/* Loading */}
            {loading && (
              <div className="p-1" role="status" aria-label="Loading bookings">
                <Skeleton.TableLoader cols={8} rows={6} />
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="p-4 sm:p-6 bg-red-50 border border-red-200 text-red-700" role="alert">
                {error}
              </div>
            )}

            {/* Table + Mobile Cards */}
            {!loading && !error && (
              <>
                {/* Desktop Table */}
                <div className="overflow-x-auto hidden md:block">
                  <table className="w-full" aria-label="Bookings list">
                    <thead className="bg-[var(--primary)] text-white">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Booking ID</th>
                        <th scope="col" className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Customer Name</th>
                        <th scope="col" className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Customer Email</th>
                        <th scope="col" className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Customer Phone</th>
                        <th scope="col" className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Driver Name</th>
                        <th scope="col" className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Passengers</th>
                        <th scope="col" className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Vehicle</th>
                        <th scope="col" className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Luggage</th>
                        <th scope="col" className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Payment</th>
                        <th scope="col" className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Pickup</th>
                        <th scope="col" className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Drop-off</th>
                        <th scope="col" className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Date & Time</th>
                        <th scope="col" className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Status</th>
                        <th scope="col" className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Fare</th>
                        <th scope="col" className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentBookings.length > 0 ? (
                        currentBookings.map((booking) => (
                          <tr key={booking.originalId || booking.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="px-4 py-4 text-sm text-gray-900 whitespace-nowrap">{booking.id}</td>
                            <td className="px-4 py-4 text-sm text-gray-900 whitespace-nowrap">{booking.customerName}</td>
                            <td className="px-4 py-4 text-sm text-gray-900 whitespace-nowrap">{booking.customerEmail}</td>
                            <td className="px-4 py-4 text-sm text-gray-900 whitespace-nowrap">{booking.customerPhone}</td>
                            <td className="px-4 py-4 text-sm text-gray-900 whitespace-nowrap">{booking.driverName}</td>
                            <td className="px-4 py-4 text-sm text-gray-900 whitespace-nowrap">{booking.Passengers || 'N/A'}</td>
                            <td className="px-4 py-4 text-sm text-gray-900 whitespace-nowrap">{booking.vehicleType}</td>
                            <td className="px-4 py-4 text-sm text-gray-900 whitespace-nowrap">{booking.Luggage}</td>
                            <td className="px-4 py-4 text-sm text-gray-900 whitespace-nowrap">{booking.PaymentMethod}</td>
                            <td className="px-4 py-4 text-sm text-gray-900 max-w-xs truncate">{booking.pickupLocation}</td>
                            <td className="px-4 py-4 text-sm text-gray-900 max-w-xs truncate">{booking.dropoffLocation}</td>
                            <td className="px-4 py-4 text-sm text-gray-900 whitespace-nowrap">{booking.dateTime}</td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                                {booking.status}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-900 font-medium whitespace-nowrap">{booking.fare}</td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex gap-2">
                                <button className="p-1.5 text-[var(--primary)] hover:bg-teal-50 rounded" aria-label={`View booking ${booking.id}`}>
                                  <Eye className="w-4 h-4" aria-hidden="true" />
                                </button>
                                <button className="p-1.5 text-[var(--primary)] hover:bg-teal-50 rounded" onClick={() => handleEditClick(booking)} aria-label={`Edit booking ${booking.id}`}>
                                  <Edit className="w-4 h-4" aria-hidden="true" />
                                </button>
                                <button className="p-1.5 text-[var(--primary)] hover:bg-teal-50 rounded" aria-label={`Delete booking ${booking.id}`}>
                                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="15" className="px-4 py-8 text-center">
                            {searchTerm || statusFilter !== 'All' ? (
                              <div className="text-gray-500">
                                <p className="text-lg font-medium">No records found</p>
                                <p className="text-sm mt-2">No bookings match your search criteria.</p>
                              </div>
                            ) : (
                              <p className="text-gray-500">No bookings found</p>
                            )}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden">
                  {currentBookings.length > 0 ? (
                    currentBookings.map((booking) => (
                      <div key={booking.originalId || booking.id} className="border-b border-gray-200 p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-900">{booking.id}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                            {booking.status}
                          </span>
                        </div>
                        <div className="space-y-1 text-sm">
                          <p><span className="text-gray-500">Customer:</span> <span className="text-gray-900">{booking.customerName}</span></p>
                          <p><span className="text-gray-500">Driver:</span> <span className="text-gray-900">{booking.driverName}</span></p>
                          <p><span className="text-gray-500">Pickup:</span> <span className="text-gray-900">{booking.pickupLocation}</span></p>
                          <p><span className="text-gray-500">Drop-off:</span> <span className="text-gray-900">{booking.dropoffLocation}</span></p>
                          <p><span className="text-gray-500">Date:</span> <span className="text-gray-900">{booking.dateTime}</span></p>
                          <p><span className="text-gray-500">Fare:</span> <span className="font-medium text-gray-900">{booking.fare}</span></p>
                        </div>
                        <div className="flex gap-2 mt-3 pt-2 border-t border-gray-100">
                          <button className="p-1.5 text-[var(--primary)] hover:bg-teal-50 rounded" aria-label={`View booking ${booking.id}`}>
                            <Eye className="w-4 h-4" aria-hidden="true" />
                          </button>
                          <button className="p-1.5 text-[var(--primary)] hover:bg-teal-50 rounded" onClick={() => handleEditClick(booking)} aria-label={`Edit booking ${booking.id}`}>
                            <Edit className="w-4 h-4" aria-hidden="true" />
                          </button>
                          <button className="p-1.5 text-[var(--primary)] hover:bg-teal-50 rounded" aria-label={`Delete booking ${booking.id}`}>
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-gray-500">
                      {searchTerm || statusFilter !== 'All' ? 'No bookings match your search criteria.' : 'No bookings found'}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Pagination */}
            {!loading && !error && totalItems > 0 && (
              <nav className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-gray-200 gap-4" aria-label="Bookings pagination">
                <div className="text-sm text-gray-600">
                  Showing {indexOfFirstItem} to {indexOfLastItem} of {totalItems} bookings
                </div>
                <div className="flex gap-2 items-center justify-center">
                  <button
                    onClick={handlePrevious}
                    disabled={currentPage === 1}
                    className={`px-4 py-2 border rounded-lg text-sm transition-colors ${currentPage === 1 ? 'border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                  >
                    Previous
                  </button>

                  {getPageNumbers().map((page, index) => (
                    page === '...' ? (
                      <span key={`ellipsis-${index}`} className="px-2 text-gray-400" aria-hidden="true">...</span>
                    ) : (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        aria-current={currentPage === page ? 'page' : undefined}
                        className={`px-4 py-2 rounded-lg text-sm transition-colors ${currentPage === page ? 'bg-[var(--primary)] text-white' : 'border border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                      >
                        {page}
                      </button>
                    )
                  ))}

                  <button
                    onClick={handleNext}
                    disabled={currentPage === totalPages}
                    className={`px-4 py-2 border rounded-lg text-sm transition-colors ${currentPage === totalPages ? 'border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                  >
                    Next
                  </button>
                </div>
              </nav>
            )}
          </div>
        </main>
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && currentBooking && (
        <div className="fixed inset-0 bg-black/40 modal-backdrop z-50 flex items-center justify-center p-4">
          <div className="bg-white shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in-scale" role="dialog" aria-modal="true" aria-labelledby="edit-booking-title">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 id="edit-booking-title" className="text-lg font-semibold text-gray-900">Edit Booking</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors" aria-label="Close edit modal">
                <span className="text-2xl" aria-hidden="true">&times;</span>
              </button>
            </div>

            <form onSubmit={handleUpdateBooking} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                <div>
                  <label htmlFor="edit-passenger-name">Passenger Name</label>
                  <input id="edit-passenger-name" type="text" value={currentBooking.passenger_name} onChange={(e) => setCurrentBooking({ ...currentBooking, passenger_name: e.target.value })} />
                </div>
                <div>
                  <label htmlFor="edit-contact">Contact Number</label>
                  <input id="edit-contact" type="text" value={currentBooking.contact_number} onChange={(e) => setCurrentBooking({ ...currentBooking, contact_number: e.target.value })} />
                </div>
                <div>
                  <label htmlFor="edit-email">Email</label>
                  <input id="edit-email" type="email" value={currentBooking.email} onChange={(e) => setCurrentBooking({ ...currentBooking, email: e.target.value })} />
                </div>
                <div>
                  <label htmlFor="edit-status">Status</label>
                  <select id="edit-status" value={currentBooking.status} onChange={(e) => setCurrentBooking({ ...currentBooking, status: e.target.value })}>
                    <option value="pending">Pending Confirmation</option>
                    <option value="schedule">Scheduled</option>
                    <option value="accepted">Accepted</option>
                    <option value="in progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="edit-pickup">Pickup Address</label>
                  <input id="edit-pickup" type="text" value={currentBooking.from_address} onChange={(e) => setCurrentBooking({ ...currentBooking, from_address: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="edit-dropoff">Dropoff Address</label>
                  <input id="edit-dropoff" type="text" value={currentBooking.to_address} onChange={(e) => setCurrentBooking({ ...currentBooking, to_address: e.target.value })} />
                </div>
                <div>
                  <label htmlFor="edit-datetime">Date & Time</label>
                  <input id="edit-datetime" type="datetime-local" value={currentBooking.date_time ? (() => { const d = new Date(currentBooking.date_time); return !isNaN(d.getTime()) ? d.toISOString().slice(0, 16) : ''; })() : ''} onChange={(e) => setCurrentBooking({ ...currentBooking, date_time: e.target.value })} />
                </div>
                <div>
                  <label htmlFor="edit-passengers">Total Passengers</label>
                  <input id="edit-passengers" type="number" min="1" value={currentBooking.no_of_passengers} onChange={(e) => setCurrentBooking({ ...currentBooking, no_of_passengers: e.target.value })} />
                </div>
                <div>
                  <label htmlFor="edit-vehicle">Vehicle Name</label>
                  <input id="edit-vehicle" type="text" value={currentBooking.car_name} onChange={(e) => setCurrentBooking({ ...currentBooking, car_name: e.target.value })} />
                </div>
                <div>
                  <label htmlFor="edit-luggage">Luggage</label>
                  <input id="edit-luggage" type="number" min="0" value={currentBooking.luggage} onChange={(e) => setCurrentBooking({ ...currentBooking, luggage: e.target.value })} />
                </div>
                <div>
                  <label htmlFor="edit-payment">Payment Method</label>
                  <select id="edit-payment" value={currentBooking.payment_method} onChange={(e) => setCurrentBooking({ ...currentBooking, payment_method: e.target.value })}>
                    <option value="">Select Payment Method</option>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="online">Online</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="edit-price">Price</label>
                  <input id="edit-price" type="number" min="0" step="0.01" value={currentBooking.price} onChange={(e) => setCurrentBooking({ ...currentBooking, price: e.target.value })} />
                </div>
              </div>

              <div className="form-footer">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-5 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors" disabled={updateLoading}>
                  Cancel
                </button>
                <button type="submit" disabled={updateLoading} aria-busy={updateLoading} className="px-5 py-2 text-sm font-medium bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors flex items-center gap-2 disabled:opacity-50">
                  {updateLoading && <Loader className="w-4 h-4 animate-spin" aria-hidden="true" />}
                  {updateLoading ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Booking Modal */}
      {isCreateModalOpen && (
        <CreateBookingModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreated={() => { setCurrentPage(1); fetchBookings(); }}
          showToast={showToast}
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
