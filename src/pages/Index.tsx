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
import Footer from "@/components/layout/Footer";

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
    window.scrollTo(0, 0);

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
      const { data: pilotsData, error: pilotsError } = await supabase
        .from('pilots')
        .select('id, user_id, certification_status, certification_academy')
        .eq('certification_status', true)
        .eq('status', 'approved');

      if (pilotsError) throw pilotsError;

      const pilotUserIds = pilotsData?.map(p => p.user_id) || [];

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, location, region, specialties, drone_types, avatar_url, experience_years')
        .in('id', pilotUserIds);

      if (profilesError) throw profilesError;

      const pilotsWithProfiles = pilotsData?.map(pilot => ({
        ...pilot,
        profiles: profilesData?.find(p => p.id === pilot.user_id)
      })) || [];

      const { data: subscriptions, error: subsError } = await supabase
        .from('user_subscriptions')
        .select('user_id, status, plan_name, featured_until')
        .in('user_id', pilotUserIds)
        .eq('status', 'active');

      if (subsError) console.error('Error fetching subscriptions:', subsError);

      const now = new Date();
      const featuredPilotsList: any[] = [];
      const regularPilotsList: any[] = [];

      pilotsWithProfiles.forEach(pilot => {
        const subscription = subscriptions?.find(s => s.user_id === pilot.user_id);
        if (subscription?.featured_until && new Date(subscription.featured_until) > now) {
          featuredPilotsList.push(pilot);
        } else {
          regularPilotsList.push(pilot);
        }
      });

      const getScore = (p: any) => {
        let sc = 0;
        const prof = p.profiles;
        if (prof?.full_name) sc += 10;
        if (prof?.avatar_url) sc += 15;
        if (prof?.region || prof?.location) sc += 10;
        if (prof?.experience_years) sc += 10;
        if (prof?.specialties?.length) sc += 15;
        if (prof?.drone_types?.length) sc += 10;
        if (p.certification_status) sc += 15;
        return sc;
      };

      const getTier = (userId: string) => {
        const sub = subscriptions?.find(s => s.user_id === userId);
        if (sub?.status === 'active') {
          if (['premium', 'empresa'].includes(sub.plan_name)) return 2;
          if (['pro', 'basic', 'profesional'].includes(sub.plan_name)) return 1;
        }
        return 0;
      };

      const sortedRegular = regularPilotsList.sort((a, b) => {
        const tA = getTier(a.user_id), tB = getTier(b.user_id);
        if (tA !== tB) return tB - tA;
        return getScore(b) - getScore(a);
      });

      const sortedFeatured = featuredPilotsList.sort((a, b) => getScore(b) - getScore(a));

      const allQualified = [...sortedFeatured, ...sortedRegular].slice(0, 12);
      const selectedIds = allQualified.map(p => p.id);

      const { data: companyPilots } = await supabase
        .from('company_pilots')
        .select('pilot_id, companies:company_id(company_name)')
        .in('pilot_id', selectedIds);

      const companyMap = new Map();
      companyPilots?.forEach((cp: any) => cp.companies && companyMap.set(cp.pilot_id, cp.companies.company_name));

      const { data: services } = await supabase
        .from('pilot_services')
        .select('pilot_id, service_type')
        .in('pilot_id', selectedIds)
        .eq('is_published', true);

      const servicesMap = new Map();
      services?.forEach((s: any) => {
        if (!servicesMap.has(s.pilot_id)) servicesMap.set(s.pilot_id, []);
        servicesMap.get(s.pilot_id).push(s.service_type);
      });

      setFeaturedPilots(allQualified.map((p: any) => ({
        id: p.id,
        name: p.profiles?.full_name || 'Piloto Profesional',
        location: p.profiles?.location || p.profiles?.region || 'Chile',
        certification_academy: p.certification_academy,
        experience_years: p.profiles?.experience_years || 0,
        certified: p.certification_status,
        specialties: p.profiles?.specialties || servicesMap.get(p.id) || [],
        drone_types: p.profiles?.drone_types || [],
        profileImage: p.profiles?.avatar_url,
        company_name: companyMap.get(p.id) || null,
      })));
    } catch (error) {
      console.error('Error loading featured pilots:', error);
    }
  };

  const loadFeaturedCompanies = async () => {
    try {
      const { data: comps, error } = await supabase
        .from('companies')
        .select('id, user_id, company_name, logo_url, description, is_featured, featured_until, certification_status')
        .eq('is_featured', true)
        .or('featured_until.is.null,featured_until.gt.' + new Date().toISOString())
        .limit(6);

      if (error || !comps?.length) return setFeaturedCompanies([]);

      const userIds = comps.map(c => c.user_id);
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, location, region, public_profile_slug')
        .in('id', userIds);

      const { data: subs } = await supabase
        .from('user_subscriptions')
        .select('user_id')
        .in('user_id', userIds)
        .eq('status', 'active')
        .in('plan_name', ['empresa', 'premium']);

      const activeUserIds = new Set(subs?.map(s => s.user_id) || []);
      setFeaturedCompanies(comps
        .filter(c => activeUserIds.has(c.user_id))
        .map(c => ({
          ...c,
          profiles: profs?.find(p => p.id === c.user_id)
        }))
        .filter(c => c.profiles)
        .map(c => ({
          id: c.id,
          user_id: c.user_id,
          full_name: c.company_name || c.profiles?.full_name,
          company_name: c.company_name,
          avatar_url: c.logo_url || c.profiles?.avatar_url,
          location: c.profiles?.location,
          region: c.profiles?.region,
          public_profile_slug: c.profiles?.public_profile_slug,
          certification_status: c.certification_status || false,
          is_company: true
        }))
        .sort(() => Math.random() - 0.5));
    } catch (error) {
      console.error('Error loading featured companies:', error);
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
      const all = data || [];
      setBanners(all.filter(b => b.position !== 'Lateral Derecho'));
      setSidebarBanners(all.filter(b => b.position === 'Lateral Derecho'));
      setMobileBanners(all.filter(b => b.position === 'Lateral Derecho' && !b.desktop_only && b.mobile_image_url));
    } catch (error) {
      console.error('Error loading banners:', error);
    }
  };

  const formatBannerUrl = (url: string | null) => {
    if (!url) return '#';
    return (!url.startsWith('http://') && !url.startsWith('https://')) ? `https://${url}` : url;
  };

  const handleSearch = async (filters: { zone: string; pilotType: string; workType: string }) => {
    setLoading(true);
    try {
      let query = supabase.from("pilots").select(`
          id,
          user_id,
          certification_status,
          status,
          profiles:profiles (full_name, email, user_type, avatar_url),
          pilot_services!inner (service_type, description, price_per_hour, is_published)
        `).eq('status', 'active').eq("pilot_services.is_published", true);

      if (filters.pilotType && filters.pilotType !== "todos") {
        const role = { certificado: "pilot", independiente: "pilot", empresa: "company" }[filters.pilotType];
        if (role) query = query.eq("profiles.user_type", role);
      }

      if (filters.workType && filters.workType !== "todos") {
        query = query.ilike("pilot_services.service_type", `%${filters.workType}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      const pMap = new Map();
      (data || []).forEach((row: any) => {
        if (!pMap.has(row.id)) {
          const svs = Array.isArray(row.pilot_services) ? row.pilot_services : [row.pilot_services];
          pMap.set(row.id, {
            id: row.id,
            name: row.profiles?.full_name || "Piloto",
            location: "Chile",
            rating: 4.8,
            certified: !!row.certification_status,
            specialties: Array.from(new Set(svs.map((s: any) => s.service_type))),
            profileImage: row.profiles?.avatar_url || undefined,
          });
        }
      });
      setResults(Array.from(pMap.values()));
    } catch (e) {
      console.error(e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const combinedFeatured = [...featuredCompanies, ...featuredPilots]
    .sort((a, b) => ('is_company' in a && !('is_company' in b) ? -1 : !('is_company' in a) && 'is_company' in b ? 1 : 0))
    .slice(0, 6);

  const listToRender = results.length ? results : combinedFeatured;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card shadow-sm sticky top-0 z-50 w-full">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-3 sm:py-5">
          <div className="flex items-center justify-between gap-4 w-full">
            <Logo size="xl" showText={false} className="hover:scale-105 transition-transform duration-200 flex-shrink-0 ml-4 sm:ml-12" />
            <div className="hidden md:flex items-center gap-2 sm:gap-3 flex-shrink-0 min-w-0">
              <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="sm:h-11 sm:px-6">Home</Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/planes')} className="sm:h-11 sm:px-6">Precios</Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/contacto')} className="sm:h-11 sm:px-6">Contacto</Button>
              {user ? (
                <>
                  <Button variant="outline" size="sm" className="sm:h-11 sm:px-8 border-2" onClick={() => navigate('/dashboard')}>
                    <User className="h-4 w-4 mr-2" /><span className="hidden md:inline">Mi Cuenta</span>
                  </Button>
                  <Button variant="ghost" size="sm" className="sm:h-11 sm:px-8" onClick={handleLogout}>Cerrar Sesión</Button>
                </>
              ) : (
                <Button size="sm" className="sm:h-11 sm:px-8 bg-accent text-accent-foreground" onClick={() => navigate('/auth?tab=signup')}>
                  <LogIn className="h-4 w-4 mr-2" /><span>Ingresar/Registrarse</span>
                </Button>
              )}
            </div>
            <div className="md:hidden">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild><Button variant="ghost" size="sm"><Menu className="h-6 w-6" /></Button></SheetTrigger>
                <SheetContent side="right">
                  <SheetHeader><SheetTitle>Menú</SheetTitle></SheetHeader>
                  <div className="mt-6 space-y-3">
                    <Button variant="ghost" className="w-full justify-start" onClick={() => { setMobileMenuOpen(false); navigate('/'); }}><Home className="h-5 w-5 mr-3" />Home</Button>
                    <Button variant="ghost" className="w-full justify-start" onClick={() => { setMobileMenuOpen(false); navigate('/planes'); }}>Precios</Button>
                    <Button variant="ghost" className="w-full justify-start" onClick={() => { setMobileMenuOpen(false); navigate('/contacto'); }}>Contacto</Button>
                    {user ? (
                      <Button variant="outline" className="w-full justify-start" onClick={() => { setMobileMenuOpen(false); navigate('/dashboard'); }}><User className="h-5 w-5 mr-3" />Mi Cuenta</Button>
                    ) : (
                      <Button className="w-full justify-start bg-accent" onClick={() => { setMobileMenuOpen(false); navigate('/auth?tab=signup'); }}><LogIn className="h-5 w-5 mr-3" />Ingresar/Registrarse</Button>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      <section className="py-20 lg:py-28 bg-gradient-to-br from-primary via-primary to-primary/90 text-white text-center relative overflow-hidden">
        <div className="container mx-auto px-6 relative z-10">
          <h1 className="text-5xl md:text-7xl font-bold mb-6">Conecta con Pilotos de Drones <span className="text-accent block">Certificados</span></h1>
          <p className="text-xl md:text-2xl mb-12 max-w-3xl mx-auto opacity-90">La plataforma líder para encontrar pilotos profesionales y empresas especializadas.</p>
          <div className="max-w-4xl mx-auto"><SearchForm onSearch={handleSearch} /></div>
          {loading && <p className="mt-6 animate-pulse text-white/80">Buscando pilotos profesionales...</p>}
        </div>
      </section>

      {mobileBanners.length > 0 && (
        <section className="py-6 bg-secondary/30 lg:hidden">
          <div className="container mx-auto px-6 space-y-4">
            {mobileBanners.map(b => (
              <a key={b.id} href={formatBannerUrl(b.redirect_url)} target="_blank" rel="noopener noreferrer" className="block rounded-xl overflow-hidden shadow-lg"><img src={b.mobile_image_url || b.image_url} alt={b.title} className="w-full h-auto object-cover" /></a>
            ))}
          </div>
        </section>
      )}

      <div className="container mx-auto px-6 lg:px-8 py-12">
        <div className={sidebarBanners.length > 0 ? "grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8" : "max-w-7xl mx-auto"}>
          <div className="min-w-0 space-y-20">
            {banners.length > 0 && (
              <section className="space-y-6">
                {banners.map(b => (
                  <a key={b.id} href={formatBannerUrl(b.redirect_url)} target="_blank" rel="noopener noreferrer" className="block rounded-xl overflow-hidden shadow-lg hover:scale-[1.01] transition-transform"><img src={b.image_url} alt={b.title} className="w-full h-auto object-cover" style={{ maxHeight: '300px' }} /></a>
                ))}
              </section>
            )}

            {results.length === 0 && (
              <section className="py-16 bg-gradient-to-r from-accent to-accent/90 rounded-3xl text-white text-center relative overflow-hidden">
                <div className="max-w-3xl mx-auto px-6">
                  <h3 className="text-3xl md:text-4xl font-bold mb-6">¿Eres piloto o empresa?</h3>
                  <p className="text-xl mb-8 opacity-90">Únete a nuestra plataforma y conecta con nuevos clientes.</p>
                  <Button variant="secondary" size="lg" className="bg-white text-accent px-8" onClick={() => navigate('/auth?tab=signup')}>Publicar Perfil Profesional</Button>
                </div>
              </section>
            )}

            <section className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border">
              <h3 className="text-3xl md:text-4xl font-bold text-center text-primary mb-12">Potencia tu Presencia en la Industria</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {[
                  { img: "/AGRO 2_resultado.webp", title: "Agro", desc: "Fumigación y mapeo." },
                  { img: "/AUDIOVISUAL_resultado.webp", title: "Audiovisual", desc: "Tomas cinematográficas." },
                  { img: "/inspeccion_infraestructura.png", title: "Inspección", desc: "Estructuras críticas." },
                  { img: "/inspeccion_termica.png", title: "Térmica", desc: "Termografía aérea." }
                ].map((item, i) => (
                  <div key={i} className="group border rounded-2xl overflow-hidden hover:shadow-lg transition-all">
                    <div className="aspect-video overflow-hidden"><img src={item.img} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /></div>
                    <div className="p-4"><h4 className="font-bold text-primary">{item.title}</h4><p className="text-sm text-muted-foreground">{item.desc}</p></div>
                  </div>
                ))}
              </div>
            </section>

            {!results.length && featuredCompanies.length > 0 && (
              <section>
                <div className="mb-12 text-center"><h3 className="text-3xl font-bold text-primary mb-2">Empresas Destacadas</h3><p className="text-muted-foreground">Empresas certificadas con Plan Empresa.</p></div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">{featuredCompanies.map(c => <div key={c.id}><PilotCard pilot={c} /></div>)}</div>
              </section>
            )}

            <section className="py-12 border-t">
              <div className="text-center mb-12"><h3 className="text-3xl font-bold text-primary mb-4">{results.length ? "Resultados de Búsqueda" : "Expertos Recomendados"}</h3><p className="text-muted-foreground text-lg">Encuentra al profesional ideal para tu proyecto.</p></div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">{listToRender.map(p => <div key={p.id}><PilotCard pilot={p} /></div>)}</div>
              <div className="mt-12 text-center"><Button size="lg" onClick={() => navigate('/search')} className="bg-primary px-10">Explorar Directorio Completo</Button></div>
            </section>
          </div>

          {sidebarBanners.length > 0 && (
            <aside className="hidden lg:block">
              <div className="sticky top-24 space-y-6">
                {sidebarBanners.map(b => (
                  <a key={b.id} href={formatBannerUrl(b.redirect_url)} target="_blank" rel="noopener noreferrer" className="block rounded-xl overflow-hidden shadow-lg"><img src={b.image_url} alt={b.title} className="w-full h-auto object-cover" style={{ minHeight: '480px' }} /></a>
                ))}
              </div>
            </aside>
          )}
        </div>
      </div>

      <section className="py-20 bg-accent/5 border-t">
        <div className="container mx-auto px-6 text-center max-w-4xl">
          <h3 className="text-3xl md:text-4xl font-bold text-primary mb-4">El Plan Perfecto para Ti</h3>
          <p className="text-xl text-muted-foreground mb-8">Desde Plan Gratis hasta Plan Empresa.</p>
          <Button size="lg" onClick={() => navigate('/planes')} className="bg-accent px-10">Ver Planes y Precios</Button>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default Index;
