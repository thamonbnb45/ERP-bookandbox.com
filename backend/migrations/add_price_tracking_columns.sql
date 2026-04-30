-- ===== Price Tracking System: Database Migration =====
-- Paste this in Supabase Dashboard → SQL Editor → Run

ALTER TABLE customer_quotes ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'quote';
ALTER TABLE customer_quotes ADD COLUMN IF NOT EXISTS round_number INTEGER DEFAULT 1;
ALTER TABLE customer_quotes ADD COLUMN IF NOT EXISTS quote_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE customer_quotes ADD COLUMN IF NOT EXISTS rejection_reason TEXT DEFAULT '';
ALTER TABLE customer_quotes ADD COLUMN IF NOT EXISTS ref_quote_id UUID;
