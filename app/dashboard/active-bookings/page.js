'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import ProtectedRoute from '../../components/ProtectedRoute';
import { bookingService } from '../../../utils/axiosInstance';
import { extractArray } from '../../../utils/extractArray';
import { ArrowLeft, Calendar, MapPin, User, Phone } from 'lucide-react';
import Skeleton from '../../components/Skeleton';

export default function ActiveBookings() {
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    useEffect(() => {
        const controller = new AbortController();

        const fetchActiveBookings = async () => {
            try {
                setLoading(true);
                const response = await bookingService.getAllBookings({
                    status: "all",
                    field: "",
                    search: "",
                    sorting: {
                        field: "id",
                        order: "desc"
                    },
                    page: 1,
                    limit: 1000
                });

                if (controller.signal.aborted) return;

                const allBookings = extractArray(response);
                const activeBookings = allBookings.filter(b => {
                    const status = b.status?.toLowerCase();
                    return status === 'active' || status === 'ongoing' || status === 'in_progress' ||
                        status === 'in-progress' || b.status === 1 || b.is_active === 1 ||
                        b.is_active === true;
                });

                setBookings(activeBookings);
            } catch (error) {
                if (!controller.signal.aborted) {
                    console.error('Error fetching active bookings:', error);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        fetchActiveBookings();

        return () => controller.abort();
    }, []);

    const normalizedSearch = searchTerm.trim().toLowerCase();
    const filteredBookings = bookings.filter(raw => {
        if (!normalizedSearch) return true;
        const b = (raw && raw.booking) ? raw.booking : raw || {};

        const id = String(b.id ?? '').toLowerCase();
        const passenger = String(b.passenger_name ?? b.customer_name ?? b.passenger ?? '').toLowerCase();
        const driver = String(b.driver_name ?? b.driver ?? '').toLowerCase();
        const pickup = String(b.from_address ?? b.pickup_location ?? b.pickup ?? '').toLowerCase();
        const dropoff = String(b.to_address ?? b.dropoff_location ?? b.dropoff ?? '').toLowerCase();
        const phone = String(b.contact_number ?? b.contact ?? b.phone ?? '').toLowerCase();

        return (
            id.includes(normalizedSearch) ||
            passenger.includes(normalizedSearch) ||
            driver.includes(normalizedSearch) ||
            pickup.includes(normalizedSearch) ||
            dropoff.includes(normalizedSearch) ||
            phone.includes(normalizedSearch)
        );
    });

    return (
        <ProtectedRoute>
            <div className="flex min-h-screen bg-gray-50 overflow-x-hidden">
                <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
                {sidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                        onClick={toggleSidebar}
                    />
                )}

                <div className="flex-1 flex flex-col min-h-screen lg:ml-[240px] w-full lg:w-auto overflow-x-hidden">
                    <div className="px-4 md:px-6 pt-4 md:pt-6">
                        <Header title="Active Bookings Details" toggleSidebar={toggleSidebar} />
                    </div>

                    <main className="flex-1 px-4 md:px-6 pb-6">
                        {/* Back Button */}
                        <button
                            onClick={() => router.back()}
                            className="flex items-center gap-2 text-green-600 hover:text-green-700 mb-6"
                            aria-label="Back to Dashboard"
                        >
                            <ArrowLeft size={20} aria-hidden="true" />
                            Back to Dashboard
                        </button>

                        {/* Search Bar */}
                        <div className="mb-6">
                            <input
                                type="text"
                                placeholder="Search by booking ID, passenger, driver, phone or location..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
                            />
                        </div>

                        {/* Bookings Table */}
                        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                {/* Desktop Table */}
                                <table className="w-full hidden md:table" aria-label="Active bookings">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-sm font-semibold text-gray-700">ID</th>
                                            <th scope="col" className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Customer</th>
                                            <th scope="col" className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Contact</th>
                                            <th scope="col" className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Pickup Location</th>
                                            <th scope="col" className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Distance</th>
                                            <th scope="col" className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                                            <th scope="col" className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <Skeleton.TableRows rows={5} cols={7} />
                                        ) : filteredBookings.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                                                    No active bookings found
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredBookings.map((booking, index) => (
                                                <tr key={booking.id || index} className="border-b border-gray-200 hover:bg-gray-50">
                                                    <td className="px-6 py-4 text-sm text-gray-900">#{booking.id}</td>
                                                    <td className="px-6 py-4 text-sm text-gray-600">{booking.passenger_name || 'N/A'}</td>
                                                    <td className="px-6 py-4 text-sm text-gray-600">{booking.contact_number || 'N/A'}</td>
                                                    <td className="px-6 py-4 text-sm text-gray-600">{booking.from_address || 'N/A'}</td>
                                                    <td className="px-6 py-4 text-sm text-gray-600">{booking.distance || 'N/A'}</td>
                                                    <td className="px-6 py-4 text-sm">
                                                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                                            {booking.status || 'Active'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                                                        {booking.price ? `${booking.price} QAR` : 'N/A'}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>

                                {/* Mobile Cards */}
                                <div className="md:hidden">
                                    {loading ? (
                                        <div className="p-4 space-y-4">
                                            {[...Array(5)].map((_, i) => (
                                                <div key={i} className="animate-pulse bg-gray-100 rounded-lg h-32" />
                                            ))}
                                        </div>
                                    ) : filteredBookings.length === 0 ? (
                                        <div className="px-6 py-8 text-center text-gray-500">
                                            No active bookings found
                                        </div>
                                    ) : (
                                        filteredBookings.map((booking, index) => (
                                            <div key={booking.id || index} className="border-b border-gray-200 p-4 hover:bg-gray-50">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-sm font-semibold text-gray-900">#{booking.id}</span>
                                                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                                                {booking.status || 'Active'}
                                                            </span>
                                                        </div>
                                                        <div className="mt-2 space-y-1">
                                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                                <User size={14} aria-hidden="true" />
                                                                <span>{booking.passenger_name || 'N/A'}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                                <Phone size={14} aria-hidden="true" />
                                                                <span>{booking.contact_number || 'N/A'}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                                <MapPin size={14} aria-hidden="true" />
                                                                <span>{booking.from_address || 'N/A'}</span>
                                                            </div>
                                                            <div className="flex items-center justify-between mt-2">
                                                                <span className="text-sm text-gray-600">Distance: {booking.distance || 'N/A'}</span>
                                                                <span className="text-sm font-semibold text-gray-900">{booking.price ? `${booking.price} QAR` : 'N/A'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Summary */}
                            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                                <p className="text-sm text-gray-600">
                                    Total Active Bookings: <span className="font-semibold text-gray-900">{filteredBookings.length}</span>
                                </p>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </ProtectedRoute>
    );
}
