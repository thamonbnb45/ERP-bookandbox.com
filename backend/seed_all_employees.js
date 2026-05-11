require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function mapRole(dept, position) {
    if (dept === 'ผู้บริหาร') return 'CEO';
    if (dept === 'ขาย' || dept === 'การตลาด') return 'Sales';
    if (dept === 'บัญชี') return 'Accountant';
    if (position.includes('HR')) return 'HR';
    if (position.includes('ประเมินราคา')) return 'Pricing';
    if (dept === 'จัดส่ง' || position.includes('ขับรถ')) return 'Driver';
    if (position.includes('หัวหน้าฝ่ายผลิต') || position.includes('หน.วางแผน')) return 'Production Manager';
    if (dept === 'พิมพ์' || dept === 'หลังพิมพ์' || dept === 'ผลิต') return 'Operator';
    return 'Operator'; // Default
}

async function seed() {
    try {
        console.log("Reading employee data...");
        const empDataPath = path.resolve(__dirname, '../bookandbox-hub/employees_data.json');
        const rawData = fs.readFileSync(empDataPath, 'utf-8');
        const employees = JSON.parse(rawData);

        const newUsers = [];

        // 1. Map all employees
        for (const emp of employees) {
            const role = mapRole(emp.department, emp.position);
            // Prefix username to avoid collision and make it clean (e.g. emp_โจ)
            const username = `emp_${emp.nickname}`;
            
            // Generate random 4 digit PIN
            const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
            
            newUsers.push({
                username: username,
                pin_code: randomPin,
                full_name: `${emp.nickname} (${emp.position})`,
                role: role,
                active: true,
                department: emp.department // Keep for grouping later
            });
        }

        // 2. Add Super Admin account
        newUsers.push({
            username: 'admin',
            pin_code: Math.floor(1000 + Math.random() * 9000).toString(),
            full_name: 'ผู้ดูแลระบบสูงสุด',
            role: 'CEO',
            active: true,
            department: 'บริหาร'
        });

        // 3. Upsert to Supabase
        console.log(`Upserting ${newUsers.length} users into erp_users...`);
        for (const u of newUsers) {
            const dbUser = { ...u };
            delete dbUser.department; // Don't insert department to DB if column doesn't exist

            const { data: existing } = await supabase.from('erp_users').select('id').eq('username', u.username).single();
            if (!existing) {
                await supabase.from('erp_users').insert([dbUser]);
            } else {
                await supabase.from('erp_users').update(dbUser).eq('username', u.username);
            }
        }
        
        fs.writeFileSync(path.resolve(__dirname, 'credentials.json'), JSON.stringify(newUsers, null, 2));

        console.log('🎉 Done! All employees have been seeded.');
    } catch (e) {
        console.error("Error:", e.message);
    }
}

seed();
