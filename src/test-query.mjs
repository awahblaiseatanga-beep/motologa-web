import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

const client = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const result = await client
    .from('garage_members')
    .select('*, profiles(full_name, email, language_preference)')
    .limit(1);
    
  console.log(JSON.stringify(result, null, 2));
}

test();
