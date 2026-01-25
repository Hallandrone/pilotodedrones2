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
import Logo from "@/components/ui/logo";
import {
  ArrowLeft,
  Plus,
  Clock,
  Calendar,
  MapPin,
  Plane,
  Save,
  Edit,
  Trash2,
  Upload,
  FileText,
  Eye,
  X,
  XCircle,
  Loader2,
  CheckCircle,
  AlertCircle,
  Crown
} from "lucide-react";
import { useSubscriptionPlan } from "@/hooks/useSubscriptionPlan";
import { UpgradeModal } from "@/components/subscription/UpgradeModal";

interface FlightRecord {
  id: string;
  date: string;
  duration: number;
  location: string;
  purpose: string;
  notes: string;
  created_at: string;
}

interface FlightLogCertificate {
  id: string;
  file_name: string;
  file_url: string;
  status: 'pending' | 'validated' | 'rejected';
  uploaded_at: string;
  rejection_observations?: string | null;
  flight_hours?: number | null;
}

const PilotFlightHours = () => {
  const [flightRecords, setFlightRecords] = useState<FlightRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FlightRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [certificates, setCertificates] = useState<FlightLogCertificate[]>([]);
  const [uploadingCertificate, setUploadingCertificate] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { plan, loading: planLoading } = useSubscriptionPlan();

  const [formData, setFormData] = useState({
    date: '',
    duration: '',
    location: '',
    purpose: '',
    notes: ''
  });

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

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadFlightRecords();
      loadCertificates();
      setupRealtimeSubscription();
    }
  }, [user]);

  const loadUser = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadFlightRecords = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      const { data, error } = await supabase
        .from('flight_logs')
        .select('*')
        .eq('user_id', currentUser.id)
        .not('duration_hours', 'is', null)
        .order('flight_date', { ascending: false });

      if (error) throw error;

      if (data) {
        setFlightRecords(data.map(record => ({
          id: record.id,
          date: record.flight_date || record.uploaded_at?.split('T')[0] || '',
          duration: Number(record.duration_hours) || 0,
          location: record.location || '',
          purpose: record.purpose || '',
          notes: record.notes || '',
          created_at: record.created_at
        })));
      }
    } catch (error) {
      console.error('Error loading flight records:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los registros de vuelo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.date || !formData.duration || !formData.location || !formData.purpose) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos obligatorios",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      const recordData = {
        user_id: currentUser.id,
        flight_date: formData.date,
        duration_hours: parseFloat(formData.duration),
        location: formData.location,
        purpose: formData.purpose,
        notes: formData.notes,
        status: 'pending',
        file_name: 'Registro Manual', // Placeholder
        file_url: 'manual-entry'      // Placeholder
      };

      if (editingRecord) {
        const { error } = await supabase
          .from('flight_logs')
          .update(recordData)
          .eq('id', editingRecord.id);

        if (error) throw error;

        toast({
          title: "Registro actualizado",
          description: "Las horas de vuelo han sido actualizadas",
        });
      } else {
        const { error } = await supabase
          .from('flight_logs')
          .insert(recordData);

        if (error) throw error;

        toast({
          title: "Registro agregado",
          description: "Las horas de vuelo han sido registradas",
        });
      }

      await loadFlightRecords();
      resetForm();
    } catch (error) {
      console.error('Error saving flight record:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar el registro",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      date: '',
      duration: '',
      location: '',
      purpose: '',
      notes: ''
    });
    setShowForm(false);
    setEditingRecord(null);
  };

  const handleEdit = (record: FlightRecord) => {
    setFormData({
      date: record.date,
      duration: record.duration.toString(),
      location: record.location,
      purpose: record.purpose,
      notes: record.notes
    });
    setEditingRecord(record);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('flight_logs')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setFlightRecords(prev => prev.filter(record => record.id !== id));
      toast({
        title: "Registro eliminado",
        description: "Las horas de vuelo han sido eliminadas",
      });
    } catch (error) {
      console.error('Error deleting flight record:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el registro",
        variant: "destructive",
      });
    }
  };

  const getTotalHours = () => {
    return flightRecords.reduce((total, record) => total + record.duration, 0);
  };

  const getThisMonthHours = () => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    return flightRecords
      .filter(record => {
        const recordDate = new Date(record.date);
        return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
      })
      .reduce((total, record) => total + record.duration, 0);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const loadCertificates = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('flight_logs')
        .select('id, file_name, file_url, status, uploaded_at, rejection_observations, flight_hours')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setCertificates(data.map(log => ({
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
      console.error('Error loading certificates:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los certificados",
        variant: "destructive",
      });
    }
  };

  const setupRealtimeSubscription = () => {
    if (!user) return;

    const channel = supabase
      .channel('flight-logs-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'flight_logs',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Flight log change detected:', payload);
          loadCertificates();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleCertificateUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
      setUploadingCertificate(true);

      // Upload file to Supabase Storage
      const fileName = `${user.id}/logs/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('flight-logs')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Save flight log record
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

      // Reload certificates
      await loadCertificates();

      toast({
        title: "Certificado subido",
        description: "Tu certificado de horas de vuelo ha sido enviado para revisión",
      });

    } catch (error: any) {
      console.error('Error uploading certificate:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo subir el certificado",
        variant: "destructive",
      });
    } finally {
      setUploadingCertificate(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleViewCertificate = async (id: string) => {
    try {
      const certificate = certificates.find(cert => cert.id === id);
      if (!certificate) return;

      const { data, error } = await supabase.storage
        .from('flight-logs')
        .createSignedUrl(certificate.file_url, 3600);

      if (error) throw error;

      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      console.error('Error viewing certificate:', error);
      toast({
        title: "Error",
        description: "No se pudo abrir el certificado",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCertificate = async (id: string) => {
    try {
      const certificate = certificates.find(cert => cert.id === id);
      if (!certificate) return;

      // Delete file from storage
      const { error: storageError } = await supabase.storage
        .from('flight-logs')
        .remove([certificate.file_url]);

      if (storageError) throw storageError;

      // Delete record from database
      const { error: dbError } = await supabase
        .from('flight_logs')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      // Update local state
      setCertificates(prev => prev.filter(cert => cert.id !== id));

      toast({
        title: "Certificado eliminado",
        description: "El certificado ha sido eliminado correctamente",
      });
    } catch (error) {
      console.error('Error deleting certificate:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el certificado",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'validated':
        return 'bg-green-500/10 text-green-500 border-green-500/30';
      case 'rejected':
        return 'bg-red-500/10 text-red-500 border-red-500/30';
      default:
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'validated':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'validated':
        return 'Validado';
      case 'rejected':
        return 'Rechazado';
      default:
        return 'Pendiente';
    }
  };

  if (loading || planLoading) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF69B4] mb-4"></div>
          <p className="text-[#B0B0B0]">Cargando registros...</p>
        </div>
      </div>
    );
  }

  // Mostrar pantalla de upgrade si el usuario tiene plan gratis
  if (plan && plan.isFree) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] text-[#E0E0E0]">
        {/* Header */}
        <div className="bg-[#020617]/95 backdrop-blur-xl border-b border-[#00b3f3]/30 shadow-2xl sticky top-0 z-50">
          <div className="px-4 py-4 sm:py-6">
            <div className="flex items-center gap-4 max-w-7xl mx-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/pilot')}
                className="h-12 w-12 rounded-full hover:bg-[#00b3f3]/20 hover:scale-110 transition-all duration-300 text-white"
              >
                <ArrowLeft className="h-7 w-7" />
              </Button>
              <Logo
                size="xl"
                className="flex-shrink-0 [&>div]:h-14 [&>div]:w-14 sm:[&>div]:h-20 sm:[&>div]:w-20 hover:scale-110 transition-all duration-300 filter drop-shadow-[0_0_15px_rgba(0,179,243,0.4)]"
                showText={false}
              />
              <div className="flex flex-col">
                <h1 className="text-xl sm:text-3xl font-bold text-white tracking-tight">
                  Horas de Vuelo
                </h1>
                <p className="text-xs sm:text-lg text-[#00b3f3] font-medium uppercase tracking-wider">
                  Característica Pro
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Upgrade Content */}
        <div className="p-4 flex items-center justify-center min-h-[calc(100vh-80px)]">
          <Card className="bg-[#212121] border border-[#333333] shadow-2xl rounded-2xl overflow-hidden max-w-md w-full">
            <div className="bg-gradient-to-r from-blue-500/20 via-cyan-500/10 to-blue-500/20 p-1">
              <CardContent className="p-8 bg-[#2C2C2C] rounded-xl text-center">
                <div className="h-20 w-20 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Crown className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-[#E0E0E0] mb-3">
                  Actualiza a Plan Pro
                </h3>
                <p className="text-[#B0B0B0] mb-6">
                  La bitácora de vuelos y registro de horas está disponible en Plan Pro y Plan Empresa.
                </p>
                <div className="bg-[#212121] border border-[#333333] rounded-xl p-4 mb-6 text-left">
                  <p className="text-sm font-semibold text-[#E0E0E0] mb-3">Con Plan Pro obtienes:</p>
                  <ul className="space-y-2 text-sm text-[#B0B0B0]">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>Bitácora de vuelos ilimitada</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>Registro de horas acumuladas</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>Certificados ilimitados</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>Datos meteorológicos</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>Perfil destacado</span>
                    </li>
                  </ul>
                </div>
                <Button
                  onClick={() => navigate('/pilot/membership')}
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Ver Planes y Precios
                </Button>
              </CardContent>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-[#E0E0E0]">
      {/* Header */}
      <div className="bg-[#020617]/95 backdrop-blur-xl border-b border-[#00b3f3]/30 shadow-2xl sticky top-0 z-50">
        <div className="px-4 py-4 sm:py-6">
          <div className="flex items-center gap-4 max-w-7xl mx-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/pilot')}
              className="h-12 w-12 rounded-full hover:bg-[#00b3f3]/20 hover:scale-110 transition-all duration-300 text-white"
            >
              <ArrowLeft className="h-7 w-7" />
            </Button>
            <Logo
              size="xl"
              className="flex-shrink-0 [&>div]:h-14 [&>div]:w-14 sm:[&>div]:h-20 sm:[&>div]:w-20 hover:scale-110 transition-all duration-300 filter drop-shadow-[0_0_15px_rgba(0,179,243,0.4)]"
              showText={false}
            />
            <div className="flex flex-col">
              <h1 className="text-xl sm:text-3xl font-bold text-white tracking-tight">
                Horas de Vuelo
              </h1>
              <p className="text-xs sm:text-lg text-[#00b3f3] font-medium uppercase tracking-wider">
                Área de Piloto
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 pb-20">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-[#212121] border border-[#333333] shadow-xl rounded-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-[#FF69B4]/20 via-[#FF69B4]/10 to-[#FF69B4]/20 p-1">
              <CardContent className="p-6 text-center bg-[#2C2C2C] rounded-xl">
                <div className="text-4xl font-bold text-[#E0E0E0] mb-2">
                  {getTotalHours().toFixed(1)}h
                </div>
                <div className="text-[#B0B0B0] font-medium">Total</div>
              </CardContent>
            </div>
          </Card>
          <Card className="bg-[#212121] border border-[#333333] shadow-xl rounded-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-green-500/20 via-emerald-500/10 to-teal-500/20 p-1">
              <CardContent className="p-6 text-center bg-[#2C2C2C] rounded-xl">
                <div className="text-4xl font-bold text-green-500 mb-2">
                  {getThisMonthHours().toFixed(1)}h
                </div>
                <div className="text-[#B0B0B0] font-medium">Este Mes</div>
              </CardContent>
            </div>
          </Card>
        </div>

        {/* Add Record Button */}
        {!showForm && (
          <Button
            onClick={() => setShowForm(true)}
            className="w-full h-14 bg-gradient-to-r from-[#FF69B4] to-pink-600 hover:from-[#FF69B4] hover:to-pink-700 text-white font-semibold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-105"
          >
            <Plus className="h-5 w-5 mr-3" />
            Agregar Registro de Vuelo
          </Button>
        )}

        {/* Add/Edit Form */}
        {showForm && (
          <Card className="bg-[#212121] border border-[#333333] shadow-xl rounded-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-[#FF69B4]/20 via-[#FF69B4]/10 to-[#FF69B4]/20 p-1">
              <CardHeader className="p-6 bg-[#2C2C2C] rounded-xl">
                <CardTitle className="flex items-center gap-3 text-xl font-bold text-[#E0E0E0]">
                  <div className="h-10 w-10 bg-gradient-to-br from-[#FF69B4] to-pink-600 rounded-xl flex items-center justify-center">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                  {editingRecord ? 'Editar Registro' : 'Nuevo Registro'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 bg-[#2C2C2C] rounded-xl">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <Label htmlFor="date" className="text-sm font-semibold text-[#E0E0E0] flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Fecha *
                      </Label>
                      <Input
                        id="date"
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                        className="h-12 rounded-xl border-[#333333] focus:border-[#FF69B4] focus:ring-[#FF69B4]/20 transition-all duration-200 bg-[#2C2C2C] text-[#E0E0E0]"
                        required
                      />
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="duration" className="text-sm font-semibold text-[#E0E0E0] flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Duración (h) *
                      </Label>
                      <Input
                        id="duration"
                        type="number"
                        step="0.1"
                        min="0"
                        value={formData.duration}
                        onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                        placeholder="2.5"
                        className="h-12 rounded-xl border-[#333333] focus:border-[#FF69B4] focus:ring-[#FF69B4]/20 transition-all duration-200 bg-[#2C2C2C] text-[#E0E0E0]"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="location" className="text-sm font-semibold text-[#E0E0E0] flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Ubicación *
                    </Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="Santiago, RM"
                      className="h-12 rounded-xl border-[#333333] focus:border-[#FF69B4] focus:ring-[#FF69B4]/20 transition-all duration-200 bg-[#2C2C2C] text-[#E0E0E0]"
                      required
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="purpose" className="text-sm font-semibold text-[#E0E0E0] flex items-center gap-2">
                      <Plane className="h-4 w-4" />
                      Propósito *
                    </Label>
                    <Select value={formData.purpose} onValueChange={(value) => setFormData(prev => ({ ...prev, purpose: value }))}>
                      <SelectTrigger className="h-12 rounded-xl border-[#333333] focus:border-[#FF69B4] focus:ring-[#FF69B4]/20 transition-all duration-200 bg-[#2C2C2C] text-[#E0E0E0]">
                        <SelectValue placeholder="Selecciona el propósito" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#212121] border-[#333333] text-[#E0E0E0]">
                        {purposeOptions.map((purpose) => (
                          <SelectItem key={purpose} value={purpose} className="text-[#E0E0E0] focus:bg-[#FF69B4]/10 focus:text-[#E0E0E0]">
                            {purpose}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="notes" className="text-sm font-semibold text-[#E0E0E0]">
                      Notas
                    </Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Detalles adicionales del vuelo..."
                      className="rounded-xl border-[#333333] focus:border-[#FF69B4] focus:ring-[#FF69B4]/20 transition-all duration-200 resize-none bg-[#2C2C2C] text-[#E0E0E0] min-h-[80px]"
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetForm}
                      className="flex-1 bg-[#2C2C2C] border-[#333333] hover:bg-[#212121] hover:border-[#555555] hover:text-[#E0E0E0] text-[#E0E0E0] transition-all duration-200 rounded-xl font-semibold"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={saving}
                      className="flex-1 bg-gradient-to-r from-[#FF69B4] to-pink-600 hover:from-[#FF69B4] hover:to-pink-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? 'Guardando...' : 'Guardar'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </div>
          </Card>
        )}

        {/* Flight Records List */}
        {flightRecords.length > 0 ? (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-[#E0E0E0]">Registros de Vuelo</h3>
            {flightRecords.map((record) => (
              <Card key={record.id} className="bg-[#212121] border border-[#333333] shadow-xl rounded-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-[#FF69B4]/20 via-[#FF69B4]/10 to-[#FF69B4]/20 p-1">
                  <CardContent className="p-4 bg-[#2C2C2C] rounded-xl">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Plane className="h-6 w-6 text-[#FF69B4]" />
                        <div>
                          <h4 className="font-semibold text-[#E0E0E0]">{record.purpose}</h4>
                          <p className="text-sm text-[#B0B0B0]">
                            {formatDate(record.date)} • {record.duration}h
                          </p>
                          <p className="text-xs text-[#B0B0B0] flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {record.location}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(record)}
                          className="p-2 text-[#E0E0E0] hover:bg-blue-500/10 hover:text-blue-500"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(record.id)}
                          className="p-2 text-red-500 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {record.notes && (
                      <p className="text-sm text-[#B0B0B0] bg-[#212121] border border-[#333333] rounded-xl p-2">
                        {record.notes}
                      </p>
                    )}
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-[#212121] border border-[#333333] shadow-xl rounded-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-[#FF69B4]/20 via-[#FF69B4]/10 to-[#FF69B4]/20 p-1">
              <CardContent className="p-8 text-center bg-[#2C2C2C] rounded-xl">
                <Clock className="h-16 w-16 text-[#B0B0B0] mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[#E0E0E0] mb-2">
                  No hay registros de vuelo
                </h3>
                <p className="text-[#B0B0B0] mb-4">
                  Comienza registrando tus primeras horas de vuelo
                </p>
              </CardContent>
            </div>
          </Card>
        )}

        {/* Certificados de Horas de Vuelo Section */}
        <Card className="bg-[#212121] border border-[#333333] shadow-xl rounded-2xl overflow-hidden mt-6">
          <div className="bg-gradient-to-r from-blue-500/20 via-indigo-500/10 to-purple-500/20 p-1">
            <CardHeader className="p-6 bg-[#2C2C2C] rounded-xl">
              <CardTitle className="flex items-center gap-3 text-xl font-bold text-[#E0E0E0]">
                <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                Certificados de Horas de Vuelo o Itinerarios
              </CardTitle>
              <CardDescription className="text-[#B0B0B0] mt-2">
                Sube archivos como "flight data center" para validación de horas de vuelo por el administrador
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 bg-[#2C2C2C] rounded-xl space-y-4">
              {/* Upload Area */}
              <div className="border-2 border-dashed border-[#333333] rounded-xl p-6 text-center hover:border-[#FF69B4]/50 transition-colors">
                <Upload className={`mx-auto h-8 w-8 ${uploadingCertificate ? 'text-[#B0B0B0]/50' : 'text-[#B0B0B0]'} mb-2`} />
                <p className="text-sm text-[#B0B0B0] mb-2">
                  Arrastra y suelta tu certificado o itinerario aquí, o
                </p>
                <Label htmlFor="certificate-upload" className="cursor-pointer">
                  <span className="text-[#FF69B4] hover:text-[#FF69B4]/80 font-medium">selecciona un archivo</span>
                  <Input
                    id="certificate-upload"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleCertificateUpload}
                    className="hidden"
                    disabled={uploadingCertificate}
                  />
                </Label>
                <p className="text-xs text-[#B0B0B0] mt-1">
                  Formatos admitidos: PDF, JPG, PNG (máx. 10MB)
                </p>
                {uploadingCertificate && (
                  <div className="mt-3 flex items-center justify-center gap-2 text-sm text-[#B0B0B0]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Subiendo archivo...</span>
                  </div>
                )}
              </div>

              {/* Certificates List */}
              {certificates.length > 0 && (
                <div className="mt-6 space-y-3">
                  <h4 className="font-medium text-[#E0E0E0] mb-4">Certificados subidos</h4>
                  {certificates.map((cert) => (
                    <div key={cert.id} className="p-4 bg-[#212121] rounded-xl border border-[#333333]">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <FileText className="h-5 w-5 text-blue-500" />
                          </div>
                          <div>
                            <p className="font-medium text-[#E0E0E0]">{cert.file_name}</p>
                            <p className="text-xs text-[#B0B0B0]">
                              Subido el {new Date(cert.uploaded_at).toLocaleDateString()}
                            </p>
                            {cert.flight_hours && (
                              <p className="text-xs text-blue-500 font-medium mt-1">
                                {cert.flight_hours} horas validadas
                              </p>
                            )}
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
                            onClick={() => handleViewCertificate(cert.id)}
                            className="text-blue-500 hover:text-blue-400 hover:bg-blue-500/10"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCertificate(cert.id)}
                            className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {cert.rejection_observations && (
                        <div className={`mt-3 p-3 rounded-lg border ${cert.status === 'rejected'
                          ? 'bg-red-500/10 border-red-500/30'
                          : cert.status === 'validated'
                            ? 'bg-green-500/10 border-green-500/30'
                            : 'bg-blue-500/10 border-blue-500/30'
                          }`}>
                          <div className="flex items-start gap-2">
                            {cert.status === 'rejected' ? (
                              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                            ) : cert.status === 'validated' ? (
                              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                            )}
                            <div className="flex-1">
                              <p className={`text-sm font-semibold mb-1 ${cert.status === 'rejected'
                                ? 'text-red-400'
                                : cert.status === 'validated'
                                  ? 'text-green-400'
                                  : 'text-blue-400'
                                }`}>
                                {cert.status === 'rejected'
                                  ? 'Observaciones del administrador (Rechazado):'
                                  : cert.status === 'validated'
                                    ? 'Observaciones del administrador (Validado):'
                                    : 'Observaciones del administrador:'
                                }
                              </p>
                              <p className={`text-sm whitespace-pre-wrap ${cert.status === 'rejected'
                                ? 'text-red-300'
                                : cert.status === 'validated'
                                  ? 'text-green-300'
                                  : 'text-blue-300'
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
              )}
            </CardContent>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PilotFlightHours;
