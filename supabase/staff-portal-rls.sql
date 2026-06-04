-- Staff Portal RLS + User Linking
-- Run AFTER phase12-improvements.sql in Supabase SQL Editor

-- ──────────────────────────────────────────────────────────────
-- 1. Link auth user to their staff record
-- ──────────────────────────────────────────────────────────────
ALTER TABLE staff ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS staff_user_id_idx ON staff (user_id);

-- ──────────────────────────────────────────────────────────────
-- 2. Staff can read their own record (matched by user_id or email)
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "staff_read_own_record" ON staff;
CREATE POLICY "staff_read_own_record"
  ON staff FOR SELECT
  USING (
    user_id = auth.uid()
    OR email = auth.email()
  );

-- ──────────────────────────────────────────────────────────────
-- 3. Staff can update their own profile fields (bio, specialties etc.)
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "staff_update_own_profile" ON staff;
CREATE POLICY "staff_update_own_profile"
  ON staff FOR UPDATE
  USING (user_id = auth.uid() OR email = auth.email())
  WITH CHECK (user_id = auth.uid() OR email = auth.email());

-- ──────────────────────────────────────────────────────────────
-- 4. Staff can read their linked business (needed for dashboard)
-- ──────────────────────────────────────────────────────────────
-- The businesses table already has public SELECT (anon/authenticated).
-- If you have restricted RLS on businesses, add this:
DROP POLICY IF EXISTS "staff_read_linked_business" ON businesses;
CREATE POLICY "staff_read_linked_business"
  ON businesses FOR SELECT
  USING (
    id IN (
      SELECT business_id FROM staff
      WHERE user_id = auth.uid() OR email = auth.email()
    )
    OR owner_id = auth.uid()
  );

-- ──────────────────────────────────────────────────────────────
-- 5. Staff can read classes for their linked business
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "staff_read_own_business_classes" ON classes;
CREATE POLICY "staff_read_own_business_classes"
  ON classes FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM staff
      WHERE user_id = auth.uid() OR email = auth.email()
    )
  );

SELECT 'Staff portal RLS migration complete' AS result;
