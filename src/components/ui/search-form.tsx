import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MapPin, User, Briefcase } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SearchFormProps {
  onSearch?: (filters: { zone: string; pilotType: string; workType: string }) => void;
}

// Cache para tipos de trabajo (5 minutos)
let workTypesCache: { data: string[]; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

const SearchForm = ({ onSearch }: SearchFormProps) => {
  const navigate = useNavigate();
  const [zone, setZone] = useState("");
  const [pilotType, setPilotType] = useState("");
  const [workType, setWorkType] = useState("");
  const [workTypes, setWorkTypes] = useState<string[]>([]);
  const [loadingWorkTypes, setLoadingWorkTypes] = useState(true);

  // Cargar tipos de trabajo dinámicamente
  useEffect(() => {
    const loadWorkTypes = async () => {
      // Verificar caché
      if (workTypesCache && Date.now() - workTypesCache.timestamp < CACHE_DURATION) {
        setWorkTypes(workTypesCache.data);
        setLoadingWorkTypes(false);
        return;
      }

      try {
        const workTypeSet = new Set<string>();

        // Obtener specialties de profiles (solo usuarios activos con suscripción)
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("specialties")
          .not("specialties", "is", null);

        if (profilesData) {
          profilesData.forEach((profile) => {
            if (profile.specialties && Array.isArray(profile.specialties)) {
              (profile.specialties as string[]).forEach((specialty: string) => {
                if (specialty && specialty.trim()) {
                  workTypeSet.add(specialty.trim());
                }
              });
            }
          });
        }

        // Obtener services de companies (solo empresas activas con suscripción)
        const { data: companiesData } = await supabase
          .from("companies")
          .select("services")
          .not("services", "is", null);

        if (companiesData) {
          companiesData.forEach((company) => {
            if (company.services && Array.isArray(company.services)) {
              company.services.forEach((service: string) => {
                if (service && service.trim()) {
                  workTypeSet.add(service.trim());
                }
              });
            }
          });
        }

        // Obtener service_type de pilot_services (solo servicios publicados)
        const { data: servicesData } = await supabase
          .from("pilot_services")
          .select("service_type")
          .eq("is_published", true)
          .not("service_type", "is", null);

        if (servicesData) {
          servicesData.forEach((service) => {
            if (service.service_type && service.service_type.trim()) {
              workTypeSet.add(service.service_type.trim());
            }
          });
        }

        // Convertir a array y ordenar alfabéticamente
        const sortedWorkTypes = Array.from(workTypeSet).sort((a, b) => 
          a.localeCompare(b, 'es', { sensitivity: 'base' })
        );

        // Actualizar caché
        workTypesCache = {
          data: sortedWorkTypes,
          timestamp: Date.now()
        };

        setWorkTypes(sortedWorkTypes);
      } catch (error) {
        console.error("Error loading work types:", error);
        // Fallback a lista por defecto
        setWorkTypes([
          "Fotografía Aérea",
          "Topografía",
          "Inspección Industrial",
          "Agricultura de Precisión",
          "Seguridad y Vigilancia",
          "Construcción",
          "Minería",
          "Búsqueda y Rescate",
          "Monitoreo Ambiental",
          "Entretenimiento",
          "Mapeo 3D"
        ]);
      } finally {
        setLoadingWorkTypes(false);
      }
    };

    loadWorkTypes();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Construir query params para la búsqueda
    const params = new URLSearchParams();
    if (zone) params.set("region", zone);
    if (pilotType && pilotType !== "todos") {
      // Mapear tipos de piloto a filtros
      if (pilotType === "certificado") {
        params.set("certified", "true");
      } else if (pilotType === "empresa") {
        params.set("pilotType", "company");
      } else if (pilotType === "independiente") {
        params.set("pilotType", "pilot");
      }
    }
    if (workType && workType !== "todos") {
      // Usar el valor real directamente (ya no necesitamos mapeo)
      params.set("specialty", workType);
    }
    
    // Navegar a la página de resultados con los filtros
    navigate(`/search?${params.toString()}`);
    
    // Llamar callback si existe (para compatibilidad con la landing)
    if (onSearch) {
      onSearch({ zone, pilotType, workType });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto">
      <div className="bg-card rounded-lg border border-border p-6 shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          {/* Zone Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Zona
            </label>
            <Input
              placeholder="Ej: Santiago, Valparaíso..."
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Pilot Type Select */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <User className="h-4 w-4" />
              Tipo de Piloto
            </label>
            <Select value={pilotType} onValueChange={setPilotType}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="certificado">Piloto Certificado</SelectItem>
                <SelectItem value="empresa">Empresa</SelectItem>
                <SelectItem value="independiente">Independiente</SelectItem>
                <SelectItem value="todos">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Work Type Select */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Tipo de Trabajo
            </label>
            <Select value={workType} onValueChange={setWorkType} disabled={loadingWorkTypes}>
              <SelectTrigger>
                <SelectValue placeholder={loadingWorkTypes ? "Cargando..." : "Seleccionar"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {workTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Search Button */}
          <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground h-10">
            <Search className="h-4 w-4 mr-2" />
            Buscar
          </Button>
        </div>
      </div>
    </form>
  );
};

export default SearchForm;