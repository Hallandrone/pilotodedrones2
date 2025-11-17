import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Edit, Plus, CreditCard, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createPlan, updatePlan, type ReveniuPlan } from "@/integrations/reveniu/client";

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  description: string;
  features: {
    servicePublications: number;
    supportLevel: string;
    searchPriority: boolean;
    pilotLimit?: number;
    companyLimit?: number;
  };
  active: boolean;
  reveniu_plan_id?: string;
}

export function SubscriptionConfiguration() {
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([
    {
      id: "1",
      name: "Plan Básico",
      price: 9990,
      currency: "CLP",
      description: "Perfecto para pilotos independientes",
      features: {
        servicePublications: 5,
        supportLevel: "Email",
        searchPriority: false,
        pilotLimit: 1
      },
      active: true
    },
    {
      id: "2",
      name: "Plan Premium",
      price: 19990,
      currency: "CLP", 
      description: "Ideal para empresas pequeñas y medianas",
      features: {
        servicePublications: 20,
        supportLevel: "Chat y Email",
        searchPriority: true,
        pilotLimit: 5,
        companyLimit: 1
      },
      active: true
    },
    {
      id: "3",
      name: "Plan Enterprise",
      price: 49990,
      currency: "CLP",
      description: "Solución completa para grandes empresas",
      features: {
        servicePublications: -1, // Ilimitado
        supportLevel: "24/7 Phone + Chat + Email",
        searchPriority: true,
        pilotLimit: -1, // Ilimitado
        companyLimit: 3
      },
      active: true
    }
  ]);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newPlan, setNewPlan] = useState({
    name: "",
    price: 0,
    currency: "CLP",
    description: "",
    features: {
      servicePublications: 1,
      supportLevel: "Email",
      searchPriority: false,
      pilotLimit: 1,
      companyLimit: 0
    },
    active: true
  });

  const handleCreatePlan = async () => {
    if (!newPlan.name || newPlan.price <= 0) {
      toast({
        title: "Error",
        description: "Complete todos los campos requeridos",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      // Crear plan en Reveniu
      const reveniuPlan: ReveniuPlan = {
        title: newPlan.name,
        description: newPlan.description || newPlan.name,
        amount: newPlan.price,
        currency: newPlan.currency.toLowerCase() === 'clp' ? 'CLP' : 'USD',
        frequency: 'monthly', // Por defecto mensual, se puede hacer configurable
      };

      const reveniuResponse = await createPlan(reveniuPlan);

      // Crear plan local con el ID de Reveniu
      const plan: SubscriptionPlan = {
        id: Date.now().toString(),
        ...newPlan,
        reveniu_plan_id: reveniuResponse.id,
      };

      setPlans([...plans, plan]);
      setNewPlan({
        name: "",
        price: 0,
        currency: "CLP",
        description: "",
        features: {
          servicePublications: 1,
          supportLevel: "Email",
          searchPriority: false,
          pilotLimit: 1,
          companyLimit: 0
        },
        active: true
      });
      setIsCreateDialogOpen(false);
      
      toast({
        title: "Plan creado",
        description: "El plan de suscripción ha sido creado exitosamente en Reveniu",
      });
    } catch (error: any) {
      console.error('Error creating plan:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el plan en Reveniu. Intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const togglePlanStatus = (id: string) => {
    setPlans(prev => prev.map(plan => 
      plan.id === id ? { ...plan, active: !plan.active } : plan
    ));
  };

  const deletePlan = (id: string) => {
    setPlans(prev => prev.filter(plan => plan.id !== id));
    toast({
      title: "Plan eliminado",
      description: "El plan de suscripción ha sido eliminado exitosamente",
    });
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: currency === 'CLP' ? 'CLP' : 'USD'
    }).format(price);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          Configuración de Suscripciones
        </CardTitle>
        <CardDescription>
          Administra los planes de suscripción y precios de la plataforma
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">Planes de Suscripción</h3>
            <p className="text-sm text-muted-foreground">
              Gestiona los diferentes planes disponibles para usuarios
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Plan
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Crear Nuevo Plan</DialogTitle>
                <DialogDescription>
                  Configure un nuevo plan de suscripción
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nombre del Plan</Label>
                  <Input
                    id="name"
                    value={newPlan.name}
                    onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                    placeholder="Ej: Plan Premium"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="price">Precio</Label>
                    <Input
                      id="price"
                      type="number"
                      value={newPlan.price}
                      onChange={(e) => setNewPlan({ ...newPlan, price: Number(e.target.value) })}
                      placeholder="19990"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="currency">Moneda</Label>
                    <Select value={newPlan.currency} onValueChange={(value) => setNewPlan({ ...newPlan, currency: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CLP">CLP (Peso Chileno)</SelectItem>
                        <SelectItem value="USD">USD (Dólar)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={newPlan.description}
                    onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                    placeholder="Descripción del plan..."
                    rows={3}
                  />
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-medium">Características del Plan</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="servicePublications">Publicaciones de Servicios</Label>
                      <Input
                        id="servicePublications"
                        type="number"
                        value={newPlan.features.servicePublications}
                        onChange={(e) => setNewPlan({ 
                          ...newPlan, 
                          features: { ...newPlan.features, servicePublications: Number(e.target.value) }
                        })}
                        placeholder="5"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="pilotLimit">Límite de Pilotos</Label>
                      <Input
                        id="pilotLimit"
                        type="number"
                        value={newPlan.features.pilotLimit}
                        onChange={(e) => setNewPlan({ 
                          ...newPlan, 
                          features: { ...newPlan.features, pilotLimit: Number(e.target.value) }
                        })}
                        placeholder="1"
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="supportLevel">Nivel de Soporte</Label>
                    <Select 
                      value={newPlan.features.supportLevel} 
                      onValueChange={(value) => setNewPlan({ 
                        ...newPlan, 
                        features: { ...newPlan.features, supportLevel: value }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Email">Email</SelectItem>
                        <SelectItem value="Chat y Email">Chat y Email</SelectItem>
                        <SelectItem value="24/7 Phone + Chat + Email">24/7 Phone + Chat + Email</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="searchPriority"
                      checked={newPlan.features.searchPriority}
                      onCheckedChange={(checked) => setNewPlan({ 
                        ...newPlan, 
                        features: { ...newPlan.features, searchPriority: checked }
                      })}
                    />
                    <Label htmlFor="searchPriority">Prioridad en búsquedas</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="active"
                      checked={newPlan.active}
                      onCheckedChange={(checked) => setNewPlan({ ...newPlan, active: checked })}
                    />
                    <Label htmlFor="active">Plan activo</Label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={creating}>
                  Cancelar
                </Button>
                <Button onClick={handleCreatePlan} className="bg-blue-600 hover:bg-blue-700" disabled={creating}>
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    'Crear Plan'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Características</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{plan.name}</div>
                      <div className="text-sm text-muted-foreground">{plan.description}</div>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatPrice(plan.price, plan.currency)}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm space-y-1">
                      <div>📄 {plan.features.servicePublications === -1 ? 'Ilimitadas' : plan.features.servicePublications} publicaciones</div>
                      <div>🎧 {plan.features.supportLevel}</div>
                      <div>🔍 {plan.features.searchPriority ? 'Prioridad' : 'Sin prioridad'}</div>
                      {plan.features.pilotLimit && (
                        <div>👨‍✈️ {plan.features.pilotLimit === -1 ? 'Ilimitados' : plan.features.pilotLimit} pilotos</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={plan.active ? "default" : "secondary"} className={plan.active ? "bg-green-600" : ""}>
                      {plan.active ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => togglePlanStatus(plan.id)}
                        className={plan.active ? "text-gray-600" : "text-green-600"}
                      >
                        {plan.active ? "Desactivar" : "Activar"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deletePlan(plan.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}