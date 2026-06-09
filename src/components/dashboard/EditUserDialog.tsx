import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, CreditCard } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  onSuccess: () => void;
}

interface UserData {
  full_name: string;
  email: string;
  user_type: string;
  role: string;
}

interface SubscriptionData {
  plan_name: string;
  status: string;
  renewal_date: string;
  payment_method: string;
}

export function EditUserDialog({
  open,
  onOpenChange,
  userId,
  onSuccess,
}: EditUserDialogProps) {
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);
  const [userData, setUserData] = useState<UserData>({
    full_name: "",
    email: "",
    user_type: "pilot",
    role: "pilot",
  });
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData>({
    plan_name: "basic",
    status: "pending",
    renewal_date: "",
    payment_method: "",
  });
  const [hasSubscription, setHasSubscription] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && userId) {
      fetchUserData();
    }
  }, [open, userId]);

  const fetchUserData = async () => {
    if (!userId) return;

    setFetchingData(true);
    try {
      // Fetch profile data
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, email, user_type")
        .eq("id", userId)
        .single();

      if (profileError) throw profileError;

      // Fetch role data
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      if (roleError) throw roleError;

      setUserData({
        full_name: profile.full_name || "",
        email: profile.email || "",
        user_type: profile.user_type || "pilot",
        role: roleData?.role || "pilot",
      });

      // Fetch subscription data
      const { data: subscription, error: subscriptionError } = await supabase
        .from("user_subscriptions")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (!subscriptionError && subscription) {
        setHasSubscription(true);
        setSubscriptionData({
          plan_name: subscription.plan_name || "basic",
          status: subscription.status || "pending",
          renewal_date: subscription.renewal_date || "",
          payment_method: subscription.payment_method || "",
        });
      } else {
        setHasSubscription(false);
      }
    } catch (error: any) {
      console.error("Error fetching user data:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos del usuario",
        variant: "destructive",
      });
    } finally {
      setFetchingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setLoading(true);
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: userData.full_name,
          user_type: userData.user_type,
        })
        .eq("id", userId);

      if (profileError) throw profileError;

      // Update role
      const { error: roleError } = await supabase
        .from("user_roles")
        .update({ role: userData.role as "admin" | "pilot" | "super_admin" })
        .eq("id", userId);

      if (roleError) throw roleError;

      toast({
        title: "Usuario actualizado",
        description: "Los datos del usuario han sido actualizados exitosamente",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el usuario",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubscriptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setLoading(true);
    try {
      if (hasSubscription) {
        // Update existing subscription
        const { error } = await supabase
          .from("user_subscriptions")
          .update(subscriptionData)
          .eq("user_id", userId);

        if (error) throw error;

        toast({
          title: "Suscripción actualizada",
          description: "Los datos de la suscripción han sido actualizados exitosamente",
        });
      } else {
        // Create new subscription
        const { error } = await supabase
          .from("user_subscriptions")
          .insert({
            user_id: userId,
            ...subscriptionData
          });

        if (error) throw error;

        setHasSubscription(true);
        toast({
          title: "Suscripción creada",
          description: "La suscripción ha sido creada exitosamente",
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving subscription:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar la suscripción",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Editar Usuario</DialogTitle>
          <DialogDescription>
            Modifica los datos del usuario y gestiona su suscripción
          </DialogDescription>
        </DialogHeader>

        {fetchingData ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile">Perfil</TabsTrigger>
              <TabsTrigger value="subscription">
                <CreditCard className="mr-2 h-4 w-4" />
                Suscripción
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="profile">
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="full_name">Nombre Completo</Label>
                    <Input
                      id="full_name"
                      value={userData.full_name}
                      onChange={(e) =>
                        setUserData({ ...userData, full_name: e.target.value })
                      }
                      placeholder="Ej: Juan Pérez"
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={userData.email}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      El email no se puede modificar
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="user_type">Tipo de Usuario</Label>
                    <Select
                      value={userData.user_type}
                      onValueChange={(value) =>
                        setUserData({ ...userData, user_type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pilot">Piloto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="role">Rol</Label>
                    <Select
                      value={userData.role}
                      onValueChange={(value) =>
                        setUserData({ ...userData, role: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un rol" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pilot">Piloto</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={loading}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      "Guardar Cambios"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>

            <TabsContent value="subscription">
              <form onSubmit={handleSubscriptionSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="plan_name">Plan</Label>
                    <Select
                      value={subscriptionData.plan_name}
                      onValueChange={(value) =>
                        setSubscriptionData({ ...subscriptionData, plan_name: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un plan" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic">Básico</SelectItem>
                        <SelectItem value="pro">Pro</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="status">Estado</Label>
                    <Select
                      value={subscriptionData.status}
                      onValueChange={(value) =>
                        setSubscriptionData({ ...subscriptionData, status: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Activa</SelectItem>
                        <SelectItem value="pending">Pendiente</SelectItem>
                        <SelectItem value="expired">Expirada</SelectItem>
                        <SelectItem value="cancelled">Cancelada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="renewal_date">Próxima Renovación</Label>
                    <Input
                      id="renewal_date"
                      type="date"
                      value={subscriptionData.renewal_date}
                      onChange={(e) =>
                        setSubscriptionData({ ...subscriptionData, renewal_date: e.target.value })
                      }
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="payment_method">Método de Pago</Label>
                    <Input
                      id="payment_method"
                      value={subscriptionData.payment_method}
                      onChange={(e) =>
                        setSubscriptionData({ ...subscriptionData, payment_method: e.target.value })
                      }
                      placeholder="Ej: Tarjeta de Crédito, Transferencia, etc."
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={loading}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      hasSubscription ? "Actualizar Suscripción" : "Crear Suscripción"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
