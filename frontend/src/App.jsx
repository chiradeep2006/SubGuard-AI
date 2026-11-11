import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SubscriptionProvider } from './context/SubscriptionContext';
import { LanguageProvider } from './context/LanguageContext';

import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import Subscriptions from './pages/Subscriptions';
import UpcomingPayments from './pages/UpcomingPayments';
import Transactions from './pages/Transactions';
import AIInsights from './pages/AIInsights';
import AIAssistant from './pages/AIAssistant';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

// Protected Route Guard: Strictly blocks direct access to 3D dashboard unless verified via login + OTP
function ProtectedLayout() {
  const { user } = useAuth();

  if (!user || !user.otp_verified) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen bg-navy-950 text-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/subscriptions" element={<Subscriptions />} />
            <Route path="/upcoming" element={<UpcomingPayments />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/ai-insights" element={<AIInsights />} />
            <Route path="/assistant" element={<AIAssistant />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <SubscriptionProvider>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<AuthPage />} />
              <Route path="/*" element={<ProtectedLayout />} />
            </Routes>
          </SubscriptionProvider>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}
