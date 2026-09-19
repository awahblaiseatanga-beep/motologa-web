const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const urlMatch = env.match(/VITE_SUPABASE_URL=([^\r\n]+)/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY=([^\r\n]+)/);

if (urlMatch && keyMatch) {
  const url = urlMatch[1].trim().replace(/\"/g, '');
  const key = keyMatch[1].trim().replace(/\"/g, '');
  
  const test = async (table) => {
    try {
      const res = await fetch(`${url}/rest/v1/${table}?limit=1`, { headers: { apikey: key, Authorization: 'Bearer '+key }});
      console.log(table, res.status, await res.text().then(t=>t.substring(0, 100)));
    } catch(e) {}
  };
  
  Promise.all([test('profile'), test('user')]);
}
