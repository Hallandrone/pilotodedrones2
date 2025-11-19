-- Add Instagram and LinkedIn username fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS instagram_username TEXT,
ADD COLUMN IF NOT EXISTS linkedin_username TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.instagram_username IS 'Instagram username (without @ symbol or URL)';
COMMENT ON COLUMN public.profiles.linkedin_username IS 'LinkedIn username (without URL, just the username from linkedin.com/in/username)';

