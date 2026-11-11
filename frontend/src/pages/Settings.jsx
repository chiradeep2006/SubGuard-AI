import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage, LANGUAGES } from '../context/LanguageContext';
import { User, Bell, Shield, Save, Check, Globe, CheckCircle2 } from 'lucide-react';

export default function Settings() {
  const { user } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [budget, setBudget] = useState('5000');
  const [currency, setCurrency] = useState('INR');
  const [notifyRenewal, setNotifyRenewal] = useState(true);
  const [renewalDays, setRenewalDays] = useState(3);
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="p-8 space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-white">
            {t('settings_title', 'Settings & Preferences')}
          </h1>
          <p className="text-sm text-gray-400">
            {t('settings_subtitle', 'Configure profile, language, currency, and AI alert thresholds')}
          </p>
        </div>
        {saved && (
          <span className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold rounded-xl animate-bounce">
            <Check className="w-4 h-4" />
            <span>{t('settings_saved', 'Settings Saved!')}</span>
          </span>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Language & Regional Localization Card */}
        <div className="bg-navy-850 border border-navy-700 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Globe className="w-4 h-4 text-purple-400" />
              <span>{t('settings_language', 'Language & Regional Localization')}</span>
            </h3>
            <span className="text-[11px] font-semibold text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2.5 py-0.5 rounded-full">
              6 Languages Available
            </span>
          </div>
          <p className="text-xs text-gray-400">
            {t('settings_language_desc', 'Choose your preferred interface language across the platform')}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
            {LANGUAGES.map((lang) => {
              const isSelected = language === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => setLanguage(lang.code)}
                  className={`p-3.5 rounded-xl border text-left transition relative flex flex-col justify-between ${
                    isSelected
                      ? 'bg-purple-600/20 border-purple-500 shadow-md shadow-purple-600/20 ring-1 ring-purple-500'
                      : 'bg-navy-900 border-navy-700 hover:border-navy-600 hover:bg-navy-850 text-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl leading-none">{lang.flag}</span>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-purple-400" />
                    )}
                  </div>
                  <div>
                    <p className={`font-bold text-sm ${isSelected ? 'text-white' : 'text-gray-200'}`}>
                      {lang.native}
                    </p>
                    <p className="text-[11px] text-gray-400">{lang.name}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Profile Card */}
        <div className="bg-navy-850 border border-navy-700 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <User className="w-4 h-4 text-purple-400" />
            <span>{t('settings_profile', 'Profile Information')}</span>
          </h3>
          <div>
            <label className="text-xs text-gray-400 font-medium">Email Address</label>
            <input
              type="text"
              disabled
              value={user?.email || 'admin@subguard.ai'}
              className="w-full mt-1 px-4 py-2 bg-navy-900 border border-navy-700 rounded-xl text-gray-400 text-sm cursor-not-allowed"
            />
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-navy-850 border border-navy-700 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <Shield className="w-4 h-4 text-purple-400" />
            <span>{t('settings_thresholds', 'Financial Thresholds & Budget')}</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 font-medium">
                {t('settings_monthly_ceiling', 'Monthly Spending Ceiling')} ({currency === 'INR' ? '₹' : '$'})
              </label>
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full mt-1 px-4 py-2.5 bg-navy-900 border border-navy-700 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium">
                {t('settings_currency', 'Primary Reporting Currency')}
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full mt-1 px-4 py-2.5 bg-navy-900 border border-navy-700 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500"
              >
                <option value="INR">INR (₹) - Indian Rupee</option>
                <option value="USD">USD ($) - US Dollar</option>
                <option value="EUR">EUR (€) - Euro</option>
                <option value="GBP">GBP (£) - British Pound</option>
              </select>
            </div>
          </div>
        </div>

        {/* Alerts & Pre-warning */}
        <div className="bg-navy-850 border border-navy-700 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <Bell className="w-4 h-4 text-purple-400" />
            <span>{t('settings_notifications', 'Autonomous Renewal Notifications')}</span>
          </h3>
          <div className="space-y-3">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyRenewal}
                onChange={(e) => setNotifyRenewal(e.target.checked)}
                className="w-4 h-4 rounded text-purple-600 focus:ring-0 bg-navy-900 border-navy-700"
              />
              <span className="text-sm text-gray-200">
                Trigger renewal pre-warning alerts prior to charge date
              </span>
            </label>

            <div className="pl-7">
              <label className="text-xs text-gray-400">Pre-warning Notice Window</label>
              <select
                value={renewalDays}
                onChange={(e) => setRenewalDays(Number(e.target.value))}
                className="mt-1 block px-3 py-1.5 bg-navy-900 border border-navy-700 rounded-lg text-white text-xs focus:outline-none focus:border-purple-500"
              >
                <option value={1}>24 Hours Prior (1 Day)</option>
                <option value={3}>72 Hours Prior (3 Days - Recommended)</option>
                <option value={7}>7 Days Prior (1 Week)</option>
              </select>
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="flex items-center space-x-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl text-sm shadow-lg shadow-purple-600/30 transition hover:scale-105"
        >
          <Save className="w-4 h-4" />
          <span>{t('settings_save', 'Save All Preferences')}</span>
        </button>
      </form>
    </div>
  );
}
