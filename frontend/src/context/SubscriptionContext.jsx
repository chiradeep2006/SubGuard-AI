import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../api/client';
import { useAuth } from './AuthContext';

const SubscriptionContext = createContext();

export function SubscriptionProvider({ children }) {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState([]);
  const [insightsSummary, setInsightsSummary] = useState(null);
  const [isDemoData, setIsDemoData] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadSubscriptions = useCallback(async (forceRefresh = false) => {
    if (!user) {
      setSubscriptions([]);
      setInsightsSummary(null);
      setIsDemoData(false);
      return;
    }

    setLoading(true);
    const query = forceRefresh ? '?refresh=true' : '';

    try {
      const [subsRes, summaryRes] = await Promise.allSettled([
        apiRequest('/subscriptions'),
        apiRequest(`/insights/summary${query}`).catch(() => apiRequest('/ai/analysis'))
      ]);

      if (subsRes.status === 'fulfilled' && subsRes.value && Array.isArray(subsRes.value.subscriptions)) {
        setSubscriptions(subsRes.value.subscriptions);
        setIsDemoData(subsRes.value.subscriptions.length > 0 && user?.email === 'admin@subguard.ai');
      } else {
        setSubscriptions([]);
      }

      if (summaryRes.status === 'fulfilled' && summaryRes.value) {
        const data = summaryRes.value;
        const normalizedSummary = data.summary || data;
        setInsightsSummary(normalizedSummary);
      }
    } catch (err) {
      console.warn('Subscription & insights load error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadSubscriptions();
  }, [loadSubscriptions]);

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
      // Synchronously recalculate insights summary
      await loadSubscriptions(true);
    } catch (err) {
      const localNew = { ...sub, id: Date.now().toString() };
      setSubscriptions((prev) => [...prev, localNew]);
      await loadSubscriptions(true);
    }
  };

  const updateSubscription = async (id, updated) => {
    try {
      await apiRequest(`/subscriptions/${id}`, 'PUT', updated);
      setSubscriptions((prev) => prev.map((s) => (s.id === id ? { ...s, ...updated } : s)));
      await loadSubscriptions(true);
    } catch (err) {
      setSubscriptions((prev) => prev.map((s) => (s.id === id ? { ...s, ...updated } : s)));
      await loadSubscriptions(true);
    }
  };

  const deleteSubscription = async (id) => {
    try {
      await apiRequest(`/subscriptions/${id}`, 'DELETE');
      setSubscriptions((prev) => prev.filter((s) => s.id !== id));
      await loadSubscriptions(true);
    } catch (err) {
      setSubscriptions((prev) => prev.filter((s) => s.id !== id));
      await loadSubscriptions(true);
    }
  };

  return (
    <SubscriptionContext.Provider
      value={{
        subscriptions,
        insightsSummary,
        isDemoData,
        loading,
        addSubscription,
        updateSubscription,
        deleteSubscription,
        refresh: () => loadSubscriptions(true)
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export const useSubscriptions = () => useContext(SubscriptionContext);
