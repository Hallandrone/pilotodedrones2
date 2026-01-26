import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getUserRole, isPilot } from "@/lib/auth-utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DEFAULT_AVATAR_URL } from "@/hooks/useDefaultAvatar";
import Logo from "@/components/ui/logo";
import WeatherCard from "@/components/weather/WeatherCard";
import {
  Cloud,
  Plane,
  MapPin,
  Clock,
  FileText,
  Settings,
  LogOut,
  CheckCircle,
  AlertCircle,
  XCircle,
  Upload,
  Download,
  Phone,
  Mail,
  Calendar,
  Star,
  Shield,
  CreditCard,
  HelpCircle,
  MessageCircle,
  ArrowRight,
  Lock,
  Award,
  Hash,
  QrCode as QrCodeIcon,
  MonitorPlay
} from "lucide-react";
import type { User } from '@supabase/supabase-js';
import {
  getCertificationStatus,
  getDaysUntilExpiration,
  formatExpirationDate,
  type CertificationStatus
} from "@/utils/certificationHelpers";
import { PDFDownloadLink } from '@react-pdf/renderer';
import QRCode from 'qrcode';
import DiplomaPDF from '@/components/DiplomaPDF';
import { useSubscriptionPlan } from "@/hooks/useSubscriptionPlan";

interface PilotData {
  id: string;
  user_id: string;
  phone: string | null;
  certifications: string[] | null;
  certification_status: boolean | null;
  certification_validated_at?: string | null;
  certification_expires_at?: string | null;
  certification_academy?: string | null;
  status: string | null;
  created_at: string | null;
  updated_at?: string | null;
  profiles: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
  pilot_services: Array<{
    id: string;
    service_type: string;
    description: string | null;
    price_per_hour: number | null;
    is_published: boolean | null;
  }>;
}

interface FlightHours {
  total_hours: number;
  this_month: number;
  last_flight: string | null;
}

interface Contact {
  id: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  message: string | null;
  contacted_at: string | null;
  status: string | null;
}

interface Diploma {
  id: string;
  student_name: string;
  course_date: string;
  course_hours: string;
  course_title: string;
  instructor_name: string;
  city: string;
  certificate_number: string;
  token: string;
  qrCodeDataUrl?: string; // Para generar el PDF
}

const PilotDashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [pilotData, setPilotData] = useState<PilotData | null>(null);
  const [flightHours, setFlightHours] = useState<FlightHours>({
    total_hours: 0,
    this_month: 0,
    last_flight: null
  });
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [diplomas, setDiplomas] = useState<Diploma[]>([]);
  const { plan, loading: planLoading } = useSubscriptionPlan();
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkUserAuth();
  }, []);

  const checkUserAuth = async () => {
    try {
      // Dar un pequeño momento para que la sesión se sincronice si viene de un redirect o popup
      await new Promise(resolve => setTimeout(resolve, 500));
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        navigate('/auth');
        return;
      }

      setUser(session.user);

      // Check if user is a pilot (with automatic role creation if needed)
      const isUserPilot = await isPilot(session.user.id);

      if (!isUserPilot) {
        toast({
          title: "Acceso denegado",
          description: "Esta área es solo para pilotos",
          variant: "destructive",
        });
        navigate('/auth');
        return;
      }

      await loadPilotData(session.user.id);
    } catch (error) {
      console.error('Error checking auth:', error);
      navigate('/auth');
    } finally {
      setLoading(false);
    }
  };

  const loadPilotData = async (userId: string) => {
    try {
      console.log('Loading pilot data for user:', userId);

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

      // Try to get pilot data, but don't fail if it doesn't exist
      const { data: pilotData, error: pilotError } = await supabase
        .from('pilots')
        .select(`
          *,
          pilot_services (*)
        `)
        .eq('user_id', userId)
        .single();

      if (pilotError && pilotError.code !== 'PGRST116') {
        console.error('Error loading pilot data:', pilotError);
        throw pilotError;
      }

      // If pilot data doesn't exist, create it
      let pilotInfo = pilotData;

      if (!pilotData) {
        console.log('Creating pilot record...');
        const { data: newPilotData, error: createPilotError } = await supabase
          .from('pilots')
          .insert({
            user_id: userId,
            status: 'active',
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (createPilotError) {
          console.error('Error creating pilot record:', createPilotError);
          // Use fallback structure if creation fails
          pilotInfo = {
            id: '',
            user_id: userId,
            phone: null,
            certifications: null,
            certification_status: false,
            certification_academy: null,
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            pilot_services: []
          } as any;
        } else {
          pilotInfo = {
            ...newPilotData,
            pilot_services: []
          };
          console.log('Pilot record created:', pilotInfo);
        }
      }

      // Combine profile and pilot data
      const combinedData = {
        ...pilotInfo,
        profiles: profileData
      };

      console.log('Combined pilot data:', combinedData);
      setPilotData(combinedData);

      // Load flight hours (mock data for now)
      setFlightHours({
        total_hours: 150,
        this_month: 12,
        last_flight: '2024-01-15'
      });

      console.log('Pilot data loaded successfully');

      // Load contacts
      await loadContacts(userId);

      // Load diplomas
      await loadDiplomas(userId);
    } catch (error) {
      console.error('Error loading pilot data:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos del piloto",
        variant: "destructive",
      });

      // Redirect to fix page after showing error
      setTimeout(() => {
        navigate('/pilot-data-fix');
      }, 2000);
    }
  };

  const loadContacts = async (userId: string) => {
    try {
      console.log('Loading contacts for user:', userId);
      const { data, error } = await supabase
        .from('profile_contacts')
        .select('*')
        .eq('profile_id', userId)
        .order('contacted_at', { ascending: false });

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };

  const loadDiplomas = async (userId: string) => {
    try {
      console.log('Loading diplomas for user:', userId);
      const { data, error } = await supabase
        .from('diploma_qr_tokens')
        .select(`
          token,
          diploma_id,
          diplomas (*)
        `)
        .eq('user_id', userId);

      if (error) throw error;

      console.log('📦 Raw diploma tokens data:', data);

      if (data && data.length > 0) {
        // Formatear la data y generar QR para cada diploma
        const formattedDiplomas = await Promise.all(data
          .filter(item => {
            if (!item.diplomas) {
              console.warn('⚠️ Token sin diploma vinculado o RLS bloqueando acceso:', item.token);
              return false;
            }
            return true;
          }) // Solo si hay diploma vinculado
          .map(async (item: any) => {
            const diploma = item.diplomas;
            const qrUrl = `https://www.pilotodedrones.cl/qr/${item.token}`;

            let qrCodeDataUrl = '';
            try {
              qrCodeDataUrl = await QRCode.toDataURL(qrUrl, {
                width: 200,
                margin: 1,
              });
            } catch (err) {
              console.error('Error generating QR for dashboard diploma:', err);
            }

            return {
              ...diploma,
              token: item.token,
              qrCodeDataUrl
            };
          }));

        setDiplomas(formattedDiplomas);
      }
    } catch (error) {
      console.error('Error loading diplomas:', error);
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
      case 'pending':
        return (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 rounded-full border border-yellow-200 shadow-sm">
            <Clock className="h-3 w-3" />
            <span className="text-xs font-semibold">Pendiente</span>
          </div>
        );
      case 'suspended':
        return (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-red-100 to-rose-100 text-red-800 rounded-full border border-red-200 shadow-sm">
            <AlertCircle className="h-3 w-3" />
            <span className="text-xs font-semibold">Suspendido</span>
          </div>
        );
      default:
        return (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 rounded-full border border-gray-200 shadow-sm">
            <span className="text-xs font-semibold">Desconocido</span>
          </div>
        );
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

  return (
    <div className="min-h-screen bg-[#083b4e] relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjAzIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-50"></div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#083b4e] via-[#083b4e] to-[#0a4a61] pointer-events-none"></div>

      {/* Header */}
      <div className="bg-white/95 backdrop-blur-xl border-b border-gray-200 shadow-sm sticky top-0 z-50 relative animate-fade-in">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <Logo
              size="lg"
              className="hover:scale-105 transition-all duration-300"
              showText={false}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-xl px-4 py-2.5 transition-all duration-300 hover:scale-105 border border-transparent hover:border-red-200 font-semibold"
            >
              <LogOut className="h-5 w-5 sm:mr-2" />
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
                    <AvatarImage src={pilotData?.profiles.avatar_url || DEFAULT_AVATAR_URL} />
                    <AvatarFallback className="bg-gradient-to-br from-[#00b3f3] to-[#0099cc] text-white text-2xl sm:text-3xl">
                      <img src={DEFAULT_AVATAR_URL} alt="Default Avatar" className="h-full w-full object-cover" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 h-6 w-6 sm:h-8 sm:w-8 bg-green-500 rounded-full border-4 border-[#083b4e] flex items-center justify-center shadow-lg">
                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h2 className="text-xl sm:text-3xl font-semibold text-white mb-2 tracking-tight">
                    {pilotData?.profiles.full_name || 'Piloto'}
                  </h2>
                  <p className="text-white/80 flex items-center justify-center sm:justify-start gap-2 mb-3 sm:mb-4 text-sm sm:text-base break-all">
                    <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-[#00b3f3] flex-shrink-0" />
                    <span className="truncate">{pilotData?.profiles.email}</span>
                  </p>
                  <div className="flex justify-center sm:justify-start">
                    {getStatusBadge(pilotData?.status || 'pending')}
                  </div>
                </div>
              </div>

              <div className={`grid grid-cols-2 ${!plan?.isPaid ? 'lg:grid-cols-3' : ''} gap-3 sm:gap-6`}>
                <div className="relative group overflow-hidden bg-gradient-to-br from-[#00b3f3]/20 to-transparent rounded-xl sm:rounded-2xl p-3 sm:p-6 border-2 border-[#00b3f3]/30 hover:border-[#00b3f3]/60 transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,179,243,0.3)] hover:scale-105">
                  <div className="absolute inset-0 bg-[#00b3f3]/5 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                  <div className="relative">
                    <div className="text-3xl sm:text-5xl font-semibold text-[#00b3f3] mb-1 sm:mb-3 flex items-baseline gap-1 sm:gap-2">
                      {flightHours.total_hours}
                      <span className="text-sm sm:text-lg text-[#00b3f3]/60">hrs</span>
                    </div>
                    <div className="text-xs sm:text-base text-white/90">Horas Totales</div>
                  </div>
                </div>
                <div className="relative group overflow-hidden bg-gradient-to-br from-[#00b3f3]/20 to-transparent rounded-xl sm:rounded-2xl p-3 sm:p-6 border-2 border-[#00b3f3]/30 hover:border-[#00b3f3]/60 transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,179,243,0.3)] hover:scale-105">
                  <div className="absolute inset-0 bg-[#00b3f3]/5 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                  <div className="relative">
                    <div className="text-3xl sm:text-5xl font-semibold text-[#00b3f3] mb-1 sm:mb-3 flex items-baseline gap-1 sm:gap-2">
                      {flightHours.this_month}
                      <span className="text-sm sm:text-lg text-[#00b3f3]/60">hrs</span>
                    </div>
                    <div className="text-xs sm:text-base text-white/90">Último Mes</div>
                  </div>
                </div>
                {/* Weather Card integrated into grid when locked or as 3rd item */}
                {!plan?.isPaid && (
                  <div
                    className="relative group overflow-hidden bg-gradient-to-br from-[#FF69B4]/10 to-transparent rounded-xl sm:rounded-2xl p-3 sm:p-6 border-2 border-[#FF69B4]/20 hover:border-[#FF69B4]/40 transition-all duration-300 hover:scale-105 cursor-pointer col-span-2 lg:col-span-1"
                    onClick={() => navigate('/pilot/membership')}
                  >
                    <div className="absolute inset-0 bg-[#FF69B4]/5 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                    <div className="relative flex flex-col h-full justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-[#FF69B4] mb-1 sm:mb-2">
                          <Cloud className="h-4 w-4 sm:h-5 sm:w-5" />
                          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Clima Pro</span>
                        </div>
                        <div className="text-white font-bold text-sm sm:text-base leading-tight">
                          Activa ráfagas y visibilidad
                        </div>
                      </div>
                      <div className="mt-2 text-[#FF69B4] text-[10px] sm:text-xs font-semibold flex items-center gap-1">
                        Mejorar ahora <ArrowRight className="h-3 w-3" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Weather Card showing full content if Pro */}
              {plan?.isPaid && <WeatherCard hasActiveSubscription={true} />}
            </CardContent>
          </div>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <Button
            variant="outline"
            size="lg"
            className="group relative h-24 sm:h-32 flex-col gap-2 sm:gap-4 bg-white/10 backdrop-blur-xl border-2 border-[#00b3f3]/30 hover:bg-[#00b3f3] hover:text-white hover:border-[#00b3f3] hover:scale-105 sm:hover:scale-110 transition-all duration-300 rounded-xl sm:rounded-2xl shadow-xl hover:shadow-[0_0_30px_rgba(0,179,243,0.5)] overflow-hidden"
            onClick={() => navigate('/pilot/profile')}
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
            className={`group relative h-24 sm:h-32 flex-col gap-2 sm:gap-4 bg-white/10 backdrop-blur-xl border-2 border-[#00b3f3]/30 hover:bg-[#00b3f3] hover:text-white hover:border-[#00b3f3] hover:scale-105 sm:hover:scale-110 transition-all duration-300 rounded-xl sm:rounded-2xl shadow-xl hover:shadow-[0_0_30px_rgba(0,179,243,0.5)] overflow-hidden ${!plan?.isPaid ? 'grayscale-[0.5] opacity-90' : ''}`}
            onClick={() => plan?.isPaid ? navigate('/pilot/certificates') : navigate('/pilot/membership')}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#00b3f3]/0 to-[#00b3f3]/0 group-hover:from-[#00b3f3]/20 group-hover:to-transparent transition-all duration-300"></div>
            <div className="relative h-10 w-10 sm:h-14 sm:w-14 bg-gradient-to-br from-[#00b3f3] to-[#0099cc] rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
              <FileText className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
              {!plan?.isPaid && (
                <div className="absolute -top-1 -right-1 bg-[#FF69B4] rounded-full p-1 border-2 border-[#083b4e] shadow-lg">
                  <Lock className="h-2 w-2 sm:h-3 sm:w-3 text-white" />
                </div>
              )}
            </div>
            <span className="relative text-xs sm:text-base text-white px-1">Certificados</span>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className={`group relative h-24 sm:h-32 flex-col gap-2 sm:gap-4 bg-white/10 backdrop-blur-xl border-2 border-[#00b3f3]/30 hover:bg-[#00b3f3] hover:text-white hover:border-[#00b3f3] hover:scale-105 sm:hover:scale-110 transition-all duration-300 rounded-xl sm:rounded-2xl shadow-xl hover:shadow-[0_0_30px_rgba(0,179,243,0.5)] overflow-hidden ${!plan?.isPaid ? 'grayscale-[0.5] opacity-90' : ''}`}
            onClick={() => plan?.isPaid ? navigate('/pilot/flight-hours') : navigate('/pilot/membership')}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#00b3f3]/0 to-[#00b3f3]/0 group-hover:from-[#00b3f3]/20 group-hover:to-transparent transition-all duration-300"></div>
            <div className="relative h-10 w-10 sm:h-14 sm:w-14 bg-gradient-to-br from-[#00b3f3] to-[#0099cc] rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
              <Clock className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
              {!plan?.isPaid && (
                <div className="absolute -top-1 -right-1 bg-[#FF69B4] rounded-full p-1 border-2 border-[#083b4e] shadow-lg">
                  <Lock className="h-2 w-2 sm:h-3 sm:w-3 text-white" />
                </div>
              )}
            </div>
            <span className="relative text-xs sm:text-base text-white px-1">Horas de Vuelo</span>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="group relative h-24 sm:h-32 flex-col gap-2 sm:gap-4 bg-white/10 backdrop-blur-xl border-2 border-[#00b3f3]/30 hover:bg-[#00b3f3] hover:text-white hover:border-[#00b3f3] hover:scale-105 sm:hover:scale-110 transition-all duration-300 rounded-xl sm:rounded-2xl shadow-xl hover:shadow-[0_0_30px_rgba(0,179,243,0.5)] overflow-hidden"
            onClick={() => navigate('/pilot/qr')}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#00b3f3]/0 to-[#00b3f3]/0 group-hover:from-[#00b3f3]/20 group-hover:to-transparent transition-all duration-300"></div>
            <div className="relative h-10 w-10 sm:h-14 sm:w-14 bg-gradient-to-br from-[#00b3f3] to-[#0099cc] rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
              <QrCodeIcon className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
            </div>
            <span className="relative text-xs sm:text-base text-white px-1">Mi QR</span>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className={`group relative h-24 sm:h-32 flex-col gap-2 sm:gap-4 bg-white/10 backdrop-blur-xl border-2 border-[#00b3f3]/30 hover:bg-[#00b3f3] hover:text-white hover:border-[#00b3f3] hover:scale-105 sm:hover:scale-110 transition-all duration-300 rounded-xl sm:rounded-2xl shadow-xl hover:shadow-[0_0_30px_rgba(0,179,243,0.5)] overflow-hidden ${!plan?.isPaid ? 'grayscale-[0.5] opacity-90' : ''}`}
            onClick={() => plan?.isPaid ? navigate('/pilot/portfolio') : navigate('/pilot/membership')}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#00b3f3]/0 to-[#00b3f3]/0 group-hover:from-[#00b3f3]/20 group-hover:to-transparent transition-all duration-300"></div>
            <div className="relative h-10 w-10 sm:h-14 sm:w-14 bg-gradient-to-br from-[#00b3f3] to-[#0099cc] rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
              <MonitorPlay className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
              {!plan?.isPaid && (
                <div className="absolute -top-1 -right-1 bg-[#FF69B4] rounded-full p-1 border-2 border-[#083b4e] shadow-lg">
                  <Lock className="h-2 w-2 sm:h-3 sm:w-3 text-white" />
                </div>
              )}
            </div>
            <span className="relative text-xs sm:text-base text-white px-1">Portafolio</span>
          </Button>
        </div>

        {/* Contactos Recibidos - Botón con notificación de no leídos */}
        {(() => {
          const unreadContacts = contacts.filter(c => c.status !== 'read').length;
          return (
            <Card
              className={`bg-white/10 backdrop-blur-xl border-2 shadow-xl rounded-xl sm:rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer group animate-fade-in ${unreadContacts > 0 ? 'border-[#FF69B4]/50 hover:border-[#FF69B4] shadow-[0_0_20px_rgba(255,105,180,0.2)]' : 'border-[#00b3f3]/30 hover:border-[#00b3f3]/50'}`}
              style={{ animationDelay: '0.25s' }}
              onClick={() => navigate('/pilot/contacts')}
            >
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative h-10 w-10 sm:h-12 sm:w-12 bg-gradient-to-br from-[#00b3f3] to-[#0099cc] rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                      {unreadContacts > 0 && (
                        <span className="absolute -top-2 -right-2 h-5 w-5 sm:h-6 sm:w-6 bg-[#FF69B4] rounded-full flex items-center justify-center text-white text-[10px] sm:text-xs font-bold border-2 border-[#083b4e] animate-pulse shadow-lg">
                          {unreadContacts > 9 ? '9+' : unreadContacts}
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-base sm:text-lg flex items-center gap-2">
                        Contactos Recibidos
                        {unreadContacts > 0 && (
                          <Badge className="bg-[#FF69B4] text-white text-[10px] animate-pulse">
                            {unreadContacts} nuevo{unreadContacts !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </h3>
                      <p className="text-white/60 text-xs sm:text-sm">
                        {contacts.length === 0
                          ? 'Aún no has recibido contactos'
                          : unreadContacts > 0
                            ? `${unreadContacts} sin leer de ${contacts.length} total`
                            : `${contacts.length} contacto${contacts.length !== 1 ? 's' : ''} reciente${contacts.length !== 1 ? 's' : ''}`
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {unreadContacts > 0 ? (
                      <div className="h-3 w-3 bg-[#FF69B4] rounded-full animate-pulse shadow-lg shadow-[#FF69B4]/50" />
                    ) : contacts.length > 0 ? (
                      <Badge className="bg-[#00b3f3] text-white">{contacts.length}</Badge>
                    ) : null}
                    <ArrowRight className="h-5 w-5 text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all duration-300" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* Mis Diplomas */}
        <div className="space-y-4 sm:space-y-6 animate-fade-in" style={{ animationDelay: '0.27s' }}>
          <Card className={`bg-white/10 backdrop-blur-xl border-2 border-[#00b3f3]/30 shadow-2xl rounded-2xl sm:rounded-3xl overflow-hidden transition-all duration-300 ${plan?.isPaid ? 'hover:border-[#00b3f3]/50' : 'opacity-80'}`}>
            <CardHeader className="p-6 border-b border-[#00b3f3]/20">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-xl sm:text-2xl font-bold flex items-center gap-3">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 bg-gradient-to-br from-[#00b3f3] to-[#0099cc] rounded-xl flex items-center justify-center">
                    <Award className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  Mis Diplomas Asociados
                </CardTitle>
                {plan?.isPaid ? (
                  <Badge className="bg-[#00b3f3] text-white font-bold">{diplomas.length}</Badge>
                ) : (
                  <Badge variant="outline" className="border-[#00b3f3] text-[#00b3f3] font-bold">Plan Pro</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 relative">
              {!plan?.isPaid ? (
                /* Bloqueo para usuarios Free - Versión Compacta */
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 sm:p-6 bg-gradient-to-br from-[#00b3f3]/10 to-transparent rounded-2xl border border-[#00b3f3]/30">
                  <div className="flex items-center gap-4 text-center sm:text-left">
                    <div className="h-12 w-12 sm:h-16 sm:w-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 shrink-0">
                      <Lock className="h-6 w-6 sm:h-8 sm:w-8 text-[#00b3f3]" />
                    </div>
                    <div>
                      <h3 className="text-white text-base sm:text-lg font-bold">Diplomas Digitales</h3>
                      <p className="text-white/60 text-xs sm:text-sm">Asocia y descarga tus diplomas oficiales.</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => navigate('/pilot/membership')}
                    className="w-full sm:w-auto bg-[#00b3f3] hover:bg-[#0099cc] text-white font-bold h-10 px-6 rounded-xl shadow-lg transition-all hover:scale-105 shrink-0"
                  >
                    Activar con Pro
                  </Button>
                </div>
              ) : diplomas.length === 0 ? (
                <div className="text-center py-10">
                  <div className="h-16 w-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                    <Award className="h-8 w-8 text-white/20" />
                  </div>
                  <p className="text-white/60 mb-2">No tienes diplomas asociados aún.</p>
                  <p className="text-[#00b3f3] text-sm font-medium">Escanea el QR de tu diploma de Academia de Drones de Chile para que aparezca aquí.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {diplomas.map((diploma) => (
                    <div key={diploma.id} className="group relative bg-[#020617]/40 border-2 border-white/10 rounded-2xl p-4 sm:p-6 transition-all duration-300 hover:border-[#00b3f3]/50 hover:bg-[#020617]/60">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 sm:h-16 sm:w-16 bg-[#00b3f3]/20 border border-[#00b3f3]/40 rounded-xl flex items-center justify-center text-[#00b3f3]">
                            <FileText className="h-6 w-6 sm:h-8 sm:w-8" />
                          </div>
                          <div>
                            <h4 className="text-white font-bold text-lg sm:text-xl leading-tight mb-1">{diploma.course_title}</h4>
                            <div className="flex flex-wrap gap-y-1 gap-x-4">
                              <p className="text-white/60 text-xs sm:text-sm flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5" />
                                {new Date(diploma.course_date).toLocaleDateString('es-CL')}
                              </p>
                              <p className="text-[#00b3f3]/80 text-xs sm:text-sm font-semibold flex items-center gap-1.5">
                                <Hash className="h-3.5 w-3.5" />
                                N° {diploma.certificate_number}
                              </p>
                            </div>
                          </div>
                        </div>

                        <PDFDownloadLink
                          document={
                            <DiplomaPDF
                              data={{
                                studentName: diploma.student_name,
                                courseDate: diploma.course_date,
                                instructorName: diploma.instructor_name,
                                certificateNumber: diploma.certificate_number,
                                courseHours: diploma.course_hours,
                                city: diploma.city,
                                courseTitle: diploma.course_title,
                                qrCodeDataUrl: diploma.qrCodeDataUrl
                              }}
                            />
                          }
                          fileName={`Diploma_${diploma.course_title}_${diploma.student_name}.pdf`}
                          className="w-full sm:w-auto"
                        >
                          {({ loading }) => (
                            <Button
                              variant="outline"
                              disabled={loading}
                              className="w-full sm:w-auto border-[#00b3f3] text-[#00b3f3] hover:bg-[#00b3f3] hover:text-white rounded-xl h-11 px-6 font-bold shadow-lg shadow-[#00b3f3]/10 transition-all duration-300 hover:scale-105"
                            >
                              {loading ? (
                                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                              ) : (
                                <Download className="h-4 w-4 mr-2" />
                              )}
                              Descargar PDF
                            </Button>
                          )}
                        </PDFDownloadLink>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Status Cards */}
        <div className="space-y-4 sm:space-y-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          {/* Certification Status */}
          <Card className="group bg-white/10 backdrop-blur-xl border-2 border-[#00b3f3]/30 shadow-2xl rounded-2xl sm:rounded-3xl overflow-hidden hover:border-[#00b3f3]/60 transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,179,243,0.3)]">
            <div className="bg-gradient-to-br from-[#00b3f3]/20 via-transparent to-emerald-500/10 p-1">
              <CardContent className="p-4 sm:p-8 bg-[#083b4e]/60 backdrop-blur-sm rounded-2xl sm:rounded-3xl">
                {(() => {
                  const certStatus = getCertificationStatus(
                    pilotData?.certification_status || false,
                    pilotData?.certification_expires_at || null
                  );
                  const daysUntilExpiration = getDaysUntilExpiration(pilotData?.certification_expires_at || null);

                  return (
                    <>
                      <div className="flex items-center justify-between mb-4 sm:mb-6">
                        <div className="flex items-center gap-2 sm:gap-4">
                          <div className={`h-10 w-10 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 ${certStatus === 'valid' ? 'bg-gradient-to-br from-emerald-500 to-green-600' :
                            certStatus === 'expiring_soon' ? 'bg-gradient-to-br from-yellow-500 to-orange-600' :
                              certStatus === 'expired' ? 'bg-gradient-to-br from-red-500 to-red-600' :
                                'bg-gradient-to-br from-gray-500 to-gray-600'
                            }`}>
                            <Shield className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
                          </div>
                          <span className="text-white text-sm sm:text-xl">Estado de Certificación</span>
                        </div>
                        {certStatus === 'valid' ? (
                          <div className="h-8 w-8 sm:h-12 sm:w-12 bg-emerald-500/20 border-2 border-emerald-400 rounded-full flex items-center justify-center shadow-lg animate-pulse flex-shrink-0">
                            <CheckCircle className="h-5 w-5 sm:h-7 sm:w-7 text-emerald-400" />
                          </div>
                        ) : certStatus === 'expiring_soon' ? (
                          <div className="h-8 w-8 sm:h-12 sm:w-12 bg-yellow-500/20 border-2 border-yellow-400 rounded-full flex items-center justify-center shadow-lg animate-pulse flex-shrink-0">
                            <AlertCircle className="h-5 w-5 sm:h-7 sm:w-7 text-yellow-400" />
                          </div>
                        ) : certStatus === 'expired' ? (
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
                        {certStatus === 'valid' && (
                          <div className="bg-emerald-500/20 border border-emerald-400/30 rounded-lg p-3 sm:p-4">
                            <p className="text-white text-sm sm:text-base font-medium mb-1">
                              ✓ Certificación Vigente
                            </p>
                            <p className="text-white/80 text-xs sm:text-sm">
                              Válida hasta: {formatExpirationDate(pilotData?.certification_expires_at || null)}
                            </p>
                            {daysUntilExpiration !== null && (
                              <p className="text-white/70 text-xs mt-1">
                                {daysUntilExpiration} días restantes
                              </p>
                            )}
                          </div>
                        )}

                        {certStatus === 'expiring_soon' && (
                          <div className="bg-yellow-500/20 border border-yellow-400/30 rounded-lg p-3 sm:p-4">
                            <p className="text-white text-sm sm:text-base font-medium mb-1 flex items-center gap-2">
                              <AlertCircle className="h-4 w-4" />
                              Certificación por Vencer
                            </p>
                            <p className="text-white/80 text-xs sm:text-sm">
                              Vence el: {formatExpirationDate(pilotData?.certification_expires_at || null)}
                            </p>
                            {daysUntilExpiration !== null && (
                              <p className="text-yellow-300 text-xs sm:text-sm font-semibold mt-1">
                                ⚠️ Quedan {daysUntilExpiration} días. Debes renovar tu validación.
                              </p>
                            )}
                          </div>
                        )}

                        {certStatus === 'expired' && (
                          <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-3 sm:p-4">
                            <p className="text-white text-sm sm:text-base font-medium mb-1 flex items-center gap-2">
                              <XCircle className="h-4 w-4" />
                              Certificación Vencida
                            </p>
                            <p className="text-white/80 text-xs sm:text-sm">
                              Venció el: {formatExpirationDate(pilotData?.certification_expires_at || null)}
                            </p>
                            <p className="text-red-300 text-xs sm:text-sm font-semibold mt-1">
                              ⚠️ Debes renovar tu validación para continuar operando.
                            </p>
                          </div>
                        )}

                        {certStatus === 'not_validated' && (
                          <p className="text-white/80 text-sm sm:text-base leading-relaxed">
                            Pendiente de validación de certificaciones
                          </p>
                        )}
                      </div>

                      <Button
                        size="lg"
                        onClick={() => plan?.isPaid ? navigate('/pilot/certificates') : navigate('/pilot/membership')}
                        className={`w-full border-0 hover:scale-105 transition-all duration-300 rounded-xl sm:rounded-2xl text-sm sm:text-base shadow-xl hover:shadow-2xl h-12 sm:h-14 ${certStatus === 'valid' ? 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white' :
                          certStatus === 'expiring_soon' || certStatus === 'expired' ? 'bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white' :
                            'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white'
                          } ${!plan?.isPaid ? 'opacity-90' : ''}`}
                      >
                        {certStatus === 'not_validated' ? (plan?.isPaid ? 'Subir Certificados' : 'Activar Pro para Validar') :
                          certStatus === 'expired' ? 'Renovar Certificación' :
                            'Ver Certificados'}
                      </Button>
                    </>
                  );
                })()}
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
                  <div className={`h-8 px-3 sm:h-12 sm:px-6 border-2 rounded-full flex items-center justify-center shadow-lg flex-shrink-0 ${plan?.isPaid ? 'bg-emerald-500/20 border-emerald-400' : 'bg-gray-500/20 border-gray-400'}`}>
                    <span className={`text-xs sm:text-sm font-bold ${plan?.isPaid ? 'text-emerald-400' : 'text-gray-400'}`}>
                      {plan?.isPaid ? 'Pro' : 'Gratis'}
                    </span>
                  </div>
                </div>
                <p className="text-white/80 mb-4 sm:mb-6 text-sm sm:text-base leading-relaxed">
                  {plan?.isPaid
                    ? `Plan ${plan.displayName} - ${plan.status === 'active' ? 'Suscripción Activa' : 'Finaliza pronto'}`
                    : 'Plan Gratis - Acceso Limitado'}
                </p>
                <Button
                  size="lg"
                  onClick={() => navigate('/pilot/membership')}
                  className={`w-full hover:scale-105 transition-all duration-300 rounded-xl sm:rounded-2xl text-sm sm:text-base shadow-xl hover:shadow-2xl h-12 sm:h-14 border-0 ${plan?.isPaid
                    ? 'bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white'
                    : 'bg-gradient-to-r from-[#00b3f3] to-[#0099cc] hover:from-[#0099cc] hover:to-[#00b3f3] text-white'
                    }`}
                >
                  {plan?.isPaid ? 'Gestionar Membresía' : 'Mejorar a Plan Pro'}
                </Button>
              </CardContent>
            </div>
          </Card>
        </div>

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
    </div>
  );
};

export default PilotDashboard;
