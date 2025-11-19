import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileText, Check, Clock, X, CreditCard, Calendar, Phone, Mail, MapPin, Shield, Eye, AlertCircle } from "lucide-react";
import type { User } from '@supabase/supabase-js';

// Types
interface ProfileData {
  full_name: string;
  email: string;
  phone?: string;
  address?: string;
  instagram_username?: string;
  linkedin_username?: string;
}

interface Certification {
  id: string;
  file_name: string;
  file_url: string;
  status: 'pending' | 'approved' | 'rejected';
  uploaded_at: string;
  rejection_observations?: string | null;
}

interface Subscription {
  plan_name: string;
  status: 'active' | 'inactive' | 'expired';
  renewal_date: string;
  payment_method: string;
}

const UserProfile = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [profile, setProfile] = useState<ProfileData>({
    full_name: '',
    email: '',
    phone: '',
    address: '',
    instagram_username: '',
    linkedin_username: ''
  });
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    // Configurar Realtime subscription para escuchar cambios en tiempo real
    const channel = supabase
      .channel('user-certifications-realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // Escuchar INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'user_certifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Certification change detected in user profile:', payload);
          
          // Si es una actualización, actualizar el certificado específico
          if (payload.eventType === 'UPDATE' && payload.new) {
            console.log('Actualizando certificado en tiempo real:', payload.new);
            setCertifications(prev => prev.map(cert => {
              if (cert.id === payload.new.id) {
                const updatedCert = {
                  ...cert,
                  status: payload.new.status as 'pending' | 'approved' | 'rejected',
                  rejection_observations: payload.new.rejection_observations || null
                };
                console.log('Certificado actualizado:', updatedCert);
                return updatedCert;
              }
              return cert;
            }));
            
            // Mostrar notificación si fue rechazado
            if (payload.new.status === 'rejected' && payload.new.rejection_observations) {
              toast({
                title: "Certificado rechazado",
                description: "Tu certificado ha sido rechazado. Revisa las observaciones.",
                variant: "destructive",
              });
            } else if (payload.new.status === 'validated') {
              toast({
                title: "Certificado aprobado",
                description: "Tu certificado ha sido validado exitosamente",
              });
            }
          } else if (payload.eventType === 'INSERT' && payload.new) {
            // Agregar nuevo certificado
            setCertifications(prev => [...prev, {
              id: payload.new.id,
              file_name: payload.new.file_name,
              file_url: payload.new.file_url,
              status: payload.new.status as 'pending' | 'approved' | 'rejected',
              uploaded_at: payload.new.uploaded_at,
              rejection_observations: payload.new.rejection_observations || null
            }]);
          } else if (payload.eventType === 'DELETE' && payload.old) {
            // Eliminar certificado
            setCertifications(prev => prev.filter(cert => cert.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, toast]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setUser(user);

      // Get user role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (roleData) {
        setUserRole(roleData.role);
        
        // If super admin, don't load personal profile data
        if (roleData.role === 'super_admin') {
          setLoading(false);
          return;
        }
      }

      // Load profile data
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setProfile({
          full_name: profileData.full_name || '',
          email: profileData.email || user.email || '',
          phone: profileData.phone || '',
          address: '',
          instagram_username: profileData.instagram_username || '',
          linkedin_username: profileData.linkedin_username || ''
        });
      }

      // Load certifications
      const { data: certsData, error: certsError } = await supabase
        .from('user_certifications')
        .select('id, file_name, file_url, status, uploaded_at, rejection_observations')
        .eq('user_id', user.id);

      if (certsError) {
        console.error('Error loading certifications:', certsError);
      }

      if (certsData) {
        console.log('Certificaciones cargadas:', certsData);
        setCertifications(certsData.map(cert => ({
          id: cert.id,
          file_name: cert.file_name,
          file_url: cert.file_url,
          status: cert.status as 'pending' | 'approved' | 'rejected',
          uploaded_at: cert.uploaded_at,
          rejection_observations: cert.rejection_observations || null
        })));
      }

      // Load subscription data
      const { data: subData } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (subData) {
        setSubscription({
          plan_name: subData.plan_name,
          status: subData.status as 'active' | 'inactive' | 'expired',
          renewal_date: subData.renewal_date,
          payment_method: subData.payment_method || 'No especificado'
        });
      }
      
    } catch (error) {
      console.error('Error loading user data:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos del usuario",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Function to clean social media username (remove @, URLs, etc.)
  const cleanSocialUsername = (input: string): string => {
    if (!input) return '';
    
    let cleaned = input.trim();
    
    // Remove common URL patterns
    cleaned = cleaned.replace(/^https?:\/\//, '');
    cleaned = cleaned.replace(/^www\./, '');
    cleaned = cleaned.replace(/^instagram\.com\//, '');
    cleaned = cleaned.replace(/^linkedin\.com\//, '');
    cleaned = cleaned.replace(/^linkedin\.com\/in\//, '');
    
    // Remove @ symbol
    cleaned = cleaned.replace(/^@/, '');
    
    // Remove trailing slashes and query parameters
    cleaned = cleaned.split('/')[0].split('?')[0];
    
    // Only allow alphanumeric, dots, underscores, and hyphens
    cleaned = cleaned.replace(/[^a-zA-Z0-9._-]/g, '');
    
    return cleaned;
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    // Basic validation
    if (!profile.full_name.trim()) {
      toast({
        title: "Error",
        description: "El nombre es obligatorio",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      
      // Clean social media usernames
      const cleanedInstagram = profile.instagram_username 
        ? cleanSocialUsername(profile.instagram_username) 
        : null;
      const cleanedLinkedIn = profile.linkedin_username 
        ? cleanSocialUsername(profile.linkedin_username) 
        : null;
      
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: profile.full_name.trim(),
          email: profile.email,
          phone: profile.phone || null,
          instagram_username: cleanedInstagram || null,
          linkedin_username: cleanedLinkedIn || null,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "Perfil actualizado",
        description: "Tus datos han sido guardados correctamente",
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar el perfil",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    const allowedTypes = ['.pdf', '.jpg', '.jpeg', '.png'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedTypes.includes(fileExtension)) {
      toast({
        title: "Archivo no válido",
        description: "Solo se permiten archivos PDF, JPG, JPEG y PNG",
        variant: "destructive",
      });
      return;
    }

    try {
      // Upload file to Supabase Storage
      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('certifications')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Save certification record with file path
      const { error: dbError } = await supabase
        .from('user_certifications')
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_url: fileName, // Store the path, not a URL
          status: 'pending'
        });

      if (dbError) throw dbError;

      // Update local state
      const newCert: Certification = {
        id: Date.now().toString(), // Temporal ID
        file_name: file.name,
        file_url: fileName,
        status: 'pending',
        uploaded_at: new Date().toISOString()
      };

      setCertifications(prev => [...prev, newCert]);

      toast({
        title: "Certificación subida",
        description: "Tu certificación ha sido enviada para revisión",
      });

    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Error",
        description: "No se pudo subir el archivo",
        variant: "destructive",
      });
    }

    // Reset file input
    event.target.value = '';
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'expired': return 'bg-red-100 text-red-800 border-red-200';
      case 'inactive': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <Check className="h-3 w-3" />;
      case 'rejected': return <X className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved': return 'Aprobado';
      case 'rejected': return 'Rechazado';
      case 'active': return 'Activo';
      case 'expired': return 'Expirado';
      case 'inactive': return 'Inactivo';
      default: return 'Pendiente';
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

  const handleViewCertification = async (certId: string) => {
    try {
      const cert = certifications.find(c => c.id === certId);
      if (!cert) return;
      
      const signedUrl = await getSignedUrl(cert.file_url);
      window.open(signedUrl, '_blank');
    } catch (error) {
      console.error('Error viewing certification:', error);
      toast({
        title: "Error",
        description: "No se pudo abrir el certificado",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  // Redirect super admins
  if (userRole === 'super_admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/30">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="text-center">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">Acceso Restringido</h1>
              <p className="text-muted-foreground">Los super administradores no tienen perfil personal</p>
            </div>
            <Card className="max-w-md mx-auto shadow-md border-0 bg-card/50 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="text-center">
                  <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">Panel de Administración</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Como super administrador, utiliza las herramientas de gestión disponibles en el panel principal.
                  </p>
                  <Button 
                    onClick={() => window.history.back()}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    Volver al Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Mi Perfil</h1>
          <p className="text-white/80 text-lg">Gestiona tu información personal y certificaciones</p>
        </div>

        <div className="grid gap-6">
          {/* Personal Information */}
          <Card className="shadow-xl border-2 border-accent/20 bg-white/95 backdrop-blur-sm">
            <CardHeader className="border-b border-accent/10 bg-gradient-to-r from-accent/5 to-transparent">
              <CardTitle className="flex items-center gap-3 text-primary text-2xl">
                <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center">
                  <Mail className="h-5 w-5 text-white" />
                </div>
                Información Personal
              </CardTitle>
              <CardDescription className="text-base">
                Actualiza tu información básica de contacto
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="text-foreground font-medium">
                    Nombre completo *
                  </Label>
                  <Input
                    id="full_name"
                    type="text"
                    value={profile.full_name}
                    onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
                    className="border-border/50 focus:border-accent"
                    placeholder="Tu nombre completo"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground font-medium">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                    className="border-border/50 focus:border-accent bg-muted/30"
                    placeholder="tu@email.com"
                    disabled
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-foreground font-medium">
                    <Phone className="inline h-4 w-4 mr-1" />
                    Teléfono
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                    className="border-border/50 focus:border-accent"
                    placeholder="+56 9 1234 5678"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address" className="text-foreground font-medium">
                    <MapPin className="inline h-4 w-4 mr-1" />
                    Dirección
                  </Label>
                  <Input
                    id="address"
                    type="text"
                    value={profile.address}
                    onChange={(e) => setProfile(prev => ({ ...prev, address: e.target.value }))}
                    className="border-border/50 focus:border-accent"
                    placeholder="Tu dirección"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instagram_username" className="text-foreground font-medium">
                    <span className="inline-block mr-1">📷</span>
                    Instagram
                  </Label>
                  <Input
                    id="instagram_username"
                    type="text"
                    value={profile.instagram_username || ''}
                    onChange={(e) => setProfile(prev => ({ ...prev, instagram_username: e.target.value }))}
                    className="border-border/50 focus:border-accent"
                    placeholder="nombre_usuario (sin @)"
                  />
                  <p className="text-xs text-muted-foreground">
                    Solo ingresa tu nombre de usuario, sin @ ni URL
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="linkedin_username" className="text-foreground font-medium">
                    <span className="inline-block mr-1">💼</span>
                    LinkedIn
                  </Label>
                  <Input
                    id="linkedin_username"
                    type="text"
                    value={profile.linkedin_username || ''}
                    onChange={(e) => setProfile(prev => ({ ...prev, linkedin_username: e.target.value }))}
                    className="border-border/50 focus:border-accent"
                    placeholder="nombre-usuario (sin URL)"
                  />
                  <p className="text-xs text-muted-foreground">
                    Solo ingresa tu nombre de usuario de linkedin.com/in/
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <Button 
                  onClick={handleSaveProfile}
                  disabled={saving}
                  size="lg"
                  className="bg-accent hover:bg-accent/90 text-white px-8 shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Certifications */}
          <Card className="shadow-xl border-2 border-accent/20 bg-white/95 backdrop-blur-sm">
            <CardHeader className="border-b border-accent/10 bg-gradient-to-r from-accent/5 to-transparent">
              <CardTitle className="flex items-center gap-3 text-primary text-2xl">
                <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                Certificaciones
              </CardTitle>
              <CardDescription className="text-base">
                Sube y gestiona tus certificaciones de piloto
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {/* Info Message */}
              <div className="mb-6 p-4 bg-accent/10 border border-accent/20 rounded-lg">
                <p className="text-sm text-foreground leading-relaxed">
                  <strong className="text-accent">💡 Importante:</strong> Subir un certificado validado le da más seriedad y credibilidad a tu perfil profesional. Los certificados aprobados aumentan la confianza de los clientes y mejoran tu visibilidad en la plataforma.
                </p>
              </div>
              
              {/* Upload Area */}
              <div className="border-2 border-dashed border-border/50 rounded-lg p-6 text-center hover:border-accent/50 transition-colors">
                <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-2">
                  Arrastra y suelta tu certificación aquí, o 
                </p>
                <Label htmlFor="certification-upload" className="cursor-pointer">
                  <span className="text-accent hover:text-accent/80 font-medium">selecciona un archivo</span>
                  <Input
                    id="certification-upload"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Formatos admitidos: PDF, JPG, PNG (máx. 10MB)
                </p>
              </div>

              {/* Certifications List */}
              {certifications.length > 0 && (
                <div className="mt-6">
                  <Separator className="mb-4" />
                  <h4 className="font-medium text-foreground mb-4">Certificaciones subidas</h4>
                  <div className="space-y-3">
                    {certifications.map((cert) => (
                      <div key={cert.id} className="p-4 bg-muted/30 rounded-lg border border-border/30">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-foreground">{cert.file_name}</p>
                              <p className="text-xs text-muted-foreground">
                                Subido el {new Date(cert.uploaded_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(cert.status)}>
                              {getStatusIcon(cert.status)}
                              <span className="ml-1">{getStatusText(cert.status)}</span>
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewCertification(cert.id)}
                              className="text-primary hover:text-primary hover:bg-primary/10"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCertification(cert.id)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {cert.status === 'rejected' && (
                          <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-red-800 dark:text-red-300 mb-1">
                                  Observaciones del administrador:
                                </p>
                                {cert.rejection_observations ? (
                                  <p className="text-sm text-red-700 dark:text-red-400 whitespace-pre-wrap">
                                    {cert.rejection_observations}
                                  </p>
                                ) : (
                                  <p className="text-sm text-red-600 dark:text-red-400 italic">
                                    No se proporcionaron observaciones específicas.
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Subscription */}
          {subscription && (
            <Card className="shadow-md border-0 bg-card/50 backdrop-blur-sm">
              <CardHeader className="border-b border-border/50">
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <div className="h-5 w-5 rounded bg-accent/20 flex items-center justify-center">
                    <CreditCard className="h-3 w-3 text-accent" />
                  </div>
                  Suscripción
                </CardTitle>
                <CardDescription>
                  Detalles de tu plan y facturación
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-muted-foreground text-sm">Plan actual</Label>
                    <p className="font-semibold text-foreground capitalize">{subscription.plan_name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">Estado</Label>
                    <div>
                      <Badge className={getStatusColor(subscription.status)}>
                        {getStatusText(subscription.status)}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">
                      <Calendar className="inline h-4 w-4 mr-1" />
                      Próxima renovación
                    </Label>
                    <p className="font-medium text-foreground">
                      {subscription.renewal_date ? new Date(subscription.renewal_date).toLocaleDateString() : 'No especificado'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">Método de pago</Label>
                    <p className="font-medium text-foreground">{subscription.payment_method}</p>
                  </div>
                </div>
                <div className="mt-6">
                  <Button variant="outline" className="border-accent text-accent hover:bg-accent hover:text-white">
                    Actualizar plan
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;