import { supabase, isSupabaseConfigured } from '../config/supabase.js';
import { detectRecurringSubscriptions } from '../services/recurringEngine.js';
import { evaluateTransactionAnomaly } from '../services/anomalyDetector.js';
import { invalidateUserInsightsCache } from '../services/insightsCache.js';

let fallbackTransactions = [
  { id: 't1', user_id: '00000000-0000-0000-0000-000000000001', merchant: 'Netflix', amount: 649, currency: 'INR', transaction_date: '2026-03-14', category: 'Entertainment', status: 'completed', is_anomalous: false },
  { id: 't2', user_id: '00000000-0000-0000-0000-000000000001', merchant: 'Netflix', amount: 799, currency: 'INR', transaction_date: '2026-02-14', category: 'Entertainment', status: 'completed', is_anomalous: true, anomaly_reason: 'Unexpected price hike detected: ₹799 charged, but registered plan is ₹649 (Delta: +₹150.00).' },
  { id: 't3', user_id: '00000000-0000-0000-0000-000000000001', merchant: 'Spotify India', amount: 179, currency: 'INR', transaction_date: '2026-03-18', category: 'Entertainment', status: 'completed', is_anomalous: false },
  { id: 't4', user_id: '00000000-0000-0000-0000-000000000001', merchant: 'GitHub Inc', amount: 830, currency: 'INR', transaction_date: '2026-03-20', category: 'Productivity', status: 'completed', is_anomalous: false }
];

export async function getTransactionsForUser(userId) {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('transaction_date', { ascending: false });
      if (!error && data && data.length > 0) return data;
    } catch (e) {
      // Fallback
    }
  }
  return [...fallbackTransactions];
}

export async function getTransactions(req, res) {
  try {
    const data = await getTransactionsForUser(req.user.id);
    res.json({ transactions: data });
  } catch (err) {
    res.json({ transactions: fallbackTransactions });
  }
}

export async function uploadTransactionsCSV(req, res) {
  const { records } = req.body;
  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: 'Invalid or empty transaction array' });
  }

  try {
    let userSubs = [];
    let pastTx = [];

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: subsData } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', req.user.id);
        userSubs = subsData || [];

        const { data: txData } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', req.user.id);
        pastTx = txData || [];
      } catch (e) {
        pastTx = fallbackTransactions;
      }
    } else {
      userSubs = [
        { merchant_name: 'Netflix', amount: 649 },
        { merchant_name: 'Spotify', amount: 179 }
      ];
      pastTx = fallbackTransactions;
    }

    const txToInsert = [];
    const anomaliesFound = [];

    for (const r of records) {
      const anomalyCheck = evaluateTransactionAnomaly(r, pastTx, userSubs);

      const recordPayload = {
        id: 'tx_' + Math.random().toString(36).substr(2, 9),
        user_id: req.user.id,
        merchant: r.merchant,
        amount: parseFloat(r.amount),
        currency: r.currency || 'INR',
        transaction_date: r.transaction_date,
        category: r.category || 'General',
        status: 'completed',
        is_anomalous: anomalyCheck.isAnomalous,
        anomaly_reason: anomalyCheck.reason
      };

      txToInsert.push(recordPayload);
      if (anomalyCheck.isAnomalous) {
        anomaliesFound.push(recordPayload);
      }
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('transactions').insert(txToInsert);
      } catch (dbErr) {
        fallbackTransactions = [...txToInsert, ...fallbackTransactions];
      }
    } else {
      fallbackTransactions = [...txToInsert, ...fallbackTransactions];
    }

    invalidateUserInsightsCache(req.user.id);

    const combinedTx = [...pastTx, ...txToInsert];
    const recurringCandidates = detectRecurringSubscriptions(combinedTx);

    res.json({
      message: `Imported ${txToInsert.length} transactions successfully.`,
      anomaliesIdentified: anomaliesFound.length,
      anomalies: anomaliesFound,
      detectedSubscriptions: recurringCandidates
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

