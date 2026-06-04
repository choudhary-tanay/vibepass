-- Phase 10: Admin Panel
-- Run this in Supabase SQL Editor

-- 1. Add is_admin_hidden flag to classes
--    Allows admin to hide a class from the public marketplace without changing its status
ALTER TABLE classes ADD COLUMN IF NOT EXISTS is_admin_hidden boolean NOT NULL DEFAULT false;

-- 2. Helper function to check admin role WITHOUT triggering RLS
--    SECURITY DEFINER bypasses RLS when querying profiles, breaking the infinite recursion
--    that occurs when admin policies on other tables try to check profiles, which itself
--    has an admin policy that checks profiles again.
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- 3. Drop old policies if they exist (safe re-run)
DROP POLICY IF EXISTS "Admins can read all businesses" ON businesses;
DROP POLICY IF EXISTS "Admins can read all classes" ON classes;
DROP POLICY IF EXISTS "Admins can read all bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can read all payments" ON payments;

-- 4. Admin read policies — use the SECURITY DEFINER function to avoid recursion

-- Businesses: admins can read all
CREATE POLICY "Admins can read all businesses"
  ON businesses FOR SELECT
  USING (public.is_current_user_admin());

-- Classes: admins can read all (including hidden ones)
CREATE POLICY "Admins can read all classes"
  ON classes FOR SELECT
  USING (public.is_current_user_admin());

-- Bookings: admins can read all
CREATE POLICY "Admins can read all bookings"
  ON bookings FOR SELECT
  USING (public.is_current_user_admin());

-- Profiles: admins can read all
CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  USING (public.is_current_user_admin());

-- Payments: admins can read all
CREATE POLICY "Admins can read all payments"
  ON payments FOR SELECT
  USING (public.is_current_user_admin());

-- 5. Promote a user to admin
--    After running this file, run:
--
--    UPDATE profiles SET role = 'admin' WHERE email = 'your-admin-email@example.com';
--
--    The user must have already signed up via /auth/signup first.
