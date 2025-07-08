// src/supabaseClient.js
/**
 * This file initializes the Supabase client.
 * It reads the Supabase URL and anonymous key from environment variables.
 * These variables are exposed to the client-side by Vite using the `VITE_` prefix.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and anonymous key are required.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey); 