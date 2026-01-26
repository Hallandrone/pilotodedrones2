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
import { Input } from "@/components/ui/input";
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
  Image,
  Search,
  Plus,
  Trash2,
  AlertTriangle
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
  approve_deny_certificates: <FileCheck className="h-4 w-4 text-green-500" />,
  view_users: <Users className="h-4 w-4" />,
  view_companies: <Building className="h-4 w-4" />,
  view_notifications: <Bell className="h-4 w-4" />,
  manage_banners: <Settings className="h-4 w-4" />,
  upload_banners: <Image className="h-4 w-4" />,
};

export function PermissionsManagement() {
  const [users, setUsers] = useState<UserWithPermissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserWithPermissions | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    email: "",
    password: "",
    full_name: "",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserWithPermissions | null>(null);
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

  const handleSearchUsers = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(5);

      if (error) throw error;

      // Filter out users already in the admin list
      const filteredResults = (data || []).filter(
        profile => !users.some(u => u.id === profile.id)
      );

      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const assignPermissionsToExistingUser = async (profile: any) => {
    // Get existing role if any
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('id', profile.id)
      .single();

    const userWithPerms: UserWithPermissions = {
      ...profile,
      role: roleData?.role || 'pilot', // Default to pilot if no role found
      permissions: [], // New user starts with no admin permissions
    };

    setSelectedUser(userWithPerms);
    setSelectedPermissions([]);
    setDialogOpen(true);
    setSearchQuery("");
    setSearchResults([]);
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
          .insert(newPermissions as any);

        if (error) throw error;
      }

      toast({
        title: "Permisos actualizados",
        description: `Los permisos de ${selectedUser.full_name || selectedUser.email} han sido actualizados`,
      });

      // Si el usuario no era admin/super_admin, promoverlo a admin
      if (selectedUser.role !== 'admin' && selectedUser.role !== 'super_admin' && selectedPermissions.length > 0) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .upsert({
            id: selectedUser.id,
            role: 'admin'
          });

        if (roleError) console.error('Error promoting user to admin:', roleError);
        else {
          toast({
            title: "Rol actualizado",
            description: `${selectedUser.full_name || selectedUser.email} ahora tiene acceso al dashboard como Administrador`,
          });
        }
      }

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

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // 1. Inscribir al usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newAdmin.email,
        password: newAdmin.password,
        options: {
          data: {
            full_name: newAdmin.full_name,
            user_type: 'admin'
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("No se pudo crear el usuario");

      // 2. Crear el rol en user_roles (la tabla profiles suele crearse por trigger, 
      // pero el rol a veces necesita ser explícito si el trigger no lo maneja por metadata)
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          id: authData.user.id,
          role: 'admin'
        });

      if (roleError) {
        console.error('Error creando rol:', roleError);
        // Podría fallar si ya existe un perfil/rol creado por trigger, lo ignoramos si es así
      }

      toast({
        title: "Administrador creado",
        description: `Se ha enviado un correo de confirmación a ${newAdmin.email}`,
      });

      setCreateDialogOpen(false);
      setNewAdmin({ email: "", password: "", full_name: "" });
      fetchUsersWithPermissions();
    } catch (error: any) {
      console.error('Error creando admin:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el administrador",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    setSaving(true);
    try {
      // 1. Delete user permissions
      await supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', userToDelete.id);

      // 2. Delete user role
      await supabase
        .from('user_roles')
        .delete()
        .eq('id', userToDelete.id);

      // 3. Delete user profile records (pilots or companies)
      await supabase
        .from('pilots')
        .delete()
        .eq('user_id', userToDelete.id);

      await supabase
        .from('companies')
        .delete()
        .eq('user_id', userToDelete.id);

      // 4. Delete profile
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userToDelete.id);

      if (error) throw error;

      toast({
        title: "Usuario eliminado",
        description: `El usuario ${userToDelete.full_name || userToDelete.email} ha sido eliminado correctamente`,
      });

      setDeleteDialogOpen(false);
      setUserToDelete(null);
      fetchUsersWithPermissions();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar al usuario. Es posible que tenga registros asociados que impidan el borrado directo.",
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
    <Card className="bg-[#0f2e3a]/40 backdrop-blur-md border-white/10 shadow-2xl overflow-hidden">
      <CardHeader className="border-b border-white/5">
        <CardTitle className="flex items-center justify-between text-2xl font-bold text-white">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-accent animate-pulse" />
            Gestión de Roles y Permisos
          </div>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="bg-accent hover:bg-accent/80 text-white font-semibold shadow-lg shadow-accent/20"
          >
            <UserCog className="h-4 w-4 mr-2" />
            Nuevo Administrador
          </Button>
        </CardTitle>
        <CardDescription className="text-white/60">
          Asigna permisos específicos a los administradores para controlar su acceso al dashboard profesional
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* User Search Bar */}
        <div className="relative">
          <div className="relative group">
            <Search className="absolute left-3 top-3 h-4 w-4 text-white/40 group-focus-within:text-accent transition-colors" />
            <Input
              placeholder="Buscar usuario por nombre o email para asignar permisos..."
              value={searchQuery}
              onChange={(e) => handleSearchUsers(e.target.value)}
              className="bg-white/5 border-white/10 text-white pl-10 h-11 focus:ring-accent focus:border-accent/30 rounded-xl"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-accent" />
            )}
          </div>

          {searchResults.length > 0 && (
            <div className="absolute z-50 w-full mt-2 bg-[#0f2e3a] border border-white/10 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl">
              <div className="p-2 border-b border-white/5 bg-white/5">
                <p className="text-[10px] uppercase font-bold text-accent px-2 tracking-wider">Resultados de búsqueda</p>
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {searchResults.map((profile) => (
                  <div
                    key={profile.id}
                    className="flex items-center justify-between p-3 hover:bg-white/5 transition-colors group border-b border-white/5 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border border-white/10 ring-1 ring-white/5">
                        <AvatarImage src={profile.avatar_url || DEFAULT_AVATAR_URL} />
                        <AvatarFallback className="bg-[#1a4b5c]">
                          <img src={DEFAULT_AVATAR_URL} alt="Avatar" className="h-full w-full object-cover" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-semibold text-white group-hover:text-accent transition-colors">
                          {profile.full_name || 'Sin nombre'}
                        </p>
                        <p className="text-xs text-white/40">{profile.email}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => assignPermissionsToExistingUser(profile)}
                      className="text-white/60 hover:text-white hover:bg-accent/20 border border-white/5"
                    >
                      <Plus className="h-4 w-4 mr-2 text-accent" />
                      Asignar Permisos
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {users.length === 0 ? (
          <div className="text-center py-8">
            <UserCog className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No hay administradores registrados</p>
            <p className="text-sm text-muted-foreground mt-1">
              Crea un usuario con rol de administrador para asignarle permisos
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-[#0f2e3a]/40 overflow-hidden">
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-white/70 font-semibold py-4">Usuario</TableHead>
                  <TableHead className="text-white/70 font-semibold py-4">Rol</TableHead>
                  <TableHead className="text-white/70 font-semibold py-4">Permisos</TableHead>
                  <TableHead className="text-right text-white/70 font-semibold py-4">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="border-white/5 hover:bg-white/5 transition-colors">
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border-2 border-white/10 ring-2 ring-accent/20">
                          <AvatarImage src={user.avatar_url || DEFAULT_AVATAR_URL} />
                          <AvatarFallback className="bg-[#1a4b5c]">
                            <img src={DEFAULT_AVATAR_URL} alt="Avatar" className="h-full w-full object-cover" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-white group-hover:text-accent transition-colors">{user.full_name || 'Sin nombre'}</p>
                          <p className="text-xs text-white/50">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'super_admin' ? 'destructive' : 'default'}>
                        {user.role === 'super_admin' ? 'Super Admin' : 'Administrador'}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {user.role === 'super_admin' ? (
                          <Badge variant="outline" className="text-xs bg-accent/10 text-accent border-accent/20 px-2">
                            Full Access
                          </Badge>
                        ) : user.permissions.length > 0 ? (
                          user.permissions.slice(0, 3).map(perm => (
                            <Badge key={perm} variant="secondary" className="text-xs bg-white/10 text-white/90 border-none px-2">
                              {PERMISSION_LABELS[perm as AdminPermission]}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-white/40 italic">Sin permisos asignados</span>
                        )}
                        {user.permissions.length > 3 && user.role !== 'super_admin' && (
                          <Badge variant="outline" className="text-xs text-white/60 border-white/10 px-2">
                            +{user.permissions.length - 3} más
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openPermissionsDialog(user)}
                          disabled={user.role === 'super_admin'}
                          className="text-white/70 hover:text-white hover:bg-accent/20 border border-white/10"
                        >
                          <Settings className="h-4 w-4 mr-2 text-accent" />
                          Configurar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setUserToDelete(user);
                            setDeleteDialogOpen(true);
                          }}
                          disabled={user.role === 'super_admin'}
                          className="text-white/40 hover:text-red-400 hover:bg-red-400/10 border border-white/5"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-lg bg-[#0f2e3a] border border-white/10 text-white shadow-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-2xl font-bold text-white">
                <Shield className="h-5 w-5 text-accent" />
                Configurar Permisos
              </DialogTitle>
              <DialogDescription className="text-white/60">
                Selecciona los privilegios para <span className="text-white font-medium">{selectedUser?.full_name || selectedUser?.email}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {ALL_PERMISSIONS.map((permission) => (
                <div
                  key={permission}
                  className={`flex items-start space-x-3 p-4 rounded-xl border transition-all duration-200 ${selectedPermissions.includes(permission)
                    ? 'bg-accent/10 border-accent/30 ring-1 ring-accent/20'
                    : 'border-white/5 hover:bg-white/5'
                    }`}
                >
                  <Checkbox
                    id={permission}
                    checked={selectedPermissions.includes(permission)}
                    onCheckedChange={() => togglePermission(permission)}
                    className="border-white/20 data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor={permission}
                      className="flex items-center gap-2 font-semibold cursor-pointer text-white"
                    >
                      <span className="p-1.5 rounded-md bg-white/5 text-accent shadow-inner">
                        {PERMISSION_ICONS[permission as AdminPermission]}
                      </span>
                      {PERMISSION_LABELS[permission as AdminPermission]}
                    </Label>
                    <p className="text-xs text-white/50 mt-1.5 leading-relaxed">
                      {PERMISSION_DESCRIPTIONS[permission as AdminPermission]}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter className="border-t border-white/5 pt-4">
              <Button
                variant="ghost"
                onClick={() => setDialogOpen(false)}
                className="text-white/60 hover:text-white hover:bg-white/5"
              >
                Cancelar
              </Button>
              <Button
                onClick={savePermissions}
                disabled={saving}
                className="bg-accent hover:bg-accent/80 text-white font-semibold shadow-lg shadow-accent/20 px-8"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Shield className="h-4 w-4 mr-2" />
                )}
                Guardar Cambios
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="sm:max-w-md bg-[#0f2e3a] border border-white/10 text-white shadow-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-2xl font-bold text-white">
                <UserCog className="h-5 w-5 text-accent" />
                Crear Nuevo Administrador
              </DialogTitle>
              <DialogDescription className="text-white/60">
                Registra un nuevo usuario con acceso administrativo al sistema
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateAdmin} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="admin-name" className="text-white/80">Nombre Completo</Label>
                <div className="relative">
                  <UserCog className="absolute left-3 top-3 h-4 w-4 text-white/40" />
                  <Input
                    id="admin-name"
                    placeholder="Ej: Juan Pérez"
                    className="bg-white/5 border-white/10 text-white pl-10 focus:ring-accent"
                    value={newAdmin.full_name}
                    onChange={(e) => setNewAdmin({ ...newAdmin, full_name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-email" className="text-white/80">Email</Label>
                <div className="relative">
                  <Bell className="absolute left-3 top-3 h-4 w-4 text-white/40" />
                  <Input
                    id="admin-email"
                    type="email"
                    placeholder="admin@ejemplo.com"
                    className="bg-white/5 border-white/10 text-white pl-10 focus:ring-accent"
                    value={newAdmin.email}
                    onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-password" className="text-white/80">Contraseña Temporal</Label>
                <div className="relative">
                  <Shield className="absolute left-3 top-3 h-4 w-4 text-white/40" />
                  <Input
                    id="admin-password"
                    type="password"
                    placeholder="••••••••"
                    className="bg-white/5 border-white/10 text-white pl-10 focus:ring-accent"
                    value={newAdmin.password}
                    onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                    required
                  />
                </div>
              </div>

              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setCreateDialogOpen(false)}
                  className="text-white/60 hover:text-white hover:bg-white/5"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-accent hover:bg-accent/80 text-white font-semibold shadow-lg shadow-accent/20 flex-1 sm:flex-none"
                >
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Crear Administrador
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="sm:max-w-md bg-[#0f2e3a] border border-white/10 text-white shadow-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-2xl font-bold text-red-400">
                <AlertTriangle className="h-6 w-6" />
                ¿Confirmar Eliminación?
              </DialogTitle>
              <DialogDescription className="text-white/60 pt-2">
                Estás a punto de eliminar a <span className="text-white font-bold">{userToDelete?.full_name || userToDelete?.email}</span>.
                Esta acción eliminará su perfil y accesos del sistema.
                <br /><br />
                <span className="text-red-400/80 text-sm italic">Esta acción no se puede deshacer.</span>
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="pt-6 gap-2">
              <Button
                variant="ghost"
                onClick={() => setDeleteDialogOpen(false)}
                className="text-white/60 hover:text-white hover:bg-white/5"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleDeleteUser}
                disabled={saving}
                className="bg-red-500 hover:bg-red-600 text-white font-bold shadow-lg shadow-red-500/20"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Eliminar Permanentemente
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card >
  );
}
