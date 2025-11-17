import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MapPin, User, Briefcase } from "lucide-react";

interface SearchFormProps {
  onSearch?: (filters: { zone: string; pilotType: string; workType: string }) => void;
}

const SearchForm = ({ onSearch }: SearchFormProps) => {
  const navigate = useNavigate();
  const [zone, setZone] = useState("");
  const [pilotType, setPilotType] = useState("");
  const [workType, setWorkType] = useState("");

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
      // Mapear tipos de trabajo a especialidades
      const workTypeMap: Record<string, string> = {
        fotografia: "Fotografía",
        topografia: "Topografía",
        inspeccion: "Inspección",
        agricultura: "Agricultura",
        seguridad: "Seguridad",
      };
      const specialty = workTypeMap[workType] || workType;
      params.set("specialty", specialty);
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
            <Select value={workType} onValueChange={setWorkType}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fotografia">Fotografía</SelectItem>
                <SelectItem value="topografia">Topografía</SelectItem>
                <SelectItem value="inspeccion">Inspección</SelectItem>
                <SelectItem value="agricultura">Agricultura</SelectItem>
                <SelectItem value="seguridad">Seguridad</SelectItem>
                <SelectItem value="todos">Todos</SelectItem>
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