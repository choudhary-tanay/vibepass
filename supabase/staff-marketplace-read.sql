-- ══════════════════════════════════════════════════════════════
-- Staff Marketplace Read Policy
-- Run this in Supabase SQL Editor.
-- Safe to run multiple times (DROP IF EXISTS guard).
--
-- Problem: phase11 policy "Public can view visible staff profiles"
-- only allowed reads when public_profile_visible = true (default: false).
-- This meant instructor images never showed on the marketplace for
-- staff who hadn't explicitly opted into public visibility.
--
-- Fix: allow public reads for ALL active staff in active, marketplace-
-- visible businesses. The public_profile_visible flag still controls
-- whether the instructor profile page is linked/clickable — it no
-- longer gates visibility of the image on class cards.
-- ══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Public can view visible staff profiles" ON staff;

CREATE POLICY "Public can read staff in marketplace businesses"
  ON staff FOR SELECT
  USING (
    status = 'active'
    AND business_id IN (
      SELECT id FROM businesses
      WHERE status = 'active' AND is_marketplace_visible = true
    )
  );

-- Ensure anon role has SELECT on staff (idempotent)
GRANT SELECT ON staff TO anon;

SELECT 'Staff marketplace read policy applied' AS result;
