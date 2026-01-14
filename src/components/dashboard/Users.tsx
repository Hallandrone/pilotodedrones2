import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DEFAULT_AVATAR_URL } from "@/hooks/useDefaultAvatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Badge,
} from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CreateUserDialog } from "./CreateUserDialog";
import { EditUserDialog } from "./EditUserDialog";
import {
  Loader2,
  Users as UsersIcon,
  Mail,
  Calendar,
  Plus,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Ticket
} from "lucide-react";

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  user_type: string | null;
  created_at: string;
  user_roles?: {
    role: string;
  } | null;
  hasActiveSubscription?: boolean;
  hasApprovedCertification?: boolean;
}

export function Users() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // Get all profiles with email
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) {
        throw profilesError;
      }

      // Get all user roles at once
      const { data: allRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('id, role');

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
      }

      // Get all subscriptions at once
      const { data: allSubscriptions, error: subscriptionsError } = await supabase
        .from('user_subscriptions')
        .select('user_id, status');

      if (subscriptionsError) {
        console.error('Error fetching subscriptions:', subscriptionsError);
      }

      // Get all certifications at once
      const { data: allCertifications, error: certificationsError } = await supabase
        .from('user_certifications')
        .select('user_id, status')
        .in('status', ['validated']);

      if (certificationsError) {
        console.error('Error fetching certifications:', certificationsError);
      }

      // Combine all data efficiently
      const usersWithRoles = (profiles || []).map((profile) => {
        const roleData = allRoles?.find(r => r.id === profile.id);
        const hasActiveSubscription = allSubscriptions?.some(
          s => s.user_id === profile.id && s.status === 'active'
        );
        const hasApprovedCertification = allCertifications?.some(
          c => c.user_id === profile.id
        );

        return {
          ...profile,
          user_roles: roleData ? { role: roleData.role } : null,
          hasActiveSubscription: !!hasActiveSubscription,
          hasApprovedCertification: !!hasApprovedCertification
        };
      });

      setUsers(usersWithRoles);
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

  const handleDeleteUser = async () => {
    if (!selectedUserId) return;

    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId: selectedUserId }
      });

      if (error) {
        console.error('Function invocation error:', error);
        throw new Error(error.message || 'Error al invocar la función');
      }

      if (data?.error) {
        console.error('Function returned error:', data.error);
        throw new Error(data.error);
      }

      toast({
        title: "Usuario eliminado",
        description: "El usuario ha sido eliminado exitosamente",
      });

      fetchUsers();
      setDeleteDialogOpen(false);
      setSelectedUserId(null);
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el usuario",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (userId: string) => {
    setSelectedUserId(userId);
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (userId: string) => {
    setSelectedUserId(userId);
    setDeleteDialogOpen(true);
  };

  const getUserStatus = (user: UserProfile) => {
    // Simple status logic - in a real app this would be more sophisticated
    return user.email ? 'activo' : 'inactivo';
  };

  const getStatusBadgeVariant = (status: string) => {
    return status === 'activo' ? 'default' : 'secondary';
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'destructive';
      case 'admin':
        return 'default';
      case 'company':
        return 'secondary';
      case 'pilot':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const formatRole = (role: string) => {
    const roleMap: { [key: string]: string } = {
      super_admin: 'Super Admin',
      admin: 'Administrador',
      company: 'Empresa',
      pilot: 'Piloto'
    };
    return roleMap[role] || role;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UsersIcon className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestión de Usuarios</h1>
            <p className="text-muted-foreground">Gestiona todos los usuarios del sistema (administradores, pilotos, empresas)</p>
          </div>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Crear Usuario
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Lista de Usuarios del Sistema</span>
            <Badge variant="secondary" className="text-sm">
              {users.length} usuarios
            </Badge>
          </CardTitle>
          <CardDescription>
            Información detallada de todos los usuarios registrados en la plataforma (administradores, pilotos, empresas)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8">
              <UsersIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay usuarios registrados</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre Completo</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha Registro</TableHead>
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
                              <img src={DEFAULT_AVATAR_URL} alt="Default Avatar" className="h-full w-full object-cover" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {user.full_name || 'Sin nombre'}
                            </span>
                            {user.hasActiveSubscription && user.hasApprovedCertification && (
                              <span title="Usuario certificado con suscripción activa">
                                <Ticket className="h-4 w-4 text-green-500" />
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">
                            {user.email || 'Sin email'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.user_roles?.role || 'pilot')}>
                          {formatRole(user.user_roles?.role || 'pilot')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {getUserStatus(user) === 'activo' ? (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          ) : (
                            <XCircle className="h-3 w-3 text-gray-500" />
                          )}
                          <Badge variant={getStatusBadgeVariant(getUserStatus(user))}>
                            {getUserStatus(user)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(user.created_at).toLocaleDateString('es-ES')}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Abrir menú</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" />
                              Ver detalles
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDialog(user.id)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => openDeleteDialog(user.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateUserDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={fetchUsers}
      />

      <EditUserDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        userId={selectedUserId}
        onSuccess={fetchUsers}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El usuario será eliminado permanentemente del sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}