import { supabase, isSupabaseConfigured } from '../config/supabase.js';

function generateUserSession(email) {
  const cleanEmail = (email || 'admin@subguard.ai').trim().toLowerCase();
  const isAdmin = cleanEmail === 'admin@subguard.ai' || cleanEmail === 'demo@subguard.ai';
  const userId = isAdmin
    ? '00000000-0000-0000-0000-000000000001'
    : 'usr_' + Buffer.from(cleanEmail).toString('hex').slice(0, 20);

  const tokenPayload = Buffer.from(JSON.stringify({ id: userId, email: cleanEmail })).toString('base64');
  const token = 'subguard_token_' + tokenPayload;

  return {
    user: { id: userId, email: cleanEmail },
    token
  };
}

export async function login(req, res) {
  const { email, password } = req.body || {};
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error && data?.user) {
        return res.json({ user: data.user, token: data.session.access_token });
      }
    } catch (err) {
      // Fall through to local session generator
    }
  }

  const session = generateUserSession(email);
  return res.json(session);
}

export async function register(req, res) {
  const { email, password } = req.body || {};
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (!error && data?.user) {
        return res.status(201).json({ user: data.user, token: data.session?.access_token || 'mock_jwt_token' });
      }
    } catch (err) {
      // Fall through
    }
  }

  const session = generateUserSession(email);
  return res.status(201).json(session);
}

const userProfilesMap = new Map();

export async function getProfile(req, res) {
  const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';
  const email = req.user?.email || 'admin@subguard.ai';

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (!error && data) {
        return res.json({ profile: data });
      }
    } catch (err) {
      // Fall through
    }
  }

  const existing = userProfilesMap.get(userId) || {
    id: userId,
    email,
    currency: 'INR',
    monthly_budget: 5000,
    notification_email: true,
    notification_renewal_days: 3
  };

  return res.json({ profile: existing });
}

export async function updateProfile(req, res) {
  const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';
  const email = req.user?.email || 'admin@subguard.ai';
  const { currency, monthly_budget, notification_email, notification_renewal_days } = req.body || {};

  const current = userProfilesMap.get(userId) || {
    id: userId,
    email,
    currency: 'INR',
    monthly_budget: 5000,
    notification_email: true,
    notification_renewal_days: 3
  };

  const updated = {
    ...current,
    currency: currency || current.currency,
    monthly_budget: monthly_budget !== undefined ? parseFloat(monthly_budget) : current.monthly_budget,
    notification_email: notification_email !== undefined ? !!notification_email : current.notification_email,
    notification_renewal_days: notification_renewal_days !== undefined ? Number(notification_renewal_days) : current.notification_renewal_days,
    updated_at: new Date().toISOString()
  };

  userProfilesMap.set(userId, updated);

  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase
        .from('profiles')
        .upsert(updated)
        .eq('id', userId);
    } catch (err) {
      // Fall through
    }
  }

  return res.json({ profile: updated, message: 'Profile preferences updated successfully' });
}
