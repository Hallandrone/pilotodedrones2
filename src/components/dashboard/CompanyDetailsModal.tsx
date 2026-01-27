import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Building,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Edit,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Tag
} from "lucide-react";
import { CreateServiceDialog } from "./CreateServiceDialog";

interface Company {
  id: string;
  company_name: string;
  email: string | null;
  phone: string | null;
  logo_url: string | null;
  certification_status: boolean | null;
  created_at: string;
  user_id: string;
  description?: string | null;
  location?: string | null;
  address?: string | null;
  region?: string | null;
  profiles?: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
}

interface CompanyService {
  id: string;
  name: string;
  description: string;
  price: string;
  category: string;
  status: string;
  created_at: string;
}

interface CompanyDetailsModalProps {
  company: Company | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function CompanyDetailsModal({ company, open, onOpenChange, onUpdate }: CompanyDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'services'>('info');
  const [createServiceOpen, setCreateServiceOpen] = useState(false);
  const { toast } = useToast();

  // Mock services data
  const mockServices: CompanyService[] = [
    {
      id: "1",
      name: "Fotografía Aérea Profesional",
      description: "Servicio completo de fotografía aérea para eventos, propiedades y proyectos comerciales",
      price: "$50.000 CLP/hora",
      category: "Fotografía",
      status: "active",
      created_at: "2024-01-15T10:00:00Z"
    },
    {
      id: "2",
      name: "Inspección Técnica de Estructuras",
      description: "Inspección detallada de edificios, puentes y estructuras mediante drones especializados",
      price: "$80.000 CLP/día",
      category: "Inspección Técnica",
      status: "active",
      created_at: "2024-01-20T14:30:00Z"
    }
  ];

  if (!company) return null;

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: 'Activa', variant: 'default' as const, icon: CheckCircle, color: 'text-green-500' },
      inactive: { label: 'Inactiva', variant: 'secondary' as const, icon: XCircle, color: 'text-gray-500' },
      pending: { label: 'Pendiente', variant: 'outline' as const, icon: Clock, color: 'text-yellow-500' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const IconComponent = config.icon;

    return (
      <div className="flex items-center gap-1">
        <IconComponent className={`h-4 w-4 ${config.color}`} />
        <Badge variant={config.variant}>{config.label}</Badge>
      </div>
    );
  };

  const getServiceStatusBadge = (status: string) => {
    return status === 'active' ? (
      <Badge className="bg-[#16a34a] hover:bg-[#15803d]">Publicado</Badge>
    ) : (
      <Badge variant="secondary">Inactivo</Badge>
    );
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      'Fotografía': 'bg-blue-100 text-blue-800',
      'Inspección Técnica': 'bg-orange-100 text-orange-800',
      'Agricultura': 'bg-green-100 text-green-800',
      'Topografía': 'bg-purple-100 text-purple-800',
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-primary" />
              Detalles de la Empresa
            </DialogTitle>
            <DialogDescription>
              Información completa y servicios de {company.company_name}
            </DialogDescription>
          </DialogHeader>

          {/* Navigation Tabs */}
          <div className="flex gap-4 border-b">
            <button
              onClick={() => setActiveTab('info')}
              className={`pb-2 px-1 font-medium text-sm border-b-2 transition-colors ${activeTab === 'info'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
            >
              Información General
            </button>
            <button
              onClick={() => setActiveTab('services')}
              className={`pb-2 px-1 font-medium text-sm border-b-2 transition-colors ${activeTab === 'services'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
            >
              Servicios ({mockServices.length})
            </button>
          </div>

          {/* Tab Content */}
          <div className="space-y-6">
            {activeTab === 'info' && (
              <>
                {/* Company Header */}
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={company.logo_url || company.profiles?.avatar_url || ''} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                      {getInitials(company.company_name || company.profiles?.full_name || 'E')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold">{company.company_name}</h3>
                      {getStatusBadge(company.certification_status ? 'active' : 'pending')}
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">{company.profiles?.full_name}</p>
                    <p className="text-sm font-mono text-muted-foreground">ID: {company.user_id.slice(0, 8)}...</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                </div>

                <Separator />

                {/* Contact Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Información de Contacto</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{company.email}</span>
                    </div>
                    {company.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{company.phone}</span>
                      </div>
                    )}
                    {company.address && (
                      <div className="flex items-center gap-3">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{company.address}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>Registrada el {new Date(company.created_at).toLocaleDateString('es-ES')}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Description */}
                {company.description && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Descripción</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground leading-relaxed">{company.description}</p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {activeTab === 'services' && (
              <>
                {/* Services Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Servicios Publicados</h3>
                    <p className="text-sm text-muted-foreground">
                      Gestiona los servicios que ofrece esta empresa
                    </p>
                  </div>
                  <Button
                    onClick={() => setCreateServiceOpen(true)}
                    className="bg-[#2563eb] hover:bg-[#1d4ed8]"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Publicar Servicio
                  </Button>
                </div>

                {/* Services List */}
                <div className="space-y-4">
                  {mockServices.length === 0 ? (
                    <Card>
                      <CardContent className="text-center py-8">
                        <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No hay servicios publicados</p>
                        <Button
                          onClick={() => setCreateServiceOpen(true)}
                          variant="outline"
                          className="mt-3"
                        >
                          Publicar primer servicio
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    mockServices.map((service) => (
                      <Card key={service.id}>
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="font-semibold">{service.name}</h4>
                                {getServiceStatusBadge(service.status)}
                              </div>
                              <div className="flex items-center gap-2 mb-3">
                                <Badge
                                  variant="secondary"
                                  className={getCategoryColor(service.category)}
                                >
                                  {service.category}
                                </Badge>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <DollarSign className="h-3 w-3" />
                                  {service.price}
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">{service.description}</p>
                              <p className="text-xs text-muted-foreground">
                                Publicado el {new Date(service.created_at).toLocaleDateString('es-ES')}
                              </p>
                            </div>
                            <div className="flex gap-2 ml-4">
                              <Button variant="outline" size="sm">
                                <Edit className="h-3 w-3 mr-1" />
                                Editar
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <CreateServiceDialog
        open={createServiceOpen}
        onOpenChange={setCreateServiceOpen}
        companyId={company?.id || ''}
        onSuccess={() => {
          // Refresh services when created
          toast({
            title: "Servicio publicado",
            description: "El nuevo servicio ha sido publicado exitosamente",
          });
        }}
      />
    </>
  );
}