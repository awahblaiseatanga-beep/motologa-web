import { createClient } from '@supabase/supabase-js';

const url = 'https://gjlypracqulxmojnwapi.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqbHlwcmFjcXVseG1vam53YXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5ODE0NzEsImV4cCI6MjEwNDU1NzQ3MX0.JtQJhZa4STyA8aqEa_9eOqdtG8FMtXty04L11Y-HzfA';

const supabase = createClient(url, key);

async function run() {
  // Test 1: Query view definition
  const { data: vData, error: vErr } = await supabase.from('views').select('*').eq('table_name', 'profiles').limit(1);
  if (vErr) {
    console.log("VIEWS SYSTEM QUERY ERR:", vErr?.message);
    const { data: v2Data, error: v2Err } = await supabase.from('information_schema.views').select('*').limit(1);
    console.log("INFO SCHEMA ERR:", v2Err?.message);
  } else {
    console.log("VIEW DEF:", vData);
  }
  
  // Test 3: Standard fetch profiles
  const { data: pData, error: pErr } = await supabase.from('profiles').select('*').limit(1);
  console.log("FETCH PROFILES RESULT:", pData?.length > 0 ? Object.keys(pData[0]) : pData);
}

run();
