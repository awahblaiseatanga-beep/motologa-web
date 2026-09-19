import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';
const envConfig = dotenv.parse(fs.readFileSync('d:/MOTOLOGA ROLLBACK/MOTOLOGA-MOBILE/.env'));
const sbUrl = envConfig.VITE_SUPABASE_URL;
// Use service role if you have it? We only have VITE_SUPABASE_ANON_KEY.
const sbKey = envConfig.VITE_SUPABASE_ANON_KEY; 

const supabase = createClient(sbUrl, sbKey);

async function run() {
  // Let's just login first as auth bypassing RLS constraints if possible, but we don't have creds.
  // Instead, let's ask Supabase for ALL findings ordered by descending time.
  const { data: findings, error } = await supabase.from('additional_findings').select('id, parent_job_id, status, created_at').order('created_at', { ascending: false }).limit(5);
  console.log("Recent findings:", findings);
  console.log("Findings error:", error);
}

run();
