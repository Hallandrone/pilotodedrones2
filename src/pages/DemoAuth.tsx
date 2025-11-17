import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plane, Loader2, CheckCircle, AlertCircle } from "lucide-react";

const DemoAuth = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'creating' | 'logging' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  // Email y password del usuario demo
  const DEMO_EMAIL = 'demo@piloto.com';
  const DEMO_PASSWORD = 'demopilot123';
  const DEMO_NAME = 'Usuario Demo';

  const createDemoUser = async () => {
    setLoading(true);
    setStatus('creating');
    setMessage('Creando usuario demo...');

    try {
      // Intentar iniciar sesión primero
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
      });

      // Si el login fue exitoso
      if (!loginError && loginData.user) {
        setMessage('Usuario demo existente encontrado, iniciando sesión...');
        setStatus('logging');
        
        // Esperar un momento
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setStatus('success');
        setMessage('✓ Sesión iniciada correctamente. Redirigiendo...');
        
        toast({
          title: "¡Sesión iniciada!",
          description: "Bienvenido al panel de piloto demo",
        });

        setTimeout(() => {
          navigate('/pilot');
        }, 1500);
        
        setLoading(false);
        return;
      }

      // Si no existe, intentar crearlo
      setMessage('Usuario no existe, creando cuenta demo...');
      
      const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        options: {
          data: {
            full_name: DEMO_NAME,
            user_type: 'pilot'
          }
        }
      });

      if (signupError) {
        // Si hay un error porque el email ya existe pero hay un problema de password
        if (signupError.message.includes('already registered')) {
          setMessage('Cuenta existe, intentando login alternativo...');
          
          // Intentar resetear la contraseña o continuar
          toast({
            title: "Cuenta existente",
            description: "La cuenta demo ya existe. Intenta iniciar sesión manualmente",
            variant: "destructive",
          });
          
          setStatus('error');
          setMessage('La cuenta demo ya existe. Usa la pestaña de login con: demo@piloto.com / demopilot123');
          setLoading(false);
          return;
        }

        throw signupError;
      }

      if (signupData.user) {
        setMessage('Usuario creado, esperando confirmación...');
        setStatus('success');
        
        toast({
          title: "Usuario creado",
          description: "Redirigiendo al dashboard...",
        });

        setTimeout(() => {
          navigate('/pilot');
        }, 1500);
      }

    } catch (error: any) {
      console.error('Error:', error);
      setStatus('error');
      setMessage(`Error: ${error.message || 'No se pudo crear el usuario demo'}`);
      
      toast({
        title: "Error",
        description: error.message || "Hubo un problema al crear el usuario demo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-0 shadow-2xl">
        <CardHeader className="text-center space-y-4 pb-6">
          <div className="flex justify-center">
            <div className="h-16 w-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Plane className="h-8 w-8 text-white" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Usuario Demo
            </CardTitle>
            <CardDescription className="text-base mt-2">
              Acceso rápido al dashboard de piloto
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Status Messages */}
          {status === 'creating' && (
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
              <span className="text-blue-800 font-medium">{message}</span>
            </div>
          )}

          {status === 'logging' && (
            <div className="flex items-center gap-3 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
              <Loader2 className="h-5 w-5 text-indigo-600 animate-spin" />
              <span className="text-indigo-800 font-medium">{message}</span>
            </div>
          )}

          {status === 'success' && (
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-green-800 font-medium">{message}</span>
            </div>
          )}

          {status === 'error' && (
            <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-red-800 font-medium">{message}</span>
            </div>
          )}

          {/* Credentials Display */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-2 border border-slate-200">
            <p className="text-sm font-semibold text-slate-700">Credenciales Demo:</p>
            <div className="text-sm text-slate-600 space-y-1">
              <p><span className="font-medium">Email:</span> demo@piloto.com</p>
              <p><span className="font-medium">Password:</span> demopilot123</p>
            </div>
          </div>

          {/* Action Buttons */}
          <Button 
            onClick={createDemoUser} 
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-6 text-base"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Procesando...
              </>
            ) : status === 'success' ? (
              <>
                <CheckCircle className="h-5 w-5 mr-2" />
                Redirigiendo...
              </>
            ) : (
              <>
                <Plane className="h-5 w-5 mr-2" />
                Iniciar Sesión Demo
              </>
            )}
          </Button>

          {status === 'error' && (
            <div className="pt-4">
              <Button 
                variant="outline" 
                onClick={() => navigate('/auth')}
                className="w-full"
              >
                Ir a página de Login
              </Button>
            </div>
          )}

          <div className="text-center pt-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/')}
              className="text-slate-600 hover:text-slate-900"
            >
              ← Volver al inicio
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DemoAuth;


