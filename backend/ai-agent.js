// ============================================================
// BookBox AI Agent v2 — ที่ปรึกษาพัฒนาระบบ ERP (ไม่ดึงข้อมูลจาก DB)
// ============================================================
// 🔒 ยกเลิกระบบดึงข้อมูลจาก Database ทั้งหมดแล้ว
// 🔒 AI จะไม่สามารถตอบเรื่องยอดขาย, ข้อมูลลูกค้า, job order ฯลฯ
// ============================================================

// ══════════════════════════════════════════
// ระบบยืนยันตัวตน (Whitelist by LINE User ID)
// ══════════════════════════════════════════
// LINE User ID ปลอมไม่ได้ — เป็น ID ที่ LINE Platform กำหนดให้แต่ละคน
// แม้เปลี่ยนชื่อ Display ก็ ID ไม่เปลี่ยน
// CEO ต้องเพิ่ม User ID ของพนักงานแต่ละคนลงในตารางนี้
// วิธีดู User ID: ให้แต่ละคนพิมพ์ "ลงทะเบียน" ในแชทส่วนตัวกับ Bot

const TEAM_WHITELIST = {
    // ===== ใส่ LINE User ID จริงที่นี่ =====
    // รูปแบบ: 'LINE_USER_ID': { name: 'ชื่อ', role: 'บทบาท', access: [...] }
    //
    // วิธีหา User ID: 
    //   1. ให้แต่ละคนแชทส่วนตัวกับ BookBox AI Agent 
    //   2. พิมพ์ "ลงทะเบียน" 
    //   3. Bot จะตอบ User ID กลับมา
    //   4. CEO (Nam) เอา ID มาใส่ตรงนี้
    //
    // access ที่ใช้ได้: 'system', 'production', 'sales', 'logistics', 'hr', 'accounting', 'all'
    
    // ===== ทีมงาน BCD (LINE User ID จริง) =====
    
    // CEO — God Mode
    'Ua944192ba939c444c52b4a435539c5a3': { name: 'Nam', role: 'CEO', access: ['all'] },
    
    // รอ User ID จากทีมงาน:
    // 'Uxxxxxxxxxxxxxxxxx': { name: 'หนึ่ง', role: 'IT', access: ['system', 'production', 'sales', 'logistics'] },
    // 'Uxxxxxxxxxxxxxxxxx': { name: 'ซัน', role: 'System Manager', access: ['system', 'production', 'sales', 'logistics', 'hr'] },
    // 'Uxxxxxxxxxxxxxxxxx': { name: 'อ้อ', role: 'บัญชี / ผู้ช่วย CEO DEV', access: ['accounting', 'system'] },
    // 'Uxxxxxxxxxxxxxxxxx': { name: 'ซ่า', role: 'HR', access: ['hr', 'system'] },
};

function getTeamMember(lineUserId) {
    // 1. Check hardcoded whitelist first (CEO etc)
    if (TEAM_WHITELIST[lineUserId]) return TEAM_WHITELIST[lineUserId];
    // 2. Check database cache (populated by loadTeamFromDB)
    if (_dbTeamCache[lineUserId]) return _dbTeamCache[lineUserId];
    return null;
}

// Database team cache (refreshed periodically)
let _dbTeamCache = {};
async function loadTeamFromDB() {
    try {
        const db = require('./db');
        const result = await db.query(`SELECT * FROM team_members WHERE status = 'active'`);
        _dbTeamCache = {};
        for (const row of result.rows) {
            _dbTeamCache[row.line_user_id] = { name: row.name, role: row.role, access: [row.access || 'production'] };
        }
        console.log(`✅ [Team] Loaded ${result.rows.length} members from DB`);
    } catch(e) { /* table might not exist yet */ }
}
// Refresh every 60 seconds
setInterval(loadTeamFromDB, 60000);
setTimeout(loadTeamFromDB, 5000); // Initial load after 5s

function getRoleContext(member) {
    if (!member) {
        return `ผู้ใช้คนนี้ยังไม่ได้ลงทะเบียนในระบบ ให้ตอบสุภาพ แต่ห้ามให้ข้อมูลที่เป็นความลับ และแนะนำให้ไปลงทะเบียนกับ CEO`;
    }
    
    const name = member.name;
    const role = member.role;
    const access = member.access;
    
    let context = `คุณกำลังคุยกับ "คุณ${name}" (${role})\n`;
    
    if (access.includes('all')) {
        context += `สิทธิ์: ระดับสูงสุด (God Mode) — เห็นทุกอย่าง ทำทุกอย่าง อนุมัติทุกอย่าง\n`;
    } else {
        const allowed = access.join(', ');
        const restrictions = [];
        if (!access.includes('hr')) restrictions.push('HR');
        if (!access.includes('accounting')) restrictions.push('บัญชี/การเงิน');
        
        context += `สิทธิ์: เข้าถึงได้ [${allowed}]\n`;
        if (restrictions.length > 0) {
            context += `⛔ ห้ามพูดถึงหรือให้ข้อมูลเรื่อง: ${restrictions.join(', ')} เด็ดขาด\n`;
        }
    }
    
    return context;
}

// ══════════════════════════════════════════
// Prompt หลัก (ไม่มีข้อมูลจาก Database)
// ══════════════════════════════════════════
const SYSTEM_PROMPT = `
คุณคือ "BookBox AI" ผู้ช่วยของทีมงานโรงพิมพ์ BookAndBox (BCD)

## บทบาทของคุณ:
คุณเป็นเพื่อนร่วมงานที่ช่วยคิด ช่วยวางแผน ช่วยปรับปรุงวิธีทำงาน
คุณพูดแบบคนธรรมดา ไม่ใช้ศัพท์เทคนิค ไม่ใช้ศัพท์ภาษาอังกฤษถ้าไม่จำเป็น

## กฎสำคัญ:

### 1. ห้ามตอบเรื่องตัวเลขหรือข้อมูลธุรกิจ
- ห้ามตอบเรื่อง ยอดขาย, จำนวนงาน, ข้อมูลลูกค้า, สถานะงาน, ราคา, ต้นทุน
- ถ้าถูกถามเรื่องข้อมูล ตอบว่า "ดูได้ที่หน้า Dashboard ของแผนกตัวเองเลยนะครับ"
- ห้ามแต่งตัวเลขขึ้นเอง

### 2. ช่วยเรื่องการปรับปรุงระบบและวิธีทำงาน
- ช่วยคิดว่า "ทำอะไร" และ "ทำไม" ไม่ต้องลงรายละเอียดเทคนิคลึก
- อธิบายเหมือนพี่สอนน้อง ใช้ภาษาง่าย
- ยกตัวอย่างจากงานจริงของโรงพิมพ์
- ถ้ามีไอเดียปรับปรุง สรุปเป็น "ข้อเสนอ" ให้ CEO อนุมัติ

### 3. รูปแบบข้อเสนอ (ใช้ทุกครั้งที่มีเรื่องต้องขออนุมัติ)
สรุปเป็นรูปแบบนี้เสมอ:

📋 ข้อเสนอ: [ชื่อเรื่องสั้นๆ]
🎯 ทำไมต้องทำ: [แก้ปัญหาอะไร 1-2 บรรทัด]
📝 สิ่งที่ต้องทำ:
  1. [ขั้นตอนง่ายๆ]
  2. [ขั้นตอนง่ายๆ]
👤 ใครรับผิดชอบ: [ชื่อคน/แผนก]
⏱️ ใช้เวลาประมาณ: [กี่วัน/สัปดาห์]
✅ รอ CEO (Nam) อนุมัติ

### 4. การขออนุมัติ
เรื่องเล็ก (แก้ bug, ปรับหน้าจอ, เพิ่มเติมนิดหน่อย, ไม่กระทบระบบใหญ่):
- ไม่ต้องขออนุมัติ CEO → IT (หนึ่ง) หรือ ผจก. (ซัน) ทำได้เลย
- ตอบให้ทำเลย ไม่ต้องสร้างข้อเสนอ แค่บอกว่า "เรื่องนี้ IT/ผจก. ดูแลได้เลยครับ"

เรื่องใหญ่ (ระบบใหม่, เปลี่ยนโครงสร้าง, กระทบหลายแผนก):
- ต้องสร้างข้อเสนอ ส่งให้ CEO (Nam) อนุมัติ

เรื่องบัญชี/การเงิน/HR:
- ทุกขนาด ต้องผ่าน CEO เท่านั้น

### 5. สิทธิ์ของแต่ละคน
- คุณหนึ่ง (IT): คุยได้ทุกเรื่อง ยกเว้น HR และ บัญชี
- คุณซัน (ผจก.): คุยได้ทุกเรื่อง รวม HR ยกเว้น บัญชี
- คุณอ้อ (บัญชี): คุยได้เรื่องบัญชีและระบบ ยกเว้น HR
- คุณซ่า (HR): คุยได้เรื่อง HR และระบบ ยกเว้น บัญชี
- CEO (Nam): ทุกเรื่อง ไม่มีข้อจำกัด

ถ้าคนที่ไม่มีสิทธิ์ถามเรื่องที่ห้าม ตอบว่า "เรื่องนี้ต้องสอบถามกับ CEO (Nam) โดยตรงนะครับ"
ห้ามบอกว่าใครมีสิทธิ์อะไรบ้าง

### 6. ข้อมูลลับ
- เงินเดือน กำไร งบ ค่าใช้จ่ายภายใน ห้ามพูดกับคนที่ไม่มีสิทธิ์
- เรื่องส่วนตัวพนักงาน KPI การลา ห้ามพูดกับคนที่ไม่มีสิทธิ์

## วิธีตอบ:
- พูดภาษาไทยธรรมดา เหมือนเพื่อนร่วมงาน
- ห้ามใช้ศัพท์เทคนิค เช่น Database Schema API Endpoint Middleware Framework ฯลฯ ถ้าจำเป็นต้องพูด ให้อธิบายภาษาง่ายต่อท้ายในวงเล็บ
- สั้น กระชับ ได้ใจความ (อ่านใน LINE ต้องไม่ยาวเกิน 10 บรรทัด)
- ใช้ emoji พอประมาณ
- ห้ามเรียก "ลูกค้า" คุณคุยกับทีมงานภายในเท่านั้น
- ถ้าเป็นเรื่องที่ต้องทำจริง จบด้วย "ข้อเสนอ" ตามรูปแบบข้างบนเสมอ

## กฎการสื่อสาร (สำคัญมาก):
- ห้ามเงียบ ต้องบอกเสมอว่า "ทำอะไรได้" และ "ทำอะไรไม่ได้"
- ถ้ามีคนพิมพ์ข้อมูลมาให้บันทึก (เช่น เวลาเข้างาน ยอดขาย บันทึกงาน) ต้องบอกตรงๆ ว่า "ตอนนี้ผมยังบันทึกข้อมูลเข้าระบบไม่ได้นะครับ กรุณาไปบันทึกที่ระบบ ERP โดยตรง" ห้ามทำเป็นว่ารับทราบแล้วจบ เพราะข้อมูลจะหาย
- สรุปสิ่งที่ทำให้เสมอ เช่น "ผมช่วยคิดแผนให้แล้วนะครับ ข้อเสนอจะถูกส่งไปให้ CEO อนุมัติ" หรือ "เรื่องนี้ผมช่วยคิดให้ได้ แต่ต้องให้ IT ไปทำจริงครับ"
- ถ้าไม่เข้าใจคำถาม ถามกลับ อย่าเดา
- ห้ามตอบแบบ "ดีครับ" "ขอบคุณครับ" แล้วจบ ต้องมีเนื้อหาหรือแนะนำขั้นตอนถัดไปเสมอ
`;

// ══════════════════════════════════════════
// ฟังก์ชันหลัก: ถาม AI (ไม่ดึง Database)
// ══════════════════════════════════════════
async function askAI(question, apiKey, model, roleContext) {
    const fullPrompt = SYSTEM_PROMPT + '\n\n## ข้อมูลผู้ถาม:\n' + roleContext;

    if (model === 'gemini' || model === 'google') {
        const geminiModel = 'gemini-2.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;
        
        let lastError = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        systemInstruction: { parts: [{ text: fullPrompt }] },
                        contents: [{
                            parts: [{ text: question }]
                        }],
                        generationConfig: { maxOutputTokens: 1024 }
                    })
                });
                
                const result = await response.json();
                
                if (response.ok && result.candidates && result.candidates[0] && result.candidates[0].content) {
                    return result.candidates[0].content.parts[0].text;
                }
                
                lastError = result;
                if (result.error && result.error.code === 503) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    continue;
                }
                break;
            } catch (e) {
                lastError = e.message;
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        return `❌ Gemini API ล่มชั่วคราว (ลองใหม่แล้ว 3 ครั้ง): ${JSON.stringify(lastError?.error || lastError)}`;
    }

    if (model === 'claude' || model === 'anthropic') {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 1024,
                system: fullPrompt,
                messages: [{ role: 'user', content: question }]
            })
        });
        const result = await response.json();
        if (result.content && result.content[0]) return result.content[0].text;
        return `❌ AI Error: ${JSON.stringify(result.error || result)}`;
    }

    if (model === 'openai') {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                max_tokens: 1024,
                messages: [
                    { role: 'system', content: fullPrompt },
                    { role: 'user', content: question }
                ]
            })
        });
        const result = await response.json();
        if (result.choices && result.choices[0]) return result.choices[0].message.content;
        return `❌ AI Error: ${JSON.stringify(result.error || result)}`;
    }

    return '❌ ไม่พบ AI Model ที่กำหนด (ใช้ได้: gemini, claude, openai)';
}

// ══════════════════════════════════════════
// ระบบวิเคราะห์ข้อความด้วย AI (ไม่ต้องมี keyword)
// ══════════════════════════════════════════
const CLASSIFY_PROMPT = `คุณเป็นระบบจำแนกข้อความของโรงพิมพ์ BookAndBox
วิเคราะห์ข้อความที่ได้รับ แล้วตอบเป็น JSON เท่านั้น ห้ามตอบอย่างอื่น

ถ้าเป็นการรายงานงาน/แจ้งข้อมูล/บันทึกกิจกรรม:
{"is_report":true,"type":"work_log|nc|sales|delivery|transfer|procurement|general","title":"สรุปสั้นๆ","priority":"normal|high|urgent"}

ประเภท:
- work_log = รายงานงานที่ทำ, บันทึกเวลา, ความคืบหน้า
- nc = งานเสีย, งานผิด, ตีกลับ, ข้อผิดพลาด, ของเสีย
- sales = ยอดขาย, ลูกค้าเข้า, ปิดงาน, ใบเสนอราคา
- delivery = ส่งของ, รับของ, ขนส่ง, ถึงหน้างาน
- transfer = โอนเงิน, จ่ายเงิน, รับเงิน
- procurement = สั่งซื้อ, ราคาวัตถุดิบ, เปรียบเทียบราคา, supplier
- general = รายงานอื่นๆ ที่ไม่เข้าหมวดข้างบน

ถ้าเป็นคำถาม/คำขอ/การสนทนา/ทักทาย:
{"is_report":false}

ตัวอย่าง:
"วันนี้ตัดซอย 200 แผ่น เสร็จแล้ว" → {"is_report":true,"type":"work_log","title":"ตัดซอย 200 แผ่น","priority":"normal"}
"งาน 555 สีเพี้ยน ต้องพิมพ์ใหม่" → {"is_report":true,"type":"nc","title":"งาน 555 สีเพี้ยน","priority":"high"}
"ส่ง BNI 3 กล่อง ถึงแล้วครับ" → {"is_report":true,"type":"delivery","title":"ส่ง BNI 3 กล่อง ถึงแล้ว","priority":"normal"}
"หมึก CMYK ร้าน A เสนอ 2,500 ร้าน B เสนอ 2,200" → {"is_report":true,"type":"procurement","title":"เปรียบเทียบราคาหมึก CMYK","priority":"normal"}
"ระบบ tracking ทำยังไง" → {"is_report":false}
"สวัสดีครับ" → {"is_report":false}

ตอบ JSON เท่านั้น:`;

// กรอง message ที่ไม่น่าจะเป็นรายงานออกก่อน (ไม่ต้องเรียก AI)
function quickFilter(text) {
    const t = text.trim();
    // ข้อความสั้นมาก (น้อยกว่า 5 ตัวอักษร) → ข้ามเลย
    if (t.length < 5) return false;
    // ทักทาย / คำสั้นๆ
    const skipWords = ['สวัสดี', 'ขอบคุณ', 'โอเค', 'ok', 'ครับ', 'ค่ะ', 'ดีครับ', 'ดีค่ะ', 'หวัดดี', '555', 'อิอิ', 'จ้า', 'จ้ะ', 'ได้เลย', 'รับทราบ', 'เดี๋ยว', 'อืม', 'เยี่ยม'];
    if (skipWords.some(w => t.toLowerCase() === w)) return false;
    // URL ล้วนๆ
    if (/^https?:\/\/\S+$/.test(t)) return false;
    // Emoji ล้วนๆ
    if (/^[\p{Emoji}\s]+$/u.test(t) && t.length < 10) return false;
    return true;
}

async function classifyMessage(text, apiKey) {
    // ถ้าข้อความสั้น/ไม่น่าจะเป็นรายงาน → ข้ามเลย ไม่เรียก AI
    if (!quickFilter(text)) return { is_report: false };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    // Retry สูงสุด 2 ครั้ง ถ้า 503
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: CLASSIFY_PROMPT + '\n\nข้อความ: "' + text + '"' }] }],
                    generationConfig: { temperature: 0, maxOutputTokens: 200 }
                })
            });

            if (response.status === 503 || response.status === 429) {
                console.log(`⚠️ [Classify] API busy (${response.status}), retry ${attempt + 1}/2`);
                await new Promise(r => setTimeout(r, 2000)); // รอ 2 วินาที
                continue;
            }

            if (!response.ok) return { is_report: false };
            
            const data = await response.json();
            const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
            
            const jsonMatch = raw.match(/\{[\s\S]*\}/);
            if (!jsonMatch) return { is_report: false };
            
            return JSON.parse(jsonMatch[0]);
        } catch (e) {
            console.log('⚠️ [Classify] Error:', e.message);
            return { is_report: false };
        }
    }
    
    console.log('⚠️ [Classify] All retries failed, skipping');
    return { is_report: false };
}

// บันทึกรายงานเข้า Supabase
async function saveReport(supabase, { reportType, member, lineUserId, groupId, groupName, title, content, rawMessage, priority }) {
    const { data, error } = await supabase.from('agent_reports').insert([{
        report_type: reportType,
        reporter_name: member?.name || 'ไม่ระบุ',
        reporter_role: member?.role || 'ไม่ระบุ',
        reporter_line_id: lineUserId,
        group_id: groupId || null,
        group_name: groupName || null,
        title: title,
        content: content,
        raw_message: rawMessage,
        status: 'logged',
        priority: priority || 'normal'
    }]).select('id, created_at');

    if (error) throw new Error(`บันทึกไม่สำเร็จ: ${error.message}`);
    return data[0];
}

const REPORT_LABELS = {
    'work_log': 'บันทึกงาน',
    'nc': 'แจ้ง NC (งานผิดพลาด)',
    'sales': 'รายงานยอดขาย',
    'delivery': 'รายงานจัดส่ง',
    'transfer': 'รายงานโอนเงิน',
    'procurement': 'รายงานจัดซื้อ/วัตถุดิบ',
    'general': 'รายงานทั่วไป'
};

// ══════════════════════════════════════════
// Main Agent Function
// ══════════════════════════════════════════
async function processAgentQuery(supabase, question, aiApiKey, aiModel, lineUserId, groupId) {
    try {
        // 1. ตรวจสอบตัวตน
        const member = getTeamMember(lineUserId);
        const roleContext = getRoleContext(member);

        // 2. ให้ AI วิเคราะห์ว่าเป็นรายงานหรือคำถาม
        const classification = await classifyMessage(question, aiApiKey);
        
        if (classification.is_report && member) {
            // เป็นรายงาน → บันทึกเข้า Database เลย
            const label = REPORT_LABELS[classification.type] || 'รายงานทั่วไป';
            const saved = await saveReport(supabase, {
                reportType: classification.type || 'general',
                member: member,
                lineUserId: lineUserId,
                groupId: groupId,
                title: classification.title || label,
                content: question,
                rawMessage: question,
                priority: classification.priority || 'normal'
            });

            const refId = `RPT-${String(saved.id).padStart(4, '0')}`;
            const time = new Date(saved.created_at).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
            const priorityEmoji = classification.priority === 'urgent' ? '🔴' : classification.priority === 'high' ? '🟡' : '🟢';

            return `✅ บันทึกเรียบร้อย!\n${priorityEmoji} ${label}\n🔖 ${refId}\n📝 ${classification.title || question}\n👤 คุณ${member.name} | 🕐 ${time}`;
        }

        // 3. ไม่ใช่รายงาน → ถาม AI ตามปกติ
        const answer = await askAI(question, aiApiKey, aiModel, roleContext);
        return answer;
    } catch (e) {
        return `❌ เกิดข้อผิดพลาด: ${e.message}`;
    }
}

// ══════════════════════════════════════════
// CEO User ID สำหรับส่งข้อเสนอไปหา CEO อัตโนมัติ
// ══════════════════════════════════════════
const CEO_USER_ID = 'Ua944192ba939c444c52b4a435539c5a3';

// ตรวจว่า AI ตอบมามีข้อเสนอหรือไม่
function hasProposal(text) {
    return text.includes('ข้อเสนอ:') || text.includes('📋');
}

// ดึงส่วนข้อเสนอออกมาจากข้อความ
function extractProposal(text) {
    // หาตำแหน่งที่เริ่มข้อเสนอ
    const markers = ['📋 ข้อเสนอ:', '📋ข้อเสนอ:'];
    let startIdx = -1;
    for (const m of markers) {
        startIdx = text.indexOf(m);
        if (startIdx !== -1) break;
    }
    if (startIdx === -1) return text; // ส่งทั้งหมดถ้าหาไม่เจอ
    return text.substring(startIdx);
}

module.exports = { processAgentQuery, getTeamMember, getRoleContext, TEAM_WHITELIST, CEO_USER_ID, hasProposal, extractProposal, classifyMessage, saveReport, REPORT_LABELS };
