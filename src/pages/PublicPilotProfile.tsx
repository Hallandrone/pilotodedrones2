import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Shield,
  MapPin,
  Mail,
  Phone,
  Clock,
  CheckCircle,
  Star,
  Briefcase,
  Award,
  ArrowLeft,
  MessageCircle,
  Share2,
  Copy
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Logo from "@/components/ui/logo";
import { LogOut } from "lucide-react";

interface PilotProfile {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  bio: string | null;
  specialties: string[] | null;
  experience_years: number | null;
  avatar_url: string | null;
  drone_types: string[] | null;
  instagram_username?: string | null;
  linkedin_username?: string | null;
  instagram_url?: string | null;
  linkedin_url?: string | null;
  // Company-specific fields
  company_name?: string | null;
  description?: string | null;
  website?: string | null;
  region?: string | null;
  services?: string[] | null;
}

interface PilotData {
  certification_status: boolean;
  certification_academy: string | null;
  status: string;
}

interface PilotService {
  service_type: string;
  description: string;
  price_per_hour: number;
  is_published: boolean;
}

const PublicPilotProfile = () => {
  const params = useParams();
  // Obtener el parámetro de cualquiera de las dos rutas: /pilot/:pilotId o /:slug
  const pilotId = params.pilotId || params.slug;
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<PilotProfile | null>(null);
  const [services, setServices] = useState<PilotService[]>([]);
  const [pilotData, setPilotData] = useState<PilotData | null>(null);
  const [flightHours, setFlightHours] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [isCompany, setIsCompany] = useState(false);
  const [companyData, setCompanyData] = useState<{ certification_status: boolean; company_name: string | null } | null>(null);
  const { toast } = useToast();

  const searchState = location.state as any;
  const [actualUserId, setActualUserId] = useState<string | null>(null);
  const [profileSlug, setProfileSlug] = useState<string | null>(null);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [submittingContact, setSubmittingContact] = useState(false);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [currentUserType, setCurrentUserType] = useState<string | null>(null);

  // Generate profile URL - use slug if available, otherwise use ID
  const profileUrl = profileSlug
    ? `${window.location.origin}/${profileSlug}`
    : actualUserId
      ? `${window.location.origin}/pilot/${actualUserId}`
      : `${window.location.origin}/pilot/${pilotId}`;

  const handleBack = () => {
    // Si el usuario está viendo su propio perfil, regresar al dashboard correspondiente
    if (isOwnProfile) {
      if (currentUserType === 'company') {
        navigate('/company');
      } else {
        navigate('/pilot');
      }
      return;
    }

    // Si viene de búsqueda, regresar a búsqueda con los parámetros
    if (searchState && !searchState.fromQR) {
      const params = new URLSearchParams();
      if (searchState.searchTerm) params.set("search", searchState.searchTerm);
      if (searchState.selectedRegion && searchState.selectedRegion !== "all") params.set("region", searchState.selectedRegion);
      if (searchState.certifiedOnly) params.set("certified", "true");
      navigate(`/search?${params.toString()}`, {
        state: searchState
      });
    } else {
      navigate("/search");
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: isCompany && companyData?.company_name
        ? `Perfil de ${companyData.company_name}`
        : `Perfil de ${profile?.full_name || 'Piloto'}`,
      text: `Revisa el perfil de ${isCompany && companyData?.company_name ? companyData.company_name : profile?.full_name || 'este piloto'} en Piloto de Drones`,
      url: profileUrl
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        toast({
          title: "¡Perfil compartido!",
          description: "El perfil se compartió exitosamente.",
        });
      } else {
        // Fallback: copiar al portapapeles
        await navigator.clipboard.writeText(profileUrl);
        toast({
          title: "Link copiado",
          description: "El link del perfil se copió al portapapeles.",
        });
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error sharing:', error);
        toast({
          title: "Error",
          description: "No se pudo compartir el perfil.",
          variant: "destructive",
        });
      }
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      toast({
        title: "¡Link copiado!",
        description: "El link del perfil se copió al portapapeles.",
      });
    } catch (error) {
      console.error('Error copying link:', error);
      toast({
        title: "Error",
        description: "No se pudo copiar el link.",
        variant: "destructive",
      });
    }
  };


  useEffect(() => {
    loadPilotProfile();
  }, [pilotId]);

  const loadPilotProfile = async () => {
    try {
      // Validar que tenemos un parámetro válido
      if (!pilotId || pilotId === 'undefined' || pilotId.trim() === '') {
        throw new Error('Parámetro de perfil no válido');
      }

      let profileData = null;
      let userId = null;

      // UUIDs have format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (36 chars with hyphens)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pilotId || '');

      // If it's not a UUID, try to find by slug in history table first
      if (!isUUID) {
        // Check slug history to see if this slug exists (current or old)
        const { data: slugHistory, error: historyError } = await supabase
          .from('profile_slug_history')
          .select('user_id, is_current, slug')
          .eq('slug', pilotId)
          .single();

        if (slugHistory && !historyError) {
          userId = slugHistory.user_id;

          // If this is not the current slug, redirect to current slug
          if (!slugHistory.is_current) {
            const { data: currentSlug } = await supabase
              .from('profile_slug_history')
              .select('slug')
              .eq('user_id', userId)
              .eq('is_current', true)
              .single();

            if (currentSlug) {
              // Redirect to current slug
              navigate(`/${currentSlug.slug}`, { replace: true });
              return;
            }
          }

          // Load profile by user_id
          const { data: profileByUserId } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

          if (profileByUserId) {
            profileData = profileByUserId;
            setProfileSlug(slugHistory.is_current ? pilotId : profileByUserId.public_profile_slug);
          }
        } else {
          // Try direct lookup in profiles table (for backward compatibility)
          const { data: slugData, error: slugError } = await supabase
            .from('profiles')
            .select('*')
            .eq('public_profile_slug', pilotId)
            .single();

          if (slugData && !slugError) {
            profileData = slugData;
            userId = slugData.id;
            setProfileSlug(pilotId);
          }
        }
      }

      // If not found by slug (or if it's a UUID), try by ID
      if (!profileData) {
        const { data: idData, error: idError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', pilotId)
          .single();

        if (idError) {
          // If it was a UUID and not found, throw error
          if (isUUID) throw idError;
          // If it was a slug and not found by ID either, throw error
          throw new Error('Perfil no encontrado');
        }

        profileData = idData;
        userId = idData.id;
        setProfileSlug(idData.public_profile_slug || null);
      }

      if (!profileData || !userId) {
        throw new Error('Perfil no encontrado');
      }

      setActualUserId(userId);

      // Verificar si el usuario autenticado está viendo su propio perfil
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser && currentUser.id === userId) {
        setIsOwnProfile(true);
        // Obtener el tipo de usuario del perfil actual
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('id', currentUser.id)
          .single();
        if (currentProfile) {
          setCurrentUserType(currentProfile.user_type);
        }
      }


      // Verificar si es empresa
      const userType = profileData.user_type;
      setIsCompany(userType === 'company');

      // Load pilot data (status, certification, etc.) - solo si no es empresa
      let pilotInfo = null;
      if (userType !== 'company') {
        const { data: pilotData } = await supabase
          .from('pilots')
          .select('status, certification_status, certification_academy')
          .eq('user_id', userId)
          .maybeSingle();
        pilotInfo = pilotData;
      }

      // Load company data si es empresa
      if (userType === 'company') {
        const { data: companyInfo } = await supabase
          .from('companies')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (companyInfo) {
          setCompanyData({
            certification_status: companyInfo.certification_status,
            company_name: companyInfo.company_name
          });
          // Merge company data into profile for easier access
          setProfile(prev => ({
            ...prev,
            ...profileData,
            company_name: companyInfo.company_name,
            description: companyInfo.description,
            website: companyInfo.website,
            phone: companyInfo.phone || profileData.phone,
            email: companyInfo.email || profileData.email,
            location: companyInfo.location || profileData.location,
            region: companyInfo.region,
            experience_years: companyInfo.experience_years,
            services: companyInfo.services,
            drone_types: companyInfo.drone_types,
            instagram_username: companyInfo.instagram_username || profileData.instagram_username,
            linkedin_username: companyInfo.linkedin_username || profileData.linkedin_username,
            instagram_url: companyInfo.instagram_url || profileData.instagram_url,
            linkedin_url: companyInfo.linkedin_url || profileData.linkedin_url,
          } as PilotProfile));
        }
      }

      // Load published services
      const { data: servicesData } = await supabase
        .from('pilot_services')
        .select('*')
        .eq('pilot_id', userId)
        .eq('is_published', true);

      // TODO: Load flight hours when table is created
      const totalHours = 0;

      setProfile(profileData as unknown as PilotProfile);
      setPilotData(pilotInfo);
      setServices(servicesData || []);
      setFlightHours(totalHours);

      // Verificar si el piloto tiene suscripción activa
      if (userId) {
        const { data: subscription } = await supabase
          .from('user_subscriptions')
          .select('status')
          .eq('user_id', userId)
          .eq('status', 'active')
          .maybeSingle();

        setHasActiveSubscription(!!subscription);
      }

      // Registrar vista del perfil
      if (userId) {
        try {
          await supabase
            .from('profile_views')
            .insert({
              profile_id: userId,
              user_agent: navigator.userAgent
            });
        } catch (viewError) {
          console.error('Error tracking view:', viewError);
          // No mostrar error al usuario, solo log
        }
      }
    } catch (error) {
      console.error('Error loading pilot profile:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar el perfil del piloto",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actualUserId) return;

    setSubmittingContact(true);
    try {
      const { error } = await supabase
        .from('profile_contacts')
        .insert({
          profile_id: actualUserId,
          contact_name: contactForm.name,
          contact_email: contactForm.email,
          contact_phone: contactForm.phone || null,
          message: contactForm.message || null,
          status: 'new'
        });

      if (error) throw error;

      toast({
        title: "¡Gracias por contactarnos!",
        description: "Te contactaremos pronto.",
      });

      setContactForm({ name: '', email: '', phone: '', message: '' });
      setContactDialogOpen(false);
    } catch (error: any) {
      console.error('Error submitting contact:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo enviar tu solicitud. Intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setSubmittingContact(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center font-inter">
        <div className="relative z-10 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-b-[#00b3f3] mb-6"></div>
          <p className="text-[#00b3f3] font-bold text-xl tracking-widest uppercase animate-pulse">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-inter">
        <Card className="max-w-md w-full bg-white border border-gray-200 shadow-lg rounded-2xl">
          <CardHeader>
            <CardTitle className="text-center text-gray-900 text-3xl font-bold tracking-tight">Perfil no encontrado</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-gray-600 space-y-6">
            <p className="text-lg">No se encontró el perfil profesional que buscas.</p>
            <Button
              onClick={() => navigate('/')}
              className="w-full bg-[#00b3f3] hover:bg-[#0099cc] text-gray-900 font-bold h-12 rounded-xl shadow-lg hover:shadow-[#00b3f3]/20 transition-all"
            >
              Volver al Inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-inter">

      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="px-4 py-4 sm:py-6">
          <div className="flex items-center gap-4 max-w-7xl mx-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="h-12 w-12 rounded-full hover:bg-gray-100 hover:scale-110 transition-all duration-300 text-gray-700"
            >
              <ArrowLeft className="h-7 w-7" />
            </Button>
            <Logo
              size="xl"
              className="flex-shrink-0 [&>div]:h-14 [&>div]:w-14 sm:[&>div]:h-20 sm:[&div]:w-20 hover:scale-110 transition-all duration-300 filter drop-shadow-[0_0_15px_rgba(0,179,243,0.4)]"
              showText={false}
            />
            <div className="flex flex-col">
              <h1 className="text-xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                {isCompany ? 'Perfil de Empresa' : 'Perfil Profesional'}
              </h1>
              <p className="text-xs sm:text-lg text-[#00b3f3] font-medium uppercase tracking-wider">
                {isCompany && companyData?.company_name ? companyData.company_name : profile.full_name}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-8 md:py-12 relative z-10">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Profile Header Card */}
          <Card className="bg-white border border-gray-200 shadow-lg rounded-3xl overflow-hidden hover:border-[#00b3f3]/50 transition-all duration-300">
            <CardContent className="p-0">
              {/* Header Section */}
              <div className="bg-gradient-to-br from-[#00b3f3]/10 via-gray-50 to-[#00b3f3]/5 p-8 md:p-10 border-b border-gray-200">
                <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8">
                  {/* Avatar Section */}
                  <div className="flex flex-col items-center gap-6 w-full lg:w-auto">
                    <div className="relative">
                      <div className="h-40 w-40 bg-gray-100 rounded-2xl flex items-center justify-center text-5xl font-semibold text-gray-700 border-4 border-gray-200 shadow-lg ring-4 ring-[#00b3f3]/10">
                        {profile.avatar_url ? (
                          <img src={profile.avatar_url} alt={profile.full_name || ''} className="h-full w-full rounded-2xl object-cover" />
                        ) : (
                          profile.full_name?.charAt(0).toUpperCase()
                        )}
                      </div>
                      {(pilotData?.certification_status || companyData?.certification_status) && (
                        <div className="absolute -bottom-2 -right-2 bg-[#00b3f3] rounded-full p-2 border-4 border-white shadow-md">
                          <CheckCircle className="h-5 w-5 text-gray-900" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Info Section */}
                  <div className="flex-1 w-full text-center lg:text-left">
                    <div className="flex flex-col lg:flex-row lg:items-start gap-4 mb-6">
                      <div className="flex-1">
                        <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-2 tracking-tight">
                          {isCompany && companyData?.company_name ? companyData.company_name : profile.full_name}
                        </h1>
                        {profile.location && (
                          <p className="text-[#00b3f3] text-lg flex items-center gap-2 justify-center lg:justify-start mb-4 font-medium">
                            <MapPin className="h-5 w-5" />
                            {profile.location}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
                        {pilotData?.certification_status && (
                          <Badge className="bg-[#00b3f3] text-white border-0 px-4 py-2 text-sm font-semibold rounded-xl shadow-[0_0_15px_rgba(0,179,243,0.3)]">
                            <Shield className="h-4 w-4 mr-2" />
                            Perfil Certificado
                          </Badge>
                        )}
                        {companyData?.certification_status && (
                          <Badge className="bg-[#00b3f3] text-white border-0 px-4 py-2 text-sm font-semibold rounded-xl shadow-[0_0_15px_rgba(0,179,243,0.3)]">
                            <Shield className="h-4 w-4 mr-2" />
                            Empresa Certificada
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Share Buttons */}
                    <div className="flex flex-wrap gap-3 justify-center lg:justify-start mb-6">
                      <Button
                        onClick={handleShare}
                        className="bg-[#00b3f3] text-white hover:bg-[#0099cc] font-semibold flex items-center gap-2"
                      >
                        <Share2 className="h-4 w-4" />
                        Compartir Perfil
                      </Button>
                      <Button
                        onClick={handleCopyLink}
                        variant="outline"
                        className="border-[#00b3f3] text-[#00b3f3] hover:bg-[#00b3f3]/10 font-semibold flex items-center gap-2"
                      >
                        <Copy className="h-4 w-4" />
                        Copiar Link
                      </Button>
                    </div>

                    {profile.bio && (
                      <div className="bg-[#00b3f3]/10 backdrop-blur-md rounded-2xl p-6 mb-8 border border-gray-200 shadow-inner">
                        <p className="text-gray-700 text-lg leading-relaxed italic">"{profile.bio}"</p>
                      </div>
                    )}

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                      {/* Flight Hours */}
                      <div className="bg-white backdrop-blur-md border-2 border-gray-200 rounded-2xl p-6 hover:border-[#00b3f3]/50 transition-all duration-300 hover:scale-105 group">
                        <Clock className="h-8 w-8 text-[#00b3f3] mb-3 group-hover:scale-110 transition-transform" />
                        <div className="text-gray-900 text-4xl font-bold mb-1">{flightHours}</div>
                        <div className="text-[#00b3f3]/70 text-sm font-bold uppercase tracking-wider">Horas de Vuelo</div>
                      </div>

                      {/* Experience */}
                      {profile.experience_years && profile.experience_years > 0 && (
                        <div className="bg-white backdrop-blur-md border-2 border-gray-200 rounded-2xl p-6 hover:border-[#00b3f3]/50 transition-all duration-300 hover:scale-105 group">
                          <Star className="h-8 w-8 text-[#00b3f3] mb-3 group-hover:scale-110 transition-transform" />
                          <div className="text-gray-900 text-4xl font-bold mb-1">{profile.experience_years}</div>
                          <div className="text-[#00b3f3]/70 text-sm font-bold uppercase tracking-wider">Años Experiencia</div>
                        </div>
                      )}
                    </div>

                    {/* Certification Badge */}
                    {pilotData?.certification_academy && (
                      <div className="bg-[#00b3f3]/10 border-2 border-gray-200 rounded-2xl p-6 mb-8 flex items-center gap-5">
                        <div className="bg-[#00b3f3] rounded-xl p-4 shadow-[0_0_20px_rgba(0,179,243,0.4)]">
                          <Award className="h-10 w-10 text-white" />
                        </div>
                        <div>
                          <div className="text-[#00b3f3]/70 font-bold text-xs uppercase tracking-[0.2em] mb-1">Certificado por</div>
                          <div className="text-gray-900 font-bold text-2xl">{pilotData.certification_academy}</div>
                        </div>
                      </div>
                    )}
                    {companyData?.certification_status && (
                      <div className="bg-[#00b3f3]/20 border-2 border-[#00b3f3]/40 rounded-2xl p-6 mb-8 flex items-center gap-5">
                        <div className="bg-[#00b3f3] rounded-xl p-4 shadow-[0_0_20px_rgba(0,179,243,0.4)]">
                          <Shield className="h-10 w-10 text-gray-900" />
                        </div>
                        <div>
                          <div className="text-[#00b3f3]/70 font-bold text-xs uppercase tracking-[0.2em] mb-1">Empresa Certificada</div>
                          <div className="text-gray-900 font-bold text-2xl">Validada y verificada</div>
                        </div>
                      </div>
                    )}

                    {/* Specialties & Drones Grid */}
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Specialties */}
                      {profile.specialties && profile.specialties.length > 0 && (
                        <div className="bg-white backdrop-blur-md border-2 border-gray-200 rounded-2xl p-6">
                          <h3 className="text-gray-900 font-bold mb-5 text-xl flex items-center gap-3">
                            <div className="h-2 w-2 bg-[#00b3f3] rounded-full animate-pulse"></div>
                            Especialidades
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {profile.specialties.map((specialty, index) => (
                              <Badge key={index} className="bg-[#00b3f3]/10 text-gray-900 border-2 border-gray-200 px-3 py-1.5 text-sm font-medium hover:bg-[#00b3f3]/20 transition-all rounded-lg">
                                {specialty}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Drone Types */}
                      {profile.drone_types && profile.drone_types.length > 0 && (
                        <div className="bg-white backdrop-blur-md border-2 border-gray-200 rounded-2xl p-6">
                          <h3 className="text-gray-900 font-bold mb-5 text-xl flex items-center gap-3">
                            <div className="h-2 w-2 bg-[#00b3f3] rounded-full animate-pulse"></div>
                            Tipos de Drones
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {profile.drone_types.map((drone, index) => (
                              <Badge key={index} className="bg-[#00b3f3]/10 text-gray-900 border-2 border-gray-200 px-3 py-1.5 text-sm font-medium hover:bg-[#00b3f3]/20 transition-all rounded-lg">
                                {drone}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>


          {/* Redes Sociales - Solo si tiene */}
          {(profile.instagram_url || profile.instagram_username || profile.linkedin_url || profile.linkedin_username) && (
            <Card className="bg-white backdrop-blur-xl border-2 border-gray-200 shadow-2xl rounded-3xl overflow-hidden hover:border-[#00b3f3]/50 transition-all duration-300">
              <CardHeader className="bg-white border-b border-gray-200">
                <CardTitle className="text-gray-900 text-2xl font-bold flex items-center gap-3">
                  <div className="bg-[#00b3f3]/10 rounded-lg p-2">
                    <MessageCircle className="h-6 w-6 text-[#00b3f3]" />
                  </div>
                  Redes Sociales
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  {(profile.instagram_url || profile.instagram_username) && (
                    <a
                      href={profile.instagram_url || `https://instagram.com/${profile.instagram_username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-5 p-6 bg-white border-2 border-gray-200 rounded-2xl hover:border-[#00b3f3]/50 hover:bg-[#00b3f3]/10 transition-all"
                    >
                      <div className="h-14 w-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center transform group-hover:rotate-12 transition-transform">
                        <span className="text-gray-900 text-2xl font-bold">📷</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-[#00b3f3]/70 text-xs font-bold uppercase tracking-widest mb-1">Instagram</p>
                        <p className="font-bold text-gray-900 text-lg">
                          @{profile.instagram_username || (profile.instagram_url ? profile.instagram_url.split('/').pop() : '')}
                        </p>
                      </div>
                    </a>
                  )}
                  {(profile.linkedin_url || profile.linkedin_username) && (
                    <a
                      href={profile.linkedin_url || `https://linkedin.com/in/${profile.linkedin_username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-5 p-6 bg-white border-2 border-gray-200 rounded-2xl hover:border-[#00b3f3]/50 hover:bg-[#00b3f3]/10 transition-all"
                    >
                      <div className="h-14 w-14 bg-[#0077b5] rounded-xl flex items-center justify-center transform group-hover:-rotate-12 transition-transform shadow-[0_0_15px_rgba(0,119,181,0.4)]">
                        <span className="text-gray-900 text-2xl font-bold">💼</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-[#00b3f3]/70 text-xs font-bold uppercase tracking-widest mb-1">LinkedIn</p>
                        <p className="font-bold text-gray-900 text-lg">
                          {profile.linkedin_username || (profile.linkedin_url ? profile.linkedin_url.split('/').pop() : '')}
                        </p>
                      </div>
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Servicios Card - Solo para empresas */}
          {isCompany && profile.services && profile.services.length > 0 && (
            <Card className="bg-white backdrop-blur-xl border-2 border-gray-200 shadow-2xl rounded-3xl overflow-hidden hover:border-[#00b3f3]/50 transition-all duration-300">
              <CardHeader className="bg-white border-b border-gray-200">
                <CardTitle className="text-gray-900 text-2xl font-bold flex items-center gap-3">
                  <div className="bg-[#00b3f3]/10 rounded-lg p-2">
                    <Briefcase className="h-6 w-6 text-[#00b3f3]" />
                  </div>
                  Servicios que Prestamos
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-3 p-2">
                  {profile.services.map((service, index) => (
                    <Badge
                      key={index}
                      className="bg-[#00b3f3] text-white border-0 px-5 py-2.5 text-base font-bold hover:bg-[#0099cc] transition-all rounded-xl shadow-[0_0_10px_rgba(0,179,243,0.2)]"
                    >
                      {service}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Website Card - Solo si tiene website */}
          {isCompany && profile.website && (
            <Card className="bg-white backdrop-blur-xl border-2 border-gray-200 shadow-2xl rounded-3xl overflow-hidden hover:border-[#00b3f3]/50 transition-all duration-300">
              <CardHeader className="bg-white border-b border-gray-200">
                <CardTitle className="text-gray-900 text-2xl font-bold flex items-center gap-3">
                  <div className="bg-[#00b3f3]/10 rounded-lg p-2">
                    <Mail className="h-6 w-6 text-[#00b3f3]" />
                  </div>
                  Sitio Web
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <a
                  href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-5 p-6 bg-white border-2 border-gray-200 rounded-2xl hover:border-[#00b3f3]/50 hover:bg-[#00b3f3]/10 transition-all"
                >
                  <div className="h-14 w-14 bg-[#00b3f3] rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(0,179,243,0.4)]">
                    <span className="text-white text-2xl font-bold">🌐</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-[#00b3f3]/70 text-xs font-bold uppercase tracking-widest mb-1">Visita nuestro sitio web</p>
                    <p className="font-bold text-[#00b3f3] text-lg break-all">{profile.website}</p>
                  </div>
                </a>
              </CardContent>
            </Card>
          )}


          {/* Contact Button Card - Solo para Plan Empresa */}
          {actualUserId && (
            <Card className="bg-gradient-to-br from-[#00b3f3] to-[#0099cc] border-0 shadow-lg overflow-hidden">
              <CardContent className="p-6 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="bg-white/20 rounded-full p-4">
                    <MessageCircle className="h-8 w-8 text-gray-900" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      {isCompany ? '¿Interesado en nuestros servicios?' : '¿Interesado en mis servicios?'}
                    </h3>
                    <p className="text-white/90 mb-4">
                      {isCompany ? 'Déjanos tus datos y te contactaremos a la brevedad' : 'Déjame tus datos y te contactaré a la brevedad'}
                    </p>
                    <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          size="lg"
                          className="bg-white text-[#00b3f3] hover:bg-white/90 font-semibold"
                        >
                          Te llamaremos
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Déjanos tus datos</DialogTitle>
                          <DialogDescription>
                            Completa el formulario y te contactaremos pronto
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleContactSubmit} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="contact-name">Nombre completo *</Label>
                            <Input
                              id="contact-name"
                              value={contactForm.name}
                              onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                              required
                              placeholder="Tu nombre"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="contact-email">Email *</Label>
                            <Input
                              id="contact-email"
                              type="email"
                              value={contactForm.email}
                              onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                              required
                              placeholder="tu@email.com"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="contact-phone">Teléfono</Label>
                            <Input
                              id="contact-phone"
                              type="tel"
                              value={contactForm.phone}
                              onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                              placeholder="+56 9 1234 5678"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="contact-message">Mensaje (opcional)</Label>
                            <Textarea
                              id="contact-message"
                              value={contactForm.message}
                              onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                              placeholder="Cuéntanos sobre tu proyecto..."
                              rows={4}
                            />
                          </div>
                          <Button
                            type="submit"
                            className="w-full"
                            disabled={submittingContact}
                          >
                            {submittingContact ? 'Enviando...' : 'Enviar solicitud'}
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Contact Form Card - Solo para usuarios con suscripción activa */}
          {hasActiveSubscription && (
            <Card className="bg-gradient-to-br from-[#00b3f3]/10 to-white border-2 border-[#00b3f3]/30 shadow-2xl rounded-3xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-[#00b3f3]/5 to-transparent border-b border-[#00b3f3]/20">
                <CardTitle className="text-gray-900 text-2xl font-bold flex items-center gap-3">
                  <div className="bg-[#00b3f3] rounded-lg p-2">
                    <MessageCircle className="h-6 w-6 text-white" />
                  </div>
                  ¿Interesado en mis servicios?
                </CardTitle>
                <CardDescription className="text-gray-700 text-base mt-2">
                  Déjame tus datos y te contactaré a la brevedad
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full bg-[#00b3f3] hover:bg-[#0099cc] text-white font-bold h-12 text-lg rounded-xl shadow-lg transition-all hover:scale-105">
                      <Phone className="h-5 w-5 mr-2" />
                      Te llamaremos
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Déjanos tus datos</DialogTitle>
                      <DialogDescription>
                        Te contactaremos a la brevedad para ofrecerte nuestros servicios
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleContactSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="name">Nombre completo *</Label>
                        <Input
                          id="name"
                          required
                          value={contactForm.name}
                          onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                          placeholder="Tu nombre"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          required
                          value={contactForm.email}
                          onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                          placeholder="tu@email.com"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Teléfono</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={contactForm.phone}
                          onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                          placeholder="+56 9 1234 5678"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="message">Mensaje (opcional)</Label>
                        <Textarea
                          id="message"
                          value={contactForm.message}
                          onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                          placeholder="Cuéntanos sobre tu proyecto..."
                          className="mt-1 min-h-[100px]"
                        />
                      </div>
                      <Button
                        type="submit"
                        disabled={submittingContact}
                        className="w-full bg-[#00b3f3] hover:bg-[#0099cc] text-white"
                      >
                        {submittingContact ? 'Enviando...' : 'Enviar solicitud'}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          )}

          {/* Contact Card */}
          <Card className="bg-white backdrop-blur-xl border-2 border-gray-200 shadow-2xl rounded-3xl overflow-hidden hover:border-[#00b3f3]/50 transition-all duration-300">
            <CardHeader className="bg-white border-b border-gray-200">
              <CardTitle className="text-gray-900 text-2xl font-bold flex items-center gap-3">
                <div className="bg-[#00b3f3]/10 rounded-lg p-2">
                  <Mail className="h-6 w-6 text-[#00b3f3]" />
                </div>
                Información de Contacto
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid gap-6 sm:grid-cols-2">
                {profile.email && (
                  <a
                    href={`mailto:${profile.email}`}
                    className="group flex items-center gap-5 p-6 bg-white border-2 border-gray-200 rounded-2xl hover:border-[#00b3f3]/50 hover:bg-[#00b3f3]/10 transition-all"
                  >
                    <div className="h-14 w-14 bg-[#00b3f3]/10 rounded-xl flex items-center justify-center border-2 border-gray-200 group-hover:scale-110 transition-transform">
                      <Mail className="h-7 w-7 text-[#00b3f3]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[#00b3f3]/70 text-xs font-bold uppercase tracking-widest mb-1">Email</p>
                      <p className="font-bold text-gray-900 text-lg break-all">{profile.email}</p>
                    </div>
                  </a>
                )}
                {profile.phone && (
                  <a
                    href={`tel:${profile.phone}`}
                    className="group flex items-center gap-5 p-6 bg-white border-2 border-gray-200 rounded-2xl hover:border-[#00b3f3]/50 hover:bg-[#00b3f3]/10 transition-all"
                  >
                    <div className="h-14 w-14 bg-[#00b3f3]/10 rounded-xl flex items-center justify-center border-2 border-gray-200 group-hover:scale-110 transition-transform">
                      <Phone className="h-7 w-7 text-[#00b3f3]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[#00b3f3]/70 text-xs font-bold uppercase tracking-widest mb-1">Teléfono</p>
                      <p className="font-bold text-gray-900 text-lg">{profile.phone}</p>
                    </div>
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PublicPilotProfile;

