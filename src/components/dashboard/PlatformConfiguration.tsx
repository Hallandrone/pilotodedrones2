import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Palette, Save, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PlatformSettings {
  id?: string;
  platform_name: string;
  logo_url: string;
  favicon_url: string;
  primary_color: string;
  secondary_color: string;
}

export function PlatformConfiguration() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<PlatformSettings>({
    platform_name: "Piloto de Drones",
    logo_url: "/logo.png",
    favicon_url: "/favicon.ico",
    primary_color: "#2563eb",
    secondary_color: "#64748b"
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar la configuración",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('platform_settings')
        .update({
          platform_name: settings.platform_name,
          logo_url: settings.logo_url,
          favicon_url: settings.favicon_url,
          primary_color: settings.primary_color,
          secondary_color: settings.secondary_color
        })
        .eq('id', settings.id!);

      if (error) throw error;

      toast({
        title: "Configuración guardada",
        description: "Los cambios han sido guardados exitosamente",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof PlatformSettings, value: string) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }


  return (
    <div className="space-y-6">
      {/* Personalización Visual */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Personalización Visual
          </CardTitle>
          <CardDescription>
            Configura la apariencia y marca de la plataforma
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="platformName">Nombre de la Plataforma</Label>
              <Input
                id="platformName"
                value={settings.platform_name}
                onChange={(e) => updateSetting('platform_name', e.target.value)}
                placeholder="Piloto de Drones"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="logoUrl">URL del Logo</Label>
              <Input
                id="logoUrl"
                value={settings.logo_url}
                onChange={(e) => updateSetting('logo_url', e.target.value)}
                placeholder="/logo.png"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="primaryColor">Color Primario</Label>
              <div className="flex gap-2">
                <Input
                  id="primaryColor"
                  type="color"
                  value={settings.primary_color}
                  onChange={(e) => updateSetting('primary_color', e.target.value)}
                  className="w-20"
                />
                <Input
                  value={settings.primary_color}
                  onChange={(e) => updateSetting('primary_color', e.target.value)}
                  placeholder="#2563eb"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="secondaryColor">Color Secundario</Label>
              <div className="flex gap-2">
                <Input
                  id="secondaryColor"
                  type="color"
                  value={settings.secondary_color}
                  onChange={(e) => updateSetting('secondary_color', e.target.value)}
                  className="w-20"
                />
                <Input
                  value={settings.secondary_color}
                  onChange={(e) => updateSetting('secondary_color', e.target.value)}
                  placeholder="#64748b"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="faviconUrl">URL del Favicon</Label>
            <Input
              id="faviconUrl"
              value={settings.favicon_url}
              onChange={(e) => updateSetting('favicon_url', e.target.value)}
              placeholder="/favicon.ico"
            />
          </div>
        </CardContent>
      </Card>

      {/* Botón de Guardar */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Guardar Configuración
            </>
          )}
        </Button>
      </div>
    </div>
  );
}