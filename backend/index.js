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
                platform: lead.platform || 'line',
                company_role: lead.company_role || null,
                sla_days: lead.sla_days || null,
                industry: lead.industry || null,
                company_revenue_grade: lead.company_revenue_grade || null,
                visit_required: lead.visit_required || false,
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
    const { erp_alias_name, tags, sales_status, company_role, sla_days, industry, company_revenue_grade, visit_required } = req.body;
    
    try {
        const updatePayload = { erp_alias_name, tags, sales_status };
        if (company_role !== undefined) updatePayload.company_role = company_role;
        if (sla_days !== undefined) updatePayload.sla_days = sla_days;
        if (industry !== undefined) updatePayload.industry = industry;
        if (company_revenue_grade !== undefined) updatePayload.company_revenue_grade = company_revenue_grade;
        if (visit_required !== undefined) updatePayload.visit_required = visit_required;
        
        const { error } = await supabase.from('lead_contact').update(updatePayload).eq('id', leadId);
        
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

app.put('/api/job_orders/:id/approve_payment', async (req, res) => {
    const jobId = req.params.id;
    try {
        const { error } = await supabase.from('job_order').update({
            production_stage: 'planning',
            status: 'progress' // Moves to kanban
        }).eq('id', jobId);
        
        if (error) throw error;
        res.json({ success: true });
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
            production_stage: 'awaiting_payment' // Blocks from entering Production Kanban until Accounting approves
        }]).select('id').single();
        
        if (jobErr) throw jobErr;
        res.json({ success: true, jobId: newJob.id });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ====== SALES MODULE ENDPOINTS ======
app.get('/api/customers', async (req, res) => {
    try {
        const { data, error } = await supabase.from('customer').select('id, name');
        if (error) throw error;
        const mapped = data.map(c => ({
            id: c.id,
            name: c.name || 'ลูกค้าทั่วไป',
            credit_limit: 50000 // Mock limit
        }));
        // Fallback if empty database
        if (mapped.length === 0) {
            mapped.push({ id: 1, name: "บริษัท ทดสอบ จำกัด", credit_limit: 100000 });
        }
        res.json(mapped);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/products', async (req, res) => {
    try {
        const { data, error } = await supabase.from('product').select('id, name');
        if (error) throw error;
        const mapped = data.map(p => ({
            ...p,
            base_price: 15.00
        }));
        if (mapped.length === 0) {
            mapped.push(
                { id: 1, name: "กล่องอาร์ตการ์ด 250g", base_price: 5 },
                { id: 2, name: "ใบปลิว A4", base_price: 0.8 },
                { id: 3, name: "โบรชัวร์ พับ 3", base_price: 2.5 }
            );
        }
        res.json(mapped);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/job_orders', async (req, res) => {
    const { customer_id, product_id, quantity, total_price } = req.body;
    try {
        const { data, error } = await supabase.from('job_order').insert([{
            customer_id,
            product_id, // Map the foreign key
            quantity,
            total_price,
            status: 'pending',
            production_stage: 'awaiting_payment'
        }]).select('id').single();
        if (error) throw error;
        res.json({ success: true, id: data.id });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ====== DASHBOARD & SEED ENDPOINTS ======
app.get('/api/dashboard/metrics', async (req, res) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        // 1. Get orders from last 30 days
        const { data: orders, error: oErr } = await supabase
            .from('job_order')
            .select('created_at, total_price, production_stage, status')
            .gte('created_at', thirtyDaysAgo.toISOString());
            
        // 2. Get active leads
        const { count: leadsCount } = await supabase
            .from('lead_contact')
            .select('id', { count: 'exact', head: true });
            
        if(oErr) throw oErr;
        
        let totalRevenue = 0;
        let completedOrders = 0;
        let stagesCount = { planning: 0, design: 0, printer: 0, diecut: 0, gluing: 0, shipping: 0 };
        
        // Ensure empty dates out of 30
        let recentDays = Array.from({length: 15}, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (14 - i));
            return { date: d.toISOString().split('T')[0], sales: 0 };
        });

        orders.forEach(o => {
            totalRevenue += o.total_price || 0;
            if(o.status === 'completed' || o.production_stage === 'shipping') completedOrders++;
            if(stagesCount[o.production_stage] !== undefined) {
                stagesCount[o.production_stage]++;
            } else {
                stagesCount[o.production_stage] = 1;
            }
            
            // Map daily sum
            const dStr = new Date(o.created_at).toISOString().split('T')[0];
            const dayObj = recentDays.find(d => d.date === dStr);
            if(dayObj) dayObj.sales += (o.total_price || 0);
        });

        res.json({
            totalRevenue,
            totalOrders: orders.length,
            completedOrders,
            leadsCount: leadsCount || 0,
            stagesCount,
            dailySales: recentDays
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// TEMPORARY ENDPOINT TO SEED MOCK DATA
app.get('/api/seed', async (req, res) => {
    try {
        const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
        const randomDateLast30Days = () => {
            const prevDate = new Date();
            prevDate.setDate(prevDate.getDate() - randomInt(0, 30));
            return prevDate.toISOString();
        };
        const STAGES = ['planning', 'design', 'printer', 'diecut', 'gluing', 'shipping'];
        
        // Just create 50 job orders randomly
        const jobsToInsert = [];
        for(let i=0; i<50; i++) {
            const qty = randomInt(500, 15000);
            const stage = STAGES[randomInt(0, STAGES.length - 1)];
            const isCompleted = Math.random() > 0.6 || stage === 'shipping';
            jobsToInsert.push({
                customer_id: 1, // Fallback to first customer
                product_id: 1, // Fallback to first product
                quantity: qty,
                total_price: qty * 2.5 * (1 + (Math.random() * 0.2)),
                status: isCompleted ? 'completed' : 'progress',
                production_stage: isCompleted ? 'shipping' : stage,
                created_at: randomDateLast30Days()
            });
        }
        await supabase.from('job_order').insert(jobsToInsert);
        
        // Create random leads with omni-channel platforms
        const PLATFORMS = ['line', 'line', 'line', 'facebook', 'facebook', 'tiktok'];
        const ROLES = ['จัดซื้อ', 'Marketing', 'เจ้าของกิจการ', 'Graphic Designer', null];
        const INDUSTRIES = ['ครีม/สกินแคร์', 'อาหารเสริม', 'เครื่องสำอาง', 'OEM โรงงาน', 'อีเว้นต์/ออกบูธ', 'ร้านอาหาร/คาเฟ่', null];
        const REVENUE_GRADES = [null, '50M', '100M', '200M', '500M', '1B'];
        const SLA_OPTIONS = [null, 1, 3, 7, 10, 14, 20, 30];
        const THAI_NAMES_FB = ['ร้านสวัสดีความงาม', 'แบรนด์ MiracleGlow', 'บจก.โกลเด้นแพค', 'ตลาดนัดครีเอทีฟ', 'ร้านลุงป้อม Printing'];
        const THAI_NAMES_TK = ['@beautybynam', '@creamcraftTH', '@boxdesign.co', '@cosmepack99', '@eventbox_bkk'];
        const THAI_NAMES_LINE = ['คุณมิ้ม จัดซื้อ ABC', 'พี่ปุ้ย GoldenPack', 'คุณนัท DesignHub', 'คุณแอน CreamFactory', 'พี่มาร์ค EventPro'];
        
        const leads = [];
        for(let i=0; i<30; i++){
            const platform = PLATFORMS[randomInt(0, PLATFORMS.length - 1)];
            let name = `User ${randomInt(100,999)}`;
            if (platform === 'facebook') name = THAI_NAMES_FB[randomInt(0, THAI_NAMES_FB.length - 1)];
            else if (platform === 'tiktok') name = THAI_NAMES_TK[randomInt(0, THAI_NAMES_TK.length - 1)];
            else name = THAI_NAMES_LINE[randomInt(0, THAI_NAMES_LINE.length - 1)];
            
            leads.push({
                line_user_id: `U_SEED_${platform}_${randomInt(10000,99999)}`,
                original_name: name,
                erp_alias_name: name,
                platform: platform,
                company_role: ROLES[randomInt(0, ROLES.length - 1)],
                industry: INDUSTRIES[randomInt(0, INDUSTRIES.length - 1)],
                company_revenue_grade: REVENUE_GRADES[randomInt(0, REVENUE_GRADES.length - 1)],
                sla_days: SLA_OPTIONS[randomInt(0, SLA_OPTIONS.length - 1)],
                visit_required: Math.random() > 0.7,
                created_at: randomDateLast30Days()
            });
        }
        await supabase.from('lead_contact').insert(leads);
        
        res.json({ success: true, message: "Seeded 50 jobs and 30 omni-channel leads!" });
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

// ====== DEEP CHAT ANALYTICS ======
app.get('/api/seed_chats', async (req, res) => {
    try {
        const { data: leads } = await supabase.from('lead_contact').select('id, created_at');
        if (!leads || leads.length === 0) return res.json({ error: 'No leads found to seed.' });
        
        const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
        
        const possibleChats = [
            { t: 'อยากได้กล่องแพคเกจจิ้งแบบในรูปนี้ค่ะ ทำได้ไหมคะ?', m: 'https://images.unsplash.com/photo-1595079676339-15348bb9bf04?auto=format&fit=crop&q=80&w=400' },
            { t: 'พิมพ์ใบปลิว 2000 ใบ ส่งด่วนวันศุกร์นี้เรทเท่าไหร่ครับ', m: null },
            { t: 'ขอราคาพิมพ์กล่องครีม 5,000 ใบค่ะ ไซส์ 5x5x10 cm', m: null },
            { t: 'แบบนี้ถ้าเจาะหน้าต่างพลาสติกใสด้วยคิดเพิ่มกี่บาท?', m: 'https://images.unsplash.com/photo-1620950341777-66a9d702afc5?auto=format&fit=crop&q=80&w=400' },
            { t: 'สติ๊กเกอร์ไดคัทวงกลม ขนาด 3cm ดวงละเท่าไหร่', m: null },
            { t: 'พี่คะ งานที่โอนไปเมื่อวาน จัดส่งรึยังคะ ด่วนมากๆ', m: null },
            { t: 'สนใจพิมพ์โบรชัวร์ขนาด A4 พับ 3 ครับ ขอใบเสนอราคาด้วยจัดซื้อ', m: null },
            { t: 'สีที่ได้จากการพิมพ์จะเพี้ยนจากหน้าจอมั้ยคะ มีปรู๊ฟสีฟรีมั้ย?', m: 'https://images.unsplash.com/photo-1596489370830-10901e8ce4cc?auto=format&fit=crop&q=80&w=400' },
            { t: 'กล่องลูกฟูกห่อของ ส่งไปรษณีย์ มีไซส์มาตรฐานมั้ย หรือต้องสั่งทำ?', m: null },
            { t: 'ใช้กระดาษอาร์ตการ์ด 300 แกรม เคลือบด้าน สปอตยูวี เฉพาะโลโก้', m: null }
        ];

        let msgPayloads = [];

        // Distribute around 100 messages total across random leads
        for(let i=0; i<100; i++) {
            const lead = leads[randomInt(0, leads.length - 1)];
            const chatObj = possibleChats[randomInt(0, possibleChats.length - 1)];
            
            // Randomize hour of day by taking lead's created_at and adding random hours
            const baseTime = new Date(lead.created_at);
            // shift between 8 AM and 10 PM
            const hourOffset = randomInt(8, 22);
            baseTime.setUTCHours(hourOffset);
            baseTime.setUTCMinutes(randomInt(0, 59));

            msgPayloads.push({
                lead_id: lead.id,
                sender: 'client',
                type: chatObj.m ? 'image' : 'text',
                text_content: chatObj.t,
                media_url: chatObj.m,
                created_at: baseTime.toISOString()
            });
            
            // 70% chance Admin replies
            if (Math.random() > 0.3) {
                baseTime.setUTCMinutes(baseTime.getUTCMinutes() + randomInt(2, 30)); // 2 to 30 min reply time
                msgPayloads.push({
                    lead_id: lead.id,
                    sender: 'admin',
                    type: 'text',
                    text_content: 'แอดมินรับทราบครับ แนะนำส่งแบบหรือขนาดเพื่อให้ตีราคานะครับ',
                    created_at: baseTime.toISOString()
                });
            }
        }

        await supabase.from('chat_message').insert(msgPayloads);
        res.json({ success: true, count: msgPayloads.length, message: "Mock Deep chats fully seeded!" });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/dashboard/insights', async (req, res) => {
    try {
        const { data: chats, error } = await supabase
            .from('chat_message')
            .select('text_content, type, media_url, created_at, sender')
            .eq('sender', 'client'); // Only analyze client behaviors
            
        if (error) throw error;
        
        let wordFreq = {
            'กล่อง': 0, 'ใบปลิว': 0, 'สติ๊กเกอร์': 0, 'ด่วน': 0, 
            'ราคา': 0, 'ส่ง': 0, 'โบรชัวร์': 0, 'แบบ': 0
        };
        
        let peakHours = Array(24).fill(0);
        let gallery = [];
        let totalClientMsgs = chats.length;

        chats.forEach(msg => {
            // Hours Analytics
            const hour = new Date(msg.created_at).getUTCHours() + 7; // Convert UTC to GMT+7 naive
            const localHour = hour >= 24 ? hour - 24 : hour; 
            peakHours[localHour] += 1;
            
            // Image Gallery
            if (msg.type === 'image' && msg.media_url) {
                gallery.push(msg.media_url);
            }
            
            // Keyword Freq
            if (msg.text_content) {
                const text = msg.text_content;
                if (text.includes('กล่อง') || text.includes('แพคเกจ')) wordFreq['กล่อง']++;
                if (text.includes('ใบปลิว')) wordFreq['ใบปลิว']++;
                if (text.includes('สติ๊กเกอร์')) wordFreq['สติ๊กเกอร์']++;
                if (text.includes('ด่วน')) wordFreq['ด่วน']++;
                if (text.includes('เรท') || text.includes('ราคา') || text.includes('กี่บาท')) wordFreq['ราคา']++;
                if (text.includes('ส่ง') || text.includes('จัดส่ง')) wordFreq['ส่ง']++;
                if (text.includes('โบรชัวร์')) wordFreq['โบรชัวร์']++;
                if (text.includes('แบบ') || text.includes('ปรู๊ฟ')) wordFreq['แบบ']++;
            }
        });

        // Filter valid gallery uniques
        const uniqueGallery = [...new Set(gallery)].slice(0, 8); // Max 8 unique images

        res.json({
            success: true,
            totalClientMsgs,
            wordFreq,
            peakHours,
            gallery: uniqueGallery
        });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// React router fallback
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Enterprise Supabase Backend API running on http://localhost:${PORT}`);
});
