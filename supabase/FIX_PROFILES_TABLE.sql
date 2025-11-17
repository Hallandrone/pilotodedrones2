-- ============================================
-- SQL TO FIX PROFILES TABLE
-- Copy and paste this in Supabase Dashboard > SQL Editor
-- ============================================

-- Add missing columns to profiles table for pilot profile functionality
-- This checks if columns exist before adding them to avoid errors on re-run
DO $$ 
BEGIN
    -- Add phone column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'phone') THEN
        ALTER TABLE public.profiles ADD COLUMN phone text;
        COMMENT ON COLUMN public.profiles.phone IS 'Pilot phone number';
    END IF;
    
    -- Add bio column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'bio') THEN
        ALTER TABLE public.profiles ADD COLUMN bio text;
        COMMENT ON COLUMN public.profiles.bio IS 'Pilot biography and experience description';
    END IF;
    
    -- Add location column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'location') THEN
        ALTER TABLE public.profiles ADD COLUMN location text;
        COMMENT ON COLUMN public.profiles.location IS 'Pilot city/commune location';
    END IF;
    
    -- Add region column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'region') THEN
        ALTER TABLE public.profiles ADD COLUMN region text;
        COMMENT ON COLUMN public.profiles.region IS 'Pilot region in Chile';
    END IF;
    
    -- Add experience_years column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'experience_years') THEN
        ALTER TABLE public.profiles ADD COLUMN experience_years integer DEFAULT 0;
        COMMENT ON COLUMN public.profiles.experience_years IS 'Years of pilot experience';
    END IF;
    
    -- Add specialties column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'specialties') THEN
        ALTER TABLE public.profiles ADD COLUMN specialties text[] DEFAULT '{}';
        COMMENT ON COLUMN public.profiles.specialties IS 'Array of pilot specialties and skills';
    END IF;
    
    -- Ensure email column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email') THEN
        ALTER TABLE public.profiles ADD COLUMN email text;
        COMMENT ON COLUMN public.profiles.email IS 'User email address';
    END IF;
END $$;

-- Verify the changes
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;


