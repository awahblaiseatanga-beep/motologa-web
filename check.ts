import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// read from .env or .env.local
dotenv.config({ path: resolve('d:/MOTOLOGA ROLLBACK/MOTOLOGA-MOBILE/.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing env vars!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('jobs').select('*').limit(1);
  if (error) {
    console.error("Jobs error:", error);
  } else {
    console.log("Jobs schema:", JSON.stringify(data, null, 2));
  }
}

check();
