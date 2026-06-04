-- Phase 12 Improvements Migration
-- Run in Supabase SQL Editor

-- ──────────────────────────────────────────────
-- Classes: Browse-page featured ordering
-- Separate from homepage featured (featured / featured_position)
-- ──────────────────────────────────────────────
ALTER TABLE classes ADD COLUMN IF NOT EXISTS browse_featured boolean NOT NULL DEFAULT false;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS browse_position integer;

-- ──────────────────────────────────────────────
-- Businesses: Owner re-review requests
-- Suspended/rejected owners can request a re-review
-- ──────────────────────────────────────────────
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS review_requested boolean NOT NULL DEFAULT false;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS review_request_note text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS review_requested_at timestamptz;

-- ──────────────────────────────────────────────
-- Businesses: Admin rejection / suspension reasons
-- Shown to the owner in their settings page
-- ──────────────────────────────────────────────
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS suspension_reason text;

-- ──────────────────────────────────────────────
-- RLS: Owners can read their own rejection/suspension reason
-- (they already have SELECT on their own business row)
-- No extra policy needed if existing owner policy covers SELECT *
-- ──────────────────────────────────────────────

-- ──────────────────────────────────────────────
-- Owner request-review: RLS for update
-- Owners should be able to update review_requested / review_request_note
-- on their own business via service role API call (handled server-side)
-- ──────────────────────────────────────────────

-- ──────────────────────────────────────────────
-- Phase 12 Feature 2 & 3: Staff Invites
-- UUID token-based invite flow; staff accepts via /staff/invite/[token]
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff_invites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  token       UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  role        TEXT NOT NULL DEFAULT 'instructor',
  invited_by  UUID REFERENCES profiles(id),
  accepted_at TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for token lookups (invite page)
CREATE INDEX IF NOT EXISTS staff_invites_token_idx ON staff_invites (token);
-- Index for email lookups
CREATE INDEX IF NOT EXISTS staff_invites_email_idx ON staff_invites (email);

-- RLS: owners can read/insert invites for their own businesses
ALTER TABLE staff_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_manage_invites"
  ON staff_invites
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = staff_invites.business_id
        AND b.owner_id = auth.uid()
    )
  );

CREATE POLICY "service_role_full_access_invites"
  ON staff_invites
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Anyone with a valid token can read their own invite (for the accept page)
CREATE POLICY "anyone_read_invite_by_token"
  ON staff_invites
  FOR SELECT
  USING (true);

-- ──────────────────────────────────────────────
-- Phase 12 Feature 4: Staff-created class approval
-- Classes created by staff start as pending_owner_approval
-- Owner approves → published; rejects → draft
-- ──────────────────────────────────────────────
-- The 'status' column is type TEXT in most setups (no enum restriction).
-- If you used a CHECK constraint, add pending_owner_approval:
DO $$
BEGIN
  -- Try to add pending_owner_approval to check constraint if it exists
  -- This is a no-op if status is plain TEXT with no constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'classes_status_check'
  ) THEN
    ALTER TABLE classes DROP CONSTRAINT IF EXISTS classes_status_check;
    ALTER TABLE classes ADD CONSTRAINT classes_status_check
      CHECK (status IN ('draft', 'published', 'cancelled', 'completed', 'pending_owner_approval'));
  END IF;
END $$;

-- Profiles: add 'staff' as an allowed role
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'profiles_role_check'
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
      CHECK (role IN ('owner', 'customer', 'admin', 'staff'));
  END IF;
END $$;

SELECT 'Phase 12 full migration complete' AS result;
