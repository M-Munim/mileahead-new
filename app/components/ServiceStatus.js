"use client";

import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

export default function ServiceStatus() {
  const services = [
    { name: 'System Health', status: 'Operational', colorClass: 'text-green-500', icon: CheckCircle },
    { name: 'API Status', status: 'Degraded', colorClass: 'text-yellow-500', icon: AlertTriangle },
    { name: 'Payment Gateway', status: 'Down', colorClass: 'text-red-500', icon: XCircle },
  ];

  return (
    <div className="bg-white p-4 sm:p-6 shadow-sm border border-gray-100 h-auto sm:h-80 w-full flex flex-col animate-fade-in">
      <h3 className="text-base font-semibold text-gray-900 mb-3">Service Status</h3>

      <div className="mt-2 divide-y divide-gray-100 overflow-auto flex-grow">
        {services.map((service, index) => {
          const Icon = service.icon;
          return (
            <div key={service.name} className="flex items-center justify-between py-3 transition-colors hover:bg-gray-50 px-2 -mx-2">
              <div className="flex items-center gap-3">
                <Icon className={`${service.colorClass} w-4 h-4`} aria-hidden="true" />
                <span className="text-sm text-gray-700">{service.name}</span>
              </div>

              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                service.status === 'Operational'
                  ? 'bg-green-50 text-green-700'
                  : service.status === 'Degraded'
                  ? 'bg-yellow-50 text-yellow-700'
                  : 'bg-red-50 text-red-700'
              }`}>
                {service.status}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
