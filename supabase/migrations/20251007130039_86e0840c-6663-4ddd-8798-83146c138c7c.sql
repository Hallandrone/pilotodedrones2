-- Update the handle_new_user function to include the new super admin email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
      WHEN LOWER(NEW.email) IN (
        LOWER('Hahumada@academiadronchile.cl'),
        LOWER('cofre@live.cl')
      ) THEN 'super_admin'::public.user_role
      ELSE COALESCE((NEW.raw_user_meta_data->>'user_type')::public.user_role, 'pilot'::public.user_role)
    END
  );
  
  RETURN NEW;
END;
$function$;