-- NF-1H: Class edit/duplicate, sponsor dedupe, and customer bookings fix
-- Adds durable class artwork preferences and protects class sponsor assignments
-- from duplicate attach/edit cycles.

ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS artwork_variant TEXT NOT NULL DEFAULT 'primary',
  ADD COLUMN IF NOT EXISTS artwork_text_color TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'classes_artwork_variant_check'
  ) THEN
    ALTER TABLE classes
      ADD CONSTRAINT classes_artwork_variant_check
      CHECK (artwork_variant IN ('primary', 'alternate'));
  END IF;
END $$;

ALTER TABLE sponsors
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

ALTER TABLE class_sponsors
  ADD COLUMN IF NOT EXISTS sponsor_cover_image_url TEXT;

UPDATE class_sponsors cs
SET sponsor_cover_image_url = s.cover_image_url
FROM sponsors s
WHERE cs.sponsor_id = s.id
  AND cs.sponsor_cover_image_url IS NULL
  AND s.cover_image_url IS NOT NULL;

-- Keep the newest class sponsor assignment when the same sponsor was attached
-- repeatedly to one class.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY class_id, sponsor_id
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
    ) AS row_num
  FROM class_sponsors
  WHERE sponsor_id IS NOT NULL
)
DELETE FROM class_sponsors cs
USING ranked r
WHERE cs.id = r.id
  AND r.row_num > 1;

CREATE UNIQUE INDEX IF NOT EXISTS class_sponsors_unique_class_sponsor_idx
  ON class_sponsors (class_id, sponsor_id)
  WHERE sponsor_id IS NOT NULL;

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY class_id, lower(coalesce(nullif(sponsor_display_name, ''), nullif(note, '')))
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
    ) AS row_num
  FROM class_sponsors
  WHERE sponsor_id IS NULL
    AND coalesce(nullif(sponsor_display_name, ''), nullif(note, '')) IS NOT NULL
)
DELETE FROM class_sponsors cs
USING ranked r
WHERE cs.id = r.id
  AND r.row_num > 1;

CREATE UNIQUE INDEX IF NOT EXISTS class_sponsors_unique_custom_display_idx
  ON class_sponsors (class_id, lower(coalesce(nullif(sponsor_display_name, ''), nullif(note, ''))))
  WHERE sponsor_id IS NULL
    AND coalesce(nullif(sponsor_display_name, ''), nullif(note, '')) IS NOT NULL;

ALTER TABLE class_expenses
  DROP CONSTRAINT IF EXISTS class_expenses_category_check;

ALTER TABLE class_expenses
  ADD CONSTRAINT class_expenses_category_check CHECK (
    category IN (
      'venue',
      'equipment',
      'marketing',
      'materials',
      'refreshments',
      'travel',
      'staff',
      'miscellaneous',
      'supplies',
      'technology',
      'insurance',
      'other'
    )
  );

COMMENT ON COLUMN classes.artwork_variant IS
  'Selected generated artwork variant for fallback class covers.';

COMMENT ON COLUMN classes.artwork_text_color IS
  'Optional text color used by generated class cover artwork.';
