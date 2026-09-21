const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const urlMatch = env.match(/VITE_SUPABASE_URL=([^\r\n]+)/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY=([^\r\n]+)/);

if (urlMatch && keyMatch) {
  const url = urlMatch[1].trim().replace(/\"/g, '').replace(/\'/g, "");
  const key = keyMatch[1].trim().replace(/\"/g, '').replace(/\'/g, "");
  
  const testTable = async (table) => {
    try {
      const res = await fetch(`${url}/rest/v1/${table}?limit=1`, {
        method: 'GET',
        headers: { apikey: key, Authorization: 'Bearer '+key }
      });
      console.log(table, res.status);
    } catch(e) {}
  };
  
  Promise.all(['vehicles', 'customers'].map(testTable));
}
