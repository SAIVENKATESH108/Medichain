import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '%c[Supabase] ❌ Missing environment variables!',
    'color: red; font-weight: bold',
    '\nVITE_SUPABASE_URL:',
    supabaseUrl ? '✅ set' : '❌ NOT SET',
    '\nVITE_SUPABASE_ANON_KEY:',
    supabaseAnonKey ? '✅ set' : '❌ NOT SET',
    '\n\nMake sure your .env file has both VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY'
  );
} else {
  console.log(
    '%c[Supabase] ✅ Client configured',
    'color: green; font-weight: bold',
    '\nURL:', supabaseUrl
  );
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'medichain-auth',
  },
});

// Run a quick connectivity test (non-blocking)
(async () => {
  if (!supabaseUrl || !supabaseAnonKey) return;
  try {
    const start = performance.now();
    // Simple connectivity test — just hit the REST endpoint
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'HEAD',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
    });
    const elapsed = Math.round(performance.now() - start);
    if (response.ok || response.status === 200 || response.status === 404) {
      console.log(
        `%c[Supabase] ✅ Server reachable (${elapsed}ms)`,
        'color: green; font-weight: bold'
      );
    } else {
      console.warn(
        `%c[Supabase] ⚠️ Server responded with ${response.status} (${elapsed}ms)`,
        'color: orange; font-weight: bold'
      );
    }

    // Test if tables exist by trying to query profiles (won't return data without auth)
    const { error: tableError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    if (tableError) {
      if (tableError.code === '42P01') {
        console.error(
          '%c[Supabase] ❌ Tables not found! Run supabase/migration.sql in your SQL Editor.',
          'color: red; font-weight: bold',
          '\nError:', tableError.message
        );
      } else if (tableError.code === 'PGRST301' || tableError.message?.includes('JWTClaimsError')) {
        // This is expected — anon user can't read profiles due to RLS
        console.log(
          '%c[Supabase] ✅ Tables exist (RLS is active)',
          'color: green; font-weight: bold'
        );
      } else {
        console.log(
          '%c[Supabase] ℹ️ Table check:',
          'color: blue; font-weight: bold',
          tableError.code, tableError.message
        );
      }
    } else {
      console.log(
        '%c[Supabase] ✅ Tables exist and accessible',
        'color: green; font-weight: bold'
      );
    }
  } catch (err) {
    console.error(
      '%c[Supabase] ❌ Cannot reach server!',
      'color: red; font-weight: bold',
      '\nCheck your internet connection and VITE_SUPABASE_URL.',
      '\nError:', err
    );
  }
})();
