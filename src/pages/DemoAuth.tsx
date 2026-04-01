import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plane, Loader2, CheckCircle, AlertCircle, Building2, User, Lock, ArrowLeft, Shield } from "lucide-react";

const DemoAuth = () => {
  const [step, setStep] = useState<'select' | 'password'>('select');
  const [selectedType, setSelectedType] = useState<'pilot' | 'company' | 'super_admin' | null>(null);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'authenticating' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  // Contraseña de protección para acceder a los demos
  const DEMO_PASSWORD_PROTECTION = 'jaj%4@/zVLN@)v5';
  
  // Credenciales demo piloto
  const DEMO_PILOT_EMAIL = 'demo@piloto.com';
  const DEMO_PILOT_PASSWORD = 'demopilot123';
  const DEMO_PILOT_NAME = 'Usuario Demo';
  
  // Credenciales demo empresa
  const DEMO_COMPANY_EMAIL = 'demo@empresa.com';
  const DEMO_COMPANY_PASSWORD = 'demoempresa123';
  const DEMO_COMPANY_NAME = 'Empresa Demo';
  
  // Credenciales demo super administrador
  const DEMO_SUPER_ADMIN_EMAIL = 'demo@admin.com';
  const DEMO_SUPER_ADMIN_PASSWORD = 'demoadmin123';
  const DEMO_SUPER_ADMIN_NAME = 'Super Admin Demo';

  const handleTypeSelect = (type: 'pilot' | 'company' | 'super_admin') => {
    setSelectedType(type);
    setStep('password');
    setPassword('');
    setPasswordError(false);
    setStatus('idle');
    setMessage('');
  };

  const handleBack = () => {
    setStep('select');
    setSelectedType(null);
    setPassword('');
    setPasswordError(false);
    setStatus('idle');
    setMessage('');
  };

  const handlePasswordSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!selectedType) return;

    // Validar contraseña
    if (password !== DEMO_PASSWORD_PROTECTION) {
      setPasswordError(true);
      setMessage('Contraseña incorrecta. Por favor, intenta nuevamente.');
      toast({
        title: "Contraseña incorrecta",
        description: "La contraseña ingresada no es válida",
        variant: "destructive",
      });
      return;
    }

    setPasswordError(false);
    setLoading(true);
    setStatus('authenticating');
    setMessage('Autenticando...');

    // Autenticar según el tipo seleccionado
    if (selectedType === 'pilot') {
      await authenticateDemo('pilot');
    } else if (selectedType === 'company') {
      await authenticateDemo('company');
    } else {
      await authenticateDemo('super_admin');
    }
  };

  const authenticateDemo = async (type: 'pilot' | 'company' | 'super_admin') => {
    try {
      const email = type === 'pilot' 
        ? DEMO_PILOT_EMAIL 
        : type === 'company' 
          ? DEMO_COMPANY_EMAIL 
          : DEMO_SUPER_ADMIN_EMAIL;
      const password = type === 'pilot' 
        ? DEMO_PILOT_PASSWORD 
        : type === 'company' 
          ? DEMO_COMPANY_PASSWORD 
          : DEMO_SUPER_ADMIN_PASSWORD;
      const name = type === 'pilot' 
        ? DEMO_PILOT_NAME 
        : type === 'company' 
          ? DEMO_COMPANY_NAME 
          : DEMO_SUPER_ADMIN_NAME;
      const redirectPath = type === 'pilot' 
        ? '/pilot' 
        : type === 'company' 
          ? '/company' 
          : '/dashboard';

      // Intentar iniciar sesión primero
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      // Si el login fue exitoso
      if (!loginError && loginData.user) {
        setStatus('success');
        setMessage('✓ Sesión iniciada correctamente. Redirigiendo...');
        
        toast({
          title: "¡Sesión iniciada!",
          description: type === 'pilot' 
            ? "Bienvenido al panel de piloto demo" 
            : type === 'company'
              ? "Bienvenido al panel de empresa demo"
              : "Bienvenido al dashboard de super administrador",
        });

        setTimeout(() => {
          navigate(redirectPath);
        }, 1500);
        
        setLoading(false);
        return;
      }

      // Si no existe, intentar crearlo
      setMessage('Creando cuenta demo...');
      
      const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            user_type: type
          }
        }
      });

      if (signupError) {
        // Si el email ya existe pero hay un problema de password
        if (signupError.message.includes('already registered')) {
          setStatus('error');
          setMessage('La cuenta demo ya existe pero hay un problema. Contacta al administrador.');
          toast({
            title: "Error",
            description: "La cuenta demo ya existe. Contacta al administrador.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        throw signupError;
      }

      if (signupData.user) {
        // Esperar un momento para que se cree el perfil
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Si es empresa, crear el registro en la tabla companies
        if (type === 'company') {
          try {
            const { error: companyError } = await supabase
              .from('companies')
              .insert({
                user_id: signupData.user.id,
                company_name: 'Empresa Demo',
                description: 'Esta es una cuenta demo para empresas',
              });

            if (companyError && !companyError.message.includes('duplicate')) {
              console.error('Error creando registro de empresa:', companyError);
            }
          } catch (error) {
            console.error('Error al crear registro de empresa:', error);
          }
        }
        
        // Si es super admin, actualizar el rol en user_roles
        if (type === 'super_admin') {
          try {
            const { error: roleError } = await supabase
              .from('user_roles')
              .update({ role: 'super_admin' })
              .eq('id', signupData.user.id);

            if (roleError && !roleError.message.includes('duplicate')) {
              console.error('Error actualizando rol de super admin:', roleError);
            }
          } catch (error) {
            console.error('Error al actualizar rol de super admin:', error);
          }
        }

        setStatus('success');
        setMessage('✓ Cuenta demo creada. Redirigiendo...');
        
        toast({
          title: "Cuenta creada",
          description: "Redirigiendo al dashboard...",
        });

        setTimeout(() => {
          navigate(redirectPath);
        }, 1500);
      }

    } catch (error: any) {
      console.error('Error:', error);
      setStatus('error');
      setMessage(`Error: ${error.message || 'No se pudo autenticar'}`);
      
      toast({
        title: "Error",
        description: error.message || "Hubo un problema al autenticar",
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
              {step === 'select' 
                ? 'Acceso Demo' 
                : selectedType === 'pilot' 
                  ? 'Perfil Usuario Demo' 
                  : selectedType === 'company'
                    ? 'Perfil Demo Empresa'
                    : 'Dashboard Super Administrador'}
            </CardTitle>
            <CardDescription className="text-base mt-2">
              {step === 'select' 
                ? 'Selecciona el tipo de perfil demo que deseas probar'
                : 'Ingresa la contraseña para acceder'}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Paso 1: Selección de tipo */}
          {step === 'select' && (
            <div className="space-y-4">
              <Button
                onClick={() => handleTypeSelect('pilot')}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-8 text-lg h-auto"
                size="lg"
              >
                <div className="flex items-center justify-center gap-3">
                  <User className="h-6 w-6" />
                  <span>Perfil Usuario Demo</span>
                </div>
              </Button>

              <Button
                onClick={() => handleTypeSelect('company')}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-8 text-lg h-auto"
                size="lg"
              >
                <div className="flex items-center justify-center gap-3">
                  <Building2 className="h-6 w-6" />
                  <span>Perfil Demo Empresa</span>
                </div>
              </Button>

              <Button
                onClick={() => handleTypeSelect('super_admin')}
                className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-semibold py-8 text-lg h-auto"
                size="lg"
              >
                <div className="flex items-center justify-center gap-3">
                  <Shield className="h-6 w-6" />
                  <span>Dashboard Super Administrador</span>
                </div>
              </Button>
            </div>
          )}

          {/* Paso 2: Validación de contraseña */}
          {step === 'password' && selectedType && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold text-slate-700">
                  Contraseña de acceso
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setPasswordError(false);
                      setMessage('');
                    }}
                    placeholder="Ingresa la contraseña"
                    className={`pl-10 ${passwordError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                    disabled={loading}
                    autoFocus
                  />
                </div>
                {passwordError && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    Contraseña incorrecta
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading || !password}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-6 text-base"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Autenticando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Ingresar
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={handleBack}
                disabled={loading}
                className="w-full"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
            </form>
          )}

          {/* Status Messages */}
          {status === 'authenticating' && (
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
              <span className="text-blue-800 font-medium">{message}</span>
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

          {/* Botón volver al inicio */}
          {step === 'select' && (
            <div className="text-center pt-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/auth')}
                className="text-slate-600 hover:text-slate-900"
              >
                ← Volver al inicio
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DemoAuth;
