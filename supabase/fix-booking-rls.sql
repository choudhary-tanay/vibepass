-- Fix: Ensure booking INSERT policy allows anyone to create a booking
-- Also grant EXECUTE on the Phase 5 cancel_booking function
-- Run this in: Supabase Dashboard → SQL Editor → New query → paste → Run

-- Drop and recreate the INSERT policy to ensure it exists
DROP POLICY IF EXISTS "Anyone can create booking" ON bookings;
CREATE POLICY "Anyone can create booking" ON bookings
  FOR INSERT WITH CHECK (TRUE);

-- Allow authenticated users to call the cancel_booking function
-- (SECURITY DEFINER functions require explicit GRANT to be callable)
GRANT EXECUTE ON FUNCTION cancel_booking(uuid) TO authenticated;
