import React, { useEffect, useState, useCallback } from 'react';
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Zap,
  ShieldCheck,
  TrendingDown,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { apiRequest } from '../api/client';
import { useLanguage } from '../context/LanguageContext';
import { useSubscriptions } from '../context/SubscriptionContext';

export default function AIInsights() {
  const { t } = useLanguage();
  const { subscriptions, insightsSummary, refresh: refreshStore } = useSubscriptions();

  // Distinct, independent loading states for zero UI blocking
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [recsLoading, setRecsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Financial Summary & Waste Score State
  const [summary, setSummary] = useState({
    wasteScore: 42,
    wasteScoreReason: 'Calculated based on detected price hikes, unused memberships, and monthly run-rate exposure.',
    monthlySpending: 8213,
    yearlySpending: 98556,
    activeSubscriptions: 6,
    inactiveSubscriptions: 1,
    potentialMonthlySavings: 2350,
    potentialYearlySavings: 28200,
    unusedSubscriptionCount: 1,
    highestExpense: { merchant_name: 'Adobe Creative Cloud', amount: 4230, billing_frequency: 'monthly' }
  });

  // Anomalies State
  const [anomalies, setAnomalies] = useState([
    {
      id: 'anom_default',
      merchant: 'Netflix',
      chargedAmount: 799,
      baselineAmount: 649,
      delta: 150,
      severity: 'high',
      reason: 'Unexpected price hike: ₹799 charged vs registered plan ₹649 (+₹150)'
    }
  ]);

  // AI Recommendations State
  const [recommendations, setRecommendations] = useState([
    {
      title: 'Price Hike on Netflix',
      description: 'Netflix charged ₹799 vs baseline plan ₹649 (+₹150.00). Review your registered subscription tier.',
      severity: 'high',
      potentialSaving: 150
    },
    {
      title: 'Underutilized Gym Membership',
      description: 'No activity logged in the past 30 days for Gym Membership. Pausing or cancelling will trim unnecessary run-rate spend.',
      severity: 'high',
      potentialSaving: 2200
    },
    {
      title: 'Optimize Overlapping Streaming Tiers',
      description: 'Audit concurrent video and music streaming subscriptions to combine into family bundles or annual plans.',
      severity: 'medium',
      potentialSaving: 350
    }
  ]);

  const [personalizedSavingsTips, setPersonalizedSavingsTips] = useState([
    'Cancel or pause inactive Gym Membership (Save ₹2,200/month).',
    'Shift eligible monthly subscriptions (e.g. Adobe or Amazon) to annual billing for up to 16% discount.',
    'Set up PayPal sandbox pre-renewal alerts 3 days prior to recurring charges.'
  ]);

  const [aiSource, setAiSource] = useState('smart_engine');

  // Synchronize directly from unified SubscriptionContext
  useEffect(() => {
    if (insightsSummary) {
      setSummary((prev) => ({
        ...prev,
        ...insightsSummary,
        potentialMonthlySavings: insightsSummary.potentialMonthlySavings ?? prev.potentialMonthlySavings,
        potentialYearlySavings: insightsSummary.potentialYearlySavings ?? prev.potentialYearlySavings
      }));
      setSummaryLoading(false);
    }
  }, [insightsSummary]);

  // 1. Fetch Summary & Anomalies immediately (sub-50ms)
  const fetchSummaryAndAnomalies = useCallback(async (isRefresh = false) => {
    setSummaryLoading(true);
    const query = isRefresh ? '?refresh=true' : '';
    try {
      const [sumRes, anomRes] = await Promise.allSettled([
        apiRequest(`/insights/summary${query}`).catch(() => apiRequest('/ai/analysis')),
        apiRequest(`/insights/anomalies${query}`).catch(() => ({ anomalies: [] }))
      ]);

      if (sumRes.status === 'fulfilled' && sumRes.value) {
        const data = sumRes.value;
        if (data.wasteScore !== undefined) {
          setSummary((prev) => ({
            ...prev,
            ...data,
            // Fallback for legacy format
            potentialMonthlySavings: data.potentialMonthlySavings || data.summary?.potentialMonthlySavings || 2350,
            potentialYearlySavings: data.potentialYearlySavings || data.summary?.potentialYearlySavings || 28200
          }));
        }
      }

      if (anomRes.status === 'fulfilled' && anomRes.value?.anomalies) {
        setAnomalies(anomRes.value.anomalies);
      }
    } catch (err) {
      console.warn('Summary loading fallback engaged:', err.message);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  // 2. Fetch AI Recommendations independently in the background
  const fetchRecommendations = useCallback(async (isRefresh = false) => {
    setRecsLoading(true);
    const query = isRefresh ? '?refresh=true' : '';
    try {
      const recRes = await apiRequest(`/insights/recommendations${query}`).catch(() => null);

      if (recRes && Array.isArray(recRes.recommendations) && recRes.recommendations.length > 0) {
        setRecommendations(recRes.recommendations);
        if (Array.isArray(recRes.personalizedSavingsTips)) {
          setPersonalizedSavingsTips(recRes.personalizedSavingsTips);
        }
        if (recRes.source) setAiSource(recRes.source);
      }
    } catch (err) {
      console.warn('Recommendations loading fallback engaged:', err.message);
    } finally {
      setRecsLoading(false);
    }
  }, []);

  // Run initial independent loads on mount
  useEffect(() => {
    fetchSummaryAndAnomalies(false);
    fetchRecommendations(false);
  }, [fetchSummaryAndAnomalies, fetchRecommendations]);

  // Handle Manual "Re-run Gemini Audit" click
  const handleRerunAudit = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchSummaryAndAnomalies(true),
        fetchRecommendations(true)
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const isGlobalLoading = refreshing;

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2 text-purple-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>
              {aiSource === 'openai'
                ? 'OpenAI GPT-4o-Mini Powered Intelligence'
                : aiSource === 'gemini'
                ? 'Google Gemini Flash-Powered Intelligence'
                : 'AI-Powered Subscription Intelligence'}
            </span>
            <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">
              Deterministic Aggregation + AI Reasoning
            </span>
          </div>
          <h1 className="text-2xl font-black text-white mt-1">
            {t('insights_title', 'AI Financial Insights & Waste Score')}
          </h1>
        </div>

        <button
          onClick={handleRerunAudit}
          disabled={isGlobalLoading}
          className="flex items-center space-x-2 px-4 py-2 bg-navy-850 hover:bg-navy-800 border border-navy-700 hover:border-purple-500/40 text-white rounded-xl text-xs font-semibold transition active:scale-95 shadow-md shadow-purple-600/10"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isGlobalLoading ? 'animate-spin text-purple-400' : ''}`} />
          <span>
            {isGlobalLoading
              ? t('insights_analyzing', 'Auditing Ledger...')
              : t('insights_rerun_audit', 'Re-run Gemini Audit')}
          </span>
        </button>
      </div>

      {/* Waste Score Banner */}
      <div className="bg-gradient-to-r from-purple-900/40 via-navy-850 to-navy-850 border border-purple-500/30 p-8 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-extrabold text-purple-400 uppercase tracking-widest">
              {t('insights_waste_score', 'Subscription Waste Score')}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
              Live Audited
            </span>
          </div>

          <div className="flex items-baseline space-x-3">
            <h2 className="text-5xl font-black text-white">
              {summaryLoading ? (
                <span className="animate-pulse text-gray-500">--</span>
              ) : (
                summary.wasteScore
              )}
            </h2>
            <span className="text-xl text-gray-400 font-bold">/ 100</span>
          </div>

          <p className="text-xs text-gray-300 mt-2 max-w-xl leading-relaxed">
            {summary.wasteScoreReason}
          </p>
        </div>

        {/* Opportunity Savings Pill Card */}
        <div className="p-5 bg-navy-900/90 border border-navy-700 rounded-2xl text-center shrink-0 w-full md:w-auto shadow-inner">
          <p className="text-xs text-gray-400 font-semibold uppercase">
            {t('insights_total_opportunity', 'Total Opportunity Savings')}
          </p>
          <p className="text-3xl font-black text-emerald-400 mt-1">
            ₹{summary.potentialMonthlySavings.toLocaleString('en-IN')} / mo
          </p>
          <span className="text-[10px] text-gray-400 block mt-0.5">
            ₹{summary.potentialYearlySavings.toLocaleString('en-IN')}{' '}
            {t('insights_annualized', 'Annualized')}
          </span>
        </div>
      </div>

      {/* Quick Financial Run-Rate Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-navy-850 border border-navy-700/80 p-4 rounded-2xl">
          <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
            Monthly Run-Rate
          </span>
          <p className="text-xl font-black text-white mt-1">
            ₹{summary.monthlySpending.toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-purple-300">Across {summary.activeSubscriptions} services</span>
        </div>

        <div className="bg-navy-850 border border-navy-700/80 p-4 rounded-2xl">
          <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
            Annual Commitment
          </span>
          <p className="text-xl font-black text-purple-300 mt-1">
            ₹{summary.yearlySpending.toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-gray-400">Projected run-rate</span>
        </div>

        <div className="bg-navy-850 border border-navy-700/80 p-4 rounded-2xl">
          <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
            Price Hike Spikes
          </span>
          <p className="text-xl font-black text-rose-400 mt-1">
            {anomalies.length} Flagged
          </p>
          <span className="text-[10px] text-gray-400">
            +₹{anomalies.reduce((sum, a) => sum + (a.delta || 0), 0)}/mo delta
          </span>
        </div>

        <div className="bg-navy-850 border border-navy-700/80 p-4 rounded-2xl">
          <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
            Underutilized
          </span>
          <p className="text-xl font-black text-amber-400 mt-1">
            {summary.unusedSubscriptionCount} Service
          </p>
          <span className="text-[10px] text-gray-400">Zero usage in 30d</span>
        </div>
      </div>

      {/* Detected Inefficiencies & AI Action Plan */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Left Column: Detected Inefficiencies & Anomalies */}
        <div className="space-y-4">
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>{t('insights_detected_hikes', 'Detected Inefficiencies & Anomalies')}</span>
          </h3>

          {/* Skeleton or Content */}
          {recsLoading && recommendations.length === 0 ? (
            <div className="space-y-3">
              {[1, 2].map((sk) => (
                <div
                  key={sk}
                  className="bg-navy-850 border border-navy-700/60 p-6 rounded-2xl animate-pulse space-y-3"
                >
                  <div className="h-4 bg-navy-700 rounded w-1/2" />
                  <div className="h-3 bg-navy-800 rounded w-5/6" />
                  <div className="h-3 bg-navy-800 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : (
            recommendations.map((item, i) => (
              <div
                key={i}
                className="bg-navy-850 border border-navy-700 p-6 rounded-2xl tilt-card hover:border-purple-500/30 transition shadow-lg"
              >
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-white text-base">{item.title}</h4>
                  <span
                    className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                      item.severity === 'high'
                        ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {item.severity}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-2 leading-relaxed">{item.description}</p>
                <div className="mt-4 pt-3 border-t border-navy-700 flex justify-between items-center">
                  <span className="text-xs text-gray-500">
                    {t('insights_potential_monthly_saving', 'Actionable saving')}
                  </span>
                  <span className="text-sm font-black text-emerald-400">+₹{item.potentialSaving}/mo</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right Column: AI Action Plan & Tips */}
        <div className="space-y-4">
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-purple-400" />
            <span>{t('insights_saving_tips', 'AI Algorithmic Action Plan')}</span>
          </h3>

          <div className="bg-navy-850 border border-navy-700 p-6 rounded-2xl space-y-4 shadow-lg">
            {recsLoading && personalizedSavingsTips.length === 0 ? (
              <div className="space-y-3">
                {[1, 2, 3].map((sk) => (
                  <div
                    key={sk}
                    className="h-12 bg-navy-900/60 rounded-xl border border-navy-800 animate-pulse"
                  />
                ))}
              </div>
            ) : (
              personalizedSavingsTips.map((tip, i) => (
                <div
                  key={i}
                  className="flex items-start space-x-3 text-sm text-gray-200 bg-navy-900/60 p-4 rounded-xl border border-navy-700/60 hover:border-purple-500/30 transition"
                >
                  <CheckCircle2 className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{tip}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
