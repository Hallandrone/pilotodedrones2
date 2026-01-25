import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AdminPermission = 
  | 'create_diplomas'
  | 'manage_certificates'
  | 'view_users'
  | 'view_companies'
  | 'view_notifications'
  | 'manage_banners';

export const PERMISSION_LABELS: Record<AdminPermission, string> = {
  create_diplomas: 'Crear Diplomas',
  manage_certificates: 'Gestionar Certificados',
  view_users: 'Ver Usuarios',
  view_companies: 'Ver Empresas',
  view_notifications: 'Ver Notificaciones',
  manage_banners: 'Gestionar Banners',
};

export const PERMISSION_DESCRIPTIONS: Record<AdminPermission, string> = {
  create_diplomas: 'Permite crear y generar diplomas para los alumnos',
  manage_certificates: 'Permite aprobar o rechazar certificados de pilotos',
  view_users: 'Permite ver la lista de usuarios registrados',
  view_companies: 'Permite ver la lista de empresas registradas',
  view_notifications: 'Permite ver y gestionar notificaciones del sistema',
  manage_banners: 'Permite cargar y gestionar banners publicitarios',
};

export const ALL_PERMISSIONS: AdminPermission[] = [
  'create_diplomas',
  'manage_certificates',
  'view_users',
  'view_companies',
  'view_notifications',
  'manage_banners',
];

export function useUserPermissions(userId?: string) {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchPermissions(userId);
    } else {
      fetchCurrentUserPermissions();
    }
  }, [userId]);

  const fetchCurrentUserPermissions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      await fetchPermissions(user.id);
    } catch (error) {
      console.error('Error fetching current user permissions:', error);
      setLoading(false);
    }
  };

  const fetchPermissions = async (uid: string) => {
    try {
      // Check if user is super_admin
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('id', uid)
        .single();

      if (roleData?.role === 'super_admin') {
        setIsSuperAdmin(true);
        setPermissions(ALL_PERMISSIONS);
        setLoading(false);
        return;
      }

      // Get user permissions from database
      const { data: permissionsData, error } = await supabase
        .from('user_permissions')
        .select('permission')
        .eq('user_id', uid);

      if (error) {
        console.error('Error fetching permissions:', error);
      }

      const userPermissions = permissionsData?.map(p => p.permission as string) || [];
      setPermissions(userPermissions);
    } catch (error) {
      console.error('Error fetching permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (permission: AdminPermission): boolean => {
    if (isSuperAdmin) return true;
    return permissions.includes(permission);
  };

  const hasAnyPermission = (): boolean => {
    return isSuperAdmin || permissions.length > 0;
  };

  return {
    permissions,
    loading,
    isSuperAdmin,
    hasPermission,
    hasAnyPermission,
    refetch: userId ? () => fetchPermissions(userId) : fetchCurrentUserPermissions,
  };
}
