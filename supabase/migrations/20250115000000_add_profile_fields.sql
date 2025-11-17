-- Add missing columns to profiles table for pilot profile functionality
ALTER TABLE public.profiles 
ADD COLUMN phone text,
ADD COLUMN bio text,
ADD COLUMN location text,
ADD COLUMN region text,
ADD COLUMN experience_years integer DEFAULT 0,
ADD COLUMN specialties text[] DEFAULT '{}';

-- Add comment to describe the new columns
COMMENT ON COLUMN public.profiles.phone IS 'Pilot phone number';
COMMENT ON COLUMN public.profiles.bio IS 'Pilot biography and experience description';
COMMENT ON COLUMN public.profiles.location IS 'Pilot city/commune location';
COMMENT ON COLUMN public.profiles.region IS 'Pilot region in Chile';
COMMENT ON COLUMN public.profiles.experience_years IS 'Years of pilot experience';
COMMENT ON COLUMN public.profiles.specialties IS 'Array of pilot specialties and skills';

-- Update the handle_new_user function to include the new fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public 
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, user_type, email, phone, bio, location, region, experience_years, specialties)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'pilot'),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'bio',
    NEW.raw_user_meta_data->>'location',
    NEW.raw_user_meta_data->>'region',
    COALESCE((NEW.raw_user_meta_data->>'experience_years')::integer, 0),
    COALESCE((NEW.raw_user_meta_data->>'specialties')::text[], '{}')
  );
  
  INSERT INTO public.user_roles (id, role)
  VALUES (
    NEW.id,
    CASE 
      WHEN NEW.email = 'Hahumada@academiadronchile.cl' THEN 'super_admin'::public.user_role
      ELSE COALESCE((NEW.raw_user_meta_data->>'user_type')::public.user_role, 'pilot'::public.user_role)
    END
  );
  
  RETURN NEW;
END;
$$;

