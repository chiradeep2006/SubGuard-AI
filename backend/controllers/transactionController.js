import { supabase, isSupabaseConfigured } from '../config/supabase.js';
import { detectRecurringSubscriptions } from '../services/recurringEngine.js';
import { evaluateTransactionAnomaly } from '../services/anomalyDetector.js';
import { invalidateUserInsightsCache } from '../services/insightsCache.js';
import { getSubscriptionsFromStore } from '../services/subscriptionStore.js';

const ADMIN_USER_ID = '00000000-0000-0000-0000-000000000001';

const DEFAULT_ADMIN_TRANSACTIONS = [
  { id: 't1', user_id: ADMIN_USER_ID, merchant: 'Netflix', amount: 649, currency: 'INR', transaction_date: '2026-03-14', category: 'Entertainment', status: 'completed', is_anomalous: false },
  { id: 't2', user_id: ADMIN_USER_ID, merchant: 'Netflix', amount: 799, currency: 'INR', transaction_date: '2026-02-14', category: 'Entertainment', status: 'completed', is_anomalous: true, anomaly_reason: 'Unexpected price hike detected: ₹799 charged, but registered plan is ₹649 (Delta: +₹150.00).' },
  { id: 't3', user_id: ADMIN_USER_ID, merchant: 'Spotify India', amount: 179, currency: 'INR', transaction_date: '2026-03-18', category: 'Entertainment', status: 'completed', is_anomalous: false },
  { id: 't4', user_id: ADMIN_USER_ID, merchant: 'GitHub Inc', amount: 830, currency: 'INR', transaction_date: '2026-03-20', category: 'Productivity', status: 'completed', is_anomalous: false },
  { id: 't5', user_id: ADMIN_USER_ID, merchant: 'Gym Membership', amount: 2200, currency: 'INR', transaction_date: '2026-03-05', category: 'Health', status: 'completed', is_anomalous: false }
];

const userTransactionsMap = new Map();
userTransactionsMap.set(ADMIN_USER_ID, [...DEFAULT_ADMIN_TRANSACTIONS]);

function getUserTxArray(userId) {
  const uid = userId || ADMIN_USER_ID;
  if (!userTransactionsMap.has(uid)) {
    if (
      uid === ADMIN_USER_ID ||
      uid === 'default_user' ||
      uid.includes('admin') ||
      uid.includes('demo')
    ) {
      userTransactionsMap.set(uid, [...DEFAULT_ADMIN_TRANSACTIONS]);
    } else {
      userTransactionsMap.set(uid, []);
    }
  }
  return userTransactionsMap.get(uid);
}

export async function getTransactionsForUser(userId) {
  const uid = userId || ADMIN_USER_ID;
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', uid)
        .order('transaction_date', { ascending: false });
      if (!error && data && data.length > 0) return data;
    } catch (e) {
      // Fallback
    }
  }
  return [...getUserTxArray(uid)];
}

export async function getTransactions(req, res) {
  try {
    const data = await getTransactionsForUser(req.user.id);
    res.json({ transactions: data });
  } catch (err) {
    res.json({ transactions: getUserTxArray(req.user?.id) });
  }
}

export async function uploadTransactionsCSV(req, res) {
  const { records } = req.body;
  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: 'Invalid or empty transaction array' });
  }

  try {
    const uid = req.user.id;
    let userSubs = await getSubscriptionsFromStore(uid);
    let pastTx = [];

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: txData } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', uid);
        pastTx = txData || [];
      } catch (e) {
        pastTx = getUserTxArray(uid);
      }
    } else {
      pastTx = getUserTxArray(uid);
    }

    const txToInsert = [];
    const anomaliesFound = [];

    for (const r of records) {
      const anomalyCheck = evaluateTransactionAnomaly(r, pastTx, userSubs);

      const recordPayload = {
        id: 'tx_' + Math.random().toString(36).substr(2, 9),
        user_id: uid,
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
        const memTx = getUserTxArray(uid);
        memTx.unshift(...txToInsert);
      }
    } else {
      const memTx = getUserTxArray(uid);
      memTx.unshift(...txToInsert);
    }

    invalidateUserInsightsCache(uid);

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
