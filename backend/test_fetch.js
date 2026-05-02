require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function test() {
    try {
        const { count } = await supabase.from('chat_message').select('*', { count: 'exact', head: true });
        console.log("Total messages:", count);

        // Fetch using the exact logic from backend/index.js
        const cutoffDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
        const limit = 1000;
        const pages = Math.ceil((count || 0) / limit);
        const fetchPromises = [];
        for (let i = 0; i < pages; i++) {
            fetchPromises.push(
                supabase.from('chat_message')
                    .select('*')
                    .gte('created_at', cutoffDate)
                    .order('id', { ascending: true })
                    .range(i * limit, (i + 1) * limit - 1)
            );
        }
        const results = await Promise.all(fetchPromises);
        let allMsgs = [];
        results.forEach(res => { if (res.data) allMsgs = allMsgs.concat(res.data); });
        console.log("Fetched messages length:", allMsgs.length);

        const msgsByLead = {};
        if (allMsgs) {
            allMsgs.forEach(m => {
                if (!msgsByLead[m.lead_id]) msgsByLead[m.lead_id] = [];
                msgsByLead[m.lead_id].push(m);
            });
        }
        const activeLeadIds = Object.keys(msgsByLead);
        console.log("Active Lead IDs length:", activeLeadIds.length);
        
        // This is where it might fail if length > 1000
        const { data: activeLeads, error } = await supabase.from('lead_contact').select('*').in('id', activeLeadIds);
        console.log("Fetched Leads length:", activeLeads?.length, "Error:", error);
        
    } catch (err) {
        console.error(err);
    }
}
test();
