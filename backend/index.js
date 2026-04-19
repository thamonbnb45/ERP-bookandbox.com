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

        // Auto-generate ERP alias in Bookandbox format: {Status}-{Sales}-{Name}{DD.MM.YY}
        const now = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Bangkok"}));
        const dd = now.getDate();
        const mm = now.getMonth() + 1;
        const buddhistYear = (now.getFullYear() + 543) % 100; // 2 digit Buddhist year
        const dateTag = `${dd}.${mm}.${buddhistYear}`;
        const erpAlias = `I--${originalName}${dateTag}`;

        const { data: newRow, error: insertErr } = await supabase.from('lead_contact')
            .insert([{
                line_user_id: lineUserId,
                original_name: originalName,
                erp_alias_name: erpAlias,
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
        });
    } catch (e) {
        return null;
    }
}

const getAIBestMatch = async (message) => {
    try {
        let { data: kbItems } = await supabase.from('knowledge_base').select('*');
        if (!kbItems || kbItems.length === 0) {
            kbItems = [
                { category: 'pricing', trigger_keywords: 'สติกเกอร์,ดวงละ,3cm,3 ซม,ราคา', content: 'สวัสดีครับ ยินดีให้บริการครับ 🙏\n\nสำหรับสติกเกอร์ไดคัทขนาด 3 ซม. แอดมินแนะนำเป็นเนื้อ PP (กันน้ำ 100% แช่เย็นได้) ภาพคมชัดกาวแน่นครับ\n\n📌 เรทราคาเบื้องต้น:\n• สั่ง 1,000 ดวง: ตกประมานดวงละ 0.80 บาท\n• สั่ง 5,000 ดวง (คุ้มสุด✨): ตกประมานดวงละ 0.50 บาท\n\nงานผลิตรวดเร็ว หากลูกค้ามีไฟล์แบบแล้ว สามารถส่งให้แอดมินเช็คความคมชัดให้ฟรีได้เลยนะครับ 😊' },
                { category: 'specs', trigger_keywords: 'กระดาษ,ลูกฟูก,กล่อง,หนา,รับน้ำหนัก', content: 'สวัสดีครับ แอดมินขออนุญาตแนะนำสเปคที่เหมาะสมที่สุดให้นะครับ 📦\n\n• หากเป็นกล่องใส่สินค้าทั่วไป เน้นความสวยงาม: แนะนำเป็นกระดาษอาร์ตการ์ด 350 แกรม พิมพ์สีสด ทรงสวยครับ\n• หากสินค้ามีน้ำหนัก หรือต้องส่งผ่านขนส่ง: แนะนำเป็นกล่องลูกฟูกลอน E (จั่วปัง) โครงสร้างจะแข็งแรงเป็นพิเศษครับ\n\nเบื้องต้นคุณลูกค้าต้องการใส่สินค้าประเภทไหน แจ้งแอดมินให้ช่วยประเมินได้เลยนะครับ ยินดีให้คำปรึกษาฟรีครับ ✨' },
                { category: 'delivery', trigger_keywords: 'ส่ง,กี่วัน,จัดส่ง,ค่าส่ง,เวลา', content: 'สำหรับการจัดส่งและการผลิตของทางโรงพิมพ์เรา 🚚\n\n• ระยะเวลาผลิต: ประมาณ 10-14 วันทำการ หลังคอนเฟิร์มแบบพิมพ์ครับ\n• การจัดส่ง: พิเศษสุด! จัดส่งฟรีในเขต กทม. และปริมณฑล เมื่อมียอดสั่งผลิตเกิน 10,000 บาทครับ\n*(สำหรับต่างจังหวัด คิดค่าส่งตามเรทขนส่งจริง ไม่มีบวกเพิ่มครับ)\n\nหากงานลูกค้ารีบใช้ด่วน แจ้งวันที่ต้องการสินค้ากับแอดมินได้เลยนะครับ จะได้เช็คคิวแทรกให้เป็นกรณีพิเศษครับ 🙏' },
                { category: 'print', trigger_keywords: 'ใบปลิว,แผ่นพับ,1000,1,000', content: 'สวัสดีครับ ขอบคุณที่ให้ความไว้วางใจโรงพิมพ์ของเรานะครับ 🙏\n\nสำหรับงานพิมพ์ใบปลิว 1,000 ใบ แอดมินแนะนำเป็นกระดาษอาร์ตมัน 130 แกรม ซึ่งเป็นสเปคมาตรฐานที่ให้สีสันสวยงาม ดูพรีเมียมครับ\n\n📌 สรุปราคาประเมิน:\n• ราคาต่อใบ: เพียง 1.50 บาท/ใบ\n• ยอดรวมทั้งสิ้น: 1,500 บาท\n• ระยะเวลาผลิตด่วน: 3-5 วันทำการ\n\nหากลูกค้ายืนยันสเปคนี้ สามารถแจ้งชื่อ เบอร์โทร และที่อยู่จัดส่งได้เลยครับ แอดมินจะดำเนินการจองคิวผลิตให้ทันทีครับ 😊'}
            ];
        }
        
        let bestMatch = null;
        let highestScore = 0;
        
        for (const item of kbItems) {
            const keywords = item.trigger_keywords.split(',').map(k => k.trim().toLowerCase());
            let score = 0;
            keywords.forEach(kw => {
                if (message.toLowerCase().includes(kw)) score++;
            });
            if (score > highestScore) {
                highestScore = score;
                bestMatch = item.content;
            }
        }
        return bestMatch;
    } catch(e) {
        return null;
    }
};

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

                // Auto-Responder Logic (นอกเวลาทำการ 17:30 - 08:30)
                if (msgType === 'text') {
                    const thTime = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Bangkok"}));
                    const timeNum = thTime.getHours() * 100 + thTime.getMinutes();
                    const isAfterHours = timeNum >= 1730 || timeNum < 830;

                    if (isAfterHours && channelToken !== 'DUMMY_TOKEN') {
                        const aiResponse = await getAIBestMatch(textContent);
                        if (aiResponse) {
                            const autoReplyTxt = `🌙 [ระบบตอบยามวิกาล]\nขณะนี้แอดมินอยู่นอกเวลาทำการ (08.30-17.30น.)\nระบบขอประเมินข้อมูลเบื้องต้นให้คุณลูกค้าดังนี้ครับ 👇\n\n---\n${aiResponse}\n---\n\nเมื่อแอดมินกลับมาจะรีบตรวจสอบคิวงานให้ทันที รบกวนแจ้งชื่อ-เบอร์โทรติดต่อไว้ได้เลยครับ 🙏`;
                            
                            // Send auto-reply to LINE using correct v11 syntax
                            try {
                                let success = false;
                                if (event.replyToken) {
                                    try {
                                        await lineClient.replyMessage({
                                            replyToken: event.replyToken,
                                            messages: [{ type: 'text', text: autoReplyTxt }]
                                        });
                                        success = true;
                                    } catch(e) {
                                        console.error('replyMessage failed, attempting pushMessage');
                                    }
                                }
                                
                                if (!success) {
                                    await lineClient.pushMessage({
                                        to: userId,
                                        messages: [{ type: 'text', text: autoReplyTxt }]
                                    });
                                }
                                
                                // Save to DB so admin sees it
                                await supabase.from('chat_message').insert([{
                                    lead_id: leadId,
                                    sender: 'admin',
                                    type: 'text',
                                    text_content: autoReplyTxt
                                }]);
                            } catch (replyErr) {
                                await supabase.from('chat_message').insert([{
                                    lead_id: leadId,
                                    sender: 'admin',
                                    type: 'text',
                                    text_content: `[SDK ERROR LOG] ` + (replyErr.message || JSON.stringify(replyErr))
                                }]);
                            }
                        }
                    }
                }
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
        
        // Filter out seeded mock leads (keep only real LINE/FB/TikTok customers)
        const realLeads = leads.filter(l => !l.line_user_id.startsWith('U_SEED_'));
        const promises = realLeads.map(async (lead) => {
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
        // Sort by latest message timestamp (newest first)
        data.sort((a, b) => {
            const aLast = a.messages.length > 0 ? new Date(a.messages[a.messages.length - 1].created_at) : new Date(0);
            const bLast = b.messages.length > 0 ? new Date(b.messages[b.messages.length - 1].created_at) : new Date(0);
            return bLast - aLast;
        });
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

app.post('/api/chats/:id/convert-to-order', async (req, res) => {
    const leadId = req.params.id;
    const { product_id, quantity, total_price } = req.body;
    
    try {
        // 1. Get Lead
        const { data: lead, error: leadErr } = await supabase.from('lead_contact').select('*').eq('id', leadId).single();
        if (leadErr || !lead) return res.status(404).json({error: 'Lead not found'});
        
        let customerId = lead.customer_id;
        
        // 2. Create customer if not exists
        if (!customerId) {
            const { data: cust, error: custErr } = await supabase.from('customer').insert([{
                name: lead.erp_alias_name || lead.original_name,
                credit_limit: 0
            }]).select('id').single();
            if (custErr) throw custErr;
            customerId = cust.id;
            
            // update lead
            await supabase.from('lead_contact').update({ customer_id: customerId }).eq('id', leadId);
        }
        
        // 3. Create job order
        const { data: job, error: jobErr } = await supabase.from('job_order').insert([{
            customer_id: customerId,
            product_id: parseInt(product_id),
            quantity: parseInt(quantity),
            total_price: parseFloat(total_price),
            status: 'pending',
            production_stage: 'awaiting_payment'
        }]).select('id').single();
        if (jobErr) throw jobErr;
        
        // 4. Update sales status to won
        await supabase.from('lead_contact').update({ sales_status: 'won' }).eq('id', leadId);
        
        res.json({ success: true, job_id: job.id });
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

// One-time migration: reformat existing leads to Bookandbox naming convention
app.get('/api/migrate-names', async (req, res) => {
    try {
        const { data: leads } = await supabase.from('lead_contact').select('*');
        if (!leads) return res.json({ error: 'No leads found' });

        let updated = 0;
        for (const lead of leads) {
            // Skip leads that already have the format (contain at least 2 dashes like I-aem-Name)
            if (lead.erp_alias_name && lead.erp_alias_name.includes('-') && lead.erp_alias_name.split('-').length >= 3) {
                continue;
            }
            // Skip mock/seeded leads
            if (lead.line_user_id.startsWith('U_SEED_')) continue;

            // Use the lead's first message date, or created_at, or now
            let dateSource = lead.created_at ? new Date(lead.created_at) : new Date();
            
            // Try to get the first message date for more accuracy
            const { data: firstMsg } = await supabase.from('chat_message')
                .select('created_at')
                .eq('lead_id', lead.id)
                .order('id', { ascending: true })
                .limit(1);
            if (firstMsg && firstMsg.length > 0) {
                dateSource = new Date(firstMsg[0].created_at);
            }

            // Convert to Thai time
            const thDate = new Date(dateSource.toLocaleString("en-US", {timeZone: "Asia/Bangkok"}));
            const dd = thDate.getDate();
            const mm = thDate.getMonth() + 1;
            const buddhistYear = (thDate.getFullYear() + 543) % 100;
            const dateTag = `${dd}.${mm}.${buddhistYear}`;

            const name = lead.original_name || 'Unknown';
            const newAlias = `I--${name}${dateTag}`;

            await supabase.from('lead_contact')
                .update({ erp_alias_name: newAlias })
                .eq('id', lead.id);
            updated++;
        }

        res.json({ success: true, updated, total: leads.length, message: `Migrated ${updated} leads to Bookandbox naming convention` });
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

// ====== AI KNOWLEDGE BASE ENDPOINTS ======
app.get('/api/kb/init', async (req, res) => {
    try {
        const { error } = await supabase.rpc('run_sql', { sql: `
            CREATE TABLE IF NOT EXISTS knowledge_base (
              id SERIAL PRIMARY KEY,
              category TEXT NOT NULL,
              trigger_keywords TEXT NOT NULL,
              content TEXT NOT NULL,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        ` });
        await supabase.from('knowledge_base').insert([
            { category: 'pricing', trigger_keywords: 'สติกเกอร์,ดวงละ,3cm,3 ซม,ราคา', content: 'สำหรับสติกเกอร์ไดคัทขนาด 3cm จะอยู่ที่ดวงละประมาณ 0.50 - 0.80 บาท ขึ้นอยู่กับเนื้อสติกเกอร์ (PP/PVC) และจำนวนที่สั่งผลิตค่ะ หากสั่งจำนวนมากเกิน 5,000 ดวง ราคาจะถูกลงอีกค่ะ' },
            { category: 'specs', trigger_keywords: 'กระดาษ,ลูกฟูก,อาร์ตการ์ด,หนา,รับน้ำหนัก', content: 'แอดมินแนะนำเป็นกระดาษอาร์ตการ์ด 350 แกรมสำหรับกล่องทั่วไปค่ะ แต่ถ้าต้องการรับน้ำหนักมาก แนะนำเป็นกล่องลูกฟูกลอน E หุ้มกระดาษพิมพ์ลายจะแข็งแรงที่สุดครับ' },
            { category: 'delivery', trigger_keywords: 'ส่ง,กี่วัน,จัดส่ง,ค่าส่ง', content: 'ระยะเวลาผลิตปกติ 10-14 วัน จัดส่งฟรีในกรุงเทพฯ และปริมณฑลเมื่อสั่งยอดเกิน 10,000 บาทครับ สำหรบต่างจังหวัดคิดค่าส่งตามจริงครับ' }
        ]);
        res.send('KB init check');
    } catch (e) {
        res.send(e.message);
    }
});

app.get('/api/kb', async (req, res) => {
    const { data } = await supabase.from('knowledge_base').select('*').order('id', { ascending: false });
    res.json(data || []);
});

app.post('/api/ai/suggest', async (req, res) => {
    const { message } = req.body;
    try {
        const bestMatch = await getAIBestMatch(message);
        if (bestMatch) {
            res.json({ suggestion: bestMatch, is_ai: true });
        } else {
            res.json({ suggestion: "สวัสดีครับ สนใจสั่งผลิตงานพิมพ์ประเภทไหน แจ้งรายละเอียด จำนวน และสเปคเบื้องต้นให้แอดมินประเมินราคาให้ได้เลยนะครับ ยินดีให้บริการครับ 😊", is_ai: false });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ====== HR MODULE ======
app.get('/api/hr/employees', async (req, res) => {
    try {
        const { data, error } = await supabase.from('employee').select('*').order('department').order('id');
        if (error) throw error;
        res.json(data || []);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/hr/employees', async (req, res) => {
    const { name, role, department, salary, cost_type } = req.body;
    try {
        const { data, error } = await supabase.from('employee').insert([{
            name, role, department, salary, cost_type, status: 'active'
        }]).select('id').single();
        if (error) throw error;
        res.json({ success: true, id: data.id });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/hr/task_logs', async (req, res) => {
    try {
        const { data, error } = await supabase.from('task_log').select('*').order('started_at', { ascending: false }).limit(500);
        if (error) throw error;
        res.json(data || []);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/hr/seed', async (req, res) => {
    try {
        // Check if already seeded
        const { count } = await supabase.from('employee').select('id', { count: 'exact', head: true });
        if (count && count > 20) return res.json({ message: 'Already seeded!' });
        
        const employees = [
            // Pre-press (5)
            { name: 'สมชาย เลย์เก่ง', role: 'คนเลย์งาน (Imposition)', department: 'pre_press', salary: 20000, cost_type: 'cogs' },
            { name: 'นิดา ตรวจดี', role: 'ตรวจไฟล์ Preflight', department: 'pre_press', salary: 18000, cost_type: 'cogs' },
            { name: 'วิชัย เช็คงาน', role: 'ตรวจไฟล์ Preflight', department: 'pre_press', salary: 18000, cost_type: 'cogs' },
            { name: 'ประเสริฐ ทำเพลท', role: 'CTP Plate Maker', department: 'pre_press', salary: 17000, cost_type: 'cogs' },
            { name: 'ศิลป์ ออกแบบ', role: 'Graphic Designer', department: 'pre_press', salary: 23000, cost_type: 'cogs' },
            // Print A2 (2)
            { name: 'อนุชา เครื่อง A2', role: 'ช่างพิมพ์หลัก A2', department: 'print_a2', salary: 27000, cost_type: 'cogs' },
            { name: 'มานพ ป้อนกระดาษ', role: 'ผู้ช่วยช่างพิมพ์ A2', department: 'print_a2', salary: 19000, cost_type: 'cogs' },
            // Print A1 (3)
            { name: 'ธนกฤต เครื่อง A1', role: 'ช่างพิมพ์หลัก A1', department: 'print_a1', salary: 25000, cost_type: 'cogs' },
            { name: 'สุรเดช ผู้ช่วย A1', role: 'ผู้ช่วยช่างพิมพ์ A1', department: 'print_a1', salary: 18000, cost_type: 'cogs' },
            { name: 'เกียรติ ผู้ช่วย A1', role: 'ผู้ช่วยช่างพิมพ์ A1', department: 'print_a1', salary: 18000, cost_type: 'cogs' },
            // Post-press (10)
            { name: 'วิโรจน์ ตัดหลัก', role: 'ตัดกระดาษ (หลัก)', department: 'post_press', salary: 20000, cost_type: 'cogs' },
            { name: 'สมศักดิ์ จัดกอง', role: 'ตัดกระดาษ (ผู้ช่วย)', department: 'post_press', salary: 13000, cost_type: 'cogs' },
            { name: 'อรทัย พับงาน', role: 'พับกระดาษ', department: 'post_press', salary: 19000, cost_type: 'cogs' },
            { name: 'นภา เย็บมุง', role: 'เย็บเล่ม', department: 'post_press', salary: 18000, cost_type: 'cogs' },
            { name: 'ชัยวัฒน์ ปั๊มฟอยล์', role: 'ปั๊มไดคัท/ฟอยล์', department: 'post_press', salary: 20000, cost_type: 'cogs' },
            { name: 'อมรรัตน์ ปะกาว', role: 'ปั๊มปะกาว/ประกอบกล่อง', department: 'post_press', salary: 18000, cost_type: 'cogs' },
            { name: 'สุดา หลังพิมพ์ 1', role: 'พนักงานหลังพิมพ์ทั่วไป', department: 'post_press', salary: 15000, cost_type: 'cogs' },
            { name: 'จันทร์ หลังพิมพ์ 2', role: 'พนักงานหลังพิมพ์ทั่วไป', department: 'post_press', salary: 15000, cost_type: 'cogs' },
            { name: 'แก้ว หลังพิมพ์ 3', role: 'พนักงานหลังพิมพ์ทั่วไป', department: 'post_press', salary: 15000, cost_type: 'cogs' },
            { name: 'เพ็ญ หลังพิมพ์ 4', role: 'พนักงานหลังพิมพ์ทั่วไป', department: 'post_press', salary: 15000, cost_type: 'cogs' },
            // Shipping (5)
            { name: 'สมาน สโตร์', role: 'สโตร์/คลังสินค้า', department: 'shipping', salary: 12000, cost_type: 'cogs' },
            { name: 'พรพิมล ประสาน', role: 'ประสานงานจัดส่ง', department: 'shipping', salary: 16000, cost_type: 'cogs' },
            { name: 'อดิศร ขับรถ 1', role: 'ขับรถส่งของ', department: 'shipping', salary: 16000, cost_type: 'cogs' },
            { name: 'บุญมี ขับรถ 2', role: 'ขับรถส่งของ', department: 'shipping', salary: 16000, cost_type: 'cogs' },
            { name: 'ดนัย แมสเซ็นเจอร์', role: 'แมสเซ็นเจอร์', department: 'shipping', salary: 16000, cost_type: 'cogs' },
            // Sales (5)
            { name: 'ณัฐวุฒิ เซลส์ 1', role: 'พนักงานขาย', department: 'sales', salary: 12000, cost_type: 'sga' },
            { name: 'ปิยะ เซลส์ 2', role: 'พนักงานขาย', department: 'sales', salary: 12000, cost_type: 'sga' },
            { name: 'กมล เซลส์ 3', role: 'พนักงานขาย', department: 'sales', salary: 12000, cost_type: 'sga' },
            { name: 'น้ำฝน เซลส์ 4', role: 'พนักงานขาย', department: 'sales', salary: 12000, cost_type: 'sga' },
            { name: 'ธีรยุทธ เซลส์ 5', role: 'พนักงานขาย', department: 'sales', salary: 12000, cost_type: 'sga' },
            // Admin (3)
            { name: 'จิราภา แอดมิน 1', role: 'แอดมิน', department: 'admin', salary: 12000, cost_type: 'sga' },
            { name: 'กรกนก แอดมิน 2', role: 'แอดมิน', department: 'admin', salary: 12000, cost_type: 'sga' },
            { name: 'ธนพล มาร์เก็ตติ้ง', role: 'การตลาด', department: 'admin', salary: 25000, cost_type: 'sga' },
            // Accounting (2)
            { name: 'มาลิณี หัวหน้าบัญชี', role: 'หัวหน้าบัญชี', department: 'accounting', salary: 30000, cost_type: 'sga' },
            { name: 'กนกวรรณ บุคลากร', role: 'HR/บุคลากร', department: 'accounting', salary: 15000, cost_type: 'sga' },
            // Management (4)
            { name: 'วิศวะ ผู้จัดการ', role: 'ผู้จัดการโรงพิมพ์', department: 'management', salary: 50000, cost_type: 'sga' },
            { name: 'อัญชลี ผู้ช่วย ผจก.', role: 'ผู้ช่วยผู้จัดการ', department: 'management', salary: 35000, cost_type: 'sga' },
            { name: 'ประพันธ์ หัวหน้าผลิต', role: 'หัวหน้าฝ่ายผลิต', department: 'management', salary: 35000, cost_type: 'sga' },
            { name: 'ลดาวัลย์ ประสานผลิต', role: 'ประสานงานผลิต', department: 'management', salary: 13000, cost_type: 'sga' },
        ];
        
        await supabase.from('employee').insert(employees);
        res.json({ success: true, count: employees.length, message: 'Seeded 42 employees!' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/hr/assign', async (req, res) => {
    const { job_order_id, employee_id } = req.body;
    try {
        // Get job info for stage
        const { data: job } = await supabase.from('job_order').select('production_stage').eq('id', job_order_id).single();
        const { data: emp } = await supabase.from('employee').select('name').eq('id', employee_id).single();
        
        const { error } = await supabase.from('task_log').insert([{
            job_order_id,
            employee_id,
            task_name: `JOB #${job_order_id} - ${emp?.name || 'Unknown'}`,
            stage: job?.production_stage || 'planning',
            started_at: new Date().toISOString(),
            duration_minutes: Math.floor(Math.random() * 120 + 30) // Simulated for now
        }]);
        if (error) throw error;
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ====== SEASONAL ANALYTICS ======
app.get('/api/dashboard/seasonal', async (req, res) => {
    try {
        // Get ALL orders (not just 30 days) for seasonal analysis
        const { data: orders, error: oErr } = await supabase
            .from('job_order')
            .select('created_at, total_price, status');
        
        // Get leads with platform & industry info
        const { data: leads, error: lErr } = await supabase
            .from('lead_contact')
            .select('platform, industry');
            
        if (oErr) throw oErr;
        
        // Monthly aggregation (simulate 12 months data using existing + projected)
        const MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
        // Seasonal multipliers based on real printing industry patterns
        // Calendar season peaks Jul-Oct, gift boxes peak Nov-Dec
        const SEASONAL_MULTIPLIER = [0.6, 0.5, 0.7, 0.65, 0.7, 0.8, 1.2, 1.4, 1.5, 1.8, 1.3, 0.9];
        
        const baseOrders = orders ? Math.max(Math.round(orders.length / 2), 5) : 10;
        const baseRevenue = orders ? Math.round(orders.reduce((s, o) => s + (o.total_price || 0), 0) / 3) : 50000;
        
        const monthlyOrders = MONTHS.map((month, idx) => ({
            month,
            orders: Math.round(baseOrders * SEASONAL_MULTIPLIER[idx]),
            revenue: Math.round(baseRevenue * SEASONAL_MULTIPLIER[idx])
        }));
        
        // Platform distribution
        let platformCount = { LINE: 0, Facebook: 0, TikTok: 0 };
        let industryCount = {};
        if (leads) {
            leads.forEach(l => {
                const p = (l.platform || 'line').toLowerCase();
                if (p === 'line') platformCount.LINE++;
                else if (p === 'facebook') platformCount.Facebook++;
                else if (p === 'tiktok') platformCount.TikTok++;
                
                if (l.industry) {
                    industryCount[l.industry] = (industryCount[l.industry] || 0) + 1;
                }
            });
        }
        
        const platformDist = Object.keys(platformCount)
            .filter(k => platformCount[k] > 0)
            .map(k => ({ name: k, value: platformCount[k] }));
            
        const industryDist = Object.keys(industryCount)
            .map(k => ({ name: k, value: industryCount[k] }))
            .sort((a, b) => b.value - a.value);
        
        res.json({ monthlyOrders, platformDist, industryDist });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ====== CUSTOMER JOB TRACKING (PUBLIC) ======
app.get('/api/portal/track/:phone', async (req, res) => {
    const phone = req.params.phone;
    try {
        // Find customer by phone
        const { data: customer, error: cErr } = await supabase
            .from('customer')
            .select('id, name, phone')
            .eq('phone', phone)
            .single();
            
        if (cErr || !customer) return res.status(404).json({ error: 'ไม่พบหมายเลขโทรศัพท์นี้ในระบบ' });
        
        // Get all orders for this customer
        const { data: orders, error: oErr } = await supabase
            .from('job_order')
            .select('id, quantity, total_price, status, production_stage, tracking_number, created_at, product(name)')
            .eq('customer_id', customer.id)
            .order('created_at', { ascending: false });
            
        if (oErr) throw oErr;
        
        const formattedOrders = (orders || []).map(o => ({
            id: o.id,
            product: o.product ? o.product.name : 'สินค้า',
            quantity: o.quantity,
            total_price: o.total_price,
            status: o.status,
            production_stage: o.production_stage,
            tracking_number: o.tracking_number,
            created_at: o.created_at
        }));
        
        res.json({ customer: { name: customer.name }, orders: formattedOrders });
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
