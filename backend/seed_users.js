require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  const users = [
    { username: 'admin', pin_code: '1234', full_name: 'แอดมิน ตะวัน', role: 'CEO', active: true },
    { username: 'sales1', pin_code: '1234', full_name: 'KW กวาง', role: 'Sales', active: true },
    { username: 'sales2', pin_code: '1234', full_name: 'KW2 อาร์ท', role: 'Sales', active: true },
    { username: 'pricing', pin_code: '1234', full_name: 'BK แบงค์', role: 'Pricing', active: true },
    { username: 'production', pin_code: '1234', full_name: 'หัวหน้าฝ่ายผลิต', role: 'Production Manager', active: true },
  ];

  for (const u of users) {
    const { data: existing } = await supabase.from('erp_users').select('id').eq('username', u.username).single();
    if (!existing) {
      await supabase.from('erp_users').insert([u]);
      console.log('Inserted', u.username);
    } else {
      console.log('Exists', u.username);
    }
  }
  console.log('Done!');
}
seed();
