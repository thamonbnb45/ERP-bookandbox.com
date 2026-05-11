-- Migration: Create time_logs table for Time Logger system

CREATE TABLE IF NOT EXISTS public.time_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_name TEXT NOT NULL,
    task_name TEXT NOT NULL,
    category TEXT,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER DEFAULT 0,
    status TEXT DEFAULT 'running', -- 'running', 'paused', 'completed'
    quantity INTEGER,
    completion_percent INTEGER,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS) but allow anon access for now (since we use anon key in backend)
ALTER TABLE public.time_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations for anon" ON public.time_logs FOR ALL USING (true);
