import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SearchForm from "@/components/ui/search-form";
import PilotCard from "@/components/ui/pilot-card";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Plane, Shield, Users, Star, CheckCircle, Award, Zap, Search, FileCheck, QrCode, Globe } from "lucide-react";
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
  const [featuredCompanies, setFeaturedCompanies] = useState<any[]>([]);
  const [user, setUser] = useState<SupabaseUser | null>(null);

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
        .select('id, full_name, location, region, specialties, drone_types, avatar_url, experience_years, user_type')
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
        const profile = pilot.profiles;
        const subscription = subscriptions?.find(s => s.user_id === pilot.user_id);
        const isCompany = profile?.user_type === 'company';
        const hasActiveSub = !!subscription;

        // Las empresas sin plan pagado no deben ser visibles
        if (isCompany && !hasActiveSub) return;

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
      <Header />

      <section className="py-20 lg:py-28 bg-gradient-to-br from-primary via-primary to-primary/90 text-white text-center relative overflow-hidden">
        <div className="container mx-auto px-6 relative z-10">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 italic tracking-tight uppercase">Conecta con Pilotos de Drones <span className="text-[#00b3f3] block">Certificados</span></h1>
          <p className="text-xl md:text-2xl mb-12 max-w-3xl mx-auto opacity-90 font-light tracking-wide text-blue-100">La plataforma líder en Chile para encontrar profesionales de élite y empresas especializadas en tecnología aérea.</p>
          <div className="max-w-4xl mx-auto drop-shadow-2xl"><SearchForm onSearch={handleSearch} /></div>
          {loading && <p className="mt-6 animate-pulse text-[#00b3f3] font-bold">Buscando pilotos de élite...</p>}
        </div>
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-[#00b3f3]/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-[#00b3f3]/5 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2"></div>
      </section>

      {/* NEW: Persuasive Trust Section */}
      <section className="py-24 bg-white relative z-20 -mt-10 mx-4 lg:mx-12 rounded-[2.5rem] shadow-2xl border-t-4 border-[#00b3f3]">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-primary mb-6">¿Por qué elegir <span className="text-[#00b3f3]">Piloto de Drones</span>?</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Hemos construido el ecosistema más seguro y eficiente para la industria RPA en Chile,
              validando cada profesional para garantizar la excelencia en cada misión.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            {[
              {
                icon: <Shield className="h-10 w-10" />,
                title: "Perfiles Verificados",
                desc: "Validamos digitalmente la documentación de cada piloto para asegurar el cumplimiento normativo."
              },
              {
                icon: <QrCode className="h-10 w-10" />,
                title: "Diplomas con QR",
                desc: "Tecnología de validación instantánea que garantiza la autenticidad de las certificaciones."
              },
              {
                icon: <Globe className="h-10 w-10" />,
                title: "Portafolio Digital",
                desc: "Exhibición profesional de trabajos anteriores y visualización interactiva de horas de vuelo."
              },
              {
                icon: <Zap className="h-10 w-10" />,
                title: "Conexión Directa",
                desc: "Sin comisiones ocultas ni intermediarios. Contacta directamente al piloto ideal para tu proyecto."
              }
            ].map((feature, idx) => (
              <div key={idx} className="flex flex-col items-center text-center group hover:scale-105 transition-all duration-300 cursor-default">
                <div className="h-20 w-20 bg-[#00b3f3]/10 text-[#00b3f3] rounded-2xl flex items-center justify-center mb-6 group-hover:bg-[#00b3f3] group-hover:text-white group-hover:shadow-[0_0_30px_rgba(0,179,243,0.4)] transition-all duration-300">
                  {feature.icon}
                </div>
                <h4 className="text-xl font-bold text-primary mb-3">{feature.title}</h4>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
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

            {/* NEW: How it Works Section */}
            <section className="py-16 bg-gradient-to-br from-gray-50 to-white rounded-3xl border border-gray-100 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-2 h-full bg-[#00b3f3]"></div>
              <div className="px-8 md:px-12">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
                  <div className="lg:w-1/2">
                    <h3 className="text-3xl font-bold text-primary mb-6">Tu camino al éxito RPA en <span className="text-[#00b3f3]">3 simples pasos</span></h3>
                    <div className="space-y-8">
                      {[
                        { step: "01", title: "Busca y Filtra", desc: "Encuentra pilotos por ubicación, especialidad o tipo de aeronave." },
                        { step: "02", title: "Compara Perfiles", desc: "Revisa portafolios, certificaciones verificadas y experiencia real." },
                        { step: "03", title: "Conecta Directo", desc: "Inicia la conversación y concreta tu proyecto de forma segura." }
                      ].map((s, i) => (
                        <div key={i} className="flex gap-6">
                          <div className="flex-shrink-0 h-12 w-12 bg-primary text-[#00b3f3] rounded-full flex items-center justify-center font-bold text-xl border-2 border-[#00b3f3]">
                            {s.step}
                          </div>
                          <div>
                            <h5 className="font-bold text-lg text-primary">{s.title}</h5>
                            <p className="text-muted-foreground text-sm">{s.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="lg:w-1/2 bg-[#083b4e] p-8 rounded-2xl shadow-2xl relative">
                    <div className="absolute -top-4 -right-4 bg-[#00b3f3] text-white px-4 py-2 rounded-lg font-bold text-sm transform rotate-12 shadow-lg">
                      ¡Únete Hoy!
                    </div>
                    <h4 className="text-2xl font-bold text-white mb-4">¿Eres piloto profesional?</h4>
                    <p className="text-blue-100/70 mb-6 text-sm">Aumenta tu visibilidad y recibe solicitudes directas de empresas líderes.</p>
                    <ul className="space-y-3 mb-8">
                      {["Perfil Profesional Gratuito", "Validación de Documentos", "Gestor de Horas de Vuelo"].map((item, i) => (
                        <li key={i} className="flex items-center gap-2 text-white text-sm">
                          <CheckCircle className="h-4 w-4 text-[#00b3f3]" />
                          {item}
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="w-full bg-[#00b3f3] hover:bg-white hover:text-primary text-white font-bold h-12 rounded-xl transition-all"
                      onClick={() => navigate('/auth?tab=signup')}
                    >
                      Empezar Ahora
                    </Button>
                  </div>
                </div>
              </div>
            </section>

            {/* NEW: Weather Conditions Feature (API) */}
            <section className="py-20 bg-[#f8fafc] rounded-[3rem] border border-blue-100/50 shadow-inner group overflow-hidden relative">
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-400/5 blur-[100px] rounded-full"></div>
              <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-[#00b3f3]/5 blur-[100px] rounded-full"></div>

              <div className="px-8 md:px-16">
                <div className="flex flex-col lg:flex-row items-center gap-16">
                  <div className="lg:w-1/2 relative">
                    <div className="absolute -top-10 -left-10 w-32 h-32 bg-[#00b3f3]/10 blur-3xl rounded-full animate-pulse"></div>
                    <img
                      src="/mokup-cel-clima-piloto.png"
                      alt="Clima y Condiciones de Vuelo"
                      className="relative z-10 w-full max-w-[450px] mx-auto transform group-hover:scale-[1.02] transition-transform duration-700 mix-blend-multiply [filter:drop-shadow(0_20px_30px_rgba(8,59,78,0.2))]"
                    />
                  </div>
                  <div className="lg:w-1/2 text-left space-y-8">
                    <Badge className="bg-[#00b3f3]/10 text-[#00b3f3] hover:bg-[#00b3f3]/20 border-none px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider mb-2">
                      Exclusivo Plan PRO
                    </Badge>
                    <h3 className="text-4xl md:text-5xl font-black text-primary leading-tight">
                      Condiciones de Vuelo en <span className="text-[#00b3f3]">Tiempo Real</span>
                    </h3>
                    <p className="text-xl text-muted-foreground leading-relaxed font-light">
                      Potenciamos tu perfil profesional con tecnología de vanguardia. Accede a meteorología aeronáutica diseñada exclusivamente para pilotos de drones.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {[
                        { title: "Velocidad del Viento", desc: "Alertas críticas en tiempo real." },
                        { title: "Visibilidad y KP", desc: "Índice de actividad solar y GPS." },
                        { title: "Prob. de Lluvia", desc: "Pronósticos precisos por hora." },
                        { title: "Altitud de Presión", desc: "Datos clave para el rendimiento." }
                      ].map((feature, i) => (
                        <div key={i} className="flex items-start gap-3 bg-white p-4 rounded-2xl shadow-sm border border-slate-100 hover:border-[#00b3f3]/30 transition-colors">
                          <CheckCircle className="h-5 w-5 text-[#00b3f3] mt-1 flex-shrink-0" />
                          <div>
                            <p className="font-bold text-primary text-sm">{feature.title}</p>
                            <p className="text-xs text-muted-foreground">{feature.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button
                      className="h-14 px-8 rounded-2xl bg-[#083b4e] hover:bg-[#00b3f3] text-white font-bold transition-all shadow-xl shadow-[#083b4e]/10 group/btn"
                      onClick={() => navigate('/planes')}
                    >
                      Mejorar a Plan PRO
                      <Zap className="ml-2 h-4 w-4 fill-current group-hover/btn:animate-bounce" />
                    </Button>
                  </div>
                </div>
              </div>
            </section>

            {!results.length && featuredCompanies.length > 0 && (
              <section>
                <div className="mb-12 text-center"><h3 className="text-3xl font-bold text-primary mb-2">Empresas Destacadas</h3><p className="text-muted-foreground">Empresas certificadas con Plan Empresa.</p></div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">{featuredCompanies.map(c => <div key={c.id}><PilotCard pilot={c} /></div>)}</div>
              </section>
            )}

            <section className="py-12 border-t border-gray-100">
              <div className="text-center mb-16 relative">
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-transparent via-[#00b3f3] to-transparent"></div>
                <h3 className="text-3xl md:text-5xl font-bold text-primary mb-4 tracking-tight">
                  {results.length ? "Resultados de Búsqueda" : "Expertos Recomendados"}
                </h3>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                  Accede a los perfiles más calificados de la industria, validados por nuestro equipo técnico.
                </p>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
                {listToRender.map(p => <div key={p.id} className="hover:translate-y-[-8px] transition-transform duration-500">
                  <PilotCard pilot={p} />
                </div>)}
              </div>
              <div className="mt-16 text-center">
                <Button
                  size="lg"
                  onClick={() => navigate('/search')}
                  className="bg-primary hover:bg-[#083b4e]/90 text-white px-12 h-14 rounded-2xl font-bold shadow-xl hover:shadow-[#00b3f3]/20 transition-all"
                >
                  Explorar Directorio Completo
                </Button>
              </div>
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
