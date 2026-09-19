import { supabase } from './src/lib/supabase';
async function test() {
  const { data, error } = await supabase.from('additional_findings').select('*, jobs!inner(*)').limit(1);
  console.log('JOBS (INNER ALL):', error || data);

  const { data: d2, error: e2 } = await supabase.from('additional_findings').select('*, jobs!parent_job_id(*)').limit(1);
  console.log('JOBS (!parent_job_id):', e2 || d2);

  const { data: d3, error: e3 } = await supabase.from('additional_findings').select('*, jobs(*)').limit(1);
  console.log('JOBS (*):', e3 || d3);
  
  process.exit();
}
test();
