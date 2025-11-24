import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  FileText, 
  Eye, 
  CheckCircle, 
  Clock, 
  XCircle,
  User,
  Calendar,
  AlertCircle
} from "lucide-react";
import { calculateExpirationDate } from "@/utils/certificationHelpers";

interface Certification {
  id: string;
  user_id: string;
  file_name: string;
  file_url: string;
  status: 'pending' | 'validated' | 'rejected';
  uploaded_at: string;
  validated_at: string | null;
  rejection_observations: string | null;
  profiles: {
    full_name: string;
    email: string;
  } | null;
}

const AdminCertificates = () => {
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [allCertifications, setAllCertifications] = useState<Certification[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'validated' | 'rejected'>('pending');
  const [selectedCert, setSelectedCert] = useState<Certification | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionObservations, setRejectionObservations] = useState('');
  const [rejectingCertId, setRejectingCertId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadCertifications();
    
    // Configurar Realtime subscription para escuchar cambios en tiempo real
    const channel = supabase
      .channel('certifications-realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // Escuchar INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'user_certifications'
        },
        (payload) => {
          console.log('Certification change detected:', payload);
          // Recargar certificaciones cuando haya cambios
          loadCertifications();
          
          // Mostrar notificación si es un nuevo certificado
          if (payload.eventType === 'INSERT' && payload.new?.status === 'pending') {
            toast({
              title: "Nuevo certificado recibido",
              description: `Se ha recibido un nuevo certificado para revisar`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (allCertifications.length === 0) return;
    applyFilter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const loadCertifications = async () => {
    try {
      // Always load ALL certifications to have correct counts
      // Use JOIN to fetch all data in a single query - MUCH FASTER!
      // Note: user_certifications.user_id -> auth.users -> profiles.id
      const { data: certsData, error: certsError } = await supabase
        .from('user_certifications')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (certsError) throw certsError;

      // Get unique user IDs
      const userIds = [...new Set((certsData || []).map(cert => cert.user_id))];
      
      // Fetch all profiles at once
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error loading profiles:', profilesError);
        // Continue without profiles if there's an error
      }

      // Combine certifications with profiles
      const certificationsWithProfiles = (certsData || []).map(cert => {
        const profile = profilesData?.find(p => p.id === cert.user_id);
        return {
          ...cert,
          profiles: profile ? { full_name: profile.full_name, email: profile.email } : null
        };
      });

      const allCerts = certificationsWithProfiles as Certification[];
      setAllCertifications(allCerts);
      
      // Apply current filter
      applyFilterToCerts(allCerts);
    } catch (error) {
      console.error('Error loading certifications:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las certificaciones",
        variant: "destructive",
      });
    }
  };

  const applyFilterToCerts = (allCerts: Certification[]) => {
    if (filter === 'all') {
      setCertifications(allCerts);
    } else {
      const filtered = allCerts.filter(cert => cert.status === filter);
      setCertifications(filtered);
    }
  };

  const applyFilter = () => {
    applyFilterToCerts(allCertifications);
  };

  const handleApprove = async (id: string) => {
    try {
      console.log('Aprobando certificado:', id);
      
      // 1. Primero obtener el user_id del certificado antes de actualizarlo
      const { data: certData, error: certDataError } = await supabase
        .from('user_certifications')
        .select('user_id')
        .eq('id', id)
        .single();

      if (certDataError) {
        console.error('Error obteniendo datos del certificado:', certDataError);
        throw certDataError;
      }

      if (!certData) {
        throw new Error('No se pudo obtener el usuario del certificado');
      }

      console.log('Datos del certificado obtenidos:', certData);

      // 2. Actualizar el certificado
      const { data: updatedCert, error: certError } = await supabase
        .from('user_certifications')
        .update({ 
          status: 'validated',
          validated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select();

      if (certError) {
        console.error('Error actualizando certificado:', certError);
        throw certError;
      }

      console.log('Certificado actualizado exitosamente:', updatedCert);

      // 3. Verificar si tiene suscripción activa
      const { data: subscription, error: subscriptionError } = await supabase
        .from('user_subscriptions')
        .select('status, plan_name')
        .eq('user_id', certData.user_id)
        .single();

      if (subscriptionError && subscriptionError.code !== 'PGRST116') {
        // PGRST116 es "no rows returned", que es normal si no tiene suscripción
        console.error('Error verificando suscripción:', subscriptionError);
      }

      // 4. Calcular fechas de validación y expiración (1 año)
      const validationDate = new Date();
      const expirationDate = calculateExpirationDate();

      // 5. Actualizar perfil de piloto con certificación y fechas
      const { error: pilotError } = await supabase
        .from('pilots')
        .update({ 
          certification_status: true,
          status: 'active',
          certification_validated_at: validationDate.toISOString(),
          certification_expires_at: expirationDate.toISOString()
        })
        .eq('user_id', certData.user_id);

      if (pilotError) {
        console.error('Error activating pilot profile:', pilotError);
        // No falla toda la operación si esto falla
      } else {
        console.log('Perfil de piloto activado exitosamente con fechas de validación');
      }

      // 6. Si tiene suscripción activa, mostrar mensaje adicional
      if (subscription && subscription.status === 'active') {
        toast({
          title: "✅ Certificado aprobado y perfil activado",
          description: `El certificado fue validado y el perfil de piloto está ahora activo. Válido hasta ${expirationDate.toLocaleDateString('es-CL')}`,
        });
      } else {
        toast({
          title: "✅ Certificado aprobado",
          description: `El certificado fue validado exitosamente. Válido hasta ${expirationDate.toLocaleDateString('es-CL')}`,
        });
      }

      await loadCertifications();
    } catch (error: any) {
      console.error('Error completo al aprobar certificado:', error);
      const errorMessage = error?.message || error?.error_description || error?.code || 'Error desconocido';
      toast({
        title: "Error al aprobar certificado",
        description: `No se pudo aprobar el certificado: ${errorMessage}`,
        variant: "destructive",
      });
    }
  };

  const handleRejectClick = (id: string) => {
    setRejectingCertId(id);
    setRejectionObservations('');
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!rejectingCertId) {
      toast({
        title: "Error",
        description: "No se pudo identificar el certificado a rechazar",
        variant: "destructive",
      });
      return;
    }

    if (!rejectionObservations.trim()) {
      toast({
        title: "Observaciones requeridas",
        description: "Debes ingresar las observaciones para rechazar el certificado",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('Rechazando certificado:', rejectingCertId);
      console.log('Observaciones:', rejectionObservations.trim());
      
      const { data, error } = await supabase
        .from('user_certifications')
        .update({ 
          status: 'rejected',
          validated_at: new Date().toISOString(),
          rejection_observations: rejectionObservations.trim()
        })
        .eq('id', rejectingCertId)
        .select();

      if (error) {
        console.error('Error de Supabase al rechazar:', error);
        throw error;
      }

      console.log('Certificado rechazado exitosamente:', data);

      toast({
        title: "Certificado rechazado",
        description: "El certificado ha sido rechazado con las observaciones ingresadas",
      });

      setRejectDialogOpen(false);
      setRejectionObservations('');
      setRejectingCertId(null);
      await loadCertifications();
    } catch (error: any) {
      console.error('Error completo al rechazar certificado:', error);
      const errorMessage = error?.message || error?.error_description || 'Error desconocido';
      toast({
        title: "Error al rechazar certificado",
        description: `No se pudo rechazar el certificado: ${errorMessage}`,
        variant: "destructive",
      });
    }
  };

  const getSignedUrl = async (filePath: string): Promise<string> => {
    // Check if filePath is already a full URL or a path
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      // Already a full URL, return as is
      return filePath;
    }
    
    // It's a path, create signed URL
    const { data, error } = await supabase.storage
      .from('certifications')
      .createSignedUrl(filePath, 3600); // 1 hour expiration
    
    if (error) {
      console.error('Error creating signed URL:', error);
      throw error;
    }
    
    return data.signedUrl;
  };

  const handleViewCertification = async (filePath: string) => {
    try {
      const url = await getSignedUrl(filePath);
      window.open(url, '_blank');
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo abrir el certificado",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'validated':
        return (
          <Badge className="bg-green-500/20 text-green-500 border border-green-500">
            <CheckCircle className="h-3 w-3 mr-1" />
            Validado
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-500/20 text-red-500 border border-red-500">
            <XCircle className="h-3 w-3 mr-1" />
            Rechazado
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-500/20 text-yellow-500 border border-yellow-500">
            <Clock className="h-3 w-3 mr-1" />
            Pendiente
          </Badge>
        );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFilterCount = (status: string) => {
    return allCertifications.filter(cert => 
      status === 'all' ? true : cert.status === status
    ).length;
  };

  return (
    <>
      {/* Title and Description */}
      <div className="space-y-2 mb-6">
        <h1 className="text-3xl font-bold text-foreground">
          Gestión de Certificados
        </h1>
        <p className="text-muted-foreground">Aprobar o rechazar certificaciones</p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-2 overflow-x-auto">
        <Button
          size="sm"
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
          className={`rounded-xl ${filter === 'all' ? 'text-white' : 'text-muted-foreground border-muted-foreground/20'}`}
        >
          Todas ({getFilterCount('all')})
        </Button>
        <Button
          size="sm"
          variant={filter === 'pending' ? 'default' : 'outline'}
          onClick={() => setFilter('pending')}
          className={`rounded-xl ${filter === 'pending' ? 'text-white' : 'text-muted-foreground border-muted-foreground/20'}`}
        >
          Pendientes ({getFilterCount('pending')})
        </Button>
        <Button
          size="sm"
          variant={filter === 'validated' ? 'default' : 'outline'}
          onClick={() => setFilter('validated')}
          className={`rounded-xl ${filter === 'validated' ? 'text-white' : 'text-muted-foreground border-muted-foreground/20'}`}
        >
          Aprobados ({getFilterCount('validated')})
        </Button>
        <Button
          size="sm"
          variant={filter === 'rejected' ? 'default' : 'outline'}
          onClick={() => setFilter('rejected')}
          className={`rounded-xl ${filter === 'rejected' ? 'text-white' : 'text-muted-foreground border-muted-foreground/20'}`}
        >
          Rechazados ({getFilterCount('rejected')})
        </Button>
      </div>

      {/* Content */}
      {certifications.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Certificado</TableHead>
                    <TableHead>Fecha de Subida</TableHead>
                    <TableHead>Fecha de Validación</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Observaciones</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {certifications.map((cert) => (
                    <TableRow key={cert.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                            <User className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="font-medium">{cert.profiles?.full_name || 'N/A'}</p>
                            <p className="text-sm text-muted-foreground">{cert.profiles?.email || 'N/A'}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{cert.file_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {formatDate(cert.uploaded_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {cert.validated_at ? (
                          <div className="flex items-center gap-2 text-sm text-green-500">
                            <CheckCircle className="h-4 w-4" />
                            {formatDate(cert.validated_at)}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(cert.status)}
                      </TableCell>
                      <TableCell>
                        {cert.status === 'rejected' && cert.rejection_observations ? (
                          <div className="max-w-xs">
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {cert.rejection_observations}
                            </p>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewCertification(cert.file_url)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver
                          </Button>
                          {cert.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApprove(cert.id)}
                                className="border-green-500 text-green-500 hover:bg-green-500 hover:text-white"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Aprobar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRejectClick(cert.id)}
                                className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Rechazar
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="h-20 w-20 bg-gradient-to-br from-slate-500 to-gray-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <FileText className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3">
                No hay certificaciones {filter === 'all' ? '' : filter === 'pending' ? 'pendientes' : filter === 'validated' ? 'aprobadas' : 'rechazadas'}
              </h3>
              <p className="text-muted-foreground">
                {filter === 'pending' 
                  ? 'No hay certificaciones esperando revisión'
                  : 'No hay certificaciones en esta categoría'}
              </p>
            </CardContent>
          </Card>
        )}

      {/* Dialog para ingresar observaciones al rechazar */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Rechazar Certificado
            </DialogTitle>
            <DialogDescription>
              Ingresa las observaciones sobre por qué se rechaza este certificado. El usuario recibirá esta información.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="observations">Observaciones *</Label>
              <Textarea
                id="observations"
                placeholder="Ej: El certificado no cumple con los requisitos establecidos, falta información, documento ilegible, etc."
                value={rejectionObservations}
                onChange={(e) => setRejectionObservations(e.target.value)}
                rows={5}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Estas observaciones serán visibles para el usuario
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setRejectionObservations('');
                setRejectingCertId(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionObservations.trim()}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Rechazar Certificado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminCertificates;



