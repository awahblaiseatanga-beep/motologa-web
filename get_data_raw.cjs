const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const urlMatch = env.match(/VITE_SUPABASE_URL=([^\r\n]+)/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY=([^\r\n]+)/);

if (urlMatch && keyMatch) {
  const url = urlMatch[1].trim().replace(/\"/g, '');
  const key = keyMatch[1].trim().replace(/\"/g, '');
  const supabase = createClient(url, key);
  
  supabase.from('garage_members').select('*, profiles(full_name, email)').limit(2)
    .then(res => console.log('raw:', JSON.stringify(res, null, 2)))
    .catch(console.error);
}
