import { Bell, Search, User, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import Logo from "@/components/ui/logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface DashboardHeaderProps {
  user: SupabaseUser | null;
}

interface UserProfile {
  full_name: string | null;
}

interface UserRole {
  role: string;
}

interface PendingCertification {
  id: string;
  user_id: string;
  file_name: string;
  uploaded_at: string;
  profiles: {
    full_name: string;
    email: string;
  } | null;
}

interface PendingFlightLog {
  id: string;
  user_id: string;
  file_name: string;
  uploaded_at: string;
  profiles: {
    full_name: string;
    email: string;
  } | null;
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [pendingCertifications, setPendingCertifications] = useState<PendingCertification[]>([]);
  const [pendingFlightLogs, setPendingFlightLogs] = useState<PendingFlightLog[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadUserProfile();
    }
  }, [user?.id]);

  useEffect(() => {
    // Solo cargar notificaciones si el usuario es super_admin
    if (userRole?.role === 'super_admin') {
      loadPendingCertifications();
      loadPendingFlightLogs();

      // Configurar Realtime subscription para escuchar cambios en certificaciones
      const certsChannel = supabase
        .channel('certifications-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_certifications'
          },
          (payload) => {
            console.log('Certification change detected:', payload);
            const newRecord = payload.new as Record<string, unknown> | null;
            const oldRecord = payload.old as Record<string, unknown> | null;
            const newStatus = newRecord?.status;
            const oldStatus = oldRecord?.status;

            if (payload.eventType === 'INSERT' && newStatus === 'pending') {
              loadPendingCertifications();
            } else if (payload.eventType === 'UPDATE' && (newStatus === 'pending' || oldStatus === 'pending')) {
              loadPendingCertifications();
            } else if (payload.eventType === 'DELETE' && oldStatus === 'pending') {
              loadPendingCertifications();
            }
          }
        )
        .subscribe();

      // Configurar Realtime subscription para escuchar cambios en flight logs
      const logsChannel = supabase
        .channel('flight-logs-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'flight_logs'
          },
          (payload) => {
            console.log('Flight log change detected:', payload);
            const newRecord = payload.new as Record<string, unknown> | null;
            const oldRecord = payload.old as Record<string, unknown> | null;
            const newStatus = newRecord?.status;
            const oldStatus = oldRecord?.status;

            if (payload.eventType === 'INSERT' && newStatus === 'pending') {
              loadPendingFlightLogs();
            } else if (payload.eventType === 'UPDATE' && (newStatus === 'pending' || oldStatus === 'pending')) {
              loadPendingFlightLogs();
            } else if (payload.eventType === 'DELETE' && oldStatus === 'pending') {
              loadPendingFlightLogs();
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(certsChannel);
        supabase.removeChannel(logsChannel);
      };
    }
  }, [userRole?.role]);

  const loadUserProfile = async () => {
    if (!user?.id) return;

    try {
      // Get user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      // Get user role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('id', user.id)
        .single();

      setUserProfile(profileData);
      setUserRole(roleData);
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadPendingCertifications = async () => {
    if (!user?.id) return;

    try {
      setLoadingNotifications(true);

      // Obtener certificaciones pendientes
      const { data: certsData, error: certsError } = await supabase
        .from('user_certifications')
        .select('id, user_id, file_name, uploaded_at')
        .eq('status', 'pending')
        .order('uploaded_at', { ascending: false })
        .limit(10); // Limitar a las 10 más recientes

      if (certsError) throw certsError;

      if (!certsData || certsData.length === 0) {
        setPendingCertifications([]);
        return;
      }

      // Obtener información de los usuarios
      const userIds = [...new Set(certsData.map(cert => cert.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      // Combinar certificaciones con perfiles
      const certificationsWithProfiles = certsData.map(cert => {
        const profile = profilesData?.find(p => p.id === cert.user_id);
        return {
          ...cert,
          profiles: profile ? { full_name: profile.full_name || 'Usuario', email: profile.email || '' } : null
        };
      });

      setPendingCertifications(certificationsWithProfiles as PendingCertification[]);
    } catch (error) {
      console.error('Error loading pending certifications:', error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const loadPendingFlightLogs = async () => {
    if (!user?.id) return;

    try {
      // Obtener vitacoras pendientes
      const { data: logsData, error: logsError } = await supabase
        .from('flight_logs')
        .select('id, user_id, file_name, uploaded_at')
        .eq('status', 'pending')
        .order('uploaded_at', { ascending: false })
        .limit(10);

      if (logsError) throw logsError;

      if (!logsData || logsData.length === 0) {
        setPendingFlightLogs([]);
        return;
      }

      // Obtener información de los usuarios
      const userIds = [...new Set(logsData.map(log => log.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      // Combinar vitacoras con perfiles
      const logsWithProfiles = logsData.map(log => {
        const profile = profilesData?.find(p => p.id === log.user_id);
        return {
          ...log,
          profiles: profile ? { full_name: profile.full_name || 'Usuario', email: profile.email || '' } : null
        };
      });

      setPendingFlightLogs(logsWithProfiles as PendingFlightLog[]);
    } catch (error) {
      console.error('Error loading pending flight logs:', error);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getDisplayName = () => {
    if (userProfile?.full_name) {
      return userProfile.full_name;
    }
    return user?.email?.split('@')[0] || 'Usuario';
  };

  const getRoleDisplayName = (role: string) => {
    const roleNames = {
      'super_admin': 'Super Administrador',
      'admin': 'Administrador',
      'pilot': 'Piloto',
      'company': 'Empresa'
    };
    return roleNames[role as keyof typeof roleNames] || role;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      return 'Hace menos de una hora';
    } else if (diffInHours < 24) {
      return `Hace ${diffInHours} ${diffInHours === 1 ? 'hora' : 'horas'}`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `Hace ${diffInDays} ${diffInDays === 1 ? 'día' : 'días'}`;
    }
  };

  const handleNotificationClick = () => {
    navigate('/dashboard/certificates');
  };

  const handleFlightLogNotificationClick = () => {
    navigate('/dashboard/certificates');
  };

  const isSuperAdmin = userRole?.role === 'super_admin';
  const notificationCount = pendingCertifications.length + pendingFlightLogs.length;

  return (
    <header className="h-16 bg-white/95 backdrop-blur-xl border-b border-gray-200 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="text-gray-700 hover:text-gray-900 [&>svg]:text-gray-700 [&>svg]:hover:text-gray-900" />
        <Logo size="sm" className="hidden md:flex" showText={false} />

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Buscar en el dashboard..."
            className="pl-10 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Notifications Button - Visible siempre, pero solo funciona para super_admin */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative hover:bg-gray-100">
              <Bell className="h-5 w-5 text-gray-700 hover:text-gray-900 transition-colors" />
              {isSuperAdmin && notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-[#00b3f3] rounded-full text-xs text-white flex items-center justify-center font-semibold shadow-md">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notificaciones</span>
              {isSuperAdmin && notificationCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  {notificationCount} {notificationCount === 1 ? 'pendiente' : 'pendientes'}
                </span>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {!isSuperAdmin ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Solo disponible para administradores
              </div>
            ) : loadingNotifications ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Cargando notificaciones...
              </div>
            ) : notificationCount === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No hay notificaciones pendientes
              </div>
            ) : (
              <>
                {pendingCertifications.length > 0 && (
                  <>
                    <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">
                      Certificaciones
                    </div>
                    {pendingCertifications.map((cert) => (
                      <DropdownMenuItem
                        key={cert.id}
                        className="flex flex-col items-start p-3 cursor-pointer"
                        onClick={handleNotificationClick}
                      >
                        <div className="flex items-start gap-3 w-full">
                          <div className="h-8 w-8 bg-[#00b3f3]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <FileText className="h-4 w-4 text-[#00b3f3]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {cert.profiles?.full_name || 'Usuario'} envió una certificación
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {cert.file_name}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDate(cert.uploaded_at)}
                            </p>
                          </div>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
                {pendingFlightLogs.length > 0 && (
                  <>
                    {pendingCertifications.length > 0 && <DropdownMenuSeparator />}
                    <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">
                      Vitacoras de Vuelo
                    </div>
                    {pendingFlightLogs.map((log) => (
                      <DropdownMenuItem
                        key={log.id}
                        className="flex flex-col items-start p-3 cursor-pointer"
                        onClick={handleFlightLogNotificationClick}
                      >
                        <div className="flex items-start gap-3 w-full">
                          <div className="h-8 w-8 bg-orange-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <FileText className="h-4 w-4 text-orange-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {log.profiles?.full_name || 'Usuario'} envió una vitacora
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {log.file_name}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDate(log.uploaded_at)}
                            </p>
                          </div>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
                {notificationCount > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-center justify-center cursor-pointer"
                      onClick={handleNotificationClick}
                    >
                      <span className="text-sm font-medium text-[#00b3f3]">
                        Ver todos los documentos
                      </span>
                    </DropdownMenuItem>
                  </>
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {getInitials(getDisplayName())}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-gray-900">
                  {getDisplayName()}
                </p>
                <p className="text-xs text-gray-500">
                  {userRole?.role ? getRoleDisplayName(userRole.role) : 'Cargando...'}
                </p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Perfil</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <span>Configuración</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
