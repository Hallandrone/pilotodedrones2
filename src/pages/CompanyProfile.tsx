import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Building2, Upload, X, FileText, Eye, CheckCircle, Clock, XCircle, AlertCircle, Camera, Loader2, ArrowLeft, Save, MapPin, Phone, Mail, Map, Link, Crown, Lock, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ImageCropper } from "@/components/ui/ImageCropper";
import { getBaseUrlClean } from "@/lib/getBaseUrl";

interface Company {
  id: string;
  company_name: string;
  logo_url: string | null;
  description: string | null;
  website: string | null;
  phone?: string | null;
  email?: string | null;
  location?: string | null;
  region?: string | null;
  experience_years?: number | null;
  services?: string[];
  drone_types?: string[];
  instagram_username?: string | null;
  linkedin_username?: string | null;
  instagram_url?: string | null;
  linkedin_url?: string | null;
}


interface Certification {
  id: string;
  file_name: string;
  file_url: string;
  status: 'pending' | 'validated' | 'rejected';
  uploaded_at: string;
  certificate_type: 'AOC' | 'CEO';
  rejection_observations?: string | null;
}

export default function CompanyProfile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<Company | null>(null);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [uploading, setUploading] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [customService, setCustomService] = useState('');
  const [customDrone, setCustomDrone] = useState('');
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugFeedback, setSlugFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [useInstagramUrl, setUseInstagramUrl] = useState(false);
  const [useLinkedInUrl, setUseLinkedInUrl] = useState(false);
  const [publicProfileSlug, setPublicProfileSlug] = useState<string>('');
  const [formData, setFormData] = useState({
    company_name: "",
    description: "",
    website: "",
    phone: "",
    email: "",
    location: "",
    region: "",
    experience_years: 0,
    services: [] as string[],
    drone_types: [] as string[],
    instagram_username: "",
    linkedin_username: "",
    instagram_url: "",
    linkedin_url: "",
  });
  const [openModal, setOpenModal] = useState<string | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);
  const [changingEmail, setChangingEmail] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [passwordForEmailChange, setPasswordForEmailChange] = useState("");
  
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

  const serviceOptions = [
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

  const RESERVED_WORDS = ['admin', 'api', 'dashboard', 'pilot', 'search', 'login', 'register', 'profile', 'settings', 'help', 'about', 'contact', 'terms', 'privacy'];

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
      navigate("/pilot");
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

      // Load profile for public_profile_slug
      const { data: profileData } = await supabase
        .from("profiles")
        .select("public_profile_slug, email")
        .eq("id", userId)
        .single();

      if (companyData) {
        setCompany(companyData);
        setFormData({
          company_name: companyData.company_name || "",
          description: companyData.description || "",
          website: companyData.website || "",
          phone: companyData.phone || "",
          email: companyData.email || profileData?.email || "",
          location: companyData.location || "",
          region: companyData.region || "",
          experience_years: companyData.experience_years || 0,
          services: companyData.services || [],
          drone_types: companyData.drone_types || [],
          instagram_username: companyData.instagram_username || "",
          linkedin_username: companyData.linkedin_username || "",
          instagram_url: companyData.instagram_url || "",
          linkedin_url: companyData.linkedin_url || "",
        });
        
        setPublicProfileSlug(profileData?.public_profile_slug || '');
        
        // Detect if there are full URLs to activate toggles
        const hasInstagramUrl = !!(companyData.instagram_url);
        const hasLinkedInUrl = !!(companyData.linkedin_url);
        setUseInstagramUrl(hasInstagramUrl);
        setUseLinkedInUrl(hasLinkedInUrl);
        
        if (profileData?.public_profile_slug) {
          setSlugAvailable(true);
          setSlugFeedback({
            type: 'success',
            text: `Tu perfil público actual es ${appBaseUrl}/${profileData.public_profile_slug}`
          });
        }

        await loadCertifications();
      }
    } catch (error: any) {
      console.error("Error loading company:", error);
      toast.error("Error al cargar datos de la empresa");
    } finally {
      setLoading(false);
    }
  };

  // Helper functions for social media
  const cleanSocialUsername = (input: string): string => {
    if (!input) return '';
    let cleaned = input.trim();
    cleaned = cleaned.replace(/^https?:\/\//, '');
    cleaned = cleaned.replace(/^www\./, '');
    cleaned = cleaned.replace(/^instagram\.com\//, '');
    cleaned = cleaned.replace(/^linkedin\.com\/in\//, '');
    cleaned = cleaned.replace(/^linkedin\.com\/company\//, '');
    cleaned = cleaned.replace(/^@/, '');
    cleaned = cleaned.replace(/\/$/, '');
    cleaned = cleaned.split('/')[0];
    cleaned = cleaned.split('?')[0];
    return cleaned;
  };

  const extractInstagramUsername = (url: string): string => {
    if (!url) return '';
    const cleaned = cleanSocialUsername(url);
    return cleaned;
  };

  const extractLinkedInUsername = (url: string): string => {
    if (!url) return '';
    const cleaned = cleanSocialUsername(url);
    return cleaned;
  };

  const isUrl = (str: string): boolean => {
    try {
      new URL(str);
      return true;
    } catch {
      return str.includes('.') && (str.includes('http') || str.includes('www') || str.includes('instagram') || str.includes('linkedin'));
    }
  };

  const buildInstagramUrl = (username: string): string => {
    if (!username) return '';
    const cleaned = cleanSocialUsername(username);
    return `https://instagram.com/${cleaned}`;
  };

  const buildLinkedInUrl = (username: string): string => {
    if (!username) return '';
    const cleaned = cleanSocialUsername(username);
    return `https://linkedin.com/company/${cleaned}`;
  };

  // Slug functions
  const cleanSlug = (input: string): string => {
    if (!input) return '';
    let cleaned = input.trim().toLowerCase();
    cleaned = cleaned.replace(/\s+/g, '-');
    cleaned = cleaned.replace(/[^a-z0-9_-]/g, '');
    cleaned = cleaned.replace(/-+/g, '-');
    cleaned = cleaned.replace(/^[-_]+|[-_]+$/g, '');
    return cleaned;
  };

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
    if (!/^[a-z0-9_-]+$/.test(slug)) {
      return { valid: false, error: 'El slug solo puede contener letras minúsculas, números, guiones y guiones bajos' };
    }
    if (/^[0-9]/.test(slug)) {
      return { valid: false, error: 'El slug no puede comenzar con un número' };
    }
    if (RESERVED_WORDS.includes(slug)) {
      return { valid: false, error: 'Este nombre no está disponible (palabra reservada)' };
    }
    return { valid: true };
  };

  const checkSlugAvailability = async (slug: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !slug) return false;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('public_profile_slug', slug)
        .neq('id', user.id)
        .maybeSingle();
      
      if (data) return false;
      if (!data && !error) return true;
      if (error && error.code === 'PGRST116') return true;
      
      console.error('Error checking slug availability:', error);
      return false;
    } catch (error) {
      console.error('Error checking slug availability:', error);
      return false;
    }
  };

  const handleSlugChange = (value: string) => {
    const cleaned = cleanSlug(value);
    setPublicProfileSlug(cleaned);
    setSlugAvailable(null);
    setSlugFeedback(null);
    setHasChanges(true);
    
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
    if (!publicProfileSlug) {
      setSlugFeedback({
        type: 'error',
        text: 'Ingresa un nombre para tu perfil antes de verificar'
      });
      setSlugAvailable(null);
      return;
    }
    
    const validation = validateSlug(publicProfileSlug);
    if (!validation.valid) {
      setSlugFeedback({
        type: 'error',
        text: validation.error || 'El formato del nombre no es válido'
      });
      setSlugAvailable(false);
      return;
    }
    
    setCheckingSlug(true);
    const available = await checkSlugAvailability(publicProfileSlug);
    setCheckingSlug(false);
    setSlugAvailable(available);
    
    if (available) {
      setSlugFeedback({
        type: 'success',
        text: `Excelente, tu URL será ${appBaseUrl}/${publicProfileSlug}`
      });
    } else {
      setSlugFeedback({
        type: 'error',
        text: 'Este nombre ya está en uso. Por favor, elige otro.'
      });
    }
  };

  // Service functions
  const toggleService = (service: string) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.includes(service)
        ? prev.services.filter(s => s !== service)
        : [...prev.services, service]
    }));
    setHasChanges(true);
  };

  const handleCustomService = (value: string) => {
    setCustomService(value);
  };

  const addCustomService = () => {
    const trimmed = customService.trim();
    if (trimmed && !formData.services.includes(trimmed)) {
      setFormData(prev => ({
        ...prev,
        services: [...prev.services, trimmed]
      }));
      setCustomService('');
      setHasChanges(true);
    } else if (trimmed && formData.services.includes(trimmed)) {
      toast.error("Este servicio ya está agregado");
    }
  };

  const isCustomService = (service: string) => {
    return !serviceOptions.includes(service);
  };

  // Drone functions
  const toggleDroneType = (droneType: string) => {
    setFormData(prev => ({
      ...prev,
      drone_types: prev.drone_types.includes(droneType)
        ? prev.drone_types.filter(d => d !== droneType)
        : [...prev.drone_types, droneType]
    }));
    setHasChanges(true);
  };

  const handleCustomDrone = (value: string) => {
    setCustomDrone(value);
  };

  const addCustomDrone = () => {
    const trimmed = customDrone.trim();
    if (trimmed && !formData.drone_types.includes(trimmed)) {
      setFormData(prev => ({
        ...prev,
        drone_types: [...prev.drone_types, trimmed]
      }));
      setCustomDrone('');
      setHasChanges(true);
    } else if (trimmed && formData.drone_types.includes(trimmed)) {
      toast.error("Este modelo de drone ya está agregado");
    }
  };

  const isCustomDrone = (drone: string) => {
    const allDrones = [...basicDrones, ...intermediateDrones, ...professionalDrones];
    return !allDrones.includes(drone) && drone !== 'Otro';
  };

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setHasChanges(true);
  };

  const loadCertifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('user_certifications')
      .select('*')
      .eq('user_id', user.id)
      .in('certificate_type', ['AOC', 'CEO'])
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('Error loading certifications:', error);
      return;
    }

    setCertifications((data || []) as Certification[]);
  };


  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      toast.error("Solo se permiten archivos de imagen");
      return;
    }

    // Validar tamaño (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen no puede ser mayor a 5MB");
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

  const handleLogoCropComplete = async (croppedImageUrl: string) => {
    try {
      setUploadingLogo(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("No se pudo obtener el usuario");
        return;
      }

      // Convertir la URL del blob a File
      const response = await fetch(croppedImageUrl);
      const blob = await response.blob();
      const file = new File([blob], `logo-${user.id}.jpg`, { type: 'image/jpeg' });

      // Subir a Supabase Storage (bucket avatars)
      const filePath = `${user.id}/logo.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // Guardar el logo_url en la base de datos
      await handleSave({ logo_url: publicUrl });
      
      // Actualizar el estado de la empresa con el nuevo logo
      setCompany(prev => prev ? { ...prev, logo_url: publicUrl } : null);
      
      toast.success("Logo actualizado correctamente");
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      toast.error("No se pudo subir el logo. Intenta nuevamente.");
    } finally {
      setUploadingLogo(false);
      setCropperOpen(false);
      setImageToCrop(null);
    }
  };

  const handleSave = async (additionalData = {}, silent = false) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      setSaving(true);
    const updateData = { ...formData, ...additionalData };

      // Process Instagram
      let instagramUrlFinal = null;
      let instagramUsernameFinal = null;
      
      if (useInstagramUrl && formData.instagram_url) {
        instagramUrlFinal = formData.instagram_url.trim();
        instagramUsernameFinal = extractInstagramUsername(formData.instagram_url);
      } else if (formData.instagram_username) {
        const cleaned = cleanSocialUsername(formData.instagram_username);
        instagramUsernameFinal = cleaned;
        instagramUrlFinal = buildInstagramUrl(cleaned);
      }

      // Process LinkedIn
      let linkedinUrlFinal = null;
      let linkedinUsernameFinal = null;
      
      if (useLinkedInUrl && formData.linkedin_url) {
        linkedinUrlFinal = formData.linkedin_url.trim();
        linkedinUsernameFinal = extractLinkedInUsername(formData.linkedin_url);
      } else if (formData.linkedin_username) {
        const cleaned = cleanSocialUsername(formData.linkedin_username);
        linkedinUsernameFinal = cleaned;
        linkedinUrlFinal = buildLinkedInUrl(cleaned);
      }

      const finalUpdateData: any = {
        ...updateData,
        instagram_username: instagramUsernameFinal,
        instagram_url: instagramUrlFinal,
        linkedin_username: linkedinUsernameFinal,
        linkedin_url: linkedinUrlFinal,
      };
      
      // Asegurar que logo_url se incluya si está en additionalData
      if (additionalData && 'logo_url' in additionalData && additionalData.logo_url) {
        finalUpdateData.logo_url = additionalData.logo_url;
      }

    if (company) {
      const { error } = await supabase
        .from("companies")
          .update(finalUpdateData)
        .eq("user_id", user.id);

        if (error) throw error;
    } else {
      const { error } = await supabase
        .from("companies")
          .insert({ ...finalUpdateData, user_id: user.id });

        if (error) throw error;
      }

      // Update public_profile_slug in profiles table
      if (publicProfileSlug) {
        const cleanedSlug = cleanSlug(publicProfileSlug);
        const validation = validateSlug(cleanedSlug);
        
        if (validation.valid) {
          const { data: currentProfile } = await supabase
            .from('profiles')
            .select('public_profile_slug')
            .eq('id', user.id)
            .single();

          const oldSlug = currentProfile?.public_profile_slug;
          const newSlug = cleanedSlug;

          if (oldSlug && oldSlug !== newSlug) {
            await supabase
              .from('profile_slug_history')
              .update({ 
                is_current: false, 
                deactivated_at: new Date().toISOString() 
              })
              .eq('user_id', user.id)
              .eq('is_current', true);

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

          await supabase
            .from('profiles')
            .update({ public_profile_slug: cleanedSlug })
            .eq('id', user.id);
        }
      }

      if (!silent) {
    toast.success("Empresa actualizada correctamente");
      }
      
      setHasChanges(false);
      setLastSaved(new Date());
    await loadCompanyData(user.id);
    } catch (error: any) {
      console.error("Error saving company:", error);
      toast.error("Error al actualizar empresa");
    } finally {
      setSaving(false);
    }
  };

  const handleAutoSave = async () => {
    if (!hasChanges) return;
    
    try {
      await handleSave({}, true);
      console.log('Auto-saved successfully');
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
  }, [hasChanges, formData, publicProfileSlug]);

  const handleCertificateUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    certType: 'AOC' | 'CEO'
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Validar tipo de archivo
    const allowedTypes = ['.pdf', '.jpg', '.jpeg', '.png'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedTypes.includes(fileExtension)) {
      toast.error("Solo se permiten archivos PDF, JPG, JPEG y PNG");
      return;
    }

    try {
      setUploading(true);
      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('certifications')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('user_certifications')
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_url: fileName,
          status: 'pending',
          certificate_type: certType
        });

      if (dbError) throw dbError;

      toast.success(`Certificado ${certType} subido correctamente`);
      await loadCertifications();
    } catch (error) {
      console.error('Error uploading certificate:', error);
      toast.error("No se pudo subir el certificado");
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleDeleteCertification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('user_certifications')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setCertifications(prev => prev.filter(cert => cert.id !== id));
      toast.success("Certificado eliminado correctamente");
    } catch (error) {
      console.error('Error deleting certification:', error);
      toast.error("No se pudo eliminar el certificado");
    }
  };

  const getSignedUrl = async (filePath: string): Promise<string> => {
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      return filePath;
    }
    
    const { data, error } = await supabase.storage
      .from('certifications')
      .createSignedUrl(filePath, 3600);
    
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
      toast.error("No se pudo abrir el certificado");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'validated': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'validated': return <CheckCircle className="h-3 w-3" />;
      case 'rejected': return <XCircle className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'validated': return 'Validado';
      case 'rejected': return 'Rechazado';
      default: return 'Pendiente';
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Por favor completa todos los campos");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    try {
      setChangingPassword(true);
      
      // Verificar contraseña actual re-autenticando
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        toast.error("No se pudo obtener la información del usuario");
        return;
      }

      // Re-autenticar con la contraseña actual
      const { error: reAuthError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (reAuthError) {
        toast.error("Contraseña actual incorrecta");
        return;
      }

      // Actualizar contraseña
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        toast.error(updateError.message || "Error al cambiar la contraseña");
        return;
      }

      toast.success("Contraseña actualizada correctamente");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setOpenModal(null);
    } catch (error: any) {
      console.error("Error changing password:", error);
      toast.error("Error al cambiar la contraseña");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail || !confirmEmail || !passwordForEmailChange) {
      toast.error("Por favor completa todos los campos");
      return;
    }

    if (newEmail !== confirmEmail) {
      toast.error("Los emails no coinciden");
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast.error("Por favor ingresa un email válido");
      return;
    }

    try {
      setChangingEmail(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        toast.error("No se pudo obtener la información del usuario");
        return;
      }

      // Re-autenticar con la contraseña
      const { error: reAuthError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordForEmailChange,
      });

      if (reAuthError) {
        toast.error("Contraseña incorrecta");
        return;
      }

      // Actualizar email
      const { error: updateError } = await supabase.auth.updateUser({
        email: newEmail,
      });

      if (updateError) {
        if (updateError.message.includes("already registered")) {
          toast.error("Este email ya está en uso");
        } else {
          toast.error(updateError.message || "Error al cambiar el email");
        }
        return;
      }

      toast.success("Email actualizado correctamente. Revisa tu nuevo email para confirmar el cambio.");
      setNewEmail("");
      setConfirmEmail("");
      setPasswordForEmailChange("");
      setOpenModal(null);
    } catch (error: any) {
      console.error("Error changing email:", error);
      toast.error("Error al cambiar el email");
    } finally {
      setChangingEmail(false);
    }
  };

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
              onClick={() => navigate('/company-profile')}
              className="h-12 w-12 rounded-full hover:bg-accent/10 hover:scale-105 transition-all duration-200 text-white"
            >
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white">
                Editar Perfil de Empresa
              </h1>
              <p className="text-base text-white/70 font-medium">Actualiza la información de tu empresa</p>
            </div>
            {hasChanges && (
              <div className="ml-auto flex items-center gap-2">
                {lastSaved && (
                  <span className="text-xs text-white/60">
                    Guardado: {lastSaved.toLocaleTimeString()}
                  </span>
                )}
                <Button
                  onClick={() => handleSave()}
                  disabled={saving}
                  className="bg-accent hover:bg-accent/90 text-white"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Guardar Cambios
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="p-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Información Básica y Ubicación */}
          <Card 
            className="bg-card/95 backdrop-blur-sm border-2 border-accent/20 shadow-xl rounded-2xl overflow-hidden cursor-pointer hover:scale-105 transition-all duration-200 hover:border-accent/40"
            onClick={() => setOpenModal('basic')}
          >
            <CardContent className="p-6 flex flex-col items-center text-center space-y-3">
              <div className="h-16 w-16 bg-accent rounded-xl flex items-center justify-center">
                <Building2 className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-xl font-bold text-white">Información y Ubicación</CardTitle>
              <CardDescription className="text-white/70">Datos de contacto, ubicación y experiencia</CardDescription>
            </CardContent>
          </Card>

          {/* Servicios y Tipos de Drones */}
          <Card 
            className="bg-card/95 backdrop-blur-sm border-2 border-accent/20 shadow-xl rounded-2xl overflow-hidden cursor-pointer hover:scale-105 transition-all duration-200 hover:border-accent/40"
            onClick={() => setOpenModal('services')}
          >
            <CardContent className="p-6 flex flex-col items-center text-center space-y-3">
              <div className="h-16 w-16 bg-accent rounded-xl flex items-center justify-center">
                <Briefcase className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-xl font-bold text-white">Servicios y Drones</CardTitle>
              <CardDescription className="text-white/70">Servicios y modelos de drones</CardDescription>
            </CardContent>
          </Card>

          {/* Redes Sociales */}
          <Card 
            className="bg-card/95 backdrop-blur-sm border-2 border-accent/20 shadow-xl rounded-2xl overflow-hidden cursor-pointer hover:scale-105 transition-all duration-200 hover:border-accent/40"
            onClick={() => setOpenModal('social')}
          >
            <CardContent className="p-6 flex flex-col items-center text-center space-y-3">
              <div className="h-16 w-16 bg-accent rounded-xl flex items-center justify-center">
                <Link className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-xl font-bold text-white">Redes Sociales</CardTitle>
              <CardDescription className="text-white/70">Instagram y LinkedIn</CardDescription>
            </CardContent>
          </Card>

          {/* URL Personalizada */}
          <Card 
            className="bg-card/95 backdrop-blur-sm border-2 border-accent/20 shadow-xl rounded-2xl overflow-hidden cursor-pointer hover:scale-105 transition-all duration-200 hover:border-accent/40"
            onClick={() => setOpenModal('url')}
          >
            <CardContent className="p-6 flex flex-col items-center text-center space-y-3">
              <div className="h-16 w-16 bg-accent rounded-xl flex items-center justify-center">
                <Crown className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-xl font-bold text-white">URL Personalizada</CardTitle>
              <CardDescription className="text-white/70">Personaliza la URL de tu perfil</CardDescription>
            </CardContent>
          </Card>

          {/* Certificados */}
          <Card 
            className="bg-card/95 backdrop-blur-sm border-2 border-accent/20 shadow-xl rounded-2xl overflow-hidden cursor-pointer hover:scale-105 transition-all duration-200 hover:border-accent/40"
            onClick={() => setOpenModal('certificates')}
          >
            <CardContent className="p-6 flex flex-col items-center text-center space-y-3">
              <div className="h-16 w-16 bg-accent rounded-xl flex items-center justify-center">
                <FileText className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-xl font-bold text-white">Certificados</CardTitle>
              <CardDescription className="text-white/70">AOC y CEO</CardDescription>
            </CardContent>
          </Card>

          {/* Seguridad */}
          <Card 
            className="bg-card/95 backdrop-blur-sm border-2 border-accent/20 shadow-xl rounded-2xl overflow-hidden cursor-pointer hover:scale-105 transition-all duration-200 hover:border-accent/40"
            onClick={() => setOpenModal('security')}
          >
            <CardContent className="p-6 flex flex-col items-center text-center space-y-3">
              <div className="h-16 w-16 bg-accent rounded-xl flex items-center justify-center">
                <Lock className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-xl font-bold text-white">Seguridad</CardTitle>
              <CardDescription className="text-white/70">Cambiar contraseña y email</CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      {/* Basic Information and Location Modal */}
      <Dialog open={openModal === 'basic'} onOpenChange={(open) => !open && setOpenModal(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl font-bold">
              <Building2 className="h-6 w-6" />
              Información Básica y Ubicación
            </DialogTitle>
            <DialogDescription>Actualiza la información básica, contacto y ubicación de tu empresa</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            {/* Logo Section */}
            <div className="flex flex-col items-center gap-4 pb-6 border-b border-border/50">
              <Avatar className="h-32 w-32 ring-4 ring-accent/50">
                <AvatarImage src={company?.logo_url || ''} />
                <AvatarFallback className="bg-accent text-white text-3xl">
                  {formData.company_name?.charAt(0)?.toUpperCase() || 'E'}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-center gap-2">
                <Label htmlFor="logo-upload-modal" className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg transition-all duration-200">
                    {uploadingLogo ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Subiendo...</span>
                      </>
                    ) : (
                      <>
                        <Camera className="h-4 w-4" />
                        <span>{company?.logo_url ? 'Cambiar logo' : 'Subir logo'}</span>
                      </>
                    )}
                  </div>
                </Label>
                <Input
                  id="logo-upload-modal"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoSelect}
                  disabled={uploadingLogo}
                />
                <p className="text-xs text-muted-foreground text-center">
                  JPG, PNG hasta 5MB. La imagen se recortará en formato cuadrado.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="company_name_modal" className="text-base font-semibold">
                Nombre de la Empresa *
              </Label>
              <Input
                id="company_name_modal"
                value={formData.company_name}
                onChange={(e) => handleInputChange('company_name', e.target.value)}
                placeholder="Nombre de tu empresa"
                className="h-14 rounded-xl border-2"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="email_modal" className="text-base font-semibold">
                  Email de Contacto
                </Label>
                <Input
                  id="email_modal"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="contacto@empresa.cl"
                  className="h-14 rounded-xl border-2"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="phone_modal" className="text-base font-semibold flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Teléfono
                </Label>
                <Input
                  id="phone_modal"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="+56 9 1234 5678"
                  className="h-14 rounded-xl border-2"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="website_modal" className="text-base font-semibold">
                Sitio Web
              </Label>
              <Input
                id="website_modal"
                type="url"
                value={formData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                placeholder="https://www.empresa.cl"
                className="h-14 rounded-xl border-2"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="description_modal" className="text-base font-semibold">
                Descripción
              </Label>
              <Textarea
                id="description_modal"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe los servicios que ofrece tu empresa..."
                className="rounded-xl border-2 resize-none min-h-[120px]"
              />
            </div>

            {/* Location Section */}
            <div className="pt-6 border-t border-border/50">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Ubicación y Zona de Trabajo
              </h3>
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="region_modal" className="text-base font-semibold">
                    Región *
                  </Label>
                  <Select value={formData.region} onValueChange={(value) => handleInputChange('region', value)}>
                    <SelectTrigger className="h-14 rounded-xl border-2">
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
                  <Label htmlFor="location_modal" className="text-base font-semibold flex items-center gap-2">
                    <Map className="h-5 w-5" />
                    Ciudad/Comuna
                  </Label>
                  <Input
                    id="location_modal"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    placeholder="Ej: Santiago, Las Condes"
                    className="h-14 rounded-xl border-2"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="experience_years_modal" className="text-base font-semibold">
                    Años de Experiencia Operando
                  </Label>
                  <Input
                    id="experience_years_modal"
                    type="number"
                    value={formData.experience_years}
                    onChange={(e) => handleInputChange('experience_years', parseInt(e.target.value) || 0)}
                    placeholder="0"
                    className="h-14 rounded-xl border-2"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setOpenModal(null)}>
                Cancelar
              </Button>
              <Button onClick={async () => {
                await handleSave();
                setOpenModal(null);
              }} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Services and Drones Modal */}
      <Dialog open={openModal === 'services'} onOpenChange={(open) => !open && setOpenModal(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl font-bold">
              <Briefcase className="h-6 w-6" />
              Servicios y Tipos de Drones
            </DialogTitle>
            <DialogDescription>Selecciona los servicios y modelos de drones con los que trabaja tu empresa</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            <div className="flex flex-wrap gap-3">
              {serviceOptions.map((service) => (
                <Badge
                  key={service}
                  variant={formData.services.includes(service) ? "default" : "outline"}
                  className={`cursor-pointer transition-all duration-200 px-4 py-2 rounded-xl font-medium ${
                    formData.services.includes(service)
                      ? 'bg-accent text-white border-accent shadow-lg hover:shadow-xl hover:scale-105'
                      : 'bg-card border-border hover:bg-accent/10 hover:border-accent'
                  }`}
                  onClick={() => toggleService(service)}
                >
                  {service}
                </Badge>
              ))}
            </div>

            {formData.services.filter(isCustomService).length > 0 && (
              <div className="pt-4 border-t border-border/50">
                <Label className="text-sm mb-3 block font-medium">
                  Servicios personalizados:
                </Label>
                <div className="flex flex-wrap gap-3">
                  {formData.services.filter(isCustomService).map((service) => (
                    <Badge
                      key={service}
                      variant="default"
                      className="bg-accent text-white border-accent shadow-lg px-4 py-2 rounded-xl font-medium cursor-pointer hover:scale-105 transition-all duration-200 flex items-center gap-2 group"
                      onClick={() => toggleService(service)}
                    >
                      {service}
                      <X className="h-3 w-3 opacity-70 group-hover:opacity-100 transition-opacity" />
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-border/50">
              <Label htmlFor="custom-service-modal" className="text-sm mb-2 block font-medium">
                Otra
              </Label>
              <div className="flex gap-2">
                <Input
                  id="custom-service-modal"
                  type="text"
                  value={customService}
                  onChange={(e) => handleCustomService(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustomService();
                    }
                  }}
                  placeholder="Escribe otro servicio..."
                  className="border-2"
                />
                <Button
                  type="button"
                  onClick={addCustomService}
                  disabled={!customService.trim() || formData.services.includes(customService.trim())}
                  className="bg-accent hover:bg-accent/90 text-white"
                >
                  Agregar
                </Button>
              </div>
            </div>

            {/* Drones Section */}
            <div className="pt-6 border-t border-border/50">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Tipos de Drones
              </h3>
              <div className="space-y-6">
                {formData.drone_types.length > 0 && (
                  <div className="pb-4 border-b border-border/50">
                    <Label className="text-sm mb-3 block font-medium">
                      Drones seleccionados ({formData.drone_types.length}):
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {formData.drone_types.map((drone) => (
                        <Badge
                          key={drone}
                          variant="default"
                          className="bg-accent text-white border-accent shadow-lg px-4 py-2 rounded-xl font-medium cursor-pointer hover:scale-105 transition-all duration-200 flex items-center gap-2 group"
                          onClick={() => toggleDroneType(drone)}
                        >
                          {drone}
                          <X className="h-3 w-3 opacity-70 group-hover:opacity-100 transition-opacity" />
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Accordion type="multiple" className="w-full space-y-2">
                  <AccordionItem value="basic" className="border-border/50">
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🟢</span>
                        <span className="font-semibold">Nivel Básico/Principiante</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {basicDrones.filter(d => formData.drone_types.includes(d)).length}/{basicDrones.length}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4">
                      <div className="flex flex-wrap gap-3">
                        {basicDrones.map((drone) => (
                          <Badge
                            key={drone}
                            variant={formData.drone_types.includes(drone) ? "default" : "outline"}
                            className={`cursor-pointer transition-all duration-200 px-4 py-2 rounded-xl font-medium ${
                              formData.drone_types.includes(drone)
                                ? 'bg-accent text-white border-accent shadow-lg hover:shadow-xl hover:scale-105'
                                : 'bg-card border-border hover:bg-accent/10 hover:border-accent'
                            }`}
                            onClick={() => toggleDroneType(drone)}
                          >
                            {drone}
                          </Badge>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="intermediate" className="border-border/50">
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🟡</span>
                        <span className="font-semibold">Nivel Intermedio</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {intermediateDrones.filter(d => formData.drone_types.includes(d)).length}/{intermediateDrones.length}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4">
                      <div className="flex flex-wrap gap-3">
                        {intermediateDrones.map((drone) => (
                          <Badge
                            key={drone}
                            variant={formData.drone_types.includes(drone) ? "default" : "outline"}
                            className={`cursor-pointer transition-all duration-200 px-4 py-2 rounded-xl font-medium ${
                              formData.drone_types.includes(drone)
                                ? 'bg-accent text-white border-accent shadow-lg hover:shadow-xl hover:scale-105'
                                : 'bg-card border-border hover:bg-accent/10 hover:border-accent'
                            }`}
                            onClick={() => toggleDroneType(drone)}
                          >
                            {drone}
                          </Badge>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="professional" className="border-border/50">
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🔴</span>
                        <span className="font-semibold">Nivel Profesional</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {professionalDrones.filter(d => formData.drone_types.includes(d)).length}/{professionalDrones.length}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4">
                      <div className="flex flex-wrap gap-3">
                        {professionalDrones.map((drone) => (
                          <Badge
                            key={drone}
                            variant={formData.drone_types.includes(drone) ? "default" : "outline"}
                            className={`cursor-pointer transition-all duration-200 px-4 py-2 rounded-xl font-medium ${
                              formData.drone_types.includes(drone)
                                ? 'bg-accent text-white border-accent shadow-lg hover:shadow-xl hover:scale-105'
                                : 'bg-card border-border hover:bg-accent/10 hover:border-accent'
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

                {formData.drone_types.filter(isCustomDrone).length > 0 && (
                  <div className="pt-4 border-t border-border/50">
                    <Label className="text-sm mb-3 block font-medium">
                      Modelos personalizados:
                    </Label>
                    <div className="flex flex-wrap gap-3">
                      {formData.drone_types.filter(isCustomDrone).map((drone) => (
                        <Badge
                          key={drone}
                          variant="default"
                          className="bg-accent text-white border-accent shadow-lg px-4 py-2 rounded-xl font-medium cursor-pointer hover:scale-105 transition-all duration-200 flex items-center gap-2 group"
                          onClick={() => toggleDroneType(drone)}
                        >
                          {drone}
                          <X className="h-3 w-3 opacity-70 group-hover:opacity-100 transition-opacity" />
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-border/50">
                  <Label htmlFor="custom-drone-modal" className="text-sm mb-2 block font-medium">
                    Otra
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="custom-drone-modal"
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
                      className="border-2"
                    />
                    <Button
                      type="button"
                      onClick={addCustomDrone}
                      disabled={!customDrone.trim() || formData.drone_types.includes(customDrone.trim())}
                      className="bg-accent hover:bg-accent/90 text-white"
                    >
                      Agregar
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setOpenModal(null)}>
                Cancelar
              </Button>
              <Button onClick={async () => {
                await handleSave();
                setOpenModal(null);
              }} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Social Media Modal */}
      <Dialog open={openModal === 'social'} onOpenChange={(open) => !open && setOpenModal(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl font-bold">
              <Link className="h-6 w-6" />
              Redes Sociales
            </DialogTitle>
            <DialogDescription>Agrega tus redes sociales. Puedes ingresar solo tu alias o la URL completa.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            {/* Instagram */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="instagram_modal" className="font-medium">
                  <span className="inline-block mr-1">📷</span>
                  Instagram
                </Label>
                <div className="flex items-center gap-2">
                  <Label htmlFor="instagram-url-toggle-modal" className="text-xs text-muted-foreground cursor-pointer">
                    Usar URL completa
                  </Label>
                  <Switch
                    id="instagram-url-toggle-modal"
                    checked={useInstagramUrl}
                    onCheckedChange={(checked) => {
                      setUseInstagramUrl(checked);
                      if (checked && formData.instagram_username && !formData.instagram_url) {
                        handleInputChange('instagram_url', buildInstagramUrl(formData.instagram_username));
                      }
                      if (!checked && formData.instagram_url) {
                        const username = extractInstagramUsername(formData.instagram_url);
                        handleInputChange('instagram_username', username);
                        handleInputChange('instagram_url', '');
                      }
                    }}
                  />
                </div>
              </div>
              {useInstagramUrl ? (
                <Input
                  id="instagram_modal"
                  type="text"
                  value={formData.instagram_url || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    handleInputChange('instagram_url', value);
                    if (value && isUrl(value)) {
                      const username = extractInstagramUsername(value);
                      handleInputChange('instagram_username', username);
                    }
                  }}
                  className="border-2"
                  placeholder="https://instagram.com/empresa"
                />
              ) : (
                <Input
                  id="instagram_modal"
                  type="text"
                  value={formData.instagram_username || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (isUrl(value)) {
                      const username = extractInstagramUsername(value);
                      handleInputChange('instagram_username', username);
                    } else {
                      const cleaned = cleanSocialUsername(value);
                      handleInputChange('instagram_username', cleaned);
                    }
                  }}
                  className="border-2"
                  placeholder="empresa_drones"
                />
              )}
            </div>

            {/* LinkedIn */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="linkedin_modal" className="font-medium">
                  <span className="inline-block mr-1">💼</span>
                  LinkedIn
                </Label>
                <div className="flex items-center gap-2">
                  <Label htmlFor="linkedin-url-toggle-modal" className="text-xs text-muted-foreground cursor-pointer">
                    Usar URL completa
                  </Label>
                  <Switch
                    id="linkedin-url-toggle-modal"
                    checked={useLinkedInUrl}
                    onCheckedChange={(checked) => {
                      setUseLinkedInUrl(checked);
                      if (checked && formData.linkedin_username && !formData.linkedin_url) {
                        handleInputChange('linkedin_url', buildLinkedInUrl(formData.linkedin_username));
                      }
                      if (!checked && formData.linkedin_url) {
                        const username = extractLinkedInUsername(formData.linkedin_url);
                        handleInputChange('linkedin_username', username);
                        handleInputChange('linkedin_url', '');
                      }
                    }}
                  />
                </div>
              </div>
              {useLinkedInUrl ? (
                <Input
                  id="linkedin_modal"
                  type="text"
                  value={formData.linkedin_url || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    handleInputChange('linkedin_url', value);
                    if (value && isUrl(value)) {
                      const username = extractLinkedInUsername(value);
                      handleInputChange('linkedin_username', username);
                    }
                  }}
                  className="border-2"
                  placeholder="https://linkedin.com/company/empresa"
                />
              ) : (
                <Input
                  id="linkedin_modal"
                  type="text"
                  value={formData.linkedin_username || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (isUrl(value)) {
                      const username = extractLinkedInUsername(value);
                      handleInputChange('linkedin_username', username);
                    } else {
                      const cleaned = cleanSocialUsername(value);
                      handleInputChange('linkedin_username', cleaned);
                    }
                  }}
                  className="border-2"
                  placeholder="empresa-drones"
                />
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setOpenModal(null)}>
                Cancelar
              </Button>
              <Button onClick={async () => {
                await handleSave();
                setOpenModal(null);
              }} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* URL Modal */}
      <Dialog open={openModal === 'url'} onOpenChange={(open) => !open && setOpenModal(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl font-bold">
              <Crown className="h-6 w-6" />
              URL Personalizada del Perfil Público
            </DialogTitle>
            <DialogDescription>Personaliza la URL de tu perfil público</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
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
              <Label htmlFor="public_profile_slug_modal" className="font-medium flex items-center gap-2">
                <Link className="h-4 w-4" />
                Nombre de usuario para tu perfil
              </Label>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <div className="relative flex-1">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">
                    /
                  </div>
                  <Input
                    id="public_profile_slug_modal"
                    type="text"
                    value={publicProfileSlug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    className="border-2 pl-8"
                    placeholder="nombreempresa"
                  />
                </div>
                <Button
                  onClick={handleSlugVerification}
                  disabled={checkingSlug || !publicProfileSlug}
                  className="bg-accent hover:bg-accent/90 text-white"
                >
                  {checkingSlug ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    'Verificar disponibilidad'
                  )}
                </Button>
              </div>
              {slugFeedback && (
                <p
                  className={`text-xs flex items-center gap-1 ${
                    slugFeedback.type === 'success' ? 'text-green-600' : 'text-red-600'
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
              <p className="text-xs text-muted-foreground">
                Solo letras minúsculas, números, guiones y guiones bajos. Mínimo 3 caracteres, máximo 30.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setOpenModal(null)}>
                Cancelar
              </Button>
              <Button onClick={async () => {
                await handleSave();
                setOpenModal(null);
              }} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Certificates Modal */}
      <Dialog open={openModal === 'certificates'} onOpenChange={(open) => !open && setOpenModal(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl font-bold">
              <FileText className="h-6 w-6" />
              Certificados de Empresa
            </DialogTitle>
            <DialogDescription>Sube tus certificados AOC o CEO</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            {/* AOC Certificate */}
            <div className="space-y-2">
              <Label htmlFor="aoc-certificate-modal">Certificado AOC</Label>
              <Input
                id="aoc-certificate-modal"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleCertificateUpload(e, 'AOC')}
                disabled={uploading}
              />
              <p className="text-xs text-muted-foreground">
                Sube tu certificado AOC (Air Operator Certificate)
              </p>
            </div>

            {/* CEO Certificate */}
            <div className="space-y-2">
              <Label htmlFor="ceo-certificate-modal">Certificado CEO</Label>
              <Input
                id="ceo-certificate-modal"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleCertificateUpload(e, 'CEO')}
                disabled={uploading}
              />
              <p className="text-xs text-muted-foreground">
                Sube tu certificado CEO (Chief Executive Officer)
              </p>
            </div>

            {/* Lista de certificados subidos */}
            {certifications.length > 0 && (
              <div className="space-y-2 pt-4 border-t">
                <Label>Certificados Subidos</Label>
                <div className="space-y-2">
                  {certifications.map((cert) => (
                    <div key={cert.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3 flex-1">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium">{cert.file_name}</p>
                            <Badge className={getStatusColor(cert.status)}>
                              {getStatusIcon(cert.status)}
                              <span className="ml-1">{getStatusText(cert.status)}</span>
                            </Badge>
                            <Badge variant="outline">{cert.certificate_type}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Subido el {new Date(cert.uploaded_at).toLocaleDateString()}
                          </p>
                          {cert.status === 'rejected' && cert.rejection_observations && (
                            <div className="mt-2 p-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded text-xs">
                              <div className="flex items-start gap-2">
                                <AlertCircle className="h-3 w-3 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="font-semibold text-red-800 dark:text-red-300 mb-1">
                                    Observaciones:
                                  </p>
                                  <p className="text-red-700 dark:text-red-400 whitespace-pre-wrap">
                                    {cert.rejection_observations}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleViewCertification(cert.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDeleteCertification(cert.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setOpenModal(null)}>
                Cerrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Security Modal */}
      <Dialog open={openModal === 'security'} onOpenChange={(open) => !open && setOpenModal(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl font-bold">
              <Lock className="h-6 w-6" />
              Seguridad
            </DialogTitle>
            <DialogDescription>Cambia tu contraseña o email de acceso</DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="password" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="password">Cambiar Contraseña</TabsTrigger>
              <TabsTrigger value="email">Cambiar Email</TabsTrigger>
            </TabsList>
            <TabsContent value="password" className="space-y-4 mt-4">
              <div className="space-y-3">
                <Label htmlFor="current-password">Contraseña Actual</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Ingresa tu contraseña actual"
                  className="border-2"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="new-password">Nueva Contraseña</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="border-2"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="confirm-password">Confirmar Nueva Contraseña</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirma tu nueva contraseña"
                  className="border-2"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => {
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                  setOpenModal(null);
                }}>
                  Cancelar
                </Button>
                <Button onClick={handleChangePassword} disabled={changingPassword}>
                  {changingPassword ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Cambiando...
                    </>
                  ) : (
                    'Cambiar Contraseña'
                  )}
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="email" className="space-y-4 mt-4">
              <div className="space-y-3">
                <Label htmlFor="new-email">Nuevo Email</Label>
                <Input
                  id="new-email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="nuevo@email.com"
                  className="border-2"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="confirm-email">Confirmar Nuevo Email</Label>
                <Input
                  id="confirm-email"
                  type="email"
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                  placeholder="Confirma el nuevo email"
                  className="border-2"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="password-for-email">Contraseña Actual</Label>
                <Input
                  id="password-for-email"
                  type="password"
                  value={passwordForEmailChange}
                  onChange={(e) => setPasswordForEmailChange(e.target.value)}
                  placeholder="Ingresa tu contraseña para confirmar"
                  className="border-2"
                />
                <p className="text-xs text-muted-foreground">
                  Necesitamos tu contraseña actual para cambiar el email
                </p>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => {
                  setNewEmail("");
                  setConfirmEmail("");
                  setPasswordForEmailChange("");
                  setOpenModal(null);
                }}>
                  Cancelar
                </Button>
                <Button onClick={handleChangeEmail} disabled={changingEmail}>
                  {changingEmail ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Cambiando...
                    </>
                  ) : (
                    'Cambiar Email'
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Image Cropper Modal */}
      {imageToCrop && (
        <ImageCropper
          open={cropperOpen}
          onOpenChange={setCropperOpen}
          imageSrc={imageToCrop}
          onCropComplete={handleLogoCropComplete}
          aspect={1}
          title="Recortar logo de empresa"
        />
      )}
    </div>
  );
}