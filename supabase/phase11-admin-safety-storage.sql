-- Phase 11 Continuation: admin safety, storage, featured placement, reports
-- Run this in Supabase SQL Editor after phases 10 and 11.
-- This file is idempotent: it is safe to run more than once.

-- ===================== PROFILES =====================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email       text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS image_url   text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status      text NOT NULL DEFAULT 'active';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_at  timestamptz NOT NULL DEFAULT now();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at  timestamptz NOT NULL DEFAULT now();

-- ===================== BUSINESSES =====================
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS logo_url      text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS approved_at   timestamptz;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS approval_note text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS archived_at   timestamptz;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS deleted_at    timestamptz;

-- Suggested business statuses:
-- pending_approval | active | rejected | suspended | archived

-- ===================== CLASSES / EVENTS =====================
ALTER TABLE classes ADD COLUMN IF NOT EXISTS featured                 boolean NOT NULL DEFAULT false;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS featured_position        int;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS featured_label           text;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS featured_until           timestamptz;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS featured_by_admin        boolean NOT NULL DEFAULT false;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS featured_request_status  text NOT NULL DEFAULT 'none';
ALTER TABLE classes ADD COLUMN IF NOT EXISTS featured_request_note    text;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS featured_requested_at    timestamptz;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS archived_at              timestamptz;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS deleted_at               timestamptz;

CREATE INDEX IF NOT EXISTS classes_featured_position_idx
  ON classes (featured, featured_position, date);

CREATE INDEX IF NOT EXISTS classes_featured_request_status_idx
  ON classes (featured_request_status);

-- ===================== REPORTS =====================
CREATE TABLE IF NOT EXISTS reports (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type    text NOT NULL CHECK (entity_type IN ('class', 'business', 'staff')),
  entity_id      uuid NOT NULL,
  reason         text NOT NULL,
  details        text,
  reporter_name  text,
  reporter_email text,
  status         text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
  admin_note     text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  resolved_at    timestamptz
);

CREATE INDEX IF NOT EXISTS reports_status_created_at_idx
  ON reports (status, created_at DESC);

CREATE INDEX IF NOT EXISTS reports_entity_idx
  ON reports (entity_type, entity_id);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- ===================== ADMIN USER INVITES =====================
CREATE TABLE IF NOT EXISTS admin_user_invites (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email                text NOT NULL,
  full_name            text,
  phone                text,
  role                 text NOT NULL CHECK (role IN ('customer', 'owner', 'staff', 'admin')),
  business_id          uuid REFERENCES businesses(id) ON DELETE SET NULL,
  status               text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'accepted', 'cancelled')),
  invite_note          text,
  created_by           uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_user_invites_email_idx
  ON admin_user_invites (lower(email));

ALTER TABLE admin_user_invites ENABLE ROW LEVEL SECURITY;

-- ===================== ADMIN HELPER =====================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
      AND status = 'active'
  );
$$;

-- ===================== REPORT POLICIES =====================
DROP POLICY IF EXISTS "Anyone can create reports" ON reports;
CREATE POLICY "Anyone can create reports"
  ON reports FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can read reports" ON reports;
CREATE POLICY "Admins can read reports"
  ON reports FOR SELECT
  TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can update reports" ON reports;
CREATE POLICY "Admins can update reports"
  ON reports FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ===================== INVITE POLICIES =====================
DROP POLICY IF EXISTS "Admins can manage user invites" ON admin_user_invites;
CREATE POLICY "Admins can manage user invites"
  ON admin_user_invites FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ===================== STORAGE BUCKETS =====================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('class-images', 'class-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('profile-images', 'profile-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('business-logos', 'business-logos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE SET
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

DROP POLICY IF EXISTS "Phase 11 class images public read" ON storage.objects;
CREATE POLICY "Phase 11 class images public read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'class-images');

DROP POLICY IF EXISTS "Phase 11 class images authenticated upload" ON storage.objects;
CREATE POLICY "Phase 11 class images authenticated upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'class-images');

DROP POLICY IF EXISTS "Phase 11 class images authenticated update" ON storage.objects;
CREATE POLICY "Phase 11 class images authenticated update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'class-images')
  WITH CHECK (bucket_id = 'class-images');

DROP POLICY IF EXISTS "Phase 11 class images authenticated delete" ON storage.objects;
CREATE POLICY "Phase 11 class images authenticated delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'class-images');

DROP POLICY IF EXISTS "Phase 11 profile images public read" ON storage.objects;
CREATE POLICY "Phase 11 profile images public read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'profile-images');

DROP POLICY IF EXISTS "Phase 11 profile images authenticated upload" ON storage.objects;
CREATE POLICY "Phase 11 profile images authenticated upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'profile-images');

DROP POLICY IF EXISTS "Phase 11 business logos public read" ON storage.objects;
CREATE POLICY "Phase 11 business logos public read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'business-logos');

DROP POLICY IF EXISTS "Phase 11 business logos authenticated upload" ON storage.objects;
CREATE POLICY "Phase 11 business logos authenticated upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'business-logos');

GRANT SELECT, INSERT, UPDATE ON reports TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON admin_user_invites TO authenticated;
