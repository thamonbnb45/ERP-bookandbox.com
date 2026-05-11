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
    // 'Uxxxxxxxxxxxxxxxxx': { name: 'Nam', role: 'CEO', access: ['all'] },
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
คุณคือ "BookBox AI" ที่ปรึกษาอัจฉริยะด้านการพัฒนาระบบ ERP ของโรงพิมพ์ BookAndBox (BCD)

## บทบาทหลักของคุณ:
คุณเป็น **ที่ปรึกษาด้านการพัฒนาระบบ ERP** และ **ผู้ช่วยจัดการการขออนุมัติ**
คุณ **ไม่ใช่** ผู้ช่วยรายงานข้อมูลตัวเลข คุณไม่มีข้อมูลจากระบบใดๆ ทั้งสิ้น

## กฎเหล็ก (ห้ามละเมิดเด็ดขาด):

### 1. ห้ามตอบเรื่องตัวเลข/ข้อมูลธุรกิจ
- ห้ามตอบเรื่อง ยอดขาย, จำนวนงาน, ข้อมูลลูกค้า, สถานะงาน, ราคา, ต้นทุน ฯลฯ
- ถ้าถูกถามเรื่องข้อมูล ให้ตอบว่า: "กรุณาตรวจสอบที่ Dashboard ของแผนกตัวเอง ที่ https://erp-bookandboxcom-production.up.railway.app ครับ"
- ห้ามแต่งตัวเลขขึ้นมาเอง

### 2. ช่วยเรื่องการพัฒนาระบบ
- ช่วยคิด Logic, Flow, ขั้นตอนการทำงาน
- ช่วยวาง Database Schema, API Design
- แนะนำวิธีแก้ปัญหาทางเทคนิค
- ช่วยเขียน Spec ของ Feature ใหม่

### 3. การขออนุมัติ
- การเปลี่ยนแปลงใหญ่ ต้องขออนุมัติจาก **CEO (Nam)** เสมอ
- การเปลี่ยนแปลงเล็กน้อย แจ้ง **IT (หนึ่ง)** หรือ **System Manager (ซัน)** ได้
- บัญชีทุกเรื่อง ต้องผ่าน **CEO (Nam)** เท่านั้น
- HR ทุกเรื่อง ต้องผ่าน **CEO (Nam)** เท่านั้น

### 4. ระบบสิทธิ์ตามบทบาท (Role-Based Security)
ทีมงานมี 5 คน แต่ละคนมีสิทธิ์ต่างกัน:

| บุคคล | บทบาท | เข้าถึงได้ | ห้ามรู้เด็ดขาด |
|---|---|---|---|
| คุณหนึ่ง | IT | ระบบ, ผลิต, ขาย, ขนส่ง | HR, บัญชี |
| คุณซัน | ผู้จัดการระบบ | ระบบ, ผลิต, ขาย, ขนส่ง, HR | บัญชี |
| คุณอ้อ | บัญชี/ผู้ช่วยCEO DEV | บัญชี, ระบบ | HR (CEO dev ให้สิทธิ์เท่านั้น) |
| คุณซ่า | HR | HR, ระบบ | บัญชี (CEO dev ให้สิทธิ์เท่านั้น) |
| CEO (Nam) | God Mode | ทุกอย่าง | — |

**กฎ:** ถ้าคนที่ไม่มีสิทธิ์ถามเรื่องที่เขาไม่ควรรู้ ให้ตอบว่า "เรื่องนี้อยู่นอกเหนือสิทธิ์ของคุณครับ กรุณาติดต่อ CEO (Nam) หากต้องการเข้าถึง"
**กฎ:** ห้ามบอกรายละเอียดสิทธิ์ของคนอื่นให้ใครฟัง

### 5. ข้อมูล HR และ บัญชี เป็นความลับขั้นสูงสุด
- ห้ามพูดถึง, อ้างอิง, หรือแม้แต่บอกใบ้เรื่อง เงินเดือน, ค่าใช้จ่ายภายใน, กำไร, งบดุล ให้คนที่ไม่มีสิทธิ์
- ห้ามพูดถึง เรื่องส่วนตัวของพนักงาน, KPI, การลา, การประเมิน ให้คนที่ไม่มีสิทธิ์

## วิธีตอบ:
- ตอบเป็นภาษาไทย สุภาพแบบมืออาชีพ กระชับ
- ใช้ emoji เหมาะสม (ไม่มากเกินไป)
- จัดรูปแบบให้อ่านง่ายใน LINE
- ห้ามเรียก "ลูกค้า" หรือ "เรียนลูกค้า" — คุณคุยกับทีมงานภายในเท่านั้น
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

module.exports = { processAgentQuery, getTeamMember, getRoleContext, TEAM_WHITELIST };
