import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  ALL_PERMISSIONS, 
  PERMISSION_LABELS, 
  PERMISSION_DESCRIPTIONS,
  type AdminPermission 
} from "@/hooks/useUserPermissions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DEFAULT_AVATAR_URL } from "@/hooks/useDefaultAvatar";
import { 
  Shield, 
  UserCog, 
  Loader2, 
  Settings,
  Award,
  FileCheck,
  Users,
  Building,
  Bell,
  Image
} from "lucide-react";

interface UserWithPermissions {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: string;
  permissions: string[];
}

const PERMISSION_ICONS: Record<AdminPermission, React.ReactNode> = {
  create_diplomas: <Award className="h-4 w-4" />,
  manage_certificates: <FileCheck className="h-4 w-4" />,
  view_users: <Users className="h-4 w-4" />,
  view_companies: <Building className="h-4 w-4" />,
  view_notifications: <Bell className="h-4 w-4" />,
  manage_banners: <Image className="h-4 w-4" />,
};

export function PermissionsManagement() {
  const [users, setUsers] = useState<UserWithPermissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserWithPermissions | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsersWithPermissions();
  }, []);

  const fetchUsersWithPermissions = async () => {
    try {
      // Get users with admin role
      const { data: adminRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('id, role')
        .in('role', ['admin', 'super_admin']);

      if (rolesError) throw rolesError;

      if (!adminRoles || adminRoles.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }

      // Get profiles for these users
      const userIds = adminRoles.map(r => r.id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Get all permissions
      const { data: allPermissions, error: permError } = await supabase
        .from('user_permissions')
        .select('user_id, permission')
        .in('user_id', userIds);

      if (permError) {
        console.error('Error fetching permissions:', permError);
      }

      // Combine data
      const usersWithPerms: UserWithPermissions[] = (profiles || []).map(profile => {
        const roleData = adminRoles.find(r => r.id === profile.id);
        const userPerms = allPermissions?.filter(p => p.user_id === profile.id).map(p => p.permission) || [];
        
        return {
          ...profile,
          role: roleData?.role || 'admin',
          permissions: roleData?.role === 'super_admin' ? ALL_PERMISSIONS : userPerms,
        };
      });

      setUsers(usersWithPerms);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openPermissionsDialog = (user: UserWithPermissions) => {
    setSelectedUser(user);
    setSelectedPermissions(user.permissions);
    setDialogOpen(true);
  };

  const togglePermission = (permission: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permission)
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
  };

  const savePermissions = async () => {
    if (!selectedUser) return;

    setSaving(true);
    try {
      // Delete existing permissions
      await supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', selectedUser.id);

      // Insert new permissions
      if (selectedPermissions.length > 0) {
        const { data: { user } } = await supabase.auth.getUser();
        
        const newPermissions = selectedPermissions.map(permission => ({
          user_id: selectedUser.id,
          permission: permission as AdminPermission,
          granted_by: user?.id,
        }));

        const { error } = await supabase
          .from('user_permissions')
          .insert(newPermissions);

        if (error) throw error;
      }

      toast({
        title: "Permisos actualizados",
        description: `Los permisos de ${selectedUser.full_name || selectedUser.email} han sido actualizados`,
      });

      setDialogOpen(false);
      fetchUsersWithPermissions();
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast({
        title: "Error",
        description: "No se pudieron guardar los permisos",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="bg-white/95 border-gray-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900">
          <Shield className="h-5 w-5 text-primary" />
          Gestión de Roles y Permisos
        </CardTitle>
        <CardDescription>
          Asigna permisos específicos a los administradores para controlar su acceso al dashboard
        </CardDescription>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <div className="text-center py-8">
            <UserCog className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No hay administradores registrados</p>
            <p className="text-sm text-muted-foreground mt-1">
              Crea un usuario con rol de administrador para asignarle permisos
            </p>
          </div>
        ) : (
          <div className="rounded-md border border-gray-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Permisos</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar_url || DEFAULT_AVATAR_URL} />
                          <AvatarFallback>
                            <img src={DEFAULT_AVATAR_URL} alt="Avatar" className="h-full w-full object-cover" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-gray-900">{user.full_name || 'Sin nombre'}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'super_admin' ? 'destructive' : 'default'}>
                        {user.role === 'super_admin' ? 'Super Admin' : 'Administrador'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.role === 'super_admin' ? (
                          <Badge variant="outline" className="text-xs">
                            Todos los permisos
                          </Badge>
                        ) : user.permissions.length > 0 ? (
                          user.permissions.slice(0, 3).map(perm => (
                            <Badge key={perm} variant="secondary" className="text-xs">
                              {PERMISSION_LABELS[perm as AdminPermission]}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">Sin permisos</span>
                        )}
                        {user.permissions.length > 3 && user.role !== 'super_admin' && (
                          <Badge variant="outline" className="text-xs">
                            +{user.permissions.length - 3} más
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openPermissionsDialog(user)}
                        disabled={user.role === 'super_admin'}
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        Configurar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Configurar Permisos
              </DialogTitle>
              <DialogDescription>
                Selecciona los permisos para {selectedUser?.full_name || selectedUser?.email}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {ALL_PERMISSIONS.map((permission) => (
                <div
                  key={permission}
                  className="flex items-start space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <Checkbox
                    id={permission}
                    checked={selectedPermissions.includes(permission)}
                    onCheckedChange={() => togglePermission(permission)}
                  />
                  <div className="flex-1">
                    <Label 
                      htmlFor={permission}
                      className="flex items-center gap-2 font-medium cursor-pointer"
                    >
                      {PERMISSION_ICONS[permission]}
                      {PERMISSION_LABELS[permission]}
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {PERMISSION_DESCRIPTIONS[permission]}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={savePermissions} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Guardar Permisos
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
