import { supabase, isSupabaseConfigured } from '../config/supabase.js';
import { invalidateUserInsightsCache } from './insightsCache.js';

// User-Isolated in-memory synchronized store for subscriptions
// Maps userId -> Array of Subscriptions
const userSubscriptionsMap = new Map();
const ADMIN_USER_ID = '00000000-0000-0000-0000-000000000001';

const DEFAULT_ADMIN_SUBS = [
  {
    id: 'sub_1',
    user_id: ADMIN_USER_ID,
    merchant_name: 'Netflix Premium',
    category: 'Entertainment',
    amount: 649,
    currency: 'INR',
    billing_frequency: 'monthly',
    start_date: '2025-01-14',
    next_payment_date: '2026-04-14',
    status: 'active',
    is_unused: false
  },
  {
    id: 'sub_2',
    user_id: ADMIN_USER_ID,
    merchant_name: 'Spotify Family',
    category: 'Entertainment',
    amount: 179,
    currency: 'INR',
    billing_frequency: 'monthly',
    start_date: '2025-02-18',
    next_payment_date: '2026-04-18',
    status: 'active',
    is_unused: false
  },
  {
    id: 'sub_3',
    user_id: ADMIN_USER_ID,
    merchant_name: 'GitHub Copilot Pro',
    category: 'Productivity',
    amount: 830,
    currency: 'INR',
    billing_frequency: 'monthly',
    start_date: '2025-03-20',
    next_payment_date: '2026-04-20',
    status: 'active',
    is_unused: false
  },
  {
    id: 'sub_4',
    user_id: ADMIN_USER_ID,
    merchant_name: 'Amazon Prime',
    category: 'Shopping',
    amount: 1499,
    currency: 'INR',
    billing_frequency: 'yearly',
    start_date: '2025-08-12',
    next_payment_date: '2026-08-12',
    status: 'active',
    is_unused: false
  },
  {
    id: 'sub_5',
    user_id: ADMIN_USER_ID,
    merchant_name: 'Gym Membership',
    category: 'Health',
    amount: 2200,
    currency: 'INR',
    billing_frequency: 'monthly',
    start_date: '2025-01-05',
    next_payment_date: '2026-04-05',
    status: 'active',
    is_unused: true
  },
  {
    id: 'sub_6',
    user_id: ADMIN_USER_ID,
    merchant_name: 'Adobe Creative Cloud',
    category: 'Design',
    amount: 4230,
    currency: 'INR',
    billing_frequency: 'monthly',
    start_date: '2025-04-28',
    next_payment_date: '2026-04-28',
    status: 'active',
    is_unused: false
  }
];

// Initialize default admin user
userSubscriptionsMap.set(ADMIN_USER_ID, [...DEFAULT_ADMIN_SUBS]);

/**
 * Get internal array for a specific user
 */
function getUserSubsArray(userId) {
  const uid = userId || ADMIN_USER_ID;
  if (!userSubscriptionsMap.has(uid)) {
    if (
      uid === ADMIN_USER_ID ||
      uid === 'default_user' ||
      uid.includes('admin') ||
      uid.includes('demo')
    ) {
      userSubscriptionsMap.set(uid, [...DEFAULT_ADMIN_SUBS]);
    } else {
      // Different/new user starts with their own isolated list
      userSubscriptionsMap.set(uid, []);
    }
  }
  return userSubscriptionsMap.get(uid);
}

export async function getSubscriptionsFromStore(userId) {
  const uid = userId || ADMIN_USER_ID;
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', uid)
        .order('next_payment_date', { ascending: true });

      if (!error && data) {
        return data;
      }
    } catch (err) {
      // Fall through to memory
    }
  }
  return [...getUserSubsArray(uid)];
}

export async function addSubscriptionToStore(subData, userId) {
  const uid = userId || ADMIN_USER_ID;
  const newSub = {
    id: 'sub_' + Date.now(),
    user_id: uid,
    merchant_name: subData.merchant_name,
    category: subData.category || 'Entertainment',
    amount: parseFloat(subData.amount),
    currency: subData.currency || 'INR',
    billing_frequency: subData.billing_frequency || 'monthly',
    start_date: subData.start_date || new Date().toISOString().split('T')[0],
    next_payment_date:
      subData.next_payment_date ||
      new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    status: subData.status || 'active',
    is_unused: !!subData.is_unused,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .insert([newSub])
        .select()
        .single();

      if (!error && data) {
        const userSubs = getUserSubsArray(uid);
        userSubs.push(data);
        invalidateUserInsightsCache(uid);
        return data;
      }
    } catch (err) {
      // Fall through
    }
  }

  const userSubs = getUserSubsArray(uid);
  userSubs.push(newSub);
  invalidateUserInsightsCache(uid);
  return newSub;
}

export async function updateSubscriptionInStore(id, updates, userId) {
  const uid = userId || ADMIN_USER_ID;
  const cleanUpdates = {
    ...updates,
    amount: updates.amount !== undefined ? parseFloat(updates.amount) : undefined,
    updated_at: new Date().toISOString()
  };
  Object.keys(cleanUpdates).forEach(
    (key) => cleanUpdates[key] === undefined && delete cleanUpdates[key]
  );

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .update(cleanUpdates)
        .eq('id', id)
        .eq('user_id', uid)
        .select()
        .single();

      if (!error && data) {
        const userSubs = getUserSubsArray(uid);
        const idx = userSubs.findIndex((s) => s.id === id);
        if (idx !== -1) userSubs[idx] = data;
        invalidateUserInsightsCache(uid);
        return data;
      }
    } catch (err) {
      // Fallback
    }
  }

  const userSubs = getUserSubsArray(uid);
  const idx = userSubs.findIndex((s) => s.id === id);
  if (idx !== -1) {
    userSubs[idx] = { ...userSubs[idx], ...cleanUpdates };
    invalidateUserInsightsCache(uid);
    return userSubs[idx];
  }
  return null;
}

export async function deleteSubscriptionFromStore(id, userId) {
  const uid = userId || ADMIN_USER_ID;
  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase.from('subscriptions').delete().eq('id', id).eq('user_id', uid);
    } catch (err) {
      // Ignore
    }
  }

  const userSubs = getUserSubsArray(uid);
  const beforeLen = userSubs.length;
  const filtered = userSubs.filter((s) => s.id !== id);
  userSubscriptionsMap.set(uid, filtered);
  invalidateUserInsightsCache(uid);
  return filtered.length < beforeLen;
}

export function findSubscriptionByName(name, userId) {
  if (!name) return null;
  const uid = userId || ADMIN_USER_ID;
  const userSubs = getUserSubsArray(uid);
  const clean = name.trim().toLowerCase();
  return (
    userSubs.find((s) => s.merchant_name.toLowerCase().includes(clean)) ||
    userSubs.find((s) => clean.includes(s.merchant_name.toLowerCase())) ||
    null
  );
}
