-- PromptShare Cloud — Likes & Views
-- Incremental migration over 0001_initial_schema.sql

-- 1. Add counter columns to ps_prompt_case
ALTER TABLE ps_prompt_case ADD COLUMN IF NOT EXISTS view_count INT NOT NULL DEFAULT 0;
ALTER TABLE ps_prompt_case ADD COLUMN IF NOT EXISTS like_count INT NOT NULL DEFAULT 0;

-- 2. Likes table
CREATE TABLE IF NOT EXISTS ps_prompt_case_like (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES ps_user(id) ON DELETE CASCADE,
  case_id    TEXT NOT NULL REFERENCES ps_prompt_case(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, case_id)
);
CREATE INDEX IF NOT EXISTS idx_like_case ON ps_prompt_case_like(case_id);

-- 3. Views table
CREATE TABLE IF NOT EXISTS ps_prompt_case_view (
  id         TEXT PRIMARY KEY,
  case_id    TEXT NOT NULL REFERENCES ps_prompt_case(id) ON DELETE CASCADE,
  user_id    TEXT,
  ip_hash    TEXT NOT NULL,
  user_agent TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_view_case_time     ON ps_prompt_case_view(case_id, created_at);
CREATE INDEX IF NOT EXISTS idx_view_user_case_time ON ps_prompt_case_view(user_id, case_id, created_at);
CREATE INDEX IF NOT EXISTS idx_view_ip_case_time   ON ps_prompt_case_view(ip_hash, case_id, created_at);
