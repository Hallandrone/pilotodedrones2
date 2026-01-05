import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getUserRole } from "@/lib/auth-utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Logo from "@/components/ui/logo";
import {
  Building2,
  MapPin,
  Calendar,
  FileText,
  QrCode,
  Settings,
  LogOut,
  CheckCircle,
  AlertCircle,
  XCircle,
  Phone,
  Mail,
  Shield,
  CreditCard,
  HelpCircle,
  Briefcase
} from "lucide-react";
import type { User } from '@supabase/supabase-js';
import {
  getCertificationStatus,
  getDaysUntilExpiration,
  formatExpirationDate,
  type CertificationStatus
} from "@/utils/certificationHelpers";
import { CompanyPilotManagement } from "@/components/company/CompanyPilotManagement";
import WeatherCard from "@/components/weather/WeatherCard";

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
  created_at: string;
  profiles: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
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
  const navigate = useNavigate();
  const { toast } = useToast();

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

      // Check if user is a company
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', session.user.id)
        .single();

      if (profileError) {
        console.error('Error loading profile:', profileError);
        toast({
          title: "Error",
          description: "No se pudo verificar el tipo de usuario",
          variant: "destructive",
        });
        navigate('/auth');
        return;
      }

      if (profile?.user_type !== 'company') {
        toast({
          title: "Acceso denegado",
          description: "Esta área es solo para empresas",
          variant: "destructive",
        });
        // Redirigir según el tipo de usuario
        if (profile?.user_type === 'pilot') {
          navigate('/pilot');
        } else {
          navigate('/');
        }
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
      console.log('Loading company data for user:', userId);

      // First, get user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Error loading profile:', profileError);
        throw new Error('No se pudo cargar el perfil del usuario');
      }

      console.log('Profile loaded:', profileData);

      // Try to get company data
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (companyError && companyError.code !== 'PGRST116') {
        console.error('Error loading company data:', companyError);
        throw companyError;
      }

      // If company data doesn't exist, create it
      let companyInfo = companyData;

      if (!companyData) {
        console.log('Creating company record...');
        const { data: newCompanyData, error: createCompanyError } = await supabase
          .from('companies')
          .insert({
            user_id: userId,
            company_name: profileData.full_name || 'Mi Empresa',
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (createCompanyError) {
          console.error('Error creating company record:', createCompanyError);
          // Use fallback structure if creation fails
          companyInfo = {
            id: '',
            user_id: userId,
            company_name: profileData.full_name || 'Mi Empresa',
            logo_url: null,
            description: null,
            website: null,
            phone: null,
            email: null,
            location: null,
            region: null,
            experience_years: null,
            services: null,
            drone_types: null,
            created_at: new Date().toISOString()
          };
        } else {
          companyInfo = newCompanyData;
          console.log('Company record created:', companyInfo);
        }
      }

      // Combine profile and company data
      const combinedData = {
        ...companyInfo,
        profiles: profileData
      };

      console.log('Combined company data:', combinedData);
      setCompanyData(combinedData);

      // Set metrics
      setMetrics({
        experience_years: companyInfo?.experience_years || 0,
        services_count: companyInfo?.services?.length || 0
      });

      console.log('Company data loaded successfully');

      // Cargar suscripción
      await loadSubscription(userId);

    } catch (error) {
      console.error('Error loading company data:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos de la empresa",
        variant: "destructive",
      });
    }
  };

  const loadSubscription = async (userId: string) => {
    try {
      const { data: subscriptionData, error } = await supabase
        .from('user_subscriptions')
        .select('status, plan_name, renewal_date')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading subscription:', error);
        return;
      }

      setSubscription(subscriptionData || null);
    } catch (error) {
      console.error('Error loading subscription:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/');
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión correctamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al cerrar sesión",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 rounded-full border border-green-200 shadow-sm">
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-semibold">Activo</span>
          </div>
        );
      default:
        return (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 rounded-full border border-green-200 shadow-sm">
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-semibold">Activo</span>
          </div>
        );
    }
  };

  // Load certifications for AOC/CEO
  const [certifications, setCertifications] = useState<any[]>([]);
  const [certificationStatus, setCertificationStatus] = useState<'valid' | 'expiring_soon' | 'expired' | 'not_validated'>('not_validated');

  useEffect(() => {
    if (user?.id) {
      loadCertifications();
    }
  }, [user?.id]);

  const loadCertifications = async () => {
    if (!user?.id) return;

    try {
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

      setCertifications(data || []);

      // Determine certification status
      const validated = data?.filter(c => c.status === 'validated') || [];
      if (validated.length > 0) {
        setCertificationStatus('valid');
      } else if (data && data.length > 0) {
        setCertificationStatus('not_validated');
      } else {
        setCertificationStatus('not_validated');
      }
    } catch (error) {
      console.error('Error loading certifications:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  // Si no tiene suscripción activa o vigente, redirigir a membresía
  const isSubscriptionValid = subscription && (
    subscription.status === 'active' ||
    (subscription.status === 'cancelled' && subscription.renewal_date && new Date(subscription.renewal_date) > new Date())
  );

  if (companyData && !isSubscriptionValid) {
    return (
      <div className="min-h-screen bg-[#083b4e] relative overflow-hidden flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjAzIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-50"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-[#083b4e] via-[#083b4e] to-[#0a4a61] pointer-events-none"></div>

        <Card className="relative max-w-md w-full bg-white/10 backdrop-blur-xl border-2 border-[#00b3f3]/30 shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full flex items-center justify-center">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl text-white">Suscripción Requerida</CardTitle>
            <CardDescription className="text-white/80">
              Para acceder al dashboard de empresa y todas sus funcionalidades, necesitas una suscripción activa.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <p className="text-white/90 text-sm leading-relaxed">
                Con una suscripción activa podrás:
              </p>
              <ul className="mt-3 space-y-2 text-white/80 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Gestionar pilotos de tu empresa</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Perfil público visible</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Código QR personalizado</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Condiciones meteorológicas en tiempo real</span>
                </li>
              </ul>
            </div>
            <Button
              onClick={() => navigate('/company/membership')}
              className="w-full bg-gradient-to-r from-[#00b3f3] to-[#0099cc] hover:from-[#0099cc] hover:to-[#00b3f3] text-white h-12"
            >
              Ver Planes de Suscripción
            </Button>
            <Button
              variant="ghost"
              onClick={handleSignOut}
              className="w-full text-white/60 hover:text-white hover:bg-white/10"
            >
              Cerrar Sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#083b4e] relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Zz4PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjAzIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGfilL0idXJsKCNncmlkKSIvPjwvZ3JpZz4=')] opacity-50"></div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#083b4e] via-[#083b4e] to-[#0a4a61] pointer-events-none"></div>

      {/* Header */}
      <div className="bg-[#020617]/95 backdrop-blur-xl border-b border-[#00b3f3]/30 shadow-2xl sticky top-0 z-50 relative animate-fade-in">
        <div className="px-3 sm:px-6 py-4 sm:py-6">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <Logo
              size="xl"
              className="hover:scale-110 transition-all duration-300 filter drop-shadow-[0_0_15px_rgba(0,179,243,0.4)] [&>div]:h-14 [&>div]:w-14 sm:[&>div]:h-20 sm:[&>div]:w-20"
              showText={false}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-white hover:text-red-400 hover:bg-red-500/20 rounded-xl px-4 sm:px-6 py-3 sm:py-4 transition-all duration-300 hover:scale-105 border border-transparent hover:border-red-400/50 text-base font-semibold"
            >
              <LogOut className="h-5 w-5 sm:h-6 sm:w-6 sm:mr-3" />
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 pb-20 max-w-7xl mx-auto relative animate-fade-in" style={{ animationDelay: '0.1s' }}>
        {/* Profile Card */}
        <Card className="bg-white/10 backdrop-blur-xl border-2 border-[#00b3f3]/30 shadow-2xl rounded-2xl sm:rounded-3xl overflow-hidden hover:border-[#00b3f3]/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,179,243,0.3)]">
          <div className="bg-gradient-to-br from-[#00b3f3]/20 via-transparent to-[#00b3f3]/10 p-1">
            <CardContent className="p-4 sm:p-8 bg-[#083b4e]/60 backdrop-blur-sm rounded-2xl sm:rounded-3xl">
              <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 mb-4 sm:mb-8">
                <div className="relative">
                  <Avatar className="relative h-20 w-20 sm:h-28 sm:w-28 ring-4 ring-[#00b3f3]/50 shadow-2xl">
                    <AvatarImage src={companyData?.logo_url || companyData?.profiles.avatar_url || ''} />
                    <AvatarFallback className="bg-gradient-to-br from-[#00b3f3] to-[#0099cc] text-white text-2xl sm:text-3xl">
                      {companyData?.company_name?.charAt(0) || 'E'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 h-6 w-6 sm:h-8 sm:w-8 bg-green-500 rounded-full border-4 border-[#083b4e] flex items-center justify-center shadow-lg">
                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h2 className="text-xl sm:text-3xl font-semibold text-white mb-2 tracking-tight">
                    {companyData?.company_name || 'Mi Empresa'}
                  </h2>
                  <p className="text-white/80 flex items-center justify-center sm:justify-start gap-2 mb-3 sm:mb-4 text-sm sm:text-base break-all">
                    <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-[#00b3f3] flex-shrink-0" />
                    <span className="truncate">{companyData?.email || companyData?.profiles.email}</span>
                  </p>
                  <div className="flex justify-center sm:justify-start">
                    {getStatusBadge('active')}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-6">
                <div className="relative group overflow-hidden bg-gradient-to-br from-[#00b3f3]/20 to-transparent rounded-xl sm:rounded-2xl p-3 sm:p-6 border-2 border-[#00b3f3]/30 hover:border-[#00b3f3]/60 transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,179,243,0.3)] hover:scale-105">
                  <div className="absolute inset-0 bg-[#00b3f3]/5 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                  <div className="relative">
                    <div className="text-3xl sm:text-5xl font-semibold text-[#00b3f3] mb-1 sm:mb-3 flex items-baseline gap-1 sm:gap-2">
                      {metrics.experience_years}
                      <span className="text-sm sm:text-lg text-[#00b3f3]/60">años</span>
                    </div>
                    <div className="text-xs sm:text-base text-white/90">Años de Experiencia</div>
                  </div>
                </div>
                <div className="relative group overflow-hidden bg-gradient-to-br from-[#00b3f3]/20 to-transparent rounded-xl sm:rounded-2xl p-3 sm:p-6 border-2 border-[#00b3f3]/30 hover:border-[#00b3f3]/60 transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,179,243,0.3)] hover:scale-105">
                  <div className="absolute inset-0 bg-[#00b3f3]/5 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                  <div className="relative">
                    <div className="text-3xl sm:text-5xl font-semibold text-[#00b3f3] mb-1 sm:mb-3 flex items-baseline gap-1 sm:gap-2">
                      {metrics.services_count}
                      <span className="text-sm sm:text-lg text-[#00b3f3]/60">servicios</span>
                    </div>
                    <div className="text-xs sm:text-base text-white/90">Servicios Ofrecidos</div>
                  </div>
                </div>
              </div>

              {/* Weather Card */}
              <WeatherCard hasActiveSubscription={isSubscriptionValid} />
            </CardContent>
          </div>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <Button
            variant="outline"
            size="lg"
            className="group relative h-24 sm:h-32 flex-col gap-2 sm:gap-4 bg-white/10 backdrop-blur-xl border-2 border-[#00b3f3]/30 hover:bg-[#00b3f3] hover:text-white hover:border-[#00b3f3] hover:scale-105 sm:hover:scale-110 transition-all duration-300 rounded-xl sm:rounded-2xl shadow-xl hover:shadow-[0_0_30px_rgba(0,179,243,0.5)] overflow-hidden"
            onClick={() => navigate('/company/profile')}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#00b3f3]/0 to-[#00b3f3]/0 group-hover:from-[#00b3f3]/20 group-hover:to-transparent transition-all duration-300"></div>
            <div className="relative h-10 w-10 sm:h-14 sm:w-14 bg-gradient-to-br from-[#00b3f3] to-[#0099cc] rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
              <Settings className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
            </div>
            <span className="relative text-xs sm:text-base text-white px-1">Editar Perfil</span>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="group relative h-24 sm:h-32 flex-col gap-2 sm:gap-4 bg-white/10 backdrop-blur-xl border-2 border-[#00b3f3]/30 hover:bg-[#00b3f3] hover:text-white hover:border-[#00b3f3] hover:scale-105 sm:hover:scale-110 transition-all duration-300 rounded-xl sm:rounded-2xl shadow-xl hover:shadow-[0_0_30px_rgba(0,179,243,0.5)] overflow-hidden"
            onClick={() => navigate('/company/certificates')}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#00b3f3]/0 to-[#00b3f3]/0 group-hover:from-[#00b3f3]/20 group-hover:to-transparent transition-all duration-300"></div>
            <div className="relative h-10 w-10 sm:h-14 sm:w-14 bg-gradient-to-br from-[#00b3f3] to-[#0099cc] rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
              <FileText className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
            </div>
            <span className="relative text-xs sm:text-base text-white px-1">Certificados</span>
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="group relative h-24 sm:h-32 flex-col gap-2 sm:gap-4 bg-white/10 backdrop-blur-xl border-2 border-[#00b3f3]/30 hover:bg-[#00b3f3] hover:text-white hover:border-[#00b3f3] hover:scale-105 sm:hover:scale-110 transition-all duration-300 rounded-xl sm:rounded-2xl shadow-xl hover:shadow-[0_0_30px_rgba(0,179,243,0.5)] overflow-hidden"
            onClick={() => navigate('/company/qr')}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#00b3f3]/0 to-[#00b3f3]/0 group-hover:from-[#00b3f3]/20 group-hover:to-transparent transition-all duration-300"></div>
            <div className="relative h-10 w-10 sm:h-14 sm:w-14 bg-gradient-to-br from-[#00b3f3] to-[#0099cc] rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
              <QrCode className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
            </div>
            <span className="relative text-xs sm:text-base text-white px-1">Mi QR</span>
          </Button>
        </div>

        {/* Status Cards */}
        <div className="space-y-4 sm:space-y-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          {/* Certification Status */}
          <Card className="group bg-white/10 backdrop-blur-xl border-2 border-[#00b3f3]/30 shadow-2xl rounded-2xl sm:rounded-3xl overflow-hidden hover:border-[#00b3f3]/60 transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,179,243,0.3)]">
            <div className="bg-gradient-to-br from-[#00b3f3]/20 via-transparent to-emerald-500/10 p-1">
              <CardContent className="p-4 sm:p-8 bg-[#083b4e]/60 backdrop-blur-sm rounded-2xl sm:rounded-3xl">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <div className="flex items-center gap-2 sm:gap-4">
                    <div className={`h-10 w-10 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 ${certificationStatus === 'valid' ? 'bg-gradient-to-br from-emerald-500 to-green-600' :
                      certificationStatus === 'expiring_soon' ? 'bg-gradient-to-br from-yellow-500 to-orange-600' :
                        certificationStatus === 'expired' ? 'bg-gradient-to-br from-red-500 to-red-600' :
                          'bg-gradient-to-br from-gray-500 to-gray-600'
                      }`}>
                      <Shield className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
                    </div>
                    <span className="text-white text-sm sm:text-xl">Estado de Certificación</span>
                  </div>
                  {certificationStatus === 'valid' ? (
                    <div className="h-8 w-8 sm:h-12 sm:w-12 bg-emerald-500/20 border-2 border-emerald-400 rounded-full flex items-center justify-center shadow-lg animate-pulse flex-shrink-0">
                      <CheckCircle className="h-5 w-5 sm:h-7 sm:w-7 text-emerald-400" />
                    </div>
                  ) : certificationStatus === 'expiring_soon' ? (
                    <div className="h-8 w-8 sm:h-12 sm:w-12 bg-yellow-500/20 border-2 border-yellow-400 rounded-full flex items-center justify-center shadow-lg animate-pulse flex-shrink-0">
                      <AlertCircle className="h-5 w-5 sm:h-7 sm:w-7 text-yellow-400" />
                    </div>
                  ) : certificationStatus === 'expired' ? (
                    <div className="h-8 w-8 sm:h-12 sm:w-12 bg-red-500/20 border-2 border-red-400 rounded-full flex items-center justify-center shadow-lg animate-pulse flex-shrink-0">
                      <XCircle className="h-5 w-5 sm:h-7 sm:w-7 text-red-400" />
                    </div>
                  ) : (
                    <div className="h-8 w-8 sm:h-12 sm:w-12 bg-yellow-500/20 border-2 border-yellow-400 rounded-full flex items-center justify-center shadow-lg animate-pulse flex-shrink-0">
                      <AlertCircle className="h-5 w-5 sm:h-7 sm:w-7 text-yellow-400" />
                    </div>
                  )}
                </div>

                <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                  {certificationStatus === 'valid' && (
                    <div className="bg-emerald-500/20 border border-emerald-400/30 rounded-lg p-3 sm:p-4">
                      <p className="text-white text-sm sm:text-base font-medium mb-1">
                        ✓ Certificación Vigente
                      </p>
                      <p className="text-white/80 text-xs sm:text-sm">
                        Tienes certificados AOC/CEO validados
                      </p>
                    </div>
                  )}

                  {certificationStatus === 'not_validated' && (
                    <p className="text-white/80 text-sm sm:text-base leading-relaxed">
                      Pendiente de validación de certificaciones AOC/CEO
                    </p>
                  )}
                </div>

                <Button
                  size="lg"
                  onClick={() => navigate('/company/certificates')}
                  className={`w-full border-0 hover:scale-105 transition-all duration-300 rounded-xl sm:rounded-2xl text-sm sm:text-base shadow-xl hover:shadow-2xl h-12 sm:h-14 ${certificationStatus === 'valid' ? 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white' :
                    certificationStatus === 'expiring_soon' || certificationStatus === 'expired' ? 'bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white' :
                      'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white'
                    }`}
                >
                  {certificationStatus === 'not_validated' ? 'Subir Certificados AOC/CEO' :
                    certificationStatus === 'expired' ? 'Renovar Certificación' :
                      'Ver Certificados'}
                </Button>
              </CardContent>
            </div>
          </Card>

          {/* Membership Status */}
          <Card className="group bg-white/10 backdrop-blur-xl border-2 border-[#00b3f3]/30 shadow-2xl rounded-2xl sm:rounded-3xl overflow-hidden hover:border-[#00b3f3]/60 transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,179,243,0.3)]">
            <div className="bg-gradient-to-br from-purple-500/20 via-transparent to-pink-500/10 p-1">
              <CardContent className="p-4 sm:p-8 bg-[#083b4e]/60 backdrop-blur-sm rounded-2xl sm:rounded-3xl">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <div className="flex items-center gap-2 sm:gap-4">
                    <div className="h-10 w-10 sm:h-14 sm:w-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <CreditCard className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
                    </div>
                    <span className="text-white text-sm sm:text-xl">Membresía</span>
                  </div>
                  {isSubscriptionValid ? (
                    <div className="h-8 w-16 sm:h-12 sm:w-20 bg-emerald-500/20 border-2 border-emerald-400 rounded-full flex items-center justify-center shadow-lg animate-pulse flex-shrink-0">
                      <span className="text-xs sm:text-sm font-semibold text-emerald-400">Activa</span>
                    </div>
                  ) : (
                    <div className="h-8 w-20 sm:h-12 sm:w-24 bg-yellow-500/20 border-2 border-yellow-400 rounded-full flex items-center justify-center shadow-lg flex-shrink-0">
                      <span className="text-xs sm:text-sm font-semibold text-yellow-400">Inactiva</span>
                    </div>
                  )}
                </div>
                <p className="text-white/80 mb-4 sm:mb-6 text-sm sm:text-base leading-relaxed">
                  {isSubscriptionValid
                    ? `${subscription.plan_name === 'empresa' ? 'Plan Empresa' : subscription.plan_name === 'profesional' ? 'Plan Profesional' : subscription.plan_name || 'Plan'}${subscription.renewal_date ? ` - ${subscription.status === 'active' ? 'Renovación el' : 'Vence el'} ${new Date(subscription.renewal_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}` : ''}`
                    : 'No tienes una suscripción activa'}
                </p>
                <Button
                  size="lg"
                  onClick={() => navigate('/company/membership')}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white border-0 hover:scale-105 transition-all duration-300 rounded-xl sm:rounded-2xl text-sm sm:text-base shadow-xl hover:shadow-2xl h-12 sm:h-14"
                >
                  Gestionar Membresía
                </Button>
              </CardContent>
            </div>
          </Card>

          {/* Support Section */}
          <Card className="group bg-white/10 backdrop-blur-xl border-2 border-[#00b3f3]/30 shadow-2xl rounded-2xl sm:rounded-3xl overflow-hidden hover:border-[#00b3f3]/60 transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,179,243,0.3)] animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <div className="bg-gradient-to-br from-[#00b3f3]/20 via-transparent to-slate-500/10 p-1">
              <CardContent className="p-4 sm:p-8 bg-[#083b4e]/60 backdrop-blur-sm rounded-2xl sm:rounded-3xl">
                <div className="flex items-center gap-2 sm:gap-4 mb-4 sm:mb-6">
                  <div className="h-10 w-10 sm:h-14 sm:w-14 bg-gradient-to-br from-slate-500 to-gray-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <HelpCircle className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
                  </div>
                  <span className="text-white text-sm sm:text-xl">Soporte</span>
                </div>
                <p className="text-white/80 mb-4 sm:mb-6 text-sm sm:text-base leading-relaxed">
                  ¿Necesitas ayuda? Nuestro equipo está aquí para asistirte.
                </p>
                <div className="space-y-3 sm:space-y-4">
                  <Button
                    size="lg"
                    className="w-full justify-start bg-white/5 backdrop-blur-xl border-2 border-[#00b3f3]/30 hover:bg-[#00b3f3] hover:border-[#00b3f3] text-white hover:scale-105 transition-all duration-300 rounded-xl sm:rounded-2xl text-sm sm:text-base shadow-xl hover:shadow-2xl h-12 sm:h-14"
                    onClick={() => window.open('mailto:soporte@pilotodedrones.cl')}
                  >
                    <Mail className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3" />
                    Enviar Email
                  </Button>
                  <Button
                    size="lg"
                    className="w-full justify-start bg-white/5 backdrop-blur-xl border-2 border-emerald-500/30 hover:bg-emerald-500 hover:border-emerald-500 text-white hover:scale-105 transition-all duration-300 rounded-xl sm:rounded-2xl text-sm sm:text-base shadow-xl hover:shadow-2xl h-12 sm:h-14"
                    onClick={() => window.open('https://wa.me/56912345678')}
                  >
                    <Phone className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3" />
                    Soporte WhatsApp
                  </Button>
                </div>
              </CardContent>
            </div>
          </Card>
        </div>

        {/* Gestión de Pilotos */}
        {companyData?.id && (
          <div className="animate-fade-in" style={{ animationDelay: '0.5s' }}>
            <CompanyPilotManagement companyId={companyData.id} />
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyDashboard;

