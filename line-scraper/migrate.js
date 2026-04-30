/**
 * LINE Chat Data Migration Script
 * นำข้อมูลแชทที่ scrape จาก LINE OA เข้า Supabase DB
 */
require('dotenv').config({ path: '../backend/.env' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const DATA_DIR = path.join(__dirname, 'line_data');

async function migrate() {
    console.log('🚀 เริ่ม Import ข้อมูลแชท LINE เข้า DB...\n');

    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
    console.log(`📁 พบ ${files.length} ไฟล์\n`);

    let totalImported = 0, totalSkipped = 0, totalLeadsProcessed = 0, newLeadsCreated = 0;

    for (const file of files) {
        const chatId = file.replace('.json', '');
        const rawData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file)));
        
        // Filter only actual messages (skip chatRead, delivery, etc.)
        const messages = rawData.filter(m => 
            (m.type === 'message' || m.type === 'messageSent') &&
            m.message && m.source && m.source.chatId
        );

        if (messages.length === 0) continue;
        totalLeadsProcessed++;

        // Find or create lead in DB
        let { data: lead } = await supabase.from('lead_contact')
            .select('id')
            .eq('line_user_id', chatId)
            .single();

        if (!lead) {
            // Create new lead
            const { data: newLead, error } = await supabase.from('lead_contact')
                .insert([{
                    line_user_id: chatId,
                    original_name: `LINE-${chatId.substring(0, 8)}`,
                    erp_alias_name: `LINE-${chatId.substring(0, 8)}`,
                    tags: [],
                    sales_status: 'i',
                    platform: 'line'
                }])
                .select('id').single();
            if (error) { console.log(`  ❌ ไม่สามารถสร้าง lead ${chatId}: ${error.message}`); continue; }
            lead = newLead;
            newLeadsCreated++;
        }

        // Get existing messages for this lead to avoid duplicates
        const { data: existingMsgs } = await supabase.from('chat_message')
            .select('created_at')
            .eq('lead_id', lead.id)
            .order('created_at', { ascending: true })
            .limit(1);

        const earliestExisting = existingMsgs && existingMsgs.length > 0 
            ? new Date(existingMsgs[0].created_at).getTime() 
            : Infinity;

        // Prepare messages for insert (only ones OLDER than earliest existing)
        const toInsert = [];
        for (const msg of messages) {
            const msgTime = msg.timestamp;
            if (msgTime >= earliestExisting) continue; // Skip if webhook already has this

            const sender = msg.type === 'messageSent' ? 'admin' : 'client';
            const msgType = msg.message.type || 'text';
            let textContent = '';
            let mediaUrl = null;

            if (msgType === 'text') {
                textContent = msg.message.text || '';
            } else if (msgType === 'image') {
                mediaUrl = msg.message.contentUrl || `[LINE image: ${msg.message.id}]`;
                textContent = '[📷 รูปภาพ]';
            } else if (msgType === 'sticker') {
                mediaUrl = msg.message.stickerUrl || `https://stickershop.line-scdn.net/stickershop/v1/sticker/${msg.message.stickerId || 0}/android/sticker.png`;
                textContent = '[sticker]';
            } else if (msgType === 'file') {
                textContent = `[📎 ไฟล์: ${msg.message.fileName || 'unknown'}]`;
            } else {
                textContent = `[${msgType}]`;
            }

            toInsert.push({
                lead_id: lead.id,
                sender,
                type: msgType === 'sticker' ? 'image' : msgType,
                text_content: textContent,
                media_url: mediaUrl,
                created_at: new Date(msgTime).toISOString()
            });
        }

        if (toInsert.length > 0) {
            // Batch insert (50 at a time)
            for (let i = 0; i < toInsert.length; i += 50) {
                const batch = toInsert.slice(i, i + 50);
                const { error } = await supabase.from('chat_message').insert(batch);
                if (error) { console.log(`  ⚠️ Batch error for ${chatId}: ${error.message}`); }
            }
            totalImported += toInsert.length;
            process.stdout.write(`  ✅ ${chatId.substring(0, 12)}... +${toInsert.length} ข้อความ (ข้าม ${messages.length - toInsert.length})\n`);
        } else {
            totalSkipped++;
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 สรุปผล Import:');
    console.log(`  Leads ที่ประมวลผล: ${totalLeadsProcessed}`);
    console.log(`  Leads ใหม่ที่สร้าง: ${newLeadsCreated}`);
    console.log(`  ข้อความที่ import: ${totalImported}`);
    console.log(`  Leads ที่ข้าม (มีข้อมูลแล้ว): ${totalSkipped}`);
    console.log('='.repeat(50));
}

migrate().catch(console.error);
