-- ═══════════════════════════════════════
-- Pricing Calculator Tables
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════

-- 1. Cost Config (ต้นทุนทั่วไป)
CREATE TABLE IF NOT EXISTS cost_config (
  id SERIAL PRIMARY KEY,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  unit TEXT,
  cost_per_unit DECIMAL(10,4) NOT NULL DEFAULT 0,
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Paper Catalog (กระดาษ)
CREATE TABLE IF NOT EXISTS paper_catalog (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  gsm INT NOT NULL,
  sheet_size TEXT DEFAULT '31x43',
  sheet_width DECIMAL(6,1) DEFAULT 79,
  sheet_height DECIMAL(6,1) DEFAULT 109,
  price_per_sheet DECIMAL(8,4),
  price_per_ream DECIMAL(10,2),
  sheets_per_ream INT DEFAULT 500,
  supplier TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Machine Rates (เครื่องจักร)
CREATE TABLE IF NOT EXISTS machine_rates (
  id SERIAL PRIMARY KEY,
  machine_name TEXT NOT NULL,
  type TEXT DEFAULT 'offset',
  hourly_rate DECIMAL(8,2) DEFAULT 800,
  speed_per_hour INT DEFAULT 8000,
  max_sheet_size TEXT,
  colors INT DEFAULT 4,
  setup_time_min INT DEFAULT 30,
  setup_waste INT DEFAULT 300
);

-- 4. Finishing Rates (หลังพิมพ์)
CREATE TABLE IF NOT EXISTS finishing_rates (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  fixed_cost DECIMAL(8,2) DEFAULT 0,
  variable_cost DECIMAL(8,4) DEFAULT 0,
  unit TEXT DEFAULT 'ชิ้น',
  min_quantity INT DEFAULT 1,
  notes TEXT
);

-- 5. Job Estimates (ประวัติคิดราคา)
CREATE TABLE IF NOT EXISTS job_estimates (
  id SERIAL PRIMARY KEY,
  job_name TEXT,
  product_type TEXT,
  specs JSONB,
  cost_breakdown JSONB,
  total_cost DECIMAL(10,2),
  margin_percent DECIMAL(5,2),
  selling_price DECIMAL(10,2),
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Price Matrix (ตารางราคาสำเร็จ)
CREATE TABLE IF NOT EXISTS price_matrix (
  id SERIAL PRIMARY KEY,
  product_id INT,
  spec_key TEXT NOT NULL,
  quantity INT NOT NULL,
  delivery_days INT NOT NULL DEFAULT 5,
  cost_price DECIMAL(10,2),
  selling_price DECIMAL(10,2),
  unit_price DECIMAL(8,4),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(product_id, spec_key, quantity, delivery_days)
);

-- 7. Machine Alerts (from earlier)
CREATE TABLE IF NOT EXISTS machine_alerts (
  id SERIAL PRIMARY KEY,
  machine_name TEXT NOT NULL,
  problem TEXT NOT NULL,
  reported_by TEXT,
  affected_jobs TEXT DEFAULT '[]',
  severity TEXT DEFAULT 'high',
  status TEXT DEFAULT 'open',
  resolved_by TEXT,
  solution TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- ═══════════════════════════════════════
-- Seed Data: ข้อมูลเริ่มต้น
-- ═══════════════════════════════════════

-- Cost Config seeds
INSERT INTO cost_config (category, name, unit, cost_per_unit, notes) VALUES
('plate', 'CTP', 'เพลท', 150, 'CTP plate ราคาต่อแผ่น'),
('plate', 'CTP (ใหญ่)', 'เพลท', 200, 'CTP plate ขนาดใหญ่ SM102'),
('machine', 'ค่าตั้งเครื่อง/สี', 'สี', 300, 'Make-ready ต่อสี'),
('ink', 'หมึก/แผ่น/สี', 'แผ่น', 0.03, 'ค่าหมึกเฉลี่ยต่อแผ่นต่อสี'),
('labor', 'ค่าแรงภายใน', 'ชม.', 350, 'ค่าแรงช่างพิมพ์ต่อชม.'),
('labor', 'ค่าแรงภายนอก', 'ชม.', 200, 'ค่า outsource แรงงาน'),
('overhead', 'ค่าบริหาร', '%', 10, 'เปอร์เซ็นต์ค่าบริหารจัดการ'),
('delivery', 'ค่าจัดส่ง กทม.', 'เที่ยว', 300, 'ค่าส่งในกรุงเทพ'),
('delivery', 'ค่าจัดส่ง ตจว.', 'เที่ยว', 150, 'ค่าส่งทางขนส่ง')
ON CONFLICT DO NOTHING;

-- Paper Catalog seeds (ปรับราคาจริงเองได้)
INSERT INTO paper_catalog (name, gsm, sheet_size, sheet_width, sheet_height, price_per_sheet, price_per_ream, supplier) VALUES
('อาร์ตด้าน', 80, '31x43', 79, 109, 0.80, 400, 'SCG'),
('อาร์ตด้าน', 105, '31x43', 79, 109, 0.95, 475, 'SCG'),
('อาร์ตด้าน', 128, '31x43', 79, 109, 1.20, 600, 'SCG'),
('อาร์ตด้าน', 157, '31x43', 79, 109, 1.50, 750, 'SCG'),
('อาร์ตมัน', 128, '31x43', 79, 109, 1.20, 600, 'SCG'),
('อาร์ตมัน', 157, '31x43', 79, 109, 1.50, 750, 'SCG'),
('อาร์ตการ์ด', 190, '31x43', 79, 109, 2.20, 1100, 'SCG'),
('อาร์ตการ์ด', 230, '31x43', 79, 109, 2.60, 1300, 'SCG'),
('อาร์ตการ์ด', 260, '31x43', 79, 109, 3.00, 1500, 'SCG'),
('อาร์ตการ์ด', 300, '31x43', 79, 109, 3.40, 1700, 'SCG'),
('อาร์ตการ์ด', 350, '31x43', 79, 109, 4.00, 2000, 'SCG'),
('ปอนด์ขาว', 80, '31x43', 79, 109, 0.70, 350, 'ไทยเปเปอร์'),
('ปอนด์ขาว', 100, '31x43', 79, 109, 0.90, 450, 'ไทยเปเปอร์'),
('กรีนการ์ด', 250, '31x43', 79, 109, 1.80, 900, '-'),
('กรีนการ์ด', 300, '31x43', 79, 109, 2.20, 1100, '-'),
('กรีนการ์ด', 350, '31x43', 79, 109, 2.60, 1300, '-'),
('กระดาษคราฟท์', 125, '31x43', 79, 109, 1.00, 500, '-'),
('กระดาษคราฟท์', 170, '31x43', 79, 109, 1.30, 650, '-'),
('สติกเกอร์กระดาษ', 80, '31x43', 79, 109, 2.50, 1250, '-'),
('สติกเกอร์ใส', 80, '31x43', 79, 109, 4.00, 2000, '-')
ON CONFLICT DO NOTHING;

-- Machine Rates seeds
INSERT INTO machine_rates (machine_name, type, hourly_rate, speed_per_hour, max_sheet_size, colors, setup_time_min, setup_waste) VALUES
('SM74 5สี (2003)', 'offset', 800, 8000, '52x74', 5, 30, 300),
('SM102 5สี (1999)', 'offset', 1200, 10000, '72x102', 5, 40, 400),
('Konica 12000 (ODM1)', 'digital', 500, 3000, 'A3+', 4, 5, 10),
('Konica 4070 (ODM2)', 'digital', 300, 1500, 'A3', 4, 3, 5)
ON CONFLICT DO NOTHING;

-- Finishing Rates seeds
INSERT INTO finishing_rates (name, type, fixed_cost, variable_cost, unit, notes) VALUES
('เคลือบ PVC ด้าน', 'coating', 200, 0.30, 'แผ่น', 'เคลือบด้าน'),
('เคลือบ PVC มัน', 'coating', 200, 0.30, 'แผ่น', 'เคลือบมัน'),
('เคลือบ UV เฉพาะจุด', 'coating', 800, 0.50, 'แผ่น', 'Spot UV'),
('เคลือบ OPP ด้าน', 'laminate', 300, 0.40, 'แผ่น', 'OPP Matte'),
('เคลือบ OPP มัน', 'laminate', 300, 0.40, 'แผ่น', 'OPP Gloss'),
('พับ 2 ตอน', 'folding', 0, 0.05, 'ชิ้น', '1 รอยพับ'),
('พับ 3 ตอน', 'folding', 0, 0.08, 'ชิ้น', '2 รอยพับ'),
('พับ 4 ตอน', 'folding', 0, 0.12, 'ชิ้น', '3 รอยพับ'),
('เย็บมุงหลังคา', 'binding', 0, 0.50, 'เล่ม', 'Saddle stitch'),
('ไสกาว', 'binding', 500, 3.00, 'เล่ม', 'Perfect binding'),
('ไสกาว+เย็บกี่', 'binding', 800, 5.00, 'เล่ม', 'Thread sewing'),
('ไดคัท (แม่พิมพ์ใหม่)', 'diecut', 1500, 0.10, 'ชิ้น', 'รวมค่าแม่พิมพ์'),
('ไดคัท (มีแม่พิมพ์)', 'diecut', 0, 0.10, 'ชิ้น', 'ใช้แม่พิมพ์เดิม'),
('ปั๊มฟอยล์ทอง', 'foil', 800, 0.30, 'ชิ้น', 'Gold foil'),
('ปั๊มฟอยล์เงิน', 'foil', 800, 0.30, 'ชิ้น', 'Silver foil'),
('ปั๊มนูน', 'emboss', 600, 0.20, 'ชิ้น', 'Embossing'),
('ตัดเจียน', 'cutting', 50, 0, 'ครั้ง', 'Guillotine trim'),
('ติดกาว (กล่อง)', 'gluing', 0, 0.30, 'ชิ้น', 'Box gluing'),
('ร้อยเชือก (ถุง)', 'stringing', 0, 1.50, 'ใบ', 'Paper bag handle')
ON CONFLICT DO NOTHING;
