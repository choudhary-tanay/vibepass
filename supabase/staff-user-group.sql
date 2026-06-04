-- ══════════════════════════════════════════════════════════════
-- Staff User Group Column
-- Run this in Supabase SQL Editor if staff.user_group is missing.
-- Safe to run multiple times (IF NOT EXISTS guard).
-- ══════════════════════════════════════════════════════════════

ALTER TABLE staff ADD COLUMN IF NOT EXISTS user_group TEXT NOT NULL DEFAULT 'instructor'
  CHECK (user_group IN ('instructor', 'management'));

-- Grant authenticated users permission to read/write this column
-- (covered by existing table-level grants, but explicit is safer)
GRANT SELECT, UPDATE (user_group) ON staff TO authenticated;

SELECT 'staff.user_group column is ready' AS result;
