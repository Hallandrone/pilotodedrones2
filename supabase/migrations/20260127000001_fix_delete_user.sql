
-- Update the delete_user function to be more robust and include the new platform_feedback table
CREATE OR REPLACE FUNCTION delete_user(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  calling_user_role TEXT;
  is_caller_super_admin BOOLEAN;
BEGIN
  -- Get the role of the user calling this function from user_roles
  SELECT role INTO calling_user_role
  FROM public.user_roles 
  WHERE id = auth.uid()
  LIMIT 1;

  -- Fallback check for super_admin directly from profiles if user_roles entry is missing
  -- This handles the case where a super_admin might not have their role entry yet
  IF calling_user_role IS NULL THEN
    SELECT user_type INTO calling_user_role
    FROM public.profiles
    WHERE id = auth.uid()
    LIMIT 1;
  END IF;

  -- Only allow admins or super admins to delete users
  IF calling_user_role IS NULL OR calling_user_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Solo los administradores pueden eliminar usuarios. Tu rol actual es: %', COALESCE(calling_user_role, 'no identificado');
  END IF;

  -- 1. Delete platform_feedback (this was causing FK violations)
  -- The table might not exist in all environments yet, so we use dynamic SQL to avoid compilation errors
  BEGIN
    EXECUTE 'DELETE FROM public.platform_feedback WHERE user_id = $1' USING target_user_id;
  EXCEPTION WHEN undefined_table THEN
    -- Table doesn't exist, ignore
  END;

  -- 2. Delete user_permissions
  DELETE FROM public.user_permissions WHERE user_id = target_user_id;
  
  -- 3. Delete notifications
  DELETE FROM public.notifications WHERE user_id = target_user_id;
  
  -- 4. Delete profile views
  DELETE FROM public.profile_views WHERE profile_id = target_user_id;
  
  -- 5. Delete profile contacts
  DELETE FROM public.profile_contacts WHERE profile_id = target_user_id;
  
  -- 6. Delete profile slug history
  DELETE FROM public.profile_slug_history WHERE user_id = target_user_id;
  
  -- 7. Delete company pilot invitations
  DELETE FROM public.company_pilot_invitations WHERE pilot_id = target_user_id OR invited_by = target_user_id;
  
  -- 8. Delete company pilots
  DELETE FROM public.company_pilots WHERE pilot_id = target_user_id;
  
  -- 9. Update flight logs (set to NULL)
  UPDATE public.flight_logs SET validated_by = NULL WHERE validated_by = target_user_id;
  
  -- 10. Delete flight logs
  DELETE FROM public.flight_logs WHERE user_id = target_user_id;
  
  -- 11. Update companies
  UPDATE public.companies SET certification_validated_by = NULL WHERE certification_validated_by = target_user_id;
  
  -- 12. Delete companies
  DELETE FROM public.companies WHERE user_id = target_user_id;
  
  -- 13. Delete pilot services
  DELETE FROM public.pilot_services WHERE pilot_id IN (SELECT id FROM public.pilots WHERE user_id = target_user_id);
  
  -- 14. Delete pilots
  DELETE FROM public.pilots WHERE user_id = target_user_id;
  
  -- 15. Delete user certifications
  DELETE FROM public.user_certifications WHERE user_id = target_user_id;
  
  -- 16. Delete user roles
  DELETE FROM public.user_roles WHERE id = target_user_id;
  
  -- 17. Delete user subscriptions
  DELETE FROM public.user_subscriptions WHERE user_id = target_user_id;
  
  -- 18. Delete diploma QR tokens
  DELETE FROM public.diploma_qr_tokens WHERE user_id = target_user_id;
  
  -- 19. Delete profile
  DELETE FROM public.profiles WHERE id = target_user_id;
  
  -- 20. Finally, delete from auth.users
  DELETE FROM auth.users WHERE id = target_user_id;
  
  RAISE NOTICE 'User % and all related data deleted successfully', target_user_id;
END;
$$;
