-- Drop existing function if it exists
DROP FUNCTION IF EXISTS delete_user(UUID);

-- Create comprehensive function to delete a user and all related data
CREATE OR REPLACE FUNCTION delete_user(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  calling_user_role TEXT;
BEGIN
  -- Get the role of the user calling this function
  SELECT role INTO calling_user_role
  FROM user_roles 
  WHERE id = auth.uid()
  LIMIT 1;

  -- Only allow admins or super admins to delete users
  IF calling_user_role IS NULL OR calling_user_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Only admins can delete users';
  END IF;

  -- Delete from all tables that reference this user
  -- Order matters: delete child records first to avoid FK violations
  
  -- Delete notifications
  DELETE FROM notifications WHERE user_id = target_user_id;
  
  -- Delete profile views
  DELETE FROM profile_views WHERE profile_id = target_user_id;
  
  -- Delete profile contacts
  DELETE FROM profile_contacts WHERE profile_id = target_user_id;
  
  -- Delete profile slug history (uses user_id)
  DELETE FROM profile_slug_history WHERE user_id = target_user_id;
  
  -- Delete company pilot invitations (both as inviter and invitee)
  DELETE FROM company_pilot_invitations WHERE pilot_id = target_user_id OR invited_by = target_user_id;
  
  -- Delete company pilots
  DELETE FROM company_pilots WHERE pilot_id = target_user_id;
  
  -- Update flight logs where user is validator (set to NULL instead of delete)
  UPDATE flight_logs SET validated_by = NULL WHERE validated_by = target_user_id;
  
  -- Delete flight logs (uses user_id directly, not through pilots)
  DELETE FROM flight_logs WHERE user_id = target_user_id;
  
  -- Update companies where user is certification validator (set to NULL instead of delete)
  UPDATE companies SET certification_validated_by = NULL WHERE certification_validated_by = target_user_id;
  
  -- Delete companies owned by user
  DELETE FROM companies WHERE user_id = target_user_id;
  
  -- Delete pilot services
  DELETE FROM pilot_services WHERE pilot_id IN (SELECT id FROM pilots WHERE user_id = target_user_id);
  
  -- Delete pilots
  DELETE FROM pilots WHERE user_id = target_user_id;
  
  -- Delete user certifications
  DELETE FROM user_certifications WHERE user_id = target_user_id;
  
  -- Delete user roles (uses 'id' not 'user_id')
  DELETE FROM user_roles WHERE id = target_user_id;
  
  -- Delete user subscriptions
  DELETE FROM user_subscriptions WHERE user_id = target_user_id;
  
  -- Delete diploma QR tokens
  DELETE FROM diploma_qr_tokens WHERE user_id = target_user_id;
  
  -- Delete profile
  DELETE FROM profiles WHERE id = target_user_id;
  
  -- Finally, delete from auth.users
  DELETE FROM auth.users WHERE id = target_user_id;
  
  RAISE NOTICE 'User % and all related data deleted successfully', target_user_id;
END;
$$;

-- Grant execute permission to authenticated users (the function itself checks for admin role)
GRANT EXECUTE ON FUNCTION delete_user(UUID) TO authenticated;

COMMENT ON FUNCTION delete_user(UUID) IS 'Deletes a user and all related data. Only admins can execute this function.';
