import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Zap,
  Sparkles,
  BellRing,
  ArrowRight,
  TrendingDown,
  Layers,
  Box,
  CheckCircle2,
  Lock,
  KeyRound
} from 'lucide-react';
import ThreeStructureScene from '../components/ThreeStructureScene';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useLanguage } from '../context/LanguageContext';

export default function LandingPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleLaunchDashboard = () => {
    // Strictly directs user through the login + OTP verification pipeline
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-navy-950 text-gray-100 flex flex-col justify-between selection:bg-purple-600">
      {/* Background glowing gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/15 rounded-full blur-[128px]" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-pink-600/10 rounded-full blur-[128px]" />
      </div>

      {/* Header */}
      <nav className="max-w-7xl mx-auto px-6 h-20 w-full flex items-center justify-between border-b border-navy-800/80 z-20 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-tr from-purple-700 to-indigo-600 rounded-2xl text-white shadow-lg shadow-purple-600/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xl font-extrabold tracking-tight text-white">SubGuard AI</span>
            <span className="ml-2 text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full">
              3D Structural
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* Language Switcher */}
          <LanguageSwitcher />

          <Link
            to="/login"
            className="px-3.5 py-2 text-sm font-semibold text-gray-300 hover:text-white transition hidden sm:inline-block"
          >
            {t('btn_login', 'Login')}
          </Link>
          <Link
            to="/login"
            className="px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-lg shadow-purple-600/30 transition hover:scale-105 flex items-center space-x-1.5"
          >
            <KeyRound className="w-4 h-4" />
            <span>{t('btn_launch_2fa', 'Launch with 2FA')}</span>
          </Link>
        </div>
      </nav>

      {/* Hero Section with 3D Structural WebGL Scene */}
      <main className="max-w-7xl mx-auto px-6 pt-12 pb-20 relative z-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Text */}
          <div className="lg:col-span-7 text-left space-y-6">
            <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-purple-900/40 border border-purple-500/30 text-purple-300 text-xs font-semibold backdrop-blur-sm shadow-inner">
              <Sparkles className="w-4 h-4 text-purple-400 animate-spin" style={{ animationDuration: '6s' }} />
              <span>{t('hero_badge', 'Next-Gen 3D Structural Subscription Governance')}</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.15]">
              {t('hero_title_1', 'Never Lose Money on')} <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400">
                {t('hero_title_2', 'Forgotten Subscriptions')}
              </span>.
            </h1>

            <p className="text-base sm:text-lg text-gray-400 max-w-xl font-normal leading-relaxed">
              {t('hero_desc', 'SubGuard AI provides a multi-tier structural defense architecture against stealth charges. Automatically detect recurring periodicity, predict renewal dates, uncover hidden price spikes, and optimize waste scores with Google Gemini.')}
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <button
                  onClick={handleLaunchDashboard}
                  className="px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-2xl flex items-center justify-center space-x-2 shadow-xl shadow-purple-600/30 transition hover:scale-[1.02]"
                >
                  <Lock className="w-4 h-4 text-purple-200" />
                  <span>{t('btn_launch_dashboard', 'Authenticate & Launch 3D Dashboard')}</span>
                  <ArrowRight className="w-5 h-5 ml-1" />
                </button>
                <a
                  href="#features"
                  className="px-7 py-4 bg-navy-850 hover:bg-navy-800 text-gray-200 font-semibold rounded-2xl border border-navy-700 flex items-center justify-center space-x-2 transition"
                >
                  <Layers className="w-4 h-4 text-purple-400" />
                  <span>{t('btn_explore_arch', 'Explore Architecture')}</span>
                </a>
              </div>
              <p className="text-xs text-purple-300/80 font-medium flex items-center space-x-1.5">
                <KeyRound className="w-3.5 h-3.5 text-purple-400" />
                <span>{t('security_notice', 'Protected by 2FA OTP verification: You will verify credentials & code before dashboard access')}</span>
              </p>
            </div>

            {/* Quick Badges */}
            <div className="flex flex-wrap gap-4 pt-4 text-xs text-gray-400">
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{t('badge_2fa', '2FA OTP Verification Guarded')}</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-purple-400" />
                <span>{t('badge_gemini', 'Interactive Gemini AI Chatbot')}</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-400" />
                <span>{t('badge_paypal', 'PayPal Sandbox Idempotent')}</span>
              </div>
            </div>
          </div>

          {/* Right: Interactive 3D Structural Scene */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-3xl overflow-hidden border border-purple-500/20 bg-gradient-to-b from-navy-850 to-navy-900/90 shadow-2xl backdrop-blur-xl p-2">
              <div className="absolute top-4 left-4 z-20 flex items-center space-x-2 px-3 py-1 bg-navy-900/80 border border-purple-500/30 rounded-xl text-[11px] text-purple-300 backdrop-blur-md">
                <Box className="w-3.5 h-3.5 text-purple-400 animate-bounce" />
                <span>{t('scene_interactive', 'Interactive 3D Security Lattice • Hover to Rotate')}</span>
              </div>

              {/* Three.js 3D Structural Scene */}
              <ThreeStructureScene height="440px" />

              {/* Floating Live Metric Overlay */}
              <div className="absolute bottom-4 left-4 right-4 z-20 flex justify-between gap-3">
                <div className="flex-1 p-3 bg-navy-900/80 border border-navy-700/80 rounded-xl backdrop-blur-md">
                  <p className="text-[10px] text-gray-400 uppercase font-semibold">Tracked Nodes</p>
                  <p className="text-lg font-bold text-white">6 Services</p>
                </div>
                <div className="flex-1 p-3 bg-navy-900/80 border border-purple-500/30 rounded-xl backdrop-blur-md">
                  <p className="text-[10px] text-purple-400 uppercase font-semibold">Integrity Score</p>
                  <p className="text-lg font-bold text-purple-300">99.4%</p>
                </div>
                <div className="flex-1 p-3 bg-navy-900/80 border border-navy-700/80 rounded-xl backdrop-blur-md">
                  <p className="text-[10px] text-emerald-400 uppercase font-semibold">Saved Monthly</p>
                  <p className="text-lg font-bold text-emerald-400">₹2,350</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Demo Metric Cards with 3D Tilt */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 text-left">
          {[
            { label: t('stat_avg_savings', 'Avg Monthly Savings'), value: '₹2,450', note: 'Illustrative Demo Metric' },
            { label: t('stat_price_hikes', 'Price Hikes Prevented'), value: '18.4%', note: 'Illustrative Demo Metric' },
            { label: t('stat_detection_acc', 'Detection Accuracy'), value: '99.4%', note: 'Algorithmic Standard' },
            { label: t('stat_renewal_alert', 'Renewal Pre-warning'), value: '72 Hours', note: 'Configurable Alert' }
          ].map((stat, i) => (
            <div
              key={i}
              className="bg-navy-850 border border-navy-700/80 p-6 rounded-2xl tilt-card shadow-lg hover:border-purple-500/40"
            >
              <p className="text-3xl font-extrabold text-white tracking-tight">{stat.value}</p>
              <p className="text-sm font-semibold text-gray-300 mt-1">{stat.label}</p>
              <p className="text-[10px] text-purple-400 mt-2 uppercase font-bold tracking-wider">{stat.note}</p>
            </div>
          ))}
        </div>

        {/* 3D Structural Capability Architecture */}
        <section id="features" className="mt-32 text-left">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs uppercase font-extrabold tracking-widest text-purple-400 mb-2">
              {t('features_subtitle', 'Three-Tier Structural Defense')}
            </h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-white">
              {t('features_title', 'Engineered For Complete Financial Clarity')}
            </h3>
            <p className="text-sm text-gray-400 mt-3">
              {t('features_desc', 'Combining deterministic algorithmic analysis with Google Gemini LLM reasoning and PayPal sandbox reconciliation.')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-navy-850 border border-navy-700/80 p-7 rounded-3xl tilt-card hover:border-purple-500/40 relative overflow-hidden group">
              <div className="p-3 bg-purple-500/10 text-purple-400 rounded-2xl w-fit mb-5 border border-purple-500/20 group-hover:scale-110 transition">
                <Zap className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-white">{t('layer_1_title', '1. Recurring Engine Layer')}</h4>
              <p className="mt-2 text-sm text-gray-400 leading-relaxed">
                {t('layer_1_desc', 'Rule-based algorithmic periodicity analysis detects weekly, monthly, quarterly, and annual frequency patterns with strict matching tolerance.')}
              </p>
            </div>

            <div className="bg-navy-850 border border-navy-700/80 p-7 rounded-3xl tilt-card hover:border-pink-500/40 relative overflow-hidden group">
              <div className="p-3 bg-pink-500/10 text-pink-400 rounded-2xl w-fit mb-5 border border-pink-500/20 group-hover:scale-110 transition">
                <TrendingDown className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-white">{t('layer_2_title', '2. Anomaly Spike Layer')}</h4>
              <p className="mt-2 text-sm text-gray-400 leading-relaxed">
                {t('layer_2_desc', 'Instant anomaly flags when recurring merchant amounts spike compared to your verified subscription baseline, highlighting delta increases immediately.')}
              </p>
            </div>

            <div className="bg-navy-850 border border-navy-700/80 p-7 rounded-3xl tilt-card hover:border-indigo-500/40 relative overflow-hidden group">
              <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl w-fit mb-5 border border-indigo-500/20 group-hover:scale-110 transition">
                <BellRing className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-white">{t('layer_3_title', '3. Gemini Intelligence Layer')}</h4>
              <p className="mt-2 text-sm text-gray-400 leading-relaxed">
                {t('layer_3_desc', 'Grounded conversational assistance and calculated Subscription Waste Scores with actionable recommendations and zero hallucinations.')}
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-navy-800/80 py-10 px-6 text-center text-xs text-gray-500 z-10 bg-navy-950">
        <p>© 2026 SubGuard AI • 3D Structural Subscription Management Platform. All demo metrics are illustrative.</p>
      </footer>
    </div>
  );
}
