import { createClient } from '@supabase/supabase-js';

// Setup Supabase (mock client for node)
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://gjlypracqulxmojnwapi.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-key-here'; 

// We need to read the env variables from the actual .env file of MOTOLOGA-MOBILE
import fs from 'fs';
import dotenv from 'dotenv';
const envConfig = dotenv.parse(fs.readFileSync('d:/MOTOLOGA ROLLBACK/MOTOLOGA-MOBILE/.env'));
const sbUrl = envConfig.VITE_SUPABASE_URL;
const sbKey = envConfig.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(sbUrl, sbKey);

async function run() {
  console.log('Fetching all paused jobs...');
  const { data: pausedJobs, error: pErr } = await supabase.from('jobs').select('*').eq('status', 'paused');
  if (pErr) console.error(pErr);
  console.log('Paused Jobs:', pausedJobs);
  
  if (pausedJobs && pausedJobs.length > 0) {
     const jobIds = pausedJobs.map(j => j.id);
     console.log('Fetching additional findings for paused jobs...', jobIds);
     const { data: findings, error: fErr } = await supabase.from('additional_findings').select('*').in('parent_job_id', jobIds);
     if (fErr) console.error(fErr);
     console.log('Additional Findings:', findings);
  }
}

run();
