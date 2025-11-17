import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Eye, 
  CheckCircle, 
  Clock, 
  XCircle,
  User,
  Calendar
} from "lucide-react";

interface Certification {
  id: string;
  user_id: string;
  file_name: string;
  file_url: string;
  status: 'pending' | 'validated' | 'rejected';
  uploaded_at: string;
  validated_at: string | null;
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
  const { toast } = useToast();

  useEffect(() => {
    loadCertifications();
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
      // 1. Primero obtener el user_id del certificado antes de actualizarlo
      const { data: certData } = await supabase
        .from('user_certifications')
        .select('user_id')
        .eq('id', id)
        .single();

      if (!certData) {
        throw new Error('No se pudo obtener el usuario del certificado');
      }

      // 2. Actualizar el certificado
      const { error: certError } = await supabase
        .from('user_certifications')
        .update({ 
          status: 'validated',
          validated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (certError) throw certError;

      // 3. Verificar si tiene suscripción activa
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('status, plan_name')
        .eq('user_id', certData.user_id)
        .single();

      // 4. Si tiene suscripción activa, activar su perfil de piloto
      if (subscription && subscription.status === 'active') {
        const { error: pilotError } = await supabase
          .from('pilots')
          .update({ 
            certification_status: true,
            status: 'active'
          })
          .eq('user_id', certData.user_id);

        if (pilotError) {
          console.error('Error activating pilot profile:', pilotError);
          // No falla toda la operación si esto falla
        }

        toast({
          title: "✅ Certificado aprobado y perfil activado",
          description: "El certificado fue validado y el perfil de piloto está ahora activo",
        });
      } else {
        toast({
          title: "⚠️ Certificado aprobado",
          description: "El certificado fue validado, pero el perfil permanecerá inactivo hasta tener una suscripción activa",
        });
      }

      await loadCertifications();
    } catch (error) {
      console.error('Error approving certification:', error);
      toast({
        title: "Error",
        description: "No se pudo aprobar el certificado",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (id: string) => {
    try {
      const { error } = await supabase
        .from('user_certifications')
        .update({ 
          status: 'rejected',
          validated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Certificado rechazado",
        description: "El certificado ha sido rechazado",
      });

      await loadCertifications();
    } catch (error) {
      console.error('Error rejecting certification:', error);
      toast({
        title: "Error",
        description: "No se pudo rechazar el certificado",
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
      <div className="space-y-4">
        {certifications.length > 0 ? (
          certifications.map((cert) => (
            <Card key={cert.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                      <FileText className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-lg mb-2">{cert.file_name}</h4>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="h-4 w-4" />
                          <span>{cert.profiles?.full_name || 'N/A'}</span>
                          <span>•</span>
                          <span>{cert.profiles?.email || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>Subido: {formatDate(cert.uploaded_at)}</span>
                        </div>
                        {cert.validated_at && (
                          <div className="flex items-center gap-2 text-sm text-green-500">
                            <CheckCircle className="h-4 w-4" />
                            <span>Validado: {formatDate(cert.validated_at)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="ml-4">
                    {getStatusBadge(cert.status)}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleViewCertification(cert.file_url)}
                    className="flex-1"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Ver Certificado
                  </Button>
                  {cert.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleApprove(cert.id)}
                        className="flex-1 border-green-500 text-green-500 hover:bg-green-500 hover:text-white"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Aprobar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReject(cert.id)}
                        className="flex-1 border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Rechazar
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
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
      </div>
    </>
  );
};

export default AdminCertificates;



