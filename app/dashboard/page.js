'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import MetricCard from '../components/MetricCard';
import RevenueChart from '../components/RevenueChart';
import GeographicHeatMap from '../components/GeographicHeatMap';
import ServiceStatus from '../components/ServiceStatus';
import QuickStats from '../components/QuickStats';
import ActiveUsersReport from '../components/ActiveUsersReport';
import ActiveDriversReport from '../components/ActiveDriversReport';
import RidesManagement from '../components/RidesManagement';
import FinanceManagement from '../components/FinanceManagement';
import SupportManagement from '../components/SupportManagement';
import { Calendar, Users, Globe, Clock, BarChart3, Car, DollarSign, Headphones } from 'lucide-react';
import ProtectedRoute from '../components/ProtectedRoute';
import Skeleton from '../components/Skeleton';
import { bookingService, driverService, userService, ratingService } from '../../utils/axiosInstance';
import { extractArray } from '../../utils/extractArray';

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'users', label: 'Active Users', icon: Users },
  { id: 'drivers', label: 'Active Drivers', icon: Car },
  { id: 'rides', label: 'Rides Management', icon: Calendar },
  { id: 'finance', label: 'Finance', icon: DollarSign },
  { id: 'support', label: 'Support', icon: Headphones },
];

export default function Dashboard() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [metrics, setMetrics] = useState({
    activeBookings: 0,
    activeDrivers: 0,
    totalUsersOnline: 0,
    pendingRequests: 0,
    bookingsData: [],
    totalCustomers: 0,
    totalDrivers: 0,
    completionRate: 0,
    cancellationRate: 0,
    averageRating: 0,
  });
  const [loading, setLoading] = useState(true);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  // Fetch dashboard metrics with AbortController
  useEffect(() => {
    const controller = new AbortController();

    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        const requestBody = {
          status: "all",
          field: "",
          search: "",
          sorting: { field: "id", order: "desc" },
          page: 1,
          limit: 1000
        };

        const [bookingsResponse, driversResponse, usersResponse] = await Promise.all([
          bookingService.getAllBookings(requestBody),
          driverService.getAllDrivers(requestBody),
          userService.getAllUsers(requestBody),
        ]);

        let ratingsResponse = null;
        try {
          ratingsResponse = await ratingService.getAllRatings();
        } catch {
          // Ratings API may not be populated yet
        }

        if (controller.signal.aborted) return;

        const bookingsData = extractArray(bookingsResponse);
        const driversData = extractArray(driversResponse);
        const usersData = extractArray(usersResponse);
        const ratingsData = ratingsResponse ? extractArray(ratingsResponse) : [];

        const activeBookings = bookingsData.filter(b => {
          const status = b.status?.toLowerCase?.();
          return status === 'active' || status === 'ongoing' || status === 'in_progress' ||
            status === 'in-progress' || b.status === 1 || b.is_active === 1 ||
            b.is_active === true;
        }).length;

        const pendingBookings = bookingsData.filter(b => {
          const status = b.status?.toLowerCase?.();
          return status === 'pending' || b.status === 0;
        }).length;

        const activeDrivers = driversData.filter(d => {
          const status = d.status?.toLowerCase?.();
          const accountStatus = d.accountStatus?.toLowerCase?.();
          const driverStatus = d.driver_status?.toLowerCase?.();
          return status === 'active' || accountStatus === 'active' || driverStatus === 'online' ||
            d.status === 1 || d.is_active === 1 || d.is_active === true ||
            d.active === 1 || d.active === true || d.isActive === 1;
        }).length;

        const totalBookings = bookingsData.length;
        const completedBookings = bookingsData.filter(b => b.status?.toLowerCase?.() === 'completed').length;
        const cancelledBookings = bookingsData.filter(b => b.status?.toLowerCase?.() === 'cancelled').length;
        const completionRate = totalBookings > 0 ? parseFloat(((completedBookings / totalBookings) * 100).toFixed(1)) : 0;
        const cancellationRate = totalBookings > 0 ? parseFloat(((cancelledBookings / totalBookings) * 100).toFixed(1)) : 0;

        let averageRating = 0;
        if (ratingsData.length > 0) {
          const totalRating = ratingsData.reduce((sum, r) => {
            const val = parseFloat(r.rating || r.stars || r.score || r.value || 0);
            return sum + val;
          }, 0);
          averageRating = parseFloat((totalRating / ratingsData.length).toFixed(1));
        }

        setMetrics({
          activeBookings,
          activeDrivers,
          totalUsersOnline: usersData.length,
          pendingRequests: pendingBookings,
          bookingsData,
          totalCustomers: usersData.length,
          totalDrivers: driversData.length,
          completionRate,
          cancellationRate,
          averageRating,
        });
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Error fetching dashboard data:', error);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchDashboardData();
    return () => controller.abort();
  }, []);

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-gray-50 overflow-x-hidden">
        <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={toggleSidebar}
            aria-hidden="true"
          />
        )}

        <div className="flex-1 flex flex-col min-h-screen lg:ml-[240px] w-full lg:w-auto overflow-x-hidden">
          <div className="px-4 md:px-6 pt-4 md:pt-6">
            <Header title="Dashboard" toggleSidebar={toggleSidebar} />
          </div>

          <main className="flex-1 px-4 md:px-6 pb-6 overflow-x-hidden">
            {/* Tabs */}
            <div className="mb-6 bg-white shadow-sm border border-gray-100 p-1.5 overflow-x-auto">
              <div className="flex gap-1 min-w-max" role="tablist" aria-label="Dashboard sections">
                {TABS.map((tab) => {
                  const IconComponent = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      role="tab"
                      aria-selected={activeTab === tab.id}
                      aria-controls={`tabpanel-${tab.id}`}
                      id={`tab-${tab.id}`}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-2 font-medium transition-all duration-200 whitespace-nowrap text-sm ${
                        activeTab === tab.id
                          ? 'bg-[var(--primary)] text-white shadow-sm'
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                      }`}
                    >
                      <IconComponent className="w-4 h-4" aria-hidden="true" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab Panels */}
            <div
              role="tabpanel"
              id={`tabpanel-${activeTab}`}
              aria-labelledby={`tab-${activeTab}`}
            >
              {activeTab === 'overview' && loading && (
                <Skeleton.DashboardLoader />
              )}
              {activeTab === 'overview' && !loading && (
                <>
                  <div className="mb-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                      <div className="bg-white px-4 pb-6 pt-5 shadow-sm border border-gray-100 animate-fade-in">
                        <h2 className="text-base font-semibold text-gray-900 mb-1">
                          Real-time Metrics
                        </h2>
                        <p className="text-sm text-gray-400 mb-4">Metrics Summary</p>

                        <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-4 gap-3 stagger-fade-in">
                          <MetricCard
                            cardColor="bg-green-100"
                            icon={Calendar}
                            value={metrics.activeBookings.toString()}
                            label="Active Bookings"
                            bgColor="bg-green-600"
                            iconColor="text-white"
                            onClick={() => router.push('/dashboard/active-bookings')}
                          />
                          <MetricCard
                            cardColor="bg-purple-100"
                            icon={Users}
                            value={metrics.activeDrivers.toString()}
                            label="Active Drivers"
                            bgColor="bg-purple-600"
                            iconColor="text-white"
                            onClick={() => router.push('/dashboard/active-drivers')}
                          />
                          <MetricCard
                            cardColor="bg-pink-100"
                            icon={Globe}
                            value={metrics.totalUsersOnline.toString()}
                            label="Total Users Online"
                            bgColor="bg-pink-600"
                            iconColor="text-white"
                            onClick={() => router.push('/dashboard/users-online')}
                          />
                          <MetricCard
                            cardColor="bg-orange-100"
                            icon={Clock}
                            value={metrics.pendingRequests.toString()}
                            label="Pending Request"
                            bgColor="bg-orange-600"
                            iconColor="text-white"
                            onClick={() => router.push('/dashboard/pending-requests')}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="lg:col-span-1">
                      <div className="h-full min-h-[250px]">
                        <GeographicHeatMap />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6 items-start">
                    <div className="lg:col-span-3">
                      <RevenueChart bookingsData={metrics.bookingsData} />
                    </div>
                    <div className="lg:col-span-2">
                      <ServiceStatus />
                    </div>
                  </div>

                  <QuickStats
                    totalCustomers={metrics.totalCustomers}
                    totalDrivers={metrics.totalDrivers}
                    completionRate={metrics.completionRate}
                    cancellationRate={metrics.cancellationRate}
                    averageRating={metrics.averageRating}
                    loading={loading}
                  />
                </>
              )}

              {activeTab === 'users' && (
                <div className="animate-fade-in">
                  <ActiveUsersReport />
                </div>
              )}

              {activeTab === 'drivers' && (
                <div className="animate-fade-in">
                  <ActiveDriversReport />
                </div>
              )}

              {activeTab === 'rides' && (
                <div className="animate-fade-in">
                  <RidesManagement />
                </div>
              )}

              {activeTab === 'finance' && (
                <div className="animate-fade-in">
                  <FinanceManagement />
                </div>
              )}

              {activeTab === 'support' && (
                <div className="animate-fade-in">
                  <SupportManagement />
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
