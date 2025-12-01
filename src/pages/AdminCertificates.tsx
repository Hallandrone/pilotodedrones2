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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
  AlertCircle,
  GraduationCap,
  Plane,
  Building2
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

interface GroupedUserDocuments {
  user_id: string;
  user: {
    full_name: string;
    email: string;
  };
  documents: DocumentRecord[];
  summary: {
    total: number;
    pending: number;
    validated: number;
    rejected: number;
  };
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
          .maybeSingle(); // Usa maybeSingle() para evitar error 406 cuando no hay datos

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

  const groupDocumentsByUser = (docs: DocumentRecord[]): GroupedUserDocuments[] => {
    const grouped = new Map<string, GroupedUserDocuments>();

    docs.forEach(doc => {
      if (!grouped.has(doc.user_id)) {
        grouped.set(doc.user_id, {
          user_id: doc.user_id,
          user: {
            full_name: doc.profiles?.full_name || 'Usuario Desconocido',
            email: doc.profiles?.email || 'N/A'
          },
          documents: [],
          summary: {
            total: 0,
            pending: 0,
            validated: 0,
            rejected: 0
          }
        });
      }

      const group = grouped.get(doc.user_id)!;
      group.documents.push(doc);
      group.summary.total++;
      
      if (doc.status === 'pending') group.summary.pending++;
      else if (doc.status === 'validated') group.summary.validated++;
      else if (doc.status === 'rejected') group.summary.rejected++;
    });

    return Array.from(grouped.values()).sort((a, b) => 
      new Date(b.documents[0]?.uploaded_at || 0).getTime() - 
      new Date(a.documents[0]?.uploaded_at || 0).getTime()
    );
  };

  const getDocumentTypeBadge = (doc: DocumentRecord) => {
    if (doc.document_type === 'flight_log') {
      return (
        <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
          <Plane className="h-3 w-3 mr-1" />
          Certificado de Itinerario/Horas de Vuelo
        </Badge>
      );
    } else if (doc.document_type === 'company_certificate') {
      return (
        <Badge className="bg-purple-500/20 text-purple-500 border-purple-500/30">
          <Building2 className="h-3 w-3 mr-1" />
          Certificado de Empresa ({doc.certificate_type})
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">
          <GraduationCap className="h-3 w-3 mr-1" />
          Certificado de Cursos/Capacitaciones
        </Badge>
      );
    }
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
            <Accordion type="multiple" className="w-full">
              {groupDocumentsByUser(documents).map((group) => (
                <AccordionItem key={group.user_id} value={group.user_id} className="border-b">
                  <AccordionTrigger className="px-6 py-4 hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                          <User className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-lg text-foreground">
                            {group.user.full_name}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {group.user.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-sm font-medium text-foreground">
                            {group.summary.total} {group.summary.total === 1 ? 'documento' : 'documentos'}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {group.summary.pending > 0 && (
                              <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30 text-xs">
                                {group.summary.pending} pendiente{group.summary.pending !== 1 ? 's' : ''}
                              </Badge>
                            )}
                            {group.summary.validated > 0 && (
                              <Badge className="bg-green-500/20 text-green-500 border-green-500/30 text-xs">
                                {group.summary.validated} validado{group.summary.validated !== 1 ? 's' : ''}
                              </Badge>
                            )}
                            {group.summary.rejected > 0 && (
                              <Badge className="bg-red-500/20 text-red-500 border-red-500/30 text-xs">
                                {group.summary.rejected} rechazado{group.summary.rejected !== 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-4">
                    <div className="space-y-3 pt-2">
                      {group.documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="border rounded-lg p-4 bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-2">
                                {getDocumentTypeBadge(doc)}
                                <span className="font-medium text-foreground truncate">
                                  {doc.file_name}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>Subido: {formatDate(doc.uploaded_at)}</span>
                                </div>
                                {doc.validated_at && (
                                  <div className="flex items-center gap-1 text-green-500">
                                    <CheckCircle className="h-3 w-3" />
                                    <span>Validado: {formatDate(doc.validated_at)}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {getStatusBadge(doc.status)}
                            </div>
                          </div>

                          {doc.document_type === 'flight_log' && (
                            <div className="text-sm text-muted-foreground space-y-1 mb-3 bg-background/50 rounded p-2">
                              {doc.flight_date && (
                                <p><span className="font-medium text-foreground">Fecha de vuelo:</span> {new Date(doc.flight_date).toLocaleDateString()}</p>
                              )}
                              {doc.duration_hours && (
                                <p><span className="font-medium text-foreground">Duración:</span> {doc.duration_hours} h</p>
                              )}
                              {doc.purpose && (
                                <p><span className="font-medium text-foreground">Propósito:</span> {doc.purpose}</p>
                              )}
                              {doc.location && (
                                <p><span className="font-medium text-foreground">Ubicación:</span> {doc.location}</p>
                              )}
                              {typeof doc.flight_hours === 'number' && doc.flight_hours > 0 && (
                                <p><span className="font-medium text-foreground">Horas validadas:</span> {doc.flight_hours} h</p>
                              )}
                            </div>
                          )}

                          {doc.rejection_observations && (
                            <div className={`mb-3 p-3 rounded-lg border ${
                              doc.status === 'rejected'
                                ? 'bg-red-500/10 border-red-500/30'
                                : doc.status === 'validated'
                                ? 'bg-green-500/10 border-green-500/30'
                                : 'bg-blue-500/10 border-blue-500/30'
                            }`}>
                              <div className="flex items-start gap-2">
                                {doc.status === 'rejected' ? (
                                  <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                                ) : doc.status === 'validated' ? (
                                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                ) : (
                                  <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                )}
                                <div className="flex-1">
                                  <p className={`text-sm font-semibold mb-1 ${
                                    doc.status === 'rejected'
                                      ? 'text-red-400'
                                      : doc.status === 'validated'
                                      ? 'text-green-400'
                                      : 'text-blue-400'
                                  }`}>
                                    Observaciones:
                                  </p>
                                  <p className={`text-sm whitespace-pre-wrap ${
                                    doc.status === 'rejected'
                                      ? 'text-red-300'
                                      : doc.status === 'validated'
                                      ? 'text-green-300'
                                      : 'text-blue-300'
                                  }`}>
                                    {doc.rejection_observations}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewDocument(doc)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Documento
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
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
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



