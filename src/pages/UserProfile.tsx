import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import Logo from "@/components/ui/logo";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileText, Check, Clock, X, CreditCard, Calendar, Phone, Mail, MapPin, Shield, Eye, AlertCircle, Link, Crown, Loader2 } from "lucide-react";
import type { User } from '@supabase/supabase-js';

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
  status: 'pending' | 'approved' | 'rejected';
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
}

interface Subscription {
  plan_name: string;
  status: 'active' | 'inactive' | 'expired';
  renewal_date: string;
  payment_method: string;
}

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
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [useInstagramUrl, setUseInstagramUrl] = useState(false);
  const [useLinkedInUrl, setUseLinkedInUrl] = useState(false);
  const { toast } = useToast();

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
          address: '',
          instagram_username: profileData.instagram_username || '',
          linkedin_username: profileData.linkedin_username || '',
          instagram_url: profileData.instagram_url || '',
          linkedin_url: profileData.linkedin_url || '',
          public_profile_slug: profileData.public_profile_slug || ''
        });
        
        setUseInstagramUrl(hasInstagramUrl);
        setUseLinkedInUrl(hasLinkedInUrl);
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
        .select('id, file_name, file_url, status, uploaded_at, rejection_observations, flight_hours')
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
          flight_hours: log.flight_hours || null
        })));
      }

      // Load subscription data
      const { data: subData } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

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
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('public_profile_slug', slug)
        .neq('id', user.id)
        .single();
      
      // If no error and data exists, slug is taken
      if (data) return false;
      
      // If error is "not found", slug is available
      if (error && error.code === 'PGRST116') return true;
      
      // Other errors
      if (error) {
        console.error('Error checking slug availability:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error checking slug availability:', error);
      return false;
    }
  };

  // Handle slug input change with debounced availability check
  const handleSlugChange = async (value: string) => {
    const cleaned = cleanSlug(value);
    const currentSlug = profile.public_profile_slug;
    
    setProfile(prev => ({ ...prev, public_profile_slug: cleaned }));
    setSlugAvailable(null);
    
    if (!cleaned) {
      setSlugAvailable(null);
      return;
    }
    
    const validation = validateSlug(cleaned);
    if (!validation.valid) {
      setSlugAvailable(false);
      return;
    }
    
    // Check if it's the same as current slug (no need to check)
    if (cleaned === currentSlug) {
      setSlugAvailable(true);
      return;
    }
    
    setCheckingSlug(true);
    const available = await checkSlugAvailability(cleaned);
    setSlugAvailable(available);
    setCheckingSlug(false);
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
      // Check if user has active subscription
      if (!subscription || subscription.status !== 'active') {
        toast({
          title: "Plan requerido",
          description: "La URL personalizada solo está disponible con un plan pagado activo",
          variant: "destructive",
        });
        return;
      }

      const validation = validateSlug(profile.public_profile_slug);
      if (!validation.valid) {
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
      
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: profile.full_name.trim(),
          email: profile.email,
          phone: profile.phone || null,
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
          ? `Tu perfil público está disponible en: /pilot/${cleanedSlug}`
          : "Tus datos han sido guardados correctamente",
      });
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

  const handleFlightLogUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Archivo muy grande",
        description: "El archivo no debe exceder 10MB",
        variant: "destructive",
      });
      return;
    }

    try {
      // Upload file to Supabase Storage
      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('flight-logs')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Save flight log record with file path
      const { error: dbError } = await supabase
        .from('flight_logs')
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_url: fileName,
          status: 'pending'
        });

      if (dbError) throw dbError;

      toast({
        title: "Vitacora subida",
        description: "Tu vitacora ha sido enviada para revisión",
      });

      // Reload flight logs
      const { data: logsData } = await supabase
        .from('flight_logs')
        .select('id, file_name, file_url, status, uploaded_at, rejection_observations, flight_hours')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false });

      if (logsData) {
        setFlightLogs(logsData.map(log => ({
          id: log.id,
          file_name: log.file_name,
          file_url: log.file_url,
          status: log.status as 'pending' | 'validated' | 'rejected',
          uploaded_at: log.uploaded_at,
          rejection_observations: log.rejection_observations || null,
          flight_hours: log.flight_hours || null
        })));
      }

    } catch (error) {
      console.error('Error uploading flight log:', error);
      toast({
        title: "Error",
        description: "No se pudo subir la vitacora",
        variant: "destructive",
      });
    }

    // Reset file input
    event.target.value = '';
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  // Si no hay usuario, mostrar mensaje
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">No autenticado</h1>
          <p className="text-muted-foreground">Por favor, inicia sesión para ver tu perfil</p>
        </div>
      </div>
    );
  }

  // Redirect super admins
  if (userRole === 'super_admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/30">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="text-center">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">Acceso Restringido</h1>
              <p className="text-muted-foreground">Los super administradores no tienen perfil personal</p>
            </div>
            <Card className="max-w-md mx-auto shadow-md border-0 bg-card/50 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="text-center">
                  <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">Panel de Administración</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Como super administrador, utiliza las herramientas de gestión disponibles en el panel principal.
                  </p>
                  <Button 
                    onClick={() => window.history.back()}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    Volver al Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <Logo size="xl" className="flex-shrink-0 [&>div]:h-24 [&>div]:w-24" showText={false} />
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Mi Perfil</h1>
            <p className="text-white/80 text-lg">Gestiona tu información personal y certificaciones</p>
          </div>
        </div>

        <div className="grid gap-6">
          {/* Personal Information */}
          <Card className="shadow-xl border-2 border-accent/20 bg-white/95 backdrop-blur-sm">
            <CardHeader className="border-b border-accent/10 bg-gradient-to-r from-accent/5 to-transparent">
              <CardTitle className="flex items-center gap-3 text-primary text-2xl">
                <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center">
                  <Mail className="h-5 w-5 text-white" />
                </div>
                Información Personal
              </CardTitle>
              <CardDescription className="text-base">
                Actualiza tu información básica de contacto
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
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
                    className="border-border/50 focus:border-accent"
                    placeholder="Tu nombre completo"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground font-medium">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                    className="border-border/50 focus:border-accent bg-muted/30"
                    placeholder="tu@email.com"
                    disabled
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-foreground font-medium">
                    <Phone className="inline h-4 w-4 mr-1" />
                    Teléfono
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                    className="border-border/50 focus:border-accent"
                    placeholder="+56 9 1234 5678"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address" className="text-foreground font-medium">
                    <MapPin className="inline h-4 w-4 mr-1" />
                    Dirección
                  </Label>
                  <Input
                    id="address"
                    type="text"
                    value={profile.address}
                    onChange={(e) => setProfile(prev => ({ ...prev, address: e.target.value }))}
                    className="border-border/50 focus:border-accent"
                    placeholder="Tu dirección"
                  />
                </div>

                {/* Redes Sociales */}
                <div className="space-y-4 pt-4 border-t border-border/50">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-foreground mb-2">Redes Sociales</h3>
                    <p className="text-xs text-muted-foreground">
                      Agrega tus redes sociales. Puedes ingresar solo tu alias (ej: juan_perez) o la URL completa. 
                      El sistema construirá automáticamente la URL completa desde tu alias, o puedes usar el toggle para ingresar la URL directamente.
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
                          // Extraer username automáticamente para mostrarlo como referencia
                          if (value && isUrl(value)) {
                            const username = extractInstagramUsername(value);
                            setProfile(prev => ({ ...prev, instagram_username: username }));
                          }
                        }}
                        className="border-border/50 focus:border-accent"
                        placeholder="https://instagram.com/juan_perez"
                      />
                    ) : (
                      <Input
                        id="instagram"
                        type="text"
                        value={profile.instagram_username || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Si detecta URL, extraer username automáticamente
                          if (isUrl(value)) {
                            const username = extractInstagramUsername(value);
                            setProfile(prev => ({ ...prev, instagram_username: username }));
                          } else {
                            const cleaned = cleanSocialUsername(value);
                            setProfile(prev => ({ ...prev, instagram_username: cleaned }));
                          }
                        }}
                        className="border-border/50 focus:border-accent"
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
                          // Extraer username automáticamente para mostrarlo como referencia
                          if (value && isUrl(value)) {
                            const username = extractLinkedInUsername(value);
                            setProfile(prev => ({ ...prev, linkedin_username: username }));
                          }
                        }}
                        className="border-border/50 focus:border-accent"
                        placeholder="https://linkedin.com/in/juan-perez"
                      />
                    ) : (
                      <Input
                        id="linkedin"
                        type="text"
                        value={profile.linkedin_username || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Si detecta URL, extraer username automáticamente
                          if (isUrl(value)) {
                            const username = extractLinkedInUsername(value);
                            setProfile(prev => ({ ...prev, linkedin_username: username }));
                          } else {
                            const cleaned = cleanSocialUsername(value);
                            setProfile(prev => ({ ...prev, linkedin_username: cleaned }));
                          }
                        }}
                        className="border-border/50 focus:border-accent"
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

              {/* URL Personalizada del Perfil Público - Solo para usuarios con plan pagado */}
              {subscription && subscription.status === 'active' && (
                <div className="mt-6 pt-6 border-t border-border/50">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Crown className="h-5 w-5 text-yellow-500" />
                      <Label className="text-foreground font-semibold text-lg">
                        URL Personalizada del Perfil Público
                      </Label>
                      <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">
                        Premium
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Personaliza la URL de tu perfil público. Solo disponible con plan pagado activo.
                    </p>
                    
                    <div className="space-y-2">
                      <Label htmlFor="public_profile_slug" className="text-foreground font-medium">
                        <Link className="inline h-4 w-4 mr-1" />
                        Nombre de usuario para tu perfil
                      </Label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">
                          /pilot/
                        </div>
                        <Input
                          id="public_profile_slug"
                          type="text"
                          value={profile.public_profile_slug || ''}
                          onChange={(e) => handleSlugChange(e.target.value)}
                          className="border-border/50 focus:border-accent pl-20"
                          placeholder="nombreusuario"
                          disabled={checkingSlug}
                        />
                        {checkingSlug && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
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
                      {profile.public_profile_slug && (
                        <div className="mt-2">
                          {slugAvailable === true && (
                            <p className="text-xs text-green-600 flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Disponible: {window.location.origin}/pilot/{profile.public_profile_slug}
                            </p>
                          )}
                          {slugAvailable === false && (
                            <p className="text-xs text-red-600 flex items-center gap-1">
                              <X className="h-3 w-3" />
                              Este nombre ya está en uso. Por favor, elige otro.
                            </p>
                          )}
                          {checkingSlug && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Verificando disponibilidad...
                            </p>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Solo letras minúsculas, números, guiones y guiones bajos. Mínimo 3 caracteres, máximo 30.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Mensaje si no tiene plan activo */}
              {(!subscription || subscription.status !== 'active') && (
                <div className="mt-6 pt-6 border-t border-border/50">
                  <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Crown className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300 mb-1">
                          URL Personalizada del Perfil
                        </p>
                        <p className="text-xs text-yellow-700 dark:text-yellow-400">
                          Esta característica está disponible solo para usuarios con un plan pagado activo. 
                          Suscríbete a un plan para personalizar la URL de tu perfil público.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <Button 
                  onClick={handleSaveProfile}
                  disabled={saving}
                  size="lg"
                  className="bg-accent hover:bg-accent/90 text-white px-8 shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Certifications */}
          <Card className="shadow-xl border-2 border-accent/20 bg-white/95 backdrop-blur-sm">
            <CardHeader className="border-b border-accent/10 bg-gradient-to-r from-accent/5 to-transparent">
              <CardTitle className="flex items-center gap-3 text-primary text-2xl">
                <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                Certificaciones
              </CardTitle>
              <CardDescription className="text-base">
                Sube y gestiona tus certificaciones de piloto
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
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
              
              {/* Upload Area */}
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

              {/* Certifications List */}
              {certifications.length > 0 && (
                <div className="mt-6">
                  <Separator className="mb-4" />
                  <h4 className="font-medium text-foreground mb-4">Certificaciones subidas</h4>
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
                        {cert.status === 'rejected' && (
                          <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-red-800 dark:text-red-300 mb-1">
                                  Observaciones del administrador:
                                </p>
                                {cert.rejection_observations ? (
                                  <p className="text-sm text-red-700 dark:text-red-400 whitespace-pre-wrap">
                                    {cert.rejection_observations}
                                  </p>
                                ) : (
                                  <p className="text-sm text-red-600 dark:text-red-400 italic">
                                    No se proporcionaron observaciones específicas.
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Horas de Vuelo */}
          <Card className="shadow-xl border-2 border-accent/20 bg-white/95 backdrop-blur-sm">
            <CardHeader className="border-b border-accent/10 bg-gradient-to-r from-accent/5 to-transparent">
              <CardTitle className="flex items-center gap-3 text-primary text-2xl">
                <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                Horas de Vuelo
              </CardTitle>
              <CardDescription className="text-base">
                Sube tus vitacoras de vuelo para validación y registro de horas
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {/* Info Message */}
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                      Información sobre la validación de vitacoras
                    </p>
                    <div className="text-sm text-blue-700 dark:text-blue-400 leading-relaxed space-y-1">
                      <p>
                        • Sube tus vitacoras de vuelo para que un administrador las revise y valide.
                      </p>
                      <p>
                        • Esta acción es realizada por un administrador humano que revisa cada vitacora.
                      </p>
                      <p>
                        • Si tu vitacora es válida, las horas de vuelo serán acreditadas en tu perfil y aumentarán tu credibilidad profesional.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Upload Area */}
              <div className="border-2 border-dashed border-border/50 rounded-lg p-6 text-center hover:border-accent/50 transition-colors">
                <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-2">
                  Arrastra y suelta tu vitacora aquí, o 
                </p>
                <Label htmlFor="flight-log-upload" className="cursor-pointer">
                  <span className="text-accent hover:text-accent/80 font-medium">selecciona un archivo</span>
                  <Input
                    id="flight-log-upload"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFlightLogUpload}
                    className="hidden"
                  />
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Formatos admitidos: PDF, JPG, PNG (máx. 10MB)
                </p>
              </div>

              {/* Flight Logs List */}
              {flightLogs.length > 0 && (
                <div className="mt-6">
                  <Separator className="mb-4" />
                  <h4 className="font-medium text-foreground mb-4">Vitacoras subidas</h4>
                  <div className="space-y-3">
                    {flightLogs.map((log) => (
                      <div key={log.id} className="p-4 bg-muted/30 rounded-lg border border-border/30">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-muted-foreground" />
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
                        {log.status === 'rejected' && (
                          <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-red-800 dark:text-red-300 mb-1">
                                  Observaciones del administrador:
                                </p>
                                {log.rejection_observations ? (
                                  <p className="text-sm text-red-700 dark:text-red-400 whitespace-pre-wrap">
                                    {log.rejection_observations}
                                  </p>
                                ) : (
                                  <p className="text-sm text-red-600 dark:text-red-400 italic">
                                    No se proporcionaron observaciones específicas.
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Subscription */}
          {subscription && (
            <Card className="shadow-md border-0 bg-card/50 backdrop-blur-sm">
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
      </div>
    </div>
  );
};

export default UserProfile;