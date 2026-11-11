import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export function isSupabaseConfigured() {
  return Boolean(
    supabaseUrl &&
    !supabaseUrl.includes('placeholder') &&
    supabaseUrl.startsWith('https://') &&
    supabaseKey &&
    !supabaseKey.includes('placeholder') &&
    supabaseKey.length > 20
  );
}

export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
      global: { headers: { 'x-client-info': 'subguard-ai' } }
    })
  : null;


