-- Add public_profile_slug field to profiles table
-- This allows users with paid plans to customize their public profile URL
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS public_profile_slug TEXT;

-- Create unique index to ensure slug uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS profiles_public_profile_slug_unique 
ON public.profiles(public_profile_slug) 
WHERE public_profile_slug IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.public_profile_slug IS 'Custom URL slug for public profile (e.g., /pilot/nombreusuario). Only available for users with active paid subscription. Must be unique, lowercase, alphanumeric with hyphens and underscores only.';

