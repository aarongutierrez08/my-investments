import { createClient, SupabaseClient } from '@supabase/supabase-js';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
const anonKey = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

export const supabase: SupabaseClient = createClient(url, anonKey);
