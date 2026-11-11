import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { useAuth } from './AuthContext';

const SubscriptionContext = createContext();

const INITIAL_DEMO_SUBS = [
  { id: '1', merchant_name: 'Netflix Premium', category: 'Entertainment', amount: 649, currency: 'INR', billing_frequency: 'monthly', start_date: '2025-01-14', next_payment_date: '2026-04-14', status: 'active', is_unused: false },
  { id: '2', merchant_name: 'Spotify Family', category: 'Entertainment', amount: 179, currency: 'INR', billing_frequency: 'monthly', start_date: '2025-02-18', next_payment_date: '2026-04-18', status: 'active', is_unused: false },
  { id: '3', merchant_name: 'GitHub Copilot Pro', category: 'Productivity', amount: 830, currency: 'INR', billing_frequency: 'monthly', start_date: '2025-03-20', next_payment_date: '2026-04-20', status: 'active', is_unused: false },
  { id: '4', merchant_name: 'Amazon Prime', category: 'Shopping', amount: 1499, currency: 'INR', billing_frequency: 'yearly', start_date: '2025-08-12', next_payment_date: '2026-08-12', status: 'active', is_unused: false },
  { id: '5', merchant_name: 'Gym Membership', category: 'Health', amount: 2200, currency: 'INR', billing_frequency: 'monthly', start_date: '2025-01-05', next_payment_date: '2026-04-05', status: 'active', is_unused: true },
  { id: '6', merchant_name: 'Adobe Creative Cloud', category: 'Design', amount: 4230, currency: 'INR', billing_frequency: 'monthly', start_date: '2025-04-28', next_payment_date: '2026-04-28', status: 'active', is_unused: false }
];

export function SubscriptionProvider({ children }) {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState([]);
  const [isDemoData, setIsDemoData] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadSubscriptions();
    } else {
      setSubscriptions([]);
      setIsDemoData(false);
    }
  }, [user]);

  const loadSubscriptions = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/subscriptions');
      if (data && Array.isArray(data.subscriptions)) {
        setSubscriptions(data.subscriptions);
        setIsDemoData(data.subscriptions.length > 0 && user?.email === 'admin@subguard.ai');
      } else {
        setSubscriptions([]);
      }
    } catch (err) {
      setSubscriptions([]);
    } finally {
      setLoading(false);
    }
  };

  const addSubscription = async (sub) => {
    try {
      const res = await apiRequest('/subscriptions', 'POST', sub);
      if (res && res.subscription) {
        setSubscriptions((prev) => [...prev, res.subscription]);
      } else {
        const localNew = { ...sub, id: Date.now().toString() };
        setSubscriptions((prev) => [...prev, localNew]);
      }
      setIsDemoData(false);
    } catch (err) {
      const localNew = { ...sub, id: Date.now().toString() };
      setSubscriptions((prev) => [...prev, localNew]);
    }
  };

  const updateSubscription = async (id, updated) => {
    try {
      await apiRequest(`/subscriptions/${id}`, 'PUT', updated);
      setSubscriptions((prev) => prev.map((s) => (s.id === id ? { ...s, ...updated } : s)));
    } catch (err) {
      setSubscriptions((prev) => prev.map((s) => (s.id === id ? { ...s, ...updated } : s)));
    }
  };

  const deleteSubscription = async (id) => {
    try {
      await apiRequest(`/subscriptions/${id}`, 'DELETE');
      setSubscriptions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setSubscriptions((prev) => prev.filter((s) => s.id !== id));
    }
  };

  return (
    <SubscriptionContext.Provider
      value={{
        subscriptions,
        isDemoData,
        loading,
        addSubscription,
        updateSubscription,
        deleteSubscription,
        refresh: loadSubscriptions
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export const useSubscriptions = () => useContext(SubscriptionContext);

