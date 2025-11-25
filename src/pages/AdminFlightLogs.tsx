import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  FileText, 
  Eye, 
  CheckCircle, 
  Clock, 
  XCircle,
  User,
  Calendar,
  AlertCircle
} from "lucide-react";

interface FlightLog {
  id: string;
  user_id: string;
  file_name: string;
  file_url: string;
  status: 'pending' | 'validated' | 'rejected';
  uploaded_at: string;
  validated_at: string | null;
  validated_by: string | null;
  rejection_observations: string | null;
  flight_hours: number | null;
  profiles: {
    full_name: string;
    email: string;
  } | null;
}

const AdminFlightLogs = () => {
  const [flightLogs, setFlightLogs] = useState<FlightLog[]>([]);
  const [allFlightLogs, setAllFlightLogs] = useState<FlightLog[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'validated' | 'rejected'>('pending');
  const [selectedLog, setSelectedLog] = useState<FlightLog | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectionObservations, setRejectionObservations] = useState('');
  const [flightHours, setFlightHours] = useState<string>('');
  const [rejectingLogId, setRejectingLogId] = useState<string | null>(null);
  const [approvingLogId, setApprovingLogId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadFlightLogs();
    
    // Configurar Realtime subscription para escuchar cambios en tiempo real
    const channel = supabase
      .channel('flight-logs-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'flight_logs'
        },
        (payload) => {
          console.log('Flight log change detected:', payload);
          loadFlightLogs();
          
          if (payload.eventType === 'INSERT' && payload.new?.status === 'pending') {
            toast({
              title: "Nueva vitacora recibida",
              description: `Se ha recibido una nueva vitacora para revisar`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (allFlightLogs.length === 0) return;
    applyFilter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const loadFlightLogs = async () => {
    try {
      const { data: logsData, error: logsError } = await supabase
        .from('flight_logs')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (logsError) throw logsError;

      // Get unique user IDs
      const userIds = [...new Set((logsData || []).map(log => log.user_id))];
      
      // Fetch all profiles at once
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error loading profiles:', profilesError);
      }

      // Combine flight logs with profiles
      const logsWithProfiles = (logsData || []).map(log => {
        const profile = profilesData?.find(p => p.id === log.user_id);
        return {
          ...log,
          profiles: profile ? { full_name: profile.full_name, email: profile.email } : null
        };
      });

      const allLogs = logsWithProfiles as FlightLog[];
      setAllFlightLogs(allLogs);
      
      // Apply current filter
      applyFilterToLogs(allLogs);
    } catch (error) {
      console.error('Error loading flight logs:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las vitacoras",
        variant: "destructive",
      });
    }
  };

  const applyFilterToLogs = (allLogs: FlightLog[]) => {
    if (filter === 'all') {
      setFlightLogs(allLogs);
    } else {
      const filtered = allLogs.filter(log => log.status === filter);
      setFlightLogs(filtered);
    }
  };

  const applyFilter = () => {
    applyFilterToLogs(allFlightLogs);
  };

  const handleApproveClick = (id: string) => {
    setApprovingLogId(id);
    setFlightHours('');
    setApproveDialogOpen(true);
  };

  const handleApprove = async () => {
    if (!approvingLogId) {
      toast({
        title: "Error",
        description: "No se pudo identificar la vitacora a aprobar",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const hours = flightHours ? parseFloat(flightHours) : null;
      
      if (hours !== null && (isNaN(hours) || hours < 0)) {
        toast({
          title: "Horas inválidas",
          description: "Las horas de vuelo deben ser un número positivo",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('flight_logs')
        .update({ 
          status: 'validated',
          validated_at: new Date().toISOString(),
          validated_by: user.id,
          flight_hours: hours
        })
        .eq('id', approvingLogId);

      if (error) throw error;

      toast({
        title: "✅ Vitacora validada",
        description: hours 
          ? `La vitacora fue validada con ${hours} horas de vuelo`
          : "La vitacora fue validada exitosamente",
      });

      setApproveDialogOpen(false);
      setFlightHours('');
      setApprovingLogId(null);
      await loadFlightLogs();
    } catch (error: any) {
      console.error('Error al aprobar vitacora:', error);
      toast({
        title: "Error al aprobar vitacora",
        description: error?.message || "No se pudo aprobar la vitacora",
        variant: "destructive",
      });
    }
  };

  const handleRejectClick = (id: string) => {
    setRejectingLogId(id);
    setRejectionObservations('');
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!rejectingLogId) {
      toast({
        title: "Error",
        description: "No se pudo identificar la vitacora a rechazar",
        variant: "destructive",
      });
      return;
    }

    if (!rejectionObservations.trim()) {
      toast({
        title: "Observaciones requeridas",
        description: "Debes ingresar las observaciones para rechazar la vitacora",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const { error } = await supabase
        .from('flight_logs')
        .update({ 
          status: 'rejected',
          validated_at: new Date().toISOString(),
          validated_by: user.id,
          rejection_observations: rejectionObservations.trim()
        })
        .eq('id', rejectingLogId);

      if (error) throw error;

      toast({
        title: "Vitacora rechazada",
        description: "La vitacora ha sido rechazada con las observaciones ingresadas",
      });

      setRejectDialogOpen(false);
      setRejectionObservations('');
      setRejectingLogId(null);
      await loadFlightLogs();
    } catch (error: any) {
      console.error('Error al rechazar vitacora:', error);
      toast({
        title: "Error al rechazar vitacora",
        description: error?.message || "No se pudo rechazar la vitacora",
        variant: "destructive",
      });
    }
  };

  const getSignedUrl = async (filePath: string): Promise<string> => {
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      return filePath;
    }
    
    const { data, error } = await supabase.storage
      .from('flight-logs')
      .createSignedUrl(filePath, 3600);
    
    if (error) {
      console.error('Error creating signed URL:', error);
      throw error;
    }
    
    return data.signedUrl;
  };

  const handleViewFlightLog = async (filePath: string) => {
    try {
      const url = await getSignedUrl(filePath);
      window.open(url, '_blank');
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo abrir la vitacora",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'validated':
        return (
          <Badge className="bg-green-500/20 text-green-500 border border-green-500">
            <CheckCircle className="h-3 w-3 mr-1" />
            Validado
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-500/20 text-red-500 border border-red-500">
            <XCircle className="h-3 w-3 mr-1" />
            Rechazado
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-500/20 text-yellow-500 border border-yellow-500">
            <Clock className="h-3 w-3 mr-1" />
            Pendiente
          </Badge>
        );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFilterCount = (status: string) => {
    return allFlightLogs.filter(log => 
      status === 'all' ? true : log.status === status
    ).length;
  };

  return (
    <>
      {/* Title and Description */}
      <div className="space-y-2 mb-6">
        <h1 className="text-3xl font-bold text-foreground">
          Gestión de Vitacoras de Vuelo
        </h1>
        <p className="text-muted-foreground">Aprobar o rechazar vitacoras de vuelo</p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-2 overflow-x-auto">
        <Button
          size="sm"
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
          className={`rounded-xl ${filter === 'all' ? 'text-white' : 'text-muted-foreground border-muted-foreground/20'}`}
        >
          Todas ({getFilterCount('all')})
        </Button>
        <Button
          size="sm"
          variant={filter === 'pending' ? 'default' : 'outline'}
          onClick={() => setFilter('pending')}
          className={`rounded-xl ${filter === 'pending' ? 'text-white' : 'text-muted-foreground border-muted-foreground/20'}`}
        >
          Pendientes ({getFilterCount('pending')})
        </Button>
        <Button
          size="sm"
          variant={filter === 'validated' ? 'default' : 'outline'}
          onClick={() => setFilter('validated')}
          className={`rounded-xl ${filter === 'validated' ? 'text-white' : 'text-muted-foreground border-muted-foreground/20'}`}
        >
          Validadas ({getFilterCount('validated')})
        </Button>
        <Button
          size="sm"
          variant={filter === 'rejected' ? 'default' : 'outline'}
          onClick={() => setFilter('rejected')}
          className={`rounded-xl ${filter === 'rejected' ? 'text-white' : 'text-muted-foreground border-muted-foreground/20'}`}
        >
          Rechazadas ({getFilterCount('rejected')})
        </Button>
      </div>

      {/* Content */}
      {flightLogs.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Vitacora</TableHead>
                    <TableHead>Fecha de Subida</TableHead>
                    <TableHead>Fecha de Validación</TableHead>
                    <TableHead>Horas Validadas</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Observaciones</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flightLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                            <User className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="font-medium">{log.profiles?.full_name || 'N/A'}</p>
                            <p className="text-sm text-muted-foreground">{log.profiles?.email || 'N/A'}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{log.file_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {formatDate(log.uploaded_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.validated_at ? (
                          <div className="flex items-center gap-2 text-sm text-green-500">
                            <CheckCircle className="h-4 w-4" />
                            {formatDate(log.validated_at)}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.flight_hours ? (
                          <span className="font-medium text-accent">{log.flight_hours} hrs</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(log.status)}
                      </TableCell>
                      <TableCell>
                        {log.status === 'rejected' && log.rejection_observations ? (
                          <div className="max-w-xs">
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {log.rejection_observations}
                            </p>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewFlightLog(log.file_url)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver
                          </Button>
                          {log.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApproveClick(log.id)}
                                className="border-green-500 text-green-500 hover:bg-green-500 hover:text-white"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Aprobar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRejectClick(log.id)}
                                className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Rechazar
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="h-20 w-20 bg-gradient-to-br from-slate-500 to-gray-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <FileText className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-xl font-bold mb-3">
              No hay vitacoras {filter === 'all' ? '' : filter === 'pending' ? 'pendientes' : filter === 'validated' ? 'validadas' : 'rechazadas'}
            </h3>
            <p className="text-muted-foreground">
              {filter === 'pending' 
                ? 'No hay vitacoras esperando revisión'
                : 'No hay vitacoras en esta categoría'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Dialog para aprobar vitacora */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Validar Vitacora
            </DialogTitle>
            <DialogDescription>
              Valida esta vitacora. Opcionalmente, puedes ingresar las horas de vuelo validadas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="flight-hours">Horas de Vuelo (Opcional)</Label>
              <Input
                id="flight-hours"
                type="number"
                step="0.1"
                min="0"
                placeholder="Ej: 5.5"
                value={flightHours}
                onChange={(e) => setFlightHours(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Ingresa las horas de vuelo validadas de esta vitacora (opcional)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setApproveDialogOpen(false);
                setFlightHours('');
                setApprovingLogId(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleApprove}
              className="bg-green-500 hover:bg-green-600"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Validar Vitacora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para ingresar observaciones al rechazar */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Rechazar Vitacora
            </DialogTitle>
            <DialogDescription>
              Ingresa las observaciones sobre por qué se rechaza esta vitacora. El usuario recibirá esta información.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="observations">Observaciones *</Label>
              <Textarea
                id="observations"
                placeholder="Ej: La vitacora no cumple con los requisitos establecidos, falta información, documento ilegible, etc."
                value={rejectionObservations}
                onChange={(e) => setRejectionObservations(e.target.value)}
                rows={5}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Estas observaciones serán visibles para el usuario
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setRejectionObservations('');
                setRejectingLogId(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionObservations.trim()}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Rechazar Vitacora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminFlightLogs;

