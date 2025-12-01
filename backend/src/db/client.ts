import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';

// Initialize Supabase client with service key for admin operations
export const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export const db = supabase;
