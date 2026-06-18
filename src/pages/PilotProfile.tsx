import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getBaseUrlClean } from "@/lib/getBaseUrl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Save,
  MapPin,
  User,
  Phone,
  Mail,
  Map as MapIcon,
  Camera,
  Plane,
  Upload,
  X,
  Crown,
  Link as LinkIcon,
  Loader2,
  CheckCircle,
  AlertCircle,
  Eye,
  Lock as LockIcon,
  Youtube,
  ExternalLink
} from "lucide-react";
import { ImageCropper } from "@/components/ui/ImageCropper";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Logo from "@/components/ui/logo";
import { isPaidPlan, PlanType, normalizePlanName } from "@/lib/planFeatures";

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
  public_profile_slug?: string;
  slug_updated_at?: string;
  youtube_url?: string;
}

interface Subscription {
  id?: string;
  status: string;
  plan_name: string;
  plan_type?: string;
  payment_method?: string;
  renewal_date?: string | null;
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
    drone_types: [],
    public_profile_slug: '',
    slug_updated_at: '',
    youtube_url: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [customSpecialty, setCustomSpecialty] = useState('');
  const [customDrone, setCustomDrone] = useState('');
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugFeedback, setSlugFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const appBaseUrl = getBaseUrlClean();

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

  // Reserved words that cannot be used as slugs
  const RESERVED_WORDS = ['admin', 'api', 'dashboard', 'pilot', 'search', 'login', 'register', 'profile', 'settings', 'help', 'about', 'contact', 'terms', 'privacy'];

  // Function to clean and validate profile slug
  const cleanSlug = (input: string): string => {
    if (!input) return '';

    let cleaned = input.trim().toLowerCase();

    // Remove spaces and replace with hyphens
    cleaned = cleaned.replace(/\s+/g, '-');

    // Remove special characters, only allow alphanumeric, hyphens, and underscores
    cleaned = cleaned.replace(/[^a-z0-9_-]/g, '');

    // Remove multiple consecutive hyphens
    cleaned = cleaned.replace(/-+/g, '-');

    // Remove leading/trailing hyphens and underscores
    cleaned = cleaned.replace(/^[-_]+|[-_]+$/g, '');

    return cleaned;
  };

  // Function to validate slug format
  const validateSlug = (slug: string): { valid: boolean; error?: string } => {
    if (!slug) {
      return { valid: false, error: 'El slug no puede estar vacío' };
    }

    if (slug.length < 3) {
      return { valid: false, error: 'El slug debe tener al menos 3 caracteres' };
    }

    if (slug.length > 30) {
      return { valid: false, error: 'El slug no puede tener más de 30 caracteres' };
    }

    // Check if it matches the allowed pattern
    if (!/^[a-z0-9_-]+$/.test(slug)) {
      return { valid: false, error: 'El slug solo puede contener letras minúsculas, números, guiones y guiones bajos' };
    }

    // Check if it starts with a number
    if (/^[0-9]/.test(slug)) {
      return { valid: false, error: 'El slug no puede comenzar con un número' };
    }

    // Check reserved words
    if (RESERVED_WORDS.includes(slug)) {
      return { valid: false, error: 'Este nombre no está disponible (palabra reservada)' };
    }

    return { valid: true };
  };

  // Function to check slug availability
  const checkSlugAvailability = async (slug: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !slug) return false;

      // Use maybeSingle() instead of single() to avoid 406 errors
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('public_profile_slug', slug)
        .neq('id', user.id)
        .maybeSingle();

      // If data exists, slug is taken
      if (data) return false;

      // If no data and no error, slug is available
      if (!data && !error) return true;

      // If error, log it but assume slug is available if it's a "not found" type error
      if (error) {
        // PGRST116 = not found, which means slug is available
        if (error.code === 'PGRST116') return true;

        // For other errors, log and return false to be safe
        console.error('Error checking slug availability:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking slug availability:', error);
      return false;
    }
  };

  // Handle slug input change (manual verification via button)
  const handleSlugChange = (value: string) => {
    const cleaned = cleanSlug(value);
    setProfile(prev => ({ ...prev, public_profile_slug: cleaned }));
    setSlugAvailable(null);
    setSlugFeedback(null);

    if (!cleaned) {
      return;
    }

    const validation = validateSlug(cleaned);
    if (!validation.valid) {
      setSlugFeedback({
        type: 'error',
        text: validation.error || 'El formato del nombre no es válido'
      });
    }
  };

  const handleSlugVerification = async () => {
    if (!profile.public_profile_slug) {
      setSlugFeedback({
        type: 'error',
        text: 'Ingresa un nombre para tu perfil antes de verificar'
      });
      setSlugAvailable(null);
      return;
    }

    const validation = validateSlug(profile.public_profile_slug);
    if (!validation.valid) {
      setSlugFeedback({
        type: 'error',
        text: validation.error || 'El formato del nombre no es válido'
      });
      setSlugAvailable(false);
      return;
    }

    setCheckingSlug(true);
    const available = await checkSlugAvailability(profile.public_profile_slug);
    setCheckingSlug(false);
    setSlugAvailable(available);

    if (available) {
      setSlugFeedback({
        type: 'success',
        text: `Excelente, tu URL será ${appBaseUrl}/${profile.public_profile_slug}`
      });
    } else {
      setSlugFeedback({
        type: 'error',
        text: 'Este nombre ya está en uso. Por favor, elige otro.'
      });
    }
  };

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

      const { data: subscription, error: subError } = await supabase
        .from('user_subscriptions')
        .select('plan_name, status, renewal_date')
        .eq('user_id', user.id)
        .or('status.eq.active,status.eq.cancelled')
        .maybeSingle();

      if (subError) {
        console.error('Error loading subscription:', subError);
      }

      // Validar si la suscripción es válida (activa o cancelada con fecha futura)
      const isSubscriptionValid = !!(subscription && (
        subscription.status === 'active' ||
        (subscription.status === 'cancelled' && subscription.renewal_date && new Date(subscription.renewal_date) > new Date())
      ));

      // Solo consideramos suscripción si el plan es de pago
      const currentPlan = subscription?.plan_name || '';
      const normalizedPlan = normalizePlanName(currentPlan);

      if (isSubscriptionValid && isPaidPlan(normalizedPlan)) {
        setSubscription(subscription as any);
      } else {
        setSubscription(null);
      }

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
              drone_types: data.drone_types || [],
              public_profile_slug: data.public_profile_slug || '',
              slug_updated_at: data.slug_updated_at || ''
            });
            setAvatarUrl(data.avatar_url || null);
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
          drone_types: data.drone_types || [],
          public_profile_slug: data.public_profile_slug || '',
          youtube_url: data.youtube_url || ''
        });
        setAvatarUrl(data.avatar_url || null);
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
        setSaving(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "No hay usuario logueado",
          variant: "destructive",
        });
        setSaving(false);
        return;
      }

      console.log('Saving profile for user:', user.id);
      console.log('Profile data:', profile);

      // Preparar datos de actualización
      const updateData: any = {
        full_name: profile.full_name,
        email: profile.email,
        user_type: 'pilot',
        phone: profile.phone || null,
        bio: profile.bio || null,
        location: profile.location || null,
        region: profile.region || null,
        experience_years: profile.experience_years || 0,
        specialties: profile.specialties || [],
        drone_types: profile.drone_types || [],
        youtube_url: profile.youtube_url || null
      };

      // Validar slug si existe
      if (profile.public_profile_slug) {
        const validation = validateSlug(profile.public_profile_slug);
        if (!validation.valid) {
          toast({
            title: "Error de validación",
            description: validation.error || 'El formato del nombre de perfil no es válido',
            variant: "destructive",
          });
          setSaving(false);
          return;
        }

        // Consultar perfil actual para comparar slug y fecha de cambio
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('public_profile_slug, slug_updated_at')
          .eq('id', user.id)
          .single();

        if (currentProfile && currentProfile.public_profile_slug !== profile.public_profile_slug) {
          // Si el slug cambió, verificar si han pasado 30 días
          if (currentProfile.slug_updated_at) {
            const lastUpdate = new Date(currentProfile.slug_updated_at);
            const now = new Date();
            const daysSinceLastUpdate = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));

            if (daysSinceLastUpdate < 30) {
              toast({
                title: "Cambio de URL no permitido",
                description: `Solo puedes cambiar tu URL personalizada una vez al mes. Podrás hacerlo nuevamente en ${30 - daysSinceLastUpdate} días.`,
                variant: "destructive",
              });
              setSaving(false);
              return;
            }
          }

          // Si hubo cambio de slug, también actualizar historial
          const oldSlug = currentProfile.public_profile_slug;
          const newSlug = profile.public_profile_slug;

          if (oldSlug) {
            await supabase
              .from('profile_slug_history')
              .update({ is_current: false, deactivated_at: new Date().toISOString() })
              .eq('user_id', user.id)
              .eq('is_current', true);
          }

          await supabase
            .from('profile_slug_history')
            .upsert({
              user_id: user.id,
              slug: newSlug,
              is_current: true,
              deactivated_at: null
            }, { onConflict: 'user_id,slug' });

          // Si se permite el cambio, actualizar la fecha
          updateData.slug_updated_at = new Date().toISOString();
        }

        // Verificar disponibilidad si no se ha verificado antes
        if (slugAvailable === null) {
          const available = await checkSlugAvailability(profile.public_profile_slug);
          if (!available) {
            toast({
              title: "Nombre no disponible",
              description: 'Este nombre ya está en uso. Por favor, verifica la disponibilidad antes de guardar.',
              variant: "destructive",
            });
            setSaving(false);
            return;
          }
        } else if (slugAvailable === false) {
          toast({
            title: "Nombre no disponible",
            description: 'Este nombre ya está en uso. Por favor, elige otro.',
            variant: "destructive",
          });
          setSaving(false);
          return;
        }

        updateData.public_profile_slug = profile.public_profile_slug;
      }

      // Guardar cambios en la base de datos
      const { error: saveError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (saveError) {
        console.error('Profile update error:', saveError);
        throw saveError;
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

  const handleCustomDrone = (value: string) => {
    setCustomDrone(value);
  };

  const addCustomDrone = () => {
    const trimmed = customDrone.trim();
    if (trimmed && !profile.drone_types.includes(trimmed)) {
      setProfile(prev => ({
        ...prev,
        drone_types: [...prev.drone_types, trimmed]
      }));
      setCustomDrone('');
      setHasChanges(true);
    } else if (trimmed && profile.drone_types.includes(trimmed)) {
      toast({
        title: "Modelo duplicado",
        description: "Este modelo de drone ya está agregado",
        variant: "destructive",
      });
    }
  };

  const isCustomDrone = (drone: string) => {
    const allDrones = [...basicDrones, ...intermediateDrones, ...professionalDrones];
    return !allDrones.includes(drone) && drone !== 'Otro';
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

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Solo se permiten archivos de imagen",
        variant: "destructive",
      });
      return;
    }

    // Validar tamaño (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "La imagen no puede ser mayor a 5MB",
        variant: "destructive",
      });
      return;
    }

    // Crear URL temporal para el cropper
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      setImageToCrop(imageUrl);
      setCropperOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarCropComplete = async (croppedImageUrl: string) => {
    try {
      setUploadingAvatar(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "No se pudo obtener el usuario",
          variant: "destructive",
        });
        return;
      }

      // Convertir la URL del blob a File
      const response = await fetch(croppedImageUrl);
      const blob = await response.blob();
      const file = new File([blob], `avatar-${user.id}.jpg`, { type: 'image/jpeg' });

      // Subir a Supabase Storage
      const filePath = `${user.id}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Obtener URL pública con parámetro de caché para forzar actualización
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Actualizar perfil
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }

      // Recargar el perfil completo para asegurar sincronización
      await loadProfile();

      // Forzar actualización del avatar agregando parámetro de caché
      setAvatarUrl(`${publicUrl}?t=${Date.now()}`);

      toast({
        title: "Avatar actualizado",
        description: "Tu foto de perfil ha sido actualizada correctamente",
      });
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo subir el avatar. Intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setUploadingAvatar(false);
      setCropperOpen(false);
      setImageToCrop(null);
    }
  };

  const handleAutoSave = async () => {
    if (!hasChanges) return;

    try {
      const validationErrors = validateProfile();
      if (validationErrors.length > 0) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Actualizar todos los datos en tabla profiles
      const updateData: any = {
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
      };

      // Incluir public_profile_slug si existe
      if (profile.public_profile_slug) {
        // Check if slug has changed
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('public_profile_slug')
          .eq('id', user.id)
          .single();

        const oldSlug = currentProfile?.public_profile_slug;
        const newSlug = profile.public_profile_slug;

        // If slug has changed, update history
        if (oldSlug && oldSlug !== newSlug) {
          // Deactivate all current slugs for this user (should only be one, but be safe)
          await supabase
            .from('profile_slug_history')
            .update({
              is_current: false,
              deactivated_at: new Date().toISOString()
            })
            .eq('user_id', user.id)
            .eq('is_current', true);

          // Insert new slug in history (or update if it already exists)
          await supabase
            .from('profile_slug_history')
            .upsert({
              user_id: user.id,
              slug: newSlug,
              is_current: true,
              deactivated_at: null
            }, {
              onConflict: 'user_id,slug'
            });
        } else if (!oldSlug && newSlug) {
          // First time setting a slug
          await supabase
            .from('profile_slug_history')
            .upsert({
              user_id: user.id,
              slug: newSlug,
              is_current: true,
              deactivated_at: null
            }, {
              onConflict: 'user_id,slug'
            });
        }

        updateData.public_profile_slug = profile.public_profile_slug;
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(updateData, {
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

  const isLoading = loading;

  return (
    <div className="min-h-screen bg-[#083b4e] text-white font-inter relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjAzIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-50"></div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#083b4e] via-[#083b4e] to-[#0a4a61] pointer-events-none"></div>

      {/* Header */}
      <div className="bg-white/95 isolate border-b border-gray-200 shadow-sm sticky top-0 z-50 animate-fade-in">
        <div className="px-4 py-4 sm:py-6">
          <div className="flex items-center gap-4 max-w-7xl mx-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/pilot')}
              className="h-10 w-10 sm:h-12 sm:w-12 rounded-full hover:bg-gray-100/50 hover:scale-110 transition-all duration-300 text-slate-700 border border-transparent hover:border-gray-200"
            >
              <ArrowLeft className="h-5 w-5 sm:h-7 sm:w-7" />
            </Button>

            <Logo
              size="xl"
              className="flex-shrink-0 [&>div]:h-12 [&>div]:w-12 sm:[&>div]:h-20 sm:[&>div]:w-20 hover:scale-110 transition-all duration-300 filter drop-shadow-[0_0_15px_rgba(0,179,243,0.4)]"
              showText={false}
            />

            <div className="flex flex-col">
              <h1 className="text-xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Editar Perfil
              </h1>
              <p className="text-[10px] sm:text-sm text-[#00b3f3] font-bold uppercase tracking-[0.2em]">
                Área de Piloto
              </p>
            </div>

            <div className="ml-auto flex items-center gap-3">
              <Button
                variant="outline"
                onClick={async () => {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (user) {
                    const profileUrl = profile.public_profile_slug
                      ? `${window.location.origin}/${profile.public_profile_slug}`
                      : `${window.location.origin}/pilot/${user.id}`;
                    window.open(profileUrl, '_blank');
                  }
                }}
                className="hidden sm:flex bg-white hover:bg-gray-50 text-slate-700 border-gray-200 hover:border-[#00b3f3]/50 transition-all rounded-xl gap-2 shadow-sm"
              >
                <Eye className="h-4 w-4 text-[#00b3f3]" />
                Vista Previa
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6 space-y-8 pb-32 max-w-5xl mx-auto relative z-10 animate-fade-in" style={{ animationDelay: '0.1s' }}>
        {isLoading ? (
          <div className="space-y-8">
            <Card className="bg-white/5 border-white/10 p-8 space-y-6">
              <div className="flex flex-col items-center gap-4">
                <Skeleton className="h-32 w-32 rounded-full" />
                <Skeleton className="h-10 w-48" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            </Card>
            <Card className="bg-white/5 border-white/10 p-8 space-y-4">
              <Skeleton className="h-8 w-32" />
              <div className="space-y-2">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            </Card>
          </div>
        ) : (
          <>
            {/* Basic Information */}
            <Card className="bg-white/5 isolate border border-white/10 shadow-2xl rounded-3xl overflow-hidden hover:border-[#00b3f3]/30 transition-all duration-300">
              <div className="bg-gradient-to-r from-accent/10 via-accent/5 to-transparent p-1">
                <CardHeader className="p-8 bg-transparent rounded-xl">
                  <CardTitle className="flex items-center gap-3 text-2xl font-bold text-white">
                    <div className="h-12 w-12 bg-accent rounded-xl flex items-center justify-center">
                      <User className="h-6 w-6 text-white" />
                    </div>
                    Información Básica
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8 bg-transparent rounded-xl space-y-6">
                  {/* Avatar Section */}
                  <div className="flex flex-col items-center gap-4 pb-6 border-b border-border/50">
                    <Avatar className="h-32 w-32 ring-4 ring-accent/50">
                      <AvatarImage
                        src={avatarUrl || ''}
                        key={avatarUrl} // Forzar re-render cuando cambie la URL
                        onError={(e) => {
                          // Si falla la carga, intentar recargar sin parámetros de caché
                          const target = e.target as HTMLImageElement;
                          if (avatarUrl) {
                            const baseUrl = avatarUrl.split('?')[0];
                            if (target.src !== baseUrl) {
                              target.src = baseUrl;
                            }
                          }
                        }}
                      />
                      <AvatarFallback className="bg-accent text-white text-3xl">
                        {profile.full_name?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-center gap-2">
                      <Label htmlFor="avatar-upload" className="cursor-pointer">
                        <div className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg transition-all duration-200">
                          {uploadingAvatar ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Subiendo...</span>
                            </>
                          ) : (
                            <>
                              <Camera className="h-4 w-4" />
                              <span>{avatarUrl ? 'Cambiar foto' : 'Subir foto'}</span>
                            </>
                          )}
                        </div>
                      </Label>
                      <Input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarSelect}
                        disabled={uploadingAvatar}
                      />
                      <p className="text-xs text-white/60 text-center">
                        JPG, PNG hasta 5MB. La imagen se recortará en formato cuadrado.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="full_name" className="text-base font-semibold text-white">
                      Nombre completo *
                    </Label>
                    <Input
                      id="full_name"
                      value={profile.full_name}
                      onChange={(e) => handleInputChange('full_name', e.target.value)}
                      placeholder="Tu nombre completo"
                      className="h-14 rounded-xl border-white/10 bg-white/5 text-white focus:border-[#00b3f3] transition-all duration-200 text-base"
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
                      className="h-14 rounded-xl border-white/10 bg-white/5 text-white focus:border-[#00b3f3] transition-all duration-200 text-base"
                    />
                    {subscription && subscription.status === 'active' && (
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="default" className="bg-accent text-accent-foreground">
                          <Crown className="h-3 w-3 mr-1" />
                          Plan {subscription.plan_name || 'Pro'} Activo
                        </Badge>
                      </div>
                    )}
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
                      className="h-14 rounded-xl border-white/10 bg-white/5 text-white focus:border-[#00b3f3] transition-all duration-200 text-base"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="bio" className="text-base font-semibold text-white">
                      Biografía Profesional
                    </Label>
                    <Textarea
                      id="bio"
                      value={profile.bio}
                      onChange={(e) => handleInputChange('bio', e.target.value)}
                      placeholder="Cuéntanos sobre tu experiencia como piloto..."
                      className="rounded-xl border-white/10 bg-white/5 text-white focus:border-[#00b3f3] transition-all duration-200 resize-none min-h-[120px] text-base"
                    />
                  </div>
                </CardContent>
              </div>
            </Card>

            {/* Location Information */}
            <Card className="bg-white/5 isolate border border-white/10 shadow-2xl rounded-3xl overflow-hidden hover:border-[#00b3f3]/30 transition-all duration-300">
              <div className="bg-gradient-to-r from-accent/10 via-accent/5 to-transparent p-1">
                <CardHeader className="p-8 bg-transparent rounded-xl">
                  <CardTitle className="flex items-center gap-3 text-2xl font-bold text-white">
                    <div className="h-12 w-12 bg-accent rounded-xl flex items-center justify-center">
                      <MapPin className="h-6 w-6 text-white" />
                    </div>
                    Ubicación y Zona de Trabajo
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8 bg-transparent rounded-xl space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="region" className="text-base font-semibold text-white">
                      Región *
                    </Label>
                    <Select value={profile.region} onValueChange={(value) => handleInputChange('region', value)}>
                      <SelectTrigger className="h-14 rounded-xl border-white/10 bg-white/5 text-white focus:border-[#00b3f3] transition-all duration-200 text-base">
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
                      <MapIcon className="h-5 w-5" />
                      Ciudad/Comuna
                    </Label>
                    <Input
                      id="location"
                      value={profile.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      placeholder="Ej: Santiago, Las Condes"
                      className="h-14 rounded-xl border-white/10 bg-white/5 text-white focus:border-[#00b3f3] transition-all duration-200 text-base"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="experience_years" className="text-sm font-semibold text-[#E0E0E0]">
                      Años de Experiencia
                    </Label>
                    <Input
                      id="experience_years"
                      type="number"
                      value={profile.experience_years}
                      onChange={(e) => handleInputChange('experience_years', parseInt(e.target.value))}
                      className="h-12 rounded-xl border-white/10 bg-white/5 text-white focus:border-[#00b3f3] transition-all duration-200"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="youtube_url" className="text-white/70 font-bold flex items-center gap-2">
                      <Youtube className="h-4 w-4 text-red-500" />
                      Canal de YouTube
                    </Label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <ExternalLink className="h-5 w-5 text-gray-400 group-hover:text-[#00b3f3] transition-colors" />
                      </div>
                      <Input
                        id="youtube_url"
                        placeholder="https://youtube.com/@tu_canal"
                        value={profile.youtube_url}
                        onChange={(e) => handleInputChange('youtube_url', e.target.value)}
                        className="bg-white/5 border-white/10 text-white rounded-xl pl-10"
                      />
                    </div>
                  </div>
                </CardContent>
              </div>
            </Card>

            {/* Specialties */}
            <Card className="bg-white/5 isolate border border-white/10 shadow-2xl rounded-3xl overflow-hidden hover:border-[#00b3f3]/30 transition-all duration-300">
              <div className="bg-gradient-to-r from-accent/10 via-accent/5 to-transparent p-1">
                <CardHeader className="p-8 bg-transparent rounded-xl">
                  <CardTitle className="flex items-center gap-3 text-2xl font-bold text-white">
                    <div className="h-12 w-12 bg-accent rounded-xl flex items-center justify-center">
                      <MapPin className="h-6 w-6 text-white" />
                    </div>
                    Especialidades
                  </CardTitle>
                  <CardDescription className="text-[#B0B0B0] font-medium">
                    Selecciona las áreas en las que tienes experiencia
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-8 bg-transparent rounded-xl space-y-6">
                  <div className="space-y-4">
                    {/* Especialidades predefinidas */}
                    <div className="flex flex-wrap gap-3">
                      {specialtyOptions.map((specialty) => (
                        <Badge
                          key={specialty}
                          variant={profile.specialties.includes(specialty) ? "default" : "outline"}
                          className={`cursor-pointer transition-all duration-200 px-4 py-2 rounded-xl font-medium ${profile.specialties.includes(specialty)
                            ? 'bg-[#00b3f3] text-white border-[#00b3f3] shadow-lg hover:shadow-xl hover:scale-105'
                            : 'bg-white/5 border-white/10 text-white hover:bg-[#00b3f3]/10 hover:border-[#00b3f3] hover:text-[#00b3f3]'
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
                              className="bg-[#00b3f3] text-white border-[#00b3f3] shadow-lg px-4 py-2 rounded-xl font-medium cursor-pointer hover:scale-105 transition-all duration-200 flex items-center gap-2 group"
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
                          className="bg-white/5 border-white/10 text-white focus:border-[#00b3f3] placeholder:text-white/40"
                        />
                        <Button
                          type="button"
                          onClick={addCustomSpecialty}
                          disabled={!customSpecialty.trim() || profile.specialties.includes(customSpecialty.trim())}
                          className="bg-[#00b3f3] hover:bg-[#00b3f3]/90 text-white disabled:opacity-50 disabled:cursor-not-allowed"
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
            <Card className="bg-white/5 isolate border border-white/10 shadow-2xl rounded-3xl overflow-hidden hover:border-[#00b3f3]/30 transition-all duration-300">
              <div className="bg-gradient-to-r from-accent/10 via-accent/5 to-transparent p-1">
                <CardHeader className="p-8 bg-transparent rounded-xl">
                  <CardTitle className="flex items-center gap-3 text-2xl font-bold text-white">
                    <div className="h-12 w-12 bg-accent rounded-xl flex items-center justify-center">
                      <Plane className="h-6 w-6 text-white" />
                    </div>
                    Tipos de Drones
                  </CardTitle>
                  <CardDescription className="text-[#B0B0B0] font-medium">
                    Selecciona los modelos de drones que estás habilitado para pilotear
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-8 bg-transparent rounded-xl space-y-6">
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

                    {/* Acordeones por nivel */}
                    <Accordion type="multiple" className="w-full space-y-2">
                      {/* Nivel Básico */}
                      <AccordionItem value="basic" className="border-[#333333]">
                        <AccordionTrigger className="text-[#E0E0E0] hover:text-[#00b3f3] hover:no-underline py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">🟢</span>
                            <span className="font-semibold">Nivel Básico/Principiante</span>
                            <Badge variant="outline" className="ml-2 text-xs border-white/10 text-white/50 bg-white/5">
                              {basicDrones.filter(d => profile.drone_types.includes(d)).length}/{basicDrones.length}
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-4">
                          <div className="flex flex-wrap gap-3">
                            {basicDrones.map((drone) => (
                              <Badge
                                key={drone}
                                variant={profile.drone_types.includes(drone) ? "default" : "outline"}
                                className={`cursor-pointer transition-all duration-200 px-4 py-2 rounded-xl font-medium ${profile.drone_types.includes(drone)
                                  ? 'bg-[#00b3f3] text-white border-[#00b3f3] shadow-lg hover:shadow-xl hover:scale-105'
                                  : 'bg-white/5 border-white/10 text-white hover:bg-[#00b3f3]/10 hover:border-[#00b3f3] hover:text-[#00b3f3]'
                                  }`}
                                onClick={() => toggleDroneType(drone)}
                              >
                                {drone}
                              </Badge>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      {/* Nivel Intermedio */}
                      <AccordionItem value="intermediate" className="border-[#333333]">
                        <AccordionTrigger className="text-[#E0E0E0] hover:text-[#00b3f3] hover:no-underline py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">🟡</span>
                            <span className="font-semibold">Nivel Intermedio</span>
                            <Badge variant="outline" className="ml-2 text-xs border-white/10 text-white/50 bg-white/5">
                              {intermediateDrones.filter(d => profile.drone_types.includes(d)).length}/{intermediateDrones.length}
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-4">
                          <div className="flex flex-wrap gap-3">
                            {intermediateDrones.map((drone) => (
                              <Badge
                                key={drone}
                                variant={profile.drone_types.includes(drone) ? "default" : "outline"}
                                className={`cursor-pointer transition-all duration-200 px-4 py-2 rounded-xl font-medium ${profile.drone_types.includes(drone)
                                  ? 'bg-[#00b3f3] text-white border-[#00b3f3] shadow-lg hover:shadow-xl hover:scale-105'
                                  : 'bg-white/5 border-white/10 text-white hover:bg-[#00b3f3]/10 hover:border-[#00b3f3] hover:text-[#00b3f3]'
                                  }`}
                                onClick={() => toggleDroneType(drone)}
                              >
                                {drone}
                              </Badge>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      {/* Nivel Profesional */}
                      <AccordionItem value="professional" className="border-[#333333]">
                        <AccordionTrigger className="text-[#E0E0E0] hover:text-[#00b3f3] hover:no-underline py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">🔴</span>
                            <span className="font-semibold">Nivel Profesional</span>
                            <Badge variant="outline" className="ml-2 text-xs border-white/10 text-white/50 bg-white/5">
                              {professionalDrones.filter(d => profile.drone_types.includes(d)).length}/{professionalDrones.length}
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-4">
                          <div className="flex flex-wrap gap-3">
                            {professionalDrones.map((drone) => (
                              <Badge
                                key={drone}
                                variant={profile.drone_types.includes(drone) ? "default" : "outline"}
                                className={`cursor-pointer transition-all duration-200 px-4 py-2 rounded-xl font-medium ${profile.drone_types.includes(drone)
                                  ? 'bg-[#00b3f3] text-white border-[#00b3f3] shadow-lg hover:shadow-xl hover:scale-105'
                                  : 'bg-[#2C2C2C] border-[#333333] text-[#E0E0E0] hover:bg-[#00b3f3]/10 hover:border-[#00b3f3] hover:text-[#00b3f3]'
                                  }`}
                                onClick={() => toggleDroneType(drone)}
                              >
                                {drone}
                              </Badge>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>

                    {/* Drones personalizados agregados */}
                    {profile.drone_types.filter(isCustomDrone).length > 0 && (
                      <div className="pt-4 border-t border-[#333333]">
                        <Label className="text-[#B0B0B0] text-sm mb-3 block font-medium">
                          Modelos personalizados:
                        </Label>
                        <div className="flex flex-wrap gap-3">
                          {profile.drone_types.filter(isCustomDrone).map((drone) => (
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

                    {/* Campo para agregar otro modelo de drone */}
                    <div className="pt-4 border-t border-[#333333]">
                      <Label htmlFor="custom-drone" className="text-[#E0E0E0] text-sm mb-2 block font-medium">
                        Otra
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="custom-drone"
                          type="text"
                          value={customDrone}
                          onChange={(e) => handleCustomDrone(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addCustomDrone();
                            }
                          }}
                          placeholder="Escribe otro modelo de drone..."
                          className="bg-white/5 border-white/10 text-white focus:border-[#00b3f3] placeholder:text-white/30"
                        />
                        <Button
                          type="button"
                          onClick={addCustomDrone}
                          disabled={!customDrone.trim() || profile.drone_types.includes(customDrone.trim())}
                          className="bg-[#00b3f3] hover:bg-[#0099cc] text-white disabled:opacity-50"
                        >
                          Agregar
                        </Button>
                      </div>
                      <p className="text-xs text-[#B0B0B0] mt-2">
                        Presiona Enter o haz clic en "Agregar" para incluir tu modelo de drone personalizado
                      </p>
                    </div>
                  </div>
                </CardContent>
              </div>
            </Card>

            {/* URL Personalizada del Perfil Público */}
            <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl overflow-hidden hover:border-[#00b3f3]/30 transition-all duration-300">
              <div className="bg-gradient-to-r from-accent/10 via-accent/5 to-transparent p-1">
                <CardHeader className="p-8 bg-transparent rounded-xl">
                  <CardTitle className="flex items-center justify-between gap-3 text-2xl font-bold text-white">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 bg-accent rounded-xl flex items-center justify-center">
                        <Crown className="h-6 w-6 text-white" />
                      </div>
                      URL Personalizada del Perfil Público
                    </div>
                    {!subscription && (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 flex items-center gap-1.5 px-3 py-1">
                        <LockIcon className="h-3.5 w-3.5" />
                        Función Pro
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="text-[#B0B0B0] font-medium">
                    Personaliza la URL de tu perfil público para que sea más fácil de compartir.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-8 bg-transparent rounded-xl space-y-6">
                  <div className="space-y-4">
                    {/* Mensaje de advertencia */}
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-amber-400 mb-1">
                            ⚠️ Importante sobre cambios de URL
                          </p>
                          <p className="text-sm text-amber-300/90 leading-relaxed">
                            Es importante que no realices cambios periódicos de tu URL personalizada, ya que esto puede perjudicar tus futuros leads o contactos de negocio.
                            Si cambias tu URL, los enlaces antiguos seguirán funcionando, pero es recomendable mantener una URL estable para facilitar que los clientes te encuentren.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="public_profile_slug" className="text-[#E0E0E0] font-medium flex items-center gap-2">
                        <LinkIcon className="h-4 w-4" />
                        Nombre de usuario para tu perfil
                      </Label>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                        <div className="relative flex-1">
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#B0B0B0] text-sm">
                            /
                          </div>
                          <Input
                            id="public_profile_slug"
                            type="text"
                            value={profile.public_profile_slug || ''}
                            onChange={(e) => handleSlugChange(e.target.value)}
                            disabled={!subscription}
                            className={`bg-white/5 border-white/10 text-white focus:border-[#00b3f3] placeholder:text-white/40 pl-8 ${!subscription ? 'opacity-50 cursor-not-allowed' : ''}`}
                            placeholder={subscription ? "nombreusuario" : "Disponible en Plan Alumno Academia"}
                          />
                          {checkingSlug && (
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                              <Loader2 className="h-4 w-4 animate-spin text-[#B0B0B0]" />
                            </div>
                          )}
                          {!checkingSlug && profile.public_profile_slug && slugAvailable !== null && (
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                              {slugAvailable ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <X className="h-4 w-4 text-red-500" />
                              )}
                            </div>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleSlugVerification}
                          disabled={checkingSlug || !profile.public_profile_slug || !subscription}
                          className="sm:w-auto w-full bg-[#00b3f3] hover:bg-[#00b3f3]/90 text-white border-[#00b3f3] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {checkingSlug ? (
                            <span className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Verificando...
                            </span>
                          ) : (
                            'Verificar disponibilidad'
                          )}
                        </Button>
                      </div>
                      {slugFeedback && (
                        <p
                          className={`text-xs flex items-center gap-1 mt-2 ${slugFeedback.type === 'success' ? 'text-green-400' : 'text-red-400'
                            }`}
                        >
                          {slugFeedback.type === 'success' ? (
                            <CheckCircle className="h-3 w-3" />
                          ) : (
                            <AlertCircle className="h-3 w-3" />
                          )}
                          {slugFeedback.text}
                        </p>
                      )}
                      {checkingSlug && (
                        <p className="text-xs text-[#B0B0B0] flex items-center gap-1 mt-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Verificando disponibilidad...
                        </p>
                      )}
                      {!subscription && (
                        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                          <p className="text-xs text-blue-400 font-medium leading-relaxed">
                            🚀 La URL personalizada es un beneficio exclusivo del Plan Alumno Academia.
                            Mejora tu cuenta para poder elegir cómo se verá tu link profesional.
                          </p>
                        </div>
                      )}
                      <p className="text-xs text-[#B0B0B0]">
                        Solo letras minúsculas, números, guiones y guiones bajos. Mínimo 3 caracteres, máximo 30.
                      </p>
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
                  <div className="inline-flex items-center gap-2 px-5 py-3 bg-transparent border-2 border-accent text-accent rounded-xl text-base font-semibold shadow-lg">
                    <div className="h-2.5 w-2.5 bg-amber-500 rounded-full animate-pulse"></div>
                    Tienes cambios sin guardar
                  </div>
                </div>
              )}

              {lastSaved && !hasChanges && (
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 px-5 py-3 bg-transparent border-2 border-green-500 text-green-400 rounded-xl text-base font-semibold shadow-lg">
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
          </>
        )}

        {/* Image Cropper Modal */}
        {imageToCrop && (
          <ImageCropper
            open={cropperOpen}
            onOpenChange={setCropperOpen}
            imageSrc={imageToCrop}
            onCropComplete={handleAvatarCropComplete}
            aspect={1}
            title="Recortar foto de perfil"
          />
        )}
      </div>
    </div>
  );
};

export default PilotProfile;
