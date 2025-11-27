-- Add missing fields to companies table for complete company profile
DO $$ 
BEGIN
    -- Add phone column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'phone') THEN
        ALTER TABLE public.companies ADD COLUMN phone TEXT;
        COMMENT ON COLUMN public.companies.phone IS 'Company contact phone number';
    END IF;
    
    -- Add email column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'email') THEN
        ALTER TABLE public.companies ADD COLUMN email TEXT;
        COMMENT ON COLUMN public.companies.email IS 'Company contact email (optional, can use profile email)';
    END IF;
    
    -- Add location column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'location') THEN
        ALTER TABLE public.companies ADD COLUMN location TEXT;
        COMMENT ON COLUMN public.companies.location IS 'Company city/commune location';
    END IF;
    
    -- Add region column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'region') THEN
        ALTER TABLE public.companies ADD COLUMN region TEXT;
        COMMENT ON COLUMN public.companies.region IS 'Company region in Chile';
    END IF;
    
    -- Add experience_years column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'experience_years') THEN
        ALTER TABLE public.companies ADD COLUMN experience_years INTEGER DEFAULT 0;
        COMMENT ON COLUMN public.companies.experience_years IS 'Years of company operation experience';
    END IF;
    
    -- Add services column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'services') THEN
        ALTER TABLE public.companies ADD COLUMN services TEXT[] DEFAULT '{}';
        COMMENT ON COLUMN public.companies.services IS 'Services offered by the company';
    END IF;
    
    -- Add drone_types column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'drone_types') THEN
        ALTER TABLE public.companies ADD COLUMN drone_types TEXT[] DEFAULT '{}';
        COMMENT ON COLUMN public.companies.drone_types IS 'Types of drones the company works with';
    END IF;
    
    -- Add instagram_username column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'instagram_username') THEN
        ALTER TABLE public.companies ADD COLUMN instagram_username TEXT;
        COMMENT ON COLUMN public.companies.instagram_username IS 'Company Instagram username';
    END IF;
    
    -- Add linkedin_username column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'linkedin_username') THEN
        ALTER TABLE public.companies ADD COLUMN linkedin_username TEXT;
        COMMENT ON COLUMN public.companies.linkedin_username IS 'Company LinkedIn username';
    END IF;
    
    -- Add instagram_url column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'instagram_url') THEN
        ALTER TABLE public.companies ADD COLUMN instagram_url TEXT;
        COMMENT ON COLUMN public.companies.instagram_url IS 'Company Instagram full URL';
    END IF;
    
    -- Add linkedin_url column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'linkedin_url') THEN
        ALTER TABLE public.companies ADD COLUMN linkedin_url TEXT;
        COMMENT ON COLUMN public.companies.linkedin_url IS 'Company LinkedIn full URL';
    END IF;
END $$;

-- Ensure profiles table has public_profile_slug for companies too
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'public_profile_slug') THEN
        ALTER TABLE public.profiles ADD COLUMN public_profile_slug TEXT;
        COMMENT ON COLUMN public.profiles.public_profile_slug IS 'Custom public profile URL slug';
    END IF;
END $$;

