import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const envVars = Object.fromEntries(
  env
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => {
      const [k, ...v] = l.split('=');
      return [k.trim(), v.join('=').trim().replace(/^["']|["']$/g, '')];
    })
);

const supabase = createClient(envVars.VITE_SUPABASE_URL, envVars.VITE_SUPABASE_ANON_KEY);
console.log('Testing Supabase URL:', envVars.VITE_SUPABASE_URL);

async function check() {
  const tables = [
    'organizations',
    'profiles',
    'verifications',
    'review_queue',
    'audit_log',
    'quarantined_batches',
    'ai_model_routing_log',
    'regulatory_submissions',
    'supply_chain_alerts',
    'user_settings'
  ];

  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(3);
      if (error) {
        console.log(`Table '${table}': ERROR -> ${error.message} (${error.code})`);
      } else {
        console.log(`Table '${table}': OK -> ${data.length} rows`);
      }
    } catch (e) {
      console.log(`Table '${table}': EXCEPTION ->`, e.message);
    }
  }
}

check();
