require('dotenv').config({ path: '../backend/.env' });
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const OA_ID = 'U16260c786c1f65a17489d30e8a7b4fd3';

async function runMigration() {
    console.log('🚀 Starting Data Migration into Supabase...');
    const data = require('./line_data/U16260c786c1f65a17489d30e8a7b4fd3.json');

    // 1. Fetch all leads from Supabase to create a mapping of line_user_id -> lead_id
    console.log('Fetching leads from Supabase...');
    const { data: leads, error } = await supabase.from('lead_contact').select('id, line_user_id');
    if (error) throw error;
    
    const leadMap = {};
    leads.forEach(l => {
        if (l.line_user_id) leadMap[l.line_user_id] = l.id;
    });

    // 2. Prepare the rows to insert
    const insertRows = [];
    
    // We only process Admin Messages (to avoid duplicating User Messages that the webhook already saved)
    data.forEach(item => {
        // Must be a message sent by the OA
        if ((item.type === 'messageSent' || item.message) && item.source?.userId === OA_ID) {
            const msg = item.message;
            if (!msg) return;

            const lineUserId = item.source.chatId;
            const leadId = leadMap[lineUserId];
            
            if (leadId) {
                let textContent = '';
                let type = 'text';

                if (msg.type === 'text') {
                    textContent = msg.text;
                } else if (msg.type === 'image') {
                    textContent = '[รูปภาพจากแชทเก่า]';
                    type = 'image';
                } else if (msg.type === 'flex') {
                    textContent = '[Flex Message / Menu]';
                } else if (msg.type === 'rich') {
                    textContent = '[Rich Menu Image]';
                } else {
                    textContent = `[${msg.type}]`;
                }

                // Optional: Identify if it was an Auto-Reply
                if (item.bizId === '__AUTO_RESPONSE') {
                    textContent = `🤖(Auto): ${textContent}`;
                }

                insertRows.push({
                    lead_id: leadId,
                    sender: 'admin',
                    type: type,
                    text_content: textContent,
                    // Line's timestamp is Unix ms
                    created_at: new Date(item.timestamp || Date.now()).toISOString()
                });
            }
        }
    });

    console.log(`Found ${insertRows.length} admin messages ready to be inserted.`);

    if (insertRows.length === 0) {
        console.log('No messages to insert.');
        return;
    }

    // 3. Insert into Supabase in chunks of 500
    const CHUNK_SIZE = 500;
    for (let i = 0; i < insertRows.length; i += CHUNK_SIZE) {
        const chunk = insertRows.slice(i, i + CHUNK_SIZE);
        console.log(`Inserting chunk ${i / CHUNK_SIZE + 1} (${chunk.length} rows)...`);
        
        const { error: insertError } = await supabase.from('chat_message').insert(chunk);
        if (insertError) {
            console.error('Error inserting chunk:', insertError.message);
        }
    }

    console.log('✅ Migration Complete!');
}

runMigration().catch(console.error);
