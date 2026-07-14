import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { AdBanner } from "@/components/ads/AdBanner";
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
  Share2,
  Copy,
  ExternalLink,
  Play,
  MonitorPlay,
  X,
  Youtube,
  Instagram,
  Linkedin,
  Globe
} from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
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
  youtube_url?: string | null;
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

interface UserCertification {
  id: string;
  file_name: string;
  file_url: string;
  status: string;
  signedUrl?: string;
}

interface Diploma {
  id: string;
  course_title: string;
  course_date: string;
  course_hours: string;
  student_name: string;
  instructor_name: string;
  city: string;
  certificate_number: string;
  token?: string;
}

interface PortfolioItem {
  id: string;
  type: string;
  url: string;
  thumbnail_url?: string | null;
  title: string | null;
  description: string | null;
  display_order: number | null;
}

const getYouTubeId = (url: string) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

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
  const [diplomas, setDiplomas] = useState<Diploma[]>([]);
  const [userCertifications, setUserCertifications] = useState<UserCertification[]>([]);
  const [isFlightHoursValidated, setIsFlightHoursValidated] = useState(false);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);

  // Render diploma card
  const renderDiplomaCard = (diploma: Diploma) => (
    <div
      key={diploma.id}
      className="group relative aspect-[1.414/1] w-full rounded-2xl overflow-hidden shadow-sm ring-1 ring-zinc-200 bg-white select-none transition-shadow duration-300 hover:shadow-md cursor-pointer"
      onClick={() => navigate(`/verificar-diploma?codigo=${diploma.token}`)}
    >
      <img
        src="/DIPLOMA_2026.jpg"
        className="absolute inset-0 w-full h-full object-cover"
        alt="Diploma Background"
        onContextMenu={(e) => e.preventDefault()}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
        <p className="text-[4.5vw] sm:text-[2.2vw] font-serif font-bold text-black leading-tight mb-2 tracking-tight">{diploma.student_name}</p>
        <p className="text-[3.5vw] sm:text-[1.6vw] font-bold text-[#00b3f3]">{diploma.course_title}</p>
        <p className="text-[2vw] sm:text-[1vw] italic text-gray-500 mt-2 font-medium">
          {new Date(diploma.course_date).toLocaleDateString('es-CL')}
        </p>
      </div>
      <div className="absolute inset-0 bg-zinc-950/0 group-hover:bg-zinc-950/[0.03] transition-colors z-10"></div>
      <div className="absolute top-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="bg-[#083b4e]/90 backdrop-blur text-zinc-50 px-3 py-1.5 rounded-lg flex items-center gap-2 text-[11px] font-medium font-display tracking-wide shadow-sm">
          <CheckCircle className="h-3.5 w-3.5 text-[#00b3f3]" strokeWidth={2} />
          Verificar en línea
        </div>
      </div>
    </div>
  );

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
      if (!pilotId || pilotId === 'undefined' || pilotId.trim() === '' || pilotId === 'profile' || pilotId === 'dashboard' || pilotId === 'company') {
        // Redirigir a la página principal si es una ruta reservada
        navigate('/', { replace: true });
        return;
      }

      setLoading(true);
      setProfile(null);
      setServices([]);
      setPilotData(null);
      setHasActiveSubscription(false);
      setDiplomas([]);
      setUserCertifications([]);
      setIsFlightHoursValidated(false);
      setPortfolio([]);

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
            youtube_url: companyInfo.youtube_url || profileData.youtube_url,
          } as PilotProfile));
        }
      }

      // Load published services
      const { data: servicesData } = await supabase
        .from('pilot_services')
        .select('*')
        .eq('pilot_id', userId)
        .eq('is_published', true);


      setProfile(profileData as unknown as PilotProfile);
      setPilotData(pilotInfo);
      setServices(servicesData || []);

      // Verificar si el piloto tiene suscripción activa (PRO o Empresa)
      if (userId) {
        let isPro = false;

        // 1. Verificar suscripción directa activa
        const { data: subscription } = await supabase
          .from('user_subscriptions')
          .select('status, plan_name')
          .eq('user_id', userId)
          .eq('status', 'active')
          .maybeSingle();

        if (subscription && subscription.plan_name !== 'free') {
          isPro = true;
        } else {
          // 2. Si no tiene suscripción directa, verificar si es piloto de una empresa (los cuales son Pro por extensión)
          const { data: pilotRecord } = await supabase
            .from('pilots')
            .select('id')
            .eq('user_id', userId)
            .maybeSingle();

          if (pilotRecord) {
            const { data: companyPilot } = await supabase
              .from('company_pilots')
              .select('id')
              .eq('pilot_id', pilotRecord.id)
              .maybeSingle();

            if (companyPilot) {
              isPro = true;
            }
          }
        }

        setHasActiveSubscription(isPro);

        // Cargar Diplomas oficiales
        const { data: diplomasData } = await supabase
          .from('diploma_qr_tokens')
          .select(`
            token,
            diploma_id,
            diplomas (*)
          `)
          .eq('user_id', userId);

        if (diplomasData) {
          const formattedDiplomas = diplomasData
            .filter((item: any) => item.diplomas)
            .map((item: any) => ({
              ...item.diplomas,
              token: item.token
            }));
          setDiplomas(formattedDiplomas);
        }

        // Cargar Certificaciones validadas (subidas por el usuario)
        const { data: certsData } = await supabase
          .from('user_certifications')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'validated');

        if (certsData) {
          const certsWithUrls = await Promise.all(certsData.map(async (cert) => {
            let signedUrl = cert.file_url;
            if (!cert.file_url.startsWith('http')) {
              try {
                const { data } = await supabase.storage
                  .from('certifications')
                  .createSignedUrl(cert.file_url, 3600);
                signedUrl = data?.signedUrl || cert.file_url;
              } catch (err) {
                console.error('Error generating signed URL for cert:', cert.id, err);
              }
            }
            return { ...cert, signedUrl };
          }));
          setUserCertifications(certsWithUrls);
        }

        // Cargar Portafolio
        const { data: portfolioData } = await supabase
          .from('pilot_portfolio')
          .select('*')
          .eq('user_id', userId)
          .order('display_order', { ascending: true })
          .order('created_at', { ascending: false });

        setPortfolio(portfolioData || []);

        // Cargar todas las Horas de Vuelo (validadas y por validar)
        const { data: flightLogsData } = await supabase
          .from('flight_logs')
          .select('flight_hours, duration_hours, status')
          .eq('user_id', userId);

        if (flightLogsData) {
          // El total de horas es la suma de todas las horas registradas (por certificado o manuales)
          const totalHours = flightLogsData.reduce((acc: number, curr: any) => {
            const certHours = Number(curr.flight_hours) || 0;
            const manualHours = Number(curr.duration_hours) || 0;
            return acc + certHours + manualHours;
          }, 0);

          setFlightHours(totalHours);

          // El sello de validación solo se muestra si hay al menos un registro validado por el administrador
          const hasValidatedDocs = flightLogsData.some((log: any) => log.status === 'validated');
          setIsFlightHoursValidated(hasValidatedDocs);
        } else {
          setFlightHours(0);
          setIsFlightHoursValidated(false);
        }
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

      // Send email notification to admins
      try {
        await supabase.functions.invoke("send-contact-email", {
          body: {
            record: {
              name: contactForm.name,
              email: contactForm.email,
              subject: `Contacto a Piloto: ${profile?.full_name}`,
              message: `Mensaje: ${contactForm.message}\n\nTeléfono: ${contactForm.phone || 'No proporcionado'}`
            }
          }
        });
      } catch (emailError) {
        console.error("Error sending notification email:", emailError);
      }

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
      <div className="min-h-screen bg-zinc-50 font-geist">
        {/* Skeleton header */}
        <div className="bg-white/80 backdrop-blur border-b border-zinc-200">
          <div className="px-4 py-3 max-w-7xl mx-auto flex items-center gap-4">
            <div className="h-9 w-9 rounded-lg bg-zinc-200 animate-pulse" />
            <div className="h-9 w-9 rounded-lg bg-zinc-200 animate-pulse" />
            <div className="h-4 w-40 rounded bg-zinc-200 animate-pulse" />
          </div>
        </div>
        {/* Skeleton hero */}
        <div className="px-4 py-8 md:py-12">
          <div className="max-w-5xl mx-auto">
            <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
              <div className="h-36 md:h-44 bg-zinc-900 animate-pulse" />
              <div className="px-6 md:px-10 pb-10">
                <div className="-mt-14 mb-6 h-28 w-28 rounded-2xl bg-zinc-200 border-4 border-white animate-pulse" />
                <div className="h-8 w-64 rounded bg-zinc-200 animate-pulse mb-3" />
                <div className="h-4 w-40 rounded bg-zinc-200 animate-pulse mb-8" />
                <div className="grid grid-cols-3 gap-6 mb-8">
                  <div className="h-16 rounded bg-zinc-100 animate-pulse" />
                  <div className="h-16 rounded bg-zinc-100 animate-pulse" />
                  <div className="h-16 rounded bg-zinc-100 animate-pulse" />
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="h-28 rounded-xl bg-zinc-100 animate-pulse" />
                  <div className="h-28 rounded-xl bg-zinc-100 animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4 font-geist">
        <div className="max-w-md w-full text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#083b4e] text-zinc-100">
            <Shield className="h-7 w-7" strokeWidth={1.5} />
          </div>
          <h1 className="font-display text-3xl font-semibold text-zinc-900 tracking-tight mb-3">
            Perfil no encontrado
          </h1>
          <p className="text-zinc-500 leading-relaxed mb-8">
            No pudimos encontrar el perfil profesional que buscas. Es posible que el enlace haya cambiado o ya no esté disponible.
          </p>
          <Button
            onClick={() => navigate('/auth')}
            className="h-11 px-6 rounded-xl bg-[#083b4e] hover:bg-[#0c4d63] text-zinc-50 font-medium transition-colors active:translate-y-px"
          >
            Volver al inicio
          </Button>
        </div>
      </div>
    );
  }

  const heroContainer = {
    hidden: {},
    show: {
      transition: { staggerChildren: 0.08, delayChildren: 0.05 },
    },
  };
  const heroItem = {
    hidden: { opacity: 0, y: 16 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 100, damping: 20 },
    },
  };
  const sectionReveal = {
    initial: { opacity: 0, y: 16 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-60px" },
    transition: { type: "spring" as const, stiffness: 100, damping: 20 },
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-geist text-zinc-900">

      {/* Header */}
      <div className="bg-white/85 backdrop-blur-md border-b border-zinc-200 sticky top-0 z-50">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3 max-w-7xl mx-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="h-9 w-9 rounded-lg text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors active:translate-y-px"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Logo
              size="md"
              showText={false}
              className="flex-shrink-0"
            />
            <div className="h-6 w-px bg-zinc-200 mx-1 hidden sm:block" />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] sm:text-[11px] text-[#00b3f3] font-medium uppercase tracking-[0.18em] leading-none mb-1 font-display">
                {isCompany ? 'Perfil de Empresa' : 'Perfil Profesional'}
              </span>
              <h1 className="text-sm sm:text-base font-semibold text-zinc-900 tracking-tight leading-none truncate font-display">
                {isCompany && companyData?.company_name ? companyData.company_name : profile.full_name}
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-8 md:py-12 relative z-10">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Banner publicitario superior */}
          <AdBanner position="Superior" />

          {/* Profile Header Card */}
          <motion.div
            variants={heroContainer}
            initial="hidden"
            animate="show"
            className="relative bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm"
          >
            {/* Deep teal sky band (brand, evokes altitude) */}
            <div className="relative h-36 md:h-44 bg-[#083b4e] overflow-hidden">
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(120% 140% at 85% -20%, rgba(0,179,243,0.22) 0%, rgba(8,59,78,0) 55%), linear-gradient(180deg, #0a4a5f 0%, #062e3d 100%)",
                }}
              />
              {/* Fine horizon line */}
              <div className="absolute bottom-0 left-0 right-0 h-px bg-[#00b3f3]/20" />
              {/* Category label, top-right */}
              <motion.div
                variants={heroItem}
                className="absolute top-5 right-6 hidden sm:flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-zinc-400 font-display"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#00b3f3]" />
                {isCompany ? 'Operador · Empresa' : 'Piloto · Operador'}
              </motion.div>
            </div>

            <div className="px-6 md:px-10 pb-8 md:pb-10">
              {/* Avatar overlapping the band */}
              <motion.div variants={heroItem} className="relative -mt-16 md:-mt-20 mb-6 w-fit">
                <div className="h-28 w-28 md:h-32 md:w-32 rounded-2xl bg-white p-1.5 shadow-md ring-1 ring-zinc-200">
                  <div className="h-full w-full rounded-xl bg-zinc-100 overflow-hidden flex items-center justify-center">
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt={profile.full_name || ''} className="h-full w-full object-cover" />
                    ) : (
                      <img
                        src="/piloto de drones-logo.png"
                        alt="Piloto de Drones"
                        className="h-full w-full object-contain p-3 opacity-70"
                      />
                    )}
                  </div>
                </div>
                {(pilotData?.certification_status || companyData?.certification_status) && (
                  <div className="absolute -bottom-1.5 -right-1.5 bg-[#00b3f3] rounded-lg p-1.5 ring-2 ring-white">
                    <CheckCircle className="h-4 w-4 text-white" strokeWidth={2} />
                  </div>
                )}
              </motion.div>

              {/* Name + location + cert badge */}
              <motion.div variants={heroItem} className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-7">
                <div className="min-w-0">
                  <h1 className="font-display text-3xl md:text-[2.75rem] leading-[1.05] font-semibold text-zinc-900 tracking-tight">
                    {isCompany && companyData?.company_name ? companyData.company_name : profile.full_name}
                  </h1>
                  {profile.location && (
                    <p className="mt-3 text-zinc-500 text-sm flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-[#00b3f3]" strokeWidth={1.75} />
                      {profile.location}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 md:justify-end shrink-0">
                  {pilotData?.certification_status && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#00b3f3] border border-[#00b3f3]/30 bg-[#00b3f3]/5 rounded-full font-display tracking-wide">
                      <Shield className="h-3.5 w-3.5" strokeWidth={2} />
                      Perfil Certificado
                    </span>
                  )}
                  {companyData?.certification_status && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#00b3f3] border border-[#00b3f3]/30 bg-[#00b3f3]/5 rounded-full font-display tracking-wide">
                      <Shield className="h-3.5 w-3.5" strokeWidth={2} />
                      Empresa Certificada
                    </span>
                  )}
                </div>
              </motion.div>

              {/* Share Buttons */}
              <motion.div variants={heroItem} className="flex flex-wrap gap-2.5 mb-8">
                <Button
                  onClick={handleShare}
                  className="h-10 px-4 rounded-lg bg-[#083b4e] hover:bg-[#0c4d63] text-zinc-50 text-sm font-medium flex items-center gap-2 transition-colors active:translate-y-px shadow-none"
                >
                  <Share2 className="h-4 w-4" strokeWidth={1.75} />
                  Compartir Perfil
                </Button>
                <Button
                  onClick={handleCopyLink}
                  variant="outline"
                  className="h-10 px-4 rounded-lg border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 text-sm font-medium flex items-center gap-2 transition-colors active:translate-y-px"
                >
                  <Copy className="h-4 w-4" strokeWidth={1.75} />
                  Copiar Link
                </Button>
              </motion.div>

              {profile.bio && (
                <motion.div variants={heroItem} className="border-l-2 border-[#00b3f3]/40 pl-5 mb-9">
                  <p className="text-zinc-600 text-[15px] md:text-base leading-relaxed">{profile.bio}</p>
                </motion.div>
              )}

              {/* Stats row — métricas que respiran, separadas por líneas */}
              <motion.div variants={heroItem} className="border-y border-zinc-200 divide-y sm:divide-y-0 sm:divide-x divide-zinc-200 grid grid-cols-1 sm:grid-cols-2 mb-9">
                {/* Flight Hours */}
                <div className="py-5 sm:pr-8 flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-[#00b3f3]" strokeWidth={1.75} />
                    <span className="text-[11px] uppercase tracking-[0.16em] text-zinc-500 font-medium font-display">Horas de Vuelo</span>
                    {isFlightHoursValidated && (
                      <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600" title="Información Certificada">
                        <CheckCircle className="h-3.5 w-3.5" strokeWidth={2} />
                        Certificado
                      </span>
                    )}
                  </div>
                  <span className="font-display text-4xl md:text-5xl font-semibold text-zinc-900 tabular-nums leading-none">{flightHours}</span>
                  {isFlightHoursValidated && (
                    <span className="mt-2 flex items-center gap-1.5 text-[11px] text-zinc-400">
                      <Shield className="h-3 w-3" strokeWidth={1.75} />
                      Verificadas con documentos oficiales
                    </span>
                  )}
                </div>

                {/* Experience */}
                {profile.experience_years && profile.experience_years > 0 && (
                  <div className="py-5 sm:pl-8 flex flex-col">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="h-4 w-4 text-[#00b3f3]" strokeWidth={1.75} />
                      <span className="text-[11px] uppercase tracking-[0.16em] text-zinc-500 font-medium font-display">Años de Experiencia</span>
                    </div>
                    <span className="font-display text-4xl md:text-5xl font-semibold text-zinc-900 tabular-nums leading-none">{profile.experience_years}</span>
                  </div>
                )}
              </motion.div>

              {/* Certification / trust block */}
              {pilotData?.certification_academy && (
                <motion.div variants={heroItem} className="flex items-center gap-4 p-5 rounded-xl bg-zinc-50 border border-zinc-200 mb-9">
                  <div className="shrink-0 flex h-12 w-12 items-center justify-center rounded-lg bg-[#083b4e] text-zinc-100">
                    <Award className="h-6 w-6" strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-medium font-display mb-1">Certificado por</div>
                    <div className="font-display text-lg md:text-xl font-semibold text-zinc-900 tracking-tight truncate">{pilotData.certification_academy}</div>
                  </div>
                </motion.div>
              )}
              {companyData?.certification_status && (
                <motion.div variants={heroItem} className="flex items-center gap-4 p-5 rounded-xl bg-zinc-50 border border-zinc-200 mb-9">
                  <div className="shrink-0 flex h-12 w-12 items-center justify-center rounded-lg bg-[#083b4e] text-zinc-100">
                    <Shield className="h-6 w-6" strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-medium font-display mb-1">Empresa Certificada</div>
                    <div className="font-display text-lg md:text-xl font-semibold text-zinc-900 tracking-tight">Validada y verificada</div>
                  </div>
                </motion.div>
              )}

              {/* Specialties & Drones */}
              <motion.div variants={heroItem} className="grid md:grid-cols-2 gap-8">
                {/* Specialties */}
                {profile.specialties && profile.specialties.length > 0 && (
                  <div>
                    <h3 className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-medium font-display mb-3">Especialidades</h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.specialties.map((specialty, index) => (
                        <span key={index} className="inline-flex items-center px-3 py-1.5 text-[13px] font-medium text-zinc-700 bg-white border border-zinc-200 rounded-md hover:border-[#00b3f3]/40 hover:text-zinc-900 transition-colors">
                          {specialty}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Drone Types */}
                {profile.drone_types && profile.drone_types.length > 0 && (
                  <div>
                    <h3 className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-medium font-display mb-3">Tipos de Drones</h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.drone_types.map((drone, index) => (
                        <span key={index} className="inline-flex items-center px-3 py-1.5 text-[13px] font-medium text-zinc-700 bg-white border border-zinc-200 rounded-md hover:border-[#00b3f3]/40 hover:text-zinc-900 transition-colors">
                          {drone}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          </motion.div>


          {/* Redes Sociales - Solo si tiene */}
          {(profile.instagram_url || profile.instagram_username || profile.linkedin_url || profile.linkedin_username || profile.youtube_url) && (
            <motion.section
              {...sectionReveal}
              className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-6 md:p-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#083b4e] text-zinc-100 shrink-0">
                  <Share2 className="h-4 w-4" strokeWidth={1.75} />
                </div>
                <h2 className="font-display text-lg font-semibold text-zinc-900 tracking-tight">Redes Sociales</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {(profile.instagram_url || profile.instagram_username) && (
                  <a
                    href={profile.instagram_url || `https://instagram.com/${profile.instagram_username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-3.5 p-4 rounded-xl border border-zinc-200 bg-white hover:border-[#00b3f3]/40 hover:bg-zinc-50 transition-colors"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 group-hover:text-[#00b3f3] transition-colors shrink-0">
                      <Instagram className="h-5 w-5" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-400 font-medium font-display mb-0.5">Instagram</p>
                      <p className="font-medium text-zinc-900 text-sm truncate">
                        @{profile.instagram_username || (profile.instagram_url ? profile.instagram_url.split('/').pop() : '')}
                      </p>
                    </div>
                    <ExternalLink className="ml-auto h-4 w-4 text-zinc-300 group-hover:text-[#00b3f3] transition-colors shrink-0" strokeWidth={1.75} />
                  </a>
                )}
                {(profile.linkedin_url || profile.linkedin_username) && (
                  <a
                    href={profile.linkedin_url || `https://linkedin.com/in/${profile.linkedin_username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-3.5 p-4 rounded-xl border border-zinc-200 bg-white hover:border-[#00b3f3]/40 hover:bg-zinc-50 transition-colors"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 group-hover:text-[#00b3f3] transition-colors shrink-0">
                      <Linkedin className="h-5 w-5" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-400 font-medium font-display mb-0.5">LinkedIn</p>
                      <p className="font-medium text-zinc-900 text-sm truncate">
                        {profile.linkedin_username || (profile.linkedin_url ? profile.linkedin_url.split('/').pop() : '')}
                      </p>
                    </div>
                    <ExternalLink className="ml-auto h-4 w-4 text-zinc-300 group-hover:text-[#00b3f3] transition-colors shrink-0" strokeWidth={1.75} />
                  </a>
                )}
                {profile.youtube_url && (
                  <a
                    href={profile.youtube_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-3.5 p-4 rounded-xl border border-zinc-200 bg-white hover:border-[#00b3f3]/40 hover:bg-zinc-50 transition-colors"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 group-hover:text-[#00b3f3] transition-colors shrink-0">
                      <Youtube className="h-5 w-5" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-400 font-medium font-display mb-0.5">YouTube</p>
                      <p className="font-medium text-zinc-900 text-sm truncate">Canal de Contenido</p>
                    </div>
                    <ExternalLink className="ml-auto h-4 w-4 text-zinc-300 group-hover:text-[#00b3f3] transition-colors shrink-0" strokeWidth={1.75} />
                  </a>
                )}
              </div>
            </motion.section>
          )}

          {/* Servicios Card - Solo para empresas */}
          {isCompany && profile.services && profile.services.length > 0 && (
            <motion.section
              {...sectionReveal}
              className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-6 md:p-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#083b4e] text-zinc-100 shrink-0">
                  <Briefcase className="h-4 w-4" strokeWidth={1.75} />
                </div>
                <h2 className="font-display text-lg font-semibold text-zinc-900 tracking-tight">Servicios que Prestamos</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {profile.services.map((service, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3.5 py-2 text-[13px] font-medium text-zinc-700 bg-white border border-zinc-200 rounded-lg hover:border-[#00b3f3]/40 hover:text-zinc-900 transition-colors"
                  >
                    {service}
                  </span>
                ))}
              </div>
            </motion.section>
          )}

          {/* Website Card - Solo si tiene website */}
          {isCompany && profile.website && (
            <motion.section
              {...sectionReveal}
              className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-6 md:p-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#083b4e] text-zinc-100 shrink-0">
                  <Globe className="h-4 w-4" strokeWidth={1.75} />
                </div>
                <h2 className="font-display text-lg font-semibold text-zinc-900 tracking-tight">Sitio Web</h2>
              </div>
              <a
                href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3.5 p-4 rounded-xl border border-zinc-200 bg-white hover:border-[#00b3f3]/40 hover:bg-zinc-50 transition-colors"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 group-hover:text-[#00b3f3] transition-colors shrink-0">
                  <Globe className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-400 font-medium font-display mb-0.5">Visita nuestro sitio</p>
                  <p className="font-medium text-zinc-900 text-sm truncate group-hover:text-[#00b3f3] transition-colors">{profile.website}</p>
                </div>
                <ExternalLink className="ml-auto h-4 w-4 text-zinc-300 group-hover:text-[#00b3f3] transition-colors shrink-0" strokeWidth={1.75} />
              </a>
            </motion.section>
          )}


          {/* Portafolio Profesional */}
          {portfolio.length > 0 && (
            <motion.section
              {...sectionReveal}
              className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-6 md:p-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#083b4e] text-zinc-100 shrink-0">
                  <MonitorPlay className="h-4 w-4" strokeWidth={1.75} />
                </div>
                <h2 className="font-display text-lg font-semibold text-zinc-900 tracking-tight">Portafolio Profesional</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {portfolio.map((item) => (
                  <div key={item.id} className="group relative bg-white rounded-xl overflow-hidden border border-zinc-200 hover:border-[#00b3f3]/40 transition-all duration-300 shadow-sm hover:shadow-md">
                    <div className="aspect-video relative overflow-hidden bg-zinc-100">
                      {item.type === 'image' ? (
                        <Dialog>
                          <DialogTrigger asChild>
                            <div className="cursor-zoom-in w-full h-full">
                              <img
                                src={item.url}
                                alt={item.title}
                                className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
                              />
                            </div>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl bg-[#083b4e]/95 border-0 p-0 overflow-hidden rounded-2xl">
                            <DialogClose className="absolute top-4 right-4 z-50 rounded-full bg-white/10 p-2 hover:bg-white/20 text-white transition-colors backdrop-blur-md">
                              <X className="h-5 w-5" strokeWidth={1.75} />
                            </DialogClose>
                            <img src={item.url} alt={item.title} className="w-full h-auto max-h-[85vh] object-contain" />
                            <div className="p-6 bg-[#083b4e]/60 backdrop-blur-md">
                              <h3 className="font-display text-white text-lg font-semibold tracking-tight">{item.title}</h3>
                              {item.description && <p className="text-zinc-300 text-sm mt-1.5 leading-relaxed">{item.description}</p>}
                            </div>
                          </DialogContent>
                        </Dialog>
                      ) : (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-full h-full relative group/video cursor-pointer"
                        >
                          {getYouTubeId(item.url) ? (
                            <>
                              <img
                                src={`https://img.youtube.com/vi/${getYouTubeId(item.url)}/hqdefault.jpg`}
                                className="w-full h-full object-cover group-hover/video:scale-[1.04] transition-transform duration-500"
                                alt={item.title}
                              />
                              <div className="absolute inset-0 bg-zinc-950/40 group-hover/video:bg-zinc-950/25 transition-colors flex items-center justify-center">
                                <div className="h-12 w-12 bg-white/95 rounded-full flex items-center justify-center shadow-md">
                                  <Play className="h-5 w-5 text-zinc-950 fill-current ml-0.5" />
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-[#083b4e]">
                              <Play className="h-9 w-9 text-zinc-500" strokeWidth={1.5} />
                              <span className="text-zinc-400 text-[11px] uppercase tracking-[0.16em] font-display">Ver Video</span>
                            </div>
                          )}
                        </a>
                      )}
                      <div className="absolute top-2.5 left-2.5">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] uppercase tracking-[0.14em] font-medium font-display bg-[#083b4e]/80 backdrop-blur text-zinc-50">
                          {item.type === 'image' ? 'Trabajo' : 'Video'}
                        </span>
                      </div>
                    </div>
                    <div className="p-4 border-t border-zinc-200">
                      <h4 className="font-medium text-zinc-900 group-hover:text-[#00b3f3] transition-colors truncate">{item.title}</h4>
                      {item.description && <p className="text-xs text-zinc-500 mt-1 line-clamp-2 leading-relaxed">{item.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>
          )}


          {/* Capacitaciones y Diplomas Section */}
          {(diplomas.length > 0 || userCertifications.length > 0) && (
            <motion.section {...sectionReveal} className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-6 md:p-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#083b4e] text-zinc-100 shrink-0">
                  <Award className="h-4 w-4" strokeWidth={1.75} />
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-medium font-display">Formación certificada</div>
                  <h2 className="font-display text-lg font-semibold text-zinc-900 tracking-tight">Capacitaciones y Diplomas</h2>
                </div>
              </div>
              <p className="text-sm text-zinc-500 leading-relaxed mb-6 max-w-2xl">
                Diplomas y certificados emitidos por academias acreditadas. Cada documento es verificable en línea.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Official Diplomas */}
                {diplomas.length > 2 ? (
                  <Accordion type="single" collapsible className="w-full col-span-1 md:col-span-2">
                    <AccordionItem value="diplomas" className="border-none">
                      <AccordionTrigger className="hover:no-underline py-4 px-5 bg-zinc-50 border border-zinc-200 rounded-xl group transition-colors data-[state=open]:rounded-b-none">
                        <div className="flex items-center gap-3">
                          <Award className="h-5 w-5 text-[#00b3f3]" strokeWidth={1.75} />
                          <span className="font-display font-semibold text-base text-zinc-900 tracking-tight">Ver {diplomas.length} Diplomas Oficiales</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {diplomas.map((diploma) => renderDiplomaCard(diploma))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                ) : (
                  diplomas.map((diploma) => renderDiplomaCard(diploma))
                )}

                {/* Uploaded Certificates */}
                {userCertifications
                  .filter(cert => /\.(jpg|jpeg|png|webp)$/i.test(cert.file_name))
                  .map((cert) => (
                    <div key={cert.id} className="relative aspect-[1.414/1] w-full rounded-2xl overflow-hidden shadow-sm ring-1 ring-zinc-200 group bg-white select-none">
                      <img
                        src={cert.signedUrl}
                        className="w-full h-full object-cover"
                        alt={cert.file_name}
                        onContextMenu={(e) => e.preventDefault()}
                      />
                      {/* Protection overlay */}
                      <div
                        className="absolute inset-0 bg-transparent z-10 cursor-default"
                        onContextMenu={(e) => e.preventDefault()}
                      ></div>
                    </div>
                  ))}
              </div>
            </motion.section>
          )}


          {/* Contacto — CTA + info unificados */}
          {(hasActiveSubscription || profile.email || profile.phone) && (
            <motion.section {...sectionReveal} className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
              {/* Deep teal header band */}
              <div className="bg-[#083b4e] px-6 md:px-8 py-6">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-zinc-400 font-display mb-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#00b3f3]" />
                  Contacto
                </div>
                <h2 className="font-display text-xl md:text-2xl font-semibold text-zinc-50 tracking-tight">
                  {hasActiveSubscription ? '¿Interesado en mis servicios?' : 'Ponte en contacto'}
                </h2>
                {hasActiveSubscription && (
                  <p className="text-zinc-400 text-sm mt-2 leading-relaxed max-w-md">
                    Déjame tus datos y te contactaré a la brevedad.
                  </p>
                )}
              </div>

              <div className="px-6 md:px-8 py-6">
                {/* CTA — solo con suscripción activa */}
                {hasActiveSubscription && (
                  <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full sm:w-auto h-11 px-6 rounded-xl bg-[#083b4e] hover:bg-[#0c4d63] text-zinc-50 text-sm font-medium flex items-center gap-2 transition-colors active:translate-y-px shadow-none">
                        <Phone className="h-4 w-4" strokeWidth={1.75} />
                        Te llamaremos
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md rounded-2xl">
                      <DialogHeader>
                        <DialogTitle className="font-display text-xl font-semibold tracking-tight text-zinc-900">Déjanos tus datos</DialogTitle>
                        <DialogDescription className="text-zinc-500">
                          Te contactaremos a la brevedad para ofrecerte nuestros servicios.
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleContactSubmit} className="space-y-4 mt-2">
                        <div>
                          <Label htmlFor="name" className="text-[11px] uppercase tracking-[0.14em] text-zinc-500 font-medium font-display">Nombre completo *</Label>
                          <Input
                            id="name"
                            required
                            value={contactForm.name}
                            onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                            placeholder="Tu nombre"
                            className="mt-1.5 h-11 rounded-lg border-zinc-200 focus-visible:ring-[#00b3f3]/30"
                          />
                        </div>
                        <div>
                          <Label htmlFor="email" className="text-[11px] uppercase tracking-[0.14em] text-zinc-500 font-medium font-display">Email *</Label>
                          <Input
                            id="email"
                            type="email"
                            required
                            value={contactForm.email}
                            onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                            placeholder="tu@email.com"
                            className="mt-1.5 h-11 rounded-lg border-zinc-200 focus-visible:ring-[#00b3f3]/30"
                          />
                        </div>
                        <div>
                          <Label htmlFor="phone" className="text-[11px] uppercase tracking-[0.14em] text-zinc-500 font-medium font-display">Teléfono</Label>
                          <Input
                            id="phone"
                            type="tel"
                            value={contactForm.phone}
                            onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                            placeholder="+56 9 1234 5678"
                            className="mt-1.5 h-11 rounded-lg border-zinc-200 focus-visible:ring-[#00b3f3]/30"
                          />
                        </div>
                        <div>
                          <Label htmlFor="message" className="text-[11px] uppercase tracking-[0.14em] text-zinc-500 font-medium font-display">Mensaje (opcional)</Label>
                          <Textarea
                            id="message"
                            value={contactForm.message}
                            onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                            placeholder="Cuéntanos sobre tu proyecto..."
                            className="mt-1.5 min-h-[100px] rounded-lg border-zinc-200 focus-visible:ring-[#00b3f3]/30"
                          />
                        </div>
                        <Button
                          type="submit"
                          disabled={submittingContact}
                          className="w-full h-11 rounded-lg bg-[#083b4e] hover:bg-[#0c4d63] text-zinc-50 font-medium transition-colors active:translate-y-px"
                        >
                          {submittingContact ? 'Enviando...' : 'Enviar solicitud'}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}

                {/* Separador entre CTA e info */}
                {hasActiveSubscription && (profile.email || profile.phone) && (
                  <div className="border-t border-zinc-200 my-6" />
                )}

                {/* Info de contacto — filas limpias */}
                {(profile.email || profile.phone) && (
                  <div className="divide-y divide-zinc-200 border-y border-zinc-200">
                    {profile.email && (
                      <a
                        href={`mailto:${profile.email}`}
                        className="group flex items-center gap-4 py-4 transition-colors"
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 text-[#00b3f3] shrink-0">
                          <Mail className="h-4 w-4" strokeWidth={1.75} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-400 font-medium font-display mb-0.5">Email</p>
                          <p className="font-medium text-zinc-900 text-sm truncate group-hover:text-[#00b3f3] transition-colors">{profile.email}</p>
                        </div>
                        <ExternalLink className="ml-auto h-4 w-4 text-zinc-300 group-hover:text-[#00b3f3] transition-colors shrink-0" strokeWidth={1.75} />
                      </a>
                    )}
                    {profile.phone && (
                      <a
                        href={`tel:${profile.phone}`}
                        className="group flex items-center gap-4 py-4 transition-colors"
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 text-[#00b3f3] shrink-0">
                          <Phone className="h-4 w-4" strokeWidth={1.75} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-400 font-medium font-display mb-0.5">Teléfono</p>
                          <p className="font-medium text-zinc-900 text-sm truncate group-hover:text-[#00b3f3] transition-colors">{profile.phone}</p>
                        </div>
                        <ExternalLink className="ml-auto h-4 w-4 text-zinc-300 group-hover:text-[#00b3f3] transition-colors shrink-0" strokeWidth={1.75} />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </motion.section>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicPilotProfile;

