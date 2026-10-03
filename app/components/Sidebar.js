'use client';

import { Droplets, X, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import NextImage from 'next/image';
import logo from "../../public/magic-track-logo.png";

// Client scope (initial stage): Car Wash Orders is the only module.
// More modules will be added back here as they are requested.
const menuItems = [
  { icon: Droplets, label: 'Car Wash Orders', href: '/orders' },
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
        className={`fixed top-0 left-0 h-screen bg-[var(--brand-black)] z-50 transition-transform duration-300 ease-in-out border-r border-white/5 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } w-[280px] sm:w-[300px] lg:w-[252px]`}
      >
        <div className="flex flex-col h-full overflow-y-auto">
          {/* Header with Logo */}
          <div className="relative flex items-center justify-center px-5 py-5 border-b border-white/10">
            <NextImage
              src={logo}
              alt="Magic Track — Car Wash & Auto Care"
              className="w-full max-w-[190px] h-auto object-contain"
              priority
            />

            <button
              className="lg:hidden absolute top-3 right-3 text-gray-400 hover:text-white p-2 hover:bg-white/10 transition-colors shrink-0"
              onClick={toggleSidebar}
              aria-label="Close menu"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="px-3 py-3 flex-1" aria-label="Main navigation">
            <div className="stagger-fade-in">
              {menuItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={`group w-full flex items-center gap-3 px-3 py-2.5 mb-0.5 text-sm transition-all duration-200 ${
                      isActive
                        ? 'bg-[var(--primary)] text-white font-medium shadow-sm'
                        : 'text-gray-300 hover:bg-white/5 hover:text-white'
                    }`}
                    onClick={() => {
                      if (window.innerWidth < 1024) {
                        toggleSidebar();
                      }
                    }}
                  >
                    <item.icon className={`w-[18px] h-[18px] shrink-0 transition-colors duration-200 ${
                      isActive ? 'text-white' : 'text-gray-500 group-hover:text-[var(--primary)]'
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
          <div className="px-4 py-3 border-t border-white/10">
            <div className="text-[11px] text-gray-500 text-center">
              Magic Track v1.0
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
