-- Create function to delete a user and all related data
-- This requires SECURITY DEFINER to delete from auth.users
CREATE OR REPLACE FUNCTION delete_user(user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow admins or super admins to delete users
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Only admins can delete users';
  END IF;

  -- Delete user from auth.users (this will cascade delete all related data via ON DELETE CASCADE)
  DELETE FROM auth.users WHERE id = user_id;
  
  -- Log the deletion (optional)
  -- INSERT INTO user_deletion_log (deleted_by, deleted_user_id, deleted_at) 
  -- VALUES (auth.uid(), user_id, NOW());
END;
$$;

-- Grant execute permission to authenticated users (the function itself checks for admin role)
GRANT EXECUTE ON FUNCTION delete_user(UUID) TO authenticated;
