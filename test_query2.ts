import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
  console.log("TESTING JOBS JOIN");
  const { data, error } = await supabase.from('additional_findings').select('*, jobs(*)').limit(1);
  console.log('JOBS (*):', error ? error.message : "SUCCESS: " + JSON.stringify(data[0]?.jobs));
  
  const { data: d2, error: e2 } = await supabase.from('additional_findings').select('*, jobs!inner(*)').limit(1);
  console.log('JOBS!inner:', e2 ? e2.message : "SUCCESS");

  const { data: d3, error: e3 } = await supabase.from('additional_findings').select('*, jobs!parent_job_id(*)').limit(1);
  console.log('JOBS!parent:', e3 ? e3.message : "SUCCESS");
  process.exit();
}
test();
