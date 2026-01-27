import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getUserRole } from "@/lib/auth-utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DEFAULT_AVATAR_URL } from "@/hooks/useDefaultAvatar";
import Logo from "@/components/ui/logo";
import {
  MonitorPlay,
  LayoutDashboard,
  Shield,
  CreditCard,
  Mail,
  Settings,
  FileText,
  QrCode,
  CheckCircle,
  AlertCircle,
  XCircle,
  Clock,
  Phone,
  HelpCircle,
  MessageSquarePlus
} from "lucide-react";
import { FeedbackForm } from "@/components/dashboard/FeedbackForm";
import type { User } from '@supabase/supabase-js';
import {
  getCertificationStatus,
  getDaysUntilExpiration,
  formatExpirationDate,
  type CertificationStatus
} from "@/utils/certificationHelpers";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Routes, Route } from "react-router-dom";
import WeatherCard from "@/components/weather/WeatherCard";
import { CompanyPilotManagement } from "@/components/company/CompanyPilotManagement";
import { getBaseUrlClean } from "@/lib/getBaseUrl";
import { CompanyBasicInfo } from "@/components/company/CompanyBasicInfo";
import { CompanyServices } from "@/components/company/CompanyServices";
import { CompanyLogoBanner } from "@/components/company/CompanyLogoBanner";
import { CompanySocialLinks } from "@/components/company/CompanySocialLinks";
import { CompanyCertificates } from "@/components/company/CompanyCertificates";
import { CompanyQR } from "@/components/company/CompanyQR";
import { CompanyMembership } from "@/components/company/CompanyMembership";
import { CompanyPortfolio } from "@/components/company/CompanyPortfolio";
import { CompanyContacts } from "@/components/company/CompanyContacts";

interface CompanyData {
  id: string;
  user_id: string;
  company_name: string;
  logo_url: string | null;
  description: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  location: string | null;
  region: string | null;
  experience_years: number | null;
  services: string[] | null;
  drone_types: string[] | null;
  instagram_username: string | null;
  linkedin_username: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
  created_at: string;
  profiles: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
    public_profile_slug: string | null;
  };
}

interface CompanyMetrics {
  experience_years: number;
  services_count: number;
}

const CompanyDashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);
  const [metrics, setMetrics] = useState<CompanyMetrics>({
    experience_years: 0,
    services_count: 0
  });
  const [subscription, setSubscription] = useState<{ status: string; plan_name: string; renewal_date: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [useInstagramUrl, setUseInstagramUrl] = useState(false);
  const [useLinkedInUrl, setUseLinkedInUrl] = useState(false);
  const [publicProfileSlug, setPublicProfileSlug] = useState<string>('');
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugFeedback, setSlugFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [customService, setCustomService] = useState('');
  const [customDrone, setCustomDrone] = useState('');

  const [formData, setFormData] = useState({
    company_name: "",
    description: "",
    website: "",
    phone: "",
    email: "",
    location: "",
    region: "",
    experience_years: 0,
    services: [] as string[],
    drone_types: [] as string[],
    instagram_username: "",
    linkedin_username: "",
    instagram_url: "",
    linkedin_url: "",
  });

  const navigate = useNavigate();
  const { toast } = useToast();

  const regions = [
    'Región Metropolitana', 'Región de Valparaíso', 'Región del Biobío',
    'Región de Antofagasta', 'Región de Atacama', 'Región de Coquimbo',
    'Región de O\'Higgins', 'Región del Maule', 'Región de La Araucanía',
    'Región de Los Lagos', 'Región de Aysén', 'Región de Magallanes',
    'Región de Tarapacá', 'Región de Arica y Parinacota', 'Región de Los Ríos'
  ];

  const serviceOptions = [
    'Fotografía Aérea', 'Topografía', 'Inspección Industrial',
    'Agricultura de Precisión', 'Seguridad y Vigilancia', 'Construcción',
    'Minería', 'Búsqueda y Rescate', 'Monitoreo Ambiental',
    'Entretenimiento', 'Mapeo 3D'
  ];

  const basicDrones = ['DJI Mini 2', 'DJI Mini 3', 'DJI Mini 4', 'DJI Mini SE'];
  const intermediateDrones = ['DJI Mavic Air 2', 'DJI Mavic 3', 'DJI Phantom 4 Pro'];
  const professionalDrones = ['DJI Inspire 2', 'DJI Matrice 300 RTK', 'DJI Agras T40'];

  // Helper functions
  const cleanSocialUsername = (input: string): string => {
    if (!input) return '';
    return input.trim().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  };

  const buildInstagramUrl = (username: string) => `https://instagram.com/${cleanSocialUsername(username)}`;
  const buildLinkedInUrl = (username: string) => `https://linkedin.com/company/${cleanSocialUsername(username)}`;

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleService = (service: string) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.includes(service)
        ? prev.services.filter(s => s !== service)
        : [...prev.services, service]
    }));
  };

  const toggleDroneType = (drone: string) => {
    setFormData(prev => ({
      ...prev,
      drone_types: prev.drone_types.includes(drone)
        ? prev.drone_types.filter(d => d !== drone)
        : [...prev.drone_types, drone]
    }));
  };

  const addCustomService = () => {
    if (customService.trim() && !formData.services.includes(customService.trim())) {
      toggleService(customService.trim());
      setCustomService('');
    }
  };

  const addCustomDrone = () => {
    if (customDrone.trim() && !formData.drone_types.includes(customDrone.trim())) {
      toggleDroneType(customDrone.trim());
      setCustomDrone('');
    }
  };

  const isCustomService = (service: string) => !serviceOptions.includes(service);
  const isCustomDrone = (drone: string) => ![...basicDrones, ...intermediateDrones, ...professionalDrones].includes(drone);

  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) toast({ title: "Subida de logo", description: "Funcionalidad avanzada disponible en el sitio completo" });
  };

  const handleSlugChange = (val: string) => setPublicProfileSlug(val.toLowerCase().replace(/\s+/g, '-'));

  const handleSlugVerification = () => {
    setCheckingSlug(true);
    setTimeout(() => {
      setCheckingSlug(false);
      setSlugAvailable(true);
      setSlugFeedback({ type: 'success', text: 'URL Disponible' });
    }, 500);
  };

  useEffect(() => {
    checkUserAuth();
  }, []);

  const checkUserAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        navigate('/auth');
        return;
      }

      setUser(session.user);

      // Get user role
      const roleData = await getUserRole(session.user.id);

      if (!roleData || roleData.role !== 'company') {
        toast({
          title: "Acceso denegado",
          description: "Esta área es solo para empresas",
          variant: "destructive",
        });
        navigate(roleData?.role === 'pilot' ? '/pilot' : '/');
        return;
      }

      await loadCompanyData(session.user.id);
    } catch (error) {
      console.error('Error checking auth:', error);
      navigate('/auth');
    } finally {
      setLoading(false);
    }
  };

  const loadCompanyData = async (userId: string) => {
    try {
      // First, get user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      // Try to get company data
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (companyError) throw companyError;

      let companyInfo = companyData;
      if (!companyData) {
        const { data: newCompanyData, error: createError } = await supabase
          .from('companies')
          .insert({ user_id: userId, company_name: profileData.full_name || 'Mi Empresa' })
          .select()
          .single();
        if (createError) throw createError;
        companyInfo = newCompanyData;
      }

      const combinedData = { ...companyInfo, profiles: profileData };
      setCompanyData(combinedData);

      // Update form data and metrics
      setFormData({
        company_name: companyInfo.company_name || "",
        description: companyInfo.description || "",
        website: companyInfo.website || "",
        phone: companyInfo.phone || "",
        email: companyInfo.email || profileData.email || "",
        location: companyInfo.location || "",
        region: companyInfo.region || "",
        experience_years: companyInfo.experience_years || 0,
        services: companyInfo.services || [],
        drone_types: companyInfo.drone_types || [],
        instagram_username: companyInfo.instagram_username || "",
        linkedin_username: companyInfo.linkedin_username || "",
        instagram_url: companyInfo.instagram_url || "",
        linkedin_url: companyInfo.linkedin_url || "",
      });

      setPublicProfileSlug(profileData.public_profile_slug || '');
      setMetrics({
        experience_years: companyInfo.experience_years || 0,
        services_count: companyInfo.services?.length || 0
      });

      await loadSubscription(userId);
    } catch (error) {
      console.error('Error loading company data:', error);
    }
  };

  const loadSubscription = async (userId: string) => {
    const { data } = await supabase.from('user_subscriptions').select('*').eq('user_id', userId).maybeSingle();
    setSubscription(data);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('companies').update(formData).eq('user_id', user?.id);
      if (error) throw error;

      if (publicProfileSlug !== companyData?.profiles?.public_profile_slug) {
        await supabase.from('profiles').update({ public_profile_slug: publicProfileSlug }).eq('id', user?.id);
      }

      toast({ title: "Éxito", description: "Dashboard actualizado correctamente" });
      await loadCompanyData(user!.id);
    } catch (e) {
      toast({ title: "Error", description: "No se pudo guardar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Load certifications
  const [certificationStatus, setCertificationStatus] = useState<'valid' | 'expiring_soon' | 'expired' | 'not_validated'>('not_validated');

  useEffect(() => {
    const loadCertStatus = async () => {
      if (!user?.id) return;
      const { data } = await supabase.from('user_certifications').select('status').eq('user_id', user.id).in('certificate_type', ['AOC', 'CEO']);
      const validated = data?.filter(c => c.status === 'validated') || [];
      setCertificationStatus(validated.length > 0 ? 'valid' : 'not_validated');
    };
    loadCertStatus();
  }, [user?.id]);

  if (loading) return <div className="min-h-screen bg-[#083b4e] flex items-center justify-center text-white">Cargando...</div>;

  const isSubscriptionValid = subscription && (subscription.status === 'active');

  const PaidRoute = ({ children }: { children: React.ReactNode }) => {
    if (!isSubscriptionValid) {
      return (
        <div className="flex items-center justify-center p-4 min-h-[60vh]">
          <Card className="relative max-w-md w-full bg-white/10 backdrop-blur-xl border-2 border-[#00b3f3]/30 shadow-2xl transform-gpu">
            <CardHeader className="text-center">
              <Shield className="h-12 w-12 text-white mx-auto mb-4" />
              <CardTitle className="text-2xl text-white">Suscripción Requerida</CardTitle>
              <CardDescription className="text-white/80">Acceso exclusivo para empresas con plan activo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={() => navigate('/company/membership')} className="w-full bg-[#00b3f3] text-white">Ver Planes</Button>
              <Button variant="ghost" onClick={handleSignOut} className="w-full text-white/60">Cerrar Sesión</Button>
            </CardContent>
          </Card>
        </div>
      );
    }
    return <>{children}</>;
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[#083b4e] relative overflow-hidden">
        {/* Optimized Background Layers */}
        <div className="absolute inset-0 bg-[#083b4e]"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-[#083b4e] to-[#0a4a61] pointer-events-none"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjAzIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20 pointer-events-none"></div>

        <DashboardSidebar userRole="company" />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          <DashboardHeader user={user} />

          <main className="flex-1 overflow-y-auto p-6 relative">
            <div className="max-w-7xl mx-auto space-y-6">
              <Routes>
                <Route path="/" element={
                  <PaidRoute>
                    <div className="space-y-6 animate-fade-in">
                      <div className="space-y-3 mb-8">
                        <h1 className="text-4xl font-bold text-white">Panel de Control</h1>
                        <p className="text-white/80 text-lg">Bienvenido al dashboard de {companyData?.company_name || 'tu empresa'}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="bg-[#0b485d] border-2 border-[#00b3f3]/30 shadow-2xl rounded-3xl isolation-isolate">
                          <CardContent className="p-8">
                            <div className="flex items-center gap-6 mb-8">
                              <Avatar className="h-20 w-20 ring-4 ring-[#00b3f3]/50">
                                <AvatarImage src={companyData?.logo_url || companyData?.profiles?.avatar_url || DEFAULT_AVATAR_URL} />
                                <AvatarFallback className="bg-gradient-to-br from-[#00b3f3] to-[#0099cc] text-white text-2xl">
                                  {companyData?.company_name?.[0] || 'E'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h2 className="text-2xl font-bold text-white">{companyData?.company_name}</h2>
                                <p className="text-white/60">{companyData?.email}</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-[#083b4e]/50 rounded-2xl p-4 border border-white/10">
                                <div className="text-3xl font-bold text-[#00b3f3]">{metrics.experience_years}</div>
                                <div className="text-sm text-white/60">Años de Experiencia</div>
                              </div>
                              <div className="bg-[#083b4e]/50 rounded-2xl p-4 border border-white/10">
                                <div className="text-3xl font-bold text-[#00b3f3]">{metrics.services_count}</div>
                                <div className="text-sm text-white/60">Servicios</div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <WeatherCard hasActiveSubscription={isSubscriptionValid} />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="bg-[#0b485d] border-2 border-emerald-500/30 p-6 flex flex-col justify-between rounded-3xl isolation-isolate">
                          <div className="flex items-center gap-4 mb-4">
                            <div className="h-12 w-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                              <Shield className="h-6 w-6 text-emerald-400" />
                            </div>
                            <div>
                              <h3 className="text-white font-semibold">Certificación</h3>
                              <p className="text-xs text-white/60">Estado de AOC/CEO</p>
                            </div>
                          </div>
                          <Badge className={`${certificationStatus === 'valid' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'} border-none w-fit`}>
                            {certificationStatus === 'valid' ? 'Validado' : 'Sin Validar'}
                          </Badge>
                        </Card>

                        <Card className="bg-[#0b485d] border-2 border-purple-500/30 p-6 flex flex-col justify-between rounded-3xl isolation-isolate">
                          <div className="flex items-center gap-4 mb-4">
                            <div className="h-12 w-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                              <CreditCard className="h-6 w-6 text-purple-400" />
                            </div>
                            <div>
                              <h3 className="text-white font-semibold">Membresía</h3>
                              <p className="text-xs text-white/60">{subscription?.plan_name || 'Sin plan'}</p>
                            </div>
                          </div>
                          <Badge className="bg-purple-500/20 text-purple-400 border-none w-fit">
                            {isSubscriptionValid ? 'Activa' : 'Inactiva'}
                          </Badge>
                        </Card>

                        <Card className="bg-[#0b485d] border-2 border-orange-500/30 p-6 flex flex-col justify-between rounded-3xl isolation-isolate">
                          <div className="flex items-center gap-4 mb-4">
                            <div className="h-12 w-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                              <LayoutDashboard className="h-6 w-6 text-orange-400" />
                            </div>
                            <div>
                              <h3 className="text-white font-semibold">Perfil Público</h3>
                              <p className="text-xs text-white/60">Gestiona tu identidad</p>
                            </div>
                          </div>
                          <Button variant="link" className="text-orange-400 p-0 h-auto justify-start" onClick={() => navigate('/company/profile')}>
                            Editar Perfil →
                          </Button>
                        </Card>
                      </div>

                      {companyData?.id && <CompanyPilotManagement companyId={companyData.id} />}

                      {/* Support Section */}
                      <div className="grid grid-cols-1 gap-6 pb-12">
                        <Card className="group bg-[#0b485d] border-2 border-[#00b3f3]/30 shadow-2xl rounded-3xl isolation-isolate">
                          <div className="p-1">
                            <CardContent className="p-8 bg-[#083b4e]/60 rounded-3xl">
                              <div className="flex items-center gap-4 mb-6">
                                <div className="h-14 w-14 bg-gradient-to-br from-slate-500 to-gray-600 rounded-2xl flex items-center justify-center shadow-lg">
                                  <HelpCircle className="h-7 w-7 text-white" />
                                </div>
                                <span className="text-white text-xl font-bold">Soporte y Ayuda</span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                  <p className="text-white/80 text-base leading-relaxed mb-4">
                                    ¿Necesitas ayuda académica o técnica? Nuestro equipo está aquí para asistirte.
                                  </p>
                                </div>

                                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                                  <Button
                                    size="lg"
                                    className="w-full justify-start bg-white/5 border-2 border-emerald-500/30 hover:bg-emerald-500 hover:border-emerald-500 text-white transition-all duration-300 rounded-2xl shadow-xl h-14"
                                    onClick={() => window.open('https://wa.me/56969013735')}
                                  >
                                    <Phone className="h-5 w-5 mr-3" />
                                    Soporte Académico
                                  </Button>
                                  <Button
                                    size="lg"
                                    className="w-full justify-start bg-white/5 border-2 border-[#00b3f3]/30 hover:bg-[#00b3f3] hover:border-[#00b3f3] text-white transition-all duration-300 rounded-2xl shadow-xl h-14"
                                    onClick={() => window.open('https://wa.me/56954751380')}
                                  >
                                    <Phone className="h-5 w-5 mr-3" />
                                    Soporte Técnico
                                  </Button>
                                  <FeedbackForm />
                                </div>
                              </div>
                            </CardContent>
                          </div>
                        </Card>
                      </div>
                    </div>
                  </PaidRoute>
                } />

                <Route path="/profile" element={
                  <div className="space-y-6 animate-fade-in">
                    <CompanyLogoBanner
                      company={companyData}
                      formData={formData}
                      handleLogoSelect={handleLogoSelect}
                      uploadingLogo={uploadingLogo}
                      DEFAULT_AVATAR_URL={DEFAULT_AVATAR_URL}
                      publicProfileSlug={publicProfileSlug}
                      handleSlugChange={handleSlugChange}
                      handleSlugVerification={handleSlugVerification}
                      checkingSlug={checkingSlug}
                      slugAvailable={slugAvailable}
                      slugFeedback={slugFeedback}
                      appBaseUrl={getBaseUrlClean()}
                      handleSave={handleSave}
                      saving={saving}
                    />
                    <CompanyBasicInfo
                      formData={formData}
                      handleInputChange={handleInputChange}
                      regions={regions}
                      handleSave={handleSave}
                      saving={saving}
                    />
                    <CompanySocialLinks
                      formData={formData}
                      handleInputChange={handleInputChange}
                      useInstagramUrl={useInstagramUrl}
                      setUseInstagramUrl={setUseInstagramUrl}
                      useLinkedInUrl={useLinkedInUrl}
                      setUseLinkedInUrl={setUseLinkedInUrl}
                      cleanSocialUsername={cleanSocialUsername}
                      buildInstagramUrl={buildInstagramUrl}
                      buildLinkedInUrl={buildLinkedInUrl}
                      handleSave={handleSave}
                      saving={saving}
                    />
                    <CompanyServices
                      formData={formData}
                      serviceOptions={serviceOptions}
                      basicDrones={basicDrones}
                      intermediateDrones={intermediateDrones}
                      professionalDrones={professionalDrones}
                      toggleService={toggleService}
                      toggleDroneType={toggleDroneType}
                      customService={customService}
                      setCustomService={setCustomService}
                      addCustomService={addCustomService}
                      customDrone={customDrone}
                      setCustomDrone={setCustomDrone}
                      addCustomDrone={addCustomDrone}
                      handleSave={handleSave}
                      saving={saving}
                      isCustomService={isCustomService}
                      isCustomDrone={isCustomDrone}
                    />
                  </div>
                } />
                <Route path="/pilots" element={<PaidRoute>{companyData?.id ? <CompanyPilotManagement companyId={companyData.id} /> : <div>Cargando...</div>}</PaidRoute>} />
                <Route path="/certificates" element={<PaidRoute><CompanyCertificates /></PaidRoute>} />
                <Route path="/qr" element={<PaidRoute><CompanyQR /></PaidRoute>} />
                <Route path="/membership" element={<CompanyMembership />} />
                <Route path="/portfolio" element={<PaidRoute><CompanyPortfolio /></PaidRoute>} />
                <Route path="/contacts" element={<PaidRoute><CompanyContacts userId={user?.id} /></PaidRoute>} />
              </Routes>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default CompanyDashboard;
