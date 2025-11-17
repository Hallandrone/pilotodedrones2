import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const FixAuth = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const fixAuth = async () => {
    setLoading(true);
    setStatus('idle');
    setMessage('');

    try {
      // Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setStatus('error');
        setMessage('No hay usuario logueado. Por favor, inicia sesión primero.');
        return;
      }

      console.log('🔧 Solucionando autenticación para:', user.email);

      // 1. Crear perfil si no existe
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code === 'PGRST116') {
        console.log('🔧 Creando perfil...');
        const { error: createProfileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
            email: user.email,
            user_type: 'pilot'
          });
        
        if (createProfileError) {
          throw new Error(`Error creando perfil: ${createProfileError.message}`);
        }
        console.log('✅ Perfil creado');
      } else if (existingProfile) {
        console.log('✅ Perfil ya existe');
      } else {
        throw new Error(`Error verificando perfil: ${profileError?.message}`);
      }

      // 2. Crear rol si no existe
      const { data: existingRole, error: roleError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (roleError && roleError.code === 'PGRST116') {
        console.log('🔧 Creando rol de piloto...');
        const { error: createRoleError } = await supabase
          .from('user_roles')
          .insert({
            id: user.id,
            role: 'pilot'
          });
        
        if (createRoleError) {
          throw new Error(`Error creando rol: ${createRoleError.message}`);
        }
        console.log('✅ Rol creado');
      } else if (existingRole) {
        console.log('✅ Rol ya existe:', existingRole.role);
      } else {
        throw new Error(`Error verificando rol: ${roleError?.message}`);
      }

      setStatus('success');
      setMessage('¡Autenticación solucionada! Redirigiendo al dashboard de piloto...');
      
      // Redirigir después de 2 segundos
      setTimeout(() => {
        navigate('/pilot');
      }, 2000);

    } catch (error: any) {
      console.error('❌ Error:', error);
      setStatus('error');
      setMessage(error.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const goToPilotDashboard = () => {
    navigate('/pilot');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🔧 Solucionador de Autenticación
            </CardTitle>
            <CardDescription>
              Esta herramienta creará automáticamente tu perfil y rol de piloto si no existen.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {status === 'idle' && (
              <Alert>
                <AlertDescription>
                  Si estás viendo este mensaje, significa que hay un problema con tu autenticación. 
                  Haz clic en el botón de abajo para solucionarlo automáticamente.
                </AlertDescription>
              </Alert>
            )}

            {status === 'success' && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  {message}
                </AlertDescription>
              </Alert>
            )}

            {status === 'error' && (
              <Alert className="border-red-200 bg-red-50">
                <XCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {message}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={fixAuth} 
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Solucionando...
                  </>
                ) : (
                  '🔧 Solucionar Autenticación'
                )}
              </Button>
              
              <Button 
                onClick={goToPilotDashboard} 
                variant="outline"
                disabled={loading}
              >
                Ir al Dashboard
              </Button>
            </div>

            <div className="text-sm text-muted-foreground">
              <p><strong>¿Qué hace este botón?</strong></p>
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li>Verifica si tienes un perfil en la base de datos</li>
                <li>Crea tu perfil si no existe</li>
                <li>Verifica si tienes un rol asignado</li>
                <li>Crea tu rol de piloto si no existe</li>
                <li>Te redirige al dashboard de piloto</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FixAuth;
