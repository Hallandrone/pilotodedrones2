import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, MapPin, DollarSign, Shield, Briefcase, Search, Filter, Phone, Mail, Instagram, Linkedin } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import Logo from "@/components/ui/logo";
import PilotCard from "@/components/ui/pilot-card";

interface PilotWithServices {
  id: string;
  full_name: string;
  region: string | null;
  location: string | null;
  avatar_url: string | null;
  specialties: string[];
  drone_types: string[];
  experience_years: number;
  certification_status: boolean;
  certification_academy: string | null;
  company_name: string | null;
  public_profile_slug: string | null;
  phone: string | null;
  email: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
  services: Array<{
    id: string;
    service_type: string;
    price_per_hour: number;
    description: string;
  }>;
  subscription: {
    status: string;
    plan_name: string;
  } | null;
}

// specialtyTypes ahora se carga dinámicamente desde la BD
let specialtyTypesCache: { data: string[]; timestamp: number } | null = null;
const SPECIALTY_CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

const loadSpecialtyTypes = async (): Promise<string[]> => {
  // Verificar caché
  if (specialtyTypesCache && Date.now() - specialtyTypesCache.timestamp < SPECIALTY_CACHE_DURATION) {
    return specialtyTypesCache.data;
  }

  try {
    const specialtySet = new Set<string>();

    // Obtener specialties de profiles
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("specialties")
      .not("specialties", "is", null);

    if (profilesData) {
      profilesData.forEach((profile) => {
        if (profile.specialties && Array.isArray(profile.specialties)) {
          profile.specialties.forEach((specialty: string) => {
            if (specialty && specialty.trim()) {
              specialtySet.add(specialty.trim());
            }
          });
        }
      });
    }

    // Obtener services de companies
    const { data: companiesData } = await supabase
      .from("companies")
      .select("services")
      .not("services", "is", null);

    if (companiesData) {
      companiesData.forEach((company) => {
        if (company.services && Array.isArray(company.services)) {
          company.services.forEach((service: string) => {
            if (service && service.trim()) {
              specialtySet.add(service.trim());
            }
          });
        }
      });
    }

    // Obtener service_type de pilot_services
    const { data: servicesData } = await supabase
      .from("pilot_services")
      .select("service_type")
      .eq("is_published", true)
      .not("service_type", "is", null);

    if (servicesData) {
      servicesData.forEach((service) => {
        if (service.service_type && service.service_type.trim()) {
          specialtySet.add(service.service_type.trim());
        }
      });
    }

    // Convertir a array y ordenar
    const sortedSpecialties = Array.from(specialtySet).sort((a, b) =>
      a.localeCompare(b, 'es', { sensitivity: 'base' })
    );

    // Actualizar caché
    specialtyTypesCache = {
      data: sortedSpecialties,
      timestamp: Date.now()
    };

    return sortedSpecialties;
  } catch (error) {
    console.error("Error loading specialty types:", error);
    // Fallback
    return [
      "Audiovisual",
      "Fotografía 360",
      "Fotogrametría",
      "Minería",
      "Agricultura",
      "Pulverización/Fumigación"
    ];
  }
};

const droneTypes = [
  "DJI Mavic",
  "DJI Phantom",
  "DJI Inspire",
  "DJI Matrice",
  "Autel",
  "Parrot",
  "Freefly",
  "Otro"
];

const regions = [
  "Región Metropolitana",
  "Valparaíso",
  "Biobío",
  "Araucanía",
  "Los Lagos",
  "Maule",
  "Antofagasta",
  "Coquimbo",
  "O'Higgins",
  "Ñuble",
  "Los Ríos",
  "Arica y Parinacota",
  "Tarapacá",
  "Atacama",
  "Aysén",
  "Magallanes"
];

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [pilots, setPilots] = useState<PilotWithServices[]>([]);
  const [filteredPilots, setFilteredPilots] = useState<PilotWithServices[]>([]);
  const [loading, setLoading] = useState(true);
  const [specialtyTypes, setSpecialtyTypes] = useState<string[]>([]);
  const [loadingSpecialties, setLoadingSpecialties] = useState(true);

  // Filtros - leer desde URL params
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [selectedRegion, setSelectedRegion] = useState(searchParams.get("region") || "all");
  const [selectedSpecialty, setSelectedSpecialty] = useState(searchParams.get("specialty") || "all");
  const [selectedDroneType, setSelectedDroneType] = useState("all");
  const [selectedExperience, setSelectedExperience] = useState("all");
  const [selectedCompany, setSelectedCompany] = useState("all");
  const [certifiedOnly, setCertifiedOnly] = useState(searchParams.get("certified") === "true");
  const [pilotTypeFilter, setPilotTypeFilter] = useState(searchParams.get("pilotType") || "all");
  const [companies, setCompanies] = useState<Array<{ id: string; company_name: string }>>([]);

  useEffect(() => {
    fetchPilots();
    fetchCompanies();
    // Cargar tipos de especialidad dinámicamente
    loadSpecialtyTypes().then((types) => {
      setSpecialtyTypes(types);
      setLoadingSpecialties(false);
    });
  }, []);

  useEffect(() => {
    // Aplicar filtros iniciales cuando se cargan los pilotos o cambian los filtros
    applyFilters();
  }, [pilots, selectedRegion, selectedSpecialty, selectedDroneType, selectedExperience, selectedCompany, certifiedOnly, pilotTypeFilter, searchTerm]);

  const fetchCompanies = async () => {
    const { data } = await supabase
      .from("companies")
      .select("id, company_name")
      .order("company_name");

    setCompanies(data || []);
  };

  const fetchPilots = async () => {
    try {
      setLoading(true);

      // Obtener TODOS los pilotos
      const { data: pilotsData, error: pilotsError } = await supabase
        .from("pilots")
        .select("id, user_id, certification_status, certification_academy");

      if (pilotsError) throw pilotsError;

      // Obtener todos los servicios (publicados y no publicados)
      const { data: servicesData } = await supabase
        .from("pilot_services")
        .select(`
          id,
          pilot_id,
          service_type,
          price_per_hour,
          description,
          is_published
        `);

      // Obtener perfiles
      const userIds = pilotsData.map(p => p.user_id);
      const pilotIds = pilotsData.map(p => p.id);

      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Obtener SOLO suscripciones activas
      const { data: subscriptionsData, error: subscriptionsError } = await supabase
        .from("user_subscriptions")
        .select("user_id, status, plan_name")
        .in("user_id", userIds)
        .eq("status", "active");

      if (subscriptionsError) {
        console.error('Error fetching subscriptions:', subscriptionsError);
        // Continuar sin suscripciones si hay error
      }

      // Obtener asociaciones de empresas para TODOS los pilotos
      const allPilotIds = pilotsData.map(p => p.id);
      let companyPilotsData = null;
      if (allPilotIds.length > 0) {
        const { data } = await supabase
          .from("company_pilots")
          .select(`
            pilot_id,
            company:companies!inner (
              id,
              company_name
            )
          `)
          .in("pilot_id", allPilotIds);
        companyPilotsData = data;
      }

      // Combinar datos - para TODOS los pilotos
      const pilotsWithServices: PilotWithServices[] = pilotsData.map(pilot => {
        const profile = profilesData.find(p => p.id === pilot.user_id);
        const subscription = subscriptionsData?.find(s => s.user_id === pilot.user_id);
        const pilotServices = servicesData?.filter(s => s.pilot_id === pilot.id) || [];
        const companyAssoc = companyPilotsData?.find(cp => cp.pilot_id === pilot.id);

        return {
          id: pilot.user_id,
          full_name: profile?.full_name || "Sin nombre",
          region: (profile as any)?.region || null,
          location: (profile as any)?.location || null,
          avatar_url: profile?.avatar_url || null,
          specialties: (profile as any)?.specialties || [],
          drone_types: (profile as any)?.drone_types || [],
          experience_years: (profile as any)?.experience_years || 0,
          certification_status: pilot.certification_status || false,
          certification_academy: pilot.certification_academy || null,
          company_name: companyAssoc ? (companyAssoc.company as any).company_name : null,
          public_profile_slug: (profile as any)?.public_profile_slug || null,
          phone: (profile as any)?.phone || null,
          email: profile?.email || null,
          instagram_url: (profile as any)?.instagram_url || null,
          linkedin_url: (profile as any)?.linkedin_url || null,
          services: pilotServices.map(s => ({
            id: s.id,
            service_type: s.service_type,
            price_per_hour: s.price_per_hour || 0,
            description: s.description || ""
          })),
          subscription
        };
      });

      setPilots(pilotsWithServices);
    } catch (error) {
      console.error("Error fetching pilots:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...pilots];

    // Filtro de búsqueda por nombre o región
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.region && p.region.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.location && p.location.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filtro por región (búsqueda flexible)
    if (selectedRegion && selectedRegion !== "all") {
      filtered = filtered.filter(p => {
        if (!p.region && !p.location) return false;
        const regionLower = selectedRegion.toLowerCase();
        const pilotRegion = (p.region || "").toLowerCase();
        const pilotLocation = (p.location || "").toLowerCase();
        // Buscar coincidencias parciales en región o ubicación
        return pilotRegion.includes(regionLower) ||
          pilotLocation.includes(regionLower) ||
          regionLower.includes(pilotRegion) ||
          regionLower.includes(pilotLocation);
      });
    }

    // Filtro por tipo de piloto (company vs pilot)
    if (pilotTypeFilter && pilotTypeFilter !== "all") {
      if (pilotTypeFilter === "company") {
        filtered = filtered.filter(p => p.company_name !== null);
      } else if (pilotTypeFilter === "pilot") {
        // Puede ser piloto independiente o con empresa
        // No filtramos aquí, solo excluimos si es solo empresa
      }
    }

    // Filtro por especialidad
    if (selectedSpecialty && selectedSpecialty !== "all") {
      filtered = filtered.filter(p =>
        p.specialties.some(s => s.toLowerCase().includes(selectedSpecialty.toLowerCase())) ||
        p.services.some(s => s.service_type.toLowerCase().includes(selectedSpecialty.toLowerCase()))
      );
    }

    // Filtro por tipo de drone
    if (selectedDroneType && selectedDroneType !== "all") {
      filtered = filtered.filter(p =>
        p.drone_types.some(d => d === selectedDroneType)
      );
    }

    // Filtro por experiencia
    if (selectedExperience && selectedExperience !== "all") {
      const years = parseInt(selectedExperience);
      filtered = filtered.filter(p => p.experience_years >= years);
    }

    // Filtro por certificación
    if (certifiedOnly) {
      filtered = filtered.filter(p => p.certification_status);
    }

    // Filtro por empresa
    if (selectedCompany && selectedCompany !== "all") {
      filtered = filtered.filter(p =>
        p.company_name && p.company_name === selectedCompany
      );
    }

    // Ordenar con prioridad de 5 niveles:
    // 1. Suscripción activa + Certificación Academia de Drones Chile
    // 2. Suscripción activa (sin certificación específica)
    // 3. Perfil con foto (sin suscripción)
    // 4. Perfil completo sin foto (sin suscripción)
    // 5. Perfil incompleto
    filtered.sort((a, b) => {
      // Función helper para determinar la prioridad de cada piloto
      const getPriority = (pilot: PilotWithServices) => {
        const hasSubscription = pilot.subscription?.status === 'active';
        const hasCertificationADC = pilot.certification_academy?.toLowerCase().includes('academia de drones chile');
        const hasPhoto = !!pilot.avatar_url;
        const isComplete = pilot.full_name &&
          (pilot.location || pilot.region) &&
          pilot.specialties?.length > 0;

        if (hasSubscription && hasCertificationADC) return 1; // Máxima prioridad
        if (hasSubscription) return 2; // Suscripción sin certificación específica
        if (hasPhoto) return 3;
        if (isComplete) return 4;
        return 5; // Menor prioridad
      };

      return getPriority(a) - getPriority(b);
    });

    setFilteredPilots(filtered);
  };

  const getMinPrice = (services: PilotWithServices["services"]) => {
    if (services.length === 0) return 0;
    return Math.min(...services.map(s => s.price_per_hour));
  };

  return (
    <div className="min-h-screen bg-gray-50 font-inter">

      {/* Header */}
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="px-4 py-4 sm:py-6">
          <div className="flex items-center gap-4 max-w-7xl mx-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
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
                Buscar Pilotos
              </h1>
              <p className="text-xs sm:text-lg text-gray-600 font-medium uppercase tracking-wider">
                Explora profesionales certificados
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filtros - Desktop */}
          <aside className="hidden lg:block space-y-6">
            <Card className="p-6 max-h-[calc(100vh-12rem)] overflow-y-auto bg-white border border-gray-200 shadow-lg rounded-2xl">
              <h2 className="font-bold text-xl mb-6 flex items-center gap-3 text-gray-900">
                <Filter className="h-6 w-6 text-[#00b3f3]" />
                Filtros
              </h2>

              <div className="space-y-5">
                {/* Búsqueda */}
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">Búsqueda</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3.5 h-4 w-4 text-[#00b3f3]" />
                    <Input
                      placeholder="Nombre o ubicación"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 h-11 bg-white border-gray-300 text-gray-900 focus:border-[#00b3f3] focus:ring-1 focus:ring-[#00b3f3] transition-all"
                    />
                  </div>
                </div>

                {/* Región */}
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">Región</label>
                  <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                    <SelectTrigger className="h-11 bg-gray-800 border-gray-700 text-white focus:border-[#00b3f3]">
                      <SelectValue placeholder="Todas las regiones" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700 text-white">
                      <SelectItem value="all">Todas las regiones</SelectItem>
                      {regions.map(region => (
                        <SelectItem key={region} value={region}>{region}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Área de Especialidad */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Especialidad</label>
                  <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
                    <SelectTrigger className="h-11 bg-gray-800 border-gray-700 text-white focus:border-[#00b3f3]">
                      <SelectValue placeholder="Todas las especialidades" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700 text-white">
                      <SelectItem value="all">Todas las especialidades</SelectItem>
                      {loadingSpecialties ? (
                        <SelectItem value="loading" disabled>Cargando...</SelectItem>
                      ) : (
                        specialtyTypes.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tipo de Drone */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Tipo de Drone</label>
                  <Select value={selectedDroneType} onValueChange={setSelectedDroneType}>
                    <SelectTrigger className="h-11 bg-gray-800 border-gray-700 text-white focus:border-[#00b3f3]">
                      <SelectValue placeholder="Todos los drones" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700 text-white">
                      <SelectItem value="all">Todos los drones</SelectItem>
                      {droneTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Experiencia */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Experiencia Mínima</label>
                  <Select value={selectedExperience} onValueChange={setSelectedExperience}>
                    <SelectTrigger className="h-11 bg-gray-800 border-gray-700 text-white focus:border-[#00b3f3]">
                      <SelectValue placeholder="Cualquier experiencia" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700 text-white">
                      <SelectItem value="all">Cualquier experiencia</SelectItem>
                      <SelectItem value="1">1+ años</SelectItem>
                      <SelectItem value="3">3+ años</SelectItem>
                      <SelectItem value="5">5+ años</SelectItem>
                      <SelectItem value="10">10+ años</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Empresa */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Empresa</label>
                  <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                    <SelectTrigger className="h-11 bg-gray-800 border-gray-700 text-white focus:border-[#00b3f3]">
                      <SelectValue placeholder="Todas las empresas" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700 text-white">
                      <SelectItem value="all">Todas las empresas</SelectItem>
                      {companies.map(company => (
                        <SelectItem key={company.id} value={company.company_name}>
                          {company.company_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Certificación */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="certified"
                    checked={certifiedOnly}
                    onChange={(e) => setCertifiedOnly(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="certified" className="text-sm">
                    Solo pilotos certificados
                  </label>
                </div>

                <Button
                  className="w-full gap-2"
                  onClick={applyFilters}
                >
                  <Search className="h-4 w-4" />
                  Buscar
                </Button>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedRegion("all");
                    setSelectedSpecialty("all");
                    setSelectedDroneType("all");
                    setSelectedExperience("all");
                    setSelectedCompany("all");
                    setCertifiedOnly(false);
                    applyFilters();
                  }}
                >
                  Limpiar filtros
                </Button>
              </div>
            </Card>
          </aside>

          {/* Filtros - Mobile */}
          <div className="lg:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button className="w-full gap-2 bg-[#00b3f3] hover:bg-[#0099cc] text-white font-bold h-12 rounded-xl shadow-lg transition-all active:scale-95">
                  <Filter className="h-5 w-5" />
                  Filtros ({filteredPilots.length} resultados)
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="overflow-y-auto bg-white border-gray-200 text-gray-900 w-[85%] sm:w-[400px]">
                <SheetHeader className="mb-6">
                  <SheetTitle className="text-gray-900 text-2xl font-bold flex items-center gap-2">
                    <Filter className="h-6 w-6 text-[#00b3f3]" />
                    Filtros
                  </SheetTitle>
                </SheetHeader>
                <div className="space-y-6 pb-12">
                  {/* Same filters as desktop */}
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">Búsqueda</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3.5 h-4 w-4 text-[#00b3f3]" />
                      <Input
                        placeholder="Nombre o ubicación"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 h-11 bg-gray-800 border-gray-700 text-white placeholder:text-gray-400 focus:border-[#00b3f3] focus:ring-1 focus:ring-[#00b3f3] transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">Región</label>
                    <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                      <SelectTrigger className="h-11 bg-gray-800 border-gray-700 text-white focus:border-[#00b3f3]">
                        <SelectValue placeholder="Todas las regiones" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700 text-white">
                        <SelectItem value="all">Todas las regiones</SelectItem>
                        {regions.map(region => (
                          <SelectItem key={region} value={region}>{region}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">Especialidad</label>
                    <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
                      <SelectTrigger className="h-11 bg-gray-800 border-gray-700 text-white focus:border-[#00b3f3]">
                        <SelectValue placeholder="Todas las especialidades" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700 text-white">
                        <SelectItem value="all">Todas las especialidades</SelectItem>
                        {specialtyTypes.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">Tipo de Drone</label>
                    <Select value={selectedDroneType} onValueChange={setSelectedDroneType}>
                      <SelectTrigger className="h-11 bg-gray-800 border-gray-700 text-white focus:border-[#00b3f3]">
                        <SelectValue placeholder="Todos los drones" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700 text-white">
                        <SelectItem value="all">Todos los drones</SelectItem>
                        {droneTypes.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">Experiencia</label>
                    <Select value={selectedExperience} onValueChange={setSelectedExperience}>
                      <SelectTrigger className="h-11 bg-gray-800 border-gray-700 text-white focus:border-[#00b3f3]">
                        <SelectValue placeholder="Cualquier experiencia" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700 text-white">
                        <SelectItem value="all">Cualquier experiencia</SelectItem>
                        <SelectItem value="1">1+ años</SelectItem>
                        <SelectItem value="3">3+ años</SelectItem>
                        <SelectItem value="5">5+ años</SelectItem>
                        <SelectItem value="10">10+ años</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-gray-200">
                    <input
                      type="checkbox"
                      id="certified-mobile"
                      checked={certifiedOnly}
                      onChange={(e) => setCertifiedOnly(e.target.checked)}
                      className="h-5 w-5 rounded border-white/30 bg-[#020617] text-[#00b3f3] focus:ring-[#00b3f3]"
                    />
                    <label htmlFor="certified-mobile" className="text-sm font-medium text-white select-none">
                      Solo pilotos certificados
                    </label>
                  </div>

                  <div className="pt-4 grid grid-cols-2 gap-4">
                    <Button
                      variant="outline"
                      className="border-white/10 text-white hover:bg-white/5"
                      onClick={() => {
                        setSearchTerm("");
                        setSelectedRegion("all");
                        setSelectedSpecialty("all");
                        setSelectedDroneType("all");
                        setSelectedExperience("all");
                        setSelectedCompany("all");
                        setCertifiedOnly(false);
                        applyFilters();
                      }}
                    >
                      Limpiar
                    </Button>
                    <Button
                      className="bg-[#00b3f3] hover:bg-[#0099cc] text-white"
                      onClick={() => {
                        applyFilters();
                      }}
                    >
                      Aplicar
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Resultados */}
          <div className="lg:col-span-3 space-y-6">
            <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-gray-900 font-medium">
                {loading ? "Cargando..." : (
                  <>
                    <span className="text-[#00b3f3] font-bold text-xl">{filteredPilots.length}</span>
                    <span className="ml-2 text-gray-600">pilotos encontrados</span>
                  </>
                )}
              </p>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Cargando pilotos...</p>
              </div>
            ) : filteredPilots.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">
                  No se encontraron pilotos con los filtros seleccionados
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPilots.map((pilot) => (
                  <div
                    key={pilot.id}
                    onClick={() => navigate(`/${pilot.public_profile_slug || pilot.id}`)}
                  >
                    <PilotCard
                      pilot={{
                        id: pilot.id,
                        name: pilot.full_name,
                        location: pilot.location || pilot.region || 'Chile',
                        certification_academy: pilot.certification_academy || undefined,
                        experience_years: pilot.experience_years || undefined,
                        certified: pilot.certification_status,
                        specialties: pilot.specialties || [],
                        drone_types: pilot.drone_types || [],
                        profileImage: pilot.avatar_url || undefined,
                        company_name: pilot.company_name,
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchResults;
