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
  Building,
  Mail,
  Phone,
  MapPin,
  FileText,
  Upload,
  Loader2
} from "lucide-react";

interface CreateCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateCompanyDialog({ open, onOpenChange, onSuccess }: CreateCompanyDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    companyName: "",
    email: "",
    phone: "",
    location: "",
    region: "",
    description: "",
    logo: null as File | null
  });
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type and size
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Error",
          description: "Solo se permiten archivos de imagen",
          variant: "destructive",
        });
        return;
      }

      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "Error",
          description: "El archivo no puede ser mayor a 5MB",
          variant: "destructive",
        });
        return;
      }

      setFormData(prev => ({ ...prev, logo: file }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.companyName || !formData.email) {
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
      console.log('Creating company:', formData);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast({
        title: "¡Empresa registrada!",
        description: "La empresa ha sido registrada exitosamente",
      });

      // Reset form
      setFormData({
        companyName: "",
        email: "",
        phone: "",
        location: "",
        region: "",
        description: "",
        logo: null
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating company:', error);
      toast({
        title: "Error",
        description: "No se pudo registrar la empresa",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5 text-primary" />
            Registrar Nueva Empresa
          </DialogTitle>
          <DialogDescription>
            Complete la información para registrar una nueva empresa en la plataforma
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nombre de la Empresa */}
            <div className="space-y-2">
              <Label htmlFor="company-name" className="flex items-center gap-1">
                <Building className="h-4 w-4" />
                Nombre de la Empresa *
              </Label>
              <Input
                id="company-name"
                value={formData.companyName}
                onChange={(e) => handleInputChange("companyName", e.target.value)}
                placeholder="Ej: Drones Tech SpA"
                required
              />
            </div>

            {/* Ubicación */}
            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                Ubicación / Ciudad
              </Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleInputChange("location", e.target.value)}
                placeholder="Ej: Santiago"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-1">
                <Mail className="h-4 w-4" />
                Email de Contacto *
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="contacto@empresa.cl"
                required
              />
            </div>

            {/* Teléfono */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-1">
                <Phone className="h-4 w-4" />
                Teléfono
              </Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                placeholder="+56 9 1234 5678"
              />
            </div>

            {/* Dirección */}
            <div className="space-y-2">
              <Label htmlFor="address" className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                Dirección
              </Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                placeholder="Ej: Av. Providencia 123, Santiago"
              />
            </div>
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="description">Descripción de la Empresa</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Breve descripción de los servicios y actividades de la empresa..."
              rows={3}
            />
          </div>

          {/* Logo Upload */}
          <div className="space-y-2">
            <Label htmlFor="logo" className="flex items-center gap-1">
              <Upload className="h-4 w-4" />
              Logo de la Empresa
            </Label>
            <div className="border-2 border-dashed border-muted rounded-lg p-4">
              <input
                id="logo"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <label
                htmlFor="logo"
                className="flex flex-col items-center cursor-pointer text-center"
              >
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {formData.logo ? formData.logo.name : "Haz clic para seleccionar una imagen"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PNG, JPG hasta 5MB
                </p>
              </label>
            </div>
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
              Registrar Empresa
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}