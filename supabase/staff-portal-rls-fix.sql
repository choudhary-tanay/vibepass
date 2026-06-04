-- ══════════════════════════════════════════════════════════════
-- STAFF PORTAL RLS FIX — resolves infinite recursion
-- Run this immediately in Supabase SQL Editor.
--
-- Root cause: staff-portal-rls.sql added policies on `businesses`
-- and `classes` that query the `staff` table. Phase 7's existing
-- staff policy queries `businesses`. This creates a cycle:
--   businesses policy → queries staff
--   → staff policy → queries businesses
--   → businesses policy → queries staff → ∞
-- ══════════════════════════════════════════════════════════════

-- Drop the two recursive cross-table policies
DROP POLICY IF EXISTS "staff_read_linked_business" ON businesses;
DROP POLICY IF EXISTS "staff_read_own_business_classes" ON classes;

-- The following policies are SAFE (no cross-table subqueries) and stay:
--   "staff_read_own_record"     ON staff → uses only auth.uid() / auth.email()
--   "staff_update_own_profile"  ON staff → same
--   "staff_update_own_profile"  ON staff → same
-- Staff portal server pages use supabaseAdmin (service role) to read
-- business and class data — no client-side RLS needed for that.

SELECT 'Infinite recursion fixed. Businesses and classes are accessible again.' AS result;
