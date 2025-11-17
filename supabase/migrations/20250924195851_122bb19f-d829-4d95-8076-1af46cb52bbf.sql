-- Add email column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN email text;

-- Update the handle_new_user function to include email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public 
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
      WHEN NEW.email = 'Hahumada@academiadronchile.cl' THEN 'super_admin'::public.user_role
      ELSE COALESCE((NEW.raw_user_meta_data->>'user_type')::public.user_role, 'pilot'::public.user_role)
    END
  );
  
  RETURN NEW;
END;
$$;