// ============================================================
// BookAndBox AI Agent — สมอง AI ที่อ่าน ERP ทั้งระบบ
// ============================================================
const { createClient } = require('@supabase/supabase-js');

// Schema context ให้ AI เข้าใจ Database
const SCHEMA_CONTEXT = `
คุณคือ "BCD AI" ผู้ช่วยอัจฉริยะของโรงพิมพ์ BookAndBox (BCD) 
คุณสามารถอ่านข้อมูลจากระบบ ERP ได้ทั้งหมด ตอบเป็นภาษาไทย สุภาพ กระชับ ใช้ emoji เหมาะสม

## ตารางในระบบ ERP (Supabase PostgreSQL):

1. **lead_contact** — ลูกค้าจาก LINE/Facebook
   - id, line_user_id, fb_user_id, original_name, erp_alias_name, tags (jsonb), sales_status (i=สนใจ, q=ขอราคา, won=ปิดการขาย, lost=ไม่ซื้อ), platform, avatar_url, customer_id, created_at

2. **chat_message** — ข้อความแชทกับลูกค้า
   - id, lead_id, sender (client/admin), type (text/image), text_content, media_url, created_at

3. **customer** — ลูกค้าในระบบ
   - id, name, contact_person, credit_limit, phone, customer_type (B2B/B2C), balance

4. **job_order** — ใบสั่งงานผลิต
   - id, customer_id, product_id, quantity, total_price, status (pending/progress/completed), production_stage (awaiting_payment/planning/prepress/printing/finishing/shipping), tracking_number, created_at

5. **product** — สินค้า/บริการ
   - id, name, type (leaflet/brochure/box/sticker/etc.), base_price

6. **employee** — พนักงาน (เก่า)
   - id, name, role

7. **knowledge_base** — คลังความรู้สำหรับตอบลูกค้า
   - id, category, trigger_keywords, content

8. **pf_machines** — เครื่องจักร
   - id, name, type, status, capacity_per_hour

9. **pf_queue** — คิวงานผลิต
   - id, job_id, machine_id, priority, status, start_time, end_time

10. **logistics_trips** — ขนส่ง
    - id, job_order_id, driver, destination, status, created_at

11. **logistics_fuel** — ค่าน้ำมัน
    - id, vehicle, liters, cost, date

12. **customer_quotes** — ใบเสนอราคา
    - id, lead_id, items (jsonb), total, status, created_at

## กฎสำคัญ:
- ตอบเป็นภาษาไทยเสมอ
- ใช้ตัวเลขจริงจากข้อมูลที่ query ได้
- ถ้าไม่มีข้อมูล ให้บอกตรงๆ ว่า "ไม่พบข้อมูลในระบบ"
- จัดรูปแบบให้อ่านง่ายใน LINE (ใช้ emoji, ขึ้นบรรทัดใหม่)
- ถ้าถามเรื่องที่ต้อง query หลายตาราง ให้ทำให้ครบ
- ห้ามแต่งข้อมูลขึ้นเอง
`;

// สร้าง query plan จากคำถาม
function buildQueryPlan(question) {
    const q = question.toLowerCase();
    const queries = [];

    // Sales / Revenue
    if (q.includes('ยอดขาย') || q.includes('revenue') || q.includes('รายได้') || q.includes('เงิน')) {
        queries.push({ table: 'job_order', select: 'id, total_price, status, production_stage, created_at', label: 'ยอดขาย/Job Orders' });
    }

    // Jobs / Production
    if (q.includes('งาน') || q.includes('job') || q.includes('ผลิต') || q.includes('production') || q.includes('ค้าง') || q.includes('เลท') || q.includes('สถานะ')) {
        queries.push({ table: 'job_order', select: 'id, customer_id, product_id, quantity, total_price, status, production_stage, tracking_number, created_at', label: 'Job Orders' });
        if (!queries.find(q => q.table === 'customer')) {
            queries.push({ table: 'customer', select: 'id, name', label: 'ลูกค้า' });
        }
    }

    // Customers
    if (q.includes('ลูกค้า') || q.includes('customer') || q.includes('tier') || q.includes('vip')) {
        queries.push({ table: 'customer', select: '*', label: 'ลูกค้า' });
        queries.push({ table: 'job_order', select: 'id, customer_id, total_price, status, created_at', label: 'ประวัติสั่งซื้อ' });
    }

    // Leads / LINE / Chat
    if (q.includes('lead') || q.includes('แชท') || q.includes('chat') || q.includes('line') || q.includes('facebook') || q.includes('สนใจ') || q.includes('pipeline')) {
        queries.push({ table: 'lead_contact', select: 'id, original_name, erp_alias_name, sales_status, platform, tags, created_at', filter: { column: 'line_user_id', op: 'not.like', value: 'U_SEED_%' }, label: 'Leads' });
    }

    // Employees / HR
    if (q.includes('พนักงาน') || q.includes('คน') || q.includes('hr') || q.includes('employee') || q.includes('headcount')) {
        queries.push({ table: 'employee', select: '*', label: 'พนักงาน' });
    }

    // Machines
    if (q.includes('เครื่อง') || q.includes('machine') || q.includes('oee') || q.includes('จักร')) {
        queries.push({ table: 'pf_machines', select: '*', label: 'เครื่องจักร' });
    }

    // Logistics
    if (q.includes('ส่ง') || q.includes('ขนส่ง') || q.includes('logistic') || q.includes('น้ำมัน') || q.includes('fuel')) {
        queries.push({ table: 'logistics_trips', select: '*', label: 'ขนส่ง' });
        queries.push({ table: 'logistics_fuel', select: '*', label: 'ค่าน้ำมัน' });
    }

    // Quotes
    if (q.includes('ใบเสนอราคา') || q.includes('quote') || q.includes('เสนอราคา')) {
        queries.push({ table: 'customer_quotes', select: '*', label: 'ใบเสนอราคา' });
    }

    // Products
    if (q.includes('สินค้า') || q.includes('product') || q.includes('ราคา') && q.includes('พิมพ์')) {
        queries.push({ table: 'product', select: '*', label: 'สินค้า' });
    }

    // Default: get overview if no specific match
    if (queries.length === 0) {
        queries.push({ table: 'job_order', select: 'id, total_price, status, production_stage, created_at', label: 'Job Orders' });
        queries.push({ table: 'lead_contact', select: 'id, sales_status, platform, created_at', filter: { column: 'line_user_id', op: 'not.like', value: 'U_SEED_%' }, label: 'Leads' });
        queries.push({ table: 'customer', select: 'id, name', label: 'ลูกค้า' });
    }

    // Deduplicate
    const seen = new Set();
    return queries.filter(q => {
        const key = q.table + q.select;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

// Execute queries and get data
async function executeQueries(supabase, queryPlan) {
    const results = {};
    for (const q of queryPlan) {
        try {
            let query = supabase.from(q.table).select(q.select);
            if (q.filter) {
                query = query.filter(q.filter.column, q.filter.op, q.filter.value);
            }
            const { data, error } = await query.limit(200);
            if (error) {
                results[q.label] = { error: error.message };
            } else {
                results[q.label] = data || [];
            }
        } catch (e) {
            results[q.label] = { error: e.message };
        }
    }
    return results;
}

// Call LLM to analyze data and answer question
async function askLLM(question, data, apiKey, model = 'claude') {
    const dataStr = JSON.stringify(data, null, 2).substring(0, 15000); // Limit context

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
                system: SCHEMA_CONTEXT,
                messages: [{
                    role: 'user',
                    content: `คำถาม: ${question}\n\nข้อมูลจากระบบ ERP (query แล้ว):\n${dataStr}\n\nกรุณาวิเคราะห์ข้อมูลและตอบคำถาม จัดรูปแบบให้อ่านง่ายสำหรับ LINE`
                }]
            })
        });
        const result = await response.json();
        if (result.content && result.content[0]) {
            return result.content[0].text;
        }
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
                    { role: 'system', content: SCHEMA_CONTEXT },
                    { role: 'user', content: `คำถาม: ${question}\n\nข้อมูลจากระบบ ERP:\n${dataStr}\n\nกรุณาวิเคราะห์และตอบ จัดรูปแบบสำหรับ LINE` }
                ]
            })
        });
        const result = await response.json();
        if (result.choices && result.choices[0]) {
            return result.choices[0].message.content;
        }
        return `❌ AI Error: ${JSON.stringify(result.error || result)}`;
    }

    return '❌ ไม่พบ AI Model ที่กำหนด';
}

// Fallback: answer without LLM (basic stats)
function answerWithoutLLM(question, data) {
    const q = question.toLowerCase();
    let answer = '📊 BCD AI — รายงานจากระบบ ERP\n━━━━━━━━━━━━━━━\n';

    if (data['ยอดขาย/Job Orders'] || data['Job Orders']) {
        const jobs = data['ยอดขาย/Job Orders'] || data['Job Orders'] || [];
        if (Array.isArray(jobs)) {
            const total = jobs.reduce((s, j) => s + (j.total_price || 0), 0);
            const completed = jobs.filter(j => j.status === 'completed').length;
            const pending = jobs.filter(j => j.status !== 'completed').length;
            answer += `\n💰 ยอดขายรวม: ฿${total.toLocaleString()}\n`;
            answer += `📦 Jobs ทั้งหมด: ${jobs.length} งาน\n`;
            answer += `  ✅ เสร็จ: ${completed}\n`;
            answer += `  ⏳ ค้าง: ${pending}\n`;
        }
    }

    if (data['Leads']) {
        const leads = data['Leads'] || [];
        if (Array.isArray(leads)) {
            const byStatus = {};
            leads.forEach(l => {
                const s = l.sales_status || 'unknown';
                byStatus[s] = (byStatus[s] || 0) + 1;
            });
            const statusMap = { i: 'สนใจ', q: 'ขอราคา', won: 'ปิดการขาย', lost: 'ไม่ซื้อ' };
            answer += `\n👥 Leads ทั้งหมด: ${leads.length} ราย\n`;
            Object.entries(byStatus).forEach(([k, v]) => {
                answer += `  ${statusMap[k] || k}: ${v} ราย\n`;
            });
        }
    }

    if (data['ลูกค้า']) {
        const custs = data['ลูกค้า'] || [];
        if (Array.isArray(custs)) {
            answer += `\n🏢 ลูกค้าในระบบ: ${custs.length} ราย\n`;
        }
    }

    if (data['พนักงาน']) {
        const emps = data['พนักงาน'] || [];
        if (Array.isArray(emps)) {
            answer += `\n👤 พนักงาน: ${emps.length} คน\n`;
        }
    }

    if (data['เครื่องจักร']) {
        const machines = data['เครื่องจักร'] || [];
        if (Array.isArray(machines)) {
            answer += `\n🏭 เครื่องจักร: ${machines.length} เครื่อง\n`;
            machines.forEach(m => {
                answer += `  • ${m.name} (${m.status || 'N/A'})\n`;
            });
        }
    }

    answer += '\n━━━━━━━━━━━━━━━\n';
    answer += '💡 ต้องการวิเคราะห์เชิงลึก กรุณาเพิ่ม AI API Key';
    return answer;
}

// Main agent function
async function processAgentQuery(supabase, question, aiApiKey, aiModel) {
    try {
        // 1. Build query plan
        const queryPlan = buildQueryPlan(question);

        // 2. Execute queries
        const data = await executeQueries(supabase, queryPlan);

        // 3. Answer with LLM or fallback
        if (aiApiKey) {
            const answer = await askLLM(question, data, aiApiKey, aiModel);
            return answer;
        } else {
            return answerWithoutLLM(question, data);
        }
    } catch (e) {
        return `❌ เกิดข้อผิดพลาด: ${e.message}`;
    }
}

module.exports = { processAgentQuery, buildQueryPlan, executeQueries, SCHEMA_CONTEXT };
