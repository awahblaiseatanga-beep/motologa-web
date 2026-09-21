const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const urlMatch = env.match(/VITE_SUPABASE_URL=([^\r\n]+)/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY=([^\r\n]+)/);

if (urlMatch && keyMatch) {
  const url = urlMatch[1].trim().replace(/\"/g, '');
  const key = keyMatch[1].trim().replace(/\"/g, '');
  
  const test = async () => {
    try {
      const res = await fetch(`${url}/rest/v1/?apikey=${key}`);
      const data = await res.json();
      console.log('OPENAPI:', JSON.stringify(data).substring(0, 1500));
    } catch(e) { console.error(e) }
  };
  
  Promise.all([test('jobs')]);
}
