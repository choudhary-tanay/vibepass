-- ============================================================
-- Phase 4: Authentication + Row Level Security
-- Run this AFTER supabase/schema.sql from Phase 3
-- Supabase Dashboard → SQL Editor → New query → paste → Run
-- ============================================================

-- IMPORTANT: Before testing signups, go to:
--   Supabase Dashboard → Authentication → Email → disable "Confirm email"
-- This lets signups work immediately without email verification.

-- Profiles table — stores display name, phone, and role for each auth user
CREATE TABLE IF NOT EXISTS profiles (
  id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name  TEXT NOT NULL,
  phone TEXT,
  role  TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('owner', 'customer', 'admin'))
);

-- Enable Row Level Security on every table
ALTER TABLE profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings   ENABLE ROW LEVEL SECURITY;

-- ===================== PROFILES =====================
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- ===================== BUSINESSES =====================
-- Anyone can browse active marketplace businesses
CREATE POLICY "Public can view active businesses" ON businesses
  FOR SELECT USING (status = 'active' AND is_marketplace_visible = TRUE);

-- Owners can see their own business even if hidden/inactive
CREATE POLICY "Owners can view own business" ON businesses
  FOR SELECT USING (auth.uid() = owner_id);

-- Owners can create their own business
CREATE POLICY "Owners can insert own business" ON businesses
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Owners can edit their own business
CREATE POLICY "Owners can update own business" ON businesses
  FOR UPDATE USING (auth.uid() = owner_id);

-- ===================== CLASSES =====================
-- Anyone can browse published classes
CREATE POLICY "Public can view published classes" ON classes
  FOR SELECT USING (status = 'published');

-- Owners can see ALL classes for their business (including drafts)
CREATE POLICY "Owners can view own classes" ON classes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = classes.business_id
        AND businesses.owner_id = auth.uid()
    )
  );

-- Owners can create classes for their business
CREATE POLICY "Owners can insert own classes" ON classes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = business_id
        AND businesses.owner_id = auth.uid()
    )
  );

-- Owners can edit their own classes
CREATE POLICY "Owners can update own classes" ON classes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = business_id
        AND businesses.owner_id = auth.uid()
    )
  );

-- ===================== BOOKINGS =====================
-- Anyone (including guests) can create a booking
CREATE POLICY "Anyone can create booking" ON bookings
  FOR INSERT WITH CHECK (TRUE);

-- Owners can see bookings for their classes
CREATE POLICY "Owners can view own bookings" ON bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM classes c
      JOIN businesses b ON b.id = c.business_id
      WHERE c.id = bookings.class_id
        AND b.owner_id = auth.uid()
    )
  );

-- ===================== GRANT PERMISSIONS =====================
GRANT SELECT, INSERT, UPDATE ON profiles   TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON businesses TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON classes    TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON bookings   TO anon, authenticated;

-- Recreate increment_booked_count as SECURITY DEFINER so guest bookings
-- can increment booked_count even though anon cannot UPDATE classes directly.
CREATE OR REPLACE FUNCTION increment_booked_count(p_class_id UUID)
RETURNS VOID
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.classes SET booked_count = booked_count + 1 WHERE id = p_class_id;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION increment_booked_count(uuid) TO anon, authenticated;
