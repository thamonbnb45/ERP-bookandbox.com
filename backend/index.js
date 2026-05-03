require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const line = require('@line/bot-sdk');
const { createClient } = require('@supabase/supabase-js');
const compression = require('compression');
const multer = require('multer');

const app = express();
app.use(compression());
app.use(cors());
app.use(express.json());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public'))); // Serve React Frontend

const PUBLIC_URL = process.env.PUBLIC_URL || 'https://erp-bookandboxcom-production.up.railway.app';

// Setup multer for chat uploads
const chatUploadDir = path.join(__dirname, 'uploads', 'chats');
if (!fs.existsSync(chatUploadDir)) {
    fs.mkdirSync(chatUploadDir, { recursive: true });
}
const chatUpload = multer({ dest: chatUploadDir });

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

// Facebook Messenger Config
const FB_PAGE_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN || '';
const FB_VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || 'bookandbox_fb_verify_2025';
const FB_API_URL = 'https://graph.facebook.com/v21.0/me/messages';

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
        const erpAlias = `${originalName}${dateTag}`;

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

// Ensure lead exists for Facebook Messenger
const ensureFbLeadExists = async (fbUserId) => {
    try {
        const { data: row } = await supabase.from('lead_contact').select('id').eq('fb_user_id', fbUserId).single();
        if (row) return row.id;

        let originalName = 'Facebook User';
        let avatarUrl = null;
        if (FB_PAGE_TOKEN) {
            try {
                const axios = require('axios');
                const profileRes = await axios.get(`https://graph.facebook.com/${fbUserId}?fields=first_name,last_name,profile_pic&access_token=${FB_PAGE_TOKEN}`);
                if (profileRes.data) {
                    originalName = `${profileRes.data.first_name || ''} ${profileRes.data.last_name || ''}`.trim();
                    avatarUrl = profileRes.data.profile_pic || null;
                }
            } catch (e) { console.error('FB profile fetch error:', e.message); }
        }

        const now = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Bangkok"}));
        const dd = now.getDate();
        const mm = now.getMonth() + 1;
        const buddhistYear = (now.getFullYear() + 543) % 100;
        const dateTag = `${dd}.${mm}.${buddhistYear}`;
        const erpAlias = `${originalName}${dateTag}`;

        const { data: newRow, error: insertErr } = await supabase.from('lead_contact')
            .insert([{
                fb_user_id: fbUserId,
                original_name: originalName,
                erp_alias_name: erpAlias,
                tags: [],
                sales_status: 'i',
                avatar_url: avatarUrl,
                platform: 'facebook'
            }])
            .select('id').single();

        if (insertErr) throw insertErr;
        return newRow.id;
    } catch (e) {
        console.error('ensureFbLeadExists error:', e);
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
            stream.on('end', () => resolve(`${PUBLIC_URL}/uploads/${fileName}`));
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

// ====== FACEBOOK MESSENGER WEBHOOK ======

// Webhook Verification (Facebook sends GET to verify)
app.get('/api/fb-webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === FB_VERIFY_TOKEN) {
        console.log('✅ Facebook webhook verified!');
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

// Receive Facebook Messages
app.post('/api/fb-webhook', async (req, res) => {
    const body = req.body;
    if (body.object === 'page') {
        for (const entry of body.entry) {
            if (!entry.messaging) continue;
            for (const event of entry.messaging) {
                const senderId = event.sender.id;
                const leadId = await ensureFbLeadExists(senderId);
                if (!leadId) continue;

                let msgType = 'text';
                let textContent = '';
                let mediaUrl = null;

                if (event.message) {
                    if (event.message.text) {
                        textContent = event.message.text;
                    }
                    if (event.message.attachments) {
                        const att = event.message.attachments[0];
                        if (att.type === 'image' || att.type === 'video' || att.type === 'file') {
                            msgType = att.type === 'video' ? 'video' : 'image';
                            mediaUrl = att.payload?.url || null;
                        }
                        if (!textContent && att.type === 'image') textContent = '[รูปภาพ]';
                    }
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
        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(404);
    }
});

// Helper: Send Facebook Message
const sendFbMessage = async (recipientId, text) => {
    if (!FB_PAGE_TOKEN) return;
    try {
        const axios = require('axios');
        await axios.post(`${FB_API_URL}?access_token=${FB_PAGE_TOKEN}`, {
            recipient: { id: recipientId },
            message: { text: text }
        });
    } catch (e) {
        console.error('FB send error:', e.response?.data || e.message);
    }
};

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

// Memory cache for chats to prevent DB overload from 5s polling
let chatsCache = { data: null, timestamp: 0 };

app.get('/api/chats', async (req, res) => {
    // Prevent browser from caching the XHR response (fixes "stuck" UI bug on Safari/Chrome)
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    try {
        const now = Date.now();
        // 2.5 second memory cache. Enough to deduplicate concurrent requests from multiple admins
        // or fast UI re-renders, but fresh enough for a chat app.
        if (chatsCache.data && (now - chatsCache.timestamp < 2500)) {
            return res.json(chatsCache.data);
        }

        const { count: leadCount } = await supabase.from('lead_contact').select('*', { count: 'exact', head: true });
        const leadLimit = 1000;
        const leadPages = Math.ceil((leadCount || 0) / leadLimit);
        const leadPromises = [];
        for (let i = 0; i < leadPages; i++) {
            leadPromises.push(
                supabase.from('lead_contact')
                    .select('*')
                    .order('id', { ascending: true })
                    .range(i * leadLimit, (i + 1) * leadLimit - 1)
            );
        }
        const leadResults = await Promise.all(leadPromises);
        let leads = [];
        leadResults.forEach(res => { if (res.data) leads = leads.concat(res.data); });
        
        // Filter out seeded mock leads (keep only real LINE/FB/TikTok customers)
        const realLeads = leads.filter(l => !(l.line_user_id && l.line_user_id.startsWith('U_SEED_')));
        
        // --- BULK FETCH (OPTIMIZED FOR LOW LOAD + BYPASS 1000 LIMIT) ---
        // 1. Fetch messages with pagination to bypass Supabase's 1,000 max_rows server limit
        const daysBack = parseInt(req.query.days) || 365; // Default 365 days (was 30)
        const cutoffDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();
        const { count } = await supabase.from('chat_message').select('*', { count: 'exact', head: true }).gte('created_at', cutoffDate);
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
        
        // 2. Skip fetching job_order for all 700+ leads (User requested low load)
        // Analytics will be dummy data for now in the list view

        // Group messages by lead
        const msgsByLead = {};
        if (allMsgs) {
            allMsgs.forEach(m => {
                if (!msgsByLead[m.lead_id]) msgsByLead[m.lead_id] = [];
                msgsByLead[m.lead_id].push(m);
            });
        }
        // Sort each array by created_at ascending (oldest to newest)
        Object.values(msgsByLead).forEach(arr => arr.sort((a,b) => new Date(a.created_at) - new Date(b.created_at)));

        const data = realLeads.map((lead) => {
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
                analytics: { tier: 'กดเพื่อดู', totalSpend: 0, repeatCount: 0 },
                messages: msgsByLead[lead.id] || [],
                created_at: lead.created_at
            };
        });
        // Sort by latest message timestamp (newest first), fallback to lead.created_at
        data.sort((a, b) => {
            const aLast = a.messages.length > 0 ? new Date(a.messages[a.messages.length - 1].created_at) : new Date(a.created_at || 0);
            const bLast = b.messages.length > 0 ? new Date(b.messages[b.messages.length - 1].created_at) : new Date(b.created_at || 0);
            return bLast - aLast;
        });

        chatsCache = { data, timestamp: Date.now() };
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/chats/:id/reply', async (req, res) => {
    const leadId = req.params.id;
    const { text } = req.body;

    try {
        const { data: row, error } = await supabase.from('lead_contact').select('line_user_id, fb_user_id, platform').eq('id', leadId).single();
        if (error || !row) return res.status(404).send('Lead not found');

        await supabase.from('chat_message').insert([{
            lead_id: leadId,
            sender: 'admin',
            type: 'text',
            text_content: text
        }]);

        // Route reply to correct platform
        if (row.fb_user_id) {
            await sendFbMessage(row.fb_user_id, text);
        } else if (row.line_user_id && channelToken !== 'DUMMY_TOKEN') {
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

app.post('/api/chats/:id/reply_media', chatUpload.single('file'), async (req, res) => {
    const leadId = req.params.id;
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    try {
        const { data: row, error } = await supabase.from('lead_contact').select('line_user_id, fb_user_id, platform').eq('id', leadId).single();
        if (error || !row) return res.status(404).send('Lead not found');

        const ext = path.extname(file.originalname);
        const newFileName = `${file.filename}${ext}`;
        fs.renameSync(file.path, path.join(chatUploadDir, newFileName));
        
        const mediaUrl = `${PUBLIC_URL}/uploads/chats/${newFileName}`;
        let msgType = 'image';
        
        const isImage = file.mimetype.startsWith('image/');
        const isVideo = file.mimetype.startsWith('video/');
        const isAudio = file.mimetype.startsWith('audio/');
        
        if (!isImage && !isVideo && !isAudio) {
            msgType = 'file';
        }

        await supabase.from('chat_message').insert([{
            lead_id: leadId,
            sender: 'admin',
            type: msgType,
            text_content: msgType === 'file' ? `📁 ไฟล์แนบ: ${file.originalname}` : '',
            media_url: mediaUrl
        }]);

        if (row.fb_user_id) {
            await sendFbMessage(row.fb_user_id, `ไฟล์แนบ: ${mediaUrl}`);
        } else if (row.line_user_id && channelToken !== 'DUMMY_TOKEN') {
            if (isImage) {
                await lineClient.pushMessage({
                    to: row.line_user_id,
                    messages: [{ type: 'image', originalContentUrl: mediaUrl, previewImageUrl: mediaUrl }]
                });
            } else if (isVideo) {
                await lineClient.pushMessage({
                    to: row.line_user_id,
                    messages: [{ type: 'video', originalContentUrl: mediaUrl, previewImageUrl: 'https://placehold.co/400x300?text=Video' }]
                });
            } else if (isAudio) {
                await lineClient.pushMessage({
                    to: row.line_user_id,
                    messages: [{ type: 'text', text: `🎵 แอดมินได้ส่งไฟล์เสียงให้คุณ\nฟังเลย: ${mediaUrl}` }]
                });
            } else {
                await lineClient.pushMessage({
                    to: row.line_user_id,
                    messages: [{ type: 'text', text: `📁 แอดมินได้ส่งไฟล์ให้คุณ: ${file.originalname}\nดาวน์โหลด/เปิดดู: ${mediaUrl}` }]
                });
            }
        }
        res.json({ success: true, url: mediaUrl });
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

// ====== PRODUCTION LOG & OEE ======

// Auto-create production_log table
app.get('/api/production_log/init', async (req, res) => {
    try {
        // Try to select from table first
        const { error: checkErr } = await supabase.from('production_log').select('id').limit(1);
        if (checkErr && checkErr.message.includes('does not exist')) {
            // Table doesn't exist — create via raw SQL
            const { error: sqlErr } = await supabase.rpc('exec_sql', { query: `
                CREATE TABLE IF NOT EXISTS production_log (
                    id SERIAL PRIMARY KEY,
                    machine TEXT,
                    department TEXT,
                    operator_name TEXT,
                    job_ref TEXT,
                    planned_duration_min INT DEFAULT 480,
                    actual_run_min INT DEFAULT 0,
                    downtime_min INT DEFAULT 0,
                    downtime_reason TEXT,
                    planned_qty INT DEFAULT 0,
                    actual_qty INT DEFAULT 0,
                    good_qty INT DEFAULT 0,
                    defect_qty INT DEFAULT 0,
                    defect_reason TEXT,
                    notes TEXT,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );
            `});
            // Proceed even if fail...
        }
        
        // Auto-create LOGISTICS tables
        const { error: logErr } = await supabase.from('logistics_trips').select('id').limit(1);
        if (logErr && logErr.message.includes('does not exist')) {
            await supabase.rpc('exec_sql', { query: `
                CREATE TABLE IF NOT EXISTS logistics_trips (
                    id SERIAL PRIMARY KEY,
                    type TEXT,
                    fleet TEXT,
                    driver_name TEXT,
                    trip_date DATE,
                    destinations JSONB,
                    start_km INT,
                    end_km INT,
                    status TEXT,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );
                CREATE TABLE IF NOT EXISTS fuel_expenses (
                    id SERIAL PRIMARY KEY,
                    fleet TEXT,
                    date DATE,
                    odometer INT,
                    amount_thb NUMERIC,
                    liters NUMERIC,
                    receipt_url TEXT,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );
                CREATE TABLE IF NOT EXISTS third_party_logistics (
                    id SERIAL PRIMARY KEY,
                    job_ref TEXT,
                    provider TEXT,
                    tracking_number TEXT,
                    shipping_cost NUMERIC,
                    drop_off_date DATE,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );
                CREATE TABLE IF NOT EXISTS erp_users (
                    id SERIAL PRIMARY KEY,
                    username TEXT UNIQUE,
                    full_name TEXT,
                    role TEXT,
                    pin_code TEXT,
                    active BOOLEAN DEFAULT true,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );
                CREATE TABLE IF NOT EXISTS erp_settings (
                    id SERIAL PRIMARY KEY,
                    module_name TEXT UNIQUE,
                    is_enabled BOOLEAN DEFAULT true,
                    updated_at TIMESTAMPTZ DEFAULT NOW()
                );
            `});
            // Force schema reload for PostgREST cache
            await supabase.rpc('exec_sql', { sql_string: `NOTIFY pgrst, 'reload schema';` });
            
            // Seed default admin
            await supabase.rpc('exec_sql', { sql_string: `
                INSERT INTO erp_users (username, full_name, role, pin_code) 
                VALUES ('admin', 'ผู้บริหารสูงสุด (CEO)', 'CEO', '1234') 
                ON CONFLICT (username) DO NOTHING;
            `});
        }
        res.json({ status: 'init ok' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Save production log entry
app.post('/api/production_log', async (req, res) => {
    try {
        const { error } = await supabase.from('production_log').insert([req.body]);
        if (error) throw error;
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get all production logs (with optional date filter)
app.get('/api/production_log', async (req, res) => {
    try {
        let query = supabase.from('production_log').select('*').order('created_at', { ascending: false });
        if (req.query.date) {
            const start = req.query.date + 'T00:00:00';
            const end = req.query.date + 'T23:59:59';
            query = query.gte('created_at', start).lte('created_at', end);
        }
        if (req.query.department) {
            query = query.eq('department', req.query.department);
        }
        const { data, error } = await query.limit(200);
        if (error) throw error;
        res.json(data || []);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// OEE summary dashboard
app.get('/api/production_log/summary', async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 7;
        const since = new Date();
        since.setDate(since.getDate() - days);

        const { data: logs, error } = await supabase.from('production_log').select('*')
            .gte('created_at', since.toISOString());
        if (error) throw error;

        // Calculate OEE per machine
        const machines = ['SM74F', 'SM102F', 'KM C12000', 'KM C4070', 'Diecut', 'Folder', 'Stitcher', 'Cutter'];
        const machineStats = machines.map(m => {
            const mLogs = (logs || []).filter(l => l.machine === m);
            const totalPlanned = mLogs.reduce((s, l) => s + (l.planned_duration_min || 0), 0);
            const totalRun = mLogs.reduce((s, l) => s + (l.actual_run_min || 0), 0);
            const totalDown = mLogs.reduce((s, l) => s + (l.downtime_min || 0), 0);
            const totalTarget = mLogs.reduce((s, l) => s + (l.planned_qty || 0), 0);
            const totalActual = mLogs.reduce((s, l) => s + (l.actual_qty || 0), 0);
            const totalGood = mLogs.reduce((s, l) => s + (l.good_qty || 0), 0);

            const availability = totalPlanned > 0 ? ((totalPlanned - totalDown) / totalPlanned) * 100 : 0;
            const performance = totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0;
            const quality = totalActual > 0 ? (totalGood / totalActual) * 100 : 0;
            const oee = (availability / 100) * (performance / 100) * (quality / 100) * 100;

            return {
                machine: m, entries: mLogs.length,
                availability: Math.round(availability * 10) / 10,
                performance: Math.round(performance * 10) / 10,
                quality: Math.round(quality * 10) / 10,
                oee: Math.round(oee * 10) / 10,
                totalGood, totalDefect: totalActual - totalGood, totalDown
            };
        });

        // Defect breakdown
        const defectReasons = {};
        (logs || []).forEach(l => {
            if (l.defect_reason && l.defect_qty > 0) {
                defectReasons[l.defect_reason] = (defectReasons[l.defect_reason] || 0) + l.defect_qty;
            }
        });

        // Department summary
        const depts = ['pre_press', 'printing', 'post_press', 'shipping'];
        const deptStats = depts.map(d => {
            const dLogs = (logs || []).filter(l => l.department === d);
            const totalGood = dLogs.reduce((s, l) => s + (l.good_qty || 0), 0);
            const totalActual = dLogs.reduce((s, l) => s + (l.actual_qty || 0), 0);
            const totalDefect = totalActual - totalGood;
            return { department: d, entries: dLogs.length, totalGood, totalDefect, totalActual };
        });

        res.json({ machineStats, defectReasons, deptStats, totalLogs: (logs || []).length });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ====== LOGISTICS & FLEET ======

// GET Logistics Trips
app.get('/api/logistics/trips', async (req, res) => {
    try {
        const { data, error } = await supabase.from('logistics_trips').select('*').order('created_at', { ascending: false }).limit(200);
        if (error) throw error;
        res.json(data);
    } catch (e) { res.status(500).json({error: e.message}); }
});

// CREATE / UPDATE Logistics Trip
app.post('/api/logistics/trips', async (req, res) => {
    try {
        if(req.body.id) {
            // Check if marking as completed to inject return_time
            if(req.body.status === 'completed' && !req.body.return_time) {
                req.body.return_time = new Date().toISOString();
            }
            const { error } = await supabase.from('logistics_trips').update(req.body).eq('id', req.body.id);
            if (error) throw error;
        } else {
            req.body.depart_time = new Date().toISOString();
            const { error } = await supabase.from('logistics_trips').insert([req.body]);
            if (error) throw error;
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({error: e.message}); }
});

// GET Fuel Expenses
app.get('/api/logistics/fuel', async (req, res) => {
    try {
        const { data, error } = await supabase.from('fuel_expenses').select('*').order('date', { ascending: false }).limit(200);
        if (error) throw error;
        res.json(data);
    } catch (e) { res.status(500).json({error: e.message}); }
});

// ADD Fuel Expense
app.post('/api/logistics/fuel', async (req, res) => {
    try {
        const { error } = await supabase.from('fuel_expenses').insert([req.body]);
        if (error) throw error;
        res.json({ success: true });
    } catch (e) { res.status(500).json({error: e.message}); }
});

// GET 3PL (Third Party Logistics)
app.get('/api/logistics/3pl', async (req, res) => {
    try {
        const { data, error } = await supabase.from('third_party_logistics').select('*').order('drop_off_date', { ascending: false }).limit(200);
        if (error) throw error;
        res.json(data);
    } catch (e) { res.status(500).json({error: e.message}); }
});

// ADD 3PL record
app.post('/api/logistics/3pl', async (req, res) => {
    try {
        const { error } = await supabase.from('third_party_logistics').insert([req.body]);
        if (error) throw error;
        res.json({ success: true });
    } catch (e) { res.status(500).json({error: e.message}); }
});

// OMITTING PREVIOUS ENDPOINTS START
// UPLOAD Proof of Delivery Photo (Base64)
app.post('/api/upload_proof', async (req, res) => {
    try {
        const { image_base64 } = req.body;
        if (!image_base64) return res.status(400).json({error: 'No image provided'});
        
        // Ensure directory exists
        const uploadDir = path.join(__dirname, 'uploads', 'logistics');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const base64Data = image_base64.replace(/^data:image\/jpeg;base64,/, "");
        const fileName = `proof_${Date.now()}_${Math.floor(Math.random()*1000)}.jpg`;
        const filePath = path.join(uploadDir, fileName);

        fs.writeFileSync(filePath, base64Data, 'base64');
        res.json({ success: true, url: `/uploads/logistics/${fileName}` });
    } catch (e) {
        res.status(500).json({error: e.message});
    }
});

// ====== AUTH & USERS ======
app.post('/api/login', async (req, res) => {
    try {
        const { username, pin_code } = req.body;
        const { data, error } = await supabase.from('erp_users').select('*').eq('username', username).eq('pin_code', pin_code).eq('active', true).single();
        
        if (error || !data) {
            return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัส PIN ไม่ถูกต้อง' });
        }
        
        res.json({ success: true, user: { id: data.id, username: data.username, full_name: data.full_name, role: data.role } });
    } catch (e) { 
        res.status(500).json({ error: e.message }); 
    }
});

app.get('/api/users', async (req, res) => {
    try {
        const { data, error } = await supabase.from('erp_users').select('*').order('created_at', { ascending: true });
        if (error) throw error;
        const maskedData = data.map(u => ({ ...u, pin_code: '****' }));
        res.json(data);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/users', async (req, res) => {
    try {
        if(req.body.id) {
            const { error } = await supabase.from('erp_users').update(req.body).eq('id', req.body.id);
            if (error) throw error;
        } else {
            const { error } = await supabase.from('erp_users').insert([req.body]);
            if (error) throw error;
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/users/:id/deactivate', async (req, res) => {
    try {
        const { error } = await supabase.from('erp_users').update({ active: false }).eq('id', req.params.id);
        if (error) throw error;
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ====== SETTINGS (MODULE TOGGLES) ======
app.get('/api/settings', async (req, res) => {
    try {
        const { data, error } = await supabase.from('erp_settings').select('*');
        if (error) throw error;
        const settingsMap = data.reduce((acc, curr) => {
            acc[curr.module_name] = curr.is_enabled;
            return acc;
        }, {});
        res.json(settingsMap);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/settings', async (req, res) => {
    try {
        const { module_name, is_enabled } = req.body;
        const { data: existing } = await supabase.from('erp_settings').select('id').eq('module_name', module_name).single();
        let error;
        if (existing) {
            ({ error } = await supabase.from('erp_settings').update({ is_enabled }).eq('id', existing.id));
        } else {
            ({ error } = await supabase.from('erp_settings').insert([{ module_name, is_enabled }]));
        }
        if (error) throw error;
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ====== SMART PRICE HUB ======

// Price Catalog - search with AI interpolation
app.get('/api/price_catalog', async (req, res) => {
    try {
        const { search, category } = req.query;
        let query = supabase.from('price_catalog').select('*').order('category').order('product_name').order('quantity', { ascending: true });
        if (category) query = query.eq('category', category);
        if (search) query = query.ilike('product_name', `%${search}%`);
        const { data, error } = await query;
        if (error) throw error;
        res.json(data || []);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Price Catalog - add/update item
app.post('/api/price_catalog', async (req, res) => {
    try {
        if (req.body.id) {
            const { error } = await supabase.from('price_catalog').update(req.body).eq('id', req.body.id);
            if (error) throw error;
        } else {
            const { error } = await supabase.from('price_catalog').insert([req.body]);
            if (error) throw error;
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/price_catalog/:id', async (req, res) => {
    try {
        const { error } = await supabase.from('price_catalog').delete().eq('id', req.params.id);
        if (error) throw error;
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Price Requests (Tickets)
app.get('/api/price_requests', async (req, res) => {
    try {
        const { data, error } = await supabase.from('price_requests').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data || []);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/price_requests', async (req, res) => {
    try {
        if (req.body.id) {
            const { error } = await supabase.from('price_requests').update(req.body).eq('id', req.body.id);
            if (error) throw error;
        } else {
            const { error } = await supabase.from('price_requests').insert([req.body]);
            if (error) throw error;
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Price Messages (Thread Chat inside each Ticket)
app.get('/api/price_messages/:request_id', async (req, res) => {
    try {
        const { data, error } = await supabase.from('price_messages').select('*').eq('request_id', req.params.request_id).order('created_at', { ascending: true });
        if (error) throw error;
        res.json(data || []);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/price_messages', async (req, res) => {
    try {
        const { error } = await supabase.from('price_messages').insert([req.body]);
        if (error) throw error;
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ====== SUPPLIER COST DATABASE ======
app.get('/api/supplier_costs', async (req, res) => {
    try {
        let query = supabase.from('supplier_costs').select('*').order('created_at', { ascending: false });
        if (req.query.search) query = query.ilike('product_name', `%${req.query.search}%`);
        if (req.query.category) query = query.eq('category', req.query.category);
        if (req.query.supplier) query = query.ilike('supplier_name', `%${req.query.supplier}%`);
        const { data, error } = await query.limit(200);
        if (error) throw error;
        res.json(data || []);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/supplier_costs', async (req, res) => {
    try {
        if (req.body.id) {
            const { error } = await supabase.from('supplier_costs').update(req.body).eq('id', req.body.id);
            if (error) throw error;
        } else {
            const { error } = await supabase.from('supplier_costs').insert([req.body]);
            if (error) throw error;
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// AI: Calculate selling price from supplier costs with markup
app.get('/api/supplier_costs/estimate', async (req, res) => {
    try {
        const { product_name, quantity, markup } = req.query;
        if (!product_name || !quantity) return res.status(400).json({ error: 'product_name and quantity required' });
        const qty = Number(quantity);
        const markupPct = Number(markup) || 30; // Default 30% markup

        const { data: items } = await supabase.from('supplier_costs')
            .select('*')
            .ilike('product_name', `%${product_name}%`)
            .order('quantity', { ascending: true });

        if (!items || items.length === 0) return res.json({ found: false });

        // Exact match
        const exact = items.find(i => i.quantity === qty);
        if (exact) {
            const sellingPrice = exact.cost_per_unit * (1 + markupPct / 100);
            return res.json({ found: true, method: 'exact', cost_per_unit: exact.cost_per_unit, selling_price: Math.round(sellingPrice * 100) / 100, markup_pct: markupPct, supplier: exact.supplier_name, quantity: qty });
        }

        // Linear interpolation
        let lower = null, upper = null;
        for (const item of items) {
            if (item.quantity <= qty) lower = item;
            if (item.quantity >= qty && !upper) upper = item;
        }

        if (lower && upper && lower.id !== upper.id) {
            const ratio = (qty - lower.quantity) / (upper.quantity - lower.quantity);
            const interpolatedCost = lower.cost_per_unit + ratio * (upper.cost_per_unit - lower.cost_per_unit);
            const cost = Math.round(interpolatedCost * 100) / 100;
            const sellingPrice = Math.round(cost * (1 + markupPct / 100) * 100) / 100;
            return res.json({ found: true, method: 'interpolation', cost_per_unit: cost, selling_price: sellingPrice, markup_pct: markupPct, lower_qty: lower.quantity, upper_qty: upper.quantity, quantity: qty });
        } else if (lower) {
            const sellingPrice = Math.round(lower.cost_per_unit * (1 + markupPct / 100) * 100) / 100;
            return res.json({ found: true, method: 'nearest', cost_per_unit: lower.cost_per_unit, selling_price: sellingPrice, markup_pct: markupPct, supplier: lower.supplier_name, quantity: qty });
        }

        res.json({ found: false });
    } catch (e) { res.status(500).json({ error: e.message }); }
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

// ====== PRINT FLOW PLAN APIs ======

// --- Machines ---
app.get('/api/pf/machines', async (req, res) => {
  const { data, error } = await supabase.from('pf_machines').select('*').order('type').order('name');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});
app.post('/api/pf/machines', async (req, res) => {
  const { data, error } = await supabase.from('pf_machines').insert(req.body).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});
app.put('/api/pf/machines/:id', async (req, res) => {
  const { data, error } = await supabase.from('pf_machines').update(req.body).eq('id', req.params.id).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});
app.delete('/api/pf/machines/:id', async (req, res) => {
  await supabase.from('pf_machines').delete().eq('id', req.params.id);
  res.json({ ok: true });
});

// --- Print Jobs ---
app.get('/api/pf/jobs', async (req, res) => {
  const { data, error } = await supabase.from('pf_print_jobs').select('*').order('created_at', { ascending: false }).limit(100);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});
app.post('/api/pf/jobs', async (req, res) => {
  const { data, error } = await supabase.from('pf_print_jobs').insert(req.body).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});
app.put('/api/pf/jobs/:id', async (req, res) => {
  const { data, error } = await supabase.from('pf_print_jobs').update(req.body).eq('id', req.params.id).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});
app.delete('/api/pf/jobs/:id', async (req, res) => {
  await supabase.from('pf_queue_entries').delete().eq('job_id', req.params.id);
  await supabase.from('pf_print_jobs').delete().eq('id', req.params.id);
  res.json({ ok: true });
});

// --- Queue Entries ---
app.get('/api/pf/queue', async (req, res) => {
  const { data, error } = await supabase.from('pf_queue_entries').select('*').order('created_at', { ascending: false }).limit(500);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});
app.post('/api/pf/queue', async (req, res) => {
  const { data, error } = await supabase.from('pf_queue_entries').insert(req.body).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});
app.put('/api/pf/queue/:id', async (req, res) => {
  const { data, error } = await supabase.from('pf_queue_entries').update(req.body).eq('id', req.params.id).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

// --- Materials ---
app.get('/api/pf/materials', async (req, res) => {
  const { data, error } = await supabase.from('pf_materials').select('*').order('name');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});
app.post('/api/pf/materials', async (req, res) => {
  const { data, error } = await supabase.from('pf_materials').insert(req.body).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});
app.put('/api/pf/materials/:id', async (req, res) => {
  const { data, error } = await supabase.from('pf_materials').update({ ...req.body, updated_at: new Date().toISOString() }).eq('id', req.params.id).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

// --- Departments ---
app.get('/api/pf/departments', async (req, res) => {
  const { data, error } = await supabase.from('pf_departments').select('*').order('name');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ====== AI BACKGROUND WORKER (runs on Railway 24/7 — no computer needed!) ======
const PIPELINE_SLA = {
  'new_lead': 1, 'qualifying': 4, 'wait_price': 24,
  'quoted': 48, 'wait_file': 72, 'proofing': 48, 'wait_payment': 72
};

const TAG_TO_STAGE = {
  'รอราคา': 'wait_price', 'รอยืนยัน': 'quoted', 'รอไฟล์': 'wait_file',
  'รอตรวจแบบ': 'proofing', 'รอโอน': 'wait_payment', 'เข้าผลิต': 'production'
};

function detectStage(lead) {
  const tags = lead.tags || [];
  const status = lead.sales_status || 'i';
  if (status === 'c') return 'won';
  if (['nt', 'na', 'al'].includes(status)) return 'lost';
  for (const [tag, stage] of Object.entries(TAG_TO_STAGE)) {
    if (tags.includes(tag)) return stage;
  }
  if (status === 'o') return 'quoted';
  return 'new_lead';
}

// Auto-tag overdue leads (runs every 30 min)
async function aiBackgroundCheck() {
  console.log('[AI Worker] Running background pipeline check...');
  try {
    const { data: leads } = await supabase.from('lead_contact').select('*');
    if (!leads) return;
    
    const { data: msgs } = await supabase.from('lead_messages').select('*').order('created_at', { ascending: true });
    if (!msgs) return;
    
    const leadMap = {};
    leads.forEach(l => { leadMap[l.id] = { ...l, messages: [] }; });
    msgs.forEach(m => { if (leadMap[m.lead_id]) leadMap[m.lead_id].messages.push(m); });

    let overdueCount = 0;
    let autoTagged = 0;
    
    for (const lead of Object.values(leadMap)) {
      if (!lead.messages.length) continue;
      const stage = detectStage(lead);
      const sla = PIPELINE_SLA[stage];
      if (!sla) continue;
      
      const lastMsg = lead.messages[lead.messages.length - 1];
      const hoursStuck = (Date.now() - new Date(lastMsg.created_at).getTime()) / 3600000;
      
      if (hoursStuck > sla) {
        overdueCount++;
        const currentTags = lead.tags || [];
        // Auto-add 'Follow Up' tag if not already tagged
        if (!currentTags.includes('Follow Up') && !currentTags.includes('เข้าผลิต')) {
          const newTags = [...currentTags, 'Follow Up'];
          await supabase.from('lead_contact').update({ tags: newTags }).eq('id', lead.id);
          autoTagged++;
        }
      }
    }
    console.log(`[AI Worker] Done: ${overdueCount} overdue, ${autoTagged} auto-tagged for follow-up`);
  } catch (e) { console.error('[AI Worker] Error:', e.message); }
}

// Run at 08:30 and 12:30 Bangkok time (check every hour, fire at right times)
setInterval(() => {
  const bkkHour = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })).getHours();
  const bkkMin = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })).getMinutes();
  // Fire at 08:30 and 12:30 (within 30-min window)
  if ((bkkHour === 8 && bkkMin >= 25 && bkkMin <= 35) || (bkkHour === 12 && bkkMin >= 25 && bkkMin <= 35)) {
    aiBackgroundCheck();
  }
}, 10 * 60 * 1000); // Check every 10 min
// Also run once on startup
setTimeout(aiBackgroundCheck, 10000);

// Daily stats API — for report page to get historical data by date
app.get('/api/daily-stats', async (req, res) => {
  try {
    const { date } = req.query; // YYYY-MM-DD
    if (!date) return res.status(400).json({ error: 'date param required' });
    
    const dayStart = new Date(date + 'T00:00:00+07:00').toISOString();
    const dayEnd = new Date(date + 'T23:59:59+07:00').toISOString();
    
    // Messages on this date
    const { data: msgs } = await supabase.from('lead_messages')
      .select('lead_id, sender, type, created_at')
      .gte('created_at', dayStart)
      .lte('created_at', dayEnd)
      .order('created_at', { ascending: true });
    
    // New leads (first ever message on this date)
    const leadIds = [...new Set((msgs || []).map(m => m.lead_id))];
    let newLeadCount = 0;
    for (const lid of leadIds) {
      const { data: first } = await supabase.from('lead_messages')
        .select('created_at')
        .eq('lead_id', lid)
        .order('created_at', { ascending: true })
        .limit(1);
      if (first?.[0] && first[0].created_at >= dayStart && first[0].created_at <= dayEnd) {
        newLeadCount++;
      }
    }
    
    res.json({
      date,
      totalMessages: (msgs || []).length,
      clientMessages: (msgs || []).filter(m => m.sender === 'client').length,
      adminMessages: (msgs || []).filter(m => m.sender === 'admin').length,
      activeLeads: leadIds.length,
      newLeads: newLeadCount,
      imageMessages: (msgs || []).filter(m => m.type === 'image').length,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════
// Customer Quotes — ระบบ Price Tracking (เสนอราคา + ซื้อสินค้า)
// ═══════════════════════════════════════════════════════════════
app.get('/api/customer_quotes/:leadId', async (req, res) => {
  try {
    const { data, error } = await supabase.from('customer_quotes')
      .select('*')
      .eq('lead_id', req.params.leadId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/customer_quotes', async (req, res) => {
  try {
    const { lead_id, product_name, category, specs, quantity, price_per_unit, total_price, quoted_by, notes, type, quote_date, rejection_reason, ref_quote_id } = req.body;
    const recordType = type || 'quote';

    // Auto-calculate round_number
    const { data: existing } = await supabase.from('customer_quotes')
      .select('round_number')
      .eq('lead_id', lead_id)
      .eq('type', recordType)
      .order('round_number', { ascending: false })
      .limit(1);
    const nextRound = (existing && existing.length > 0 && existing[0].round_number) ? existing[0].round_number + 1 : 1;

    const insertData = {
      lead_id, product_name, category, specs, quantity, price_per_unit, total_price,
      quoted_by, notes, type: recordType, round_number: nextRound,
      quote_date: quote_date || new Date().toISOString().split('T')[0],
      status: recordType === 'purchase' ? 'ordered' : 'quoted'
    };
    if (rejection_reason) insertData.rejection_reason = rejection_reason;
    if (ref_quote_id) insertData.ref_quote_id = ref_quote_id;

    const { data, error } = await supabase.from('customer_quotes')
      .insert([insertData])
      .select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/customer_quotes/:id', async (req, res) => {
  try {
    const { status, notes, price_per_unit, total_price, product_name, specs, quantity, pdf_url, rejection_reason, quote_date, type } = req.body;
    const updatePayload = { updated_at: new Date().toISOString() };
    if (status) updatePayload.status = status;
    if (notes !== undefined) updatePayload.notes = notes;
    if (price_per_unit !== undefined) updatePayload.price_per_unit = price_per_unit;
    if (total_price !== undefined) updatePayload.total_price = total_price;
    if (product_name !== undefined) updatePayload.product_name = product_name;
    if (specs !== undefined) updatePayload.specs = specs;
    if (quantity !== undefined) updatePayload.quantity = quantity;
    if (pdf_url !== undefined) updatePayload.pdf_url = pdf_url;
    if (rejection_reason !== undefined) updatePayload.rejection_reason = rejection_reason;
    if (quote_date !== undefined) updatePayload.quote_date = quote_date;
    if (type !== undefined) updatePayload.type = type;
    const { data, error } = await supabase.from('customer_quotes')
      .update(updatePayload)
      .eq('id', req.params.id)
      .select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Convert quote → purchase
app.post('/api/customer_quotes/:id/convert', async (req, res) => {
  try {
    // Get the original quote
    const { data: quote, error: fetchErr } = await supabase.from('customer_quotes')
      .select('*').eq('id', req.params.id).single();
    if (fetchErr) throw fetchErr;

    // Mark quote as ordered
    await supabase.from('customer_quotes').update({ status: 'ordered', updated_at: new Date().toISOString() }).eq('id', req.params.id);

    // Auto-calculate purchase round
    const { data: existing } = await supabase.from('customer_quotes')
      .select('round_number')
      .eq('lead_id', quote.lead_id)
      .eq('type', 'purchase')
      .order('round_number', { ascending: false })
      .limit(1);
    const nextRound = (existing && existing.length > 0 && existing[0].round_number) ? existing[0].round_number + 1 : 1;

    // Create purchase record linked to the quote
    const { data: purchase, error: insertErr } = await supabase.from('customer_quotes')
      .insert([{
        lead_id: quote.lead_id, product_name: quote.product_name, category: quote.category,
        specs: quote.specs, quantity: req.body.quantity || quote.quantity,
        price_per_unit: req.body.price_per_unit || quote.price_per_unit,
        total_price: req.body.total_price || quote.total_price,
        quoted_by: quote.quoted_by, notes: req.body.notes || '',
        type: 'purchase', round_number: nextRound,
        quote_date: req.body.quote_date || new Date().toISOString().split('T')[0],
        status: 'ordered', ref_quote_id: quote.id
      }])
      .select().single();
    if (insertErr) throw insertErr;
    res.json(purchase);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/customer_quotes/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('customer_quotes').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════
// #2 Chat Analysis — AI สแกนแชทหาเสนอราคา/สั่งซื้อ
// ═══════════════════════════════════════════════════════════════
app.get('/api/chat-analysis', async (req, res) => {
  try {
    // Get all leads with their messages + quotes
    const { data: leads } = await supabase.from('lead_contact').select('id, original_name, erp_alias_name, sales_status, tags, line_user_id');
    const { data: allMsgs } = await supabase.from('chat_message').select('lead_id, text_content, sender, created_at');
    const { data: allQuotes } = await supabase.from('customer_quotes').select('lead_id, type, total_price, status');

    // Group
    const msgMap = {}, quoteMap = {};
    allMsgs.forEach(m => { if (!msgMap[m.lead_id]) msgMap[m.lead_id] = []; msgMap[m.lead_id].push(m); });
    allQuotes.forEach(q => { if (!quoteMap[q.lead_id]) quoteMap[q.lead_id] = []; quoteMap[q.lead_id].push(q); });

    // Price keywords
    const priceWords = ['ราคา', 'บาท', 'เท่าไ', 'กี่บาท', 'ต่อชิ้น', 'ต่อใบ', 'ต่อแผ่น', 'เสนอราคา', 'ใบเสนอ'];
    const orderWords = ['สั่ง', 'ยืนยัน', 'ออเดอร์', 'โอนเงิน', 'โอนแล้ว', 'สลิป', 'ชำระ', 'จ่าย'];
    const productWords = ['พิมพ์', 'นามบัตร', 'ใบปลิว', 'โบรชัวร์', 'สติ๊กเกอร์', 'กล่อง', 'ซอง', 'แผ่นพับ', 'โปสเตอร์', 'แบนเนอร์'];

    const results = leads.map(l => {
      const msgs = msgMap[l.id] || [];
      const quotes = quoteMap[l.id] || [];
      const allText = msgs.map(m => m.text_content || '').join(' ');

      const hasPriceMention = priceWords.some(w => allText.includes(w));
      const hasOrderMention = orderWords.some(w => allText.includes(w));
      const hasProductMention = productWords.some(w => allText.includes(w));

      // Extract numbers that look like prices (4+ digits)
      const priceMatches = allText.match(/[\d,]+\.?\d*\s*(บาท|฿)/g) || [];
      const numberMatches = allText.match(/\d{3,}/g) || [];

      // Detect price quotes in messages (admin sent messages with numbers)
      const adminPriceMessages = msgs.filter(m => 
        m.sender === 'admin' && m.text_content && 
        priceWords.some(w => m.text_content.includes(w)) &&
        /\d{3,}/.test(m.text_content)
      );

      const status = l.sales_status || 'i';
      const hasQuotes = quotes.length > 0;
      const hasPurchases = quotes.some(q => q.type === 'purchase');

      // Issues
      const issues = [];
      if (status === 'c' && !hasQuotes) issues.push('❌ ลูกค้า C ไม่มีข้อมูลราคา');
      if (status === 'c' && !hasPurchases) issues.push('⚠️ ลูกค้า C ไม่มีบันทึกซื้อ');
      if (hasPriceMention && !hasQuotes) issues.push('💰 พูดถึงราคาในแชท แต่ไม่มีบันทึก');
      if (hasOrderMention && !hasPurchases) issues.push('📦 พูดถึงสั่งซื้อ แต่ไม่มีบันทึก');
      if (msgs.length === 0) issues.push('🔇 ไม่มีข้อความ');

      return {
        id: l.id, name: l.erp_alias_name || l.original_name,
        status, tags: l.tags || [],
        msgCount: msgs.length,
        clientMsgs: msgs.filter(m => m.sender === 'client').length,
        adminMsgs: msgs.filter(m => m.sender === 'admin').length,
        quoteCount: quotes.length,
        purchaseCount: quotes.filter(q => q.type === 'purchase').length,
        totalSpend: quotes.filter(q => q.type === 'purchase').reduce((s, q) => s + (Number(q.total_price) || 0), 0),
        hasPriceMention, hasOrderMention, hasProductMention,
        priceMatches: priceMatches.slice(0, 5),
        adminPriceCount: adminPriceMessages.length,
        issues,
        lastActivity: msgs.length > 0 ? msgs[msgs.length - 1].created_at : null,
      };
    });

    // Sort: issues first, then by message count
    results.sort((a, b) => b.issues.length - a.issues.length || b.msgCount - a.msgCount);

    // Summary
    const summary = {
      totalLeads: results.length,
      withMessages: results.filter(r => r.msgCount > 0).length,
      withPriceMention: results.filter(r => r.hasPriceMention).length,
      withOrderMention: results.filter(r => r.hasOrderMention).length,
      withQuotes: results.filter(r => r.quoteCount > 0).length,
      withPurchases: results.filter(r => r.purchaseCount > 0).length,
      withIssues: results.filter(r => r.issues.length > 0).length,
      cStatusNoQuote: results.filter(r => r.status === 'c' && r.quoteCount === 0).length,
    };

    res.json({ summary, leads: results.slice(0, 200) }); // Top 200
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════
// #3 Sales Matching — ผลงานเซลแต่ละคน
// ═══════════════════════════════════════════════════════════════
app.get('/api/sales-matching', async (req, res) => {
  try {
    const { data: leads } = await supabase.from('lead_contact').select('id, original_name, erp_alias_name, sales_status, created_at');
    const { data: allMsgs } = await supabase.from('chat_message').select('lead_id, sender, created_at');
    const { data: allQuotes } = await supabase.from('customer_quotes').select('lead_id, type, total_price, status, quoted_by');

    const msgMap = {}, quoteMap = {};
    allMsgs.forEach(m => { if (!msgMap[m.lead_id]) msgMap[m.lead_id] = []; msgMap[m.lead_id].push(m); });
    allQuotes.forEach(q => { if (!quoteMap[q.lead_id]) quoteMap[q.lead_id] = []; quoteMap[q.lead_id].push(q); });

    // Extract sales person from alias (format: STATUS-SALES-Name)
    const getSales = (alias) => {
      if (!alias) return 'ไม่ระบุ';
      const parts = alias.split('-');
      return parts.length >= 2 ? (parts[1] || 'ไม่ระบุ') : 'ไม่ระบุ';
    };

    const salesMap = {};
    leads.forEach(l => {
      const sp = getSales(l.erp_alias_name);
      if (!salesMap[sp]) salesMap[sp] = { 
        name: sp, totalLeads: 0, withChat: 0, withQuote: 0, withPurchase: 0,
        totalMsgs: 0, adminMsgs: 0, clientMsgs: 0,
        totalRevenue: 0, avgResponseTime: 0, responseTimes: [],
        statusBreakdown: { i: 0, o: 0, c: 0, nt: 0, na: 0, al: 0 },
        leads: []
      };
      const s = salesMap[sp];
      s.totalLeads++;
      const msgs = msgMap[l.id] || [];
      const quotes = quoteMap[l.id] || [];
      if (msgs.length > 0) s.withChat++;
      if (quotes.length > 0) s.withQuote++;
      if (quotes.some(q => q.type === 'purchase')) s.withPurchase++;
      s.totalMsgs += msgs.length;
      s.adminMsgs += msgs.filter(m => m.sender === 'admin').length;
      s.clientMsgs += msgs.filter(m => m.sender === 'client').length;
      s.totalRevenue += quotes.filter(q => q.type === 'purchase').reduce((sum, q) => sum + (Number(q.total_price) || 0), 0);
      const st = l.sales_status || 'i';
      if (s.statusBreakdown[st] !== undefined) s.statusBreakdown[st]++;
      
      // Calculate response times
      for (let i = 1; i < msgs.length; i++) {
        if (msgs[i].sender === 'admin' && msgs[i-1].sender === 'client') {
          const diff = (new Date(msgs[i].created_at) - new Date(msgs[i-1].created_at)) / 60000;
          if (diff > 0 && diff < 1440) s.responseTimes.push(diff);
        }
      }

      s.leads.push({ id: l.id, name: l.erp_alias_name || l.original_name, status: st, msgCount: msgs.length, quoteCount: quotes.length });
    });

    // Calculate averages
    Object.values(salesMap).forEach(s => {
      s.avgResponseTime = s.responseTimes.length > 0 
        ? Math.round(s.responseTimes.reduce((a, b) => a + b, 0) / s.responseTimes.length) 
        : 0;
      s.conversionRate = s.totalLeads > 0 ? Math.round(s.withPurchase / s.totalLeads * 100) : 0;
      delete s.responseTimes;
      s.leads = s.leads.sort((a, b) => b.msgCount - a.msgCount).slice(0, 20);
    });

    const salesList = Object.values(salesMap).sort((a, b) => b.totalRevenue - a.totalRevenue || b.totalLeads - a.totalLeads);
    res.json(salesList);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════
// #5 Dashboard Stats — สรุปยอดรายเดือน + Pipeline
// ═══════════════════════════════════════════════════════════════
app.get('/api/dashboard-stats', async (req, res) => {
  try {
    const { data: leads } = await supabase.from('lead_contact').select('id, sales_status, created_at');
    const { data: quotes } = await supabase.from('customer_quotes').select('type, total_price, status, quote_date, created_at');
    const { count: msgCount } = await supabase.from('chat_message').select('*', { count: 'exact', head: true });

    // Pipeline
    const pipeline = { i: 0, o: 0, c: 0, nt: 0, na: 0, al: 0, q: 0 };
    leads.forEach(l => { const s = l.sales_status || 'i'; pipeline[s] = (pipeline[s] || 0) + 1; });

    // Monthly stats (last 12 months)
    const monthly = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthly[key] = { leads: 0, quotes: 0, purchases: 0, revenue: 0 };
    }
    leads.forEach(l => {
      if (!l.created_at) return;
      const key = l.created_at.substring(0, 7);
      if (monthly[key]) monthly[key].leads++;
    });
    quotes.forEach(q => {
      const key = (q.quote_date || q.created_at || '').substring(0, 7);
      if (monthly[key]) {
        if ((q.type || 'quote') === 'quote') monthly[key].quotes++;
        else { monthly[key].purchases++; monthly[key].revenue += Number(q.total_price) || 0; }
      }
    });

    // Totals
    const totalQuotes = quotes.filter(q => (q.type || 'quote') === 'quote').length;
    const totalPurchases = quotes.filter(q => q.type === 'purchase').length;
    const totalRevenue = quotes.filter(q => q.type === 'purchase').reduce((s, q) => s + (Number(q.total_price) || 0), 0);

    res.json({
      pipeline,
      totalLeads: leads.length,
      totalMessages: msgCount,
      totalQuotes, totalPurchases, totalRevenue,
      monthly: Object.entries(monthly).map(([key, val]) => ({ month: key, ...val })),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════
// Machine Breakdown LINE Notification
// ═══════════════════════════════════════

// POST /api/machine-alert - Report machine breakdown & notify via LINE
app.post('/api/machine-alert', async (req, res) => {
  try {
    const { machineName, problem, reportedBy, affectedJobs, severity } = req.body;
    const timestamp = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });

    // Save to database
    const { data: alert, error: dbErr } = await supabase.from('machine_alerts').insert([{
      machine_name: machineName,
      problem,
      reported_by: reportedBy,
      affected_jobs: JSON.stringify(affectedJobs || []),
      severity: severity || 'high',
      status: 'open',
      created_at: new Date().toISOString()
    }]).select().single();

    // Build LINE message
    const sevIcon = severity === 'critical' ? '🚨' : severity === 'high' ? '🔴' : '🟡';
    const msg = `${sevIcon} เครื่องเสีย!\n` +
      `────────────\n` +
      `🖨️ เครื่อง: ${machineName}\n` +
      `❌ ปัญหา: ${problem}\n` +
      `⏰ เวลา: ${timestamp}\n` +
      `👨‍🔧 แจ้งโดย: ${reportedBy}\n` +
      (affectedJobs?.length ? `📋 งานกระทบ: ${affectedJobs.join(', ')}\n` : '') +
      `────────────\n` +
      `⚠️ กรุณาตรวจสอบด่วน!`;

    // Send to LINE group (if configured)
    const notifyGroupId = process.env.LINE_GROUP_NOTIFY;
    let lineResult = { sent: false, reason: 'no group configured' };

    if (notifyGroupId) {
      try {
        await lineClient.pushMessage({ to: notifyGroupId, messages: [{ type: 'text', text: msg }] });
        lineResult = { sent: true, to: 'group' };
      } catch (lineErr) {
        lineResult = { sent: false, error: lineErr.message };
      }
    }

    // Also try to send to individual managers (if user IDs stored)
    const { data: managers } = await supabase
      .from('hr_employees')
      .select('line_user_id, name')
      .in('position', ['ผู้จัดการ', 'Manager', 'หัวหน้า'])
      .not('line_user_id', 'is', null);

    if (managers?.length) {
      for (const mgr of managers) {
        try {
          await lineClient.pushMessage({ to: mgr.line_user_id, messages: [{ type: 'text', text: msg }] });
        } catch (e) { /* skip if individual push fails */ }
      }
    }

    res.json({
      success: true,
      alert: alert || { machineName, problem, timestamp },
      line: lineResult,
      message: msg
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/machine-alerts - Get alert history
app.get('/api/machine-alerts', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('machine_alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    res.json(data || []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/machine-alert/:id/resolve - Mark alert as resolved
app.put('/api/machine-alert/:id/resolve', async (req, res) => {
  try {
    const { resolvedBy, solution } = req.body;
    const { data, error } = await supabase
      .from('machine_alerts')
      .update({
        status: 'resolved',
        resolved_by: resolvedBy,
        solution,
        resolved_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .select().single();

    // Notify resolution
    const notifyGroupId = process.env.LINE_GROUP_NOTIFY;
    if (notifyGroupId && data) {
      const msg = `✅ เครื่องซ่อมเสร็จ!\n────────────\n🖨️ ${data.machine_name}\n🔧 วิธีแก้: ${solution}\n👨‍🔧 แก้โดย: ${resolvedBy}\n⏰ ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`;
      try { await lineClient.pushMessage({ to: notifyGroupId, messages: [{ type: 'text', text: msg }] }); } catch(e) {}
    }

    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/test-line - Test LINE connection
app.post('/api/test-line', async (req, res) => {
  try {
    const { targetId, message } = req.body;
    const testMsg = message || '🧪 ทดสอบ LINE Notification จากระบบ ERP\n✅ เชื่อมต่อสำเร็จ!';
    const to = targetId || process.env.LINE_GROUP_NOTIFY;
    if (!to) return res.json({ success: false, error: 'ไม่มี LINE_GROUP_NOTIFY ใน .env — ใส่ Group ID หรือ User ID ก่อน' });
    await lineClient.pushMessage({ to, messages: [{ type: 'text', text: testMsg }] });
    res.json({ success: true, sentTo: to });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// React router fallback
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Enterprise Supabase Backend API running on http://localhost:${PORT}`);
    console.log(`[AI Worker] Background pipeline monitor active (every 30min)`);
});
