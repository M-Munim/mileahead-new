'use client';

import {
  LayoutDashboard,
  Users,
  DollarSign,
  CreditCard,
  Car,
  MapPin,
  MessageSquare,
  Settings,
  BarChart3,
  Headphones,
  Droplets,
  X,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import NextImage from 'next/image';
import img from "../../public/Group.png";

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Users, label: 'User Management', href: '/customers' },
  { icon: Droplets, label: 'Car Wash Orders', href: '/orders' },
  { icon: DollarSign, label: 'Pricing & Fees Management', href: '/pricing' },
  { icon: CreditCard, label: 'Financial Management', href: '#' },
  { icon: Car, label: 'Fleet & Vehicle Management', href: '#' },
  { icon: MapPin, label: 'Geographic & Service', href: '#' },
  { icon: MessageSquare, label: 'Communication Center', href: '#' },
  { icon: Settings, label: 'System Configuration', href: '#' },
  { icon: BarChart3, label: 'Marketing & Growth Tools', href: '#' },
  { icon: Headphones, label: 'Technical & Support', href: '/technical-support' },
];

export default function Sidebar({ isOpen, toggleSidebar }) {
  const pathname = usePathname();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      <aside
        className={`fixed top-0 left-0 h-screen bg-white z-50 transition-transform duration-300 ease-in-out border-r border-gray-200 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } w-[280px] sm:w-[300px] lg:w-[252px]`}
      >
        <div className="flex flex-col h-full overflow-y-auto">
          {/* Header with Logo */}
          <div className="flex items-center justify-between px-5 py-5 border-b border-gray-100">
            <div className="flex items-center gap-2 flex-1">
              <NextImage src={img} alt="Miles Ahead Logo" className="object-contain" />
            </div>

            <button
              className="lg:hidden text-gray-400 hover:text-gray-700 p-2 hover:bg-gray-100 transition-colors shrink-0"
              onClick={toggleSidebar}
              aria-label="Close menu"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="px-3 py-3 flex-1" aria-label="Main navigation">
            <div className="stagger-fade-in">
              {menuItems.map((item, index) => {
                const isActive = pathname === item.href ||
                  (item.href === '/customers' && pathname.startsWith('/customers')) ||
                  (item.href === '/booking' && pathname.startsWith('/booking')) ||
                  (item.href === '/orders' && pathname.startsWith('/orders')) ||
                  (item.href === '/pricing' && pathname.startsWith('/pricing')) ||
                  (item.href === '/technical-support' && pathname.startsWith('/technical-support'));
                const isDisabled = item.href === '#';
                return (
                  <Link
                    key={index}
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={`group w-full flex items-center gap-3 px-3 py-2.5 mb-0.5 text-sm transition-all duration-200 ${
                      isActive
                        ? 'bg-[var(--primary)] text-white font-medium shadow-sm'
                        : isDisabled
                        ? 'text-gray-400 cursor-default'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                    onClick={(e) => {
                      if (isDisabled) {
                        e.preventDefault();
                        return;
                      }
                      if (window.innerWidth < 1024) {
                        toggleSidebar();
                      }
                    }}
                  >
                    <item.icon className={`w-[18px] h-[18px] shrink-0 transition-colors duration-200 ${
                      isActive ? 'text-white' : isDisabled ? 'text-gray-300' : 'text-gray-400 group-hover:text-[var(--primary)]'
                    }`} aria-hidden="true" />
                    <span className="text-left text-[13px] leading-tight flex-1">{item.label}</span>
                    {isActive && (
                      <ChevronRight className="w-3.5 h-3.5 text-white/70 shrink-0" aria-hidden="true" />
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-100">
            <div className="text-[11px] text-gray-400 text-center">
              Miles Ahead v1.0
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
