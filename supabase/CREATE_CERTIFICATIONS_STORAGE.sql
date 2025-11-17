-- ============================================
-- SQL TO CREATE CERTIFICATIONS STORAGE
-- Copy and paste this in Supabase Dashboard > SQL Editor
-- ============================================

-- Create storage bucket for certification files (if it doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'certifications'
  ) THEN
    INSERT INTO storage.buckets (id, name, public) 
    VALUES ('certifications', 'certifications', false);
  END IF;
END $$;

-- Create storage policies for certification files
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload their own certification files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own certification files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own certification files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all certification files" ON storage.objects;

-- Users can upload their own certification files
CREATE POLICY "Users can upload their own certification files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'certifications' AND 
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- Users can view their own certification files
CREATE POLICY "Users can view their own certification files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'certifications' AND 
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- Users can delete their own certification files
CREATE POLICY "Users can delete their own certification files" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'certifications' AND 
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- Admins can view all certification files
CREATE POLICY "Admins can view all certification files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'certifications' AND 
  public.is_admin(auth.uid())
);

-- Verify bucket was created
SELECT * FROM storage.buckets WHERE id = 'certifications';


