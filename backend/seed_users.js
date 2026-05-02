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
    // Sales
    { username: 'kw_kwang', pin_code: '1234', full_name: 'KW กวาง', role: 'Sales', active: true },
    { username: 'kw2_art', pin_code: '1234', full_name: 'KW2 อาร์ท', role: 'Sales', active: true },
    { username: 'bk_bank', pin_code: '1234', full_name: 'BK แบงค์', role: 'Sales', active: true },
    { username: 'aem_eem', pin_code: '1234', full_name: 'aem อีม', role: 'Sales', active: true },
    
    // Admins (Using CEO/Admin role to have wide access to assign leads, or standard Sales but with Admin naming)
    // Wait, the user mentioned: "แอดมินจะมีการเข้าไปต้อนรับก่อนค่อยคัดให้เซล" (Admins welcome first then assign to sales).
    // I'll set their role to 'CEO' so they can see all modules and settings, or 'Sales'. Let's use 'Sales' to keep them in the Chat Center, but they can see all chats anyway.
    { username: 'admin_tawan', pin_code: '1234', full_name: 'แอดมิน ตะวัน', role: 'Sales', active: true },
    { username: 'admin_pupe', pin_code: '1234', full_name: 'แอดมิน ปูเป้', role: 'Sales', active: true },
    
    // Pricing
    { username: 'ning_price', pin_code: '1234', full_name: 'NING คิดราคา', role: 'Pricing', active: true },
  ];

  for (const u of users) {
    const { data: existing } = await supabase.from('erp_users').select('id').eq('username', u.username).single();
    if (!existing) {
      await supabase.from('erp_users').insert([u]);
      console.log('Inserted', u.username);
    } else {
      // Update full_name and role just in case
      await supabase.from('erp_users').update(u).eq('username', u.username);
      console.log('Updated', u.username);
    }
  }
  console.log('Done!');
}
seed();
