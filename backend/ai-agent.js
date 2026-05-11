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
    return TEAM_WHITELIST[lineUserId] || null;
}

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
- เรื่องใหญ่ ต้องผ่าน CEO (Nam)
- เรื่องเล็ก แจ้ง IT (หนึ่ง) หรือ ผจก. (ซัน) ได้
- เรื่องบัญชี/การเงิน ผ่าน CEO เท่านั้น
- เรื่อง HR ผ่าน CEO เท่านั้น

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
// Main Agent Function (ไม่มี Database Query)
// ══════════════════════════════════════════
async function processAgentQuery(supabase, question, aiApiKey, aiModel, lineUserId) {
    try {
        // 1. ตรวจสอบตัวตน
        const member = getTeamMember(lineUserId);
        const roleContext = getRoleContext(member);

        // 2. ถาม AI โดยไม่ส่งข้อมูลจาก Database ไป
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

module.exports = { processAgentQuery, getTeamMember, getRoleContext, TEAM_WHITELIST, CEO_USER_ID, hasProposal, extractProposal };
