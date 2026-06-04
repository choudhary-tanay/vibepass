-- Phase 5: Customer booking visibility + cancellation
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query → paste → Run)

-- 1. Allow logged-in customers to view their own bookings
--    (matches the customer_email stored in the booking row to the email in the JWT)
CREATE POLICY "Customers can view own bookings" ON bookings
  FOR SELECT USING (
    customer_email = (auth.jwt() ->> 'email')
  );

-- 2. cancel_booking function
--    Marks the booking cancelled and restores the seat.
--    SECURITY DEFINER: runs with the function owner's privileges so it can
--    update both rows even if the caller only has limited RLS access.
CREATE OR REPLACE FUNCTION cancel_booking(p_booking_id UUID)
RETURNS VOID SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_class_id    UUID;
  v_class_date  DATE;
  v_class_start TIME;
  v_cust_email  TEXT;
BEGIN
  -- Get booking details (must exist and be confirmed)
  SELECT class_id, customer_email
  INTO   v_class_id, v_cust_email
  FROM   public.bookings
  WHERE  id = p_booking_id AND booking_status = 'confirmed';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found or already cancelled';
  END IF;

  -- Only the customer who made the booking can cancel it
  IF v_cust_email != (auth.jwt() ->> 'email') THEN
    RAISE EXCEPTION 'Not authorised to cancel this booking';
  END IF;

  -- Get class start date/time
  SELECT date, start_time
  INTO   v_class_date, v_class_start
  FROM   public.classes
  WHERE  id = v_class_id;

  -- Block cancellation if the class has already started
  IF (v_class_date + v_class_start) <= CURRENT_TIMESTAMP THEN
    RAISE EXCEPTION 'Cannot cancel after the class has started';
  END IF;

  -- Mark the booking as cancelled
  UPDATE public.bookings
  SET    booking_status = 'cancelled'
  WHERE  id = p_booking_id;

  -- Restore the seat (never let it go below 0)
  UPDATE public.classes
  SET    booked_count = GREATEST(0, booked_count - 1)
  WHERE  id = v_class_id;
END;
$$ LANGUAGE plpgsql;
