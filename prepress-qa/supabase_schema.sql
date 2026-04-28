-- =============================================
-- Prepress QA — Supabase Database Schema
-- =============================================

-- 1. ตาราง qa_records (แทน base44.entities.QARecord)
CREATE TABLE IF NOT EXISTS public.qa_records (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_code      TEXT NOT NULL,
  job_year      TEXT,
  job_month     TEXT,
  job_sequence  TEXT,
  checker_email TEXT NOT NULL,
  checker_name  TEXT,
  master_filename TEXT,
  print_filename  TEXT,
  master_pages    INTEGER,
  print_pages     INTEGER,
  matched_pages   INTEGER,
  mismatched_pages INTEGER,
  is_ready        BOOLEAN NOT NULL DEFAULT false,
  has_errors      BOOLEAN DEFAULT true,
  error_details   TEXT DEFAULT '',
  detected_size   TEXT,
  document_type   TEXT DEFAULT 'other',
  bleed_detected  BOOLEAN DEFAULT false,
  bleed_mm        NUMERIC DEFAULT 0,
  check_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Index สำหรับ filter ตามวันที่และ email
CREATE INDEX IF NOT EXISTS idx_qa_records_date ON public.qa_records(check_date DESC);
CREATE INDEX IF NOT EXISTS idx_qa_records_email ON public.qa_records(checker_email);

-- 2. ตาราง admin_settings (แทน base44.entities.AdminSettings)
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key   TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  setting_group TEXT NOT NULL CHECK (setting_group IN ('bleed','sizes','folds','comparison','general')),
  description   TEXT,
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- 3. Row Level Security (RLS)
ALTER TABLE public.qa_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- qa_records: user เห็นแค่งานตัวเอง
CREATE POLICY "Users see own records" ON public.qa_records
  FOR SELECT USING (checker_email = auth.jwt()->>'email');

-- qa_records: admin เห็นทั้งหมด
CREATE POLICY "Admins see all records" ON public.qa_records
  FOR SELECT USING (
    auth.jwt()->'user_metadata'->>'role' = 'admin'
  );

-- qa_records: insert ได้เสมอ (หลัง login)
CREATE POLICY "Auth users can insert" ON public.qa_records
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- admin_settings: อ่านได้ทุกคน
CREATE POLICY "Anyone can read settings" ON public.admin_settings
  FOR SELECT USING (true);

-- admin_settings: แก้ไขได้เฉพาะ admin
CREATE POLICY "Only admin can modify settings" ON public.admin_settings
  FOR ALL USING (
    auth.jwt()->'user_metadata'->>'role' = 'admin'
  );

-- 4. ตั้ง admin role สำหรับ user (ตัวอย่าง)
-- UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || '{"role":"admin"}'
-- WHERE email = 'your-admin@email.com';

-- 5. เปิด Realtime สำหรับ qa_records
ALTER PUBLICATION supabase_realtime ADD TABLE public.qa_records;
