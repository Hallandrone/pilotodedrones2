import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, MapPin, DollarSign, Shield, Briefcase, Search, Filter } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

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

const specialtyTypes = [
  "Audiovisual",
  "Fotografía 360",
  "Fotogrametría",
  "Minería",
  "Agricultura",
  "Pulverización/Fumigación"
];

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

      // Obtener suscripciones (todas, no solo activas)
      const { data: subscriptionsData } = await supabase
        .from("user_subscriptions")
        .select("user_id, status, plan_name")
        .in("user_id", userIds);

      // Obtener asociaciones de empresas
      const { data: companyPilotsData } = await supabase
        .from("company_pilots")
        .select(`
          pilot_id,
          company:companies!inner (
            id,
            company_name
          )
        `)
        .in("pilot_id", pilotIds);

      // Combinar datos
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

    setFilteredPilots(filtered);
  };

  const getMinPrice = (services: PilotWithServices["services"]) => {
    if (services.length === 0) return 0;
    return Math.min(...services.map(s => s.price_per_hour));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Buscar Pilotos</h1>
            <div className="w-20" />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filtros - Desktop */}
          <aside className="hidden lg:block space-y-6">
            <Card className="p-6 max-h-[calc(100vh-12rem)] overflow-y-auto">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtros
              </h2>

              <div className="space-y-4">
                {/* Búsqueda */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Búsqueda</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Nombre o ubicación"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Región */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Región</label>
                  <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas las regiones" />
                    </SelectTrigger>
                    <SelectContent>
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
                    <SelectTrigger>
                      <SelectValue placeholder="Todas las especialidades" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las especialidades</SelectItem>
                      {specialtyTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tipo de Drone */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Tipo de Drone</label>
                  <Select value={selectedDroneType} onValueChange={setSelectedDroneType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los drones" />
                    </SelectTrigger>
                    <SelectContent>
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
                    <SelectTrigger>
                      <SelectValue placeholder="Cualquier experiencia" />
                    </SelectTrigger>
                    <SelectContent>
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
                    <SelectTrigger>
                      <SelectValue placeholder="Todas las empresas" />
                    </SelectTrigger>
                    <SelectContent>
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
                <Button variant="outline" className="w-full gap-2">
                  <Filter className="h-4 w-4" />
                  Filtros ({filteredPilots.length} resultados)
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Filtros</SheetTitle>
                </SheetHeader>
                <div className="space-y-4 mt-4 pb-6">
                  {/* Same filters as desktop */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Búsqueda</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Nombre o ubicación"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Región</label>
                    <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todas las regiones" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas las regiones</SelectItem>
                        {regions.map(region => (
                          <SelectItem key={region} value={region}>{region}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Especialidad</label>
                    <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todas las especialidades" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas las especialidades</SelectItem>
                        {specialtyTypes.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Tipo de Drone</label>
                    <Select value={selectedDroneType} onValueChange={setSelectedDroneType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos los drones" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los drones</SelectItem>
                        {droneTypes.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Experiencia Mínima</label>
                    <Select value={selectedExperience} onValueChange={setSelectedExperience}>
                      <SelectTrigger>
                        <SelectValue placeholder="Cualquier experiencia" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Cualquier experiencia</SelectItem>
                        <SelectItem value="1">1+ años</SelectItem>
                        <SelectItem value="3">3+ años</SelectItem>
                        <SelectItem value="5">5+ años</SelectItem>
                        <SelectItem value="10">10+ años</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Empresa</label>
                    <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todas las empresas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas las empresas</SelectItem>
                        {companies.map(company => (
                          <SelectItem key={company.id} value={company.company_name}>
                            {company.company_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="certified-mobile"
                      checked={certifiedOnly}
                      onChange={(e) => setCertifiedOnly(e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="certified-mobile" className="text-sm">
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
              </SheetContent>
            </Sheet>
          </div>

          {/* Resultados */}
          <div className="lg:col-span-3 space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground">
                {loading ? "Cargando..." : `${filteredPilots.length} pilotos encontrados`}
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
                  <Card key={pilot.id} className="p-6 hover:shadow-lg transition-shadow">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                          {pilot.avatar_url ? (
                            <img
                              src={pilot.avatar_url}
                              alt={pilot.full_name}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            pilot.full_name.charAt(0).toUpperCase()
                          )}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold text-lg text-foreground truncate">
                              {pilot.full_name}
                            </h3>
                            {pilot.certification_status && (
                              <Badge variant="secondary" className="gap-1">
                                <Shield className="h-3 w-3" />
                                Certificado
                              </Badge>
                            )}
                          </div>
                          <Badge variant="outline">
                            {pilot.subscription?.plan_name || "Free"}
                          </Badge>
                        </div>

                        <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                          {pilot.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {pilot.location}
                            </div>
                          )}
                          {pilot.company_name && (
                            <div className="flex items-center gap-1">
                              <Briefcase className="h-3 w-3" />
                              {pilot.company_name}
                            </div>
                          )}
                          {pilot.certification_academy && (
                            <div className="text-xs text-muted-foreground">
                              Certificado por: {pilot.certification_academy}
                            </div>
                          )}
                          {pilot.experience_years > 0 && (
                            <div className="text-xs text-muted-foreground">
                              {pilot.experience_years} años de experiencia
                            </div>
                          )}
                        </div>

                        <div className="mt-3 space-y-2">
                          {pilot.specialties.length > 0 && (
                            <div>
                              <div className="text-xs font-medium text-muted-foreground mb-1">Especialidades:</div>
                              <div className="flex flex-wrap gap-1">
                                {pilot.specialties.slice(0, 3).map((specialty, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {specialty}
                                  </Badge>
                                ))}
                                {pilot.specialties.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{pilot.specialties.length - 3}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                          {pilot.drone_types.length > 0 && (
                            <div>
                              <div className="text-xs font-medium text-muted-foreground mb-1">Drones:</div>
                              <div className="flex flex-wrap gap-1">
                                {pilot.drone_types.slice(0, 2).map((drone, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    {drone}
                                  </Badge>
                                ))}
                                {pilot.drone_types.length > 2 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{pilot.drone_types.length - 2}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        <Button
                          className="w-full mt-4"
                          onClick={() => {
                            const profileUrl = pilot.public_profile_slug 
                              ? `/${pilot.public_profile_slug}`
                              : `/pilot/${pilot.id}`;
                            navigate(profileUrl, {
                              state: {
                                searchTerm,
                                selectedRegion,
                                selectedSpecialty,
                                selectedDroneType,
                                selectedExperience,
                                selectedCompany,
                                certifiedOnly
                              }
                            });
                          }}
                        >
                          Ver Perfil
                        </Button>
                      </div>
                    </div>
                  </Card>
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
