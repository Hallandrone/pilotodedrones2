import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Building2, Upload, UserPlus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Company {
  id: string;
  company_name: string;
  logo_url: string | null;
  description: string | null;
  website: string | null;
}

interface AssociatedPilot {
  id: string;
  pilot_id: string;
  pilot: {
    user_id: string;
    profile: {
      full_name: string;
      avatar_url: string | null;
    };
  };
}

export default function CompanyProfile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<Company | null>(null);
  const [associatedPilots, setAssociatedPilots] = useState<AssociatedPilot[]>([]);
  const [formData, setFormData] = useState({
    company_name: "",
    description: "",
    website: "",
  });
  const [newPilotEmail, setNewPilotEmail] = useState("");

  useEffect(() => {
    checkUserAndLoadCompany();
  }, []);

  const checkUserAndLoadCompany = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("user_type")
      .eq("id", user.id)
      .single();

    if (profile?.user_type !== "company") {
      navigate("/pilot-dashboard");
      return;
    }

    await loadCompanyData(user.id);
  };

  const loadCompanyData = async (userId: string) => {
    try {
      const { data: companyData, error: companyError } = await supabase
        .from("companies")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (companyError) throw companyError;

      if (companyData) {
        setCompany(companyData);
        setFormData({
          company_name: companyData.company_name || "",
          description: companyData.description || "",
          website: companyData.website || "",
        });

        await loadAssociatedPilots(companyData.id);
      }
    } catch (error: any) {
      console.error("Error loading company:", error);
      toast.error("Error al cargar datos de la empresa");
    } finally {
      setLoading(false);
    }
  };

  const loadAssociatedPilots = async (companyId: string) => {
    const { data, error } = await supabase
      .from("company_pilots")
      .select(`
        id,
        pilot_id,
        pilot:pilots!inner (
          user_id,
          profile:profiles!inner (
            full_name,
            avatar_url
          )
        )
      `)
      .eq("company_id", companyId);

    if (error) {
      console.error("Error loading pilots:", error);
      return;
    }

    setAssociatedPilots(data || []);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const fileExt = file.name.split(".").pop();
    const filePath = `${user.id}/logo.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("certifications")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast.error("Error al subir logo");
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("certifications")
      .getPublicUrl(filePath);

    await handleSave({ logo_url: publicUrl });
  };

  const handleSave = async (additionalData = {}) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const updateData = { ...formData, ...additionalData };

    if (company) {
      const { error } = await supabase
        .from("companies")
        .update(updateData)
        .eq("user_id", user.id);

      if (error) {
        toast.error("Error al actualizar empresa");
        return;
      }
    } else {
      const { error } = await supabase
        .from("companies")
        .insert({ ...updateData, user_id: user.id });

      if (error) {
        toast.error("Error al crear empresa");
        return;
      }
    }

    toast.success("Empresa actualizada correctamente");
    await loadCompanyData(user.id);
  };

  const handleAddPilot = async () => {
    if (!newPilotEmail || !company) return;

    const { data: pilotProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", newPilotEmail)
      .eq("user_type", "pilot")
      .maybeSingle();

    if (!pilotProfile) {
      toast.error("No se encontró un piloto con ese email");
      return;
    }

    const { data: pilot } = await supabase
      .from("pilots")
      .select("id")
      .eq("user_id", pilotProfile.id)
      .maybeSingle();

    if (!pilot) {
      toast.error("El usuario no tiene perfil de piloto");
      return;
    }

    const { error } = await supabase
      .from("company_pilots")
      .insert({
        company_id: company.id,
        pilot_id: pilot.id,
      });

    if (error) {
      if (error.code === "23505") {
        toast.error("Este piloto ya está asociado a la empresa");
      } else {
        toast.error("Error al asociar piloto");
      }
      return;
    }

    toast.success("Piloto asociado correctamente");
    setNewPilotEmail("");
    await loadAssociatedPilots(company.id);
  };

  const handleRemovePilot = async (associationId: string) => {
    const { error } = await supabase
      .from("company_pilots")
      .delete()
      .eq("id", associationId);

    if (error) {
      toast.error("Error al eliminar asociación");
      return;
    }

    toast.success("Piloto desasociado correctamente");
    if (company) await loadAssociatedPilots(company.id);
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="flex items-center gap-2 mb-6">
        <Building2 className="h-8 w-8" />
        <h1 className="text-3xl font-bold">Perfil de Empresa</h1>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Información de la Empresa</CardTitle>
          <CardDescription>Completa los datos de tu empresa</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-24 w-24">
              <AvatarImage src={company?.logo_url || ""} />
              <AvatarFallback>
                <Building2 className="h-12 w-12" />
              </AvatarFallback>
            </Avatar>
            <div>
              <Label htmlFor="logo-upload" className="cursor-pointer">
                <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
                  <Upload className="h-4 w-4" />
                  Subir Logo
                </div>
              </Label>
              <Input
                id="logo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="company_name">Nombre de la Empresa</Label>
            <Input
              id="company_name"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="website">Sitio Web</Label>
            <Input
              id="website"
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
            />
          </div>

          <Button onClick={() => handleSave()}>Guardar Cambios</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pilotos Asociados</CardTitle>
          <CardDescription>Administra los pilotos de tu empresa</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Email del piloto"
              value={newPilotEmail}
              onChange={(e) => setNewPilotEmail(e.target.value)}
            />
            <Button onClick={handleAddPilot}>
              <UserPlus className="h-4 w-4 mr-2" />
              Agregar
            </Button>
          </div>

          <div className="space-y-2">
            {associatedPilots.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No hay pilotos asociados aún
              </p>
            ) : (
              associatedPilots.map((association) => (
                <div
                  key={association.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={association.pilot.profile.avatar_url || ""} />
                      <AvatarFallback>
                        {association.pilot.profile.full_name?.charAt(0) || "P"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">
                      {association.pilot.profile.full_name || "Sin nombre"}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemovePilot(association.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}