import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';
const envConfig = dotenv.parse(fs.readFileSync('d:/MOTOLOGA ROLLBACK/MOTOLOGA-MOBILE/.env'));
const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data: allJobs, error } = await supabase.from('jobs').select('id, status, plate');
  if (error) console.error(error);
  
  const statusCounts = {};
  allJobs.forEach(j => {
     statusCounts[j.status] = (statusCounts[j.status] || 0) + 1;
  });
  console.log('All Jobs Status Distribution:', statusCounts);
  
  const { data: findings } = await supabase.from('additional_findings').select('id, status, parent_job_id');
  const findingStatus = {};
  findings?.forEach(f => {
     findingStatus[f.status] = (findingStatus[f.status] || 0) + 1;
  });
  console.log('Findings Status Distribution:', findingStatus);
}
run();
