-- NF-1G: Sponsor branding for marketplace visibility
-- Adds optional sponsor cover artwork used on marketplace class cards.

ALTER TABLE sponsors
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

ALTER TABLE class_sponsors
  ADD COLUMN IF NOT EXISTS sponsor_cover_image_url TEXT;

COMMENT ON COLUMN sponsors.cover_image_url IS
  'Optional sponsor cover image used for public sponsor branding.';

COMMENT ON COLUMN class_sponsors.sponsor_cover_image_url IS
  'Optional public cover image override for this class sponsorship.';
