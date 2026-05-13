/**
 * Import Production Data จาก Excel จริงของ Bookandbox
 * ใช้สำหรับ Dev DB (Neon) เท่านั้น
 * 
 * อ่านจาก: ตารางงานพิมพ์.xlsx → Sheet "ตารางงานพิมพ์ 2025 (For Sale Ch"
 * Import: ข้อมูลงาน JOG จริง → ตาราง production_jobs_real
 */

const XLSX = require('xlsx');
const { Pool } = require('pg');

const DEV_DB = 'postgresql://neondb_owner:npg_2XZ7vwAfctrH@ep-tiny-wave-aoo4y7wq.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const pool = new Pool({ connectionString: DEV_DB, ssl: { rejectUnauthorized: false } });

async function run() {
  console.log('🏭 Import Production Data from Excel...\n');

  // 1. Create enhanced production table
  await pool.query(`
    DROP TABLE IF EXISTS production_jobs_real CASCADE;
    CREATE TABLE production_jobs_real (
      id SERIAL PRIMARY KEY,
      jog_no VARCHAR(50) UNIQUE,
      job_name TEXT NOT NULL,
      customer_name TEXT,
      paper_type VARCHAR(100),
      paper_size_full VARCHAR(50),
      paper_qty DECIMAL(12,2),
      cut_type VARCHAR(20),
      print_size VARCHAR(50),
      lift INTEGER DEFAULT 1,
      color_spec VARCHAR(30),
      print_style VARCHAR(50),
      sheets_actual INTEGER DEFAULT 0,
      sheets_waste INTEGER DEFAULT 0,
      sheets_total INTEGER DEFAULT 0,
      speed INTEGER DEFAULT 5000,
      machine VARCHAR(50),
      job_type VARCHAR(50),
      due_date DATE,
      order_date DATE,
      queue_date DATE,
      status VARCHAR(30) DEFAULT 'queued',
      -- Post-press flags
      coating VARCHAR(30) DEFAULT 'ไม่ทำ',
      hot_stamp VARCHAR(30) DEFAULT 'ไม่ทำ',
      emboss VARCHAR(30) DEFAULT 'ไม่ทำ',
      die_cut VARCHAR(30) DEFAULT 'ไม่ทำ',
      glue VARCHAR(30) DEFAULT 'ไม่ทำ',
      fold VARCHAR(30) DEFAULT 'ไม่ทำ',
      binding VARCHAR(30) DEFAULT 'ไม่ทำ',
      finish VARCHAR(30) DEFAULT 'ไม่ทำ',
      qc VARCHAR(30) DEFAULT 'ไม่ทำ',
      extra_work TEXT,
      actual_finish_date DATE,
      efficiency TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX idx_pjr_status ON production_jobs_real(status);
    CREATE INDEX idx_pjr_due ON production_jobs_real(due_date);
    CREATE INDEX idx_pjr_machine ON production_jobs_real(machine);
  `);
  console.log('✅ Table production_jobs_real created');

  // 2. Read Excel
  const wb = XLSX.readFile('/Users/nam/Antigravity nam/ERP bookandbox/ERP Production Planing ใบสั่งผลิต งานในไลน์ ทั้งหมด คิวงาน บันทึกการทำงาน NC/ตารางงานพิมพ์ ตัด2 และ ตัด3 /ตารางงานพิมพ์.xlsx');
  
  const sheet = wb.Sheets[wb.SheetNames[2]]; // "ตารางงานพิมพ์ 2025 (For Sale Ch"
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  // Header at row 9 (0-indexed)
  // Col mapping:
  // 0: NO, 1: ออกใบสั่ง, 2: คิวพิมพ์, 3: ประเภทงาน, 4: เครื่องพิมพ์
  // 5: JOG, 6: ชื่องาน, 7: ส่งงาน, 8: สถานะ
  // 10: ขนาดเต็ม, 11: จน.เบิก, 12: ผ่า, 13: สถานะกระดาษ, 14: เพลท ตัด
  // 15: ขนาดพิมพ์, 16: ยก, 17: สี, 18: ลักษณะ, 19: แผ่นจริง, 20: เผื่อเสีย
  // 21: พิมพ์, 22: ตัด, 23: เคลือบ, 24: ปั้มเค, 25: ปั้มนูน
  // 26: ไดคัท, 27: ปะกาว, 28: พับ, 29: เก็บเล่ม, 30: เข้าเล่ม
  // 31: งานเพิ่ม, 32: QC, 33: Finish, 34: วันที่เสร็จจริง, 35: ประสิทธิภาพ

  let imported = 0, skipped = 0;

  for (let r = 10; r < data.length; r++) {
    const row = data[r];
    if (!row || !row[5] || typeof row[5] !== 'string') { skipped++; continue; }

    const jog = String(row[5]).trim();
    if (!jog || jog === '-') { skipped++; continue; }

    // Parse Excel date serial numbers
    const parseExcelDate = (val) => {
      if (!val) return null;
      if (typeof val === 'number' && val > 40000) {
        const d = new Date((val - 25569) * 86400 * 1000);
        return d.toISOString().split('T')[0];
      }
      return null;
    };

    // Determine status
    let status = 'queued';
    const statusVal = String(row[8] || '').trim();
    if (statusVal.includes('สำเร็จ') || statusVal.includes('จัดแล้ว') || statusVal.includes('เสร็จ')) status = 'completed';
    else if (statusVal.includes('พิมพ์') || statusVal.includes('กำลัง')) status = 'printing';
    else if (statusVal.includes('รอ')) status = 'queued';
    else if (statusVal.includes('ยกเลิก')) status = 'cancelled';

    const values = [
      jog,
      String(row[6] || 'ไม่ระบุชื่อ').trim(),
      null, // customer from JOG prefix
      String(row[10] || '').trim() || null, // paper_size_full
      parseInt(row[11]) || 0, // paper_qty
      String(row[14] || '').trim() || null, // cut_type
      String(row[15] || '').trim() || null, // print_size
      parseInt(row[16]) || 1, // lift
      String(row[17] || '').trim() || null, // color_spec
      String(row[18] || '').trim() || null, // print_style
      parseInt(row[19]) || 0, // sheets_actual
      parseInt(row[20]) || 0, // sheets_waste
      parseInt(row[21]) || 0, // sheets_total (print)
      5000, // speed
      String(row[4] || '').trim() || null, // machine
      String(row[3] || '').trim() || null, // job_type
      parseExcelDate(row[7]), // due_date
      parseExcelDate(row[1]), // order_date
      parseExcelDate(row[2]), // queue_date
      status,
      String(row[23] || 'ไม่ทำ').trim(), // coating
      String(row[24] || 'ไม่ทำ').trim(), // hot_stamp
      String(row[25] || 'ไม่ทำ').trim(), // emboss
      String(row[26] || 'ไม่ทำ').trim(), // die_cut
      String(row[27] || 'ไม่ทำ').trim(), // glue
      String(row[28] || 'ไม่ทำ').trim(), // fold
      String(row[29] || 'ไม่ทำ').trim(), // binding
      String(row[33] || 'ไม่ทำ').trim(), // finish
      String(row[32] || 'ไม่ทำ').trim(), // qc
      String(row[31] || '').trim() || null, // extra_work
      parseExcelDate(row[34]), // actual_finish_date
      parseFloat(row[35]) || null, // efficiency
    ];

    try {
      await pool.query(`
        INSERT INTO production_jobs_real (
          jog_no, job_name, customer_name,
          paper_size_full, paper_qty, cut_type, print_size,
          lift, color_spec, print_style, sheets_actual, sheets_waste, sheets_total,
          speed, machine, job_type, due_date, order_date, queue_date, status,
          coating, hot_stamp, emboss, die_cut, glue, fold, binding, finish, qc,
          extra_work, actual_finish_date, efficiency
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32)
        ON CONFLICT (jog_no) DO NOTHING
      `, values);
      imported++;
    } catch (e) {
      if (!e.message.includes('duplicate')) {
        console.log(`⚠️ Row ${r} (${jog}): ${e.message}`);
      }
      skipped++;
    }
  }

  // 3. Create summary views
  await pool.query(`
    CREATE OR REPLACE VIEW v_production_dashboard AS
    SELECT
      status,
      COUNT(*) as total_jobs,
      SUM(sheets_actual) as total_sheets,
      AVG(efficiency) as avg_efficiency,
      COUNT(*) FILTER (WHERE coating <> 'ไม่ทำ') as needs_coating,
      COUNT(*) FILTER (WHERE die_cut <> 'ไม่ทำ') as needs_diecut,
      COUNT(*) FILTER (WHERE fold <> 'ไม่ทำ') as needs_fold,
      COUNT(*) FILTER (WHERE glue <> 'ไม่ทำ') as needs_glue
    FROM production_jobs_real
    GROUP BY status;
  `);

  await pool.query(`
    CREATE OR REPLACE VIEW v_machine_workload AS
    SELECT
      COALESCE(machine, 'ไม่ระบุ') as machine,
      status,
      COUNT(*) as job_count,
      SUM(sheets_actual) as total_sheets,
      MIN(due_date) as earliest_due,
      MAX(due_date) as latest_due
    FROM production_jobs_real
    WHERE status NOT IN ('completed', 'cancelled')
    GROUP BY machine, status
    ORDER BY machine, status;
  `);

  // 4. Summary
  const summary = await pool.query(`
    SELECT status, COUNT(*) as cnt, SUM(sheets_actual) as sheets 
    FROM production_jobs_real GROUP BY status ORDER BY cnt DESC
  `);

  console.log('\n📊 Import Summary:');
  console.log(`✅ Imported: ${imported} jobs`);
  console.log(`⏭️ Skipped: ${skipped} rows`);
  console.log('\n📈 By Status:');
  summary.rows.forEach(r => console.log(`  ${r.status}: ${r.cnt} jobs (${parseInt(r.sheets || 0).toLocaleString()} sheets)`));

  // 5. Sample active jobs
  const active = await pool.query(`
    SELECT jog_no, job_name, status, due_date, machine, sheets_actual, coating, die_cut
    FROM production_jobs_real 
    WHERE status NOT IN ('completed','cancelled') 
    ORDER BY due_date ASC NULLS LAST 
    LIMIT 10
  `);
  console.log('\n🏭 Active Jobs (top 10):');
  active.rows.forEach(j => console.log(`  ${j.jog_no} | ${j.job_name?.substring(0,30)} | ${j.status} | Due:${j.due_date || '-'} | ${j.sheets_actual} sheets`));

  await pool.end();
  console.log('\n🎉 Done!');
}

run().catch(e => { console.error('❌', e.message); pool.end(); });
