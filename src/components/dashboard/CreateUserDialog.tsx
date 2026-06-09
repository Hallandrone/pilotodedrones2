import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const createUserSchema = z.object({
  full_name: z.string().trim().min(1, "El nombre es requerido").max(100, "El nombre debe tener máximo 100 caracteres"),
  email: z.string().trim().email("Email inválido").max(255, "El email debe tener máximo 255 caracteres"),
  role: z.enum(["pilot", "admin", "super_admin"], {
    required_error: "El rol es requerido",
  }),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres").max(50, "La contraseña debe tener máximo 50 caracteres"),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateUserDialog({ open, onOpenChange, onSuccess }: CreateUserDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      full_name: "",
      email: "",
      role: "pilot",
      password: "",
    },
  });

  const onSubmit = async (data: CreateUserFormData) => {
    setLoading(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      // SIEMPRE usar la Edge Function para evitar conflictos de sesión
      console.log('Creando/actualizando usuario vía Edge Function...');

      // Determinar permisos según el rol
      let permissions: string[] = [];
      if (data.role === 'super_admin') {
        permissions = [
          'create_diplomas',
          'manage_certificates',
          'approve_deny_certificates',
          'view_users',
          'view_companies',
          'view_notifications',
          'manage_banners',
          'upload_banners'
        ];
      } else if (data.role === 'admin') {
        permissions = ['view_users']; // Permisos base
      }
      // Para pilot, permissions queda vacío []

      const { data: funcData, error: funcError } = await supabase.functions.invoke('invite-admin', {
        body: {
          email: data.email,
          full_name: data.full_name,
          permissions: permissions,
          role: data.role, // Enviar el rol explícitamente
          password: data.password, // Enviar contraseña para que la función la use si es necesario
          invited_by: currentUser?.id
        }
      });

      if (funcError) {
        console.error('Error de la Edge Function:', funcError);
        throw new Error(funcError.message || "Error al invocar la función");
      }

      if (funcData?.error) {
        console.error('Error en respuesta de la función:', funcData.error);
        throw new Error(funcData.error);
      }

      const isAdmin = data.role === 'admin' || data.role === 'super_admin';

      toast({
        title: isAdmin ? "Invitación enviada" : "Usuario creado",
        description: funcData?.message || `Usuario ${data.email} configurado exitosamente`,
      });

      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el usuario",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Usuario</DialogTitle>
          <DialogDescription>
            Completa la información para crear un nuevo usuario en el sistema.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre Completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ingresa el nombre completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="usuario@ejemplo.com" type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña</FormLabel>
                  <FormControl>
                    <Input placeholder="••••••••" type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rol</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un rol" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pilot">Piloto</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear Usuario
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}