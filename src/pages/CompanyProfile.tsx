import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Building2, Upload, UserPlus, X, FileText, Eye, CheckCircle, Clock, XCircle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Company {
  id: string;
  company_name: string;
  logo_url: string | null;
  description: string | null;
  website: string | null;
}

interface AssociatedPilot {
  id: string;
  pilot_id: string;
  pilot: {
    user_id: string;
    profile: {
      full_name: string;
      avatar_url: string | null;
    };
  };
}

interface Certification {
  id: string;
  file_name: string;
  file_url: string;
  status: 'pending' | 'validated' | 'rejected';
  uploaded_at: string;
  certificate_type: 'AOC' | 'CEO';
  rejection_observations?: string | null;
}

export default function CompanyProfile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<Company | null>(null);
  const [associatedPilots, setAssociatedPilots] = useState<AssociatedPilot[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    company_name: "",
    description: "",
    website: "",
  });
  const [newPilotEmail, setNewPilotEmail] = useState("");

  useEffect(() => {
    checkUserAndLoadCompany();
  }, []);

  const checkUserAndLoadCompany = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("user_type")
      .eq("id", user.id)
      .single();

    if (profile?.user_type !== "company") {
      navigate("/pilot-dashboard");
      return;
    }

    await loadCompanyData(user.id);
  };

  const loadCompanyData = async (userId: string) => {
    try {
      const { data: companyData, error: companyError } = await supabase
        .from("companies")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (companyError) throw companyError;

      if (companyData) {
        setCompany(companyData);
        setFormData({
          company_name: companyData.company_name || "",
          description: companyData.description || "",
          website: companyData.website || "",
        });

        await loadAssociatedPilots(companyData.id);
        await loadCertifications();
      }
    } catch (error: any) {
      console.error("Error loading company:", error);
      toast.error("Error al cargar datos de la empresa");
    } finally {
      setLoading(false);
    }
  };

  const loadCertifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('user_certifications')
      .select('*')
      .eq('user_id', user.id)
      .in('certificate_type', ['AOC', 'CEO'])
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('Error loading certifications:', error);
      return;
    }

    setCertifications((data || []) as Certification[]);
  };

  const loadAssociatedPilots = async (companyId: string) => {
    const { data, error } = await supabase
      .from("company_pilots")
      .select(`
        id,
        pilot_id,
        pilot:pilots!inner (
          user_id,
          profile:profiles!inner (
            full_name,
            avatar_url
          )
        )
      `)
      .eq("company_id", companyId);

    if (error) {
      console.error("Error loading pilots:", error);
      return;
    }

    setAssociatedPilots(data || []);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const fileExt = file.name.split(".").pop();
    const filePath = `${user.id}/logo.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("certifications")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast.error("Error al subir logo");
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("certifications")
      .getPublicUrl(filePath);

    await handleSave({ logo_url: publicUrl });
  };

  const handleSave = async (additionalData = {}) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const updateData = { ...formData, ...additionalData };

    if (company) {
      const { error } = await supabase
        .from("companies")
        .update(updateData)
        .eq("user_id", user.id);

      if (error) {
        toast.error("Error al actualizar empresa");
        return;
      }
    } else {
      const { error } = await supabase
        .from("companies")
        .insert({ ...updateData, user_id: user.id });

      if (error) {
        toast.error("Error al crear empresa");
        return;
      }
    }

    toast.success("Empresa actualizada correctamente");
    await loadCompanyData(user.id);
  };

  const handleCertificateUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    certType: 'AOC' | 'CEO'
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Validar tipo de archivo
    const allowedTypes = ['.pdf', '.jpg', '.jpeg', '.png'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedTypes.includes(fileExtension)) {
      toast.error("Solo se permiten archivos PDF, JPG, JPEG y PNG");
      return;
    }

    try {
      setUploading(true);
      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('certifications')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('user_certifications')
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_url: fileName,
          status: 'pending',
          certificate_type: certType
        });

      if (dbError) throw dbError;

      toast.success(`Certificado ${certType} subido correctamente`);
      await loadCertifications();
    } catch (error) {
      console.error('Error uploading certificate:', error);
      toast.error("No se pudo subir el certificado");
    } finally {
      setUploading(false);
      event.target.value = '';
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
      toast.success("Certificado eliminado correctamente");
    } catch (error) {
      console.error('Error deleting certification:', error);
      toast.error("No se pudo eliminar el certificado");
    }
  };

  const getSignedUrl = async (filePath: string): Promise<string> => {
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      return filePath;
    }
    
    const { data, error } = await supabase.storage
      .from('certifications')
      .createSignedUrl(filePath, 3600);
    
    if (error) {
      console.error('Error creating signed URL:', error);
      throw error;
    }
    
    return data.signedUrl;
  };

  const handleViewCertification = async (certId: string) => {
    try {
      const cert = certifications.find(c => c.id === certId);
      if (!cert) return;
      
      const signedUrl = await getSignedUrl(cert.file_url);
      window.open(signedUrl, '_blank');
    } catch (error) {
      console.error('Error viewing certification:', error);
      toast.error("No se pudo abrir el certificado");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'validated': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'validated': return <CheckCircle className="h-3 w-3" />;
      case 'rejected': return <XCircle className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'validated': return 'Validado';
      case 'rejected': return 'Rechazado';
      default: return 'Pendiente';
    }
  };

  const handleAddPilot = async () => {
    if (!newPilotEmail || !company) return;

    const { data: pilotProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", newPilotEmail)
      .eq("user_type", "pilot")
      .maybeSingle();

    if (!pilotProfile) {
      toast.error("No se encontró un piloto con ese email");
      return;
    }

    const { data: pilot } = await supabase
      .from("pilots")
      .select("id")
      .eq("user_id", pilotProfile.id)
      .maybeSingle();

    if (!pilot) {
      toast.error("El usuario no tiene perfil de piloto");
      return;
    }

    const { error } = await supabase
      .from("company_pilots")
      .insert({
        company_id: company.id,
        pilot_id: pilot.id,
      });

    if (error) {
      if (error.code === "23505") {
        toast.error("Este piloto ya está asociado a la empresa");
      } else {
        toast.error("Error al asociar piloto");
      }
      return;
    }

    toast.success("Piloto asociado correctamente");
    setNewPilotEmail("");
    await loadAssociatedPilots(company.id);
  };

  const handleRemovePilot = async (associationId: string) => {
    const { error } = await supabase
      .from("company_pilots")
      .delete()
      .eq("id", associationId);

    if (error) {
      toast.error("Error al eliminar asociación");
      return;
    }

    toast.success("Piloto desasociado correctamente");
    if (company) await loadAssociatedPilots(company.id);
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="flex items-center gap-2 mb-6">
        <Building2 className="h-8 w-8" />
        <h1 className="text-3xl font-bold">Perfil de Empresa</h1>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Información de la Empresa</CardTitle>
          <CardDescription>Completa los datos de tu empresa</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-24 w-24">
              <AvatarImage src={company?.logo_url || ""} />
              <AvatarFallback>
                <Building2 className="h-12 w-12" />
              </AvatarFallback>
            </Avatar>
            <div>
              <Label htmlFor="logo-upload" className="cursor-pointer">
                <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
                  <Upload className="h-4 w-4" />
                  Subir Logo
                </div>
              </Label>
              <Input
                id="logo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="company_name">Nombre de la Empresa</Label>
            <Input
              id="company_name"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="website">Sitio Web</Label>
            <Input
              id="website"
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
            />
          </div>

          <Button onClick={() => handleSave()}>Guardar Cambios</Button>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Certificados de Empresa</CardTitle>
          <CardDescription>Sube tus certificados AOC o CEO</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* AOC Certificate */}
          <div className="space-y-2">
            <Label htmlFor="aoc-certificate">Certificado AOC</Label>
            <Input
              id="aoc-certificate"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => handleCertificateUpload(e, 'AOC')}
              disabled={uploading}
            />
            <p className="text-xs text-muted-foreground">
              Sube tu certificado AOC (Air Operator Certificate)
            </p>
          </div>

          {/* CEO Certificate */}
          <div className="space-y-2">
            <Label htmlFor="ceo-certificate">Certificado CEO</Label>
            <Input
              id="ceo-certificate"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => handleCertificateUpload(e, 'CEO')}
              disabled={uploading}
            />
            <p className="text-xs text-muted-foreground">
              Sube tu certificado CEO (Chief Executive Officer)
            </p>
          </div>

          {/* Lista de certificados subidos */}
          {certifications.length > 0 && (
            <div className="space-y-2 pt-4 border-t">
              <Label>Certificados Subidos</Label>
              <div className="space-y-2">
                {certifications.map((cert) => (
                  <div key={cert.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3 flex-1">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium">{cert.file_name}</p>
                          <Badge className={getStatusColor(cert.status)}>
                            {getStatusIcon(cert.status)}
                            <span className="ml-1">{getStatusText(cert.status)}</span>
                          </Badge>
                          <Badge variant="outline">{cert.certificate_type}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Subido el {new Date(cert.uploaded_at).toLocaleDateString()}
                        </p>
                        {cert.status === 'rejected' && cert.rejection_observations && (
                          <div className="mt-2 p-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded text-xs">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="h-3 w-3 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="font-semibold text-red-800 dark:text-red-300 mb-1">
                                  Observaciones:
                                </p>
                                <p className="text-red-700 dark:text-red-400 whitespace-pre-wrap">
                                  {cert.rejection_observations}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleViewCertification(cert.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDeleteCertification(cert.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pilotos Asociados</CardTitle>
          <CardDescription>Administra los pilotos de tu empresa</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Email del piloto"
              value={newPilotEmail}
              onChange={(e) => setNewPilotEmail(e.target.value)}
            />
            <Button onClick={handleAddPilot}>
              <UserPlus className="h-4 w-4 mr-2" />
              Agregar
            </Button>
          </div>

          <div className="space-y-2">
            {associatedPilots.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No hay pilotos asociados aún
              </p>
            ) : (
              associatedPilots.map((association) => (
                <div
                  key={association.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={association.pilot.profile.avatar_url || ""} />
                      <AvatarFallback>
                        {association.pilot.profile.full_name?.charAt(0) || "P"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">
                      {association.pilot.profile.full_name || "Sin nombre"}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemovePilot(association.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}