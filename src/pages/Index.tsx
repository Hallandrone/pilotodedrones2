import { Button } from "@/components/ui/button";
import SearchForm from "@/components/ui/search-form";
import PilotCard from "@/components/ui/pilot-card";
import Logo from "@/components/ui/logo";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Plane, Shield, Users, Star, LogIn, User, Menu, X, CheckCircle, Award, Zap, Search, FileCheck, QrCode, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser } from '@supabase/supabase-js';

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
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    loadActiveBanners();
    loadFeaturedPilots();
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
      // Fetch certified pilots with active subscriptions
      const { data: pilotsData, error: pilotsError } = await supabase
        .from('pilots')
        .select(`
          id,
          user_id,
          certification_status,
          certification_academy,
          profiles:profiles (
            id,
            full_name,
            location,
            region,
            specialties,
            drone_types,
            avatar_url,
            experience_years
          )
        `)
        .eq('certification_status', true)
        .eq('status', 'approved');

      if (pilotsError) throw pilotsError;

      // Get pilot ids
      const pilotUserIds = pilotsData?.map(p => p.user_id) || [];

      // Fetch subscriptions for these pilots
      const { data: subscriptions, error: subsError } = await supabase
        .from('user_subscriptions')
        .select('user_id, status, plan_name')
        .in('user_id', pilotUserIds)
        .eq('status', 'active');

      if (subsError) {
        console.error('Error fetching subscriptions:', subsError);
        // No lanzar error, simplemente continuar sin suscripciones
      }

      // Get user ids with active subscriptions
      const activeUserIds = new Set((subscriptions || [])?.map(s => s.user_id) || []);

      // Filter pilots with active subscriptions
      const qualifiedPilots = pilotsData?.filter(pilot => 
        activeUserIds.has(pilot.user_id)
      ) || [];

      // Fetch companies for these pilots
      const { data: companyPilots } = await supabase
        .from('company_pilots')
        .select(`
          pilot_id,
          companies:company_id (
            company_name
          )
        `)
        .in('pilot_id', qualifiedPilots.map(p => p.id));

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
        .in('pilot_id', qualifiedPilots.map(p => p.id))
        .eq('is_published', true);

      const servicesMap = new Map();
      services?.forEach((s: any) => {
        if (!servicesMap.has(s.pilot_id)) {
          servicesMap.set(s.pilot_id, []);
        }
        servicesMap.get(s.pilot_id).push(s.service_type);
      });

      // Transform and randomize
      const transformedPilots = qualifiedPilots.map(pilot => ({
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

      // Randomize and limit to 6
      const shuffled = transformedPilots.sort(() => Math.random() - 0.5);
      setFeaturedPilots(shuffled.slice(0, 6));
    } catch (error) {
      console.error('Error loading featured pilots:', error);
      setFeaturedPilots([]);
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

      // Filtro por tipo de trabajo -> pilot_services.service_type (búsqueda flexible)
      if (filters.workType && filters.workType !== "todos") {
        // Mapeo de valores cortos a patrones de búsqueda
        const workTypeMap: Record<string, string> = {
          fotografia: "Fotografía",
          topografia: "Topograf",
          inspeccion: "Inspecc",
          agricultura: "Agricultur",
          seguridad: "Seguridad",
        };
        const searchPattern = workTypeMap[filters.workType] || filters.workType;
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

  const listToRender = results.length ? results : featuredPilots;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-sm sticky top-0 z-50 w-full">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-3 sm:py-5">
          <div className="flex items-center justify-between gap-4 w-full">
            <Logo size="xl" className="hover:scale-105 transition-transform duration-200 flex-shrink-0" />
            
            {/* Desktop Menu - Visible solo en md y superior */}
            <div className="hidden md:flex items-center gap-2 sm:gap-3 flex-shrink-0 min-w-0">
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
                    variant="outline" 
                    size="sm"
                    className="sm:h-11 sm:px-8 hover:bg-accent hover:text-accent-foreground transition-all duration-200 border-2 whitespace-nowrap"
                    onClick={() => navigate('/demo')}
                  >
                    <span className="hidden sm:inline">Usuario Demo</span>
                    <span className="sm:hidden">Demo</span>
                  </Button>
                  <Button 
                    size="sm"
                    className="sm:h-11 sm:px-8 bg-accent hover:bg-accent/90 text-accent-foreground transition-all duration-200 shadow-lg hover:shadow-xl whitespace-nowrap"
                    onClick={() => navigate('/auth')}
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
                          variant="outline" 
                          size="lg"
                          className="w-full justify-start hover:bg-accent hover:text-accent-foreground transition-all duration-200 border-2"
                          onClick={() => {
                            setMobileMenuOpen(false);
                            navigate('/demo');
                          }}
                        >
                          Usuario Demo
                        </Button>
                        <Button 
                          size="lg"
                          className="w-full justify-start bg-accent hover:bg-accent/90 text-accent-foreground transition-all duration-200 shadow-lg hover:shadow-xl"
                          onClick={() => {
                            setMobileMenuOpen(false);
                            navigate('/auth');
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
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-40"></div>
        <div className="container mx-auto px-6 lg:px-8 text-center relative z-10">
          <div className="max-w-5xl mx-auto">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              Conecta con Pilotos de Drones
              <span className="text-accent block mt-2">Certificados</span>
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-12 max-w-3xl mx-auto leading-relaxed">
              La plataforma líder para encontrar pilotos profesionales y empresas especializadas en servicios con drones
            </p>

            {/* Search Form */}
            <div className="max-w-4xl mx-auto">
              <SearchForm onSearch={handleSearch} />
            </div>
            {loading && (
              <p className="mt-6 text-sm text-white/80 animate-pulse">Buscando pilotos profesionales...</p>
            )}
          </div>
        </div>
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
              {results.length === 0 && (
                <section className="py-16 lg:py-20 bg-gradient-to-r from-accent via-accent to-accent/90 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>
                  <div className="text-center relative z-10">
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
                      >
                        Publicar Perfil Profesional
                      </Button>
                    </div>
                  </div>
                </section>
              )}

              {/* Features */}
              <section className="py-20 lg:py-28 bg-white">
                <div className="max-w-6xl mx-auto">
                  <h3 className="text-4xl md:text-5xl font-bold text-center text-primary mb-16">
                    ¿Por qué elegir Piloto de Drones?
                  </h3>
                  <div className="grid md:grid-cols-3 gap-12">
                    <div className="text-center group">
                      <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-accent/10 group-hover:bg-accent transition-all duration-300 mb-6">
                        <Shield className="h-10 w-10 text-accent group-hover:text-white transition-colors duration-300" />
                      </div>
                      <h4 className="text-2xl font-bold mb-4 text-primary">Pilotos Certificados</h4>
                      <p className="text-lg text-muted-foreground leading-relaxed">
                        Todos nuestros pilotos están validados y cuentan con las certificaciones requeridas
                      </p>
                    </div>
                    <div className="text-center group">
                      <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-accent/10 group-hover:bg-accent transition-all duration-300 mb-6">
                        <Users className="h-10 w-10 text-accent group-hover:text-white transition-colors duration-300" />
                      </div>
                      <h4 className="text-2xl font-bold mb-4 text-primary">Red Profesional</h4>
                      <p className="text-lg text-muted-foreground leading-relaxed">
                        Conecta con una amplia red de pilotos y empresas especializadas
                      </p>
                    </div>
                    <div className="text-center group">
                      <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-accent/10 group-hover:bg-accent transition-all duration-300 mb-6">
                        <Star className="h-10 w-10 text-accent group-hover:text-white transition-colors duration-300" />
                      </div>
                      <h4 className="text-2xl font-bold mb-4 text-primary">Calidad Garantizada</h4>
                      <p className="text-lg text-muted-foreground leading-relaxed">
                        Sistema de reseñas y evaluaciones para garantizar la mejor experiencia
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Resultados / Destacados */}
              <section className="py-20 lg:py-28 bg-secondary">
                <div className="max-w-7xl mx-auto">
                  <h3 className="text-4xl md:text-5xl font-bold text-center text-primary mb-16">
                    {results.length ? "Resultados de Búsqueda" : "Pilotos Destacados"}
                  </h3>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {listToRender.map((pilot) => (
                      <PilotCard key={pilot.id} pilot={pilot} />
                    ))}
                  </div>
                  {!results.length && (
                    <div className="text-center mt-12">
                      <Button 
                        variant="outline" 
                        size="lg"
                        className="border-2 hover:bg-accent hover:text-white hover:border-accent transition-all duration-200 text-lg px-8 py-6 h-auto"
                      >
                        Ver Todos los Pilotos
                      </Button>
                    </div>
                  )}
                </div>
              </section>
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
                <section className="py-16 lg:py-20 bg-gradient-to-r from-accent via-accent to-accent/90 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>
                  <div className="text-center relative z-10">
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
                      >
                        Publicar Perfil Profesional
                      </Button>
                    </div>
                  </div>
                </section>
              )}

              {/* Features */}
              <section className="py-20 lg:py-28 bg-white">
                <div className="max-w-6xl mx-auto">
                  <h3 className="text-4xl md:text-5xl font-bold text-center text-primary mb-16">
                    ¿Por qué elegir Piloto de Drones?
                  </h3>
                  <div className="grid md:grid-cols-3 gap-12">
                    <div className="text-center group">
                      <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-accent/10 group-hover:bg-accent transition-all duration-300 mb-6">
                        <Shield className="h-10 w-10 text-accent group-hover:text-white transition-colors duration-300" />
                      </div>
                      <h4 className="text-2xl font-bold mb-4 text-primary">Pilotos Certificados</h4>
                      <p className="text-lg text-muted-foreground leading-relaxed">
                        Todos nuestros pilotos están validados y cuentan con las certificaciones requeridas
                      </p>
                    </div>
                    <div className="text-center group">
                      <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-accent/10 group-hover:bg-accent transition-all duration-300 mb-6">
                        <Users className="h-10 w-10 text-accent group-hover:text-white transition-colors duration-300" />
                      </div>
                      <h4 className="text-2xl font-bold mb-4 text-primary">Red Profesional</h4>
                      <p className="text-lg text-muted-foreground leading-relaxed">
                        Conecta con una amplia red de pilotos y empresas especializadas
                      </p>
                    </div>
                    <div className="text-center group">
                      <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-accent/10 group-hover:bg-accent transition-all duration-300 mb-6">
                        <Star className="h-10 w-10 text-accent group-hover:text-white transition-colors duration-300" />
                      </div>
                      <h4 className="text-2xl font-bold mb-4 text-primary">Calidad Garantizada</h4>
                      <p className="text-lg text-muted-foreground leading-relaxed">
                        Sistema de reseñas y evaluaciones para garantizar la mejor experiencia
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Resultados / Destacados */}
              <section className="py-20 lg:py-28 bg-secondary">
                <div className="max-w-7xl mx-auto">
                  <h3 className="text-4xl md:text-5xl font-bold text-center text-primary mb-16">
                    {results.length ? "Resultados de Búsqueda" : "Pilotos Destacados"}
                  </h3>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {listToRender.map((pilot) => (
                      <PilotCard key={pilot.id} pilot={pilot} />
                    ))}
                  </div>
                  {!results.length && (
                    <div className="text-center mt-12">
                      <Button 
                        variant="outline" 
                        size="lg"
                        className="border-2 hover:bg-accent hover:text-white hover:border-accent transition-all duration-200 text-lg px-8 py-6 h-auto"
                      >
                        Ver Todos los Pilotos
                      </Button>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="py-16 border-t border-border bg-white">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="max-w-7xl mx-auto text-center">
            <div className="flex items-center justify-center gap-3 mb-6">
              <Plane className="h-8 w-8 text-accent" />
              <span className="text-2xl font-bold text-primary">Piloto de Drones</span>
            </div>
            <p className="text-lg text-muted-foreground">
              La plataforma profesional para servicios con drones en Chile
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
