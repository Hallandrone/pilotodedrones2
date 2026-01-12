-- Drop existing function if it exists
DROP FUNCTION IF EXISTS delete_user(UUID);

-- Create function to delete a user and all related data
-- Using Supabase admin API approach
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
  WHERE user_id = auth.uid()
  LIMIT 1;

  -- Only allow admins or super admins to delete users
  IF calling_user_role IS NULL OR calling_user_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Only admins can delete users';
  END IF;

  -- First, delete from all public schema tables that reference this user
  -- This is necessary because auth.users deletion might not cascade properly
  
  DELETE FROM profiles WHERE id = target_user_id;
  DELETE FROM pilots WHERE user_id = target_user_id;
  DELETE FROM companies WHERE user_id = target_user_id;
  DELETE FROM user_roles WHERE user_id = target_user_id;
  DELETE FROM user_subscriptions WHERE user_id = target_user_id;
  DELETE FROM diploma_qr_tokens WHERE user_id = target_user_id;
  -- Add more tables as needed
  
  -- Finally, delete from auth.users
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

-- Grant execute permission to authenticated users (the function itself checks for admin role)
GRANT EXECUTE ON FUNCTION delete_user(UUID) TO authenticated;

COMMENT ON FUNCTION delete_user(UUID) IS 'Deletes a user and all related data. Only admins can execute this function.';
