-- Phase 11: Storage bucket for class images
-- Run this in Supabase SQL Editor

-- Create the bucket (public so images are accessible without auth)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'class-images',
  'class-images',
  true,
  5242880,  -- 5 MB max
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users (owners) to upload
CREATE POLICY "Owners can upload class images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'class-images');

-- Allow authenticated users to update/delete their own uploads
CREATE POLICY "Owners can update class images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'class-images');

CREATE POLICY "Owners can delete class images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'class-images');

-- Allow public read access
CREATE POLICY "Public can view class images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'class-images');
