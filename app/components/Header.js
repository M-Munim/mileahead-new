'use client';

import { useMemo } from 'react';
import { Bell, Settings, Menu, LogOut, Shield, UserCog } from 'lucide-react';
import { useAuth, ROLES } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function Header({ title, toggleSidebar }) {
  const { logout, user, roleName, role } = useAuth();
  const router = useRouter();

  const roleIcons = {
    [ROLES.ADMIN]: Shield,
    [ROLES.MANAGER]: UserCog,
  };

  const roleColors = {
    [ROLES.ADMIN]: 'bg-[var(--primary)]',
    [ROLES.MANAGER]: 'bg-neutral-600',
  };

  const roleBadgeColors = {
    [ROLES.ADMIN]: 'bg-orange-100 text-orange-800',
    [ROLES.MANAGER]: 'bg-gray-100 text-gray-800',
  };

  const RoleIcon = role ? roleIcons[role] : Shield;

  const avatarInitials = useMemo(() => {
    return user?.username?.[0]?.toUpperCase() ?? 'U';
  }, [user?.username]);

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  return (
    <div className="animate-fade-in bg-gradient-to-r from-[var(--brand-black)] via-[var(--brand-black-soft)] to-[#2a2a2a] border-b-[3px] border-[var(--primary)] p-4 md:p-5 mb-6 relative overflow-hidden">
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-[0.05]">
        <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 200" aria-hidden="true">
          <path d="M0,100 Q250,150 500,100 T1000,100 L1000,200 L0,200 Z" fill="white" />
        </svg>
      </div>

      <div className="relative flex items-center justify-between gap-3">
        {/* Left Section */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            className="btn-icon lg:hidden w-9 h-9 bg-white/20 flex items-center justify-center hover:bg-white/30 transition-all flex-shrink-0"
            onClick={toggleSidebar}
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5 text-white" aria-hidden="true" />
          </button>

          <h1 className="text-white text-lg md:text-xl font-semibold truncate tracking-tight">
            {title}
          </h1>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Icon Buttons */}
          <div className="flex items-center gap-1.5">
            <button className="btn-icon w-9 h-9 bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all" title="Settings" aria-label="Settings">
              <Settings className="w-[18px] h-[18px] text-white/80" aria-hidden="true" />
            </button>

            <button className="btn-icon relative w-9 h-9 bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all" title="Notifications" aria-label="Notifications">
              <Bell className="w-[18px] h-[18px] text-white/80" aria-hidden="true" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-400 rounded-full ring-2 ring-[var(--brand-black-soft)]"></span>
            </button>

            <button
              className="btn-icon w-9 h-9 bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all"
              onClick={handleLogout}
              aria-label="Logout"
              title="Logout"
            >
              <LogOut className="w-[18px] h-[18px] text-white/80" aria-hidden="true" />
            </button>
          </div>

          {/* Divider */}
          <div className="hidden sm:block w-px h-8 bg-white/15"></div>

          {/* User Profile */}
          <div className="flex items-center gap-3">
            {/* User info - hidden on mobile */}
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-white font-medium text-sm leading-tight">
                {user ? user.username : 'User'}
              </span>
              <span className="text-white/60 text-xs leading-tight mt-0.5">
                {user ? user.email : ''}
              </span>
            </div>

            {/* Avatar + Role Badge Group */}
            <div className="relative">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm ring-2 ring-white/25 ${roleColors[role] || 'bg-[var(--primary)]'}`}>
                {avatarInitials}
              </div>
              {roleName && (
                <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-0.5 px-1.5 py-[1px] rounded-full text-[9px] font-semibold whitespace-nowrap shadow-sm ${roleBadgeColors[role] || 'bg-gray-100 text-gray-600'}`}>
                  <RoleIcon className="w-2 h-2" aria-hidden="true" />
                  {roleName}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
