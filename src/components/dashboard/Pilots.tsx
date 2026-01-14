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
import { PilotDetailsModal } from "./PilotDetailsModal";
import {
  Loader2,
  Plane,
  Mail,
  Calendar,
  MoreHorizontal,
  Eye,
  Ban,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Trash2
} from "lucide-react";
import {
  getCertificationStatus,
  getDaysUntilExpiration,
  formatExpirationDate,
  calculateExpirationDate
} from "@/utils/certificationHelpers";

interface PilotService {
  id: string;
  service_type: string;
  description: string | null;
  price_per_hour: number | null;
  is_published: boolean;
}

interface PilotProfile {
  id: string;
  user_id: string;
  phone: string | null;
  certifications: string[] | null;
  certification_status: boolean;
  certification_validated_at: string | null;
  certification_expires_at: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  profiles: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
  pilot_services: PilotService[];
  subscription_status: string | null;
  subscription_plan: string | null;
}

export function Pilots() {
  const [pilots, setPilots] = useState<PilotProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPilot, setSelectedPilot] = useState<PilotProfile | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pilotToDelete, setPilotToDelete] = useState<PilotProfile | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchPilots();
  }, []);

  const fetchPilots = async () => {
    try {
      // Get pilots with their profile information and services
      const { data: pilotsData, error } = await supabase
        .from('pilots')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Get profiles and services for each pilot
      const pilotsWithDetails = await Promise.all(
        (pilotsData || []).map(async (pilot) => {
          // Get profile data
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name, email, avatar_url')
            .eq('id', pilot.user_id)
            .single();

          // Get pilot services
          const { data: servicesData } = await supabase
            .from('pilot_services')
            .select('*')
            .eq('pilot_id', pilot.id);

          // Get subscription status
          const { data: subscriptionData } = await supabase
            .from('user_subscriptions')
            .select('status, plan_name')
            .eq('user_id', pilot.user_id)
            .maybeSingle();

          return {
            ...pilot,
            profiles: profileData || { full_name: null, email: null, avatar_url: null },
            pilot_services: servicesData || [],
            subscription_status: subscriptionData?.status || null,
            subscription_plan: subscriptionData?.plan_name || null
          };
        })
      );

      setPilots(pilotsWithDetails);
    } catch (error) {
      console.error('Error fetching pilots:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los pilotos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (pilotId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('pilots')
        .update({ status: newStatus })
        .eq('id', pilotId);

      if (error) {
        throw error;
      }

      toast({
        title: "Estado actualizado",
        description: `El estado del piloto ha sido actualizado a ${getStatusLabel(newStatus)}`,
      });

      // Refresh the pilots list
      fetchPilots();
      setDetailsModalOpen(false);
    } catch (error: any) {
      console.error('Error updating pilot status:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el estado del piloto",
        variant: "destructive",
      });
    }
  };

  const handleRenewCertification = async (pilotId: string, userId: string) => {
    try {
      const validationDate = new Date();
      const expirationDate = calculateExpirationDate();

      const { error } = await supabase
        .from('pilots')
        .update({
          certification_validated_at: validationDate.toISOString(),
          certification_expires_at: expirationDate.toISOString(),
          certification_status: true
        })
        .eq('id', pilotId);

      if (error) {
        throw error;
      }

      toast({
        title: "Certificación renovada",
        description: `La certificación ha sido renovada por 1 año más. Válida hasta ${expirationDate.toLocaleDateString('es-CL')}`,
      });

      // Refresh the pilots list
      fetchPilots();
    } catch (error: any) {
      console.error('Error renewing certification:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo renovar la certificación",
        variant: "destructive",
      });
    }
  };

  const openPilotDetails = (pilot: PilotProfile) => {
    setSelectedPilot(pilot);
    setDetailsModalOpen(true);
  };

  const openDeleteDialog = (pilot: PilotProfile) => {
    setPilotToDelete(pilot);
    setDeleteDialogOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!pilotToDelete) return;

    try {
      // Delete user from auth.users (this will cascade delete related data)
      const { error } = await supabase.rpc('delete_user', {
        target_user_id: pilotToDelete.user_id
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Usuario eliminado",
        description: `El usuario ${pilotToDelete.profiles.full_name || 'sin nombre'} y toda su información han sido eliminados permanentemente.`,
      });

      // Refresh the pilots list
      fetchPilots();
      setDeleteDialogOpen(false);
      setPilotToDelete(null);
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el usuario. Asegúrate de tener los permisos necesarios.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'suspended':
        return 'destructive';
      case 'rejected':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    const statusMap: { [key: string]: string } = {
      active: 'Activo',
      pending: 'Pendiente',
      suspended: 'Suspendido',
      rejected: 'Rechazado'
    };
    return statusMap[status] || status;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'pending':
        return <Clock className="h-3 w-3 text-yellow-500" />;
      case 'suspended':
      case 'rejected':
        return <XCircle className="h-3 w-3 text-red-500" />;
      default:
        return <Clock className="h-3 w-3 text-gray-500" />;
    }
  };


  const getMainServiceType = (services: PilotService[]) => {
    const publishedServices = services.filter(service => service.is_published);
    if (publishedServices.length === 0) return "Sin servicios";
    if (publishedServices.length === 1) return publishedServices[0].service_type;
    return `${publishedServices[0].service_type} (+${publishedServices.length - 1})`;
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
          <Plane className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Pilotos</h1>
            <p className="text-muted-foreground">Gestiona los pilotos registrados y sus servicios</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Lista de Pilotos</span>
            <Badge variant="secondary" className="text-sm">
              {pilots.length} pilotos
            </Badge>
          </CardTitle>
          <CardDescription>
            Información de pilotos que han registrado sus servicios en la plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pilots.length === 0 ? (
            <div className="text-center py-8">
              <Plane className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay pilotos registrados</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre Completo</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Certificación</TableHead>
                    <TableHead>Expiración</TableHead>
                    <TableHead>Tipo de Servicio</TableHead>
                    <TableHead>Suscripción</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pilots.map((pilot) => (
                    <TableRow key={pilot.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={pilot.profiles.avatar_url || DEFAULT_AVATAR_URL} />
                            <AvatarFallback>
                              <img src={DEFAULT_AVATAR_URL} alt="Default Avatar" className="h-full w-full object-cover" />
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">
                            {pilot.profiles.full_name || 'Sin nombre'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">
                            {pilot.profiles.email || 'Sin email'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const certStatus = getCertificationStatus(
                            pilot.certification_status,
                            pilot.certification_expires_at
                          );
                          const daysUntilExpiration = getDaysUntilExpiration(pilot.certification_expires_at);

                          if (certStatus === 'valid') {
                            return (
                              <div className="flex items-center gap-1">
                                <CheckCircle className="h-3 w-3 text-green-500" />
                                <Badge variant="default" className="bg-green-500">Vigente</Badge>
                              </div>
                            );
                          } else if (certStatus === 'expiring_soon') {
                            return (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-yellow-500" />
                                <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                                  Por vencer ({daysUntilExpiration}d)
                                </Badge>
                              </div>
                            );
                          } else if (certStatus === 'expired') {
                            return (
                              <div className="flex items-center gap-1">
                                <XCircle className="h-3 w-3 text-red-500" />
                                <Badge variant="destructive">Vencida</Badge>
                              </div>
                            );
                          } else {
                            return (
                              <div className="flex items-center gap-1">
                                <XCircle className="h-3 w-3 text-gray-500" />
                                <Badge variant="secondary">No certificado</Badge>
                              </div>
                            );
                          }
                        })()}
                      </TableCell>
                      <TableCell>
                        {pilot.certification_expires_at ? (
                          <div className="flex flex-col gap-1">
                            <span className="text-xs text-muted-foreground">
                              {formatExpirationDate(pilot.certification_expires_at)}
                            </span>
                            {(() => {
                              const days = getDaysUntilExpiration(pilot.certification_expires_at);
                              if (days !== null && days <= 30) {
                                return (
                                  <span className="text-xs text-yellow-600 font-medium">
                                    {days > 0 ? `${days} días restantes` : 'Vencida'}
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {getMainServiceType(pilot.pilot_services)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {pilot.subscription_status ? (
                          <div className="flex items-center gap-1">
                            {pilot.subscription_status === 'active' ? (
                              <CheckCircle className="h-3 w-3 text-green-500" />
                            ) : (
                              <XCircle className="h-3 w-3 text-gray-500" />
                            )}
                            <Badge
                              variant={pilot.subscription_status === 'active' ? 'default' : 'secondary'}
                              className={pilot.subscription_status === 'active' ? 'bg-green-500' : ''}
                            >
                              {pilot.subscription_status === 'active' ? 'Activa' : 'Inactiva'}
                            </Badge>
                            {pilot.subscription_plan && (
                              <span className="text-xs text-muted-foreground ml-1">
                                ({pilot.subscription_plan})
                              </span>
                            )}
                          </div>
                        ) : (
                          <Badge variant="outline">Sin suscripción</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(pilot.status)}
                          <Badge variant={getStatusBadgeVariant(pilot.status)}>
                            {getStatusLabel(pilot.status)}
                          </Badge>
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
                            <DropdownMenuItem onClick={() => openPilotDetails(pilot)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Ver detalles completos
                            </DropdownMenuItem>
                            {pilot.certification_status && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleRenewCertification(pilot.id, pilot.user_id)}
                                >
                                  <RefreshCw className="mr-2 h-4 w-4" />
                                  Renovar Certificación (1 año)
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleStatusUpdate(pilot.id, pilot.status === 'active' ? 'suspended' : 'rejected')}
                            >
                              <Ban className="mr-2 h-4 w-4" />
                              {pilot.status === 'active' ? 'Suspender' : 'Desactivar'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive font-bold"
                              onClick={() => openDeleteDialog(pilot)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar Usuario Permanentemente
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

      <PilotDetailsModal
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
        pilot={selectedPilot}
        onStatusUpdate={handleStatusUpdate}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">
              ⚠️ Eliminar Usuario Permanentemente
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p className="font-semibold">
                Estás a punto de eliminar al usuario:{" "}
                <span className="text-foreground">
                  {pilotToDelete?.profiles.full_name || 'Sin nombre'}
                </span>
              </p>
              <p className="text-destructive font-bold">
                ⚠️ ADVERTENCIA: Esta acción es IRREVERSIBLE
              </p>
              <div className="bg-destructive/10 p-3 rounded-md border border-destructive/30">
                <p className="text-sm">Se eliminará permanentemente:</p>
                <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                  <li>La cuenta del usuario en el sistema</li>
                  <li>Todos los datos del perfil</li>
                  <li>Servicios publicados</li>
                  <li>Certificaciones y validaciones</li>
                  <li>Historial de suscripciones</li>
                  <li>Toda la información relacionada</li>
                </ul>
              </div>
              <p className="text-sm font-semibold mt-4">
                Una vez eliminado, NO se podrá recuperar la información.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive hover:bg-destructive/90"
            >
              Sí, Eliminar Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}