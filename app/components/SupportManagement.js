'use client';

import { useState, useEffect } from 'react';
import { Headphones, MessageCircle, AlertCircle, CheckCircle, Clock, User, Mail, Phone } from 'lucide-react';
import { userService } from '../../utils/axiosInstance';
import { extractArray } from '../../utils/extractArray';
import Toast from './Toast';

export default function SupportManagement() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [toast, setToast] = useState(null);

  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    activeUsers: 0,
    suspendedUsers: 0,
    newUsersToday: 0,
  });

  // Mock support tickets for demonstration
  const [supportTickets] = useState([
    {
      id: 1,
      userId: 1,
      subject: 'Payment issue',
      description: 'Unable to complete payment for my last ride',
      status: 'open',
      priority: 'high',
      createdAt: '2026-01-12 09:30',
    },
    {
      id: 2,
      userId: 2,
      subject: 'Driver behavior complaint',
      description: 'Driver was rude during the trip',
      status: 'in-progress',
      priority: 'medium',
      createdAt: '2026-01-12 10:15',
    },
    {
      id: 3,
      userId: 3,
      subject: 'App not working',
      description: 'Cannot open the app after latest update',
      status: 'resolved',
      priority: 'low',
      createdAt: '2026-01-11 14:20',
    },
  ]);

  useEffect(() => {
    const controller = new AbortController();
    fetchSupportData(controller);
    return () => controller.abort();
  }, [statusFilter, searchTerm]);

  const fetchSupportData = async (controller) => {
    try {
      setLoading(true);

      // Fetch all users
      const response = await userService.getAllUsers({
        status: statusFilter === 'all' ? 'all' : statusFilter,
        field: "firstname",
        search: searchTerm,
        sorting: {
          field: "id",
          order: "desc"
        },
        page: 1,
        limit: 1000
      });

      if (controller?.signal?.aborted) return;

      const usersData = extractArray(response);

      // Calculate metrics
      const totalUsers = usersData.length;
      const activeUsers = usersData.filter(u => {
        const status = u.status?.toLowerCase();
        return status === 'active' || u.isActive === 1;
      }).length;
      const suspendedUsers = totalUsers - activeUsers;

      // Calculate new users today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const newUsersToday = usersData.filter(u => {
        const createdDate = new Date(u.created_at || u.timeStamp);
        return createdDate >= today;
      }).length;

      if (controller?.signal?.aborted) return;

      setMetrics({
        totalUsers,
        activeUsers,
        suspendedUsers,
        newUsersToday,
      });

      // Transform users data
      const transformedUsers = usersData.map(user => ({
        id: user.id,
        name: `${user.firstname || ''} ${user.lastname || ''}`.trim() || user.username || 'Unknown',
        email: user.email || 'N/A',
        phone: user.phone || 'N/A',
        status: user.status === 'active' || user.isActive === 1 ? 'active' : 'suspended',
        createdAt: user.created_at || user.timeStamp,
        totalBookings: user.total_bookings || 0,
      }));

      if (controller?.signal?.aborted) return;
      setUsers(transformedUsers);

    } catch (error) {
      if (controller?.signal?.aborted) return;
      console.error('Error fetching support data:', error);
      showToast('Failed to fetch support data', 'error');
    } finally {
      if (!controller?.signal?.aborted) {
        setLoading(false);
      }
    }
  };

  const handleViewUser = (user) => {
    setSelectedUser(user);
    setIsDetailModalOpen(true);
  };

  const handleToggleUserStatus = async (userId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'suspended' : 'active';

      await userService.updateUserProfile(userId, {
        status: newStatus
      });

      showToast(`User ${newStatus === 'active' ? 'activated' : 'suspended'} successfully`, 'success');
      fetchSupportData();
      setIsDetailModalOpen(false);
    } catch (error) {
      console.error('Error updating user status:', error);
      showToast('Failed to update user status', 'error');
    }
  };

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  const getTicketStatusColor = (status) => {
    switch (status) {
      case 'open':
        return 'bg-red-100 text-red-700';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-700';
      case 'resolved':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getTicketStatusIcon = (status) => {
    switch (status) {
      case 'open':
        return AlertCircle;
      case 'in-progress':
        return Clock;
      case 'resolved':
        return CheckCircle;
      default:
        return MessageCircle;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6" role="status">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
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
            <h2 className="text-xl font-semibold text-gray-900">Support Management</h2>
            <p className="text-sm text-gray-500 mt-1">User support and ticket management</p>
          </div>
          <button
            onClick={() => fetchSupportData()}
            className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] transition-colors text-sm font-medium"
          >
            Refresh
          </button>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4 text-center border border-blue-200">
            <div className="text-2xl font-bold text-blue-700">{metrics.totalUsers}</div>
            <div className="text-xs text-gray-600 mt-1">Total Users</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center border border-green-200">
            <div className="text-2xl font-bold text-green-700">{metrics.activeUsers}</div>
            <div className="text-xs text-gray-600 mt-1">Active</div>
          </div>
          <div className="bg-red-50 rounded-lg p-4 text-center border border-red-200">
            <div className="text-2xl font-bold text-red-700">{metrics.suspendedUsers}</div>
            <div className="text-xs text-gray-600 mt-1">Suspended</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 text-center border border-purple-200">
            <div className="text-2xl font-bold text-purple-700">{metrics.newUsersToday}</div>
            <div className="text-xs text-gray-600 mt-1">New Today</div>
          </div>
        </div>

        {/* Support Tickets Section */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Headphones className="w-5 h-5" aria-hidden="true" />
            Support Tickets
          </h3>
          <div className="space-y-3">
            {supportTickets.map((ticket) => {
              const StatusIcon = getTicketStatusIcon(ticket.status);
              return (
                <div key={ticket.id} className="border border-gray-200 rounded-lg p-4 hover:border-[var(--primary)] transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getTicketStatusColor(ticket.status)}`}>
                          <StatusIcon className="w-3 h-3" aria-hidden="true" />
                          {ticket.status}
                        </span>
                        <span className={`text-xs font-semibold ${getPriorityColor(ticket.priority)}`}>
                          {ticket.priority.toUpperCase()} PRIORITY
                        </span>
                      </div>
                      <div className="font-semibold text-gray-900 mb-1">{ticket.subject}</div>
                      <div className="text-sm text-gray-600 mb-2">{ticket.description}</div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" aria-hidden="true" />
                          {ticket.createdAt}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" aria-hidden="true" />
                          User ID: {ticket.userId}
                        </span>
                      </div>
                    </div>
                    <button className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] transition-colors text-sm font-medium whitespace-nowrap">
                      View Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Users Section */}
        <div>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-sm"
              aria-label="Search users"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-sm"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <div className="space-y-2">
            {users.length > 0 ? (
              users.slice(0, 10).map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-[var(--primary)] transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] flex items-center justify-center text-white font-semibold">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{user.name}</div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" aria-hidden="true" />
                            {user.email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" aria-hidden="true" />
                            {user.phone}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {user.status}
                    </span>
                    <button
                      onClick={() => handleViewUser(user)}
                      className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] transition-colors text-sm font-medium"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">No users found</div>
            )}
          </div>
        </div>
      </div>

      {/* User Detail Modal */}
      {isDetailModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/40 modal-backdrop flex items-center justify-center z-50 p-4">
          <div
            className="bg-white max-w-lg w-full animate-fade-in-scale"
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-detail-modal-title"
          >
            <div className="p-6 border-b border-gray-200">
              <h3 id="user-detail-modal-title" className="text-xl font-semibold text-gray-900">User Details</h3>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] flex items-center justify-center text-white text-2xl font-semibold">
                  {selectedUser.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-lg font-semibold text-gray-900">{selectedUser.name}</div>
                  <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-medium ${
                    selectedUser.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {selectedUser.status}
                  </span>
                </div>
              </div>

              <div className="space-y-3 pt-4">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-5 h-5 text-gray-400" aria-hidden="true" />
                  <span className="text-gray-700">{selectedUser.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-5 h-5 text-gray-400" aria-hidden="true" />
                  <span className="text-gray-700">{selectedUser.phone}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <MessageCircle className="w-5 h-5 text-gray-400" aria-hidden="true" />
                  <span className="text-gray-700">{selectedUser.totalBookings} Total Bookings</span>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                aria-label="Close"
              >
                Close
              </button>
              <button
                onClick={() => handleToggleUserStatus(selectedUser.id, selectedUser.status)}
                className={`px-6 py-2 rounded-lg transition-colors font-medium ${
                  selectedUser.status === 'active'
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >
                {selectedUser.status === 'active' ? 'Suspend User' : 'Activate User'}
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
