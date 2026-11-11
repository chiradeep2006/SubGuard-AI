import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';

export default function Navbar() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <header className="h-16 bg-navy-900/80 backdrop-blur-md border-b border-navy-700/80 px-6 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center space-x-3">
        <div className="bg-purple-600 p-1.5 rounded-lg text-white shadow-md shadow-purple-600/30">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <span className="font-bold text-white text-base hidden sm:inline-block">SubGuard AI</span>
        <span className="text-xs bg-purple-900/50 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-medium">
          3D Structural Mesh
        </span>
      </div>

      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* Multilingual Selector */}
        <LanguageSwitcher />

        <button
          onClick={() => navigate('/upcoming')}
          className="relative p-2 text-gray-400 hover:text-white rounded-lg hover:bg-navy-800 transition"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-purple-500 rounded-full animate-ping" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-purple-500 rounded-full" />
        </button>

        <div className="h-6 w-[1px] bg-navy-700 hidden sm:block" />

        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-xs font-bold text-purple-300">
            {user?.email ? user.email.slice(0, 2).toUpperCase() : 'SG'}
          </div>
          <span className="text-xs text-gray-300 font-medium hidden md:inline-block">
            {user?.email || 'admin@subguard.ai'}
          </span>
        </div>
      </div>
    </header>
  );
}
