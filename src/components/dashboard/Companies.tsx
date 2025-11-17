import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CreateCompanyDialog } from "./CreateCompanyDialog";
import { CompanyDetailsModal } from "./CompanyDetailsModal";
import { 
  Loader2, 
  Building, 
  Mail, 
  Phone,
  Calendar, 
  Plus, 
  MoreHorizontal, 
  Eye, 
  Trash2,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";

interface Company {
  id: string;
  legal_name: string;
  fantasy_name: string | null;
  rut: string;
  address: string | null;
  phone: string | null;
  email: string;
  description: string | null;
  logo_url: string | null;
  status: string;
  created_at: string;
  user_id: string;
}

export function Companies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      // Temporary mock data - replace with actual Supabase query when table is created
      const mockCompanies: Company[] = [
        {
          id: "1",
          legal_name: "Drones Tech SpA",
          fantasy_name: "DronesTech",
          rut: "77.123.456-7",
          address: "Av. Providencia 123, Santiago",
          phone: "+56 9 1234 5678",
          email: "contacto@dronestech.cl",
          description: "Empresa especializada en servicios de drones para agricultura de precisión",
          logo_url: null,
          status: "active",
          created_at: "2024-01-15T10:00:00Z",
          user_id: "user1"
        },
        {
          id: "2",
          legal_name: "AeroVision Ltda.",
          fantasy_name: "AeroVision",
          rut: "88.987.654-3",
          address: "Las Condes 456, Santiago",
          phone: "+56 9 8765 4321",
          email: "info@aerovision.cl",
          description: "Fotografía y filmación aérea profesional",
          logo_url: null,
          status: "pending",
          created_at: "2024-01-20T14:30:00Z",
          user_id: "user2"
        }
      ];
      
      setCompanies(mockCompanies);
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las empresas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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
        <IconComponent className={`h-3 w-3 ${config.color}`} />
        <Badge variant={config.variant}>{config.label}</Badge>
      </div>
    );
  };

  const openDetailsModal = (company: Company) => {
    setSelectedCompany(company);
    setDetailsModalOpen(true);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Empresas</h1>
            <p className="text-muted-foreground">Gestiona las empresas registradas en la plataforma</p>
          </div>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="bg-[#2563eb] hover:bg-[#1d4ed8]">
          <Plus className="mr-2 h-4 w-4" />
          Registrar Nueva Empresa
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Empresas Registradas</span>
            <Badge variant="secondary" className="text-sm">
              {companies.length} empresas
            </Badge>
          </CardTitle>
          <CardDescription>
            Lista completa de empresas registradas y su información de contacto
          </CardDescription>
        </CardHeader>
        <CardContent>
          {companies.length === 0 ? (
            <div className="text-center py-8">
              <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay empresas registradas</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>RUT / ID</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha Registro</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={company.logo_url || ''} />
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              {getInitials(company.legal_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{company.fantasy_name || company.legal_name}</p>
                            <p className="text-sm text-muted-foreground">{company.legal_name}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{company.rut}</span>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <span>{company.email}</span>
                          </div>
                          {company.phone && (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <span>{company.phone}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(company.status)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(company.created_at).toLocaleDateString('es-ES')}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Abrir menú</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-card">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => openDetailsModal(company)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Ver Detalles
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-[#dc2626]">
                              <Trash2 className="mr-2 h-4 w-4" />
                              {company.status === 'active' ? 'Desactivar' : 'Eliminar'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateCompanyDialog 
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={fetchCompanies}
      />

      <CompanyDetailsModal
        company={selectedCompany}
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
        onUpdate={fetchCompanies}
      />
    </div>
  );
}