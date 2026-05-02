require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function t() {
    const activeLeadIds = Array.from({length: 1243}, (_, i) => i + 1);
    const { data } = await supabase.from('lead_contact').select('id, original_name').in('id', activeLeadIds);
    console.log(data.length);
    console.log(data.some(l => l.id === 70));
}
t();
