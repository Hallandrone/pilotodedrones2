import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import Logo from "@/components/ui/logo";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileText, Check, Clock, X, CreditCard, Calendar, Phone, Mail, MapPin, Shield, Eye, AlertCircle, Link, Crown, Loader2, CheckCircle, Camera, Save } from "lucide-react";
import { ImageCropper } from "@/components/ui/ImageCropper";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { User } from '@supabase/supabase-js';
import { useNavigate, useLocation } from 'react-router-dom';
import { getBaseUrlClean } from "@/lib/getBaseUrl";

// Types
interface ProfileData {
  full_name: string;
  email: string;
  phone?: string;
  address?: string;
  instagram_username?: string;
  linkedin_username?: string;
  instagram_url?: string;
  linkedin_url?: string;
  public_profile_slug?: string;
}

interface Certification {
  id: string;
  file_name: string;
  file_url: string;
  status: 'pending' | 'approved' | 'rejected' | 'validated';
  uploaded_at: string;
  rejection_observations?: string | null;
}

interface FlightLog {
  id: string;
  file_name: string;
  file_url: string;
  status: 'pending' | 'validated' | 'rejected';
  uploaded_at: string;
  rejection_observations?: string | null;
  flight_hours?: number | null;
  flight_date?: string | null;
  duration_hours?: number | null;
  location?: string | null;
  purpose?: string | null;
  notes?: string | null;
}

interface Subscription {
  plan_name: string;
  status: 'active' | 'inactive' | 'expired';
  renewal_date: string;
  payment_method: string;
}

const purposeOptions = [
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
  'Mapeo 3D',
  'Entrenamiento',
  'Pruebas de Equipos',
  'Otro'
];

const appBaseUrl = getBaseUrlClean();

const UserProfile = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [profile, setProfile] = useState<ProfileData>({
    full_name: '',
    email: '',
    phone: '',
    address: '',
    instagram_username: '',
    linkedin_username: '',
    instagram_url: '',
    linkedin_url: '',
    public_profile_slug: ''
  });
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [flightLogs, setFlightLogs] = useState<FlightLog[]>([]);
  const [uploadingFlightLog, setUploadingFlightLog] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugFeedback, setSlugFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [useInstagramUrl, setUseInstagramUrl] = useState(false);
  const [useLinkedInUrl, setUseLinkedInUrl] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    // Configurar Realtime subscription para escuchar cambios en tiempo real
    const channel = supabase
      .channel('user-certifications-realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // Escuchar INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'user_certifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Certification change detected in user profile:', payload);

          // Si es una actualización, actualizar el certificado específico
          if (payload.eventType === 'UPDATE' && payload.new) {
            console.log('Actualizando certificado en tiempo real:', payload.new);
            setCertifications(prev => prev.map(cert => {
              if (cert.id === payload.new.id) {
                const updatedCert = {
                  ...cert,
                  status: payload.new.status as 'pending' | 'approved' | 'rejected',
                  rejection_observations: payload.new.rejection_observations || null
                };
                console.log('Certificado actualizado:', updatedCert);
                return updatedCert;
              }
              return cert;
            }));

            // Mostrar notificación si fue rechazado
            if (payload.new.status === 'rejected' && payload.new.rejection_observations) {
              toast({
                title: "Certificado rechazado",
                description: "Tu certificado ha sido rechazado. Revisa las observaciones.",
                variant: "destructive",
              });
            } else if (payload.new.status === 'validated') {
              toast({
                title: "Certificado aprobado",
                description: "Tu certificado ha sido validado exitosamente",
              });
            }
          } else if (payload.eventType === 'INSERT' && payload.new) {
            // Agregar nuevo certificado
            setCertifications(prev => [...prev, {
              id: payload.new.id,
              file_name: payload.new.file_name,
              file_url: payload.new.file_url,
              status: payload.new.status as 'pending' | 'approved' | 'rejected',
              uploaded_at: payload.new.uploaded_at,
              rejection_observations: payload.new.rejection_observations || null
            }]);
          } else if (payload.eventType === 'DELETE' && payload.old) {
            // Eliminar certificado
            setCertifications(prev => prev.filter(cert => cert.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, toast]);

  useEffect(() => {
    if (!user?.id) return;

    // Configurar Realtime subscription para escuchar cambios en flight logs
    const flightLogsChannel = supabase
      .channel('user-flight-logs-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'flight_logs',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Flight log change detected in user profile:', payload);

          if (payload.eventType === 'UPDATE' && payload.new) {
            setFlightLogs(prev => prev.map(log => {
              if (log.id === payload.new.id) {
                return {
                  ...log,
                  status: payload.new.status as 'pending' | 'validated' | 'rejected',
                  rejection_observations: payload.new.rejection_observations || null,
                  flight_hours: payload.new.flight_hours || null
                };
              }
              return log;
            }));

            if (payload.new.status === 'rejected' && payload.new.rejection_observations) {
              toast({
                title: "Vitacora rechazada",
                description: "Tu vitacora ha sido rechazada. Revisa las observaciones.",
                variant: "destructive",
              });
            } else if (payload.new.status === 'validated') {
              toast({
                title: "Vitacora validada",
                description: "Tu vitacora ha sido validada exitosamente",
              });
            }
          } else if (payload.eventType === 'INSERT' && payload.new) {
            setFlightLogs(prev => [...prev, {
              id: payload.new.id,
              file_name: payload.new.file_name,
              file_url: payload.new.file_url,
              status: payload.new.status as 'pending' | 'validated' | 'rejected',
              uploaded_at: payload.new.uploaded_at,
              rejection_observations: payload.new.rejection_observations || null,
              flight_hours: payload.new.flight_hours || null
            }]);
          } else if (payload.eventType === 'DELETE' && payload.old) {
            setFlightLogs(prev => prev.filter(log => log.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(flightLogsChannel);
    };
  }, [user?.id, toast]);

  const loadUserData = async () => {
    try {
      setLoading(true);

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('Error getting user:', userError);
        setLoading(false);
        return;
      }

      if (!user) {
        setLoading(false);
        return;
      }

      setUser(user);

      // Get user role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (roleError && roleError.code !== 'PGRST116') {
        // PGRST116 es "no rows returned", que es normal si no tiene rol aún
        console.error('Error loading role:', roleError);
      }

      if (roleData) {
        setUserRole(roleData.role);

        // If super admin, don't load personal profile data
        if (roleData.role === 'super_admin') {
          setLoading(false);
          return;
        }
      } else {
        // Si no tiene rol, establecer un rol vacío para que pueda ver el perfil
        setUserRole('');
      }

      // Load profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        // PGRST116 es "no rows returned", que es normal si no tiene perfil aún
        console.error('Error loading profile:', profileError);
      }

      if (profileData) {
        // Detectar si hay URLs completas para activar los toggles
        const hasInstagramUrl = !!(profileData.instagram_url);
        const hasLinkedInUrl = !!(profileData.linkedin_url);

        setProfile({
          full_name: profileData.full_name || '',
          email: profileData.email || user.email || '',
          phone: profileData.phone || '',
          address: profileData.location || '',
          instagram_username: profileData.instagram_username || '',
          linkedin_username: profileData.linkedin_username || '',
          instagram_url: profileData.instagram_url || '',
          linkedin_url: profileData.linkedin_url || '',
          public_profile_slug: profileData.public_profile_slug || ''
        });

        setUseInstagramUrl(hasInstagramUrl);
        setUseLinkedInUrl(hasLinkedInUrl);
        setAvatarUrl(profileData.avatar_url || null);

        if (profileData.public_profile_slug) {
          setSlugAvailable(true);
          setSlugFeedback({
            type: 'success',
            text: `Tu perfil público actual es ${appBaseUrl}/${profileData.public_profile_slug}`
          });
        } else {
          setSlugAvailable(null);
          setSlugFeedback(null);
        }
      } else {
        // Si no hay perfil, establecer valores por defecto
        setProfile({
          full_name: '',
          email: user.email || '',
          phone: '',
          address: '',
          instagram_username: '',
          linkedin_username: '',
          instagram_url: '',
          linkedin_url: '',
          public_profile_slug: ''
        });
        setSlugAvailable(null);
        setSlugFeedback(null);
      }

      // Load certifications
      const { data: certsData, error: certsError } = await supabase
        .from('user_certifications')
        .select('id, file_name, file_url, status, uploaded_at, rejection_observations')
        .eq('user_id', user.id);

      if (certsError) {
        console.error('Error loading certifications:', certsError);
      }

      if (certsData) {
        console.log('Certificaciones cargadas:', certsData);
        setCertifications(certsData.map(cert => ({
          id: cert.id,
          file_name: cert.file_name,
          file_url: cert.file_url,
          status: cert.status as 'pending' | 'approved' | 'rejected',
          uploaded_at: cert.uploaded_at,
          rejection_observations: cert.rejection_observations || null
        })));
      }

      // Load flight logs
      const { data: logsData, error: logsError } = await supabase
        .from('flight_logs')
        .select('id, file_name, file_url, status, uploaded_at, rejection_observations, flight_hours, flight_date, duration_hours, location, purpose, notes')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false });

      if (logsError) {
        console.error('Error loading flight logs:', logsError);
      }

      if (logsData) {
        setFlightLogs(logsData.map(log => ({
          id: log.id,
          file_name: log.file_name,
          file_url: log.file_url,
          status: log.status as 'pending' | 'validated' | 'rejected',
          uploaded_at: log.uploaded_at,
          rejection_observations: log.rejection_observations || null,
          flight_hours: log.flight_hours || null,
          flight_date: log.flight_date,
          duration_hours: log.duration_hours,
          location: log.location,
          purpose: log.purpose,
          notes: log.notes
        })));
      }

      // Load subscription data
      const { data: subData, error: subError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle(); // Usa maybeSingle() para evitar error 406 cuando no hay datos

      if (subError && subError.code !== 'PGRST116') {
        console.error('Error loading subscription:', subError);
      }

      if (subData) {
        setSubscription({
          plan_name: subData.plan_name,
          status: subData.status as 'active' | 'inactive' | 'expired',
          renewal_date: subData.renewal_date,
          payment_method: subData.payment_method || 'No especificado'
        });
      }

    } catch (error) {
      console.error('Error loading user data:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos del usuario",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Function to clean social media username (remove @, URLs, etc.)
  const cleanSocialUsername = (input: string): string => {
    if (!input) return '';

    let cleaned = input.trim();

    // Remove common URL patterns
    cleaned = cleaned.replace(/^https?:\/\//, '');
    cleaned = cleaned.replace(/^www\./, '');
    cleaned = cleaned.replace(/^instagram\.com\//, '');
    cleaned = cleaned.replace(/^linkedin\.com\//, '');
    cleaned = cleaned.replace(/^linkedin\.com\/in\//, '');
    cleaned = cleaned.replace(/^\/in\//, ''); // Handle /in/username pattern

    // Remove @ symbol
    cleaned = cleaned.replace(/^@/, '');

    // Remove trailing slashes and query parameters
    cleaned = cleaned.split('/')[0].split('?')[0].split('#')[0];

    // Only allow alphanumeric, dots, underscores, and hyphens
    cleaned = cleaned.replace(/[^a-zA-Z0-9._-]/g, '');

    return cleaned;
  };

  // Function to extract username from Instagram URL
  const extractInstagramUsername = (url: string): string => {
    if (!url) return '';
    let cleaned = url.trim();
    cleaned = cleaned.replace(/^https?:\/\//, '');
    cleaned = cleaned.replace(/^www\./, '');
    cleaned = cleaned.replace(/^instagram\.com\//, '');
    cleaned = cleaned.split('/')[0].split('?')[0].split('#')[0];
    return cleaned.replace(/^@/, '');
  };

  // Function to extract username from LinkedIn URL
  const extractLinkedInUsername = (url: string): string => {
    if (!url) return '';
    let cleaned = url.trim();
    cleaned = cleaned.replace(/^https?:\/\//, '');
    cleaned = cleaned.replace(/^www\./, '');
    cleaned = cleaned.replace(/^linkedin\.com\/in\//, '');
    cleaned = cleaned.replace(/^linkedin\.com\//, '');
    cleaned = cleaned.replace(/^\/in\//, '');
    cleaned = cleaned.split('/')[0].split('?')[0].split('#')[0];
    return cleaned;
  };

  // Function to check if input is a URL
  const isUrl = (input: string): boolean => {
    if (!input) return false;
    return /^https?:\/\//i.test(input.trim());
  };

  // Function to build Instagram URL from username
  const buildInstagramUrl = (username: string): string => {
    if (!username) return '';
    const cleaned = cleanSocialUsername(username);
    return cleaned ? `https://instagram.com/${cleaned}` : '';
  };

  // Function to build LinkedIn URL from username
  const buildLinkedInUrl = (username: string): string => {
    if (!username) return '';
    const cleaned = cleanSocialUsername(username);
    return cleaned ? `https://linkedin.com/in/${cleaned}` : '';
  };

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
    if (!slug || !user?.id) return false;

    try {
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
      if (!user) return;

      // Convertir la URL del blob a File
      const response = await fetch(croppedImageUrl);
      const blob = await response.blob();
      const file = new File([blob], `avatar-${user.id}.jpg`, { type: 'image/jpeg' });

      // Subir a Supabase Storage
      const filePath = `${user.id}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Actualizar perfil
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      toast({
        title: "Avatar actualizado",
        description: "Tu foto de perfil ha sido actualizada correctamente",
      });
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Error",
        description: "No se pudo subir el avatar. Intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setUploadingAvatar(false);
      setCropperOpen(false);
      setImageToCrop(null);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    // Basic validation
    if (!profile.full_name.trim()) {
      toast({
        title: "Error",
        description: "El nombre es obligatorio",
        variant: "destructive",
      });
      return;
    }

    // Validate slug if provided
    if (profile.public_profile_slug) {
      const validation = validateSlug(profile.public_profile_slug);
      if (!validation.valid) {
        setSlugAvailable(false);
        setSlugFeedback({
          type: 'error',
          text: validation.error || 'El formato del nombre no es válido'
        });
        toast({
          title: "Slug inválido",
          description: validation.error || "El formato del slug no es válido",
          variant: "destructive",
        });
        return;
      }

      // Final availability check before saving
      const available = await checkSlugAvailability(profile.public_profile_slug);
      if (!available) {
        setSlugAvailable(false);
        setSlugFeedback({
          type: 'error',
          text: 'Este nombre ya está en uso. Por favor, elige otro.'
        });
        toast({
          title: "Slug no disponible",
          description: "Este nombre de usuario ya está en uso. Por favor, elige otro.",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      setSaving(true);

      // Procesar Instagram: construir URL completa según el modo
      let instagramUrlFinal = null;
      let instagramUsernameFinal = null;

      if (useInstagramUrl && profile.instagram_url) {
        // Modo URL completa: guardar URL y extraer username como respaldo
        instagramUrlFinal = profile.instagram_url.trim();
        instagramUsernameFinal = extractInstagramUsername(profile.instagram_url);
      } else if (profile.instagram_username) {
        // Modo alias: construir URL completa y guardar username
        const cleaned = cleanSocialUsername(profile.instagram_username);
        instagramUsernameFinal = cleaned;
        instagramUrlFinal = buildInstagramUrl(cleaned);
      }

      // Procesar LinkedIn: construir URL completa según el modo
      let linkedinUrlFinal = null;
      let linkedinUsernameFinal = null;

      if (useLinkedInUrl && profile.linkedin_url) {
        // Modo URL completa: guardar URL y extraer username como respaldo
        linkedinUrlFinal = profile.linkedin_url.trim();
        linkedinUsernameFinal = extractLinkedInUsername(profile.linkedin_url);
      } else if (profile.linkedin_username) {
        // Modo alias: construir URL completa y guardar username
        const cleaned = cleanSocialUsername(profile.linkedin_username);
        linkedinUsernameFinal = cleaned;
        linkedinUrlFinal = buildLinkedInUrl(cleaned);
      }

      // Clean slug
      const cleanedSlug = profile.public_profile_slug
        ? cleanSlug(profile.public_profile_slug)
        : null;

      // Check if slug has changed and update history
      if (cleanedSlug) {
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('public_profile_slug')
          .eq('id', user.id)
          .single();

        const oldSlug = currentProfile?.public_profile_slug;
        const newSlug = cleanedSlug;

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
      }

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: profile.full_name.trim(),
          email: profile.email,
          phone: profile.phone || null,
          location: profile.address || null,
          instagram_username: instagramUsernameFinal || null,
          linkedin_username: linkedinUsernameFinal || null,
          instagram_url: instagramUrlFinal || null,
          linkedin_url: linkedinUrlFinal || null,
          public_profile_slug: cleanedSlug || null,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "Perfil actualizado",
        description: cleanedSlug
          ? `Tu perfil público está disponible en: ${appBaseUrl}/${cleanedSlug}`
          : "Tus datos han sido guardados correctamente",
      });

      if (cleanedSlug) {
        setSlugAvailable(true);
        setSlugFeedback({
          type: 'success',
          text: `Tu perfil público está disponible en ${appBaseUrl}/${cleanedSlug}`
        });
      } else {
        setSlugAvailable(null);
        setSlugFeedback(null);
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar el perfil",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    const allowedTypes = ['.pdf', '.jpg', '.jpeg', '.png'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!allowedTypes.includes(fileExtension)) {
      toast({
        title: "Archivo no válido",
        description: "Solo se permiten archivos PDF, JPG, JPEG y PNG",
        variant: "destructive",
      });
      return;
    }

    try {
      // Upload file to Supabase Storage
      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('certifications')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Save certification record with file path
      const { error: dbError } = await supabase
        .from('user_certifications')
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_url: fileName, // Store the path, not a URL
          status: 'pending'
        });

      if (dbError) throw dbError;

      // Update local state
      const newCert: Certification = {
        id: Date.now().toString(), // Temporal ID
        file_name: file.name,
        file_url: fileName,
        status: 'pending',
        uploaded_at: new Date().toISOString()
      };

      setCertifications(prev => [...prev, newCert]);

      toast({
        title: "Certificación subida",
        description: "Tu certificación ha sido enviada para revisión",
      });

    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Error",
        description: "No se pudo subir el archivo",
        variant: "destructive",
      });
    }

    // Reset file input
    event.target.value = '';
  };

  const handleDeleteCertification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('user_certifications')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setCertifications(prev => prev.filter(cert => cert.id !== id));

      toast({
        title: "Certificación eliminada",
        description: "La certificación ha sido eliminada correctamente",
      });
    } catch (error) {
      console.error('Error deleting certification:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la certificación",
        variant: "destructive",
      });
    }
  };

  // Función simple para subir certificados/registros de vuelo (sin formulario)
  const handleFlightLogFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    const allowedTypes = ['.pdf', '.jpg', '.jpeg', '.png'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!allowedTypes.includes(fileExtension)) {
      toast({
        title: "Archivo no válido",
        description: "Solo se permiten archivos PDF, JPG, JPEG y PNG",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Archivo muy grande",
        description: "El archivo no debe exceder 10MB",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploadingFlightLog(true);

      // Upload file to Supabase Storage
      const fileName = `${user.id}/logs/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('flight-logs')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Save flight log record (sin metadatos, solo el archivo)
      const { data, error: dbError } = await supabase
        .from('flight_logs')
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_url: fileName,
          status: 'pending'
        })
        .select();

      if (dbError) throw dbError;

      // Update local state
      if (data && data.length > 0) {
        const newLog: FlightLog = {
          id: data[0].id,
          file_name: data[0].file_name,
          file_url: data[0].file_url,
          status: data[0].status as 'pending' | 'validated' | 'rejected',
          uploaded_at: data[0].uploaded_at,
          rejection_observations: data[0].rejection_observations || null,
          flight_hours: data[0].flight_hours || null,
          flight_date: data[0].flight_date,
          duration_hours: data[0].duration_hours,
          location: data[0].location,
          purpose: data[0].purpose,
          notes: data[0].notes
        };

        setFlightLogs(prev => [newLog, ...prev]);
      } else {
        await loadUserData();
      }

      toast({
        title: "Archivo subido",
        description: "Tu certificado o registro de vuelo ha sido enviado para revisión",
      });

    } catch (error) {
      console.error('Error uploading flight log file:', error);
      toast({
        title: "Error",
        description: "No se pudo subir el archivo",
        variant: "destructive",
      });
    } finally {
      setUploadingFlightLog(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleDeleteFlightLog = async (id: string) => {
    try {
      // Get the flight log to delete the file
      const logToDelete = flightLogs.find(log => log.id === id);

      if (logToDelete) {
        // Delete file from storage
        const { error: storageError } = await supabase.storage
          .from('flight-logs')
          .remove([logToDelete.file_url]);

        if (storageError) {
          console.error('Error deleting file from storage:', storageError);
        }
      }

      // Delete record from database
      const { error } = await supabase
        .from('flight_logs')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setFlightLogs(prev => prev.filter(log => log.id !== id));

      toast({
        title: "Vitacora eliminada",
        description: "La vitacora ha sido eliminada correctamente",
      });
    } catch (error) {
      console.error('Error deleting flight log:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la vitacora",
        variant: "destructive",
      });
    }
  };

  const handleViewFlightLog = async (id: string) => {
    try {
      const log = flightLogs.find(l => l.id === id);
      if (!log) return;

      // Get signed URL for the file
      const { data, error } = await supabase.storage
        .from('flight-logs')
        .createSignedUrl(log.file_url, 3600); // 1 hour expiration

      if (error) throw error;

      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      console.error('Error viewing flight log:', error);
      toast({
        title: "Error",
        description: "No se pudo abrir la vitacora",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
      case 'validated': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'expired': return 'bg-red-100 text-red-800 border-red-200';
      case 'inactive': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
      case 'validated': return <Check className="h-3 w-3" />;
      case 'rejected': return <X className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
      case 'validated': return 'Validado';
      case 'rejected': return 'Rechazado';
      case 'active': return 'Activo';
      case 'expired': return 'Expirado';
      case 'inactive': return 'Inactivo';
      default: return 'Pendiente';
    }
  };

  const getSignedUrl = async (filePath: string): Promise<string> => {
    // Check if filePath is already a full URL or a path
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      // Already a full URL, return as is
      return filePath;
    }

    // It's a path, create signed URL
    const { data, error } = await supabase.storage
      .from('certifications')
      .createSignedUrl(filePath, 3600); // 1 hour expiration

    if (error) {
      console.error('Error creating signed URL:', error);
      throw error;
    }

    return data.signedUrl;
  };

  const handleViewCertification = async (certId: string) => {
    try {
      const cert = certifications.find(c => c.id === certId);
      if (!cert) return;

      const signedUrl = await getSignedUrl(cert.file_url);
      window.open(signedUrl, '_blank');
    } catch (error) {
      console.error('Error viewing certification:', error);
      toast({
        title: "Error",
        description: "No se pudo abrir el certificado",
        variant: "destructive",
      });
    }
  };

  const isLoading = loading;

  return (
    <div className="min-h-screen bg-[#020617] text-white font-inter relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjAzIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20 pointer-events-none"></div>

      <div className="container mx-auto px-4 py-8 max-w-5xl relative z-10">
        {isLoading ? (
          <div className="space-y-8">
            <div className="mb-12 flex flex-col sm:flex-row items-center gap-6">
              <Skeleton className="h-28 w-28 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-6 w-96" />
              </div>
            </div>
            <Card className="bg-[#0f172a]/95 border border-white/10 p-8 space-y-8">
              <div className="flex flex-col items-center gap-6">
                <Skeleton className="h-40 w-40 rounded-full" />
                <Skeleton className="h-12 w-48 rounded-xl" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-14 w-full rounded-xl" />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        ) : !user ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <Card className="max-w-md w-full bg-white/10 backdrop-blur-xl border-2 border-[#00b3f3]/30 shadow-2xl rounded-3xl relative z-10">
              <CardHeader>
                <CardTitle className="text-center text-white text-3xl font-bold tracking-tight">No autenticado</CardTitle>
              </CardHeader>
              <CardContent className="text-center text-white/70 space-y-6">
                <p className="text-lg">Por favor, inicia sesión para gestionar tu información profesional.</p>
                <Button
                  onClick={() => navigate('/auth')}
                  className="w-full bg-[#00b3f3] hover:bg-[#0099cc] text-white font-bold h-12 rounded-xl shadow-lg hover:shadow-[#00b3f3]/20 transition-all"
                >
                  Iniciar Sesión
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : userRole === 'super_admin' ? (
          <div className="text-center py-20">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Acceso Restringido</h1>
              <p className="text-white/60">Los super administradores no tienen perfil personal</p>
            </div>
            <Card className="max-w-md mx-auto shadow-md border-0 bg-white/5 backdrop-blur-sm p-8">
              <Shield className="h-12 w-12 text-[#00b3f3] mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Panel de Administración</h3>
              <p className="text-sm text-white/60 mb-6">
                Como super administrador, utiliza las herramientas de gestión disponibles en el panel principal.
              </p>
              <Button
                onClick={() => window.history.back()}
                className="bg-[#00b3f3] hover:bg-[#0099cc] text-white w-full"
              >
                Volver al Dashboard
              </Button>
            </Card>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="mb-12 flex flex-col sm:flex-row items-center gap-6 animate-fade-in">
              <Logo size="xl" className="hover:scale-110 transition-all duration-300 filter drop-shadow-[0_0_15px_rgba(0,179,243,0.4)] md:[&>div]:h-28 md:[&>div]:w-28" showText={false} />
              <div className="text-center sm:text-left">
                <h1 className="text-4xl sm:text-5xl font-bold text-white mb-2 tracking-tight">Mi Perfil</h1>
                <p className="text-[#00b3f3] text-lg font-medium">Gestiona tu información personal y certificaciones</p>
              </div>
            </div>

            <div className="grid gap-6">
              {/* Personal Information */}
              <Card className="bg-[#0f172a]/95 isolate border border-white/10 shadow-2xl rounded-3xl overflow-hidden hover:border-[#00b3f3]/30 transition-all duration-300 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                <CardHeader className="p-8 bg-transparent">
                  <CardTitle className="flex items-center gap-3 text-white text-3xl font-bold">
                    <div className="h-12 w-12 rounded-xl bg-[#00b3f3] flex items-center justify-center shadow-[0_0_15px_rgba(0,179,243,0.4)]">
                      <Mail className="h-6 w-6 text-white" />
                    </div>
                    Información Personal
                  </CardTitle>
                  <CardDescription className="text-white/70 text-lg mt-2">
                    Actualiza tu información básica de contacto
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-8 pt-0">
                  {/* Avatar Section */}
                  <div className="flex flex-col items-center gap-6 pb-8 mb-8 border-b border-white/10">
                    <Avatar className="h-40 w-40 ring-4 ring-[#00b3f3]/50 shadow-2xl">
                      <AvatarImage src={avatarUrl || ''} className="object-cover" />
                      <AvatarFallback className="bg-gradient-to-br from-[#00b3f3] to-[#0099cc] text-white text-4xl font-bold">
                        {profile.full_name?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-center gap-2">
                      <Label htmlFor="avatar-upload" className="cursor-pointer">
                        <div className="flex items-center gap-2 px-6 py-3 bg-[#00b3f3] hover:bg-[#0099cc] text-white rounded-xl transition-all duration-300 font-bold shadow-lg hover:shadow-[#00b3f3]/20 hover:scale-105">
                          {uploadingAvatar ? (
                            <>
                              <Loader2 className="h-5 w-5 animate-spin" />
                              <span>Subiendo...</span>
                            </>
                          ) : (
                            <>
                              <Camera className="h-5 w-5" />
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
                      <p className="text-xs text-muted-foreground text-center">
                        JPG, PNG hasta 5MB. La imagen se recortará en formato cuadrado.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="full_name" className="text-foreground font-medium">
                        Nombre completo *
                      </Label>
                      <Input
                        id="full_name"
                        type="text"
                        value={profile.full_name}
                        onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
                        className="h-14 rounded-xl border-white/10 bg-white/5 text-white focus:border-[#00b3f3] transition-all duration-200 text-lg"
                        placeholder="Tu nombre completo"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-white font-semibold">
                        Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={profile.email}
                        onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                        className="h-14 rounded-xl border-white/10 bg-white/5 text-white/50 focus:border-[#00b3f3] transition-all duration-200 text-lg cursor-not-allowed"
                        placeholder="tu@email.com"
                        disabled
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-white font-semibold">
                        <Phone className="inline h-5 w-5 mr-2 text-[#00b3f3]" />
                        Teléfono
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={profile.phone}
                        onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                        className="h-14 rounded-xl border-white/10 bg-white/5 text-white focus:border-[#00b3f3] transition-all duration-200 text-lg"
                        placeholder="+56 9 1234 5678"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address" className="text-white font-semibold">
                        <MapPin className="inline h-5 w-5 mr-2 text-[#00b3f3]" />
                        Dirección
                      </Label>
                      <Input
                        id="address"
                        type="text"
                        value={profile.address}
                        onChange={(e) => setProfile(prev => ({ ...prev, address: e.target.value }))}
                        className="h-14 rounded-xl border-white/10 bg-white/5 text-white focus:border-[#00b3f3] transition-all duration-200 text-lg"
                        placeholder="Tu dirección"
                      />
                    </div>

                    {/* Redes Sociales */}
                    <div className="space-y-4 pt-8 border-t border-white/10">
                      <div className="mb-6">
                        <h3 className="text-2xl font-bold text-white mb-2">Redes Sociales</h3>
                        <p className="text-sm text-white/60">
                          Agrega tus redes sociales. Puedes ingresar solo tu alias (ej: juan_perez) o la URL completa.
                        </p>
                      </div>

                      {/* Instagram */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="instagram" className="text-foreground font-medium">
                            <span className="inline-block mr-1">📷</span>
                            Instagram
                          </Label>
                          <div className="flex items-center gap-2">
                            <Label htmlFor="instagram-url-toggle" className="text-xs text-muted-foreground cursor-pointer">
                              Usar URL completa
                            </Label>
                            <Switch
                              id="instagram-url-toggle"
                              checked={useInstagramUrl}
                              onCheckedChange={(checked) => {
                                setUseInstagramUrl(checked);
                                // Si se activa el toggle y hay username, construir URL
                                if (checked && profile.instagram_username && !profile.instagram_url) {
                                  setProfile(prev => ({
                                    ...prev,
                                    instagram_url: buildInstagramUrl(prev.instagram_username || '')
                                  }));
                                }
                                // Si se desactiva, extraer username de la URL
                                if (!checked && profile.instagram_url) {
                                  const username = extractInstagramUsername(profile.instagram_url);
                                  setProfile(prev => ({
                                    ...prev,
                                    instagram_username: username,
                                    instagram_url: ''
                                  }));
                                }
                              }}
                            />
                          </div>
                        </div>
                        {useInstagramUrl ? (
                          <Input
                            id="instagram"
                            type="text"
                            value={profile.instagram_url || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              setProfile(prev => ({ ...prev, instagram_url: value }));
                              if (value && isUrl(value)) {
                                const username = extractInstagramUsername(value);
                                setProfile(prev => ({ ...prev, instagram_username: username }));
                              }
                            }}
                            className="h-14 rounded-xl border-white/10 bg-white/5 text-white focus:border-[#00b3f3] transition-all duration-200"
                            placeholder="https://instagram.com/juan_perez"
                          />
                        ) : (
                          <Input
                            id="instagram"
                            type="text"
                            value={profile.instagram_username || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (isUrl(value)) {
                                const username = extractInstagramUsername(value);
                                setProfile(prev => ({ ...prev, instagram_username: username }));
                              } else {
                                const cleaned = cleanSocialUsername(value);
                                setProfile(prev => ({ ...prev, instagram_username: cleaned }));
                              }
                            }}
                            className="h-14 rounded-xl border-white/10 bg-white/5 text-white focus:border-[#00b3f3] transition-all duration-200"
                            placeholder="juan_perez"
                          />
                        )}
                        <p className="text-xs text-muted-foreground">
                          {useInstagramUrl
                            ? "Ingresa la URL completa de tu perfil de Instagram"
                            : "Ingresa solo tu nombre de usuario (ej: juan_perez). El sistema construirá la URL automáticamente."}
                        </p>
                      </div>

                      {/* LinkedIn */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="linkedin" className="text-foreground font-medium">
                            <span className="inline-block mr-1">💼</span>
                            LinkedIn
                          </Label>
                          <div className="flex items-center gap-2">
                            <Label htmlFor="linkedin-url-toggle" className="text-xs text-muted-foreground cursor-pointer">
                              Usar URL completa
                            </Label>
                            <Switch
                              id="linkedin-url-toggle"
                              checked={useLinkedInUrl}
                              onCheckedChange={(checked) => {
                                setUseLinkedInUrl(checked);
                                // Si se activa el toggle y hay username, construir URL
                                if (checked && profile.linkedin_username && !profile.linkedin_url) {
                                  setProfile(prev => ({
                                    ...prev,
                                    linkedin_url: buildLinkedInUrl(prev.linkedin_username || '')
                                  }));
                                }
                                // Si se desactiva, extraer username de la URL
                                if (!checked && profile.linkedin_url) {
                                  const username = extractLinkedInUsername(profile.linkedin_url);
                                  setProfile(prev => ({
                                    ...prev,
                                    linkedin_username: username,
                                    linkedin_url: ''
                                  }));
                                }
                              }}
                            />
                          </div>
                        </div>
                        {useLinkedInUrl ? (
                          <Input
                            id="linkedin"
                            type="text"
                            value={profile.linkedin_url || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              setProfile(prev => ({ ...prev, linkedin_url: value }));
                              if (value && isUrl(value)) {
                                const username = extractLinkedInUsername(value);
                                setProfile(prev => ({ ...prev, linkedin_username: username }));
                              }
                            }}
                            className="h-14 rounded-xl border-white/10 bg-white/5 text-white focus:border-[#00b3f3] transition-all duration-200"
                            placeholder="https://linkedin.com/in/juan-perez"
                          />
                        ) : (
                          <Input
                            id="linkedin"
                            type="text"
                            value={profile.linkedin_username || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (isUrl(value)) {
                                const username = extractLinkedInUsername(value);
                                setProfile(prev => ({ ...prev, linkedin_username: username }));
                              } else {
                                const cleaned = cleanSocialUsername(value);
                                setProfile(prev => ({ ...prev, linkedin_username: cleaned }));
                              }
                            }}
                            className="h-14 rounded-xl border-white/10 bg-white/5 text-white focus:border-[#00b3f3] transition-all duration-200"
                            placeholder="juan-perez"
                          />
                        )}
                        <p className="text-xs text-muted-foreground">
                          {useLinkedInUrl
                            ? "Ingresa la URL completa de tu perfil de LinkedIn"
                            : "Ingresa solo tu nombre de usuario (ej: juan-perez). El sistema construirá la URL automáticamente."}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* URL Personalizada del Perfil Público */}
                  <div className="mt-6 pt-6 border-t border-border/50">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Crown className="h-5 w-5 text-yellow-500" />
                        <Label className="text-foreground font-semibold text-lg">
                          URL Personalizada del Perfil Público
                        </Label>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        Personaliza la URL de tu perfil público.
                      </p>

                      {/* Mensaje de advertencia */}
                      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-amber-800 dark:text-amber-300 mb-1">
                              ⚠️ Importante sobre cambios de URL
                            </p>
                            <p className="text-sm text-amber-700 dark:text-amber-400 leading-relaxed">
                              Es importante que no realices cambios periódicos de tu URL personalizada, ya que esto puede perjudicar tus futuros leads o contactos de negocio.
                              Si cambias tu URL, los enlaces antiguos seguirán funcionando, pero es recomendable mantener una URL estable para facilitar que los clientes te encuentren.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="public_profile_slug" className="text-foreground font-medium">
                          <Link className="inline h-4 w-4 mr-1" />
                          Nombre de usuario para tu perfil
                        </Label>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                          <div className="relative flex-1">
                            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/30 text-sm">
                              /
                            </div>
                            <Input
                              id="public_profile_slug"
                              type="text"
                              value={profile.public_profile_slug || ''}
                              onChange={(e) => handleSlugChange(e.target.value)}
                              className="h-14 rounded-xl border-white/10 bg-white/5 text-white focus:border-[#00b3f3] transition-all duration-200 pl-8"
                              placeholder="nombreusuario"
                            />
                            {checkingSlug && (
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                <Loader2 className="h-4 w-4 animate-spin" />
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
                            disabled={checkingSlug || !profile.public_profile_slug}
                            className="sm:w-auto w-full h-14 bg-[#00b3f3] hover:bg-[#0099cc] text-white border-[#00b3f3] rounded-xl font-bold transition-all duration-300 shadow-lg hover:shadow-[#00b3f3]/20"
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
                            className={`text-xs flex items-center gap-1 mt-2 ${slugFeedback.type === 'success' ? 'text-green-600' : 'text-red-600'
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
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Verificando disponibilidad...
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Solo letras minúsculas, números, guiones y guiones bajos. Mínimo 3 caracteres, máximo 30.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex justify-center">
                    <Button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      size="lg"
                      className="w-full sm:w-auto h-16 bg-[#00b3f3] hover:bg-[#0099cc] text-white px-12 rounded-2xl font-bold shadow-xl hover:shadow-[#00b3f3]/20 transition-all duration-300 hover:scale-105"
                    >
                      <Save className="h-6 w-6 mr-3" />
                      {saving ? 'Guardando...' : 'Guardar Datos Personales'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Certifications */}
              <Card className="bg-[#0f172a]/95 isolate border border-white/10 shadow-2xl rounded-3xl overflow-hidden hover:border-[#00b3f3]/30 transition-all duration-300 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                <CardHeader className="p-8 bg-transparent">
                  <CardTitle className="flex items-center gap-3 text-white text-3xl font-bold">
                    <div className="h-12 w-12 rounded-xl bg-[#00b3f3] flex items-center justify-center shadow-[0_0_15px_rgba(0,179,243,0.4)]">
                      <FileText className="h-6 w-6 text-white" />
                    </div>
                    Certificaciones
                  </CardTitle>
                  <CardDescription className="text-white/70 text-lg mt-2">
                    Gestiona tus certificaciones y registros de vuelo
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-8 pt-0">
                  {/* Apartado 1: Certificados de Academia Drone Chile */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-accent" />
                      <Label className="text-foreground font-semibold text-lg">
                        Certificados de Academia Drone Chile
                      </Label>
                    </div>

                    {/* Info Message */}
                    <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="flex items-start gap-3">
                        <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                          <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                            Información sobre la validación de certificados
                          </p>
                          <div className="text-sm text-blue-700 dark:text-blue-400 leading-relaxed space-y-1">
                            <p>
                              <strong>• Solo los certificados impartidos por Academia de Drone Chile serán autenticados.</strong>
                            </p>
                            <p>
                              • Esta acción es realizada por un administrador humano que revisa cada certificado.
                            </p>
                            <p>
                              • Si tu certificado es válido, tu perfil contará con un <strong>distintivo de certificación válida</strong> que aumentará la confianza de los clientes y mejorará tu visibilidad en la plataforma.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Upload Area - Apartado 1 */}
                    <div className="border-2 border-dashed border-border/50 rounded-lg p-6 text-center hover:border-accent/50 transition-colors">
                      <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground mb-2">
                        Arrastra y suelta tu certificación aquí, o
                      </p>
                      <Label htmlFor="certification-upload" className="cursor-pointer">
                        <span className="text-accent hover:text-accent/80 font-medium">selecciona un archivo</span>
                        <Input
                          id="certification-upload"
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Formatos admitidos: PDF, JPG, PNG (máx. 10MB)
                      </p>
                    </div>
                  </div>

                  {/* Certifications List - Apartado 1 */}
                  {certifications.length > 0 && (
                    <div className="mt-6">
                      <Separator className="mb-4" />
                      <h4 className="font-medium text-foreground mb-4">Certificados de Academia Drone Chile subidos</h4>
                      <div className="space-y-3">
                        {certifications.map((cert) => (
                          <div key={cert.id} className="p-4 bg-muted/30 rounded-lg border border-border/30">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <FileText className="h-5 w-5 text-muted-foreground" />
                                <div>
                                  <p className="font-medium text-foreground">{cert.file_name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Subido el {new Date(cert.uploaded_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className={getStatusColor(cert.status)}>
                                  {getStatusIcon(cert.status)}
                                  <span className="ml-1">{getStatusText(cert.status)}</span>
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewCertification(cert.id)}
                                  className="text-primary hover:text-primary hover:bg-primary/10"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteCertification(cert.id)}
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            {cert.rejection_observations && (
                              <div className={`mt-3 p-3 rounded-lg border ${cert.status === 'rejected'
                                ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                                : cert.status === 'validated'
                                  ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                                  : 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
                                }`}>
                                <div className="flex items-start gap-2">
                                  {cert.status === 'rejected' ? (
                                    <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                                  ) : cert.status === 'validated' ? (
                                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                                  ) : (
                                    <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                  )}
                                  <div className="flex-1">
                                    <p className={`text-sm font-semibold mb-1 ${cert.status === 'rejected'
                                      ? 'text-red-800 dark:text-red-300'
                                      : cert.status === 'validated'
                                        ? 'text-green-800 dark:text-green-300'
                                        : 'text-blue-800 dark:text-blue-300'
                                      }`}>
                                      {cert.status === 'rejected'
                                        ? 'Observaciones del administrador (Rechazado):'
                                        : cert.status === 'validated'
                                          ? 'Observaciones del administrador (Validado):'
                                          : 'Observaciones del administrador:'
                                      }
                                    </p>
                                    <p className={`text-sm whitespace-pre-wrap ${cert.status === 'rejected'
                                      ? 'text-red-700 dark:text-red-400'
                                      : cert.status === 'validated'
                                        ? 'text-green-700 dark:text-green-400'
                                        : 'text-blue-700 dark:text-blue-400'
                                      }`}>
                                      {cert.rejection_observations}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Separador entre apartados */}
                  <Separator className="my-8" />

                  {/* Apartado 2: Certificados o Registros de Vuelo */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-accent" />
                      <Label className="text-foreground font-semibold text-lg">
                        Certificados o Registros de Vuelo
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Sube certificados adicionales o registros de vuelo (archivos PDF o imagen) para validación.
                    </p>

                    {/* Upload Area - Apartado 2 */}
                    <div className="border-2 border-dashed border-border/50 rounded-lg p-6 text-center hover:border-accent/50 transition-colors">
                      <Upload className={`mx-auto h-8 w-8 ${uploadingFlightLog ? 'text-muted-foreground/50' : 'text-muted-foreground'} mb-2`} />
                      <p className="text-sm text-muted-foreground mb-2">
                        Arrastra y suelta tu certificado o registro de vuelo aquí, o
                      </p>
                      <Label htmlFor="flight-log-upload" className="cursor-pointer">
                        <span className="text-accent hover:text-accent/80 font-medium">selecciona un archivo</span>
                        <Input
                          id="flight-log-upload"
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={handleFlightLogFileUpload}
                          className="hidden"
                          disabled={uploadingFlightLog}
                        />
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Formatos admitidos: PDF, JPG, PNG (máx. 10MB)
                      </p>
                      {uploadingFlightLog && (
                        <div className="mt-3 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Subiendo archivo...</span>
                        </div>
                      )}
                    </div>

                    {/* Flight Logs List - Apartado 2 */}
                    {flightLogs.length > 0 && (
                      <div className="mt-6">
                        <Separator className="mb-4" />
                        <h4 className="font-medium text-foreground mb-4">Certificados o registros de vuelo subidos</h4>
                        <div className="space-y-3">
                          {flightLogs.map((log) => (
                            <div key={log.id} className="p-4 bg-muted/30 rounded-lg border border-border/30">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                                    <FileText className="h-5 w-5 text-accent" />
                                  </div>
                                  <div>
                                    <p className="font-medium text-foreground">{log.file_name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      Subido el {new Date(log.uploaded_at).toLocaleDateString()}
                                    </p>
                                    {log.flight_hours && (
                                      <p className="text-xs text-accent font-medium mt-1">
                                        {log.flight_hours} horas validadas
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge className={getStatusColor(log.status)}>
                                    {getStatusIcon(log.status)}
                                    <span className="ml-1">{getStatusText(log.status)}</span>
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleViewFlightLog(log.id)}
                                    className="text-primary hover:text-primary hover:bg-primary/10"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteFlightLog(log.id)}
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              {log.rejection_observations && (
                                <div className={`mt-3 p-3 rounded-lg border ${log.status === 'rejected'
                                  ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                                  : log.status === 'validated'
                                    ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                                    : 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
                                  }`}>
                                  <div className="flex items-start gap-2">
                                    {log.status === 'rejected' ? (
                                      <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                                    ) : log.status === 'validated' ? (
                                      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                                    ) : (
                                      <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                    )}
                                    <div className="flex-1">
                                      <p className={`text-sm font-semibold mb-1 ${log.status === 'rejected'
                                        ? 'text-red-800 dark:text-red-300'
                                        : log.status === 'validated'
                                          ? 'text-green-800 dark:text-green-300'
                                          : 'text-blue-800 dark:text-blue-300'
                                        }`}>
                                        {log.status === 'rejected'
                                          ? 'Observaciones del administrador (Rechazado):'
                                          : log.status === 'validated'
                                            ? 'Observaciones del administrador (Validado):'
                                            : 'Observaciones del administrador:'
                                        }
                                      </p>
                                      <p className={`text-sm whitespace-pre-wrap ${log.status === 'rejected'
                                        ? 'text-red-700 dark:text-red-400'
                                        : log.status === 'validated'
                                          ? 'text-green-700 dark:text-green-400'
                                          : 'text-blue-700 dark:text-blue-400'
                                        }`}>
                                        {log.rejection_observations}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              {/* Subscription */}
              {subscription && (
                <Card className="shadow-md border-0 bg-[#0f172a]/95 isolate">
                  <CardHeader className="border-b border-border/50">
                    <CardTitle className="flex items-center gap-2 text-foreground">
                      <div className="h-5 w-5 rounded bg-accent/20 flex items-center justify-center">
                        <CreditCard className="h-3 w-3 text-accent" />
                      </div>
                      Suscripción
                    </CardTitle>
                    <CardDescription>
                      Detalles de tu plan y facturación
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label className="text-muted-foreground text-sm">Plan actual</Label>
                        <p className="font-semibold text-foreground capitalize">{subscription.plan_name}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-sm">Estado</Label>
                        <div>
                          <Badge className={getStatusColor(subscription.status)}>
                            {getStatusText(subscription.status)}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-sm">
                          <Calendar className="inline h-4 w-4 mr-1" />
                          Próxima renovación
                        </Label>
                        <p className="font-medium text-foreground">
                          {subscription.renewal_date ? new Date(subscription.renewal_date).toLocaleDateString() : 'No especificado'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-sm">Método de pago</Label>
                        <p className="font-medium text-foreground">{subscription.payment_method}</p>
                      </div>
                    </div>
                    <div className="mt-6">
                      <Button variant="outline" className="border-accent text-accent hover:bg-accent hover:text-white">
                        Actualizar plan
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </>
        )}
      </div>

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
  );
};

export default UserProfile;