-- Phase 11: Pre-Launch Product Improvements
-- Run this in Supabase SQL Editor

-- ===================== CLASSES — richer event fields =====================
ALTER TABLE classes ADD COLUMN IF NOT EXISTS tagline               text;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS what_to_expect        text;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS who_this_is_for       text;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS what_to_bring         text;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS difficulty_level      text;   -- beginner | intermediate | advanced | all_levels
ALTER TABLE classes ADD COLUMN IF NOT EXISTS tags                  text[]; -- e.g. ['morning','high-energy']
ALTER TABLE classes ADD COLUMN IF NOT EXISTS image_url             text;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS location_type         text NOT NULL DEFAULT 'in_person'; -- in_person | online | hybrid
ALTER TABLE classes ADD COLUMN IF NOT EXISTS venue_details         text;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS online_link           text;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS cancellation_policy   text;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS refund_policy_summary text;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS featured              boolean NOT NULL DEFAULT false;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS age_suitability       text;

-- ===================== BOOKINGS — optional customer insights =====================
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS age_range         text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS gender            text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS experience_level  text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS goals             text[];
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS health_note       text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS marketing_consent boolean NOT NULL DEFAULT false;

-- ===================== STAFF — richer instructor profiles =====================
ALTER TABLE staff ADD COLUMN IF NOT EXISTS image_url              text;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS bio                    text;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS specialties            text[];
ALTER TABLE staff ADD COLUMN IF NOT EXISTS experience_years       int;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS instagram_url          text;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS website_url            text;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS public_profile_visible boolean NOT NULL DEFAULT false;

-- ===================== PUBLIC STAFF VISIBILITY RLS =====================
-- Allow anyone to read staff profiles where the owner has enabled public visibility.
-- Owners already have full access via phase7-staff.sql ("Owners can manage own staff").
DROP POLICY IF EXISTS "Public can view visible staff profiles" ON staff;
CREATE POLICY "Public can view visible staff profiles"
  ON staff FOR SELECT
  USING (public_profile_visible = true);

-- Grant anon SELECT on staff so public profiles can be fetched without login
GRANT SELECT ON staff TO anon;
