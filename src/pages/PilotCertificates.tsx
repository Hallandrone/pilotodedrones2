import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Upload,
  FileText,
  Download,
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  Plus,
  AlertCircle,
  Info,
  Crown
} from "lucide-react";
import { useSubscriptionPlan } from "@/hooks/useSubscriptionPlan";
import { UpgradeModal } from "@/components/subscription/UpgradeModal";

interface Certification {
  id: string;
  file_name: string;
  file_url: string;
  status: 'pending' | 'validated' | 'rejected';
  uploaded_at: string;
  validated_at: string | null;
  rejection_observations?: string | null;
}

const PilotCertificates = () => {
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { plan, loading: planLoading } = useSubscriptionPlan();

  useEffect(() => {
    checkUserType();
    loadCertifications();
  }, []);

  const checkUserType = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUserType(profile.user_type);
      }
    } catch (error) {
      console.error('Error checking user type:', error);
    }
  };

  const loadCertifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_certifications')
        .select('id, file_name, file_url, status, uploaded_at, validated_at, rejection_observations')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      setCertifications((data || []) as Certification[]);
    } catch (error) {
      console.error('Error loading certifications:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las certificaciones",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    // Verificar si el usuario tiene acceso a subir certificados
    if (plan && plan.isFree) {
      setShowUpgradeModal(true);
      event.target.value = '';
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type - Allow PDF and JPG/JPEG
    const allowedTypes = ['.pdf', '.jpg', '.jpeg', '.png'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!allowedTypes.includes(fileExtension)) {
      toast({
        title: "Archivo no válido",
        description: "Solo se permiten archivos PDF, JPG, JPEG o PNG",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (15MB max)
    if (file.size > 15 * 1024 * 1024) {
      toast({
        title: "Archivo muy grande",
        description: "El archivo no puede superar los 15MB",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Upload file to Supabase Storage
      // File path must match policy: first folder must be user_id
      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('certifications')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Save certification record with file path
      // We'll generate signed URLs on the fly when viewing
      const { error: dbError } = await supabase
        .from('user_certifications')
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_url: fileName, // Store the path, not a URL
          status: 'pending'
        });

      if (dbError) throw dbError;

      toast({
        title: "Certificación subida",
        description: "Tu certificación ha sido enviada para revisión",
      });

      // Reload certifications
      await loadCertifications();

    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Error",
        description: "No se pudo subir el archivo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }

    // Reset file input
    event.target.value = '';
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

  const handleDownloadCertification = async (filePath: string, fileName: string) => {
    try {
      const url = await getSignedUrl(filePath);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo descargar el certificado",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCertification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('user_certifications')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setCertifications(prev => prev.filter(cert => cert.id !== id));

      toast({
        title: "Certificación eliminada",
        description: "La certificación ha sido eliminada correctamente",
      });
    } catch (error) {
      console.error('Error deleting certification:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la certificación",
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
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF69B4] mb-4"></div>
          <p className="text-[#B0B0B0]">Cargando certificaciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-[#E0E0E0]">
      {/* Header */}
      <div className="bg-[#212121] border-b border-[#333333] shadow-sm sticky top-0 z-50">
        <div className="px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                // Detectar si viene de /company o /pilot basado en la ruta o user_type
                const isCompany = location.pathname.includes('/company') || userType === 'company';
                navigate(isCompany ? '/company' : '/pilot');
              }}
              className="h-10 w-10 rounded-full hover:bg-[#FF69B4]/10 hover:scale-105 transition-all duration-200"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-[#E0E0E0]">
                Certificados
              </h1>
              <p className="text-sm text-[#B0B0B0] font-medium">Gestiona tus certificaciones PDF/JPG</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 pb-20">
        {/* Upload Section */}
        <Card className="bg-[#212121] border border-[#333333] shadow-xl rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-[#FF69B4]/20 via-[#FF69B4]/10 to-[#FF69B4]/20 p-1">
            <CardHeader className="p-6 bg-[#2C2C2C] rounded-xl">
              <CardTitle className="flex items-center gap-3 text-xl font-bold text-[#E0E0E0]">
                <div className="h-10 w-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                  <Upload className="h-5 w-5 text-white" />
                </div>
                Subir Certificado
              </CardTitle>
              <CardDescription className="text-[#B0B0B0] font-medium">
                Sube tus certificaciones en formato PDF, JPG o PNG para validación solo por Academia de drone Chile
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 bg-[#2C2C2C] rounded-xl">
              <div className="border-2 border-dashed border-[#333333] rounded-2xl p-8 text-center hover:border-green-500 hover:bg-green-500/10 transition-all duration-200 group">
                <div className="h-16 w-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-200">
                  <FileText className="h-8 w-8 text-white" />
                </div>
                <p className="text-[#E0E0E0] font-medium mb-2">
                  Arrastra y suelta tu certificado aquí, o
                </p>
                <label htmlFor="certificate-upload" className="cursor-pointer">
                  <Button
                    asChild
                    variant="outline"
                    disabled={uploading}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0 rounded-xl px-6 py-3 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                  >
                    <span>
                      <Plus className="h-4 w-4 mr-2" />
                      {uploading ? 'Subiendo...' : 'Seleccionar Archivo'}
                    </span>
                  </Button>
                  <input
                    id="certificate-upload"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-[#B0B0B0] mt-3">
                  Archivos PDF, JPG, JPEG o PNG (máx. 15MB)
                </p>
              </div>
            </CardContent>
          </div>
        </Card>

        {/* Certifications List */}
        {certifications.length > 0 ? (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-[#E0E0E0]">
              Mis Certificaciones
            </h3>
            {certifications.map((cert) => (
              <Card key={cert.id} className="bg-[#212121] border border-[#333333] shadow-xl rounded-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-[#FF69B4]/20 via-[#FF69B4]/10 to-[#FF69B4]/20 p-1">
                  <CardContent className="p-6 bg-[#2C2C2C] rounded-xl">
                    <div className="flex items-start justify-between mb-4 flex-col sm:flex-row gap-3">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                          <FileText className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h4 className="font-bold text-[#E0E0E0] text-lg break-words">{cert.file_name}</h4>
                          <p className="text-sm text-[#B0B0B0] font-medium">
                            Subido el {formatDate(cert.uploaded_at)}
                          </p>
                          {cert.validated_at && (
                            <p className="text-sm text-green-500 font-medium">
                              Validado el {formatDate(cert.validated_at)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        {getStatusBadge(cert.status)}
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewCertification(cert.file_url)}
                        className="flex-1 bg-[#2C2C2C] border-[#333333] hover:bg-blue-500/10 hover:border-blue-500 hover:text-blue-500 transition-all duration-200 rounded-xl text-[#E0E0E0]"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Ver
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadCertification(cert.file_url, cert.file_name)}
                        className="flex-1 bg-[#2C2C2C] border-[#333333] hover:bg-green-500/10 hover:border-green-500 hover:text-green-500 transition-all duration-200 rounded-xl text-[#E0E0E0]"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Descargar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteCertification(cert.id)}
                        className="bg-[#2C2C2C] border-[#333333] hover:bg-red-500/10 hover:border-red-500 hover:text-red-500 transition-all duration-200 rounded-xl text-[#E0E0E0]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Observaciones del administrador */}
                    {cert.rejection_observations && (
                      <div className={`mt-4 p-4 rounded-xl border ${cert.status === 'rejected'
                        ? 'bg-red-500/10 border-red-500/30'
                        : cert.status === 'validated'
                          ? 'bg-green-500/10 border-green-500/30'
                          : 'bg-blue-500/10 border-blue-500/30'
                        }`}>
                        <div className="flex items-start gap-3">
                          {cert.status === 'rejected' ? (
                            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                          ) : cert.status === 'validated' ? (
                            <Info className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                          ) : (
                            <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                          )}
                          <div className="flex-1">
                            <p className={`text-sm font-semibold mb-1 ${cert.status === 'rejected'
                              ? 'text-red-400'
                              : cert.status === 'validated'
                                ? 'text-green-400'
                                : 'text-blue-400'
                              }`}>
                              {cert.status === 'rejected'
                                ? 'Observaciones del administrador (Rechazado):'
                                : cert.status === 'validated'
                                  ? 'Observaciones del administrador (Validado):'
                                  : 'Observaciones del administrador:'
                              }
                            </p>
                            <p className={`text-sm whitespace-pre-wrap ${cert.status === 'rejected'
                              ? 'text-red-300'
                              : cert.status === 'validated'
                                ? 'text-green-300'
                                : 'text-blue-300'
                              }`}>
                              {cert.rejection_observations}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-[#212121] border border-[#333333] shadow-xl rounded-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-[#FF69B4]/20 via-[#FF69B4]/10 to-[#FF69B4]/20 p-1">
              <CardContent className="p-8 text-center bg-[#2C2C2C] rounded-xl">
                <div className="h-20 w-20 bg-gradient-to-br from-slate-500 to-gray-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <FileText className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#E0E0E0] mb-3">
                  No tienes certificaciones
                </h3>
                <p className="text-[#B0B0B0] font-medium mb-4">
                  Sube tus certificaciones para comenzar a validar tu perfil
                </p>
              </CardContent>
            </div>
          </Card>
        )}
      </div>

      {/* Modal de Upgrade */}
      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        requiredPlan="pro"
        feature="Subida de certificados"
        featureDescription="La subida de certificados está disponible en Plan Pro y Plan Empresa. Actualiza tu plan para validar tu perfil profesional."
      />
    </div>
  );
};

export default PilotCertificates;
