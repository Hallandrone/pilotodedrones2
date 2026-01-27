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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

export function Companies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const { data: companiesData, error } = await supabase
        .from('companies')
        .select(`
          *,
          profiles:user_id (
            full_name,
            email,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setCompanies(companiesData as any);
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
    return (name || 'E').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const openDeleteDialog = (company: Company) => {
    setCompanyToDelete(company);
    setDeleteDialogOpen(true);
  };

  const handleDeleteCompany = async () => {
    if (!companyToDelete) return;

    try {
      setLoading(true);
      // Delete user from auth.users (this will cascade delete related data including company entry)
      const { error } = await supabase.rpc('delete_user', {
        target_user_id: companyToDelete.user_id
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Empresa eliminada",
        description: `La empresa ${companyToDelete.company_name} y su usuario asociado han sido eliminados.`,
      });

      fetchCompanies();
      setDeleteDialogOpen(false);
      setCompanyToDelete(null);
    } catch (error: any) {
      console.error('Error deleting company:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar la empresa",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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
                            <AvatarImage src={company.logo_url || company.profiles?.avatar_url || ''} />
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              {getInitials(company.company_name || company.profiles?.full_name || 'E')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{company.company_name}</p>
                            <p className="text-sm text-muted-foreground">{company.profiles?.full_name}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{company.user_id.slice(0, 8)}...</span>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <span>{company.email || company.profiles?.email}</span>
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
                        {getStatusBadge(company.certification_status ? 'active' : 'pending')}
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
                            <DropdownMenuItem
                              className="text-[#dc2626]"
                              onClick={() => openDeleteDialog(company)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {'Eliminar'}
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">
              ⚠️ Eliminar Empresa Permanentemente
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p className="font-semibold">
                Estás a punto de eliminar la empresa:{" "}
                <span className="text-foreground">
                  {companyToDelete?.company_name || 'Sin nombre'}
                </span>
              </p>
              <p className="text-destructive font-bold">
                ⚠️ ADVERTENCIA: Esta acción es IRREVERSIBLE
              </p>
              <div className="bg-destructive/10 p-3 rounded-md border border-destructive/30">
                <p className="text-sm">Se eliminará permanentemente:</p>
                <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                  <li>La cuenta de usuario de la empresa</li>
                  <li>Toda la información del perfil corporativo</li>
                  <li>Servicios y publicaciones asociados</li>
                  <li>Historial de pilotos vinculados</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCompany}
              className="bg-destructive hover:bg-destructive/90"
            >
              Sí, Eliminar Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}