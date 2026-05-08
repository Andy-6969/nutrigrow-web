// vps-server/src/lib/supabase.ts
// Supabase client untuk VPS — menggunakan service_role key
// PENTING: service_role key bypass RLS — jangan expose ke frontend!

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    '[Supabase] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env variable.\n' +
    'Copy .env.example to .env and fill in the values.'
  );
}

export const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
