import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle, 
  XCircle,
  Clock,
  AlertCircle
} from "lucide-react";
import { 
  getCertificationStatus, 
  getDaysUntilExpiration, 
  formatExpirationDate 
} from "@/utils/certificationHelpers";

interface PilotService {
  id: string;
  service_type: string;
  description: string | null;
  price_per_hour: number | null;
  is_published: boolean;
}

interface PilotDetails {
  id: string;
  user_id: string;
  phone: string | null;
  certifications: string[] | null;
  certification_status: boolean | null;
  certification_validated_at?: string | null;
  certification_expires_at?: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
  profiles: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
  pilot_services: PilotService[];
}

interface PilotDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pilot: PilotDetails | null;
  onStatusUpdate: (pilotId: string, newStatus: string) => void;
}

export function PilotDetailsModal({ 
  open, 
  onOpenChange, 
  pilot, 
  onStatusUpdate 
}: PilotDetailsModalProps) {
  if (!pilot) return null;

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'suspended':
        return 'destructive';
      case 'rejected':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    const statusMap: { [key: string]: string } = {
      active: 'Activo',
      pending: 'Pendiente',
      suspended: 'Suspendido',
      rejected: 'Rechazado'
    };
    return statusMap[status] || status;
  };

  const handleStatusChange = (newStatus: string) => {
    onStatusUpdate(pilot.id, newStatus);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl p-10 border border-slate-200 shadow-2xl">
        <DialogHeader className="border-b-2 border-gray-200 pb-4 mb-8 flex flex-row items-center justify-between">
          <DialogTitle className="text-3xl font-bold text-slate-900 m-0">
            Detalles del Piloto
          </DialogTitle>
        </DialogHeader>

        {/* Nombre del Piloto */}
        <h3 className="text-2xl font-semibold text-slate-800 mb-5 flex items-center gap-2">
          👤 {pilot.profiles.full_name || 'Sin nombre'}
        </h3>

        <div className="space-y-7">
          {/* Información Personal */}
          <section className="mb-7">
            <h4 className="text-lg font-semibold text-blue-800 mb-3">Información Personal</h4>
            <div className="grid grid-cols-2 gap-2.5 text-slate-600">
              <p><strong>Email:</strong> {pilot.profiles.email || 'No especificado'}</p>
              <p><strong>Teléfono:</strong> {pilot.phone || 'No especificado'}</p>
              <p><strong>Registrado:</strong> {new Date(pilot.created_at).toLocaleDateString('es-ES')}</p>
              <p>
                <strong>Estado:</strong> 
                <span className={`ml-1 font-semibold ${
                  pilot.status === 'active' ? 'text-green-600' : 
                  pilot.status === 'pending' ? 'text-yellow-600' : 
                  'text-red-600'
                }`}>
                  {getStatusLabel(pilot.status)}
                </span>
              </p>
            </div>
          </section>

          {/* Certificaciones */}
          <section className="mb-7 bg-gray-50 p-5 rounded-xl border-l-4 border-sky-500">
            <h4 className="text-lg font-semibold text-sky-700 mb-2.5">Certificaciones y Acreditaciones</h4>
            {(() => {
              const certStatus = getCertificationStatus(
                pilot.certification_status,
                pilot.certification_expires_at
              );
              const daysUntilExpiration = getDaysUntilExpiration(pilot.certification_expires_at);
              
              return (
                <>
                  <div className="mb-2.5">
                    <strong>Estado:</strong> 
                    {certStatus === 'valid' && (
                      <span className="text-green-600 ml-1 flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" />
                        Certificado (Vigente)
                      </span>
                    )}
                    {certStatus === 'expiring_soon' && (
                      <span className="text-yellow-600 ml-1 flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        Certificado (Por vencer - {daysUntilExpiration} días)
                      </span>
                    )}
                    {certStatus === 'expired' && (
                      <span className="text-red-600 ml-1 flex items-center gap-1">
                        <XCircle className="h-4 w-4" />
                        Certificado (Vencido)
                      </span>
                    )}
                    {certStatus === 'not_validated' && (
                      <span className="text-red-600 ml-1 flex items-center gap-1">
                        <XCircle className="h-4 w-4" />
                        Sin certificar
                      </span>
                    )}
                  </div>
                  
                  {pilot.certification_validated_at && (
                    <p className="mb-2.5 text-sm text-slate-600">
                      <strong>Última validación:</strong> {new Date(pilot.certification_validated_at).toLocaleDateString('es-CL')}
                    </p>
                  )}
                  
                  {pilot.certification_expires_at && (
                    <p className="mb-2.5 text-sm text-slate-600">
                      <strong>Válido hasta:</strong> {formatExpirationDate(pilot.certification_expires_at)}
                      {daysUntilExpiration !== null && daysUntilExpiration > 0 && (
                        <span className="ml-2">({daysUntilExpiration} días restantes)</span>
                      )}
                    </p>
                  )}
                  
                  {pilot.certifications && pilot.certifications.length > 0 ? (
                    <div className="mt-2.5">
                      <strong className="text-slate-800">Certificaciones:</strong>
                      <ul className="mt-1.5 pl-5 text-slate-800">
                        {pilot.certifications.map((cert, index) => (
                          <li key={index}>{cert}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-slate-600 mt-2.5">No hay certificaciones registradas</p>
                  )}
                </>
              );
            })()}
          </section>

          {/* Servicios Publicados */}
          <section className="mb-7">
            <h4 className="text-lg font-semibold text-blue-800 mb-3">Servicios Publicados</h4>
            
            {pilot.pilot_services && pilot.pilot_services.length > 0 ? (
              <div className="space-y-4">
                {pilot.pilot_services.map((service) => (
                  <div key={service.id} className="mb-4 p-4 border border-slate-200 rounded-xl bg-slate-50">
                    <p className="m-0 font-semibold text-slate-900 flex items-center justify-between">
                      📸 {service.service_type} 
                      <span className={`text-sm ${service.is_published ? 'text-green-600' : 'text-slate-600'}`}>
                        {service.is_published ? '✓ Publicado' : '📝 Borrador'}
                      </span>
                    </p>
                    {service.price_per_hour && (
                      <p className="my-1.5">
                        💲 <strong>Precio por hora:</strong> 
                        <span className="text-slate-800 ml-1">
                          ${service.price_per_hour.toLocaleString('es-CL')} CLP
                        </span>
                      </p>
                    )}
                    {service.description && (
                      <p className="m-0 text-slate-600">{service.description}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-600">
                <p>Este piloto aún no ha publicado servicios</p>
              </div>
            )}
          </section>

          {/* Acciones de Administración */}
          {pilot.status === 'pending' && (
            <section className="text-right mt-7">
              <div className="flex gap-2 justify-end">
                <Button 
                  onClick={() => handleStatusChange('active')}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  ✓ Aprobar Piloto
                </Button>
                <Button 
                  onClick={() => handleStatusChange('rejected')}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  🚫 Rechazar Piloto
                </Button>
              </div>
            </section>
          )}

          {pilot.status === 'active' && (
            <section className="text-right mt-7">
              <Button 
                onClick={() => handleStatusChange('suspended')}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold"
              >
                <XCircle className="mr-2 h-4 w-4" />
                🚫 Suspender Piloto
              </Button>
            </section>
          )}

          {pilot.status === 'suspended' && (
            <section className="text-right mt-7">
              <Button 
                onClick={() => handleStatusChange('active')}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                ✓ Reactivar Piloto
              </Button>
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}