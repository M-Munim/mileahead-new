'use client';

import { useState, useEffect, useMemo } from 'react';
import { Car, MapPin, Clock, User, DollarSign, CheckCircle, XCircle, AlertCircle, WifiOff, Download, Printer } from 'lucide-react';
import { bookingService, driverService } from '../../utils/axiosInstance';
import { extractArray } from '../../utils/extractArray';
import { exportToCSV, printReport, buildTableHtml } from '../../utils/exportData';
import Toast from './Toast';

export default function RidesManagement() {
  const [loading, setLoading] = useState(true);
  const [rides, setRides] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [selectedRide, setSelectedRide] = useState(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [toast, setToast] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const [metrics, setMetrics] = useState({
    totalRides: 0,
    pending: 0,
    ongoing: 0,
    completed: 0,
    cancelled: 0,
  });

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller);
    return () => controller.abort();
  }, [statusFilter]);

  const statusFilterMap = useMemo(() => ({
    all: 'all',
    pending: 'pending',
    accepted: 'accepted',
    'in progress': 'in progress',
    ongoing: 'ongoing',
    completed: 'completed',
    cancelled: 'cancelled',
  }), []);

  const normalizeStatus = (status) => {
    if (status === null || status === undefined) return 'pending';
    if (typeof status === 'number') {
      if (status === 0) return 'pending';
      if (status === 1) return 'accepted';
    }
    return String(status).toLowerCase();
  };

  const fetchData = async (controller) => {
    try {
      setLoading(true);

      const resolvedStatus = statusFilterMap[statusFilter] || statusFilter;

      const [ridesResult, driversResult] = await Promise.allSettled([
        bookingService.getAllBookings({
          status: resolvedStatus,
          field: "",
          search: "",
          sorting: {
            field: "id",
            order: "desc"
          },
          page: 1,
          limit: 100
        }),
        driverService.getAllDrivers({
          status: "all",
          field: "",
          search: "",
          sorting: {
            field: "id",
            order: "desc"
          },
          page: 1,
          limit: 1000
        })
      ]);

      if (controller?.signal?.aborted) return;

      const ridesResponse = ridesResult.status === 'fulfilled' ? ridesResult.value : null;
      const driversResponse = driversResult.status === 'fulfilled' ? driversResult.value : null;

      if (ridesResult.status === 'rejected') {
        showToast(ridesResult.reason?.message || 'Failed to fetch rides', 'error');
      }
      if (driversResult.status === 'rejected') {
        showToast(driversResult.reason?.message || 'Failed to fetch drivers', 'error');
      }

      const ridesData = extractArray(ridesResponse);
      const driversData = extractArray(driversResponse);

      // Calculate metrics
      const pending = ridesData.filter(r => normalizeStatus(r.status) === 'pending').length;
      const ongoing = ridesData.filter(r => ['in progress', 'accepted', 'ongoing', 'in-progress', 'in_progress'].includes(normalizeStatus(r.status))).length;
      const completed = ridesData.filter(r => normalizeStatus(r.status) === 'completed').length;
      const cancelled = ridesData.filter(r => normalizeStatus(r.status) === 'cancelled').length;

      if (controller?.signal?.aborted) return;

      setMetrics({
        totalRides: ridesData.length,
        pending,
        ongoing,
        completed,
        cancelled,
      });

      // Transform rides data
      const transformedRides = ridesData.map(ride => ({
        id: ride.id,
        bookingNumber: ride.booking_number || `BK${ride.id}`,
        customerName: ride.passenger_name || 'N/A',
        customerPhone: ride.contact_number || 'N/A',
        pickupLocation: ride.from_address || 'N/A',
        dropoffLocation: ride.to_address || 'N/A',
        dateTime: ride.date_time || 'N/A',
        status: normalizeStatus(ride.status) || 'pending',
        fare: parseFloat(ride.price || ride.amount || ride.total_price || 0),
        driverId: ride.driver_id,
        driverName: ride.driver_name || (ride.driver_id ? `Driver ${ride.driver_id}` : 'Unassigned'),
        carName: ride.car_name || 'N/A',
      }));

      setRides(transformedRides);

      // Get available drivers (online and available)
      const hasAvailabilityFlags = driversData.some(d =>
        d.is_online !== undefined || d.is_available !== undefined || d.online !== undefined || d.available !== undefined
      );

      const availableDrivers = driversData.filter(d => {
        if (hasAvailabilityFlags) {
          const isOnline = d.is_online === 1 || d.is_online === true || d.online === 1 || d.online === true;
          const isAvailable = d.is_available === 1 || d.is_available === true || d.available === 1 || d.available === true;
          const driverStatus = String(d.driver_status || '').toLowerCase();
          // Filter: must be online AND available, and driver_status should be 'online' if present
          return isOnline && isAvailable && (driverStatus === 'online' || driverStatus === '');
        }
        const status = String(d.status || d.accountStatus || d.driver_status || '').toLowerCase();
        return status === 'active' || status === 'online' || d.status === 1 || d.is_active === 1 || d.is_active === true || d.isActive === 1;
      }).map(d => ({
        id: d.id,
        name: `${d.firstname || ''} ${d.lastname || ''}`.trim() || d.username || 'Unknown',
        phone: d.phone || 'N/A',
        earnings: parseFloat(d.earning || d.earnings || 0),
        isOnline: hasAvailabilityFlags
          ? (d.is_online === 1 || d.is_online === true || d.online === 1 || d.online === true)
          : true,
        isAvailable: hasAvailabilityFlags
          ? (d.is_available === 1 || d.is_available === true || d.available === 1 || d.available === true)
          : true,
      }));

      if (controller?.signal?.aborted) return;
      setDrivers(availableDrivers);

    } catch (error) {
      if (controller?.signal?.aborted) return;
      console.error('Error fetching rides management data:', error);
      showToast(error?.message || 'Failed to fetch data', 'error');
    } finally {
      if (!controller?.signal?.aborted) {
        setLoading(false);
      }
    }
  };

  const handleAssignDriver = (ride) => {
    setSelectedRide(ride);
    setSelectedDriver(null);
    setIsAssignModalOpen(true);
  };

  const confirmAssignment = async () => {
    if (!selectedDriver || !selectedRide) {
      showToast('Please select a driver', 'error');
      return;
    }
    if (!selectedDriver.isAvailable && !selectedDriver.isOnline) {
      showToast('Selected driver is not available', 'error');
      return;
    }
    if (selectedRide.driverId) {
      showToast('Ride already has an assigned driver', 'error');
      return;
    }

    try {
      // Update booking with assigned driver
      await bookingService.updateBooking(selectedRide.id, {
        driver_id: selectedDriver.id,
        status: 'accepted'
      });

      showToast('Driver assigned successfully!', 'success');
      setIsAssignModalOpen(false);
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error assigning driver:', error);
      showToast('Failed to assign driver', 'error');
    }
  };

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'accepted':
        return 'bg-blue-100 text-blue-700';
      case 'in progress':
      case 'in_progress':
      case 'in-progress':
      case 'ongoing':
        return 'bg-purple-100 text-purple-700';
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return CheckCircle;
      case 'cancelled':
        return XCircle;
      case 'pending':
        return AlertCircle;
      default:
        return Clock;
    }
  };

  const rideExportColumns = ['bookingNumber', 'customerName', 'customerPhone', 'pickupLocation', 'dropoffLocation', 'dateTime', 'status', 'driverName', 'fare'];
  const rideExportHeaders = {
    bookingNumber: 'Booking #', customerName: 'Customer', customerPhone: 'Phone',
    pickupLocation: 'Pickup', dropoffLocation: 'Dropoff', dateTime: 'Date/Time',
    status: 'Status', driverName: 'Driver', fare: 'Fare (QAR)',
  };

  const handleExportCSV = () => {
    const data = rides.map(r => ({ ...r, status: formatStatusLabel(r.status) }));
    exportToCSV(data, rideExportColumns, rideExportHeaders, 'rides_report');
  };

  const handlePrintReport = () => {
    const data = rides.map(r => ({ ...r, status: formatStatusLabel(r.status) }));
    const html = buildTableHtml(data, rideExportColumns, rideExportHeaders);
    printReport('Rides Report — Miles Ahead', html);
  };

  const formatStatusLabel = (status) => {
    if (!status) return 'Pending';
    const normalized = String(status).replace(/[_-]/g, ' ').toLowerCase();
    return normalized.replace(/\b\w/g, (c) => c.toUpperCase());
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6" role="status">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Rides Management</h2>
            <p className="text-sm text-gray-500 mt-1">Assign drivers and manage ride requests</p>
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-sm"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="in progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button
              onClick={() => fetchData()}
              className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] transition-colors text-sm font-medium"
            >
              Refresh
            </button>
            <button
              onClick={handleExportCSV}
              disabled={rides.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Export as CSV"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              CSV
            </button>
            <button
              onClick={handlePrintReport}
              disabled={rides.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Print report"
            >
              <Printer className="w-4 h-4" aria-hidden="true" />
              Print
            </button>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-gray-900">{metrics.totalRides}</div>
            <div className="text-xs text-gray-600">Total</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-yellow-700">{metrics.pending}</div>
            <div className="text-xs text-gray-600">Pending</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-purple-700">{metrics.ongoing}</div>
            <div className="text-xs text-gray-600">Ongoing</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-700">{metrics.completed}</div>
            <div className="text-xs text-gray-600">Completed</div>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-red-700">{metrics.cancelled}</div>
            <div className="text-xs text-gray-600">Cancelled</div>
          </div>
        </div>

        {/* Rides List */}
        <div className="space-y-3">
          {rides.length > 0 ? (
            rides.map((ride) => {
              const StatusIcon = getStatusIcon(ride.status);
              return (
                <div key={ride.id} className="border border-gray-200 rounded-lg p-4 hover:border-[var(--primary)] transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Left Section: Ride Info */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-gray-900">{ride.bookingNumber}</div>
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(ride.status)}`}>
                          <StatusIcon className="w-3 h-3" aria-hidden="true" />
                          {formatStatusLabel(ride.status)}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <User className="w-4 h-4" aria-hidden="true" />
                          <span>{ride.customerName}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Clock className="w-4 h-4" aria-hidden="true" />
                          <span>{ride.dateTime}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-1 text-xs">
                        <div className="flex items-start gap-2 text-gray-600">
                          <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-green-500" aria-hidden="true" />
                          <span className="line-clamp-1">{ride.pickupLocation}</span>
                        </div>
                        <div className="flex items-start gap-2 text-gray-600">
                          <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-red-500" aria-hidden="true" />
                          <span className="line-clamp-1">{ride.dropoffLocation}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Section: Driver & Actions */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 lg:w-80">
                      <div className="flex-1">
                        <div className="text-xs text-gray-500 mb-1">Assigned Driver</div>
                        <div className="font-medium text-gray-900">
                          {ride.driverName}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <DollarSign className="w-4 h-4 text-green-500" aria-hidden="true" />
                          <span className="text-sm font-semibold text-gray-900">{ride.fare} QAR</span>
                        </div>
                      </div>

                      {ride.status === 'pending' && (
                        <button
                          onClick={() => handleAssignDriver(ride)}
                          className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] transition-colors text-sm font-medium whitespace-nowrap"
                        >
                          Assign Driver
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Car className="w-12 h-12 mx-auto mb-3 text-gray-300" aria-hidden="true" />
              <p>No rides found</p>
            </div>
          )}
        </div>
      </div>

      {/* Assign Driver Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 bg-black/40 modal-backdrop flex items-center justify-center z-50 p-4">
          <div
            className="bg-white max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-fade-in-scale"
            role="dialog"
            aria-modal="true"
            aria-labelledby="assign-driver-modal-title"
            aria-label="Assign driver"
          >
            <div className="p-6 border-b border-gray-200">
              <h3 id="assign-driver-modal-title" className="text-xl font-semibold text-gray-900">Assign Driver</h3>
              <p className="text-sm text-gray-500 mt-1">
                Booking: {selectedRide?.bookingNumber} • Customer: {selectedRide?.customerName}
              </p>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  Available Drivers ({drivers.length})
                </div>
                {drivers.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {drivers.map((driver) => (
                      <button
                        key={driver.id}
                        onClick={() => setSelectedDriver(driver)}
                        className={`w-full text-left p-4 rounded-lg border-2 transition-all ${selectedDriver?.id === driver.id
                            ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                            : 'border-gray-200 hover:border-[var(--primary)]/50'
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900">{driver.name}</div>
                            <div className="text-sm text-gray-500">{driver.phone}</div>
                            <div className="mt-1 text-xs text-gray-500 flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-full ${driver.isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                }`}>
                                {driver.isOnline ? 'Online' : 'Offline'}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full ${driver.isAvailable ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                                }`}>
                                {driver.isAvailable ? 'Available' : 'Busy'}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-[var(--primary)]">
                              {driver.earnings.toFixed(2)} QAR
                            </div>
                            <div className="text-xs text-gray-500">Total earnings</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <WifiOff className="w-8 h-8 mx-auto mb-2 text-gray-300" aria-hidden="true" />
                    No available drivers at the moment
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                aria-label="Close"
              >
                Cancel
              </button>
              <button
                onClick={confirmAssignment}
                disabled={!selectedDriver}
                className="px-6 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Assign Driver
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}
