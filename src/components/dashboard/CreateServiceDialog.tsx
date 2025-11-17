import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Tag, 
  DollarSign, 
  FileText,
  Loader2 
} from "lucide-react";

interface CreateServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onSuccess: () => void;
}

const serviceCategories = [
  "Fotografía Aérea",
  "Filmación Aérea", 
  "Inspección Técnica",
  "Agricultura de Precisión",
  "Topografía y Cartografía",
  "Vigilancia y Seguridad",
  "Búsqueda y Rescate",
  "Fumigación",
  "Mapeo 3D",
  "Transmisión en Vivo"
];

export function CreateServiceDialog({ open, onOpenChange, companyId, onSuccess }: CreateServiceDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    status: "active"
  });
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.description || !formData.price || !formData.category) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos obligatorios",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      // TODO: Replace with actual Supabase insert when table is created
      console.log('Creating service:', { ...formData, companyId });
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "¡Servicio publicado!",
        description: "El servicio ha sido publicado exitosamente",
      });
      
      // Reset form
      setFormData({
        name: "",
        description: "",
        price: "",
        category: "",
        status: "active"
      });
      
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating service:', error);
      toast({
        title: "Error",
        description: "No se pudo publicar el servicio",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            Publicar Nuevo Servicio
          </DialogTitle>
          <DialogDescription>
            Complete la información del servicio que desea publicar
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nombre del Servicio */}
          <div className="space-y-2">
            <Label htmlFor="service-name" className="flex items-center gap-1">
              <Tag className="h-4 w-4" />
              Nombre del Servicio *
            </Label>
            <Input
              id="service-name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="Ej: Fotografía Aérea Profesional"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Categoría */}
            <div className="space-y-2">
              <Label htmlFor="category">Categoría del Servicio *</Label>
              <Select value={formData.category} onValueChange={(value) => handleInputChange("category", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  {serviceCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Precio */}
            <div className="space-y-2">
              <Label htmlFor="price" className="flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                Precio *
              </Label>
              <Input
                id="price"
                value={formData.price}
                onChange={(e) => handleInputChange("price", e.target.value)}
                placeholder="Ej: $50.000 CLP/hora"
                required
              />
            </div>
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="description" className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              Descripción Detallada *
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Describe detalladamente el servicio, incluye qué está incluido, duración, requisitos especiales, etc."
              rows={4}
              required
            />
          </div>

          {/* Estado */}
          <div className="space-y-2">
            <Label htmlFor="status">Estado del Servicio</Label>
            <Select value={formData.status} onValueChange={(value) => handleInputChange("status", value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Activo (Publicado)</SelectItem>
                <SelectItem value="inactive">Inactivo (Borrador)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Los servicios activos aparecerán públicamente en la plataforma
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-[#2563eb] hover:bg-[#1d4ed8]"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Publicar Servicio
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}