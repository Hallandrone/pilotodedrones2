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
  Plus, 
  Clock, 
  Calendar, 
  MapPin, 
  Plane,
  Save,
  Edit,
  Trash2
} from "lucide-react";

interface FlightRecord {
  id: string;
  date: string;
  duration: number;
  location: string;
  purpose: string;
  notes: string;
  created_at: string;
}

const PilotFlightHours = () => {
  const [flightRecords, setFlightRecords] = useState<FlightRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FlightRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

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
    loadFlightRecords();
  }, []);

  const loadFlightRecords = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Mock data for now - replace with actual Supabase query
      const mockRecords: FlightRecord[] = [
        {
          id: '1',
          date: '2024-01-15',
          duration: 2.5,
          location: 'Santiago, RM',
          purpose: 'Fotografía Aérea',
          notes: 'Sesión de fotos para proyecto inmobiliario',
          created_at: '2024-01-15T10:00:00Z'
        },
        {
          id: '2',
          date: '2024-01-12',
          duration: 1.5,
          location: 'Valparaíso, V',
          purpose: 'Inspección Industrial',
          notes: 'Inspección de torres de alta tensión',
          created_at: '2024-01-12T14:30:00Z'
        }
      ];

      setFlightRecords(mockRecords);
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newRecord: FlightRecord = {
        id: editingRecord?.id || Date.now().toString(),
        date: formData.date,
        duration: parseFloat(formData.duration),
        location: formData.location,
        purpose: formData.purpose,
        notes: formData.notes,
        created_at: editingRecord?.created_at || new Date().toISOString()
      };

      if (editingRecord) {
        setFlightRecords(prev => 
          prev.map(record => record.id === editingRecord.id ? newRecord : record)
        );
        toast({
          title: "Registro actualizado",
          description: "Las horas de vuelo han sido actualizadas",
        });
      } else {
        setFlightRecords(prev => [newRecord, ...prev]);
        toast({
          title: "Registro agregado",
          description: "Las horas de vuelo han sido registradas",
        });
      }

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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF69B4] mb-4"></div>
          <p className="text-[#B0B0B0]">Cargando registros...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-[#E0E0E0]">
      {/* Header */}
      <div className="bg-[#212121] border-b border-[#333333] shadow-sm sticky top-0 z-50">
        <div className="px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/pilot')}
              className="h-10 w-10 rounded-full hover:bg-[#FF69B4]/10 hover:scale-105 transition-all duration-200"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-[#E0E0E0]">
                Horas de Vuelo
              </h1>
              <p className="text-sm text-[#B0B0B0] font-medium">Registra y gestiona tus vuelos</p>
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
      </div>
    </div>
  );
};

export default PilotFlightHours;
