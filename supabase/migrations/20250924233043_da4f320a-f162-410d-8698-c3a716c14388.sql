-- Fix the email comparison in the handle_new_user function to be case-insensitive
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, user_type, email)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'pilot'),
    NEW.email
  );
  
  INSERT INTO public.user_roles (id, role)
  VALUES (
    NEW.id,
    CASE 
      WHEN LOWER(NEW.email) = LOWER('Hahumada@academiadronchile.cl') THEN 'super_admin'::public.user_role
      ELSE COALESCE((NEW.raw_user_meta_data->>'user_type')::public.user_role, 'pilot'::public.user_role)
    END
  );
  
  RETURN NEW;
END;
$$;

-- Update the existing user role to super_admin
UPDATE public.user_roles 
SET role = 'super_admin'::public.user_role 
WHERE id = '0c697ca0-f61d-4b2b-99c2-c0337df90437';