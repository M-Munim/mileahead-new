'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Edit, Trash2, Download, Printer } from 'lucide-react';
import Skeleton from '../components/Skeleton';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import CustomerDetailsModal from '../components/CustomerDetailsModal';
import DriverDetailsModal from '../components/DriverDetailsModal';
import AddDriverModal from '../components/AddDriverModal';
import Toast from '../components/Toast';
import ConfirmationDialog from '../components/ConfirmationDialog';
import { userService, driverService } from '../../utils/axiosInstance';
import { extractArray } from '../../utils/extractArray';
import { useDebounce } from '../hooks/useDebounce';
import { useExport } from '../hooks/useExport';

function transformUser(user) {
  return {
    id: user.id || user.user_id || 'N/A',
    name: `${user.firstname || ''} ${user.lastname || ''}`.trim() || user.name || user.username || 'N/A',
    email: user.email || 'N/A',
    phone: user.phone || 'N/A',
    totalBookings: user.total_bookings ? `${user.total_bookings} Bookings` : '0 Bookings',
    lastBookingDate: user.last_booking_date || 'N/A',
    accountStatus: user.status === 'active' || user.accountStatus === 'Active' ? 'Active' : 'Suspended',
  };
}

const EXPORT_COLUMNS = ['id', 'name', 'email', 'phone', 'totalBookings', 'lastBookingDate', 'accountStatus'];

export default function CustomersPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('customers');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [isAddDriverModalOpen, setIsAddDriverModalOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmationDialog, setConfirmationDialog] = useState({
    isOpen: false, title: '', message: '', onConfirm: null
  });

  const [customersData, setCustomersData] = useState([]);
  const [driversData, setDriversData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 100;

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const toggleSidebar = useCallback(() => setSidebarOpen(prev => !prev), []);

  const exportHeaders = {
    id: activeTab === 'customers' ? 'Customer ID' : 'Driver ID',
    name: 'Name', email: 'Email', phone: 'Phone',
    totalBookings: 'Bookings', lastBookingDate: 'Last Booking', accountStatus: 'Status',
  };

  const { handleExportCSV, handlePrintReport } = useExport({
    columns: EXPORT_COLUMNS,
    headerMap: exportHeaders,
    filename: `${activeTab}_report`,
    title: activeTab === 'customers' ? 'Customers Report' : 'Drivers Report',
  });

  const buildRequestBody = useCallback(() => ({
    status: statusFilter,
    field: "firstname",
    search: debouncedSearchTerm,
    sorting: { field: "id", order: "desc" },
    page: currentPage,
    limit: itemsPerPage
  }), [statusFilter, debouncedSearchTerm, currentPage]);

  // Fetch customers
  useEffect(() => {
    if (activeTab !== 'customers') return;
    const controller = new AbortController();

    const fetchCustomers = async () => {
      try {
        setLoading(true);
        const response = await userService.getAllUsers(buildRequestBody());
        if (controller.signal.aborted) return;
        const users = extractArray(response);
        setCustomersData(users.map(transformUser));
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Error fetching customers:', error);
          showToast('Failed to fetch customers data', 'error');
          setCustomersData([]);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchCustomers();
    return () => controller.abort();
  }, [activeTab, buildRequestBody]);

  // Fetch drivers
  useEffect(() => {
    if (activeTab !== 'drivers') return;
    const controller = new AbortController();

    const fetchDrivers = async () => {
      try {
        setLoading(true);
        const response = await driverService.getAllDrivers(buildRequestBody());
        if (controller.signal.aborted) return;
        const drivers = extractArray(response);
        setDriversData(drivers.map(transformUser));
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Error fetching drivers:', error);
          showToast('Failed to fetch drivers data', 'error');
          setDriversData([]);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchDrivers();
    return () => controller.abort();
  }, [activeTab, buildRequestBody]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, statusFilter, activeTab]);

  const showToast = (message, type = 'info') => setToast({ message, type });

  const handleViewCustomer = (customer) => { setSelectedCustomer(customer); setIsModalOpen(true); };
  const handleViewDriver = (driver) => { setSelectedDriver(driver); setIsDriverModalOpen(true); };

  const handleSaveDriver = async (driverData) => {
    try {
      if (!driverData.firstName || !driverData.lastName || !driverData.userName ||
        !driverData.email || !driverData.password || !driverData.phoneNumber) {
        showToast('Please fill in all required fields', 'error');
        return;
      }

      await driverService.register({
        username: driverData.userName,
        email: driverData.email,
        password: driverData.password,
        role_name: 'chauffeurs',
        firstname: driverData.firstName,
        lastname: driverData.lastName,
        phone: driverData.phoneNumber,
      });

      showToast('Driver added successfully!', 'success');
      setIsAddDriverModalOpen(false);

      // Refresh drivers list
      const response = await driverService.getAllDrivers(buildRequestBody());
      setDriversData(extractArray(response).map(transformUser));
    } catch (error) {
      showToast(error?.message || 'Failed to add driver. Please try again.', 'error');
    }
  };

  const handleDeleteItem = async (item) => {
    setConfirmationDialog({
      isOpen: true,
      title: 'Delete Item',
      message: `Are you sure you want to delete ${item.name}? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          if (activeTab === 'customers') {
            await userService.deleteUserProfile(item.id);
            setCustomersData(prev => prev.filter(c => c.id !== item.id));
          } else {
            await driverService.deleteProfile(item.id);
            setDriversData(prev => prev.filter(d => d.id !== item.id));
          }
          showToast(`${activeTab === 'customers' ? 'Customer' : 'Driver'} deleted successfully!`, 'success');
        } catch {
          showToast('Failed to delete item. Please try again.', 'error');
        }
        setConfirmationDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleUpdateCustomer = async (customerId, updatedData) => {
    try {
      await userService.updateUserProfile(customerId, updatedData);
      showToast('Customer updated successfully!', 'success');
      const response = await userService.getAllUsers(buildRequestBody());
      setCustomersData(extractArray(response).map(transformUser));
      setIsModalOpen(false);
    } catch {
      showToast('Failed to update customer. Please try again.', 'error');
    }
  };

  const handleUpdateDriver = async (driverId, updatedData) => {
    try {
      await driverService.updateProfile(driverId, updatedData);
      showToast('Driver updated successfully!', 'success');
      const response = await driverService.getAllDrivers(buildRequestBody());
      setDriversData(extractArray(response).map(transformUser));
      setIsDriverModalOpen(false);
    } catch {
      showToast('Failed to update driver. Please try again.', 'error');
    }
  };

  const currentData = activeTab === 'customers' ? customersData : driversData;

  return (
    <div className="flex min-h-screen bg-gray-50 overflow-x-hidden">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={toggleSidebar} aria-hidden="true" />
      )}

      <div className="flex-1 flex flex-col min-h-screen lg:ml-[240px] w-full lg:w-auto overflow-x-hidden">
        <div className="px-4 md:px-6 pt-4 md:pt-6">
          <Header title="Customers" toggleSidebar={toggleSidebar} />
        </div>

        <main className="flex-1 px-4 md:px-6 pb-6 overflow-x-hidden">
          <div className="bg-white shadow-sm border border-gray-100 overflow-hidden animate-fade-in-up">
            {/* Tabs */}
            <div className="border-b border-gray-200 px-4 sm:px-6">
              <div className="flex gap-2" role="tablist" aria-label="Customer and driver tabs">
                <button
                  role="tab"
                  aria-selected={activeTab === 'customers'}
                  aria-controls="customers-panel"
                  onClick={() => setActiveTab('customers')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'customers'
                    ? 'border-[var(--primary)] text-[var(--primary)]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Customers
                </button>
                <button
                  role="tab"
                  aria-selected={activeTab === 'drivers'}
                  aria-controls="drivers-panel"
                  onClick={() => setActiveTab('drivers')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'drivers'
                    ? 'border-[var(--primary)] text-[var(--primary)]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Drivers
                </button>
              </div>
            </div>

            {/* Search and Filter */}
            <div className="p-4 sm:p-5 border-b border-gray-200" role="tabpanel" id={`${activeTab}-panel`}>
              <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3">
                <div className="relative w-full lg:max-w-xs">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                  <input
                    type="text"
                    placeholder="Search by name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3"
                    aria-label={`Search ${activeTab}`}
                  />
                </div>

                <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto lg:ml-auto">
                  <label htmlFor="status-filter" className="sr-only">Filter by status</label>
                  <select
                    id="status-filter"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-auto"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>

                  <div className="hidden sm:block w-px h-7 bg-gray-200" aria-hidden="true"></div>

                  {activeTab === 'customers' ? (
                    <>
                      <button className="px-3.5 py-2 bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors text-xs font-medium">
                        + Broadcast
                      </button>
                      <button
                        onClick={() => handleExportCSV(customersData)}
                        disabled={customersData.length === 0}
                        className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 hover:bg-gray-50 transition-colors text-xs font-medium text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label="Export customers to CSV"
                      >
                        <Download className="w-3.5 h-3.5" aria-hidden="true" />
                        CSV
                      </button>
                      <button
                        onClick={() => handlePrintReport(customersData)}
                        disabled={customersData.length === 0}
                        className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 hover:bg-gray-50 transition-colors text-xs font-medium text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label="Print customers report"
                      >
                        <Printer className="w-3.5 h-3.5" aria-hidden="true" />
                        Print
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setIsAddDriverModalOpen(true)}
                        className="px-3.5 py-2 bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors text-xs font-medium"
                      >
                        + Add New
                      </button>
                      <button className="px-3.5 py-2 bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors text-xs font-medium">
                        Request
                      </button>
                      <button
                        onClick={() => handleExportCSV(driversData)}
                        disabled={driversData.length === 0}
                        className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 hover:bg-gray-50 transition-colors text-xs font-medium text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label="Export drivers to CSV"
                      >
                        <Download className="w-3.5 h-3.5" aria-hidden="true" />
                        CSV
                      </button>
                      <button
                        onClick={() => handlePrintReport(driversData)}
                        disabled={driversData.length === 0}
                        className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 hover:bg-gray-50 transition-colors text-xs font-medium text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label="Print drivers report"
                      >
                        <Printer className="w-3.5 h-3.5" aria-hidden="true" />
                        Print
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Loading */}
            {loading && (
              <div className="p-1" role="status" aria-label="Loading data">
                <Skeleton.TableLoader cols={8} rows={6} />
              </div>
            )}

            {/* No Data */}
            {!loading && currentData.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                No {activeTab} found
              </div>
            )}

            {/* Table + Mobile Cards */}
            {!loading && currentData.length > 0 && (
              <div className="overflow-x-auto">
                {/* Desktop Table */}
                <table className="w-full hidden md:table" aria-label={`${activeTab} list`}>
                  <thead className="bg-[var(--primary)] text-white">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-sm font-semibold">
                        {activeTab === 'customers' ? 'Customer ID' : 'Driver ID'}
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-sm font-semibold">Name</th>
                      <th scope="col" className="px-6 py-3 text-left text-sm font-semibold">Email</th>
                      <th scope="col" className="px-6 py-3 text-left text-sm font-semibold">Phone</th>
                      <th scope="col" className="px-6 py-3 text-left text-sm font-semibold">Bookings</th>
                      <th scope="col" className="px-6 py-3 text-left text-sm font-semibold">Last Booking</th>
                      <th scope="col" className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                      <th scope="col" className="px-6 py-3 text-left text-sm font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentData.map((item) => (
                      <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">{item.id}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{item.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{item.email}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{item.phone}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{item.totalBookings}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{item.lastBookingDate}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${item.accountStatus === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {item.accountStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => activeTab === 'customers' ? handleViewCustomer(item) : handleViewDriver(item)}
                              className="p-1.5 text-[var(--primary)] hover:bg-teal-50 rounded"
                              aria-label={`Edit ${item.name}`}
                            >
                              <Edit className="w-4 h-4" aria-hidden="true" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item)}
                              className="p-1.5 text-[var(--primary)] hover:bg-teal-50 rounded"
                              aria-label={`Delete ${item.name}`}
                            >
                              <Trash2 className="w-4 h-4" aria-hidden="true" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Mobile Cards */}
                <div className="md:hidden">
                  {currentData.map((item) => (
                    <div key={item.id} className="border-b border-gray-200 p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-gray-900">{item.name}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.accountStatus === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {item.accountStatus}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">ID: {item.id}</p>
                          <div className="mt-2 space-y-1 text-sm">
                            <p><span className="text-gray-500">Email:</span> <span className="text-gray-900">{item.email}</span></p>
                            <p><span className="text-gray-500">Phone:</span> <span className="text-gray-900">{item.phone}</span></p>
                            <p><span className="text-gray-500">Bookings:</span> <span className="text-gray-900">{item.totalBookings}</span></p>
                          </div>
                        </div>
                        <div className="flex gap-1 ml-2">
                          <button
                            onClick={() => activeTab === 'customers' ? handleViewCustomer(item) : handleViewDriver(item)}
                            className="p-1.5 text-[var(--primary)] hover:bg-teal-50 rounded"
                            aria-label={`Edit ${item.name}`}
                          >
                            <Edit className="w-4 h-4" aria-hidden="true" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item)}
                            className="p-1.5 text-[var(--primary)] hover:bg-teal-50 rounded"
                            aria-label={`Delete ${item.name}`}
                          >
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pagination */}
            {!loading && currentData.length > 0 && (
              <nav className="px-6 py-4 flex items-center justify-between border-t border-gray-200" aria-label={`${activeTab} pagination`}>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-500">
                  Page {currentPage}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  disabled={currentData.length < itemsPerPage}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </nav>
            )}
          </div>

          {isModalOpen && (
            <CustomerDetailsModal
              customer={selectedCustomer}
              onClose={() => setIsModalOpen(false)}
              onUpdate={handleUpdateCustomer}
            />
          )}

          {isDriverModalOpen && (
            <DriverDetailsModal
              driver={selectedDriver}
              onClose={() => setIsDriverModalOpen(false)}
              onUpdate={handleUpdateDriver}
            />
          )}

          {isAddDriverModalOpen && (
            <AddDriverModal
              onClose={() => setIsAddDriverModalOpen(false)}
              onSave={handleSaveDriver}
            />
          )}

          {toast && (
            <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
          )}

          <ConfirmationDialog
            isOpen={confirmationDialog.isOpen}
            onClose={() => setConfirmationDialog(prev => ({ ...prev, isOpen: false }))}
            onConfirm={confirmationDialog.onConfirm}
            title={confirmationDialog.title}
            message={confirmationDialog.message}
          />
        </main>
      </div>
    </div>
  );
}
