import { supabase } from "@/integrations/supabase/client";

/**
 * Clears authentication cache and forces fresh data
 */
export async function clearAuthCache() {
  try {
    // Clear any cached session data
    await supabase.auth.refreshSession();
    
    // Get fresh user data
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return false;
    }

    // Force refresh of user roles
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('id', user.id)
      .single();

    return roleData;
  } catch (error) {
    console.error('Error clearing auth cache:', error);
    return false;
  }
}

/**
 * Forces a complete authentication refresh
 */
export async function forceAuthRefresh() {
  try {
    // Sign out and sign back in to clear all caches
    await supabase.auth.signOut();
    
    // Wait a moment for the sign out to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return true;
  } catch (error) {
    console.error('Error forcing auth refresh:', error);
    return false;
  }
}

// Make available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).clearAuthCache = clearAuthCache;
  (window as any).forceAuthRefresh = forceAuthRefresh;
}
