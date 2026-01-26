import { Button } from "@/components/ui/button";
import SearchForm from "@/components/ui/search-form";
import PilotCard from "@/components/ui/pilot-card";
import Logo from "@/components/ui/logo";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Plane, Shield, Users, Star, LogIn, User, Menu, X, CheckCircle, Award, Zap, Search, FileCheck, QrCode, Globe, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { motion, AnimatePresence } from "framer-motion";

// Componente para el background del Hero (sin parallax para evitar errores de React)
const HeroParallaxBackground = () => {
  return (
    <div
      className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-40"
    />
  );
};

// Componente para el background del CTA (sin parallax para evitar errores de React)
const CTAParallaxBackground = () => {
  return (
    <div
      className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"
    />
  );
};

interface AdBanner {
  id: string;
  title: string;
  image_url: string;
  mobile_image_url: string | null;
  redirect_url: string | null;
  position: string;
  desktop_only: boolean;
}

const Index = () => {
  const navigate = useNavigate();

  // Estado de búsqueda y resultados
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [banners, setBanners] = useState<AdBanner[]>([]);
  const [sidebarBanners, setSidebarBanners] = useState<AdBanner[]>([]);
  const [mobileBanners, setMobileBanners] = useState<AdBanner[]>([]);
  const [featuredPilots, setFeaturedPilots] = useState<any[]>([]);
  const [featuredCompanies, setFeaturedCompanies] = useState<any[]>([]);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    loadActiveBanners();
    loadFeaturedPilots();
    loadFeaturedCompanies();
    checkAuth();

    // Escuchar cambios en el estado de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user ?? null);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    navigate('/');
  };

  const loadFeaturedPilots = async () => {
    try {
      // Fetch certified pilots
      const { data: pilotsData, error: pilotsError } = await supabase
        .from('pilots')
        .select('id, user_id, certification_status, certification_academy')
        .eq('certification_status', true)
        .eq('status', 'approved');

      if (pilotsError) throw pilotsError;

      // Get pilot ids
      const pilotUserIds = pilotsData?.map(p => p.user_id) || [];

      // Fetch profiles separately
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, location, region, specialties, drone_types, avatar_url, experience_years')
        .in('id', pilotUserIds);

      if (profilesError) throw profilesError;

      // Merge pilot data with profiles
      const pilotsWithProfiles = pilotsData?.map(pilot => ({
        ...pilot,
        profiles: profilesData?.find(p => p.id === pilot.user_id)
      })) || [];

      // Fetch subscriptions for these pilots (including featured_until)
      const { data: subscriptions, error: subsError } = await supabase
        .from('user_subscriptions')
        .select('user_id, status, plan_name, featured_until')
        .in('user_id', pilotUserIds)
        .eq('status', 'active');

      if (subsError) {
        console.error('Error fetching subscriptions:', subsError);
        // No lanzar error, simplemente continuar sin suscripciones
      }

      // Get user ids with active subscriptions
      const activeUserIds = new Set((subscriptions || [])?.map(s => s.user_id) || []);

      // YA NO filtramos solo por suscripción activa, los incluimos todos
      const pilotsWithSubscription = pilotsWithProfiles || [];

      // Separar pilotos destacados (featured_until > NOW) de los demás
      const now = new Date();
      const featuredPilots: typeof pilotsWithSubscription = [];
      const regularPilots: typeof pilotsWithSubscription = [];

      pilotsWithSubscription.forEach(pilot => {
        const subscription = subscriptions?.find(s => s.user_id === pilot.user_id);
        if (subscription?.featured_until) {
          const featuredUntil = new Date(subscription.featured_until);
          if (featuredUntil > now) {
            // Aún está en período destacado
            featuredPilots.push(pilot);
          } else {
            // Ya pasó el período destacado
            regularPilots.push(pilot);
          }
        } else {
          // No tiene featured_until (suscripción antigua o sin destacado)
          regularPilots.push(pilot);
        }
      });

      // Función para calcular completitud similar a SearchResults
      const getScore = (pilot: any) => {
        let score = 0;
        const prof = pilot.profiles;
        if (prof?.full_name) score += 10;
        if (prof?.avatar_url) score += 15;
        if (prof?.region || prof?.location) score += 10;
        if (prof?.experience_years) score += 10;
        if (prof?.specialties && prof?.specialties.length > 0) score += 15;
        if (prof?.drone_types && prof?.drone_types.length > 0) score += 10;
        if (pilot.certification_status) score += 15;
        return score;
      };

      // Función para obtener tier de suscripción
      const getTier = (userId: string) => {
        const sub = subscriptions?.find(s => s.user_id === userId);
        if (sub?.status === 'active') {
          if (sub.plan_name === 'premium' || sub.plan_name === 'empresa') return 2;
          if (sub.plan_name === 'pro' || sub.plan_name === 'basic' || sub.plan_name === 'profesional') return 1;
        }
        return 0;
      };

      // Ordenar pilotos regulares por tier y luego por score
      const sortedRegular = regularPilots.sort((a, b) => {
        const tierA = getTier(a.user_id);
        const tierB = getTier(b.user_id);
        if (tierA !== tierB) return tierB - tierA;
        return getScore(b) - getScore(a);
      });

      // Ordenar pilotos destacados por score
      const sortedFeatured = featuredPilots.sort((a, b) => getScore(b) - getScore(a));

      // Combinar: destacados primero, luego regulares ordenados
      const allQualifiedPilots = [
        ...sortedFeatured,
        ...sortedRegular
      ].slice(0, 12); // Aumentamos un poco el límite para tener de donde elegir

      // Obtener todos los IDs de pilotos seleccionados para buscar empresas y servicios
      const selectedPilotIds = allQualifiedPilots.map(p => p.id);

      // Fetch companies for these pilots
      const { data: companyPilots } = await supabase
        .from('company_pilots')
        .select(`
          pilot_id,
          companies:company_id (
            company_name
          )
        `)
        .in('pilot_id', selectedPilotIds);

      const companyMap = new Map();
      companyPilots?.forEach((cp: any) => {
        if (cp.companies) {
          companyMap.set(cp.pilot_id, cp.companies.company_name);
        }
      });

      // Fetch services to get specialties
      const { data: services } = await supabase
        .from('pilot_services')
        .select('pilot_id, service_type')
        .in('pilot_id', selectedPilotIds)
        .eq('is_published', true);

      const servicesMap = new Map();
      services?.forEach((s: any) => {
        if (!servicesMap.has(s.pilot_id)) {
          servicesMap.set(s.pilot_id, []);
        }
        servicesMap.get(s.pilot_id).push(s.service_type);
      });

      // Transform and randomize
      const transformedPilots = allQualifiedPilots.map((pilot: any) => ({
        id: pilot.id,
        name: pilot.profiles?.full_name || 'Piloto Profesional',
        location: pilot.profiles?.location || pilot.profiles?.region || 'Chile',
        certification_academy: pilot.certification_academy,
        experience_years: pilot.profiles?.experience_years || 0,
        certified: pilot.certification_status,
        specialties: pilot.profiles?.specialties || servicesMap.get(pilot.id) || [],
        drone_types: pilot.profiles?.drone_types || [],
        profileImage: pilot.profiles?.avatar_url,
        company_name: companyMap.get(pilot.id) || null,
      }));

      // Ya no aleatorizamos para respetar el orden de prioridad (Subscription Tier + Profile Completeness)
      setFeaturedPilots(transformedPilots);
    } catch (error) {
      console.error('Error loading featured pilots:', error);
      setFeaturedPilots([]);
    }
  };

  const loadFeaturedCompanies = async () => {
    try {
      // Obtener empresas con Plan Empresa activo y destacadas
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('id, user_id, company_name, logo_url, description, is_featured, featured_until, certification_status')
        .eq('is_featured', true)
        .or('featured_until.is.null,featured_until.gt.' + new Date().toISOString())
        .limit(6);

      if (companiesError) {
        console.error('Error loading companies:', companiesError);
        setFeaturedCompanies([]);
        return;
      }

      if (!companiesData || companiesData.length === 0) {
        setFeaturedCompanies([]);
        return;
      }

      // Fetch profiles separately
      const companyUserIds = companiesData.map(c => c.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, location, region, public_profile_slug')
        .in('id', companyUserIds);

      if (profilesError) {
        console.error('Error loading profiles:', profilesError);
      }

      // Merge company data with profiles
      const companiesWithProfiles = companiesData.map(company => ({
        ...company,
        profiles: profilesData?.find(p => p.id === company.user_id)
      }));

      // Verificar que tengan suscripción activa de Plan Empresa
      const { data: subscriptions } = await supabase
        .from('user_subscriptions')
        .select('user_id, status, plan_name')
        .in('user_id', companyUserIds)
        .eq('status', 'active')
        .in('plan_name', ['empresa', 'premium']);

      const activeCompanyUserIds = new Set(
        subscriptions?.map(s => s.user_id) || []
      );

      // Filtrar solo empresas con suscripción activa
      const activeCompanies = companiesWithProfiles.filter(c =>
        activeCompanyUserIds.has(c.user_id) && c.profiles
      );

      // Transformar para usar el mismo formato que PilotCard (simplificado)
      const transformedCompanies = activeCompanies.map((company: any) => ({
        id: company.id,
        user_id: company.user_id,
        full_name: company.company_name || company.profiles?.full_name,
        company_name: company.company_name,
        avatar_url: company.logo_url || company.profiles?.avatar_url,
        location: company.profiles?.location,
        region: company.profiles?.region,
        public_profile_slug: company.profiles?.public_profile_slug,
        certification_status: company.certification_status || false,
        is_company: true
      }));

      // Mezclar aleatoriamente
      const shuffled = transformedCompanies.sort(() => Math.random() - 0.5);
      setFeaturedCompanies(shuffled.slice(0, 6));
    } catch (error) {
      console.error('Error loading featured companies:', error);
      setFeaturedCompanies([]);
    }
  };

  const loadActiveBanners = async () => {
    try {
      const { data, error } = await supabase
        .from('ad_banners')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const allBanners = data || [];

      // Separar banners horizontales (Superior, Medio, Inferior)
      const horizontalBanners = allBanners.filter(
        banner => banner.position !== 'Lateral Derecho'
      );
      setBanners(horizontalBanners);

      // Separar banners laterales (solo desktop)
      const lateralBanners = allBanners.filter(
        banner => banner.position === 'Lateral Derecho'
      );
      setSidebarBanners(lateralBanners);

      // Separar banners móviles (laterales con versión móvil)
      const mobileBannersList = allBanners.filter(
        banner => banner.position === 'Lateral Derecho' && !banner.desktop_only && banner.mobile_image_url
      );
      setMobileBanners(mobileBannersList);
    } catch (error) {
      console.error('Error loading banners:', error);
    }
  };

  const formatBannerUrl = (url: string | null) => {
    if (!url) return '#';
    // Add https:// if URL doesn't have a protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `https://${url}`;
    }
    return url;
  };

  const handleSearch = async (filters: { zone: string; pilotType: string; workType: string }) => {
    setLoading(true);
    try {
      let query = supabase
        .from("pilots")
        .select(`
          id,
          user_id,
          certification_status,
          status,
          profiles:profiles (
            full_name,
            email,
            user_type,
            avatar_url
          ),
          pilot_services!inner (
            service_type,
            description,
            price_per_hour
          )
        `)
        .eq('status', 'active');

      // Filtro por tipo de piloto -> profiles.user_type
      if (filters.pilotType && filters.pilotType !== "todos") {
        const mapped: Record<string, string> = {
          certificado: "pilot",
          independiente: "pilot",
          empresa: "company",
        };
        const role = mapped[filters.pilotType];
        if (role) query = query.eq("profiles.user_type", role);
      }

      // Solo mostrar pilotos con servicios publicados
      query = query.eq("pilot_services.is_published", true);

      // Filtro por tipo de trabajo -> buscar en specialties, services y service_type
      if (filters.workType && filters.workType !== "todos") {
        // Usar el valor real directamente (ya viene del select dinámico)
        const searchPattern = filters.workType;
        // Buscar en pilot_services.service_type
        query = query.ilike("pilot_services.service_type", `%${searchPattern}%`);
      }

      // Filtro de zona pendiente (no hay campo de ubicación aún)

      const { data, error } = await query;
      if (error) throw error;

      // Process results and get unique pilots
      const pilotMap = new Map();

      (data || []).forEach((row: any) => {
        if (!pilotMap.has(row.id)) {
          const name = row?.profiles?.full_name || "Piloto";
          const services = Array.isArray(row.pilot_services) ? row.pilot_services : [row.pilot_services];
          const specialties = Array.from(
            new Set(services.map((s: any) => s.service_type))
          );

          pilotMap.set(row.id, {
            id: row.id,
            name,
            location: "Chile",
            rating: 4.8,
            flightHours: 0,
            certified: !!row.certification_status,
            specialties,
            profileImage: row?.profiles?.avatar_url || undefined,
          });
        }
      });

      setResults(Array.from(pilotMap.values()));
    } catch (e) {
      console.error(e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Combinar pilotos y empresas destacados, limitando a 6 en total
  // Las empresas en loadFeaturedCompanies ya vienen filtradas por Plan Empresa.
  // Los pilotos en loadFeaturedPilots vienen ordenados por Tier y Completitud.
  const combinedFeatured = [...featuredCompanies, ...featuredPilots]
    .sort((a: any, b: any) => {
      // Prioridad absoluta a Empresas (Plan Empresa) si el piloto no es Premium
      const aIsCompany = 'is_company' in a;
      const bIsCompany = 'is_company' in b;

      if (aIsCompany && !bIsCompany) return -1;
      if (!aIsCompany && bIsCompany) return 1;

      return 0; // Mantener orden interno si ambos son del mismo tipo
    })
    .slice(0, 6);

  const listToRender = results.length ? results : combinedFeatured;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-sm sticky top-0 z-50 w-full">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-3 sm:py-5">
          <div className="flex items-center justify-between gap-4 w-full">
            <Logo size="xl" className="hover:scale-105 transition-transform duration-200 flex-shrink-0" />

            {/* Desktop Menu - Visible solo en md y superior */}
            <div className="hidden md:flex items-center gap-2 sm:gap-3 flex-shrink-0 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className="sm:h-11 sm:px-6 hover:bg-accent/10 transition-all duration-200 whitespace-nowrap"
              >
                Home
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/planes')}
                className="sm:h-11 sm:px-6 hover:bg-accent/10 transition-all duration-200 whitespace-nowrap"
              >
                Precios
              </Button>
              {user ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="sm:h-11 sm:px-8 hover:bg-accent hover:text-accent-foreground transition-all duration-200 border-2 whitespace-nowrap"
                    onClick={() => {
                      // Redirigir según el tipo de usuario
                      navigate('/dashboard');
                    }}
                  >
                    <User className="h-4 w-4 mr-1 sm:mr-2 flex-shrink-0" />
                    <span className="hidden md:inline">Mi Cuenta</span>
                    <span className="md:hidden">Cuenta</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="sm:h-11 sm:px-8 hover:bg-accent/10 transition-all duration-200 whitespace-nowrap"
                    onClick={handleLogout}
                  >
                    <span className="hidden sm:inline">Cerrar Sesión</span>
                    <span className="sm:hidden">Salir</span>
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="sm"
                    className="sm:h-11 sm:px-8 bg-accent hover:bg-accent/90 text-accent-foreground transition-all duration-200 shadow-lg hover:shadow-xl whitespace-nowrap"
                    onClick={() => navigate('/auth?tab=signup')}
                  >
                    <LogIn className="h-4 w-4 mr-1 sm:mr-2 flex-shrink-0" />
                    <span className="hidden sm:inline">Ingresar/Registrarse</span>
                    <span className="sm:hidden">Entrar</span>
                  </Button>
                </>
              )}
            </div>

            {/* Mobile Menu - Hamburger Button */}
            <div className="md:hidden">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-10 w-10 p-0"
                    aria-label="Abrir menú"
                  >
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[280px] sm:w-[320px]">
                  <SheetHeader>
                    <SheetTitle>Menú</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 space-y-3">
                    <Button
                      variant="ghost"
                      size="lg"
                      className="w-full justify-start hover:bg-accent/10 transition-all duration-200"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        navigate('/');
                      }}
                    >
                      <Home className="h-5 w-5 mr-3" />
                      Home
                    </Button>
                    <Button
                      variant="ghost"
                      size="lg"
                      className="w-full justify-start hover:bg-accent/10 transition-all duration-200"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        navigate('/planes');
                      }}
                    >
                      Precios
                    </Button>
                    {user ? (
                      <>
                        <Button
                          variant="outline"
                          size="lg"
                          className="w-full justify-start hover:bg-accent hover:text-accent-foreground transition-all duration-200 border-2"
                          onClick={() => {
                            setMobileMenuOpen(false);
                            navigate('/dashboard');
                          }}
                        >
                          <User className="h-5 w-5 mr-3" />
                          Mi Cuenta
                        </Button>
                        <Button
                          variant="ghost"
                          size="lg"
                          className="w-full justify-start hover:bg-accent/10 transition-all duration-200"
                          onClick={() => {
                            setMobileMenuOpen(false);
                            handleLogout();
                          }}
                        >
                          Cerrar Sesión
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="lg"
                          className="w-full justify-start bg-accent hover:bg-accent/90 text-accent-foreground transition-all duration-200 shadow-lg hover:shadow-xl"
                          onClick={() => {
                            setMobileMenuOpen(false);
                            navigate('/auth?tab=signup');
                          }}
                        >
                          <LogIn className="h-5 w-5 mr-3" />
                          Ingresar/Registrarse
                        </Button>
                      </>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 lg:py-28 bg-gradient-to-br from-primary via-primary to-primary/90 relative overflow-hidden">
        <HeroParallaxBackground />
        <motion.div
          className="container mx-auto px-6 lg:px-8 text-center relative z-10"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="max-w-5xl mx-auto">
            <motion.h1
              className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            >
              Conecta con Pilotos de Drones
              <span className="text-accent block mt-2">Certificados</span>
            </motion.h1>
            <motion.p
              className="text-xl md:text-2xl text-white/90 mb-12 max-w-3xl mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
            >
              La plataforma líder para encontrar pilotos profesionales y empresas especializadas en servicios con drones
            </motion.p>

            {/* Search Form */}
            <motion.div
              className="max-w-4xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
            >
              <SearchForm onSearch={handleSearch} />
            </motion.div>
            <AnimatePresence>
              {loading && (
                <motion.p
                  className="mt-6 text-sm text-white/80 animate-pulse"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  Buscando pilotos profesionales...
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </section>

      {/* Mobile Banners - Solo se muestran en móvil */}
      {mobileBanners.length > 0 && (
        <section className="py-6 bg-secondary/30 block lg:hidden">
          <div className="container mx-auto px-6 lg:px-8">
            <div className="max-w-7xl mx-auto space-y-4">
              {mobileBanners.map((banner) => (
                <a
                  key={banner.id}
                  href={formatBannerUrl(banner.redirect_url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02]"
                >
                  <img
                    src={banner.mobile_image_url || banner.image_url}
                    alt={banner.title}
                    className="w-full h-auto object-cover"
                    style={{ maxHeight: '220px' }}
                  />
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Main Content with Sidebar Layout */}
      <div className="container mx-auto px-6 lg:px-8">
        {sidebarBanners.length > 0 ? (
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
            {/* Main Content */}
            <div className="min-w-0">
              {/* Advertisement Banners */}
              {banners.length > 0 && (
                <section className="py-8 bg-secondary/30">
                  <div className="space-y-6">
                    {banners.map((banner) => (
                      <a
                        key={banner.id}
                        href={formatBannerUrl(banner.redirect_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02]"
                      >
                        <img
                          src={banner.image_url}
                          alt={banner.title}
                          className="w-full h-auto object-cover"
                          style={{ maxHeight: '300px' }}
                        />
                      </a>
                    ))}
                  </div>
                </section>
              )}

              {/* CTA Section: solo si no hay resultados */}
              <AnimatePresence>
                {results.length === 0 && (
                  <motion.section
                    className="py-16 lg:py-20 bg-gradient-to-r from-accent via-accent to-accent/90 relative overflow-hidden"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8 }}
                  >
                    <CTAParallaxBackground />
                    <div className="text-center relative z-10">
                      <div className="max-w-3xl mx-auto">
                        <h3 className="text-3xl md:text-4xl font-bold text-white mb-6">
                          ¿Eres piloto o empresa?
                        </h3>
                        <p className="text-xl text-white/90 mb-8 leading-relaxed">
                          Únete a nuestra plataforma y conecta con clientes que necesitan tus servicios profesionales
                        </p>

                        {/* Drone Image 2 */}
                        <div className="mt-10 mb-8 flex justify-center">
                          <img
                            src="/drone-hero-2.png"
                            alt="Drone FPV profesional"
                            className="rounded-2xl shadow-2xl max-w-md w-full h-auto"
                          />
                        </div>

                        <Button
                          variant="secondary"
                          size="lg"
                          className="bg-white text-accent hover:bg-white/90 shadow-xl hover:shadow-2xl transition-all duration-200 text-lg px-8 py-6 h-auto"
                          onClick={() => navigate('/auth?tab=signup')}
                        >
                          Publicar Perfil Profesional
                        </Button>
                      </div>
                    </div>
                  </motion.section>
                )}
              </AnimatePresence>

              {/* Features */}
              <motion.section
                className="py-20 lg:py-28 bg-white"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8 }}
              >
                <div className="max-w-6xl mx-auto">
                  <motion.h3
                    className="text-4xl md:text-5xl font-bold text-center text-primary mb-16"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                  >
                    ¿Por qué elegir Piloto de Drones?
                  </motion.h3>


                  {/* Potencia tu Presencia Section */}
                  <section className="py-12 md:py-20">
                    <div className="text-center mb-16">
                      <h3 className="text-4xl md:text-5xl font-bold text-primary mb-6">
                        Potencia tu Presencia en la Industria
                      </h3>
                      <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                        No solo somos un buscador, somos la plataforma donde centralizas tu carrera profesional. Publica tus servicios, gestiona tus certificaciones y llega a más clientes.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                      {/* Agro */}
                      <div className="group rounded-2xl overflow-hidden bg-white shadow-lg hover:shadow-2xl transition-all duration-300 border border-border/50">
                        <div className="aspect-video relative overflow-hidden">
                          <img
                            src="/AGRO 2_resultado.webp"
                            alt="Agricultura de Precisión"
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        </div>
                        <div className="p-6">
                          <h4 className="text-xl font-bold mb-2 text-primary">Tus trabajos en Agro</h4>
                          <p className="text-sm text-muted-foreground">Demuestra tu experiencia en fumigación, mapeo y análisis de cultivos con perfiles técnicos detallados.</p>
                        </div>
                      </div>

                      {/* Audiovisual */}
                      <div className="group rounded-2xl overflow-hidden bg-white shadow-lg hover:shadow-2xl transition-all duration-300 border border-border/50">
                        <div className="aspect-video relative overflow-hidden">
                          <img
                            src="/AUDIOVISUAL_resultado.webp"
                            alt="Producción Audiovisual"
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        </div>
                        <div className="p-6">
                          <h4 className="text-xl font-bold mb-2 text-primary">Tu portafolio Audiovisual</h4>
                          <p className="text-sm text-muted-foreground">Crea una vitrina profesional para tus tomas aéreas cinematográficas y producciones de alta calidad.</p>
                        </div>
                      </div>

                      {/* Inspección */}
                      <div className="group rounded-2xl overflow-hidden bg-white shadow-lg hover:shadow-2xl transition-all duration-300 border border-border/50">
                        <div className="aspect-video relative overflow-hidden">
                          <img
                            src="/inspeccion_infraestructura.png"
                            alt="Inspección de Infraestructura"
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        </div>
                        <div className="p-6">
                          <h4 className="text-xl font-bold mb-2 text-primary">Especialidad en Inspección</h4>
                          <p className="text-sm text-muted-foreground">Destaca tu capacidad técnica en revisión de puentes, torres y estructuras críticas con drones industriales.</p>
                        </div>
                      </div>

                      {/* Térmica */}
                      <div className="group rounded-2xl overflow-hidden bg-white shadow-lg hover:shadow-2xl transition-all duration-300 border border-border/50">
                        <div className="aspect-video relative overflow-hidden">
                          <img
                            src="/inspeccion_termica.png"
                            alt="Detección Térmica"
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        </div>
                        <div className="p-6">
                          <h4 className="text-xl font-bold mb-2 text-primary">Detección Térmica</h4>
                          <p className="text-sm text-muted-foreground">Posiciónate como experto en termografía aérea para incendios, paneles solares y eficiencia energética.</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-16 bg-primary/5 rounded-3xl p-8 md:p-12 border border-primary/10 flex flex-col md:flex-row items-center justify-between gap-8">
                      <div className="max-w-2xl">
                        <h4 className="text-2xl md:text-3xl font-bold text-primary mb-4">La centralización es tu mayor ventaja</h4>
                        <p className="text-lg text-muted-foreground">
                          Tener tus certificaciones, especialidades en un solo lugar genera la confianza que las empresas buscan. Deja de enviar archivos sueltos y comparte tu perfil verificado profesional.
                        </p>
                      </div>
                      <Button
                        size="lg"
                        className="bg-accent hover:bg-accent/90 text-accent-foreground text-lg px-8 py-6 h-auto shadow-xl"
                        onClick={() => navigate('/auth?tab=signup')}
                      >
                        Comenzar a Publicar Gratis
                      </Button>
                    </div>
                  </section>

                  <div className="grid md:grid-cols-3 gap-12">
                    <motion.div
                      className="text-center group"
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.2 }}
                      transition={{ duration: 0.4, delay: 0.1, type: "tween", ease: "easeOut" }}
                    >
                      <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-accent/10 group-hover:bg-accent transition-all duration-300 mb-6">
                        <Shield className="h-10 w-10 text-accent group-hover:text-white transition-colors duration-300" />
                      </div>
                      <h4 className="text-2xl font-bold mb-4 text-primary">Pilotos Certificados</h4>
                      <p className="text-lg text-muted-foreground leading-relaxed">
                        Todos nuestros pilotos están validados y cuentan con las certificaciones requeridas
                      </p>
                    </motion.div>
                    <motion.div
                      className="text-center group"
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.2 }}
                      transition={{ duration: 0.4, delay: 0.2, type: "tween", ease: "easeOut" }}
                    >
                      <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-accent/10 group-hover:bg-accent transition-all duration-300 mb-6">
                        <Users className="h-10 w-10 text-accent group-hover:text-white transition-colors duration-300" />
                      </div>
                      <h4 className="text-2xl font-bold mb-4 text-primary">Red Profesional</h4>
                      <p className="text-lg text-muted-foreground leading-relaxed">
                        Conecta con una amplia red de pilotos y empresas especializadas
                      </p>
                    </motion.div>
                    <motion.div
                      className="text-center group"
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.2 }}
                      transition={{ duration: 0.4, delay: 0.3, type: "tween", ease: "easeOut" }}
                    >
                      <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-accent/10 group-hover:bg-accent transition-all duration-300 mb-6">
                        <Star className="h-10 w-10 text-accent group-hover:text-white transition-colors duration-300" />
                      </div>
                      <h4 className="text-2xl font-bold mb-4 text-primary">Calidad Garantizada</h4>
                      <p className="text-lg text-muted-foreground leading-relaxed">
                        Sistema de reseñas y evaluaciones para garantizar la mejor experiencia
                      </p>
                    </motion.div>
                  </div>
                </div>
              </motion.section>

              {/* Características y Beneficios */}
              <section className="py-20 lg:py-28 bg-gradient-to-br from-accent/5 via-white to-secondary/10">
                <div className="max-w-7xl mx-auto px-6 lg:px-8">
                  <motion.div
                    className="text-center mb-16"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.5, type: "tween", ease: "easeOut" }}
                  >
                    <h3 className="text-4xl md:text-5xl font-bold text-primary mb-4">
                      Características y Beneficios
                    </h3>
                    <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                      Descubre todo lo que nuestra plataforma ofrece para pilotos y clientes
                    </p>
                  </motion.div>

                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {/* Característica 1 */}
                    <motion.div
                      className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-border/50 hover:border-accent/50 group hover:-translate-y-2"
                      initial={{ opacity: 0, y: 50 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.3 }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                    >
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-accent/10 group-hover:bg-accent transition-all duration-300 mb-6">
                        <FileCheck className="h-8 w-8 text-accent group-hover:text-white transition-colors duration-300" />
                      </div>
                      <h4 className="text-xl font-bold mb-3 text-primary">Certificaciones Verificadas</h4>
                      <p className="text-muted-foreground leading-relaxed">
                        Sistema de validación de certificaciones por administradores para garantizar la autenticidad de cada piloto
                      </p>
                    </motion.div>

                    {/* Característica 2 */}
                    <motion.div
                      className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-border/50 hover:border-accent/50 group hover:-translate-y-2"
                      initial={{ opacity: 0, y: 50 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.3 }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                    >
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-accent/10 group-hover:bg-accent transition-all duration-300 mb-6">
                        <Search className="h-8 w-8 text-accent group-hover:text-white transition-colors duration-300" />
                      </div>
                      <h4 className="text-xl font-bold mb-3 text-primary">Búsqueda Avanzada</h4>
                      <p className="text-muted-foreground leading-relaxed">
                        Filtra pilotos por región, especialidad, tipo de drone y experiencia para encontrar el profesional perfecto
                      </p>
                    </motion.div>

                    {/* Característica 3 */}
                    <motion.div
                      className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-border/50 hover:border-accent/50 group hover:-translate-y-2"
                      initial={{ opacity: 0, y: 50 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.3 }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                    >
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-accent/10 group-hover:bg-accent transition-all duration-300 mb-6">
                        <QrCode className="h-8 w-8 text-accent group-hover:text-white transition-colors duration-300" />
                      </div>
                      <h4 className="text-xl font-bold mb-3 text-primary">Código QR Personalizado</h4>
                      <p className="text-muted-foreground leading-relaxed">
                        Cada piloto tiene un código QR único para compartir su perfil profesional de forma rápida y profesional
                      </p>
                    </motion.div>

                    {/* Característica 4 */}
                    <motion.div
                      className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-border/50 hover:border-accent/50 group hover:-translate-y-2"
                      initial={{ opacity: 0, y: 50 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.3 }}
                      transition={{ duration: 0.5, delay: 0.4 }}
                    >
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-accent/10 group-hover:bg-accent transition-all duration-300 mb-6">
                        <Globe className="h-8 w-8 text-accent group-hover:text-white transition-colors duration-300" />
                      </div>
                      <h4 className="text-xl font-bold mb-3 text-primary">URL Personalizada</h4>
                      <p className="text-muted-foreground leading-relaxed">
                        Crea tu propia URL personalizada para tu perfil público y facilita que los clientes te encuentren
                      </p>
                    </motion.div>

                    {/* Característica 5 */}
                    <motion.div
                      className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-border/50 hover:border-accent/50 group hover:-translate-y-2"
                      initial={{ opacity: 0, y: 50 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.3 }}
                      transition={{ duration: 0.5, delay: 0.5 }}
                    >
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-accent/10 group-hover:bg-accent transition-all duration-300 mb-6">
                        <Award className="h-8 w-8 text-accent group-hover:text-white transition-colors duration-300" />
                      </div>
                      <h4 className="text-xl font-bold mb-3 text-primary">Perfiles Destacados</h4>
                      <p className="text-muted-foreground leading-relaxed">
                        Los pilotos certificados y con suscripción activa aparecen destacados en los resultados de búsqueda
                      </p>
                    </motion.div>

                    {/* Característica 6 */}
                    <motion.div
                      className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-border/50 hover:border-accent/50 group hover:-translate-y-2"
                      initial={{ opacity: 0, y: 50 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.3 }}
                      transition={{ duration: 0.5, delay: 0.6 }}
                    >
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-accent/10 group-hover:bg-accent transition-all duration-300 mb-6">
                        <Zap className="h-8 w-8 text-accent group-hover:text-white transition-colors duration-300" />
                      </div>
                      <h4 className="text-xl font-bold mb-3 text-primary">Acceso Rápido</h4>
                      <p className="text-muted-foreground leading-relaxed">
                        Panel de control intuitivo para gestionar tu perfil, certificaciones y servicios de forma eficiente
                      </p>
                    </motion.div>
                  </div>
                </div>
              </section>

              {/* Empresas Recomendadas */}
              {!results.length && featuredCompanies.length > 0 && (
                <motion.section
                  className="py-20 lg:py-28 bg-gradient-to-b from-secondary to-background"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.8 }}
                >
                  <div className="max-w-7xl mx-auto">
                    <motion.h3
                      className="text-4xl md:text-5xl font-bold text-center text-primary mb-4"
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6 }}
                    >
                      Empresas Recomendadas
                    </motion.h3>
                    <motion.p
                      className="text-center text-muted-foreground mb-12 text-lg"
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: 0.2 }}
                    >
                      Empresas certificadas con Plan Empresa activo
                    </motion.p>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {featuredCompanies.map((company, index) => (
                        <motion.div
                          key={company.id}
                          initial={{ opacity: 0, y: 50 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.6, delay: index * 0.1 }}
                        >
                          <PilotCard pilot={company} />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.section>
              )}

              {/* Resultados / Destacados */}
              <motion.section
                className="py-20 lg:py-28 bg-secondary"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8 }}
              >
                <div className="max-w-7xl mx-auto">
                  <motion.h3
                    className="text-4xl md:text-5xl font-bold text-center text-primary mb-16"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                  >
                    {results.length ? "Resultados de Búsqueda" : "Pilotos Destacados"}
                  </motion.h3>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {listToRender.map((pilot, index) => (
                      <motion.div
                        key={pilot.id}
                        initial={{ opacity: 0, y: 50 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: index * 0.1 }}
                      >
                        <PilotCard pilot={pilot} />
                      </motion.div>
                    ))}
                  </div>
                  {!results.length && (
                    <motion.div
                      className="text-center mt-12"
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: 0.3, type: "tween", ease: "easeOut" }}
                    >
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => navigate('/search')}
                        className="border-2 hover:bg-accent hover:text-white hover:border-accent transition-all duration-200 text-lg px-8 py-6 h-auto"
                      >
                        Ver Todos los Pilotos
                      </Button>
                    </motion.div>
                  )}
                </div>
              </motion.section>
            </div>

            {/* Sidebar - Solo Desktop */}
            <aside className="hidden lg:block">
              <div className="sticky top-24 space-y-6">
                {sidebarBanners.map((banner) => (
                  <a
                    key={banner.id}
                    href={formatBannerUrl(banner.redirect_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02]"
                  >
                    <img
                      src={banner.image_url}
                      alt={banner.title}
                      className="w-full h-auto object-cover"
                      style={{ maxHeight: '70vh', minHeight: '480px' }}
                    />
                  </a>
                ))}
              </div>
            </aside>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto">
            {/* Main Content sin sidebar */}
            <div className="min-w-0">
              {/* Advertisement Banners */}
              {banners.length > 0 && (
                <section className="py-8 bg-secondary/30">
                  <div className="space-y-6">
                    {banners.map((banner) => (
                      <a
                        key={banner.id}
                        href={formatBannerUrl(banner.redirect_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02]"
                      >
                        <img
                          src={banner.image_url}
                          alt={banner.title}
                          className="w-full h-auto object-cover"
                          style={{ maxHeight: '300px' }}
                        />
                      </a>
                    ))}
                  </div>
                </section>
              )}

              {/* CTA Section: solo si no hay resultados */}
              {results.length === 0 && (
                <motion.section
                  className="py-16 lg:py-20 bg-gradient-to-r from-accent via-accent to-accent/90 relative overflow-hidden"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.8 }}
                >
                  <CTAParallaxBackground />
                  <motion.div
                    className="text-center relative z-10"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                  >
                    <div className="max-w-3xl mx-auto">
                      <h3 className="text-3xl md:text-4xl font-bold text-white mb-6">
                        ¿Eres piloto o empresa?
                      </h3>
                      <p className="text-xl text-white/90 mb-8 leading-relaxed">
                        Únete a nuestra plataforma y conecta con clientes que necesitan tus servicios profesionales
                      </p>
                      <Button
                        variant="secondary"
                        size="lg"
                        className="bg-white text-accent hover:bg-white/90 shadow-xl hover:shadow-2xl transition-all duration-200 text-lg px-8 py-6 h-auto"
                        onClick={() => navigate('/auth?tab=signup')}
                      >
                        Publicar Perfil Profesional
                      </Button>
                    </div>
                  </motion.div>
                </motion.section>
              )}

              {/* Features */}
              <motion.section
                className="py-20 lg:py-28 bg-white"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8 }}
              >
                <div className="max-w-6xl mx-auto">
                  {/* Potencia tu Presencia Section */}
                  <section className="py-12 md:py-20">
                    <div className="text-center mb-16">
                      <h3 className="text-4xl md:text-5xl font-bold text-primary mb-6">
                        Potencia tu Presencia en la Industria
                      </h3>
                      <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                        No solo somos un buscador, somos la plataforma donde centralizas tu carrera profesional. Publica tus servicios, gestiona tus certificaciones y llega a más clientes.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                      {/* Agro */}
                      <div className="group rounded-2xl overflow-hidden bg-white shadow-lg hover:shadow-2xl transition-all duration-300 border border-border/50">
                        <div className="aspect-video relative overflow-hidden">
                          <img
                            src="/AGRO 2_resultado.webp"
                            alt="Agricultura de Precisión"
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        </div>
                        <div className="p-6">
                          <h4 className="text-xl font-bold mb-2 text-primary">Tus trabajos en Agro</h4>
                          <p className="text-sm text-muted-foreground">Demuestra tu experiencia en fumigación, mapeo y análisis de cultivos con perfiles técnicos detallados.</p>
                        </div>
                      </div>

                      {/* Audiovisual */}
                      <div className="group rounded-2xl overflow-hidden bg-white shadow-lg hover:shadow-2xl transition-all duration-300 border border-border/50">
                        <div className="aspect-video relative overflow-hidden">
                          <img
                            src="/AUDIOVISUAL_resultado.webp"
                            alt="Producción Audiovisual"
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        </div>
                        <div className="p-6">
                          <h4 className="text-xl font-bold mb-2 text-primary">Tu portafolio Audiovisual</h4>
                          <p className="text-sm text-muted-foreground">Crea una vitrina profesional para tus tomas aéreas cinematográficas y producciones de alta calidad.</p>
                        </div>
                      </div>

                      {/* Inspección */}
                      <div className="group rounded-2xl overflow-hidden bg-white shadow-lg hover:shadow-2xl transition-all duration-300 border border-border/50">
                        <div className="aspect-video relative overflow-hidden">
                          <img
                            src="/inspeccion_infraestructura.png"
                            alt="Inspección de Infraestructura"
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        </div>
                        <div className="p-6">
                          <h4 className="text-xl font-bold mb-2 text-primary">Especialidad en Inspección</h4>
                          <p className="text-sm text-muted-foreground">Destaca tu capacidad técnica en revisión de puentes, torres y estructuras críticas con drones industriales.</p>
                        </div>
                      </div>

                      {/* Térmica */}
                      <div className="group rounded-2xl overflow-hidden bg-white shadow-lg hover:shadow-2xl transition-all duration-300 border border-border/50">
                        <div className="aspect-video relative overflow-hidden">
                          <img
                            src="/inspeccion_termica.png"
                            alt="Detección Térmica"
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        </div>
                        <div className="p-6">
                          <h4 className="text-xl font-bold mb-2 text-primary">Detección Térmica</h4>
                          <p className="text-sm text-muted-foreground">Posiciónate como experto en termografía aérea para incendios, paneles solares y eficiencia energética.</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-16 bg-primary/5 rounded-3xl p-8 md:p-12 border border-primary/10 flex flex-col md:flex-row items-center justify-between gap-8">
                      <div className="max-w-2xl">
                        <h4 className="text-2xl md:text-3xl font-bold text-primary mb-4">La centralización es tu mayor ventaja</h4>
                        <p className="text-lg text-muted-foreground">
                          Tener tus certificaciones, especialidades en un solo lugar genera la confianza que las empresas buscan. Deja de enviar archivos sueltos y comparte tu perfil verificado profesional.
                        </p>
                      </div>
                      <Button
                        size="lg"
                        className="bg-accent hover:bg-accent/90 text-accent-foreground text-lg px-8 py-6 h-auto shadow-xl"
                        onClick={() => navigate('/auth?tab=signup')}
                      >
                        Comenzar a Publicar Gratis
                      </Button>
                    </div>
                  </section>

                  <motion.h3
                    className="text-4xl md:text-5xl font-bold text-center text-primary mb-16"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                  >
                    ¿Por qué elegir Piloto de Drones?
                  </motion.h3>
                  <div className="grid md:grid-cols-3 gap-12">
                    <motion.div
                      className="text-center group"
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.2 }}
                      transition={{ duration: 0.4, delay: 0.1, type: "tween", ease: "easeOut" }}
                    >
                      <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-accent/10 group-hover:bg-accent transition-all duration-300 mb-6">
                        <Shield className="h-10 w-10 text-accent group-hover:text-white transition-colors duration-300" />
                      </div>
                      <h4 className="text-2xl font-bold mb-4 text-primary">Pilotos Certificados</h4>
                      <p className="text-lg text-muted-foreground leading-relaxed">
                        Todos nuestros pilotos están validados y cuentan con las certificaciones requeridas
                      </p>
                    </motion.div>
                    <motion.div
                      className="text-center group"
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.2 }}
                      transition={{ duration: 0.4, delay: 0.2, type: "tween", ease: "easeOut" }}
                    >
                      <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-accent/10 group-hover:bg-accent transition-all duration-300 mb-6">
                        <Users className="h-10 w-10 text-accent group-hover:text-white transition-colors duration-300" />
                      </div>
                      <h4 className="text-2xl font-bold mb-4 text-primary">Red Profesional</h4>
                      <p className="text-lg text-muted-foreground leading-relaxed">
                        Conecta con una amplia red de pilotos y empresas especializadas
                      </p>
                    </motion.div>
                    <motion.div
                      className="text-center group"
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.2 }}
                      transition={{ duration: 0.4, delay: 0.3, type: "tween", ease: "easeOut" }}
                    >
                      <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-accent/10 group-hover:bg-accent transition-all duration-300 mb-6">
                        <Star className="h-10 w-10 text-accent group-hover:text-white transition-colors duration-300" />
                      </div>
                      <h4 className="text-2xl font-bold mb-4 text-primary">Calidad Garantizada</h4>
                      <p className="text-lg text-muted-foreground leading-relaxed">
                        Sistema de reseñas y evaluaciones para garantizar la mejor experiencia
                      </p>
                    </motion.div>
                  </div>
                </div>
              </motion.section>

              {/* Características y Beneficios */}
              <section className="py-20 lg:py-28 bg-gradient-to-br from-accent/5 via-white to-secondary/10">
                <div className="max-w-7xl mx-auto px-6 lg:px-8">
                  <motion.div
                    className="text-center mb-16"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.5, type: "tween", ease: "easeOut" }}
                  >
                    <h3 className="text-4xl md:text-5xl font-bold text-primary mb-4">
                      Características y Beneficios
                    </h3>
                    <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                      Descubre todo lo que nuestra plataforma ofrece para pilotos y clientes
                    </p>
                  </motion.div>

                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {/* Característica 1 */}
                    <motion.div
                      className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-border/50 hover:border-accent/50 group"
                      initial={{ opacity: 0, y: 50 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.3 }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                      whileHover={{ y: -10, rotateX: 5, scale: 1.02 }}
                    >
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-accent/10 group-hover:bg-accent transition-all duration-300 mb-6">
                        <FileCheck className="h-8 w-8 text-accent group-hover:text-white transition-colors duration-300" />
                      </div>
                      <h4 className="text-xl font-bold mb-3 text-primary">Certificaciones Verificadas</h4>
                      <p className="text-muted-foreground leading-relaxed">
                        Sistema de validación de certificaciones por administradores para garantizar la autenticidad de cada piloto
                      </p>
                    </motion.div>

                    {/* Característica 2 */}
                    <motion.div
                      className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-border/50 hover:border-accent/50 group"
                      initial={{ opacity: 0, y: 50 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.3 }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                      whileHover={{ y: -10, rotateX: 5, scale: 1.02 }}
                    >
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-accent/10 group-hover:bg-accent transition-all duration-300 mb-6">
                        <Search className="h-8 w-8 text-accent group-hover:text-white transition-colors duration-300" />
                      </div>
                      <h4 className="text-xl font-bold mb-3 text-primary">Búsqueda Avanzada</h4>
                      <p className="text-muted-foreground leading-relaxed">
                        Filtra pilotos por región, especialidad, tipo de drone y experiencia para encontrar el profesional perfecto
                      </p>
                    </motion.div>

                    {/* Característica 3 */}
                    <motion.div
                      className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-border/50 hover:border-accent/50 group"
                      initial={{ opacity: 0, y: 50 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.3 }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                      whileHover={{ y: -10, rotateX: 5, scale: 1.02 }}
                    >
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-accent/10 group-hover:bg-accent transition-all duration-300 mb-6">
                        <QrCode className="h-8 w-8 text-accent group-hover:text-white transition-colors duration-300" />
                      </div>
                      <h4 className="text-xl font-bold mb-3 text-primary">Código QR Personalizado</h4>
                      <p className="text-muted-foreground leading-relaxed">
                        Cada piloto tiene un código QR único para compartir su perfil profesional de forma rápida y profesional
                      </p>
                    </motion.div>

                    {/* Característica 4 */}
                    <motion.div
                      className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-border/50 hover:border-accent/50 group"
                      initial={{ opacity: 0, y: 50 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.3 }}
                      transition={{ duration: 0.5, delay: 0.4 }}
                      whileHover={{ y: -10, rotateX: 5, scale: 1.02 }}
                    >
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-accent/10 group-hover:bg-accent transition-all duration-300 mb-6">
                        <Globe className="h-8 w-8 text-accent group-hover:text-white transition-colors duration-300" />
                      </div>
                      <h4 className="text-xl font-bold mb-3 text-primary">URL Personalizada</h4>
                      <p className="text-muted-foreground leading-relaxed">
                        Crea tu propia URL personalizada para tu perfil público y facilita que los clientes te encuentren
                      </p>
                    </motion.div>

                    {/* Característica 5 */}
                    <motion.div
                      className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-border/50 hover:border-accent/50 group"
                      initial={{ opacity: 0, y: 50 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.3 }}
                      transition={{ duration: 0.5, delay: 0.5 }}
                      whileHover={{ y: -10, rotateX: 5, scale: 1.02 }}
                    >
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-accent/10 group-hover:bg-accent transition-all duration-300 mb-6">
                        <Award className="h-8 w-8 text-accent group-hover:text-white transition-colors duration-300" />
                      </div>
                      <h4 className="text-xl font-bold mb-3 text-primary">Perfiles Destacados</h4>
                      <p className="text-muted-foreground leading-relaxed">
                        Los pilotos certificados y con suscripción activa aparecen destacados en los resultados de búsqueda
                      </p>
                    </motion.div>

                    {/* Característica 6 */}
                    <motion.div
                      className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-border/50 hover:border-accent/50 group"
                      initial={{ opacity: 0, y: 50 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.3 }}
                      transition={{ duration: 0.5, delay: 0.6 }}
                      whileHover={{ y: -10, rotateX: 5, scale: 1.02 }}
                    >
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-accent/10 group-hover:bg-accent transition-all duration-300 mb-6">
                        <Zap className="h-8 w-8 text-accent group-hover:text-white transition-colors duration-300" />
                      </div>
                      <h4 className="text-xl font-bold mb-3 text-primary">Acceso Rápido</h4>
                      <p className="text-muted-foreground leading-relaxed">
                        Panel de control intuitivo para gestionar tu perfil, certificaciones y servicios de forma eficiente
                      </p>
                    </motion.div>
                  </div>
                </div>
              </section>

              {/* Resultados / Destacados */}
              <motion.section
                className="py-20 lg:py-28 bg-secondary"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8 }}
              >
                <div className="max-w-7xl mx-auto">
                  <motion.h3
                    className="text-4xl md:text-5xl font-bold text-center text-primary mb-16"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                  >
                    {results.length ? "Resultados de Búsqueda" : "Pilotos Destacados"}
                  </motion.h3>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {listToRender.map((pilot, index) => (
                      <motion.div
                        key={pilot.id}
                        initial={{ opacity: 0, y: 50 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: index * 0.1 }}
                      >
                        <PilotCard pilot={pilot} />
                      </motion.div>
                    ))}
                  </div>
                  {!results.length && (
                    <motion.div
                      className="text-center mt-12"
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: 0.3, type: "tween", ease: "easeOut" }}
                    >
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => navigate('/search')}
                        className="border-2 hover:bg-accent hover:text-white hover:border-accent transition-all duration-200 text-lg px-8 py-6 h-auto"
                      >
                        Ver Todos los Pilotos
                      </Button>
                    </motion.div>
                  )}
                </div>
              </motion.section>
            </div>
          </div>
        )}
      </div>

      {/* CTA de Planes */}
      <motion.section
        className="py-20 bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <div className="container mx-auto px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <motion.h3
              className="text-3xl md:text-4xl font-bold text-primary mb-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              Encuentra el Plan Perfecto para Ti
            </motion.h3>
            <motion.p
              className="text-xl text-muted-foreground mb-8"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Desde Plan Gratis hasta Plan Empresa - Elige el que mejor se adapte a tus necesidades
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Button
                size="lg"
                onClick={() => navigate('/planes')}
                className="bg-accent hover:bg-accent/90 text-white text-lg px-10 py-6 h-auto shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-105"
              >
                Ver Planes y Precios
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="py-12 border-t border-border/50 bg-background">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              {/* Logo y nombre */}
              <div className="flex items-center gap-2">
                <Logo size="sm" showText={false} />
                <span className="text-lg font-semibold text-muted-foreground">
                  Piloto de Drones
                </span>
              </div>

              {/* Copyright */}
              <p className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} Piloto de Drones. Todos los derechos reservados.
              </p>

              {/* Enlaces mínimos */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap justify-center">
                <button
                  onClick={() => navigate('/auth')}
                  className="hover:text-foreground transition-colors"
                >
                  Iniciar Sesión
                </button>
                <span className="text-border">•</span>
                <button
                  onClick={() => navigate('/search')}
                  className="hover:text-foreground transition-colors"
                >
                  Buscar Pilotos
                </button>
                <span className="text-border">•</span>
                <button
                  onClick={() => navigate('/verificar-diploma')}
                  className="hover:text-foreground transition-colors"
                >
                  Verificar Diploma
                </button>
                <span className="text-border">•</span>
                <button
                  onClick={() => navigate('/terms')}
                  className="hover:text-foreground transition-colors"
                >
                  Términos y Condiciones
                </button>
                <span className="text-border">•</span>
                <button
                  onClick={() => navigate('/privacy')}
                  className="hover:text-foreground transition-colors"
                >
                  Política de Privacidad
                </button>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div >
  );
};

export default Index;
