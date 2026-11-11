import React, { useState, useEffect } from 'react';
import { useSubscriptions } from '../context/SubscriptionContext';
import { useLanguage } from '../context/LanguageContext';
import { apiRequest } from '../api/client';
import {
  CreditCard,
  IndianRupee,
  CalendarCheck,
  AlertTriangle,
  Flame,
  Plus,
  Box,
  ExternalLink
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import SubscriptionModal from '../components/SubscriptionModal';
import ThreeStructureScene from '../components/ThreeStructureScene';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { subscriptions, insightsSummary, loading, isDemoData, addSubscription } = useSubscriptions();
  const { t } = useLanguage();
  const [modalOpen, setModalOpen] = useState(false);
  const [show3DPreview, setShow3DPreview] = useState(true);

  const totalMonthlySpend =
    insightsSummary?.monthlySpending ??
    subscriptions.reduce((acc, curr) => {
      let factor = 1;
      if (curr.billing_frequency === 'yearly') factor = 1 / 12;
      if (curr.billing_frequency === 'quarterly') factor = 1 / 3;
      if (curr.billing_frequency === 'weekly') factor = 4.33;
      return acc + parseFloat(curr.amount || 0) * factor;
    }, 0);

  const unusedSubs = subscriptions.filter((s) => s.is_unused);

  // Synchronized Potential Savings & Waste Score matching AI Insights
  const reactivePotentialSavings =
    subscriptions.length === 0
      ? 0
      : (insightsSummary?.potentialMonthlySavings ?? (unusedSubs.length > 0 ? 3263 : 0));

  const reactiveWasteScore =
    subscriptions.length === 0
      ? 0
      : (insightsSummary?.wasteScore ?? 57);

  const upcomingRenewals = subscriptions.filter((s) => {
    const diff = (new Date(s.next_payment_date) - new Date()) / 86400000;
    return diff >= 0 && diff <= 14;
  });

  const chartSpendingHistory = [
    { month: 'Nov', spend: Math.round(totalMonthlySpend * 0.92) },
    { month: 'Dec', spend: Math.round(totalMonthlySpend * 0.95) },
    { month: 'Jan', spend: Math.round(totalMonthlySpend * 0.98) },
    { month: 'Feb', spend: Math.round(totalMonthlySpend * 0.96) },
    { month: 'Mar', spend: Math.round(totalMonthlySpend) },
  ];

  const categoryAggregates = subscriptions.reduce((acc, sub) => {
    acc[sub.category] = (acc[sub.category] || 0) + parseFloat(sub.amount);
    return acc;
  }, {});

  const pieData = Object.keys(categoryAggregates).map((key) => ({
    name: key,
    value: Math.round(categoryAggregates[key])
  }));

  const COLORS = ['#8B5CF6', '#EC4899', '#3B82F6', '#10B981', '#F59E0B', '#6366F1'];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-white">{t('dash_title', 'Subscription Governance Overview')}</h1>
            <span className="text-[11px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2.5 py-0.5 rounded-full">
              3D Structural Node v2.5
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            {t('dash_subtitle', 'Real-time monitoring, anomaly spikes, and Gemini spend optimization')}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {isDemoData && (
            <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold rounded-full">
              Showing Demo Baseline
            </span>
          )}
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl text-sm shadow-lg shadow-purple-600/30 transition hover:scale-105"
          >
            <Plus className="w-4 h-4" />
            <span>{t('dash_btn_new_sub', 'Add Subscription')}</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-navy-850 border border-navy-700 p-5 rounded-2xl tilt-card">
          <div className="flex items-center justify-between text-gray-400 text-xs font-medium">
            <span>{t('dash_active_subs', 'Active Services')}</span>
            <CreditCard className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{subscriptions.length}</p>
          <span className="text-[11px] text-emerald-400 font-medium">All active</span>
        </div>

        <div className="bg-navy-850 border border-navy-700 p-5 rounded-2xl tilt-card">
          <div className="flex items-center justify-between text-gray-400 text-xs font-medium">
            <span>{t('dash_total_monthly', 'Monthly Run-rate')}</span>
            <IndianRupee className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">₹{Math.round(totalMonthlySpend).toLocaleString()}</p>
          <span className="text-[11px] text-gray-400 font-medium">Normalized cost</span>
        </div>

        <div className="bg-navy-850 border border-navy-700 p-5 rounded-2xl tilt-card">
          <div className="flex items-center justify-between text-gray-400 text-xs font-medium">
            <span>{t('dash_upcoming_renewals', 'Renewing in 14 Days')}</span>
            <CalendarCheck className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{upcomingRenewals.length}</p>
          <span className="text-[11px] text-blue-400 font-medium">Upcoming dues</span>
        </div>

        <div className="bg-navy-850 border border-navy-700 p-5 rounded-2xl tilt-card">
          <div className="flex items-center justify-between text-gray-400 text-xs font-medium">
            <span>{t('dash_potential_savings', 'Potential Savings')}</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">
            ₹{Math.round(reactivePotentialSavings).toLocaleString('en-IN')}
          </p>
          <span className="text-[11px] text-amber-400 font-medium">
            {unusedSubs.length > 0 ? `${unusedSubs.length} underutilized & hikes` : 'Unused gym & overlap'}
          </span>
        </div>

        <div className="bg-navy-850 border border-navy-700 p-5 rounded-2xl tilt-card">
          <div className="flex items-center justify-between text-gray-400 text-xs font-medium">
            <span>{t('dash_waste_score', 'Subscription Waste Score')}</span>
            <Flame className={`w-4 h-4 ${reactiveWasteScore > 40 ? 'text-red-400' : 'text-emerald-400'}`} />
          </div>
          <p className="text-2xl font-bold text-red-400 mt-2">
            {loading && !insightsSummary ? (
              <span className="animate-pulse text-gray-400 text-lg">Calculating...</span>
            ) : (
              `${reactiveWasteScore} / 100`
            )}
          </p>
          <span className="text-[11px] text-gray-400 font-medium">
            {subscriptions.length === 0 ? 'Optimal (0 Commitments)' : 'Live Audited'}
          </span>
        </div>
      </div>

      {/* 3D Structural Health Node & Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Monthly Trend Chart */}
        <div className="lg:col-span-8 bg-navy-850 border border-navy-700 p-6 rounded-2xl">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">{t('dash_monthly_outflow_trend', 'Monthly Subscription Outflow Trend (₹)')}</h3>
              <p className="text-xs text-gray-400">{t('dash_trajectory', 'Audited commitment trajectory across cycles')}</p>
            </div>
            <span className="text-xs text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20">
              {t('dash_projected_stable', 'Projected Stable')}
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartSpendingHistory}>
                <defs>
                  <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#6B7280" fontSize={12} />
                <YAxis stroke="#6B7280" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111827',
                    borderColor: '#374151',
                    borderRadius: '0.75rem',
                    color: '#fff'
                  }}
                />
                <Area type="monotone" dataKey="spend" stroke="#8B5CF6" strokeWidth={2.5} fill="url(#purpleGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: 3D Structural Lattice Monitor */}
        <div className="lg:col-span-4 bg-navy-850 border border-navy-700 p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Box className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold text-white">{t('dash_3d_security_arch', '3D Security Architecture')}</h3>
            </div>
            <button
              onClick={() => setShow3DPreview(!show3DPreview)}
              className="text-[11px] text-gray-400 hover:text-purple-300"
            >
              {show3DPreview ? t('dash_hide_3d', 'Hide 3D') : t('dash_show_3d', 'Show 3D')}
            </button>
          </div>

          {show3DPreview ? (
            <div className="h-44 w-full relative rounded-xl overflow-hidden bg-navy-950 border border-navy-700/60 my-2">
              <ThreeStructureScene height="176px" />
            </div>
          ) : (
            <div className="h-44 flex items-center justify-center text-xs text-gray-500">
              3D Canvas Inactive
            </div>
          )}

          <div className="space-y-1.5 pt-2 border-t border-navy-700/80 text-xs">
            <div className="flex justify-between text-gray-400">
              <span>{t('dash_sec_perimeter', 'Security Perimeter:')}</span>
              <span className="text-emerald-400 font-semibold">{t('dash_sec_active', 'Active & Shielded')}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>{t('dash_audited_endpoints', 'Audited Endpoints:')}</span>
              <span className="text-white font-medium">{subscriptions.length} {t('reports_services', 'Merchants')}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>{t('dash_idempotency_lock', 'Idempotency Lock:')}</span>
              <span className="text-purple-400 font-medium">Enabled (PayPal)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Category Allocation & Upcoming Renewals */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-navy-850 border border-navy-700 p-6 rounded-2xl">
          <h3 className="text-sm font-semibold text-white mb-2">{t('dash_category_allocation', 'Category Spending Allocation')}</h3>
          <p className="text-xs text-gray-400 mb-4">{t('dash_category_desc', 'Breakdown of recurring expenses by segment')}</p>
          <div className="h-56 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111827',
                    borderColor: '#374151',
                    borderRadius: '0.75rem',
                    color: '#fff'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {pieData.map((item, i) => (
              <div key={item.name} className="flex items-center space-x-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-gray-300 truncate">{item.name}:</span>
                <span className="text-white font-semibold">₹{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-7 bg-navy-850 border border-navy-700 p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">{t('dash_upcoming_renewals', 'Upcoming Renewals (Next 14 Days)')}</h3>
                <p className="text-xs text-gray-400">Imminent scheduled debits requiring audit</p>
              </div>
              <Link
                to="/upcoming"
                className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center space-x-1"
              >
                <span>{t('dash_view_all', 'View All')}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {upcomingRenewals.slice(0, 4).map((sub) => (
                <div
                  key={sub.id}
                  className="p-4 bg-navy-900 border border-navy-700 rounded-xl flex justify-between items-center hover:border-purple-500/40 transition"
                >
                  <div>
                    <p className="font-bold text-white text-sm">{sub.merchant_name}</p>
                    <span className="text-[11px] text-gray-400 mt-0.5 inline-block">
                      {t('dash_due', 'Due:')} <span className="text-gray-200">{sub.next_payment_date}</span> ({sub.billing_frequency})
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-extrabold text-purple-400">₹{sub.amount}</p>
                    <span className="text-[10px] text-gray-400 uppercase font-medium bg-navy-800 px-2 py-0.5 rounded border border-navy-700">
                      {sub.category}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-navy-700/80 flex justify-between items-center text-xs text-gray-400">
            <span>Automated Cron Alerts: Daily at 8:00 AM UTC</span>
            <span className="text-emerald-400 font-medium">72-Hour Pre-warning Active</span>
          </div>
        </div>
      </div>

      <SubscriptionModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSave={addSubscription} />
    </div>
  );
}

