-- ════════════════════════════════════════════════════════════
-- ClassVibe — Database Clear Script
-- Run this in Supabase SQL Editor to wipe all user data and
-- start fresh. Schema, functions, and RLS policies are kept.
-- System admin accounts are NOT deleted (re-insert manually).
-- ════════════════════════════════════════════════════════════

BEGIN;

-- 1. Truncate all transactional / user-content tables
--    Use CASCADE to handle FK constraints automatically.

TRUNCATE TABLE
  bookings,
  classes,
  businesses,
  staff,
  reports
CASCADE;

-- 2. Clear auth-linked application data
--    Profiles are tied to auth.users. We clear profiles but
--    leave auth.users intact (Supabase manages those).
TRUNCATE TABLE profiles CASCADE;

-- 3. Clear staff invites if the table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'staff_invites') THEN
    TRUNCATE TABLE staff_invites CASCADE;
  END IF;
END $$;

-- 4. Reset all sequences so IDs start from 1 again
--    (UUID tables have no sequences — nothing to reset)

-- 5. Optionally clear Supabase Storage objects
--    Cannot be done via SQL — use Storage dashboard or API:
--    Dashboard → Storage → business-logos / class-images → select all → delete

COMMIT;

SELECT 'Database cleared successfully. All user data removed, schema intact.' AS result;
