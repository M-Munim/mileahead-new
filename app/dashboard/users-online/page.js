'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import ProtectedRoute from '../../components/ProtectedRoute';
import { userService } from '../../../utils/axiosInstance';
import { extractArray } from '../../../utils/extractArray';
import { ArrowLeft, User, Mail, Phone, Globe } from 'lucide-react';
import Skeleton from '../../components/Skeleton';

export default function UsersOnline() {
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    useEffect(() => {
        const controller = new AbortController();

        const fetchAllUsers = async () => {
            try {
                setLoading(true);
                const response = await userService.getAllUsers({
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

                setUsers(extractArray(response));
            } catch (error) {
                if (!controller.signal.aborted) {
                    console.error('Error fetching users:', error);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        fetchAllUsers();

        return () => controller.abort();
    }, []);

    const normalizedSearch = searchTerm.trim().toLowerCase();
    const filteredUsers = users.filter(rawUser => {
        if (!normalizedSearch) return true;
        // Support either user object or nested { user: { ... } }
        const user = (rawUser && rawUser.user) ? rawUser.user : rawUser || {};

        const id = String(user.id ?? '').toLowerCase();
        const first = String(user.firstname ?? user.first_name ?? user.firstName ?? '').toLowerCase();
        const last = String(user.lastname ?? user.last_name ?? user.lastName ?? '').toLowerCase();
        const full = (first + ' ' + last).trim();
        const email = String(user.email ?? '').toLowerCase();
        const phone = String(user.phone ?? user.contact ?? user.mobile ?? '').toLowerCase();

        return (
            id.includes(normalizedSearch) ||
            first.includes(normalizedSearch) ||
            last.includes(normalizedSearch) ||
            full.includes(normalizedSearch) ||
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
                        <Header title="Total Users Online Details" toggleSidebar={toggleSidebar} />
                    </div>

                    <main className="flex-1 px-4 md:px-6 pb-6">
                        {/* Back Button */}
                        <button
                            onClick={() => router.back()}
                            className="flex items-center gap-2 text-pink-600 hover:text-pink-700 mb-6"
                            aria-label="Back to Dashboard"
                        >
                            <ArrowLeft size={20} aria-hidden="true" />
                            Back to Dashboard
                        </button>

                        {/* Search Bar */}
                        <div className="mb-6">
                            <input
                                type="text"
                                placeholder="Search by user ID, first/last name, email, or phone..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-pink-500"
                            />
                        </div>

                        {/* Users Table */}
                        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                {/* Desktop Table */}
                                <table className="w-full hidden md:table" aria-label="Users online">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-sm font-semibold text-gray-700">ID</th>
                                            <th scope="col" className="px-6 py-3 text-left text-sm font-semibold text-gray-700">First Name</th>
                                            <th scope="col" className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Last Name</th>
                                            <th scope="col" className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Phone</th>
                                            <th scope="col" className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Account Type</th>
                                            <th scope="col" className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Joined Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <Skeleton.TableRows rows={5} cols={6} />
                                        ) : filteredUsers.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                                    No users found
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredUsers.map((user, index) => (
                                                <tr key={user.id || index} className="border-b border-gray-200 hover:bg-gray-50">
                                                    <td className="px-6 py-4 text-sm text-gray-900">#{user.id}</td>
                                                    <td className="px-6 py-4 text-sm text-gray-600">{user.firstname || 'N/A'}</td>
                                                    <td className="px-6 py-4 text-sm text-gray-600">{user.lastname || 'N/A'}</td>
                                                    <td className="px-6 py-4 text-sm text-gray-600">{user.phone || 'N/A'}</td>
                                                    <td className="px-6 py-4 text-sm">
                                                        <span className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-xs font-medium">
                                                            {user.accountType || 'Customer'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-600">
                                                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
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
                                    ) : filteredUsers.length === 0 ? (
                                        <div className="px-6 py-8 text-center text-gray-500">
                                            No users found
                                        </div>
                                    ) : (
                                        filteredUsers.map((user, index) => (
                                            <div key={user.id || index} className="border-b border-gray-200 p-4 hover:bg-gray-50">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-sm font-semibold text-gray-900">#{user.id}</span>
                                                            <span className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-xs font-medium">
                                                                {user.accountType || 'Customer'}
                                                            </span>
                                                        </div>
                                                        <div className="mt-2 space-y-1">
                                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                                <User size={14} aria-hidden="true" />
                                                                <span>{user.firstname || 'N/A'} {user.lastname || ''}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                                <Phone size={14} aria-hidden="true" />
                                                                <span>{user.phone || 'N/A'}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                                <Globe size={14} aria-hidden="true" />
                                                                <span>{user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</span>
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
                                    Total Users: <span className="font-semibold text-gray-900">{filteredUsers.length}</span>
                                </p>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </ProtectedRoute>
    );
}
