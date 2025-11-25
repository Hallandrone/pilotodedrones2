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

type DocumentSource = 'user_certifications' | 'flight_logs';

interface DocumentRecord {
  id: string;
  user_id: string;
  file_name: string;
  file_url: string;
  status: 'pending' | 'validated' | 'rejected';
  uploaded_at: string;
  validated_at: string | null;
  rejection_observations: string | null;
  certificate_type?: string | null;
  document_type: 'certificate' | 'company_certificate' | 'flight_log';
  storage_bucket: 'certifications' | 'flight-logs';
  source: DocumentSource;
  flight_date?: string | null;
  duration_hours?: number | null;
  location?: string | null;
  purpose?: string | null;
  notes?: string | null;
  flight_hours?: number | null;
  profiles: {
    full_name: string;
    email: string;
  } | null;
}

const AdminCertificates = () => {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [allDocuments, setAllDocuments] = useState<DocumentRecord[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'validated' | 'rejected'>('pending');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionObservations, setRejectionObservations] = useState('');
  const [targetDocument, setTargetDocument] = useState<DocumentRecord | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadDocuments();
    
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
          // Recargar documentos cuando haya cambios
          loadDocuments();
          
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

    const logsChannel = supabase
      .channel('flight-logs-realtime-admin')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'flight_logs'
        },
        (payload) => {
          console.log('Flight log change detected:', payload);
          loadDocuments();
          if (payload.eventType === 'INSERT' && payload.new?.status === 'pending') {
            toast({
              title: "Nueva vitacora recibida",
              description: `Se ha recibido una nueva vitacora para revisar`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(logsChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (allDocuments.length === 0) return;
    applyFilter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const loadDocuments = async () => {
    try {
      const [
        { data: certsData, error: certsError },
        { data: logsData, error: logsError }
      ] = await Promise.all([
        supabase
          .from('user_certifications')
          .select('*')
          .order('uploaded_at', { ascending: false }),
        supabase
          .from('flight_logs')
          .select('id, user_id, file_name, file_url, status, uploaded_at, validated_at, rejection_observations, flight_date, duration_hours, location, purpose, notes, flight_hours')
          .order('uploaded_at', { ascending: false })
      ]);

      if (certsError) throw certsError;
      if (logsError) throw logsError;

      const userIds = new Set<string>();
      (certsData || []).forEach(cert => userIds.add(cert.user_id));
      (logsData || []).forEach(log => userIds.add(log.user_id));

      let profilesData: { id: string; full_name: string | null; email: string | null }[] | null = [];
      if (userIds.size > 0) {
        const { data, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', Array.from(userIds));

        if (profilesError) {
          console.error('Error loading profiles:', profilesError);
          profilesData = null;
        } else {
          profilesData = data;
        }
      }

      const getProfile = (userId: string) => {
        if (!profilesData) return null;
        const profile = profilesData.find((p) => p.id === userId);
        return profile ? { full_name: profile.full_name || 'Usuario', email: profile.email || '' } : null;
      };

      const certificationRecords: DocumentRecord[] = (certsData || []).map((cert) => ({
        id: cert.id,
        user_id: cert.user_id,
        file_name: cert.file_name,
        file_url: cert.file_url,
        status: cert.status,
        uploaded_at: cert.uploaded_at,
        validated_at: cert.validated_at,
        rejection_observations: cert.rejection_observations,
        certificate_type: cert.certificate_type,
        document_type: cert.certificate_type && cert.certificate_type !== 'pilot' ? 'company_certificate' : 'certificate',
        storage_bucket: 'certifications',
        source: 'user_certifications',
        profiles: getProfile(cert.user_id)
      }));

      const flightLogRecords: DocumentRecord[] = (logsData || []).map((log) => ({
        id: log.id,
        user_id: log.user_id,
        file_name: log.file_name,
        file_url: log.file_url,
        status: log.status,
        uploaded_at: log.uploaded_at,
        validated_at: log.validated_at,
        rejection_observations: log.rejection_observations,
        document_type: 'flight_log',
        storage_bucket: 'flight-logs',
        source: 'flight_logs',
        flight_date: log.flight_date,
        duration_hours: log.duration_hours,
        location: log.location,
        purpose: log.purpose,
        notes: log.notes,
        flight_hours: log.flight_hours,
        profiles: getProfile(log.user_id)
      }));

      const combined = [...certificationRecords, ...flightLogRecords].sort(
        (a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
      );

      setAllDocuments(combined);
      applyFilterToDocs(combined);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los documentos",
        variant: "destructive",
      });
    }
  };

  const applyFilterToDocs = (allDocs: DocumentRecord[]) => {
    if (filter === 'all') {
      setDocuments(allDocs);
    } else {
      const filtered = allDocs.filter(doc => doc.status === filter);
      setDocuments(filtered);
    }
  };

  const applyFilter = () => {
    applyFilterToDocs(allDocuments);
  };

  const handleApprove = async (doc: DocumentRecord) => {
    try {
      if (doc.source === 'user_certifications') {
        const { data: updatedCert, error: certError } = await supabase
          .from('user_certifications')
          .update({ 
            status: 'validated',
            validated_at: new Date().toISOString()
          })
          .eq('id', doc.id)
          .select();

        if (certError) {
          console.error('Error actualizando certificado:', certError);
          throw certError;
        }

        const { data: subscription, error: subscriptionError } = await supabase
          .from('user_subscriptions')
          .select('status, plan_name')
          .eq('user_id', doc.user_id)
          .single();

        if (subscriptionError && subscriptionError.code !== 'PGRST116') {
          console.error('Error verificando suscripción:', subscriptionError);
        }

        const validationDate = new Date();
        const expirationDate = calculateExpirationDate();

        const { error: pilotError } = await supabase
          .from('pilots')
          .update({ 
            certification_status: true,
            status: 'active',
            certification_validated_at: validationDate.toISOString(),
            certification_expires_at: expirationDate.toISOString()
          })
          .eq('user_id', doc.user_id);

        if (pilotError) {
          console.error('Error activating pilot profile:', pilotError);
        }

        toast({
          title: "✅ Certificado aprobado",
          description: `Documento validado. Válido hasta ${expirationDate.toLocaleDateString('es-CL')}`,
        });
      } else {
        const { error: logError } = await supabase
          .from('flight_logs')
          .update({ 
            status: 'validated',
            validated_at: new Date().toISOString()
          })
          .eq('id', doc.id);

        if (logError) throw logError;

        toast({
          title: "✅ Vitacora validada",
          description: "La vitacora fue aprobada correctamente",
        });
      }

      await loadDocuments();
    } catch (error: any) {
      console.error('Error completo al aprobar documento:', error);
      const errorMessage = error?.message || error?.error_description || error?.code || 'Error desconocido';
      toast({
        title: "Error al aprobar documento",
        description: `No se pudo aprobar el documento: ${errorMessage}`,
        variant: "destructive",
      });
    }
  };

  const handleRejectClick = (doc: DocumentRecord) => {
    setTargetDocument(doc);
    setRejectionObservations('');
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!targetDocument) {
      toast({
        title: "Error",
        description: "No se pudo identificar el documento a rechazar",
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
      if (targetDocument.source === 'user_certifications') {
        const { error } = await supabase
          .from('user_certifications')
          .update({ 
            status: 'rejected',
            validated_at: new Date().toISOString(),
            rejection_observations: rejectionObservations.trim()
          })
          .eq('id', targetDocument.id);

        if (error) {
          console.error('Error de Supabase al rechazar:', error);
          throw error;
        }
      } else {
        const { error } = await supabase
          .from('flight_logs')
          .update({ 
            status: 'rejected',
            validated_at: new Date().toISOString(),
            rejection_observations: rejectionObservations.trim()
          })
          .eq('id', targetDocument.id);

        if (error) {
          console.error('Error al rechazar vitacora:', error);
          throw error;
        }
      }

      toast({
        title: "Documento rechazado",
        description: "El documento ha sido rechazado con las observaciones ingresadas",
      });

      setRejectDialogOpen(false);
      setRejectionObservations('');
      setTargetDocument(null);
      await loadDocuments();
    } catch (error: any) {
      console.error('Error completo al rechazar documento:', error);
      const errorMessage = error?.message || error?.error_description || 'Error desconocido';
      toast({
        title: "Error al rechazar documento",
        description: `No se pudo rechazar el documento: ${errorMessage}`,
        variant: "destructive",
      });
    }
  };

  const getSignedUrl = async (filePath: string, bucket: 'certifications' | 'flight-logs'): Promise<string> => {
    // Check if filePath is already a full URL or a path
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      // Already a full URL, return as is
      return filePath;
    }
    
    // It's a path, create signed URL
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, 3600); // 1 hour expiration
    
    if (error) {
      console.error('Error creating signed URL:', error);
      throw error;
    }
    
    return data.signedUrl;
  };

  const handleViewDocument = async (doc: DocumentRecord) => {
    try {
      const url = await getSignedUrl(doc.file_url, doc.storage_bucket);
      window.open(url, '_blank');
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo abrir el documento",
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
    return allDocuments.filter(doc => 
      status === 'all' ? true : doc.status === status
    ).length;
  };

  return (
    <>
      {/* Title and Description */}
      <div className="space-y-2 mb-6">
        <h1 className="text-3xl font-bold text-foreground">
          Gestión de Documentos
        </h1>
        <p className="text-muted-foreground">Aprobar o rechazar certificaciones y vitacoras</p>
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
      {documents.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Detalles</TableHead>
                    <TableHead>Fecha de Subida</TableHead>
                    <TableHead>Fecha de Validación</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Observaciones</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                            <User className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="font-medium">{doc.profiles?.full_name || 'N/A'}</p>
                            <p className="text-sm text-muted-foreground">{doc.profiles?.email || 'N/A'}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <span className="font-medium block">{doc.file_name}</span>
                            <span className="text-xs text-muted-foreground">
                              {doc.document_type === 'flight_log'
                                ? 'Vitacora de vuelo'
                                : doc.document_type === 'company_certificate'
                                  ? `Certificado de empresa (${doc.certificate_type})`
                                  : 'Certificado de piloto'}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {doc.document_type === 'flight_log' ? (
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p><span className="font-medium text-foreground">Fecha:</span> {doc.flight_date ? new Date(doc.flight_date).toLocaleDateString() : 'N/A'}</p>
                            <p><span className="font-medium text-foreground">Duración:</span> {doc.duration_hours ? `${doc.duration_hours} h` : 'N/A'}</p>
                            <p><span className="font-medium text-foreground">Propósito:</span> {doc.purpose || 'N/A'}</p>
                            {doc.location && <p><span className="font-medium text-foreground">Ubicación:</span> {doc.location}</p>}
                            {typeof doc.flight_hours === 'number' && doc.flight_hours > 0 && (
                              <p><span className="font-medium text-foreground">Horas validadas:</span> {doc.flight_hours} h</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {doc.certificate_type ? `Tipo: ${doc.certificate_type}` : '—'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {formatDate(doc.uploaded_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {doc.validated_at ? (
                          <div className="flex items-center gap-2 text-sm text-green-500">
                            <CheckCircle className="h-4 w-4" />
                            {formatDate(doc.validated_at)}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(doc.status)}
                      </TableCell>
                      <TableCell>
                        {doc.status === 'rejected' && doc.rejection_observations ? (
                          <div className="max-w-xs">
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {doc.rejection_observations}
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
                            onClick={() => handleViewDocument(doc)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver
                          </Button>
                          {doc.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApprove(doc)}
                                className="border-green-500 text-green-500 hover:bg-green-500 hover:text-white"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Aprobar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRejectClick(doc)}
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
                No hay documentos {filter === 'all' ? '' : filter === 'pending' ? 'pendientes' : filter === 'validated' ? 'aprobados' : 'rechazados'}
              </h3>
              <p className="text-muted-foreground">
                {filter === 'pending' 
                  ? 'No hay documentos esperando revisión'
                  : 'No hay documentos en esta categoría'}
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
              Rechazar Documento
            </DialogTitle>
            <DialogDescription>
              Ingresa las observaciones sobre por qué se rechaza este documento. El usuario recibirá esta información.
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
                setTargetDocument(null);
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
              Rechazar Documento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminCertificates;



