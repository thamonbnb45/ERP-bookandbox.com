require('dotenv').config({ override: false }); // Don't override Railway/system env vars
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const line = require('@line/bot-sdk');
const db = require('./db');
const compression = require('compression');
const multer = require('multer');
const { processAgentQuery } = require('./ai-agent');
const { runMigrations } = require('./migrate');

// AI Agent Config
const AI_API_KEY = process.env.AI_API_KEY || ''; // Gemini API key
const AI_MODEL = process.env.AI_MODEL || 'gemini'; // Default to gemini
const AI_AGENT_GROUP_ID = process.env.AI_AGENT_GROUP_ID || ''; // LINE Group ID for AI queries
const AI_TRIGGER_PREFIXES = ['@ai'];

// Startup debug
console.log('🔧 [ENV DEBUG] AI_API_KEY set:', !!process.env.AI_API_KEY, '| AI_MODEL:', process.env.AI_MODEL || 'NOT SET');
console.log('🔧 [ENV DEBUG] CHANNEL_SECRET set:', !!process.env.CHANNEL_SECRET, '| CHANNEL_ACCESS_TOKEN set:', !!process.env.CHANNEL_ACCESS_TOKEN);
console.log('🔧 [ENV DEBUG] DATABASE_URL set:', !!process.env.DATABASE_URL);

const app = express();
app.use(compression());
app.use(cors());
app.use(express.json());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] })); // Serve Next.js static export

const PUBLIC_URL = process.env.PUBLIC_URL || 'https://erp-bookandboxcom-production.up.railway.app';

// Setup multer for chat uploads
const chatUploadDir = path.join(__dirname, 'uploads', 'chats');
if (!fs.existsSync(chatUploadDir)) {
    fs.mkdirSync(chatUploadDir, { recursive: true });
}
const chatUpload = multer({ dest: chatUploadDir });

// Database Init (Railway PostgreSQL)
db.initDB();
const supabase = db; // ← alias ให้โค้ดเดิมใช้ชื่อ supabase ได้เลย ไม่ต้องแก้ 175 จุด

// Run migrations on startup
runMigrations().then(ok => {
    if (ok) console.log('✅ [Startup] Database ready');
    else console.error('❌ [Startup] Migration failed');
});

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

// Debug: store last webhook events for troubleshooting
let lastWebhookEvents = [];

app.get('/api/webhook/debug', (req, res) => {
    res.json({ lastEvents: lastWebhookEvents, count: lastWebhookEvents.length, timestamp: new Date().toISOString() });
});

app.post('/api/webhook', async (req, res) => {
    console.log('📨 [Webhook] Received:', JSON.stringify(req.body).substring(0, 500));
    const events = req.body.events;
    
    // Store for debugging
    lastWebhookEvents = (events || []).map(e => ({ type: e.type, source: e.source, messageType: e.message?.type, text: e.message?.text?.substring(0, 100), time: new Date().toISOString() }));
    
    // ⚡ ส่ง 200 OK ก่อน แล้วค่อย process (LINE ต้องการ response ภายใน 1 วินาที)
    res.status(200).send('OK');
    
    if (events && events.length > 0) {
        for (let event of events) {
            // ═══ Auto-detect Group ID / User ID ═══
            const sourceType = event.source?.type; // 'user', 'group', 'room'
            const userId = event.source?.userId;
            const groupId = event.source?.groupId;
            const roomId = event.source?.roomId;
            
            console.log(`📱 [LINE Event] type=${event.type} source=${sourceType} userId=${userId} groupId=${groupId || 'N/A'}`);

            // When bot is added to group → reply with Group ID
            if (event.type === 'join' || event.type === 'memberJoined') {
                const id = groupId || roomId;
                if (id && event.replyToken) {
                    try {
                        await lineClient.replyMessage({
                            replyToken: event.replyToken,
                            messages: [{ type: 'text', text: `✅ Bot เข้ากลุ่มสำเร็จ!\n\n🔑 Group ID:\n${id}\n\n📋 คัดลอก ID นี้ไปใส่ใน Railway Variables:\nLINE_GROUP_NOTIFY=${id}` }]
                        });
                    } catch(e) { console.log('Reply join error:', e.message); }
                }
                continue;
            }

            // When user sends "id" or "ID" → reply with their User ID
            if (event.type === 'message' && event.message?.type === 'text') {
                const txt = event.message.text.trim().toLowerCase();
                if (txt === 'id' || txt === 'myid' || txt === 'userid') {
                    const replyId = groupId || userId;
                    const replyType = groupId ? 'Group' : 'User';
                    if (event.replyToken) {
                        try {
                            await lineClient.replyMessage({
                                replyToken: event.replyToken,
                                messages: [{ type: 'text', text: `🔑 ${replyType} ID:\n${replyId}\n\n📋 ใส่ใน Railway Variables:\nLINE_GROUP_NOTIFY=${replyId}` }]
                            });
                        } catch(e) {}
                    }
                    continue;
                }
            }

            if (event.type === 'message') {
                // ═══ AI AGENT ถูกปิดถาวร — ห้ามตอบลูกค้าอัตโนมัติ ═══
                // (ถ้าต้องการเปิดใช้ AI ให้ใช้ผ่านหน้า ERP เท่านั้น ห้ามผ่าน LINE webhook)


                // ═══ Normal chat processing (Lead/Customer) ═══
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

                // Auto-Responder Logic (นอกเวลาทำการ)
                // ═══ Auto-Responder ถูกปิดถาวร — ห้ามตอบลูกค้าอัตโนมัติ ═══
                // (เดิมมีระบบตอบนอกเวลา แต่ปิดเพื่อป้องกัน AI หลุดไปหาลูกค้า)
            }
        }
    }
    // Response already sent at top
});

// ════════════════════════════════════════════════════════════════
// BOOKBOX AI AGENT — WEBHOOK แยก (LINE OA ตัวที่ 2 สำหรับทีมงาน)
// ════════════════════════════════════════════════════════════════
const AGENT_CHANNEL_TOKEN = process.env.AGENT_CHANNEL_ACCESS_TOKEN || '';
const AGENT_CHANNEL_SECRET_VAL = process.env.AGENT_CHANNEL_SECRET || '';
let agentLineClient = null;
if (AGENT_CHANNEL_TOKEN) {
    agentLineClient = new messagingApi.MessagingApiClient({ channelAccessToken: AGENT_CHANNEL_TOKEN });
    console.log('🤖 [AI Agent] LINE OA Agent client initialized');
} else {
    console.log('⚠️ [AI Agent] AGENT_CHANNEL_ACCESS_TOKEN not set — Agent webhook will use main LINE client');
}

app.post('/api/webhook-agent', async (req, res) => {
    const events = req.body.events;
    res.status(200).send('OK'); // ตอบ LINE ทันที

    if (!events || events.length === 0) return;

    // ใช้ client ของ Agent LINE OA (ถ้ามี) หรือ fallback ไป main client
    const client = agentLineClient || lineClient;
    const { getTeamMember } = require('./ai-agent');

    for (const event of events) {
        const groupId = event.source?.groupId;
        const userId = event.source?.userId;
        const sourceType = event.source?.type;

        console.log(`🤖 [Agent Webhook] type=${event.type} source=${sourceType} group=${groupId || 'N/A'} user=${userId}`);

        // Bot join group → log Group ID เงียบๆ ไม่ต้องทักทาย
        if (event.type === 'join' || event.type === 'memberJoined') {
            const id = groupId || event.source?.roomId;
            console.log(`🤖 [Agent] Joined group: ${id}`);
            continue;
        }

        // รับเฉพาะข้อความ text
        if (event.type !== 'message' || event.message?.type !== 'text') continue;

        const text = event.message.text.trim();
        const targetId = groupId || userId;

        // ══════════════════════════════════════════
        // คำสั่ง "id" ในกลุ่ม → แสดง Group ID เสมอ
        // ══════════════════════════════════════════
        if (text === 'id' && groupId) {
            try { await client.pushMessage({ to: groupId, messages: [{ type: 'text', text: `🔑 Group ID:\n${groupId}\n\n📋 ใช้ ID นี้สำหรับส่งข้อความผ่าน Nexus` }] }); } catch(e) {}
            continue;
        }

        // ══════════════════════════════════════════
        // คำสั่ง "ลงทะเบียน" — Self-service + CEO Approval
        // ══════════════════════════════════════════
        if (text === 'ลงทะเบียน' || text === 'register' || text === 'id' || text.startsWith('ลงทะเบียน ')) {
            const member = getTeamMember(userId);
            const isPrivate = sourceType === 'user';

            if (member) {
                try { await client.pushMessage({ to: targetId, messages: [{ type: 'text', text: `✅ ลงทะเบียนแล้ว: คุณ${member.name} (${member.role})\n🔑 ID: ${userId}` }] }); } catch(e) {}
                continue;
            }

            // Check if pending
            try {
                const db = require('./db');
                const pending = await db.query(`SELECT * FROM team_members WHERE line_user_id = $1`, [userId]);
                if (pending.rows.length > 0 && pending.rows[0].status === 'pending') {
                    try { await client.pushMessage({ to: targetId, messages: [{ type: 'text', text: `⏳ รอ CEO อนุมัติอยู่ครับ กรุณารอสักครู่...` }] }); } catch(e) {}
                    continue;
                }
            } catch(e) {}

            if (!isPrivate) {
                try { await client.pushMessage({ to: targetId, messages: [{ type: 'text', text: `📝 กรุณาลงทะเบียนในแชทส่วนตัวครับ\nแอด BookBox AI Agent เป็นเพื่อน แล้วพิมพ์:\nลงทะเบียน ชื่อ ตำแหน่ง\n\nตัวอย่าง: ลงทะเบียน หนึ่ง IT` }] }); } catch(e) {}
                continue;
            }

            const parts = text.replace(/^(ลงทะเบียน|register)\s*/i, '').trim().split(/\s+/);
            if (parts.length === 0 || !parts[0]) {
                try { await client.pushMessage({ to: userId, messages: [{ type: 'text', text: `📝 พิมพ์ชื่อและตำแหน่งต่อท้ายครับ\n\nตัวอย่าง:\nลงทะเบียน หนึ่ง IT\nลงทะเบียน ซัน Production Manager\nลงทะเบียน อ้อ บัญชี` }] }); } catch(e) {}
                continue;
            }

            const regName = parts[0];
            const regRole = parts.slice(1).join(' ') || 'Operator';
            const CEO_LINE_ID = 'Ua944192ba939c444c52b4a435539c5a3';

            try {
                const db = require('./db');
                await db.query(
                    `INSERT INTO team_members (line_user_id, name, role, status) VALUES ($1, $2, $3, 'pending') ON CONFLICT (line_user_id) DO UPDATE SET name = $2, role = $3, status = 'pending'`,
                    [userId, regName, regRole]
                );
                // แจ้ง user
                await client.pushMessage({ to: userId, messages: [{ type: 'text', text: `📨 ส่งคำขอลงทะเบียนแล้ว!\n\n👤 ชื่อ: ${regName}\n💼 ตำแหน่ง: ${regRole}\n\n⏳ รอ CEO อนุมัติ...` }] });
                // แจ้ง CEO ขออนุมัติ
                await client.pushMessage({ to: CEO_LINE_ID, messages: [{ type: 'text', text: `🔔 มีคนขอลงทะเบียน!\n\n👤 ชื่อ: ${regName}\n💼 ตำแหน่ง: ${regRole}\n🔑 ID: ${userId}\n\n✅ พิมพ์ \"อนุมัติ ${regName}\" เพื่ออนุมัติ\n❌ พิมพ์ \"ปฏิเสธ ${regName}\" เพื่อปฏิเสธ` }] });
                console.log(`📨 [Register] ${regName} pending approval`);
            } catch(e) {
                console.error('❌ [Register]', e.message);
            }
            continue;
        }

        // ══════════════════════════════════════════
        // คำสั่ง "อนุมัติ/ปฏิเสธ" — CEO Only
        // ══════════════════════════════════════════
        if ((text.startsWith('อนุมัติ ') || text.startsWith('ปฏิเสธ ')) && sourceType === 'user') {
            const CEO_LINE_ID = 'Ua944192ba939c444c52b4a435539c5a3';
            if (userId !== CEO_LINE_ID) {
                try { await client.pushMessage({ to: userId, messages: [{ type: 'text', text: `⛔ เฉพาะ CEO เท่านั้นที่อนุมัติได้ครับ` }] }); } catch(e) {}
                continue;
            }

            const isApprove = text.startsWith('อนุมัติ');
            const targetName = text.replace(/^(อนุมัติ|ปฏิเสธ)\s+/, '').trim();
            const newStatus = isApprove ? 'active' : 'rejected';

            try {
                const db = require('./db');
                const found = await db.query(`SELECT * FROM team_members WHERE name = $1 AND status = 'pending'`, [targetName]);
                if (found.rows.length === 0) {
                    await client.pushMessage({ to: userId, messages: [{ type: 'text', text: `⚠️ ไม่พบ "${targetName}" ในรายการรออนุมัติ` }] });
                    continue;
                }

                const member = found.rows[0];
                await db.query(`UPDATE team_members SET status = $1 WHERE id = $2`, [newStatus, member.id]);

                if (isApprove) {
                    // Auto-create ERP login account
                    const erpUsername = member.name.toLowerCase().replace(/\s+/g, '');
                    const erpPin = String(Math.floor(1000 + Math.random() * 9000)); // 4-digit PIN
                    const roleMap = { 'IT': 'Production Manager', 'Production Manager': 'Production Manager', 'บัญชี': 'Accountant', 'Accountant': 'Accountant', 'HR': 'HR', 'Sales': 'Sales', 'Driver': 'Driver', 'Operator': 'Operator' };
                    const erpRole = roleMap[member.role] || 'Operator';

                    try {
                        await db.query(
                            `INSERT INTO erp_users (username, pin_code, full_name, role, active) VALUES ($1, $2, $3, $4, true) ON CONFLICT (username) DO UPDATE SET pin_code = $2, full_name = $3, role = $4, active = true`,
                            [erpUsername, erpPin, member.name, erpRole]
                        );
                    } catch(e) { console.error('❌ [ERP User Create]', e.message); }

                    // แจ้ง CEO
                    await client.pushMessage({ to: userId, messages: [{ type: 'text', text: `✅ อนุมัติ ${targetName} (${member.role}) เรียบร้อย!\n\n🔐 สร้าง account แล้ว:\nUsername: ${erpUsername}\nPIN: ${erpPin}` }] });

                    // DM ผู้สมัคร — ส่ง credentials ส่วนตัว
                    try {
                        await client.pushMessage({ to: member.line_user_id, messages: [{ type: 'text', text: `🎉 ลงทะเบียนได้รับอนุมัติแล้ว!\n\n👤 คุณ${member.name} (${erpRole})\n\n🔐 ข้อมูลเข้าใช้งานระบบ ERP:\n👤 Username: ${erpUsername}\n🔑 PIN: ${erpPin}\n\n🏭 เข้าใช้งานได้ที่:\nhttps://erp-bookandboxcom-production.up.railway.app\n\n⚠️ กรุณาเก็บ PIN เป็นความลับ!` }] });
                    } catch(e) {}
                } else {
                    await client.pushMessage({ to: userId, messages: [{ type: 'text', text: `❌ ปฏิเสธ ${targetName} แล้ว` }] });
                    try { await client.pushMessage({ to: member.line_user_id, messages: [{ type: 'text', text: `❌ คำขอลงทะเบียนถูกปฏิเสธครับ\nกรุณาติดต่อ CEO` }] }); } catch(e) {}
                }
                // Reload team cache
                const { loadTeamFromDB } = require('./ai-agent');
                if (loadTeamFromDB) await loadTeamFromDB();
            } catch(e) {
                console.error('❌ [Approve]', e.message);
            }
            continue;
        }

        // ══════════════════════════════════════════
        // 📝 LINE Time Logger — เริ่มงาน/จบงาน ผ่าน LINE
        // ══════════════════════════════════════════
        const memberForLog = getTeamMember(userId);
        const logName = memberForLog ? memberForLog.name : null;

        if (logName && (text.startsWith('เริ่ม ') || text.startsWith('เริ่มงาน ') || text.startsWith('start '))) {
            const taskText = text.replace(/^(เริ่มงาน|เริ่ม|start)\s+/i, '').trim();
            if (!taskText) {
                try { await client.pushMessage({ to: targetId, messages: [{ type: 'text', text: `📝 พิมพ์ชื่องานต่อท้ายครับ\n\nตัวอย่าง:\nเริ่ม JO-104 เช็คไฟล์\nเริ่ม พิมพ์ออฟเซท\nเริ่ม เคลือบ PVC` }] }); } catch(e) {}
                continue;
            }
            try {
                const db = require('./db');
                await db.query(
                    `INSERT INTO time_log (user_name, task_name, category, status, start_time) VALUES ($1, $2, $3, 'running', NOW())`,
                    [logName, taskText, 'LINE']
                );
                await client.pushMessage({ to: targetId, messages: [{ type: 'text', text: `⏱️ เริ่มจับเวลาแล้ว!\n\n👤 ${logName}\n📋 ${taskText}\n\n💡 พิมพ์ "จบงาน" เมื่อเสร็จ` }] });
            } catch(e) {
                try { await client.pushMessage({ to: targetId, messages: [{ type: 'text', text: `❌ Error: ${e.message}` }] }); } catch(e2) {}
            }
            continue;
        }

        if (logName && (text === 'จบงาน' || text === 'จบ' || text === 'เสร็จ' || text === 'done' || text.startsWith('จบงาน '))) {
            try {
                const db = require('./db');
                // Get latest running task
                const running = await db.query(
                    `SELECT * FROM time_log WHERE user_name = $1 AND status = 'running' ORDER BY start_time DESC LIMIT 1`,
                    [logName]
                );
                if (running.rows.length === 0) {
                    await client.pushMessage({ to: targetId, messages: [{ type: 'text', text: `⚠️ ไม่มีงานที่กำลังทำอยู่ครับ\nพิมพ์ "เริ่ม ชื่องาน" เพื่อเริ่มงานใหม่` }] });
                    continue;
                }
                const task = running.rows[0];
                const durSec = Math.floor((Date.now() - new Date(task.start_time).getTime()) / 1000) + (task.duration_seconds || 0);
                const h = Math.floor(durSec / 3600), m = Math.floor((durSec % 3600) / 60);
                const durText = h > 0 ? `${h} ชม. ${m} นาที` : `${m} นาที`;

                // Parse quantity from message if provided (e.g. "จบงาน 500")
                const qtyMatch = text.match(/\d+/);
                const qty = qtyMatch ? parseInt(qtyMatch[0]) : null;

                await db.query(
                    `UPDATE time_log SET status = 'finished', end_time = NOW(), duration_seconds = $1, quantity = $2 WHERE id = $3`,
                    [durSec, qty, task.id]
                );

                await client.pushMessage({ to: targetId, messages: [{ type: 'text', text: `✅ จบงานแล้ว!\n\n📋 ${task.task_name}\n⏱️ ใช้เวลา: ${durText}${qty ? `\n📦 จำนวน: ${qty} ชิ้น` : ''}\n\n👍 บันทึกเรียบร้อย!` }] });
            } catch(e) {
                try { await client.pushMessage({ to: targetId, messages: [{ type: 'text', text: `❌ Error: ${e.message}` }] }); } catch(e2) {}
            }
            continue;
        }

        if (logName && (text === 'งานของฉัน' || text === 'สถานะ' || text === 'status' || text === 'my tasks')) {
            try {
                const db = require('./db');
                const running = await db.query(
                    `SELECT * FROM time_log WHERE user_name = $1 AND status = 'running' ORDER BY start_time DESC`,
                    [logName]
                );
                if (running.rows.length === 0) {
                    await client.pushMessage({ to: targetId, messages: [{ type: 'text', text: `📋 คุณ${logName} ไม่มีงานค้างอยู่ครับ\n\nพิมพ์ "เริ่ม ชื่องาน" เพื่อเริ่มงานใหม่` }] });
                } else {
                    let msg = `📋 งานที่กำลังทำ (${running.rows.length}):\n\n`;
                    running.rows.forEach((t, i) => {
                        const sec = Math.floor((Date.now() - new Date(t.start_time).getTime()) / 1000) + (t.duration_seconds || 0);
                        const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
                        msg += `${i+1}. ${t.task_name}\n   ⏱️ ${h > 0 ? `${h}ชม.${m}นาที` : `${m}นาที`}\n`;
                    });
                    msg += `\nพิมพ์ "จบงาน" เพื่อจบงานล่าสุด`;
                    await client.pushMessage({ to: targetId, messages: [{ type: 'text', text: msg }] });
                }
            } catch(e) {}
            continue;
        }

        // ══════════════════════════════════════════
        // 🏭 LINE Factory Commands — เพิ่มเครื่อง/งาน ผ่าน LINE
        // ══════════════════════════════════════════
        if (logName && text.startsWith('เพิ่มเครื่อง ')) {
            const parts = text.replace('เพิ่มเครื่อง ', '').trim().split(/\s*[,|/]\s*/);
            const machineName = parts[0];
            const typeMap = { 'offset':'offset_press', 'digital':'digital_press', 'ไดคัท':'diecut', 'diecut':'diecut', 'พับ':'folding', 'เคลือบ':'lamination', 'เข้าเล่ม':'binding', 'เย็บ':'binding', 'prepress':'prepress', 'พรีเพรส':'prepress', 'แพ็ค':'packing', 'qc':'qc' };
            const machineType = typeMap[(parts[1] || '').toLowerCase().trim()] || 'general';
            const capPerHour = parseInt(parts[2]) || 100;
            const shiftHours = parseInt(parts[3]) || 8;
            try {
                const db = require('./db');
                await db.query(`INSERT INTO work_centers (name, type, capacity_per_hour, shift_hours, status) VALUES ($1, $2, $3, $4, 'active')`, [machineName, machineType, capPerHour, shiftHours]);
                await client.pushMessage({ to: targetId, messages: [{ type: 'text', text: `✅ เพิ่มเครื่องจักรแล้ว!\n\n⚙️ ${machineName}\n📂 ${machineType}\n🏭 ${capPerHour}/ชม. • ${shiftHours}ชม./กะ` }] });
            } catch(e) {
                try { await client.pushMessage({ to: targetId, messages: [{ type: 'text', text: `❌ Error: ${e.message}` }] }); } catch(e2) {}
            }
            continue;
        }

        if (logName && text.startsWith('เพิ่มงาน ')) {
            const parts = text.replace('เพิ่มงาน ', '').trim().split(/\s*[,|/]\s*/);
            const jobName = parts[0];
            const customerName = parts[1] || '';
            const quantity = parseInt(parts[2]) || 0;
            const durationMin = parseInt(parts[3]) || 60;
            try {
                const db = require('./db');
                await db.query(
                    `INSERT INTO production_schedule (job_name, customer_name, quantity, estimated_duration_min, scheduled_start, status, priority) VALUES ($1, $2, $3, $4, NOW(), 'queued', 5)`,
                    [jobName, customerName, quantity, durationMin]
                );
                await client.pushMessage({ to: targetId, messages: [{ type: 'text', text: `✅ เพิ่มงานผลิตแล้ว!\n\n📋 ${jobName}\n👤 ${customerName || '-'}\n📦 ${quantity > 0 ? quantity.toLocaleString() + ' ชิ้น' : '-'}\n⏱️ ${durationMin} นาที\n\n📊 สถานะ: รอผลิต` }] });
            } catch(e) {
                try { await client.pushMessage({ to: targetId, messages: [{ type: 'text', text: `❌ Error: ${e.message}` }] }); } catch(e2) {}
            }
            continue;
        }

        if (logName && (text === 'สรุปผลิต' || text === 'สรุปงาน' || text === 'production' || text === 'report')) {
            try {
                const db = require('./db');
                const [queued, inProg, done, wc] = await Promise.all([
                    db.query(`SELECT COUNT(*) as c FROM production_schedule WHERE status = 'queued'`),
                    db.query(`SELECT COUNT(*) as c FROM production_schedule WHERE status = 'in_progress'`),
                    db.query(`SELECT COUNT(*) as c FROM production_schedule WHERE status = 'completed' AND DATE(actual_end) = CURRENT_DATE`),
                    db.query(`SELECT COUNT(*) as c FROM work_centers WHERE status = 'active'`),
                ]);
                const jobs = await db.query(`SELECT job_name, customer_name, status, estimated_duration_min FROM production_schedule WHERE status IN ('queued','in_progress') ORDER BY priority ASC LIMIT 10`);
                let msg = `📊 สรุปผลิตวันนี้\n\n⚙️ เครื่องจักร: ${wc.rows[0].c}\n📥 รอผลิต: ${queued.rows[0].c}\n⚙️ กำลังผลิต: ${inProg.rows[0].c}\n✅ เสร็จวันนี้: ${done.rows[0].c}\n`;
                if (jobs.rows.length > 0) {
                    msg += `\n📋 งานค้าง:\n`;
                    jobs.rows.forEach((j, i) => {
                        const icon = j.status === 'in_progress' ? '⚙️' : '📥';
                        msg += `${i+1}. ${icon} ${j.job_name}${j.customer_name ? ` (${j.customer_name})` : ''}\n`;
                    });
                }
                await client.pushMessage({ to: targetId, messages: [{ type: 'text', text: msg }] });
            } catch(e) {}
            continue;
        }

        // 🔄 อัพเดทสถานะงานผลิตผ่าน LINE
        if (logName && (text.startsWith('เริ่มผลิต ') || text.startsWith('เสร็จงาน ') || text.startsWith('พักงาน '))) {
            const isStart = text.startsWith('เริ่มผลิต');
            const isDone = text.startsWith('เสร็จงาน');
            const keyword = text.replace(/^(เริ่มผลิต|เสร็จงาน|พักงาน)\s+/, '').trim();
            const newStatus = isStart ? 'in_progress' : isDone ? 'completed' : 'on_hold';
            try {
                const db = require('./db');
                const found = await db.query(
                    `SELECT * FROM production_schedule WHERE LOWER(job_name) LIKE $1 AND status NOT IN ('completed','cancelled') ORDER BY priority ASC LIMIT 1`,
                    [`%${keyword.toLowerCase()}%`]
                );
                if (found.rows.length === 0) {
                    await client.pushMessage({ to: targetId, messages: [{ type: 'text', text: `⚠️ ไม่พบงาน "${keyword}" ที่ค้างอยู่` }] });
                    continue;
                }
                const job = found.rows[0];
                const updates = { status: newStatus };
                if (isStart) updates.actual_start = new Date().toISOString();
                if (isDone) updates.actual_end = new Date().toISOString();
                const setClauses = Object.entries(updates).map(([k,v], i) => `${k} = $${i+1}`).join(', ');
                await db.query(`UPDATE production_schedule SET ${setClauses} WHERE id = $${Object.keys(updates).length + 1}`, [...Object.values(updates), job.id]);
                const icons = { 'in_progress': '⚙️ เริ่มผลิต', 'completed': '✅ เสร็จ', 'on_hold': '⏸️ พัก' };
                await client.pushMessage({ to: targetId, messages: [{ type: 'text', text: `${icons[newStatus]}!\n\n📋 ${job.job_name}\n👤 ${job.customer_name || '-'}\n📦 ${job.quantity ? job.quantity.toLocaleString() + ' ชิ้น' : '-'}` }] });
            } catch(e) {
                try { await client.pushMessage({ to: targetId, messages: [{ type: 'text', text: `❌ Error: ${e.message}` }] }); } catch(e2) {}
            }
            continue;
        }

        if (text === 'คำสั่ง' || text === 'help' || text === 'ช่วย') {
            await client.pushMessage({ to: targetId, messages: [{ type: 'text', text: `📖 คำสั่ง Zero:\n\n⏱️ ลงเวลา:\n• เริ่ม [ชื่องาน]\n• จบงาน / จบงาน 500\n• งานของฉัน\n\n🏭 Smart Factory:\n• เพิ่มเครื่อง ชื่อ,ประเภท,กำลัง,ชม/กะ\n• เพิ่มงาน ชื่อ,ลูกค้า,จำนวน,นาที\n• เริ่มผลิต [ชื่องาน]\n• เสร็จงาน [ชื่องาน]\n• พักงาน [ชื่องาน]\n• สรุปผลิต\n\n📝 อื่นๆ:\n• ลงทะเบียน ชื่อ ตำแหน่ง` }] });
            continue;
        }

        // ตรวจว่าข้อความเริ่มต้นด้วย trigger prefix
        const hasPrefix = AI_TRIGGER_PREFIXES.some(p => text.toLowerCase().startsWith(p));
        
        const isPrivateChat = sourceType === 'user';
        const isGroupChat = sourceType === 'group' || sourceType === 'room';
        const member = getTeamMember(userId);
        const memberName = member ? `คุณ${member.name}` : 'ผู้ใช้ที่ไม่ระบุตัวตน';

        // ══════════════════════════════════════════
        // กลุ่ม: เก็บข้อมูลทุกข้อความ (Passive Collection)
        // ══════════════════════════════════════════
        if (isGroupChat && !hasPrefix) {
            // ไม่มี @ai → เก็บข้อมูลเงียบๆ
            if (!AI_API_KEY || !member) continue;
            
            // ดึงชื่อกลุ่มจาก LINE API อัตโนมัติ
            let groupName = '';
            try {
                const groupInfo = await client.getGroupSummary(groupId);
                groupName = groupInfo.groupName || '';
            } catch(e) { /* ไม่เป็นไร ถ้าดึงไม่ได้ */ }

            const { classifyMessage, saveReport, REPORT_LABELS } = require('./ai-agent');
            try {
                const classification = await classifyMessage(text, AI_API_KEY);
                if (classification.is_report) {
                    const label = REPORT_LABELS[classification.type] || 'รายงานทั่วไป';
                    const saved = await saveReport(supabase, {
                        reportType: classification.type || 'general',
                        member: member,
                        lineUserId: userId,
                        groupId: groupId,
                        groupName: groupName,
                        title: classification.title || label,
                        content: text,
                        rawMessage: text,
                        priority: classification.priority || 'normal'
                    });
                    const refId = `RPT-${String(saved.id).padStart(4, '0')}`;
                    const priorityEmoji = classification.priority === 'urgent' ? '🔴' : classification.priority === 'high' ? '🟡' : '🟢';
                    
                    // ตอบสั้นๆ ยืนยันว่าเก็บแล้ว
                    await client.pushMessage({
                        to: targetId,
                        messages: [{ type: 'text', text: `${priorityEmoji} บันทึกแล้ว | ${refId} | ${classification.title || label}` }]
                    });
                    console.log(`📝 [Agent] Logged ${refId} from ${memberName} in "${groupName}" (${groupId})`);
                }
            } catch(classErr) {
                console.log('⚠️ [Agent] Classify error:', classErr.message);
            }
            continue;
        }

        // ══════════════════════════════════════════
        // แชทส่วนตัว หรือ @ai ในกลุ่ม → ตอบเต็มรูปแบบ
        // ══════════════════════════════════════════
        if (!isPrivateChat && !hasPrefix) continue;

        // Strip prefix
        let cleanQ = text;
        for (const prefix of AI_TRIGGER_PREFIXES) {
            if (cleanQ.toLowerCase().startsWith(prefix)) {
                cleanQ = cleanQ.substring(prefix.length).trim();
                break;
            }
        }
        if (!cleanQ) cleanQ = text;

        console.log(`🤖 [Agent] Processing: "${cleanQ}" from ${memberName} (${userId}) for ${targetId}`);

        if (!AI_API_KEY) {
            try {
                await client.pushMessage({
                    to: targetId,
                    messages: [{ type: 'text', text: '⚠️ AI Agent ยังไม่มี API Key\nกรุณาเพิ่ม AI_API_KEY ใน Environment Variables' }]
                });
            } catch(e) {}
            continue;
        }

        try {
            // ส่ง userId + groupId ไปด้วยเพื่อตรวจสอบสิทธิ์และบันทึกรายงาน
            const answer = await processAgentQuery(supabase, cleanQ, AI_API_KEY, AI_MODEL, userId, groupId);
            const header = member ? `🤖 BookBox AI → ${memberName}` : '🤖 BookBox AI';
            const replyText = `${header}\n━━━━━━━━━━━━━━━\n${answer}`;
            await client.pushMessage({
                to: targetId,
                messages: [{ type: 'text', text: replyText.substring(0, 5000) }]
            });
            console.log(`✅ [Agent] Replied to ${memberName} at ${targetId}`);

            // ══════════════════════════════════════════
            // ส่งข้อเสนอไปหา CEO อัตโนมัติ
            // ══════════════════════════════════════════
            const { CEO_USER_ID, hasProposal, extractProposal } = require('./ai-agent');
            if (hasProposal(answer) && userId !== CEO_USER_ID) {
                const proposal = extractProposal(answer);
                const ceoMsg = `📨 ข้อเสนอจาก ${memberName} (${member?.role || 'ไม่ระบุ'})\n━━━━━━━━━━━━━━━\n${proposal}\n━━━━━━━━━━━━━━━\n💬 คำถามเดิม: "${cleanQ}"\n\nตอบ "อนุมัติ" หรือ "ไม่อนุมัติ" ได้เลยครับ`;
                try {
                    await client.pushMessage({
                        to: CEO_USER_ID,
                        messages: [{ type: 'text', text: ceoMsg.substring(0, 5000) }]
                    });
                    console.log(`📨 [Agent] Forwarded proposal from ${memberName} to CEO`);
                } catch(fwdErr) {
                    console.error('❌ [Agent] Failed to forward proposal to CEO:', fwdErr.message);
                }
            }
        } catch(err) {
            console.error('❌ [Agent] Error:', err.message);
            try {
                await client.pushMessage({
                    to: targetId,
                    messages: [{ type: 'text', text: '⚠️ ขอโทษครับ ตอนนี้ระบบยุ่งอยู่ ลองถามใหม่อีกทีนะครับ' }]
                });
            } catch(e) {}
        }
    }
});

console.log('🤖 [AI Agent] Webhook endpoint ready at /api/webhook-agent');

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
        // 4 second memory cache to reduce DB load from 5s polling
        if (chatsCache.data && (now - chatsCache.timestamp < 4000)) {
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
        const daysBack = parseInt(req.query.days) || 90; // 90 days default to reduce load
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

app.post('/api/chats/:id/reply_gallery', async (req, res) => {
    const leadId = req.params.id;
    const { mediaUrl } = req.body;

    try {
        const { data: row, error } = await supabase.from('lead_contact').select('line_user_id, fb_user_id, platform').eq('id', leadId).single();
        if (error || !row) return res.status(404).send('Lead not found');

        await supabase.from('chat_message').insert([{
            lead_id: leadId,
            sender: 'admin',
            type: 'image',
            media_url: mediaUrl
        }]);

        if (row.fb_user_id) {
            await sendFbMessage(row.fb_user_id, `รูปภาพ: ${mediaUrl}`);
        } else if (row.line_user_id && channelToken !== 'DUMMY_TOKEN') {
            await lineClient.pushMessage({
                to: row.line_user_id,
                messages: [{ type: 'image', originalContentUrl: mediaUrl, previewImageUrl: mediaUrl }]
            });
        }
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// --- Gallery APIs ---
const galleryDir = path.join(__dirname, 'public', 'uploads', 'gallery');
if (!fs.existsSync(galleryDir)) fs.mkdirSync(galleryDir, { recursive: true });

app.get('/api/gallery/:category', (req, res) => {
    try {
        const catDir = path.join(galleryDir, req.params.category);
        if (!fs.existsSync(catDir)) return res.json([]);
        const files = fs.readdirSync(catDir);
        const urls = files.filter(f => !f.startsWith('.')).map(f => `${PUBLIC_URL}/uploads/gallery/${req.params.category}/${f}`);
        res.json(urls);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/gallery/upload', chatUpload.array('files', 10), (req, res) => {
    try {
        const category = req.body.category || 'อื่นๆ';
        const catDir = path.join(galleryDir, category);
        if (!fs.existsSync(catDir)) fs.mkdirSync(catDir, { recursive: true });

        const urls = [];
        for (const file of req.files) {
            const ext = path.extname(file.originalname);
            const newFileName = `${Date.now()}_${Math.random().toString(36).substr(2,5)}${ext}`;
            fs.renameSync(file.path, path.join(catDir, newFileName));
            urls.push(`${PUBLIC_URL}/uploads/gallery/${category}/${newFileName}`);
        }
        res.json({ success: true, urls });
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
        // Invalidate cache so next fetch gets fresh data instantly
        chatsCache = { data: null, timestamp: 0 };
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

// ====== PRODUCTION REAL DATA (from Excel import) ======

// Get all production jobs with filters
app.get('/api/production/jobs', async (req, res) => {
    try {
        const { status, machine, search, limit = 50, offset = 0, sort = 'due_date', order = 'ASC' } = req.query;
        let where = [];
        let params = [];
        let pi = 1;

        if (status && status !== 'all') { where.push(`status = $${pi++}`); params.push(status); }
        if (machine) { where.push(`machine = $${pi++}`); params.push(machine); }
        if (search) { where.push(`(jog_no ILIKE $${pi} OR job_name ILIKE $${pi})`); params.push(`%${search}%`); pi++; }

        const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
        const validSort = ['due_date','jog_no','status','created_at','sheets_actual'].includes(sort) ? sort : 'due_date';
        const validOrder = order === 'DESC' ? 'DESC' : 'ASC';

        const countQ = await db.query(`SELECT COUNT(*) as total FROM production_jobs_real ${whereClause}`, params);
        const dataQ = await db.query(
            `SELECT * FROM production_jobs_real ${whereClause} 
             ORDER BY ${validSort} ${validOrder} NULLS LAST 
             LIMIT $${pi++} OFFSET $${pi++}`,
            [...params, parseInt(limit), parseInt(offset)]
        );

        res.json({ 
            total: parseInt(countQ.rows[0].total),
            jobs: dataQ.rows,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Production dashboard summary
app.get('/api/production/dashboard', async (req, res) => {
    try {
        const statusSummary = await db.query(`
            SELECT status, COUNT(*) as count, COALESCE(SUM(sheets_actual),0) as total_sheets
            FROM production_jobs_real GROUP BY status ORDER BY count DESC
        `);

        const machineSummary = await db.query(`
            SELECT COALESCE(machine,'ไม่ระบุ') as machine, COUNT(*) as count,
                   COALESCE(SUM(sheets_actual),0) as total_sheets,
                   COUNT(*) FILTER (WHERE status='queued') as queued,
                   COUNT(*) FILTER (WHERE status='printing') as printing,
                   COUNT(*) FILTER (WHERE status='completed') as completed
            FROM production_jobs_real GROUP BY machine ORDER BY count DESC
        `);

        const postPressSummary = await db.query(`
            SELECT 
                COUNT(*) FILTER (WHERE coating NOT IN ('ไม่ทำ','')) as needs_coating,
                COUNT(*) FILTER (WHERE hot_stamp NOT IN ('ไม่ทำ','')) as needs_hotstamp,
                COUNT(*) FILTER (WHERE emboss NOT IN ('ไม่ทำ','')) as needs_emboss,
                COUNT(*) FILTER (WHERE die_cut NOT IN ('ไม่ทำ','')) as needs_diecut,
                COUNT(*) FILTER (WHERE glue NOT IN ('ไม่ทำ','')) as needs_glue,
                COUNT(*) FILTER (WHERE fold NOT IN ('ไม่ทำ','')) as needs_fold,
                COUNT(*) FILTER (WHERE binding NOT IN ('ไม่ทำ','')) as needs_binding
            FROM production_jobs_real WHERE status NOT IN ('completed','cancelled')
        `);

        const urgentJobs = await db.query(`
            SELECT jog_no, job_name, due_date, status, sheets_actual, machine
            FROM production_jobs_real 
            WHERE status NOT IN ('completed','cancelled') AND due_date IS NOT NULL
            ORDER BY due_date ASC LIMIT 10
        `);

        const totalJobs = await db.query('SELECT COUNT(*) as c FROM production_jobs_real');

        res.json({
            total_jobs: parseInt(totalJobs.rows[0].c),
            by_status: statusSummary.rows,
            by_machine: machineSummary.rows,
            post_press: postPressSummary.rows[0],
            urgent_jobs: urgentJobs.rows
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Update job status
app.put('/api/production/jobs/:jog_no/status', async (req, res) => {
    try {
        const { status } = req.body;
        const result = await db.query(
            'UPDATE production_jobs_real SET status = $1 WHERE jog_no = $2 RETURNING *',
            [status, req.params.jog_no]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Job not found' });
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Get single job detail
app.get('/api/production/jobs/:jog_no', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM production_jobs_real WHERE jog_no = $1', [req.params.jog_no]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Job not found' });
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ====== SMART IE: MACHINE PROFILES ======

app.get('/api/machine_profiles', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM machine_profiles ORDER BY machine_id');
        res.json(result.rows || []);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/machine_profiles', async (req, res) => {
    try {
        const { machine_id, machine_name, department, standard_speed_per_hour, setup_time_min, max_shift_hours, cost_per_hour, notes } = req.body;
        await db.query(
            `INSERT INTO machine_profiles (machine_id, machine_name, department, standard_speed_per_hour, setup_time_min, max_shift_hours, cost_per_hour, notes)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
             ON CONFLICT (machine_id) DO UPDATE SET machine_name=$2, department=$3, standard_speed_per_hour=$4, setup_time_min=$5, max_shift_hours=$6, cost_per_hour=$7, notes=$8`,
            [machine_id, machine_name, department || 'production', standard_speed_per_hour || 0, setup_time_min || 30, max_shift_hours || 8, cost_per_hour || 0, notes || '']
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/machine_profiles/seed', async (req, res) => {
    try {
        const machines = [
            { id: 'SM74F', name: 'SM74F (Heidelberg 2003)', speed: 10000, setup: 30, cost: 350 },
            { id: 'SM102F', name: 'SM102F (Heidelberg 1999)', speed: 8000, setup: 45, cost: 450 },
            { id: 'KM_C12000', name: 'Konica 12000 (Digital)', speed: 1200, setup: 5, cost: 200 },
            { id: 'KM_C4070', name: 'Konica 4070 (Digital)', speed: 800, setup: 5, cost: 150 },
            { id: 'Cutter', name: 'เครื่องตัด (Polar)', speed: 5000, setup: 10, cost: 100 },
            { id: 'Diecut', name: 'เครื่องปั๊มไดคัท/ฟอยล์', speed: 3000, setup: 20, cost: 250 },
            { id: 'Folder', name: 'เครื่องพับ', speed: 6000, setup: 15, cost: 120 },
            { id: 'Stitcher', name: 'เครื่องเก็บเย็บ', speed: 4000, setup: 10, cost: 100 },
        ];
        for (const m of machines) {
            await db.query(
                `INSERT INTO machine_profiles (machine_id, machine_name, standard_speed_per_hour, setup_time_min, cost_per_hour)
                 VALUES ($1,$2,$3,$4,$5) ON CONFLICT (machine_id) DO UPDATE SET machine_name=$2, standard_speed_per_hour=$3, setup_time_min=$4, cost_per_hour=$5`,
                [m.id, m.name, m.speed, m.setup, m.cost]
            );
        }
        res.json({ success: true, count: machines.length });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ====== SMART IE: WORKLOAD ANALYSIS ======

app.get('/api/workload/analysis', async (req, res) => {
    try {
        // 1. Get machine profiles
        const machinesRes = await db.query('SELECT * FROM machine_profiles WHERE status = $1', ['active']);
        const machines = machinesRes.rows || [];

        // 2. Get backlog per machine from production_jobs_real
        const backlogRes = await db.query(`
            SELECT COALESCE(machine,'ไม่ระบุ') as machine, 
                   COUNT(*) as job_count,
                   COALESCE(SUM(sheets_actual),0) as total_sheets
            FROM production_jobs_real 
            WHERE status IN ('queued','printing')
            GROUP BY machine ORDER BY total_sheets DESC
        `);

        // 3. Calculate backlog days per machine
        const analysis = backlogRes.rows.map(b => {
            const profile = machines.find(m => b.machine && b.machine.toUpperCase().includes(m.machine_id.toUpperCase()));
            const speed = profile ? profile.standard_speed_per_hour : 5000; // fallback
            const shiftHours = profile ? profile.max_shift_hours : 8;
            const setupPerJob = profile ? profile.setup_time_min / 60 : 0.5; // hours
            const totalProductionHours = (b.total_sheets / speed) + (b.job_count * setupPerJob);
            const backlogDays = totalProductionHours / shiftHours;
            const costPerHour = profile ? profile.cost_per_hour : 0;

            let status = 'normal';
            let recommendation = '';
            if (backlogDays > 5) {
                status = 'overload';
                recommendation = '🔴 ภาระงานล้น — แนะนำจัดโอที หรือกระจายงานให้เครื่องอื่น';
            } else if (backlogDays > 3) {
                status = 'warning';
                recommendation = '🟡 ภาระงานสูง — ควรเตรียมแผนสำรอง';
            } else if (backlogDays < 1) {
                status = 'idle';
                recommendation = '🟢 งานน้อย — แจ้งเซลส์หางานเพิ่ม / ซ่อมบำรุงเครื่อง / ฝึกทักษะพนักงาน';
            } else {
                recommendation = '✅ ภาระงานสมดุล';
            }

            return {
                machine: b.machine,
                job_count: parseInt(b.job_count),
                total_sheets: parseInt(b.total_sheets),
                speed_per_hour: speed,
                backlog_hours: Math.round(totalProductionHours * 10) / 10,
                backlog_days: Math.round(backlogDays * 10) / 10,
                estimated_cost: Math.round(totalProductionHours * costPerHour),
                status,
                recommendation
            };
        });

        const totalBacklogHours = analysis.reduce((s, a) => s + a.backlog_hours, 0);
        const overloaded = analysis.filter(a => a.status === 'overload').length;
        const idle = analysis.filter(a => a.status === 'idle').length;

        res.json({
            machines: analysis,
            summary: {
                total_backlog_hours: Math.round(totalBacklogHours),
                total_backlog_days: Math.round(totalBacklogHours / 8 * 10) / 10,
                overloaded_machines: overloaded,
                idle_machines: idle,
                total_machines: analysis.length
            }
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ====== SMART IE: EMPLOYEE SKILLS ======

app.get('/api/employee_skills', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM employee_skills ORDER BY employee_name, skill_name');
        res.json(result.rows || []);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/employee_skills', async (req, res) => {
    try {
        const { employee_name, department, skill_name, skill_level, assessed_by } = req.body;
        await db.query(
            `INSERT INTO employee_skills (employee_name, department, skill_name, skill_level, assessed_by)
             VALUES ($1,$2,$3,$4,$5)
             ON CONFLICT (employee_name, skill_name) DO UPDATE SET skill_level=$4, assessed_by=$5, assessed_at=NOW()`,
            [employee_name, department, skill_name, skill_level || 0, assessed_by || 'system']
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/employee_skills/risk', async (req, res) => {
    try {
        // Find skills where fewer than 2 employees have level >= 2
        const result = await db.query(`
            SELECT skill_name, 
                   COUNT(*) FILTER (WHERE skill_level >= 2) as capable_count,
                   COUNT(*) FILTER (WHERE skill_level >= 3) as expert_count,
                   COUNT(*) as total_assessed,
                   ARRAY_AGG(employee_name) FILTER (WHERE skill_level >= 2) as capable_names
            FROM employee_skills
            GROUP BY skill_name
            ORDER BY capable_count ASC
        `);

        const risks = (result.rows || []).map(r => ({
            ...r,
            risk_level: r.capable_count <= 1 ? 'critical' : r.capable_count <= 2 ? 'high' : r.capable_count <= 3 ? 'medium' : 'low',
            recommendation: r.capable_count <= 1 
                ? `⚠️ วิกฤต! ทักษะ "${r.skill_name}" มีคนทำได้เพียง ${r.capable_count} คน — ต้องฝึกเพิ่มด่วน`
                : r.capable_count <= 2 
                ? `🟡 เสี่ยง: "${r.skill_name}" มีคนทำได้ ${r.capable_count} คน — ควรฝึกสำรอง`
                : `✅ ปลอดภัย: "${r.skill_name}" มี ${r.capable_count} คนที่ทำได้`
        }));

        res.json({
            skills: risks,
            summary: {
                critical: risks.filter(r => r.risk_level === 'critical').length,
                high: risks.filter(r => r.risk_level === 'high').length,
                medium: risks.filter(r => r.risk_level === 'medium').length,
                low: risks.filter(r => r.risk_level === 'low').length
            }
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
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
        const { machine, operator_name, job_ref, actual_run_min, downtime_min, downtime_reason, good_qty, defect_qty, notes } = req.body;
        
        // Ensure table exists with correct schema
        await db.query(`
            CREATE TABLE IF NOT EXISTS production_log_v2 (
                id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
                machine TEXT,
                operator_name TEXT,
                job_ref TEXT,
                actual_run_min INT DEFAULT 0,
                downtime_min INT DEFAULT 0,
                downtime_reason TEXT,
                good_qty INT DEFAULT 0,
                defect_qty INT DEFAULT 0,
                speed_per_hour INT DEFAULT 0,
                notes TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        
        const speed = (actual_run_min > 0 && good_qty > 0) ? Math.round((good_qty / actual_run_min) * 60) : 0;
        
        const result = await db.query(
            `INSERT INTO production_log_v2 (machine, operator_name, job_ref, actual_run_min, downtime_min, downtime_reason, good_qty, defect_qty, speed_per_hour, notes)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
            [machine || '', operator_name || '', job_ref || '', actual_run_min || 0, downtime_min || 0, downtime_reason || '', good_qty || 0, defect_qty || 0, speed, notes || '']
        );
        
        res.json({ success: true, data: result.rows[0] });
    } catch (e) {
        console.error('❌ production_log POST error:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// Get all production logs
app.get('/api/production_log', async (req, res) => {
    try {
        // Try v2 table first, fallback to v1
        let result;
        try {
            result = await db.query('SELECT * FROM production_log_v2 ORDER BY created_at DESC LIMIT 200');
        } catch (e) {
            // Fallback to old table
            result = await db.query('SELECT * FROM production_log ORDER BY created_at DESC LIMIT 200');
        }
        res.json(result.rows || []);
    } catch (e) {
        console.error('❌ production_log GET error:', e.message);
        res.json([]);
    }
});

// OEE summary dashboard
app.get('/api/production_log/summary', async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 7;
        const since = new Date();
        since.setDate(since.getDate() - days);

        let logs = [];
        try {
            const result = await db.query('SELECT * FROM production_log_v2 WHERE created_at >= $1', [since.toISOString()]);
            logs = result.rows || [];
        } catch (e) {
            try {
                const result = await db.query('SELECT * FROM production_log WHERE created_at >= $1', [since.toISOString()]);
                logs = result.rows || [];
            } catch (e2) { /* no data */ }
        }

        const totalGoodAll = logs.reduce((s, l) => s + (l.good_qty || 0), 0);
        const totalDefectAll = logs.reduce((s, l) => s + (l.defect_qty || 0), 0);
        const totalRunAll = logs.reduce((s, l) => s + (l.actual_run_min || 0), 0);
        const totalDownAll = logs.reduce((s, l) => s + (l.downtime_min || 0), 0);
        const totalPlannedAll = totalRunAll + totalDownAll;
        const overallAvail = totalPlannedAll > 0 ? ((totalPlannedAll - totalDownAll) / totalPlannedAll * 100) : 0;
        const overallQuality = (totalGoodAll + totalDefectAll) > 0 ? (totalGoodAll / (totalGoodAll + totalDefectAll) * 100) : 0;

        res.json({ 
            totalLogs: logs.length,
            overall: {
                availability: Math.round(overallAvail * 10) / 10,
                quality: Math.round(overallQuality * 10) / 10,
                oee: Math.round(overallAvail * overallQuality / 100 * 10) / 10,
                totalGood: totalGoodAll, totalDefect: totalDefectAll
            }
        });
    } catch (e) {
        console.error('OEE summary error:', e.message);
        res.json({ totalLogs: 0, overall: { availability: 0, quality: 0, oee: 0 } });
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

// ====== TEAM MEMBERS (LINE Registration) ======
app.get('/api/team-members', async (req, res) => {
    try {
        const db = require('./db');
        const result = await db.query(`SELECT * FROM team_members ORDER BY registered_at DESC`);
        res.json(result.rows || []);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ส่งข้อความ LINE ให้ user (ใช้ client ตัวเดียวกับ webhook)
app.post('/api/line-push', async (req, res) => {
    try {
        const { to, message } = req.body;
        if (!to || !message) return res.status(400).json({ error: 'Missing to or message' });
        await (agentLineClient || lineClient).pushMessage({ to, messages: [{ type: 'text', text: message }] });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
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

// Ensure employee table exists + migrate missing columns
(async () => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS employee (
                id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
                name TEXT NOT NULL,
                role TEXT,
                department TEXT,
                salary INT DEFAULT 0,
                cost_type TEXT DEFAULT 'cogs',
                status TEXT DEFAULT 'active',
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
            CREATE TABLE IF NOT EXISTS task_log (
                id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
                job_order_id BIGINT,
                employee_id BIGINT,
                task_name TEXT,
                stage TEXT,
                started_at TIMESTAMPTZ DEFAULT NOW(),
                duration_minutes INT DEFAULT 0
            );
        `);
        // Migrate: add missing columns to existing table
        const migrations = [
            'ALTER TABLE employee ADD COLUMN IF NOT EXISTS department TEXT',
            'ALTER TABLE employee ADD COLUMN IF NOT EXISTS salary INT DEFAULT 0',
            'ALTER TABLE employee ADD COLUMN IF NOT EXISTS cost_type TEXT DEFAULT \'cogs\'',
            'ALTER TABLE employee ADD COLUMN IF NOT EXISTS status TEXT DEFAULT \'active\'',
            'ALTER TABLE employee ADD COLUMN IF NOT EXISTS role TEXT',
        ];
        for (const m of migrations) {
            try { await db.query(m); } catch (e) { /* column may already exist */ }
        }
        console.log('✅ employee + task_log tables ready');
    } catch (e) { console.error('HR table error:', e.message); }
})();

app.get('/api/hr/employees', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM employee ORDER BY department, id');
        res.json(result.rows || []);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/hr/employees', async (req, res) => {
    const { name, role, department, salary, cost_type } = req.body;
    try {
        const result = await db.query(
            `INSERT INTO employee (name, role, department, salary, cost_type, status)
             VALUES ($1,$2,$3,$4,$5,'active') RETURNING id`,
            [name, role, department, salary || 0, cost_type || 'cogs']
        );
        res.json({ success: true, id: result.rows[0].id });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/hr/task_logs', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM task_log ORDER BY started_at DESC LIMIT 500');
        res.json(result.rows || []);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/hr/seed', async (req, res) => {
    try {
        // Check if already seeded
        const check = await db.query('SELECT COUNT(*) as cnt FROM employee');
        if (parseInt(check.rows[0].cnt) > 20) return res.json({ message: 'Already seeded!' });
        
        const employees = [
            // Pre-press (5)
            ['สมชาย เลย์เก่ง', 'คนเลย์งาน (Imposition)', 'pre_press', 20000, 'cogs'],
            ['นิดา ตรวจดี', 'ตรวจไฟล์ Preflight', 'pre_press', 18000, 'cogs'],
            ['วิชัย เช็คงาน', 'ตรวจไฟล์ Preflight', 'pre_press', 18000, 'cogs'],
            ['ประเสริฐ ทำเพลท', 'CTP Plate Maker', 'pre_press', 17000, 'cogs'],
            ['ศิลป์ ออกแบบ', 'Graphic Designer', 'pre_press', 23000, 'cogs'],
            // Print A2 (2)
            ['อนุชา เครื่อง A2', 'ช่างพิมพ์หลัก A2', 'print_a2', 27000, 'cogs'],
            ['มานพ ป้อนกระดาษ', 'ผู้ช่วยช่างพิมพ์ A2', 'print_a2', 19000, 'cogs'],
            // Print A1 (3)
            ['ธนกฤต เครื่อง A1', 'ช่างพิมพ์หลัก A1', 'print_a1', 25000, 'cogs'],
            ['สุรเดช ผู้ช่วย A1', 'ผู้ช่วยช่างพิมพ์ A1', 'print_a1', 18000, 'cogs'],
            ['เกียรติ ผู้ช่วย A1', 'ผู้ช่วยช่างพิมพ์ A1', 'print_a1', 18000, 'cogs'],
            // Post-press (10)
            ['วิโรจน์ ตัดหลัก', 'ตัดกระดาษ (หลัก)', 'post_press', 20000, 'cogs'],
            ['สมศักดิ์ จัดกอง', 'ตัดกระดาษ (ผู้ช่วย)', 'post_press', 13000, 'cogs'],
            ['อรทัย พับงาน', 'พับกระดาษ', 'post_press', 19000, 'cogs'],
            ['นภา เย็บมุง', 'เย็บเล่ม', 'post_press', 18000, 'cogs'],
            ['ชัยวัฒน์ ปั๊มฟอยล์', 'ปั๊มไดคัท/ฟอยล์', 'post_press', 20000, 'cogs'],
            ['อมรรัตน์ ปะกาว', 'ปั๊มปะกาว/ประกอบกล่อง', 'post_press', 18000, 'cogs'],
            ['สุดา หลังพิมพ์ 1', 'พนักงานหลังพิมพ์ทั่วไป', 'post_press', 15000, 'cogs'],
            ['จันทร์ หลังพิมพ์ 2', 'พนักงานหลังพิมพ์ทั่วไป', 'post_press', 15000, 'cogs'],
            ['แก้ว หลังพิมพ์ 3', 'พนักงานหลังพิมพ์ทั่วไป', 'post_press', 15000, 'cogs'],
            ['เพ็ญ หลังพิมพ์ 4', 'พนักงานหลังพิมพ์ทั่วไป', 'post_press', 15000, 'cogs'],
            // Shipping (5)
            ['สมาน สโตร์', 'สโตร์/คลังสินค้า', 'shipping', 12000, 'cogs'],
            ['พรพิมล ประสาน', 'ประสานงานจัดส่ง', 'shipping', 16000, 'cogs'],
            ['อดิศร ขับรถ 1', 'ขับรถส่งของ', 'shipping', 16000, 'cogs'],
            ['บุญมี ขับรถ 2', 'ขับรถส่งของ', 'shipping', 16000, 'cogs'],
            ['ดนัย แมสเซ็นเจอร์', 'แมสเซ็นเจอร์', 'shipping', 16000, 'cogs'],
            // Sales (5)
            ['ณัฐวุฒิ เซลส์ 1', 'พนักงานขาย', 'sales', 12000, 'sga'],
            ['ปิยะ เซลส์ 2', 'พนักงานขาย', 'sales', 12000, 'sga'],
            ['กมล เซลส์ 3', 'พนักงานขาย', 'sales', 12000, 'sga'],
            ['น้ำฝน เซลส์ 4', 'พนักงานขาย', 'sales', 12000, 'sga'],
            ['ธีรยุทธ เซลส์ 5', 'พนักงานขาย', 'sales', 12000, 'sga'],
            // Admin (3)
            ['จิราภา แอดมิน 1', 'แอดมิน', 'admin', 12000, 'sga'],
            ['กรกนก แอดมิน 2', 'แอดมิน', 'admin', 12000, 'sga'],
            ['ธนพล มาร์เก็ตติ้ง', 'การตลาด', 'admin', 25000, 'sga'],
            // Accounting (2)
            ['มาลิณี หัวหน้าบัญชี', 'หัวหน้าบัญชี', 'accounting', 30000, 'sga'],
            ['กนกวรรณ บุคลากร', 'HR/บุคลากร', 'accounting', 15000, 'sga'],
            // Management (4)
            ['วิศวะ ผู้จัดการ', 'ผู้จัดการโรงพิมพ์', 'management', 50000, 'sga'],
            ['อัญชลี ผู้ช่วย ผจก.', 'ผู้ช่วยผู้จัดการ', 'management', 35000, 'sga'],
            ['ประพันธ์ หัวหน้าผลิต', 'หัวหน้าฝ่ายผลิต', 'management', 35000, 'sga'],
            ['ลดาวัลย์ ประสานผลิต', 'ประสานงานผลิต', 'management', 13000, 'sga'],
        ];
        
        for (const [name, role, dept, salary, cost_type] of employees) {
            await db.query(
                'INSERT INTO employee (name, role, department, salary, cost_type, status) VALUES ($1,$2,$3,$4,$5,$6)',
                [name, role, dept, salary, cost_type, 'active']
            );
        }
        
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

// ═══════════════════════════════════════════════════
// 🖨️ PRINT PRICING CALCULATOR ENGINE
// ═══════════════════════════════════════════════════

// --- Cost Config CRUD ---
app.get('/api/pricing/costs', async (req, res) => {
  try {
    const { data } = await supabase.from('cost_config').select('*').order('category,name');
    res.json(data || []);
  } catch(e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/pricing/costs', async (req, res) => {
  try {
    const { data, error } = await supabase.from('cost_config').insert([req.body]).select().single();
    if(error) throw error;
    res.json(data);
  } catch(e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/pricing/costs/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('cost_config').update({...req.body, updated_at: new Date().toISOString()}).eq('id',req.params.id).select().single();
    if(error) throw error;
    res.json(data);
  } catch(e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/pricing/costs/:id', async (req, res) => {
  try {
    await supabase.from('cost_config').delete().eq('id',req.params.id);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// --- Paper Catalog CRUD ---
app.get('/api/pricing/papers', async (req, res) => {
  try {
    const { data } = await supabase.from('paper_catalog').select('*').order('name,gsm');
    res.json(data || []);
  } catch(e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/pricing/papers', async (req, res) => {
  try {
    const { data, error } = await supabase.from('paper_catalog').insert([req.body]).select().single();
    if(error) throw error;
    res.json(data);
  } catch(e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/pricing/papers/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('paper_catalog').update({...req.body, updated_at: new Date().toISOString()}).eq('id',req.params.id).select().single();
    if(error) throw error;
    res.json(data);
  } catch(e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/pricing/papers/:id', async (req, res) => {
  try {
    await supabase.from('paper_catalog').delete().eq('id',req.params.id);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// --- Machine Rates CRUD ---
app.get('/api/pricing/machines', async (req, res) => {
  try {
    const { data } = await supabase.from('machine_rates').select('*').order('machine_name');
    res.json(data || []);
  } catch(e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/pricing/machines', async (req, res) => {
  try {
    const { data, error } = await supabase.from('machine_rates').insert([req.body]).select().single();
    if(error) throw error;
    res.json(data);
  } catch(e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/pricing/machines/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('machine_rates').update(req.body).eq('id',req.params.id).select().single();
    if(error) throw error;
    res.json(data);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// --- Finishing Rates CRUD ---
app.get('/api/pricing/finishing', async (req, res) => {
  try {
    const { data } = await supabase.from('finishing_rates').select('*').order('type,name');
    res.json(data || []);
  } catch(e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/pricing/finishing', async (req, res) => {
  try {
    const { data, error } = await supabase.from('finishing_rates').insert([req.body]).select().single();
    if(error) throw error;
    res.json(data);
  } catch(e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/pricing/finishing/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('finishing_rates').update(req.body).eq('id',req.params.id).select().single();
    if(error) throw error;
    res.json(data);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ★★★ ESTIMATE ENGINE — คำนวณต้นทุนงานพิมพ์ ★★★
let pricingCache = { data: null, timestamp: 0 };
const getPricingCache = async () => {
  const now = Date.now();
  if (pricingCache.data && now - pricingCache.timestamp < 60000) return pricingCache.data; // 1 minute cache
  const [pRes, mRes, fRes, cRes] = await Promise.all([
    supabase.from('paper_catalog').select('*'),
    supabase.from('machine_rates').select('*'),
    supabase.from('finishing_rates').select('*'),
    supabase.from('cost_config').select('*')
  ]);
  pricingCache.data = { papers: pRes.data || [], machines: mRes.data || [], finishingRates: fRes.data || [], configs: cRes.data || [] };
  pricingCache.timestamp = now;
  return pricingCache.data;
};

app.post('/api/pricing/estimate', async (req, res) => {
  try {
    const { 
      quantity, productType, size, paperName, paperGsm,
      colors = 4, sides = 2, machineId,
      finishing = [], margin = 30, notes
    } = req.body;

    const cache = await getPricingCache();

    // 1. Fetch paper price
    const paper = cache.papers.find(p => p.name === paperName && (!paperGsm || p.gsm == paperGsm));
    if (!paper) return res.status(400).json({ error: `ไม่พบกระดาษ "${paperName} ${paperGsm}gsm" ในระบบ` });

    // 2. Fetch machine rate
    let machine;
    if (machineId) {
      machine = cache.machines.find(m => m.id == machineId);
    } else {
      // Auto-select best machine based on sheet size (just pick the first offset one sorted by rate)
      const offsets = cache.machines.filter(m => m.type === 'offset').sort((a,b) => a.hourly_rate - b.hourly_rate);
      machine = offsets[0];
    }
    if (!machine) return res.status(400).json({ error: 'ไม่พบข้อมูลเครื่องจักร' });

    // 3. Fetch finishing rates
    let finishingCosts = [];
    if (finishing.length > 0) {
      finishingCosts = cache.finishingRates.filter(f => finishing.includes(f.name));
    }

    // 4. Fetch cost config
    const configs = cache.configs;
    const getConfig = (cat, name) => configs?.find(c => c.category === cat && c.name === name)?.cost_per_unit || 0;
    const getConfigLike = (cat, partial) => configs?.find(c => c.category === cat && c.name.includes(partial))?.cost_per_unit || 0;

    // === CALCULATE ===
    // Determine machine type (SM74=ตัด3 or SM102=ตัด2)
    const isSM102 = machine.machine_name.includes('102') || machine.machine_name.includes('ตัด2');
    const machineCut = isSM102 ? 'ตัด2' : 'ตัด3';

    // Imposition: how many pieces per sheet
    const sizeMap = {
      'A4': { w: 21, h: 29.7 }, 'A5': { w: 14.8, h: 21 }, 'A6': { w: 10.5, h: 14.8 },
      'A3': { w: 29.7, h: 42 }, 'B5': { w: 17.6, h: 25 }, 'B4': { w: 25, h: 35.3 },
      'นามบัตร': { w: 9, h: 5.5 }, 'โปสการ์ด': { w: 14.8, h: 10.5 },
      'DL': { w: 21, h: 9.9 }
    };
    const sheetCm = { w: parseFloat(paper.sheet_width || 79), h: parseFloat(paper.sheet_height || 109) };
    const itemSize = sizeMap[size] || { w: 21, h: 29.7 };
    const itemW = itemSize.w + 0.6; // bleed
    const itemH = itemSize.h + 0.6;
    const imp1 = Math.floor(sheetCm.w / itemW) * Math.floor(sheetCm.h / itemH);
    const imp2 = Math.floor(sheetCm.w / itemH) * Math.floor(sheetCm.h / itemW);
    const imposition = Math.max(imp1, imp2, 1);

    // Gang Run: how many jobs share one plate set
    const isGangRun = req.body.gangRun !== false; // default true
    const gangRunJobs = isGangRun ? (sides === 2 ? 4 : 8) : 1; // A4: 8 jobs 1-side, 4 jobs 2-side

    // Sheets needed for THIS job's quantity
    const sheetsPerSide = Math.ceil(quantity / imposition);
    const wastePercent = quantity < 1000 ? 0.08 : quantity < 5000 ? 0.05 : 0.03;
    const totalSheets = Math.ceil(sheetsPerSide * (1 + wastePercent));

    // ═══ PLATE COST (shared via Gang Run) ═══
    const plateCostEach = isSM102 
      ? (getConfig('plate', 'CTP SM102 (ตัด2)') || 150)
      : (getConfig('plate', 'CTP SM74 (ตัด3)') || 63);
    const platesPerSide = colors; // 4 สี = 4 เพลท
    const totalPlates = platesPerSide * sides;
    const plateCostFull = totalPlates * plateCostEach;
    const plateCostPerJob = Math.round(plateCostFull / gangRunJobs); // แบ่งตาม Gang Run

    // ═══ PRINTING COST (ขั้นต่ำ + หมื่นละ) ═══
    const printMinimum = isSM102
      ? (getConfig('print', 'ค่าพิมพ์ขั้นต่ำ SM102') || 3000)
      : (getConfig('print', 'ค่าพิมพ์ขั้นต่ำ SM74') || 2000);
    const printPer10k = isSM102
      ? (getConfig('print', 'ค่าพิมพ์ SM102 /หมื่น') || 4500)
      : (getConfig('print', 'ค่าพิมพ์ SM74 /หมื่น') || 3500);
    
    const totalImpressions = sides === 2 ? totalSheets * 2 : totalSheets;
    const printCostRaw = Math.max(printMinimum, Math.ceil(totalImpressions / 10000) * printPer10k);
    const printCostPerJob = Math.round(printCostRaw / gangRunJobs); // แบ่งตาม Gang Run

    // ═══ PAPER COST ═══
    const setupWasteSheets = Math.round((machine.setup_waste || 200) / gangRunJobs);
    const paperCostProduction = totalSheets * (paper.price_per_sheet || 0);
    const paperCostWaste = setupWasteSheets * (paper.price_per_sheet || 0);
    const paperCostTotal = paperCostProduction + paperCostWaste;

    // ═══ INK COST (ประมาณ) ═══
    // หมึก 1 กระป๋อง ~1กก. พิมพ์ได้ ~15,000 แผ่น/สี
    const inkCostPerCan = getConfig('ink', 'หมึก') || 200;
    const sheetsPerCan = 15000;
    const inkCost = Math.round((totalImpressions * colors / sheetsPerCan) * inkCostPerCan / gangRunJobs);

    // ═══ FINISHING ═══
    let totalFinishing = 0;
    const finBreakdown = [];
    for (const fr of finishingCosts) {
      const cost = (fr.fixed_cost || 0) + (fr.variable_cost || 0) * quantity;
      totalFinishing += cost;
      finBreakdown.push({ name: fr.name, fixed: fr.fixed_cost, variable: fr.variable_cost, total: Math.round(cost * 100) / 100 });
    }

    // ═══ TOTALS ═══
    const fixedTotal = plateCostPerJob + printCostPerJob;
    const variableTotal = paperCostTotal + inkCost;
    const totalCost = fixedTotal + variableTotal + totalFinishing;
    const costPerUnit = totalCost / quantity;

    // 🌟 Tiered Margin Logic (กำไรแบบขั้นบันได)
    // If not specifically overridden by an admin request, apply smart margins
    let appliedMargin = req.body.margin || 30; 
    if (!req.body.margin_override) {
        if (quantity <= 500) appliedMargin = 55;        // วอลลุ่มน้อย กำไรสูงเพื่อคุ้มค่าดำเนินการ
        else if (quantity <= 1000) appliedMargin = 45;
        else if (quantity <= 3000) appliedMargin = 35;
        else if (quantity <= 5000) appliedMargin = 25;
        else if (quantity <= 10000) appliedMargin = 20;
        else appliedMargin = 15;                        // วอลลุ่มมาก กำไรบางเพื่อสู้ราคาตลาด
    }

    const marginDecimal = appliedMargin / 100;
    const sellingPrice = totalCost * (1 + marginDecimal);
    const pricePerUnit = sellingPrice / quantity;

    const result = {
      quantity,
      imposition,
      gangRun: isGangRun,
      gangRunJobs,
      sheetsNeeded: totalSheets,
      totalImpressions,
      machineCut,
      breakdown: {
        fixed: {
          plate: { qty: totalPlates, unitCost: plateCostEach, fullCost: plateCostFull, gangRunShare: `÷${gangRunJobs}`, total: plateCostPerJob },
          printing: { minimum: printMinimum, per10k: printPer10k, impressions: totalImpressions, fullCost: printCostRaw, gangRunShare: `÷${gangRunJobs}`, total: printCostPerJob }
        },
        variable: {
          paper: { sheets: totalSheets, pricePerSheet: paper.price_per_sheet, total: Math.round(paperCostProduction) },
          setupWaste: { sheets: setupWasteSheets, total: Math.round(paperCostWaste) },
          ink: { total: inkCost }
        },
        finishing: finBreakdown
      },
      fixedTotal: Math.round(fixedTotal),
      variableTotal: Math.round(variableTotal),
      finishingTotal: Math.round(totalFinishing),
      totalCost: Math.round(totalCost * 100) / 100,
      costPerUnit: Math.round(costPerUnit * 100) / 100,
      margin: appliedMargin,
      sellingPrice: Math.round(sellingPrice),
      pricePerUnit: Math.round(pricePerUnit * 100) / 100,
      machine: machine.machine_name,
      paper: `${paper.name} ${paper.gsm}gsm`
    };

    // Save estimate
    await supabase.from('job_estimates').insert([{
      product_type: productType || 'flyer',
      specs: { quantity, size, paper: `${paperName} ${paperGsm}gsm`, colors, sides, finishing },
      cost_breakdown: result.breakdown,
      total_cost: result.totalCost,
      margin_percent: appliedMargin,
      selling_price: result.sellingPrice,
      created_at: new Date().toISOString()
    }]);

    res.json(result);
  } catch(e) {
    console.error('Estimate error:', e);
    res.status(500).json({ error: e.message });
  }
});

// GET estimate history
app.get('/api/pricing/estimates', async (req, res) => {
  try {
    const { data } = await supabase.from('job_estimates').select('*').order('created_at', { ascending: false }).limit(100);
    res.json(data || []);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ★ Price Matrix — Generate for storefront
app.post('/api/pricing/generate-matrix', async (req, res) => {
  try {
    const { productId, specs, quantities, deliveryDays, margin } = req.body;
    // specs = { size, paperName, paperGsm, colors, sides, finishing }
    // quantities = [100, 200, 500, 1000, 2000, 5000]
    // deliveryDays = [3, 5, 7]
    // margin = { 3: 50, 5: 35, 7: 25 }

    const results = [];
    const specKey = `${specs.size}|${specs.paperName}${specs.paperGsm}|${specs.colors}c${specs.sides}s|${(specs.finishing||[]).join('+')}`;

    for (const qty of quantities) {
      for (const days of deliveryDays) {
        const marginPct = margin[days] || 30;
        // Calculate cost using the engine inline
        const estimateReq = { body: { ...specs, quantity: qty, margin: marginPct } };
        const estimateRes = { json: (d) => d, status: () => ({ json: (d) => d }) };
        
        // Simplified inline calculation for matrix generation
        const rushMultiplier = days <= 3 ? 1.3 : days <= 5 ? 1.0 : 0.9;
        
        // Fetch base cost via internal call
        const response = await new Promise((resolve) => {
          const mockRes = { json: resolve, status: () => ({ json: resolve }) };
          // We reuse estimate logic but just grab result
        });

        results.push({
          product_id: productId,
          spec_key: specKey,
          quantity: qty,
          delivery_days: days,
          margin_percent: marginPct,
          rush_multiplier: rushMultiplier
        });
      }
    }

    res.json({ 
      message: `Matrix template generated for ${quantities.length * deliveryDays.length} price points`,
      specKey,
      results
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// --- Store Price Matrix CRUD (for storefront display) ---
app.get('/api/pricing/matrix', async (req, res) => {
  try {
    const { product_id, spec_key } = req.query;
    let q = supabase.from('price_matrix').select('*');
    if (product_id) q = q.eq('product_id', parseInt(product_id));
    if (spec_key) q = q.eq('spec_key', spec_key);
    const { data } = await q.order('quantity,delivery_days');
    res.json(data || []);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/pricing/matrix', async (req, res) => {
  try {
    const rows = Array.isArray(req.body) ? req.body : [req.body];
    const { data, error } = await supabase.from('price_matrix').upsert(rows, { onConflict: 'product_id,spec_key,quantity,delivery_days' }).select();
    if(error) throw error;
    res.json(data);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// AI AGENT ENDPOINTS
// ============================================================

// HTTP API — ถามจาก Hub Dashboard หรือจากที่ใดก็ได้
app.post('/api/ai/query', async (req, res) => {
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: 'กรุณาใส่คำถาม' });
    
    try {
        console.log(`🤖 [AI Agent] Question: ${question}`);
        const answer = await processAgentQuery(supabase, question, AI_API_KEY, AI_MODEL);
        console.log(`🤖 [AI Agent] Answered (${answer.length} chars)`);
        res.json({ question, answer, timestamp: new Date().toISOString() });
    } catch (e) {
        console.error('AI Agent error:', e);
        res.status(500).json({ error: e.message });
    }
});

// AI Agent via LINE — ส่งข้อความจาก LINE Group ที่กำหนด
// หรือข้อความที่ขึ้นต้นด้วย prefix เช่น "ถาม", "@ai"
app.post('/api/ai/line-hook', async (req, res) => {
    // This is called internally from the main webhook
    res.status(200).send('OK');
});

// Health check for AI Agent
app.get('/api/ai/status', (req, res) => {
    res.json({
        status: 'active',
        hasApiKey: !!AI_API_KEY,
        apiKeyPrefix: AI_API_KEY ? AI_API_KEY.substring(0, 8) + '...' : 'NONE',
        model: AI_MODEL,
        agentGroupId: AI_AGENT_GROUP_ID || 'not configured',
        triggers: AI_TRIGGER_PREFIXES,
        agentClientReady: !!agentLineClient,
        hasAgentToken: !!AGENT_CHANNEL_TOKEN,
        mainClientReady: !!lineClient,
        deployVersion: '2026-05-11-v5-P1-agent-overhaul',
        envKeys: Object.keys(process.env).filter(k => k.includes('CHANNEL') || k.includes('AI_') || k.includes('SUPA'))
    });
});

// ====== TIME LOGGER APIs ======
app.get('/api/timelog/active', async (req, res) => {
    try {
        const userName = req.query.user || 'คุณณัฐวุฒิ'; // Default to CEO for testing
        const { data, error } = await supabase
            .from('time_logs')
            .select('*')
            .eq('user_name', userName)
            .neq('status', 'completed')
            .order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/timelog/start', async (req, res) => {
    try {
        const { user_name, task_name, category } = req.body;
        const { data, error } = await supabase
            .from('time_logs')
            .insert([{ user_name, task_name, category, status: 'running', start_time: new Date().toISOString(), duration_seconds: 0 }])
            .select('*')
            .single();
        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/timelog/pause', async (req, res) => {
    try {
        const { id } = req.body;
        const { data: current } = await supabase.from('time_logs').select('*').eq('id', id).single();
        if (!current) return res.status(404).json({ error: 'Not found' });
        
        let additionalSeconds = 0;
        if (current.status === 'running' && current.start_time) {
            additionalSeconds = Math.floor((new Date() - new Date(current.start_time)) / 1000);
        }
        const newDuration = (current.duration_seconds || 0) + additionalSeconds;

        const { data, error } = await supabase
            .from('time_logs')
            .update({ status: 'paused', duration_seconds: newDuration, start_time: null })
            .eq('id', id)
            .select('*')
            .single();
        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/timelog/resume', async (req, res) => {
    try {
        const { id } = req.body;
        const { data, error } = await supabase
            .from('time_logs')
            .update({ status: 'running', start_time: new Date().toISOString() })
            .eq('id', id)
            .select('*')
            .single();
        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/timelog/finish', async (req, res) => {
    try {
        const { id, quantity, completion_percent, notes } = req.body;
        const { data: current } = await supabase.from('time_logs').select('*').eq('id', id).single();
        if (!current) return res.status(404).json({ error: 'Not found' });
        
        let additionalSeconds = 0;
        if (current.status === 'running' && current.start_time) {
            additionalSeconds = Math.floor((new Date() - new Date(current.start_time)) / 1000);
        }
        const newDuration = (current.duration_seconds || 0) + additionalSeconds;

        const { data, error } = await supabase
            .from('time_logs')
            .update({ 
                status: 'completed', 
                duration_seconds: newDuration, 
                end_time: new Date().toISOString(),
                start_time: null,
                quantity, 
                completion_percent, 
                notes 
            })
            .eq('id', id)
            .select('*')
            .single();
        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/timelog/history', async (req, res) => {
    try {
        const userName = req.query.user || 'คุณณัฐวุฒิ';
        const { data, error } = await supabase
            .from('time_logs')
            .select('*')
            .eq('user_name', userName)
            .eq('status', 'completed')
            .order('end_time', { ascending: false })
            .limit(50);
        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/timelog/suggest', async (req, res) => {
    try {
        const q = req.query.q || '';
        const { data, error } = await supabase
            .from('time_logs')
            .select('task_name')
            .ilike('task_name', `%${q}%`)
            .limit(100);
        if (error) throw error;
        
        const uniqueNames = [...new Set((data || []).map(d => d.task_name))].slice(0, 5);
        res.json(uniqueNames);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ══════════════════════════════════════════════════════════════
// 🏭 SMART FACTORY — APS / Capacity Planning / OEE APIs
// ══════════════════════════════════════════════════════════════

// --- Work Centers CRUD ---
app.get('/api/factory/work-centers', async (req, res) => {
    try {
        const { data, error } = await supabase.from('work_centers').select('*').order('created_at', { ascending: true });
        if (error) throw error;
        res.json(data || []);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/factory/work-centers', async (req, res) => {
    try {
        const { name, type, capacity_per_hour, shift_hours, notes } = req.body;
        const { data, error } = await supabase.from('work_centers').insert([{ name, type: type || 'general', capacity_per_hour: capacity_per_hour || 0, shift_hours: shift_hours || 8, notes }]).select('*');
        if (error) throw error;
        res.json(data[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/factory/work-centers/:id', async (req, res) => {
    try {
        const { data, error } = await supabase.from('work_centers').update(req.body).eq('id', req.params.id).select('*');
        if (error) throw error;
        res.json(data[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/factory/work-centers/:id', async (req, res) => {
    try {
        await supabase.from('work_centers').delete().eq('id', req.params.id);
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Production Schedule CRUD ---
app.get('/api/factory/schedule', async (req, res) => {
    try {
        const { data, error } = await supabase.from('production_schedule').select('*').order('scheduled_start', { ascending: true });
        if (error) throw error;
        res.json(data || []);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/factory/schedule', async (req, res) => {
    try {
        const row = req.body;
        // Finite capacity check
        if (row.work_center_id && row.scheduled_start) {
            const schedDate = new Date(row.scheduled_start).toISOString().slice(0, 10);
            const db = require('./db');
            const existing = await db.query(
                `SELECT COALESCE(SUM(estimated_duration_min), 0) as booked FROM production_schedule WHERE work_center_id = $1 AND DATE(scheduled_start) = $2 AND status NOT IN ('completed', 'cancelled')`,
                [row.work_center_id, schedDate]
            );
            const wcRes = await db.query(`SELECT shift_hours FROM work_centers WHERE id = $1`, [row.work_center_id]);
            const shiftMin = (wcRes.rows[0]?.shift_hours || 8) * 60;
            const bookedMin = existing.rows[0]?.booked || 0;
            const estMin = row.estimated_duration_min || 60;
            if (bookedMin + estMin > shiftMin && !row.is_urgent) {
                return res.status(409).json({ error: 'CAPACITY_FULL', message: `กำลังผลิตเต็มแล้ว (${Math.round(bookedMin)}/${shiftMin} นาที) กรุณาเลือกวันอื่นหรือขอแทรกด่วน`, booked: bookedMin, capacity: shiftMin });
            }
        }
        const { data, error } = await supabase.from('production_schedule').insert([row]).select('*');
        if (error) throw error;
        res.json(data[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/factory/schedule/:id', async (req, res) => {
    try {
        const { data, error } = await supabase.from('production_schedule').update(req.body).eq('id', req.params.id).select('*');
        if (error) throw error;
        res.json(data[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/factory/schedule/:id', async (req, res) => {
    try {
        await supabase.from('production_schedule').delete().eq('id', req.params.id);
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 📱 QR Code for Job Tickets — สร้าง QR สำหรับแสกนเริ่มงาน
app.get('/api/factory/schedule/:id/qr', async (req, res) => {
    try {
        const { data, error } = await supabase.from('production_schedule').select('*').eq('id', req.params.id).single();
        if (error) throw error;
        const qrData = JSON.stringify({ type:'JOB', id: data.id, name: data.job_name, qty: data.quantity });
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;
        res.json({ job: data, qr_url: qrUrl, qr_data: qrData });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Capacity Check (for Sales to see availability) ---
app.get('/api/factory/capacity', async (req, res) => {
    try {
        const { date, work_center_id } = req.query;
        const targetDate = date || new Date().toISOString().slice(0, 10);
        const db = require('./db');
        let sql = `SELECT wc.id, wc.name, wc.type, wc.shift_hours, wc.status, COALESCE(SUM(ps.estimated_duration_min), 0) as booked_min, (wc.shift_hours * 60) as capacity_min FROM work_centers wc LEFT JOIN production_schedule ps ON ps.work_center_id = wc.id AND DATE(ps.scheduled_start) = $1 AND ps.status NOT IN ('completed', 'cancelled') WHERE wc.status = 'active'`;
        const params = [targetDate];
        if (work_center_id) { sql += ` AND wc.id = $2`; params.push(work_center_id); }
        sql += ` GROUP BY wc.id ORDER BY wc.name`;
        const result = await db.query(sql, params);
        const rows = result.rows.map(r => ({ ...r, utilization_pct: r.capacity_min > 0 ? Math.round((r.booked_min / r.capacity_min) * 100) : 0, available_min: r.capacity_min - r.booked_min }));
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- 7-Day Capacity Heatmap ---
app.get('/api/factory/capacity-week', async (req, res) => {
    try {
        const db = require('./db');
        const startDate = req.query.start || new Date().toISOString().slice(0, 10);
        const result = await db.query(`
            SELECT wc.id, wc.name, wc.type, wc.shift_hours,
                d.dt::date as calendar_date,
                COALESCE(SUM(ps.estimated_duration_min), 0) as booked_min,
                (wc.shift_hours * 60) as capacity_min
            FROM work_centers wc
            CROSS JOIN generate_series($1::date, ($1::date + interval '6 days'), interval '1 day') as d(dt)
            LEFT JOIN production_schedule ps ON ps.work_center_id = wc.id AND DATE(ps.scheduled_start) = d.dt::date AND ps.status NOT IN ('completed', 'cancelled')
            WHERE wc.status = 'active'
            GROUP BY wc.id, wc.name, wc.type, wc.shift_hours, d.dt
            ORDER BY wc.name, d.dt
        `, [startDate]);
        res.json(result.rows.map(r => ({ ...r, utilization_pct: r.capacity_min > 0 ? Math.round((r.booked_min / r.capacity_min) * 100) : 0 })));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- OEE Records ---
app.get('/api/factory/oee', async (req, res) => {
    try {
        const { data, error } = await supabase.from('oee_records').select('*').order('record_date', { ascending: false }).limit(50);
        if (error) throw error;
        res.json(data || []);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/factory/oee', async (req, res) => {
    try {
        const row = req.body;
        const avail = row.planned_time_min > 0 ? ((row.planned_time_min - (row.downtime_min || 0)) / row.planned_time_min) * 100 : 0;
        const perf = (row.actual_run_time_min > 0 && row.ideal_cycle_time > 0) ? ((row.ideal_cycle_time * row.total_produced) / row.actual_run_time_min) * 100 : 0;
        const qual = row.total_produced > 0 ? ((row.good_produced || 0) / row.total_produced) * 100 : 0;
        const oee = (avail * perf * qual) / 10000;
        row.availability = Math.round(avail * 10) / 10;
        row.performance = Math.round(perf * 10) / 10;
        row.quality = Math.round(qual * 10) / 10;
        row.oee = Math.round(oee * 10) / 10;
        const { data, error } = await supabase.from('oee_records').insert([row]).select('*');
        if (error) throw error;
        res.json(data[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Changeover / SMED Log ---
app.get('/api/factory/changeover', async (req, res) => {
    try {
        const { data, error } = await supabase.from('changeover_log').select('*').order('created_at', { ascending: false }).limit(50);
        if (error) throw error;
        res.json(data || []);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/factory/changeover', async (req, res) => {
    try {
        const { data, error } = await supabase.from('changeover_log').insert([req.body]).select('*');
        if (error) throw error;
        res.json(data[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Factory Dashboard Stats ---
app.get('/api/factory/stats', async (req, res) => {
    try {
        const db = require('./db');
        const today = new Date().toISOString().slice(0, 10);
        const [wcCount, todayJobs, urgentJobs, completedToday] = await Promise.all([
            db.query(`SELECT COUNT(*) as count FROM work_centers WHERE status = 'active'`),
            db.query(`SELECT COUNT(*) as count FROM production_schedule WHERE DATE(scheduled_start) = $1 AND status NOT IN ('completed', 'cancelled')`, [today]),
            db.query(`SELECT COUNT(*) as count FROM production_schedule WHERE is_urgent = true AND status NOT IN ('completed', 'cancelled')`),
            db.query(`SELECT COUNT(*) as count FROM production_schedule WHERE DATE(actual_end) = $1 AND status = 'completed'`, [today])
        ]);
        res.json({
            work_centers: parseInt(wcCount.rows[0].count),
            today_jobs: parseInt(todayJobs.rows[0].count),
            urgent_jobs: parseInt(urgentJobs.rows[0].count),
            completed_today: parseInt(completedToday.rows[0].count)
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 📊 Worker Productivity — ผลงานรายคนวันนี้
app.get('/api/factory/productivity', async (req, res) => {
    try {
        const db = require('./db');
        const workers = await db.query(`
            SELECT user_name, 
                   COUNT(*) as total_tasks,
                   COUNT(CASE WHEN status = 'finished' THEN 1 END) as finished,
                   COUNT(CASE WHEN status = 'running' THEN 1 END) as running,
                   COALESCE(SUM(CASE WHEN status = 'finished' THEN duration_seconds END), 0) as total_seconds,
                   COALESCE(SUM(quantity), 0) as total_quantity
            FROM time_log 
            WHERE DATE(start_time) = CURRENT_DATE
            GROUP BY user_name ORDER BY total_seconds DESC
        `);
        res.json(workers.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 📋 Daily Report
app.get('/api/factory/daily-report', async (req, res) => {
    try {
        const db = require('./db');
        const [prodJobs, timeLog, machines] = await Promise.all([
            db.query(`SELECT status, COUNT(*) as c, COALESCE(SUM(quantity),0) as qty FROM production_schedule WHERE DATE(scheduled_start) = CURRENT_DATE OR status = 'in_progress' GROUP BY status`),
            db.query(`SELECT user_name, COUNT(*) as tasks, COALESCE(SUM(duration_seconds),0) as secs FROM time_log WHERE DATE(start_time) = CURRENT_DATE AND status = 'finished' GROUP BY user_name ORDER BY secs DESC`),
            db.query(`SELECT COUNT(*) as c FROM work_centers WHERE status = 'active'`),
        ]);
        res.json({ production: prodJobs.rows, workers: timeLog.rows, machine_count: parseInt(machines.rows[0].c) });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════
// 🧠 NEXUS → ZERO RELAY — Push messages to LINE via API
// ══════════════════════════════════════════════════════════════
app.post('/api/nexus/push', async (req, res) => {
    try {
        const { targetId, message } = req.body;
        if (!targetId || !message) return res.status(400).json({ error: 'targetId and message required' });
        const client = agentLineClient || lineClient;
        await client.pushMessage({ to: targetId, messages: [{ type: 'text', text: message }] });
        res.json({ success: true, sentTo: targetId });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/debug-reports', async (req, res) => {
    try {
        const db = require('./db');
        const result = await db.query('SELECT * FROM agent_reports ORDER BY created_at DESC LIMIT 5');
        res.json(result.rows);
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
    console.log(`[AI Worker] Background pipeline monitor active (every 30min)`);
});

// ══════════════════════════════════════════════════════════════
// ⏰ Daily Production Summary — ส่งสรุปทุกวัน 17:00 เวลาไทย
// ══════════════════════════════════════════════════════════════
const TEAM_GROUP_ID = 'C3ce2c0a20dd4c74fb559cd2f42bc54e0';

async function sendDailySummary() {
    try {
        const db = require('./db');
        const [queued, inProg, done, timeWorkers] = await Promise.all([
            db.query(`SELECT COUNT(*) as c, COALESCE(SUM(quantity),0) as qty FROM production_schedule WHERE status = 'queued'`),
            db.query(`SELECT COUNT(*) as c FROM production_schedule WHERE status = 'in_progress'`),
            db.query(`SELECT COUNT(*) as c, COALESCE(SUM(quantity),0) as qty FROM production_schedule WHERE status = 'completed' AND DATE(actual_end) = CURRENT_DATE`),
            db.query(`SELECT user_name, COUNT(*) as tasks, COALESCE(SUM(duration_seconds),0) as secs FROM time_log WHERE DATE(start_time) = CURRENT_DATE AND status = 'finished' GROUP BY user_name ORDER BY secs DESC LIMIT 5`),
        ]);
        
        let msg = `📊 สรุปผลิตประจำวัน\n${new Date().toLocaleDateString('th-TH', { dateStyle: 'full' })}\n\n`;
        msg += `📥 รอผลิต: ${queued.rows[0].c} งาน (${parseInt(queued.rows[0].qty).toLocaleString()} ชิ้น)\n`;
        msg += `⚙️ กำลังผลิต: ${inProg.rows[0].c} งาน\n`;
        msg += `✅ เสร็จวันนี้: ${done.rows[0].c} งาน (${parseInt(done.rows[0].qty).toLocaleString()} ชิ้น)\n`;
        
        if (timeWorkers.rows.length > 0) {
            msg += `\n👷 Top ผลงาน:\n`;
            timeWorkers.rows.forEach((w, i) => {
                const h = Math.floor(w.secs / 3600), m = Math.floor((w.secs % 3600) / 60);
                msg += `${['🥇','🥈','🥉','4️⃣','5️⃣'][i]} ${w.user_name} — ${w.tasks} งาน (${h > 0 ? `${h}ชม.${m}นาที` : `${m}นาที`})\n`;
            });
        }
        msg += `\n— Zero 🤖 Auto Report`;
        
        const client = agentLineClient || lineClient;
        if (client) {
            await client.pushMessage({ to: TEAM_GROUP_ID, messages: [{ type: 'text', text: msg }] });
            console.log('📊 [Daily Summary] Sent to group');
        }
    } catch(e) { console.error('❌ [Daily Summary]', e.message); }
}

// Check every minute, send at 17:00 Thai time (UTC+7)
let lastSummaryDate = '';
setInterval(() => {
    const now = new Date();
    const thaiHour = (now.getUTCHours() + 7) % 24;
    const today = now.toISOString().slice(0, 10);
    if (thaiHour === 17 && now.getMinutes() === 0 && lastSummaryDate !== today) {
        lastSummaryDate = today;
        sendDailySummary();
    }
}, 60000);

// Manual trigger
app.post('/api/factory/send-summary', async (req, res) => {
    await sendDailySummary();
    res.json({ success: true, sent: true });
});

// ====== PRODUCTION SCHEDULE API ======

// Ensure table exists
(async () => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS production_schedule (
                id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
                job_ref TEXT NOT NULL,
                job_name TEXT,
                quantity INT DEFAULT 0,
                start_date DATE,
                end_date DATE,
                steps JSONB DEFAULT '[]',
                status TEXT DEFAULT 'planned',
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        console.log('✅ production_schedule table ready');
    } catch (e) { console.error('Schedule table error:', e.message); }
})();

// GET all schedules
app.get('/api/production/schedule', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM production_schedule ORDER BY start_date ASC, created_at DESC LIMIT 100');
        res.json(result.rows || []);
    } catch (e) {
        console.error('Schedule GET error:', e.message);
        res.json([]);
    }
});

// POST new schedule
app.post('/api/production/schedule', async (req, res) => {
    try {
        const { job_ref, job_name, quantity, start_date, end_date, steps, status } = req.body;
        const result = await db.query(
            `INSERT INTO production_schedule (job_ref, job_name, quantity, start_date, end_date, steps, status)
             VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
            [job_ref || '', job_name || '', quantity || 0, start_date, end_date, JSON.stringify(steps || []), status || 'planned']
        );
        res.json({ success: true, data: result.rows[0] });
    } catch (e) {
        console.error('Schedule POST error:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// DELETE schedule
app.delete('/api/production/schedule/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM production_schedule WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (e) {
        console.error('Schedule DELETE error:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// ====== SPA CATCH-ALL (Next.js Static Export) ======
// Any non-API route → serve the matching static HTML or fallback to index.html
app.get('/{*splat}', (req, res) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'API not found' });
    
    const publicDir = path.join(__dirname, 'public');
    
    // Try exact match (e.g. /production → /production.html or /production/index.html)
    const htmlPath = path.join(publicDir, req.path + '.html');
    const indexPath = path.join(publicDir, req.path, 'index.html');
    
    if (fs.existsSync(htmlPath)) {
        return res.sendFile(htmlPath);
    }
    if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
    }
    
    // Fallback to index.html (SPA mode)
    const fallback = path.join(publicDir, 'index.html');
    if (fs.existsSync(fallback)) {
        return res.sendFile(fallback);
    }
    
    res.status(404).send('Page not found');
});
