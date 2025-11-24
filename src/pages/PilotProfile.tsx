import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Save, 
  MapPin, 
  User, 
  Phone, 
  Mail, 
  Map,
  Camera,
  Upload,
  X
} from "lucide-react";

interface ProfileData {
  full_name: string;
  email: string;
  phone: string;
  bio: string;
  location: string;
  region: string;
  experience_years: number;
  specialties: string[];
  drone_types: string[];
}

// Campos que existen en la tabla profiles
interface ExistingProfileData {
  full_name: string;
  email: string;
  user_type: string;
  avatar_url?: string;
}

// Campos adicionales que se guardarán en la tabla pilots
interface PilotData {
  phone: string;
  bio: string;
  location: string;
  region: string;
  experience_years: number;
  specialties: string[];
}

const PilotProfile = () => {
  const [profile, setProfile] = useState<ProfileData>({
    full_name: '',
    email: '',
    phone: '',
    bio: '',
    location: '',
    region: '',
    experience_years: 0,
    specialties: [],
    drone_types: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [customSpecialty, setCustomSpecialty] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  const regions = [
    'Región Metropolitana',
    'Región de Valparaíso',
    'Región del Biobío',
    'Región de Antofagasta',
    'Región de Atacama',
    'Región de Coquimbo',
    'Región de O\'Higgins',
    'Región del Maule',
    'Región de La Araucanía',
    'Región de Los Lagos',
    'Región de Aysén',
    'Región de Magallanes',
    'Región de Tarapacá',
    'Región de Arica y Parinacota',
    'Región de Los Ríos'
  ];

  const specialtyOptions = [
    'Fotografía Aérea',
    'Topografía',
    'Inspección Industrial',
    'Agricultura de Precisión',
    'Seguridad y Vigilancia',
    'Construcción',
    'Minería',
    'Búsqueda y Rescate',
    'Monitoreo Ambiental',
    'Entretenimiento',
    'Mapeo 3D'
  ];

  // Lista completa de drones organizados por nivel
  const basicDrones = [
    'DJI Mini 2',
    'DJI Mini 3',
    'DJI Mini 4',
    'DJI Mini SE',
    'DJI Tello',
    'Parrot Mambo',
    'Parrot Swing',
    'Ryze Tello'
  ];

  const intermediateDrones = [
    'DJI Mavic Air',
    'DJI Mavic Air 2',
    'DJI Mavic Air 2S',
    'DJI Mavic Pro',
    'DJI Mavic Pro 2',
    'DJI Mavic 3',
    'DJI Mavic 3 Pro',
    'DJI Phantom 3',
    'DJI Phantom 4',
    'DJI Phantom 4 Pro',
    'DJI Phantom 4 Advanced',
    'DJI Air 2S',
    'DJI Air 3',
    'Autel EVO Lite+',
    'Autel EVO Nano+',
    'Autel EVO II',
    'Parrot Anafi',
    'Parrot Bebop 2'
  ];

  const professionalDrones = [
    'DJI Inspire 1',
    'DJI Inspire 2',
    'DJI Matrice 100',
    'DJI Matrice 200',
    'DJI Matrice 210',
    'DJI Matrice 300 RTK',
    'DJI Matrice 350 RTK',
    'DJI Matrice 600',
    'DJI Matrice 600 Pro',
    'DJI Agras T10',
    'DJI Agras T20',
    'DJI Agras T30',
    'DJI Agras T40',
    'DJI Agras T50',
    'Autel EVO II Pro',
    'Autel EVO II Dual',
    'Autel EVO II Enterprise',
    'Autel Dragonfish',
    'Freefly Alta 6',
    'Freefly Alta 8',
    'Freefly Astro',
    'Yuneec Typhoon H',
    'Yuneec H520',
    'Yuneec H920',
    'DJI FPV',
    'DJI Avata',
    'DJI Avata 2',
    'DJI Mavic 3 Enterprise',
    'DJI Mavic 3 Thermal',
    'DJI Zenmuse P1',
    'DJI Zenmuse P4RTK',
    'DJI Zenmuse H20',
    'DJI Zenmuse H20T',
    'DJI Zenmuse L1',
    'DJI Zenmuse X7',
    'DJI Zenmuse X5S',
    'DJI Zenmuse X4S'
  ];

  const allDroneOptions = [...basicDrones, ...intermediateDrones, ...professionalDrones, 'Otro'];

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Error",
          description: "No hay usuario autenticado",
          variant: "destructive",
        });
        navigate('/auth');
        return;
      }

      console.log('Loading profile for user:', user.id);

      // Cargar datos del perfil (tabla profiles)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error loading profile:', profileError);
        
        // Si no existe el perfil, crear uno básico
        if (profileError.code === 'PGRST116') {
          console.log('Profile not found, creating basic profile...');
          const { error: createError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
              email: user.email,
              user_type: 'pilot',
              phone: '',
              bio: '',
              location: '',
              region: '',
              experience_years: 0,
              specialties: [],
              drone_types: []
            });

          if (createError) {
            console.error('Error creating profile:', createError);
            throw createError;
          }

          // Recargar el perfil
          const { data: newProfileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (newProfileData) {
            const data = newProfileData as any;
            setProfile({
              full_name: data.full_name || '',
              email: data.email || '',
              phone: data.phone || '',
              bio: data.bio || '',
              location: data.location || '',
              region: data.region || '',
              experience_years: data.experience_years || 0,
              specialties: data.specialties || [],
              drone_types: data.drone_types || []
            });
          }
        } else {
          throw profileError;
        }
      } else if (profileData) {
        console.log('Profile loaded successfully:', profileData);
        const data = profileData as any;
        
        setProfile({
          full_name: data.full_name || '',
          email: data.email || user.email || '',
          phone: data.phone || '',
          bio: data.bio || '',
          location: data.location || '',
          region: data.region || '',
          experience_years: data.experience_years || 0,
          specialties: data.specialties || [],
          drone_types: data.drone_types || []
        });
      }
    } catch (error: any) {
      console.error('Error loading profile:', error);
      toast({
        title: "Error",
        description: `Error al cargar el perfil: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const validateProfile = () => {
    const errors: string[] = [];
    
    if (!profile.full_name.trim()) {
      errors.push('El nombre completo es requerido');
    }
    
    if (!profile.email.trim()) {
      errors.push('El email es requerido');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
      errors.push('El email no tiene un formato válido');
    }
    
    if (profile.phone && !/^[\+]?[0-9\s\-\(\)]{8,}$/.test(profile.phone)) {
      errors.push('El teléfono no tiene un formato válido');
    }
    
    if (profile.experience_years < 0) {
      errors.push('Los años de experiencia no pueden ser negativos');
    }
    
    if (profile.experience_years > 50) {
      errors.push('Los años de experiencia no pueden ser mayores a 50');
    }
    
    return errors;
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Validar campos
      const validationErrors = validateProfile();
      if (validationErrors.length > 0) {
        toast({
          title: "Error de validación",
          description: validationErrors.join(', '),
          variant: "destructive",
        });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "No hay usuario logueado",
          variant: "destructive",
        });
        return;
      }

      console.log('Saving profile for user:', user.id);
      console.log('Profile data:', profile);

      // Actualizar todos los datos en tabla profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: profile.full_name,
          email: profile.email,
          user_type: 'pilot',
          phone: profile.phone || null,
          bio: profile.bio || null,
          location: profile.location || null,
          region: profile.region || null,
          experience_years: profile.experience_years || 0,
          specialties: profile.specialties || [],
          drone_types: profile.drone_types || []
        }, {
          onConflict: 'id'
        });

      if (profileError) {
        console.error('Profile update error:', profileError);
        throw profileError;
      }

      console.log('Profile saved successfully');
      setHasChanges(false);
      setLastSaved(new Date());
      toast({
        title: "Perfil actualizado",
        description: "Tus datos han sido guardados correctamente",
      });
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: `No se pudo guardar el perfil: ${error.message}`,
        variant: "destructive",
      });
      
    } finally {
      setSaving(false);
    }
  };

  const toggleSpecialty = (specialty: string) => {
    setProfile(prev => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter(s => s !== specialty)
        : [...prev.specialties, specialty]
    }));
    setHasChanges(true);
  };

  const handleCustomSpecialty = (value: string) => {
    setCustomSpecialty(value);
  };

  const addCustomSpecialty = () => {
    const trimmed = customSpecialty.trim();
    if (trimmed && !profile.specialties.includes(trimmed)) {
      setProfile(prev => ({
        ...prev,
        specialties: [...prev.specialties, trimmed]
      }));
      setCustomSpecialty('');
      setHasChanges(true);
    } else if (trimmed && profile.specialties.includes(trimmed)) {
      toast({
        title: "Especialidad duplicada",
        description: "Esta especialidad ya está agregada",
        variant: "destructive",
      });
    }
  };

  const removeCustomSpecialty = (specialty: string) => {
    setProfile(prev => ({
      ...prev,
      specialties: prev.specialties.filter(s => s !== specialty)
    }));
    setHasChanges(true);
  };

  // Función para verificar si una especialidad es personalizada (no está en la lista predefinida)
  const isCustomSpecialty = (specialty: string) => {
    return !specialtyOptions.includes(specialty);
  };

  const toggleDroneType = (droneType: string) => {
    setProfile(prev => ({
      ...prev,
      drone_types: prev.drone_types.includes(droneType)
        ? prev.drone_types.filter(d => d !== droneType)
        : [...prev.drone_types, droneType]
    }));
    setHasChanges(true);
  };

  const handleInputChange = (field: keyof ProfileData, value: any) => {
    setProfile(prev => ({
      ...prev,
      [field]: value
    }));
    setHasChanges(true);
  };

  const handleAutoSave = async () => {
    if (!hasChanges) return;
    
    try {
      const validationErrors = validateProfile();
      if (validationErrors.length > 0) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Actualizar todos los datos en tabla profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: profile.full_name,
          email: profile.email,
          user_type: 'pilot',
          phone: profile.phone || null,
          bio: profile.bio || null,
          location: profile.location || null,
          region: profile.region || null,
          experience_years: profile.experience_years || 0,
          specialties: profile.specialties || [],
          drone_types: profile.drone_types || []
        }, {
          onConflict: 'id'
        });

      if (profileError) {
        console.error('Profile auto-save error:', profileError);
        return;
      }

      if (!profileError) {
        setHasChanges(false);
        setLastSaved(new Date());
        console.log('Auto-saved successfully');
      }
    } catch (error) {
      console.error('Auto-save error:', error);
    }
  };

  // Auto-save cada 30 segundos si hay cambios
  useEffect(() => {
    if (!hasChanges) return;
    
    const timer = setTimeout(() => {
      handleAutoSave();
    }, 30000);

    return () => clearTimeout(timer);
  }, [hasChanges, profile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary">
      {/* Header */}
      <div className="bg-primary border-b border-border shadow-sm sticky top-0 z-50">
        <div className="px-6 py-5">
          <div className="flex items-center gap-4 max-w-5xl mx-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/pilot')}
              className="h-12 w-12 rounded-full hover:bg-accent/10 hover:scale-105 transition-all duration-200 text-white"
            >
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white">
                Editar Perfil
              </h1>
              <p className="text-base text-white/70 font-medium">Actualiza tu información personal</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6 pb-20 max-w-5xl mx-auto">
        {/* Basic Information */}
        <Card className="bg-card/95 backdrop-blur-sm border-2 border-accent/20 shadow-xl rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-accent/10 via-accent/5 to-transparent p-1">
            <CardHeader className="p-8 bg-card rounded-xl">
              <CardTitle className="flex items-center gap-3 text-2xl font-bold text-white">
                <div className="h-12 w-12 bg-accent rounded-xl flex items-center justify-center">
                  <User className="h-6 w-6 text-white" />
                </div>
                Información Básica
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 bg-card rounded-xl space-y-6">
            <div className="space-y-3">
              <Label htmlFor="full_name" className="text-base font-semibold text-white">
                Nombre completo *
              </Label>
              <Input
                id="full_name"
                value={profile.full_name}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                placeholder="Tu nombre completo"
                className="h-14 rounded-xl border-2 border-border bg-input text-foreground focus:border-accent focus:ring-accent/20 transition-all duration-200 text-base"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="email" className="text-base font-semibold text-white">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="tu@email.com"
                className="h-14 rounded-xl border-2 border-border bg-input text-foreground focus:border-accent focus:ring-accent/20 transition-all duration-200 text-base"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="phone" className="text-base font-semibold text-white flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Teléfono
              </Label>
              <Input
                id="phone"
                type="tel"
                value={profile.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+56 9 1234 5678"
                className="h-14 rounded-xl border-2 border-border bg-input text-foreground focus:border-accent focus:ring-accent/20 transition-all duration-200 text-base"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="bio" className="text-base font-semibold text-white">
                Biografía
              </Label>
              <Textarea
                id="bio"
                value={profile.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                placeholder="Cuéntanos sobre tu experiencia como piloto..."
                className="rounded-xl border-2 border-border bg-input text-foreground focus:border-accent focus:ring-accent/20 transition-all duration-200 resize-none min-h-[120px] text-base"
              />
            </div>
            </CardContent>
          </div>
        </Card>

        {/* Location Information */}
        <Card className="bg-card/95 backdrop-blur-sm border-2 border-accent/20 shadow-xl rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-accent/10 via-accent/5 to-transparent p-1">
            <CardHeader className="p-8 bg-card rounded-xl">
              <CardTitle className="flex items-center gap-3 text-2xl font-bold text-white">
                <div className="h-12 w-12 bg-accent rounded-xl flex items-center justify-center">
                  <MapPin className="h-6 w-6 text-white" />
                </div>
                Ubicación y Zona de Trabajo
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 bg-card rounded-xl space-y-6">
            <div className="space-y-3">
              <Label htmlFor="region" className="text-base font-semibold text-white">
                Región *
              </Label>
              <Select value={profile.region} onValueChange={(value) => handleInputChange('region', value)}>
                <SelectTrigger className="h-14 rounded-xl border-2 border-border bg-input text-foreground focus:border-accent focus:ring-accent/20 transition-all duration-200 text-base">
                  <SelectValue placeholder="Selecciona tu región" />
                </SelectTrigger>
                <SelectContent>
                  {regions.map((region) => (
                    <SelectItem key={region} value={region}>
                      {region}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label htmlFor="location" className="text-base font-semibold text-white flex items-center gap-2">
                <Map className="h-5 w-5" />
                Ciudad/Comuna
              </Label>
              <Input
                id="location"
                value={profile.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="Ej: Santiago, Las Condes"
                className="h-14 rounded-xl border-2 border-border bg-input text-foreground focus:border-accent focus:ring-accent/20 transition-all duration-200 text-base"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="experience" className="text-sm font-semibold text-[#E0E0E0]">
                Años de Experiencia
              </Label>
              <Input
                id="experience"
                type="number"
                value={profile.experience_years}
                onChange={(e) => handleInputChange('experience_years', parseInt(e.target.value) || 0)}
                placeholder="0"
                className="h-12 rounded-xl border-[#333333] bg-[#2C2C2C] text-[#E0E0E0] focus:border-[#FF69B4] focus:ring-[#FF69B4]/20 transition-all duration-200"
              />
            </div>
            </CardContent>
          </div>
        </Card>

        {/* Specialties */}
        <Card className="bg-[#212121] border border-[#333333] shadow-xl rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-[#FF69B4]/20 via-[#FF69B4]/10 to-[#FF69B4]/20 p-1">
            <CardHeader className="p-6 bg-[#2C2C2C] rounded-xl">
              <CardTitle className="flex items-center gap-3 text-xl font-bold text-[#E0E0E0]">
                <div className="h-10 w-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-white" />
                </div>
                Especialidades
              </CardTitle>
              <CardDescription className="text-[#B0B0B0] font-medium">
                Selecciona las áreas en las que tienes experiencia
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 bg-[#2C2C2C] rounded-xl">
              <div className="space-y-4">
                {/* Especialidades predefinidas */}
                <div className="flex flex-wrap gap-3">
                  {specialtyOptions.map((specialty) => (
                    <Badge
                      key={specialty}
                      variant={profile.specialties.includes(specialty) ? "default" : "outline"}
                      className={`cursor-pointer transition-all duration-200 px-4 py-2 rounded-xl font-medium ${
                        profile.specialties.includes(specialty)
                          ? 'bg-[#FF69B4] text-white border-[#FF69B4] shadow-lg hover:shadow-xl hover:scale-105'
                          : 'bg-[#2C2C2C] border-[#333333] text-[#E0E0E0] hover:bg-[#FF69B4]/10 hover:border-[#FF69B4] hover:text-[#FF69B4]'
                      }`}
                      onClick={() => toggleSpecialty(specialty)}
                    >
                      {specialty}
                    </Badge>
                  ))}
                </div>

                {/* Especialidades personalizadas agregadas */}
                {profile.specialties.filter(isCustomSpecialty).length > 0 && (
                  <div className="pt-4 border-t border-[#333333]">
                    <Label className="text-[#B0B0B0] text-sm mb-3 block font-medium">
                      Especialidades personalizadas:
                    </Label>
                    <div className="flex flex-wrap gap-3">
                      {profile.specialties.filter(isCustomSpecialty).map((specialty) => (
                        <Badge
                          key={specialty}
                          variant="default"
                          className="bg-[#FF69B4] text-white border-[#FF69B4] shadow-lg px-4 py-2 rounded-xl font-medium cursor-pointer hover:scale-105 transition-all duration-200 flex items-center gap-2 group"
                          onClick={() => removeCustomSpecialty(specialty)}
                        >
                          {specialty}
                          <X className="h-3 w-3 opacity-70 group-hover:opacity-100 transition-opacity" />
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Campo para agregar otra especialidad */}
                <div className="pt-4 border-t border-[#333333]">
                  <Label htmlFor="custom-specialty" className="text-[#E0E0E0] text-sm mb-2 block font-medium">
                    Otra
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="custom-specialty"
                      type="text"
                      value={customSpecialty}
                      onChange={(e) => handleCustomSpecialty(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addCustomSpecialty();
                        }
                      }}
                      placeholder="Escribe otra especialidad..."
                      className="bg-[#1A1A1A] border-[#333333] text-[#E0E0E0] focus:border-[#FF69B4] placeholder:text-[#666666]"
                    />
                    <Button
                      type="button"
                      onClick={addCustomSpecialty}
                      disabled={!customSpecialty.trim() || profile.specialties.includes(customSpecialty.trim())}
                      className="bg-[#FF69B4] hover:bg-[#FF69B4]/90 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Agregar
                    </Button>
                  </div>
                  <p className="text-xs text-[#B0B0B0] mt-2">
                    Presiona Enter o haz clic en "Agregar" para incluir tu especialidad personalizada
                  </p>
                </div>
              </div>
            </CardContent>
          </div>
        </Card>

        {/* Drone Types */}
        <Card className="bg-[#212121] border border-[#333333] shadow-xl rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-[#00b3f3]/20 via-[#00b3f3]/10 to-[#00b3f3]/20 p-1">
            <CardHeader className="p-6 bg-[#2C2C2C] rounded-xl">
              <CardTitle className="flex items-center gap-3 text-xl font-bold text-[#E0E0E0]">
                <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center">
                  <Camera className="h-5 w-5 text-white" />
                </div>
                Tipos de Drones
              </CardTitle>
              <CardDescription className="text-[#B0B0B0] font-medium">
                Selecciona los modelos de drones que estás habilitado para pilotear
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 bg-[#2C2C2C] rounded-xl">
              <div className="space-y-6">
                {/* Drones seleccionados */}
                {profile.drone_types.length > 0 && (
                  <div className="pb-4 border-b border-[#333333]">
                    <Label className="text-[#B0B0B0] text-sm mb-3 block font-medium">
                      Drones seleccionados ({profile.drone_types.length}):
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {profile.drone_types.map((drone) => (
                        <Badge
                          key={drone}
                          variant="default"
                          className="bg-[#00b3f3] text-white border-[#00b3f3] shadow-lg px-4 py-2 rounded-xl font-medium cursor-pointer hover:scale-105 transition-all duration-200 flex items-center gap-2 group"
                          onClick={() => toggleDroneType(drone)}
                        >
                          {drone}
                          <X className="h-3 w-3 opacity-70 group-hover:opacity-100 transition-opacity" />
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Nivel Básico */}
                <div>
                  <Label className="text-[#E0E0E0] text-sm mb-3 block font-semibold">
                    🟢 Nivel Básico/Principiante
                  </Label>
                  <div className="flex flex-wrap gap-3">
                    {basicDrones.map((drone) => (
                      <Badge
                        key={drone}
                        variant={profile.drone_types.includes(drone) ? "default" : "outline"}
                        className={`cursor-pointer transition-all duration-200 px-4 py-2 rounded-xl font-medium ${
                          profile.drone_types.includes(drone)
                            ? 'bg-[#00b3f3] text-white border-[#00b3f3] shadow-lg hover:shadow-xl hover:scale-105'
                            : 'bg-[#2C2C2C] border-[#333333] text-[#E0E0E0] hover:bg-[#00b3f3]/10 hover:border-[#00b3f3] hover:text-[#00b3f3]'
                        }`}
                        onClick={() => toggleDroneType(drone)}
                      >
                        {drone}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Nivel Intermedio */}
                <div>
                  <Label className="text-[#E0E0E0] text-sm mb-3 block font-semibold">
                    🟡 Nivel Intermedio
                  </Label>
                  <div className="flex flex-wrap gap-3">
                    {intermediateDrones.map((drone) => (
                      <Badge
                        key={drone}
                        variant={profile.drone_types.includes(drone) ? "default" : "outline"}
                        className={`cursor-pointer transition-all duration-200 px-4 py-2 rounded-xl font-medium ${
                          profile.drone_types.includes(drone)
                            ? 'bg-[#00b3f3] text-white border-[#00b3f3] shadow-lg hover:shadow-xl hover:scale-105'
                            : 'bg-[#2C2C2C] border-[#333333] text-[#E0E0E0] hover:bg-[#00b3f3]/10 hover:border-[#00b3f3] hover:text-[#00b3f3]'
                        }`}
                        onClick={() => toggleDroneType(drone)}
                      >
                        {drone}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Nivel Profesional */}
                <div>
                  <Label className="text-[#E0E0E0] text-sm mb-3 block font-semibold">
                    🔴 Nivel Profesional
                  </Label>
                  <div className="flex flex-wrap gap-3">
                    {professionalDrones.map((drone) => (
                      <Badge
                        key={drone}
                        variant={profile.drone_types.includes(drone) ? "default" : "outline"}
                        className={`cursor-pointer transition-all duration-200 px-4 py-2 rounded-xl font-medium ${
                          profile.drone_types.includes(drone)
                            ? 'bg-[#00b3f3] text-white border-[#00b3f3] shadow-lg hover:shadow-xl hover:scale-105'
                            : 'bg-[#2C2C2C] border-[#333333] text-[#E0E0E0] hover:bg-[#00b3f3]/10 hover:border-[#00b3f3] hover:text-[#00b3f3]'
                        }`}
                        onClick={() => toggleDroneType(drone)}
                      >
                        {drone}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Otro */}
                <div>
                  <Label className="text-[#E0E0E0] text-sm mb-3 block font-semibold">
                    ⚪ Otro
                  </Label>
                  <div className="flex flex-wrap gap-3">
                    <Badge
                      variant={profile.drone_types.includes('Otro') ? "default" : "outline"}
                      className={`cursor-pointer transition-all duration-200 px-4 py-2 rounded-xl font-medium ${
                        profile.drone_types.includes('Otro')
                          ? 'bg-[#00b3f3] text-white border-[#00b3f3] shadow-lg hover:shadow-xl hover:scale-105'
                          : 'bg-[#2C2C2C] border-[#333333] text-[#E0E0E0] hover:bg-[#00b3f3]/10 hover:border-[#00b3f3] hover:text-[#00b3f3]'
                      }`}
                      onClick={() => toggleDroneType('Otro')}
                    >
                      Otro
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </div>
        </Card>

        {/* Save Button */}
        <div className="sticky bottom-4 space-y-4">
          {/* Status indicator */}
          {hasChanges && (
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-5 py-3 bg-card border-2 border-accent text-accent rounded-xl text-base font-semibold shadow-lg">
                <div className="h-2.5 w-2.5 bg-amber-500 rounded-full animate-pulse"></div>
                Tienes cambios sin guardar
              </div>
            </div>
          )}
          
          {lastSaved && !hasChanges && (
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-5 py-3 bg-card border-2 border-green-500 text-green-400 rounded-xl text-base font-semibold shadow-lg">
                <div className="h-2.5 w-2.5 bg-green-500 rounded-full"></div>
                Guardado {lastSaved.toLocaleTimeString()}
              </div>
            </div>
          )}

          <Button
            onClick={handleSave}
            disabled={saving || !profile.full_name.trim()}
            size="lg"
            className="w-full h-16 text-lg font-bold rounded-2xl bg-accent hover:bg-accent/90 text-white shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <Save className="h-6 w-6 mr-3" />
            {saving ? 'Guardando...' : hasChanges ? 'Guardar Cambios' : 'Perfil Actualizado'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PilotProfile;
