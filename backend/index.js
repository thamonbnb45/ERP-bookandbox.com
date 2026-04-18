require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const line = require('@line/bot-sdk');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public'))); // Serve React Frontend

// Supabase Init
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
if(!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE Credentials in .env!");
}
const supabase = createClient(supabaseUrl, supabaseKey);

const channelToken = process.env.CHANNEL_ACCESS_TOKEN || 'DUMMY_TOKEN';
const { messagingApi } = line;
const lineClient = new messagingApi.MessagingApiClient({ channelAccessToken: channelToken });
const blobClient = new messagingApi.MessagingApiBlobClient({ channelAccessToken: channelToken });

// 1. Webhook Handlers
const ensureLeadExists = async (lineUserId) => {
    try {
        const { data: row, error } = await supabase.from('lead_contact').select('id').eq('line_user_id', lineUserId).single();
        if (row) return row.id;
        
        let originalName = 'LINE User';
        let avatarUrl = null;
        if (channelToken !== 'DUMMY_TOKEN') {
            try {
                const profile = await lineClient.getProfile(lineUserId);
                if (profile && profile.displayName) originalName = profile.displayName;
                if (profile && profile.pictureUrl) avatarUrl = profile.pictureUrl;
            } catch (e) {}
        }

        const { data: newRow, error: insertErr } = await supabase.from('lead_contact')
            .insert([{
                line_user_id: lineUserId,
                original_name: originalName,
                erp_alias_name: originalName,
                tags: [],
                sales_status: 'i',
                avatar_url: avatarUrl
            }])
            .select('id').single();
            
        if (insertErr) throw insertErr;
        return newRow.id;
    } catch (e) {
        console.error(e);
        return null;
    }
};

const downloadLineMedia = async (messageId) => {
    try {
        if (channelToken === 'DUMMY_TOKEN') {
            return `https://placehold.co/400x300?text=Fake_DUMMY_Image_${messageId}`;
        }
        const stream = await blobClient.getMessageContent(messageId);
        const fileName = `${messageId}.jpg`;
        const filePath = path.join(__dirname, 'uploads', fileName);
        return new Promise((resolve, reject) => {
            const writable = fs.createWriteStream(filePath);
            stream.pipe(writable);
            stream.on('end', () => resolve(`http://localhost:3001/uploads/${fileName}`));
            stream.on('error', reject);
        });
    } catch (e) {
        return null;
    }
}

app.post('/api/webhook', async (req, res) => {
    const events = req.body.events;
    if (events && events.length > 0) {
        for (let event of events) {
            if (event.type === 'message') {
                const userId = event.source.userId;
                const leadId = await ensureLeadExists(userId);
                if (!leadId) continue;

                let msgType = event.message.type;
                let textContent = '';
                let mediaUrl = null;

                if (msgType === 'text') {
                    textContent = event.message.text;
                } else if (msgType === 'image' || msgType === 'file') {
                    mediaUrl = await downloadLineMedia(event.message.id);
                    if (!mediaUrl) { textContent = '[Failed payload]'; msgType = 'text'; }
                } else if (msgType === 'sticker') {
                    mediaUrl = `https://stickershop.line-scdn.net/stickershop/v1/sticker/${event.message.stickerId}/android/sticker.png`;
                    msgType = 'image';
                }

                await supabase.from('chat_message').insert([{
                    lead_id: leadId,
                    sender: 'client',
                    type: msgType,
                    text_content: textContent,
                    media_url: mediaUrl
                }]);
            }
        }
    }
    res.status(200).send('OK');
});

// ANALYTICS TIERING (C1-C5) HELPER
const evaluateCustomerTier = async (customerId) => {
    if (!customerId) return { tier: 'New', totalSpend: 0, repeatCount: 0 };
    
    const { data: orders, error } = await supabase.from('job_order').select('total_price').eq('customer_id', customerId);
    if (error || !orders) return { tier: 'New', totalSpend: 0, repeatCount: 0 };
    
    const totalSpend = orders.reduce((sum, order) => sum + (order.total_price || 0), 0);
    const repeatCount = orders.length;
    
    let tier = 'C1';
    if (totalSpend === 0) tier = 'New';
    else if (totalSpend < 5000) tier = 'C1';
    else if (totalSpend <= 15000) tier = 'C2';
    else if (totalSpend <= 50000) tier = 'C3';
    else if (totalSpend <= 100000) tier = 'C4';
    else tier = 'C5';

    return { tier, totalSpend, repeatCount };
};

// CRM Endpoints
app.get('/api/chats', async (req, res) => {
    try {
        const { data: leads, error } = await supabase.from('lead_contact').select('*');
        if (error) throw error;
        
        const promises = leads.map(async (lead) => {
            const analytics = await evaluateCustomerTier(lead.customer_id);
            const { data: msgs } = await supabase.from('chat_message')
                .select('*')
                .eq('lead_id', lead.id)
                .order('id', { ascending: true });

            return {
                id: lead.id,
                line_user_id: lead.line_user_id,
                original_name: lead.original_name,
                erp_alias_name: lead.erp_alias_name,
                avatar_url: lead.avatar_url,
                tags: lead.tags, 
                sales_status: lead.sales_status, 
                analytics: analytics,
                messages: msgs || []
            };
        });

        const data = await Promise.all(promises);
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/chats/:id/reply', async (req, res) => {
    const leadId = req.params.id;
    const { text } = req.body;

    try {
        const { data: row, error } = await supabase.from('lead_contact').select('line_user_id').eq('id', leadId).single();
        if (error || !row) return res.status(404).send('Lead not found');

        await supabase.from('chat_message').insert([{
            lead_id: leadId,
            sender: 'admin',
            type: 'text',
            text_content: text
        }]);

        if (channelToken !== 'DUMMY_TOKEN') {
            await lineClient.pushMessage({
                to: row.line_user_id,
                messages: [{ type: 'text', text: text }]
            });
        }
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/leads/:id', async (req, res) => {
    const leadId = req.params.id;
    const { erp_alias_name, tags, sales_status } = req.body;
    
    try {
        const { error } = await supabase.from('lead_contact').update({
            erp_alias_name,
            tags,
            sales_status
        }).eq('id', leadId);
        
        if (error) throw error;
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Kanban / Production Endpoints
app.get('/api/job_orders', async (req, res) => {
    try {
        const { data, error } = await supabase.from('job_order')
            .select('id, quantity, total_price, status, production_stage, tracking_number, created_at, customer(name), product(name)')
            .order('id', { ascending: false });
            
        if (error) throw error;
        
        // Flatten nested responses for frontend compatibility
        const flattened = data.map(job => ({
            ...job,
            customer: job.customer ? job.customer.name : 'Unknown',
            product: job.product ? job.product.name : 'Unknown'
        }));
        res.json(flattened);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/job_orders/:id/move', async (req, res) => {
    const jobId = req.params.id;
    const { production_stage } = req.body;
    
    let overallStatus = 'progress';
    if(production_stage === 'planning') overallStatus = 'pending';
    if(production_stage === 'shipping') overallStatus = 'completed';

    try {
        const { error } = await supabase.from('job_order').update({
            production_stage: production_stage,
            status: overallStatus
        }).eq('id', jobId);
        
        if (error) throw error;
        res.json({ success: true, stage: production_stage });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/job_orders/:id/tracking', async (req, res) => {
    const jobId = req.params.id;
    const { tracking_number } = req.body;
    
    try {
        const { error } = await supabase.from('job_order').update({
            tracking_number: tracking_number
        }).eq('id', jobId);
        
        if (error) throw error;
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// E-commerce Public API Endpoints
app.post('/api/portal/checkout', async (req, res) => {
    const { customerName, phone, productDetails, quantity, totalPrice } = req.body;

    try {
        let customerId;
        const { data: custRow } = await supabase.from('customer').select('id').eq('phone', phone).single();
        
        if (custRow) {
            customerId = custRow.id;
        } else {
            const { data: newCust, error } = await supabase.from('customer').insert([{
                name: customerName,
                customer_type: 'B2C',
                phone: phone
            }]).select('id').single();
            if (error) throw error;
            customerId = newCust.id;
        }

        const { data: newJob, error: jobErr } = await supabase.from('job_order').insert([{
            customer_id: customerId,
            product_id: 1, // Mock product 1
            quantity: quantity,
            total_price: totalPrice,
            status: 'pending',
            production_stage: 'planning'
        }]).select('id').single();
        
        if (jobErr) throw jobErr;
        res.json({ success: true, jobId: newJob.id });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// React router fallback
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Enterprise Supabase Backend API running on http://localhost:${PORT}`);
});
