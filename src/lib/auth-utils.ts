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

    // First, try to get existing role with a retry mechanism for flaky connections
    let { data: roleData, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('First attempt to fetch role failed, retrying in 500ms...', error);
      await new Promise(resolve => setTimeout(resolve, 500));
      const retryResult = await supabase
        .from('user_roles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();
      roleData = retryResult.data;
      error = retryResult.error;
    }

    if (error) {
      console.error('Error fetching role after retry:', error);
      return null;
    }

    // If role exists, return it
    if (roleData) {
      console.log('Role found:', roleData.role);
      return roleData as UserRole;
    }

    console.log('Role not found, attempting to identify user type from profile...');

    // Get user profile to determine role
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return null;
    }

    // Role doesn't exist. Before creating, check if we have a valid session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No authenticated user found');
      return null;
    }

    const userType = profileData?.user_type || 'pilot';
    console.log('Creating role with identified user type:', userType);

    // Create the role
    const { error: createRoleError } = await supabase
      .from('user_roles')
      .upsert({
        id: userId,
        role: userType as any
      });

    if (createRoleError) {
      console.error('Error creating/upserting role:', createRoleError);
      return null;
    }

    return { role: userType as any };
  } catch (error) {
    console.error('Unhandled error in getUserRole:', error);
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
