require('dotenv').config({ path: 'backend/.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function check() {
  const { data: msgs, error } = await supabase.from('chat_message').select('*, lead_contact(original_name)').order('created_at', { ascending: false }).limit(10);
  console.log('Latest 10 messages:', msgs);
}
check();
