import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CreditCard,
  CalendarClock,
  History,
  Sparkles,
  BotMessageSquare,
  BarChart3,
  Settings,
  LogOut,
  ShieldCheck,
  Cuboid
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function Sidebar() {
  const { logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const navItems = [
    { label: t('nav_overview', 'Overview'), to: '/dashboard', icon: LayoutDashboard },
    { label: t('nav_subscriptions', 'My Subscriptions'), to: '/subscriptions', icon: CreditCard },
    { label: t('nav_upcoming', 'Upcoming Payments'), to: '/upcoming', icon: CalendarClock },
    { label: t('nav_transactions', 'Transaction History'), to: '/transactions', icon: History },
    { label: t('nav_ai_insights', 'AI Insights'), to: '/ai-insights', icon: Sparkles },
    { label: t('nav_assistant', 'AI Assistant'), to: '/assistant', icon: BotMessageSquare },
    { label: t('nav_reports', 'Reports & Analytics'), to: '/reports', icon: BarChart3 },
    { label: t('nav_settings', 'Settings'), to: '/settings', icon: Settings },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 bg-navy-900 border-r border-navy-700/80 flex flex-col justify-between shrink-0 h-screen sticky top-0 z-30">
      <div>
        {/* Brand */}
        <div className="p-6 flex items-center space-x-3 border-b border-navy-800">
          <div className="bg-purple-600 p-2 rounded-xl text-white shadow-lg shadow-purple-600/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-purple-400">
              SubGuard AI
            </h1>
            <div className="flex items-center space-x-1 mt-0.5">
              <Cuboid className="w-3 h-3 text-purple-400" />
              <p className="text-[11px] text-gray-400 font-medium">
                {t('brand_sub', '3D Fintech Intelligence')}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20 font-semibold'
                      : 'text-gray-400 hover:text-white hover:bg-navy-800/80'
                  }`
                }
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Logout */}
      <div className="p-4 border-t border-navy-800">
        <button
          onClick={handleLogout}
          className="flex items-center space-x-3 w-full px-4 py-3 text-sm font-medium text-red-400 hover:bg-red-500/10 rounded-xl transition"
        >
          <LogOut className="w-5 h-5" />
          <span>{t('nav_logout', 'Logout')}</span>
        </button>
      </div>
    </aside>
  );
}
