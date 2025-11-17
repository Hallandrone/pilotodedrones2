import { supabase } from "@/integrations/supabase/client";

export interface UserRole {
  role: 'pilot' | 'company' | 'admin' | 'super_admin';
}

/**
 * Gets the user role, creating it if it doesn't exist
 * @param userId - The user ID
 * @returns Promise<UserRole | null>
 */
export async function getUserRole(userId: string): Promise<UserRole | null> {
  try {
    console.log('Getting role for user:', userId);
    
    // First, try to get existing role
    let { data: roleData, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('id', userId)
      .single();

    console.log('Existing role data:', roleData, 'Error:', error);

    // If role exists, return it
    if (roleData && !error) {
      console.log('Role found:', roleData.role);
      return roleData;
    }

    console.log('Role not found, attempting to create...');
    
    // Get user profile to determine role
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', userId)
      .single();

    console.log('Profile data:', profileData, 'Profile error:', profileError);

    // If profile doesn't exist, create it first
    if (profileError || !profileData) {
      console.log('Profile not found, creating profile...');
      
      // Get user data from auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No user found in auth');
        return null;
      }

      // Create profile
      const { error: createProfileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
          email: user.email,
          user_type: 'pilot'
        });

      if (createProfileError) {
        console.error('Error creating profile:', createProfileError);
        return null;
      }
    }

    const userType = profileData?.user_type || 'pilot';
    console.log('Creating role with user type:', userType);
    
    // Create the role
    const { error: createRoleError } = await supabase
      .from('user_roles')
      .insert({
        id: userId,
        role: userType as 'pilot' | 'company' | 'admin' | 'super_admin'
      });

    if (createRoleError) {
      console.error('Error creating role:', createRoleError);
      return null;
    }

    console.log('Role created successfully');

    // Try to get the role again
    const { data: newRoleData, error: newRoleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('id', userId)
      .single();

    if (newRoleError || !newRoleData) {
      console.error('Error fetching created role:', newRoleError);
      return null;
    }

    console.log('Final role data:', newRoleData);
    return newRoleData;
  } catch (error) {
    console.error('Error in getUserRole:', error);
    return null;
  }
}

/**
 * Checks if user has a specific role
 * @param userId - The user ID
 * @param requiredRole - The required role
 * @returns Promise<boolean>
 */
export async function hasRole(userId: string, requiredRole: string): Promise<boolean> {
  const roleData = await getUserRole(userId);
  return roleData?.role === requiredRole;
}

/**
 * Checks if user is a pilot
 * @param userId - The user ID
 * @returns Promise<boolean>
 */
export async function isPilot(userId: string): Promise<boolean> {
  return hasRole(userId, 'pilot');
}

/**
 * Checks if user is an admin
 * @param userId - The user ID
 * @returns Promise<boolean>
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const roleData = await getUserRole(userId);
  return roleData?.role === 'admin' || roleData?.role === 'super_admin';
}
