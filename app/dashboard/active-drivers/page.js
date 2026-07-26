'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import ProtectedRoute from '../../components/ProtectedRoute';
import { driverService } from '../../../utils/axiosInstance';
import { extractArray } from '../../../utils/extractArray';
import { ArrowLeft, User, Phone, MapPin, Star } from 'lucide-react';
import Skeleton from '../../components/Skeleton';

export default function ActiveDrivers() {
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    useEffect(() => {
        const controller = new AbortController();

        const fetchActiveDrivers = async () => {
            try {
                setLoading(true);
                const response = await driverService.getAllDrivers({
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

                const allDrivers = extractArray(response);
                const activeDrivers = allDrivers.filter(d => {
                    const status = d.status?.toLowerCase();
                    const accountStatus = d.accountStatus?.toLowerCase();
                    const driverStatus = d.driver_status?.toLowerCase();
                    return status === 'active' || accountStatus === 'active' || driverStatus === 'online' ||
                        d.status === 1 || d.is_active === 1 || d.is_active === true ||
                        d.active === 1 || d.active === true || d.isActive === 1;
                });

                setDrivers(activeDrivers);
            } catch (error) {
                if (!controller.signal.aborted) {
                    console.error('Error fetching active drivers:', error);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        fetchActiveDrivers();

        return () => controller.abort();
    }, []);

    const normalizedSearch = searchTerm.trim().toLowerCase();
    const filteredDrivers = drivers.filter(raw => {
        if (!normalizedSearch) return true;
        const d = (raw && raw.driver) ? raw.driver : raw || {};

        const id = String(d.id ?? '').toLowerCase();
        const name = String(d.name ?? d.full_name ?? (d.firstname || '') + ' ' + (d.lastname || '')).toLowerCase();
        const email = String(d.email ?? '').toLowerCase();
        const phone = String(d.phone ?? d.contact ?? d.mobile ?? '').toLowerCase();

        return (
            id.includes(normalizedSearch) ||
            name.includes(normalizedSearch) ||
            email.includes(normalizedSearch) ||
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
                        <Header title="Active Drivers Details" toggleSidebar={toggleSidebar} />
                    </div>

                    <main className="flex-1 px-4 md:px-6 pb-6">
                        {/* Back Button */}
                        <button
                            onClick={() => router.back()}
                            className="flex items-center gap-2 text-purple-600 hover:text-purple-700 mb-6"
                            aria-label="Back to Dashboard"
                        >
                            <ArrowLeft size={20} aria-hidden="true" />
                            Back to Dashboard
                        </button>

                        {/* Search Bar */}
                        <div className="mb-6">
                            <input
                                type="text"
                                placeholder="Search by driver ID, name, email, or phone..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                            />
                        </div>

                        {/* Drivers Table */}
                        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                {/* Desktop Table */}
                                <table className="w-full hidden md:table" aria-label="Active drivers">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-sm font-semibold text-gray-700">ID</th>
                                            <th scope="col" className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                                            <th scope="col" className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                                            <th scope="col" className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Phone</th>
                                            <th scope="col" className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                                            <th scope="col" className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Rating</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <Skeleton.TableRows rows={5} cols={6} />
                                        ) : filteredDrivers.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                                    No active drivers found
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredDrivers.map((driver, index) => (
                                                <tr key={driver.id || index} className="border-b border-gray-200 hover:bg-gray-50">
                                                    <td className="px-6 py-4 text-sm text-gray-900">#{driver.id}</td>
                                                    <td className="px-6 py-4 text-sm text-gray-600">{driver.name || 'N/A'}</td>
                                                    <td className="px-6 py-4 text-sm text-gray-600">{driver.email || 'N/A'}</td>
                                                    <td className="px-6 py-4 text-sm text-gray-600">{driver.phone || 'N/A'}</td>
                                                    <td className="px-6 py-4 text-sm">
                                                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                                                            Active
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm">
                                                        <div className="flex items-center gap-1">
                                                            <Star size={16} className="text-yellow-500 fill-yellow-500" aria-hidden="true" />
                                                            <span>{driver.rating || 'N/A'}</span>
                                                        </div>
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
                                    ) : filteredDrivers.length === 0 ? (
                                        <div className="px-6 py-8 text-center text-gray-500">
                                            No active drivers found
                                        </div>
                                    ) : (
                                        filteredDrivers.map((driver, index) => (
                                            <div key={driver.id || index} className="border-b border-gray-200 p-4 hover:bg-gray-50">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-sm font-semibold text-gray-900">#{driver.id}</span>
                                                            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                                                                Active
                                                            </span>
                                                        </div>
                                                        <div className="mt-2 space-y-1">
                                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                                <User size={14} aria-hidden="true" />
                                                                <span>{driver.name || 'N/A'}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                                <MapPin size={14} aria-hidden="true" />
                                                                <span>{driver.email || 'N/A'}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                                <Phone size={14} aria-hidden="true" />
                                                                <span>{driver.phone || 'N/A'}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                                <Star size={14} className="text-yellow-500 fill-yellow-500" aria-hidden="true" />
                                                                <span>{driver.rating || 'N/A'}</span>
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
                                    Total Active Drivers: <span className="font-semibold text-gray-900">{filteredDrivers.length}</span>
                                </p>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </ProtectedRoute>
    );
}
