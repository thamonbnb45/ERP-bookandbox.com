require('dotenv').config({ path: 'backend/.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function test() {
    const cutoffDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
    const { count } = await supabase.from('chat_message').select('*', { count: 'exact', head: true }).gte('created_at', cutoffDate);
    console.log("Count of messages:", count);
    
    // Try to fetch just the last 1000 to see if Nam is there
    const { data: recentMsgs } = await supabase.from('chat_message').select('*').order('created_at', { ascending: false }).limit(100);
    const recentLeadIds = [...new Set(recentMsgs.map(m => m.lead_id))];
    console.log("Recent lead IDs:", recentLeadIds);
    
    const { data: leads, error } = await supabase.from('lead_contact').select('id, original_name').in('id', recentLeadIds);
    console.log("Leads fetched:", leads.length, "Error:", error);
    console.log("Contains Nam (id 70)?", leads.some(l => l.id === 70));
}
test();
