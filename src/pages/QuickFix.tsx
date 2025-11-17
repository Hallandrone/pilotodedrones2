import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const QuickFix = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [userInfo, setUserInfo] = useState<any>(null);
  const navigate = useNavigate();

  const checkUser = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setStatus('error');
        setMessage('No hay usuario logueado');
        return;
      }

      setUserInfo({
        id: user.id,
        email: user.email,
        metadata: user.user_metadata
      });

      // Check profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      // Check role
      const { data: role, error: roleError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('id', user.id)
        .single();

      setUserInfo(prev => ({
        ...prev,
        profile: profile || null,
        profileError: profileError?.message || null,
        role: role || null,
        roleError: roleError?.message || null
      }));

      setStatus('idle');
    } catch (error: any) {
      setStatus('error');
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fixEverything = async () => {
    setLoading(true);
    setStatus('idle');
    setMessage('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setStatus('error');
        setMessage('No hay usuario logueado');
        return;
      }

      setMessage('Creando perfil...');

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
          email: user.email,
          user_type: 'pilot'
        });

      if (profileError) {
        throw new Error(`Error creando perfil: ${profileError.message}`);
      }

      setMessage('Creando rol...');

      // Create role
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({
          id: user.id,
          role: 'pilot'
        });

      if (roleError) {
        throw new Error(`Error creando rol: ${roleError.message}`);
      }

      setStatus('success');
      setMessage('¡Todo solucionado! Redirigiendo...');
      
      setTimeout(() => {
        navigate('/pilot');
      }, 2000);

    } catch (error: any) {
      setStatus('error');
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const goToPilot = () => {
    navigate('/pilot');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🚀 Solución Rápida de Autenticación
            </CardTitle>
            <CardDescription>
              Herramienta para diagnosticar y solucionar problemas de autenticación
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button 
                onClick={checkUser} 
                disabled={loading}
                variant="outline"
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Verificar Usuario
                  </>
                )}
              </Button>
              
              <Button 
                onClick={fixEverything} 
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Solucionando...
                  </>
                ) : (
                  '🔧 Solucionar Todo'
                )}
              </Button>
            </div>

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

            {userInfo && (
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Información del Usuario:</h3>
                  <p className="text-sm"><strong>ID:</strong> {userInfo.id}</p>
                  <p className="text-sm"><strong>Email:</strong> {userInfo.email}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-muted p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">Perfil:</h3>
                    {userInfo.profile ? (
                      <div className="text-sm text-green-600">
                        ✅ Existe<br/>
                        <strong>Tipo:</strong> {userInfo.profile.user_type}<br/>
                        <strong>Nombre:</strong> {userInfo.profile.full_name}
                      </div>
                    ) : (
                      <div className="text-sm text-red-600">
                        ❌ No existe<br/>
                        <strong>Error:</strong> {userInfo.profileError || 'No encontrado'}
                      </div>
                    )}
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">Rol:</h3>
                    {userInfo.role ? (
                      <div className="text-sm text-green-600">
                        ✅ Existe<br/>
                        <strong>Rol:</strong> {userInfo.role.role}
                      </div>
                    ) : (
                      <div className="text-sm text-red-600">
                        ❌ No existe<br/>
                        <strong>Error:</strong> {userInfo.roleError || 'No encontrado'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={goToPilot} 
                variant="outline"
                className="flex-1"
              >
                Ir al Dashboard de Piloto
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default QuickFix;
