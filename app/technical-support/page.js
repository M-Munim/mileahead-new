'use client';

import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import ProtectedRoute from '../components/ProtectedRoute';
import {
  Headphones,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  Clock,
  Wrench,
  Mail,
  Phone,
  MessageSquare,
  BookOpen,
  Zap,
} from 'lucide-react';

const statusCards = [
  { label: 'API Uptime', value: '99.98%', icon: ShieldCheck, color: 'bg-green-100 text-green-700' },
  { label: 'Active Alerts', value: '2', icon: AlertTriangle, color: 'bg-yellow-100 text-yellow-700' },
  { label: 'Resolved Today', value: '14', icon: CheckCircle, color: 'bg-blue-100 text-blue-700' },
  { label: 'Avg Response', value: '12m', icon: Clock, color: 'bg-purple-100 text-purple-700' },
];

const incidents = [
  {
    id: 'INC-1021',
    title: 'Driver assignment delay',
    status: 'Monitoring',
    impact: 'Minor',
    updatedAt: '2026-01-19 21:40',
  },
  {
    id: 'INC-1017',
    title: 'Payment gateway latency',
    status: 'Resolved',
    impact: 'Medium',
    updatedAt: '2026-01-19 18:10',
  },
  {
    id: 'INC-1013',
    title: 'SMS OTP delivery delay',
    status: 'Resolved',
    impact: 'Minor',
    updatedAt: '2026-01-18 14:25',
  },
];

const knowledgeBase = [
  { title: 'How to assign a driver', category: 'Rides' },
  { title: 'Handling payment disputes', category: 'Finance' },
  { title: 'Resetting user access', category: 'Admin' },
  { title: 'Troubleshooting location issues', category: 'Operations' },
];

const maintenance = [
  { title: 'Database optimization', window: '2026-01-23 01:00-03:00', status: 'Scheduled' },
  { title: 'SMS provider failover test', window: '2026-01-24 02:00-02:30', status: 'Planned' },
];

export default function TechnicalSupportPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-gray-50 overflow-x-hidden">
        <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={toggleSidebar} aria-hidden="true" />
        )}

        <div className="flex-1 flex flex-col min-h-screen lg:ml-[240px] w-full lg:w-auto overflow-x-hidden">
          <div className="px-4 md:px-6 pt-4 md:pt-6">
            <Header title="Technical & Support" toggleSidebar={toggleSidebar} />
          </div>

          <main className="flex-1 px-4 md:px-6 pb-6 space-y-6">
            {/* Overview */}
            <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6" aria-labelledby="support-overview-title">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center">
                  <Headphones className="w-6 h-6 text-[var(--primary)]" aria-hidden="true" />
                </div>
                <div>
                  <h1 id="support-overview-title" className="text-xl font-semibold text-gray-900">Support Overview</h1>
                  <p className="text-sm text-gray-500">Operational health, incidents, and help resources.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statusCards.map((card) => (
                  <div key={card.label} className="rounded-xl border border-gray-200 p-4 flex items-center gap-3" aria-label={`${card.label}: ${card.value}`}>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.color}`}>
                      <card.icon className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-gray-900">{card.value}</div>
                      <div className="text-xs text-gray-500">{card.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Incidents */}
              <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-2" aria-labelledby="incidents-title">
                <div className="flex items-center justify-between mb-4">
                  <h2 id="incidents-title" className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-[var(--primary)]" aria-hidden="true" />
                    Current Incidents
                  </h2>
                  <button className="px-3 py-1.5 text-xs font-medium text-white bg-[var(--primary)] rounded-lg hover:bg-[var(--primary-hover)]">
                    Report Issue
                  </button>
                </div>
                <div className="space-y-3">
                  {incidents.map((incident) => (
                    <article key={incident.id} className="border border-gray-200 rounded-lg p-4" aria-label={`${incident.title} - ${incident.status}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium text-gray-900">{incident.title}</div>
                        <span className={`text-xs px-2 py-1 rounded-full ${incident.status === 'Resolved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {incident.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                        <span>{incident.id}</span>
                        <span>Impact: {incident.impact}</span>
                        <span>Updated: {incident.updatedAt}</span>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              {/* Contact */}
              <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6" aria-labelledby="contact-title">
                <h2 id="contact-title" className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-[var(--primary)]" aria-hidden="true" />
                  Contact Support
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                    <Mail className="w-5 h-5 text-[var(--primary)]" aria-hidden="true" />
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">Email</div>
                      <div className="text-gray-500">support@milesahead.services</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                    <Phone className="w-5 h-5 text-[var(--primary)]" aria-hidden="true" />
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">Hotline</div>
                      <div className="text-gray-500">+974 4000 1234</div>
                    </div>
                  </div>
                  <button className="w-full px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] text-sm font-medium">
                    Open Support Ticket
                  </button>
                </div>
              </section>
            </div>

            {/* Knowledge Base and Maintenance */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6" aria-labelledby="kb-title">
                <h2 id="kb-title" className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[var(--primary)]" aria-hidden="true" />
                  Knowledge Base
                </h2>
                <div className="space-y-3">
                  {knowledgeBase.map((item) => (
                    <div key={item.title} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{item.title}</div>
                        <div className="text-xs text-gray-500">{item.category}</div>
                      </div>
                      <button className="text-xs text-[var(--primary)] font-medium" aria-label={`View article: ${item.title}`}>
                        View
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6" aria-labelledby="maintenance-title">
                <h2 id="maintenance-title" className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-[var(--primary)]" aria-hidden="true" />
                  Scheduled Maintenance
                </h2>
                <div className="space-y-3">
                  {maintenance.map((item) => (
                    <div key={item.title} className="p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-sm font-medium text-gray-900">{item.title}</div>
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                          {item.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">{item.window}</div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
