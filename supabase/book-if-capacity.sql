-- Atomic capacity check + increment in a single transaction.
-- Returns true if the booking succeeded (seats were available), false if the class was full.
-- Uses FOR UPDATE to prevent concurrent overbooking.

CREATE OR REPLACE FUNCTION book_if_capacity(p_class_id uuid, p_slots integer DEFAULT 1)
RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE
  current_count integer;
  cap integer;
BEGIN
  SELECT booked_count, capacity
  INTO current_count, cap
  FROM classes
  WHERE id = p_class_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF current_count + p_slots > cap THEN
    RETURN false;
  END IF;

  UPDATE classes
  SET booked_count = booked_count + p_slots
  WHERE id = p_class_id;

  RETURN true;
END;
$$;

-- Grant execute to authenticated and service role
GRANT EXECUTE ON FUNCTION book_if_capacity(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION book_if_capacity(uuid, integer) TO service_role;
