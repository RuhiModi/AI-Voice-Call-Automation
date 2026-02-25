-- ================================================
-- Run this entire file in Supabase SQL Editor
-- Go to: supabase.com → your project → SQL Editor
-- ================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================================================
-- USERS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  company_name TEXT,
  plan TEXT DEFAULT 'free',
  google_sheets_token JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- CAMPAIGNS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  campaign_type TEXT DEFAULT 'custom',
  language_priority TEXT DEFAULT 'gu',
  script_type TEXT DEFAULT 'manual',
  script_content TEXT,
  system_prompt TEXT,
  persona_name TEXT DEFAULT 'Priya',
  persona_tone TEXT DEFAULT 'friendly',
  data_fields JSONB DEFAULT '[]',
  handoff_keywords JSONB DEFAULT '["human","agent","manager","transfer","escalate"]',
  caller_id TEXT,
  max_concurrent_calls INT DEFAULT 5,
  max_retries INT DEFAULT 2,
  retry_gap_minutes INT DEFAULT 30,
  calling_hours_start TIME DEFAULT '09:00',
  calling_hours_end TIME DEFAULT '21:00',
  status TEXT DEFAULT 'draft',
  google_sheet_id TEXT,
  google_sheet_url TEXT,
  schedule_start TIMESTAMPTZ,
  total_contacts INT DEFAULT 0,
  completed_calls INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- CONTACTS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  variables JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending',
  call_count INT DEFAULT 0,
  next_call_at TIMESTAMPTZ,
  last_outcome TEXT,
  do_not_call BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- CALL LOGS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id),
  campaign_id UUID REFERENCES campaigns(id),
  session_id TEXT UNIQUE,
  duration_sec INT DEFAULT 0,
  language_detected TEXT DEFAULT 'gu',
  transcript JSONB DEFAULT '[]',
  outcome TEXT DEFAULT 'in_progress',
  collected_data JSONB DEFAULT '{}',
  recording_url TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

-- ================================================
-- CALLBACKS TABLE (rescheduled calls)
-- ================================================
CREATE TABLE IF NOT EXISTS callbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id),
  campaign_id UUID REFERENCES campaigns(id),
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending',
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- INDEXES for performance
-- ================================================
CREATE INDEX IF NOT EXISTS idx_contacts_campaign ON contacts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_next_call ON contacts(next_call_at);
CREATE INDEX IF NOT EXISTS idx_contacts_dnc ON contacts(do_not_call);
CREATE INDEX IF NOT EXISTS idx_call_logs_campaign ON call_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_session ON call_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_callbacks_scheduled ON callbacks(scheduled_at, status);
CREATE INDEX IF NOT EXISTS idx_campaigns_user ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);

