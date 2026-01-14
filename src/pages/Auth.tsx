import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Logo from "@/components/ui/logo";
import { Plane, Mail, Lock, User as UserIcon, Building } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getUserRole } from "@/lib/auth-utils";
import { getBaseUrl } from "@/lib/getBaseUrl";
import type { User, Session } from '@supabase/supabase-js';

const Auth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const [invitationToken, setInvitationToken] = useState<string | null>(null);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    const tokenParam = params.get('invitation');
    const qrTokenParam = params.get('qr_token');

    // Recuperar token de almacenamiento local si existe
    const storedToken = localStorage.getItem('pendingInvitationToken');
    const effectiveToken = tokenParam || storedToken;

    if (tabParam === 'signup' || tabParam === 'register') {
      setActiveTab("signup");
    }

    if (effectiveToken) {
      console.log('Token de invitación detectado:', effectiveToken);
      setInvitationToken(effectiveToken);
      // Asegurar que esté guardado para persistencia
      if (tokenParam) localStorage.setItem('pendingInvitationToken', tokenParam);
    }

    // Detectar QR token
    if (qrTokenParam) {
      console.log('QR token detectado:', qrTokenParam);
      setQrToken(qrTokenParam);
      localStorage.setItem('pendingQrToken', qrTokenParam);
    }
  }, [location]);

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        // Solo redirigir si hay sesión y no estamos en proceso de login/signup
        if (session?.user && event !== 'SIGNED_OUT') {
          try {
            // PRIORIDAD 0: Asociar QR token PRIMERO si existe
            const storedQrToken = localStorage.getItem('pendingQrToken');
            let shouldRedirectToProfile = false;

            if (storedQrToken && session.user.id) {
              console.log('Asociando QR token:', storedQrToken, 'al usuario:', session.user.id);
              try {
                const { data: updatedData, error: updateError } = await supabase
                  .from('diploma_qr_tokens')
                  .update({
                    user_id: session.user.id,
                    associated_at: new Date().toISOString()
                  })
                  .eq('token', storedQrToken)
                  .select();

                if (updateError) {
                  console.error('❌ Error asociando QR token:', updateError);
                } else if (!updatedData || updatedData.length === 0) {
                  console.error('⚠️ No se actualizó ningún token. ¿Existe el token en BD?');
                } else {
                  console.log('✅ QR token asociado exitosamente:', updatedData);
                  localStorage.removeItem('pendingQrToken');
                  shouldRedirectToProfile = true;

                  toast({
                    title: "¡Diploma asociado!",
                    description: "Tu diploma ha sido asociado a tu perfil exitosamente",
                  });
                }
              } catch (error) {
                console.error('Error en asociación de QR token:', error);
              }
            }

            const { data: profile, error } = await supabase
              .from('profiles')
              .select('user_type, public_profile_slug, id')
              .eq('id', session.user.id)
              .single();

            // Si hay error o no hay perfil, no redirigir (dejar que el usuario se registre)
            if (error || !profile) {
              console.log('No profile found, staying on auth page');
              return;
            }

            // Si acabamos de asociar un QR token, redirigir al perfil público
            if (shouldRedirectToProfile) {
              if (profile.public_profile_slug) {
                navigate(`/${profile.public_profile_slug}`);
              } else {
                navigate(`/pilot/${profile.id}`);
              }
              return;
            }

            // PRIORIDAD 1: Si hay token de invitación (en storage o URL), redirigir a invitación
            const storedToken = localStorage.getItem('pendingInvitationToken');
            const currentParams = new URLSearchParams(window.location.search);
            const effectiveToken = storedToken || currentParams.get('invitation');

            if (effectiveToken) {
              console.log('Redirigiendo a invitación pendiente:', effectiveToken);
              // NO limpiamos el storage todavía para asegurar que llegue a la página
              // La página de Invitación lo limpiará si es exitosa, o lo mantendrá si falla auth
              navigate(`/invitation/${effectiveToken}`);
              return;
            }

            if (profile?.user_type === 'company') {
              navigate('/company');
            } else {
              navigate('/dashboard');
            }
          } catch (error) {
            console.error('Error checking profile:', error);
            // No redirigir si hay error, dejar que el usuario vea la página de auth
          }
        }
      }
    );

    // Check for existing session (solo si no hay errores)
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (!mounted) return;

      if (error) {
        console.error('Error getting session:', error);
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('user_type')
            .eq('id', session.user.id)
            .single();

          // Si hay error o no hay perfil, no redirigir
          if (profileError || !profile) {
            console.log('No profile found, staying on auth page');
            return;
          }

          if (profile?.user_type === 'company') {
            navigate('/company');
          } else {
            navigate('/dashboard');
          }
        } catch (error) {
          console.error('Error checking profile:', error);
          // No redirigir si hay error
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleSignUp = async (email: string, password: string, userData: any) => {
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (!data.user) {
        toast({
          title: "Error",
          description: "No se pudo crear el usuario",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Esperar un momento para que el trigger cree el perfil
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verificar si el perfil se creó automáticamente
      let { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, user_type')
        .eq('id', data.user.id)
        .single();

      // Si el perfil no existe, crearlo manualmente
      if (profileError || !profile) {
        console.log('Perfil no encontrado, creando manualmente...');
        const { error: createProfileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            full_name: userData.full_name || email.split('@')[0] || 'Usuario',
            email: email,
            user_type: userData.user_type || 'pilot'
          });

        if (createProfileError) {
          console.error('Error creando perfil:', createProfileError);
          toast({
            title: "Advertencia",
            description: "Cuenta creada pero hubo un problema creando el perfil. Intenta iniciar sesión.",
            variant: "default",
          });
        } else {
          profile = { id: data.user.id, user_type: userData.user_type || 'pilot' };
        }
      }

      // Verificar si el rol se creó
      let { data: role, error: roleError } = await supabase
        .from('user_roles')
        .select('id, role')
        .eq('id', data.user.id)
        .single();

      // Si el rol no existe, crearlo manualmente
      if (roleError || !role) {
        console.log('Rol no encontrado, creando manualmente...');
        const userType = profile?.user_type || userData.user_type || 'pilot';
        const { error: createRoleError } = await supabase
          .from('user_roles')
          .insert({
            id: data.user.id,
            role: userType as 'pilot' | 'company' | 'admin' | 'super_admin'
          });

        if (createRoleError) {
          console.error('Error creando rol:', createRoleError);
        }
      }

      // Check if user is immediately confirmed (email confirmation disabled)
      if (!data.user.email_confirmed_at) {
        if (profile?.user_type === 'company') {
          toast({
            title: "¡Cuenta creada!",
            description: "Para activar tu perfil empresa, necesitas seleccionar un plan de suscripción.",
          });
        } else {
          // Verificar si hay invitación pendiente (usando storage o URL)
          const storedToken = localStorage.getItem('pendingInvitationToken');
          const currentParams = new URLSearchParams(window.location.search);
          const effectiveToken = storedToken || currentParams.get('invitation');

          if (effectiveToken) {
            toast({
              title: "Cuenta creada",
              description: "Procesando tu invitación...",
            });
          } else {
            toast({
              title: "¡Bienvenido! Tienes Plan Gratis",
              description: "Tu cuenta ha sido creada exitosamente. Puedes actualizar tu plan desde tu perfil.",
            });
          }
        }
      } else {
        if (profile?.user_type === 'company') {
          toast({
            title: "¡Bienvenido!",
            description: "Para activar tu perfil empresa, necesitas seleccionar un plan de suscripción.",
          });
        } else {
          // Verificar si hay invitación pendiente (usando storage o URL)
          const storedToken = localStorage.getItem('pendingInvitationToken');
          const currentParams = new URLSearchParams(window.location.search);
          const effectiveToken = storedToken || currentParams.get('invitation');

          if (effectiveToken) {
            toast({
              title: "Cuenta creada",
              description: "Procesando tu invitación...",
            });
          } else {
            toast({
              title: "¡Bienvenido! Tienes Plan Gratis",
              description: "Tu cuenta ha sido creada exitosamente. Puedes actualizar tu plan desde tu perfil.",
            });
          }
        }
      }

      // Esperar un momento más antes de redirigir
      await new Promise(resolve => setTimeout(resolve, 500));

      // Redirigir según contexto
      const storedToken = localStorage.getItem('pendingInvitationToken');
      const currentParams = new URLSearchParams(window.location.search);
      const effectiveToken = storedToken || currentParams.get('invitation');

      if (effectiveToken) {
        navigate(`/invitation/${effectiveToken}`);
      } else if (profile?.user_type === 'company') {
        // Las empresas DEBEN ir a membresía para activar su cuenta
        navigate('/company/membership');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error('Error en registro:', err);
      toast({
        title: "Error",
        description: err.message || "Ocurrió un error al crear la cuenta",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (!data.user) {
        toast({
          title: "Error",
          description: "No se pudo iniciar sesión",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Esperar un momento para que se cree el perfil/rol si no existe
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verificar perfil y redirigir según el tipo de usuario
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', data.user.id)
        .single();

      if (profileError || !profile) {
        // Si no hay perfil, redirigir a access-fix para crearlo
        toast({
          title: "Configurando cuenta",
          description: "Completando tu registro...",
        });
        navigate('/access-fix');
        setLoading(false);
        return;
      }

      // Obtener rol (se crea automáticamente si no existe)
      const roleData = await getUserRole(data.user.id);

      if (!roleData) {
        // Si no se pudo obtener/crear el rol, ir a access-fix
        toast({
          title: "Configurando cuenta",
          description: "Completando tu registro...",
        });
        navigate('/access-fix');
        setLoading(false);
        return;
      }

      toast({
        title: "Éxito",
        description: "Has iniciado sesión correctamente",
      });

      // Redirigir según el rol
      if (roleData.role === 'admin' || roleData.role === 'super_admin') {
        navigate('/dashboard');
      } else if (roleData.role === 'pilot') {
        const storedToken = localStorage.getItem('pendingInvitationToken');
        const currentParams = new URLSearchParams(window.location.search);
        const effectiveToken = storedToken || currentParams.get('invitation');

        if (effectiveToken) {
          navigate(`/invitation/${effectiveToken}`);
        } else {
          navigate('/pilot');
        }
      } else if (roleData.role === 'company') {
        navigate('/company');
      } else {
        // Por defecto, redirigir a access-fix
        navigate('/access-fix');
      }
    } catch (err: any) {
      console.error('Error en login:', err);
      toast({
        title: "Error",
        description: err.message || "Ocurrió un error al iniciar sesión",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${getBaseUrl()}/`
      }
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const GoogleIcon = () => (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );

  const LoginForm = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const onSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      handleSignIn(email, password);
    };

    return (
      <form onSubmit={onSubmit} className="space-y-4">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleGoogleAuth}
          disabled={loading}
        >
          <GoogleIcon />
          Continuar con Google
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              O continúa con email
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="login-email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="login-email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="login-password">Contraseña</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="login-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10"
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
        </Button>
      </form>
    );
  };

  const SignUpForm = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [userType, setUserType] = useState("pilot");

    const onSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      handleSignUp(email, password, {
        full_name: name,
        user_type: userType
      });
    };

    return (
      <form onSubmit={onSubmit} className="space-y-4">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleGoogleAuth}
          disabled={loading}
        >
          <GoogleIcon />
          Registrarse con Google
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              O regístrate con email
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="signup-name">
            {userType === "company" ? "Nombre Empresa" : "Nombre y Apellido"}
          </Label>
          <div className="relative">
            {userType === "company" ? (
              <Building className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            ) : (
              <UserIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            )}
            <Input
              id="signup-name"
              type="text"
              placeholder={userType === "company" ? "Nombre de la empresa" : "Tu nombre y apellido"}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="pl-10"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="signup-email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-password">Contraseña</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="signup-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10"
              required
              minLength={6}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="user-type">Tipo de cuenta</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={userType === "pilot" ? "default" : "outline"}
              onClick={() => setUserType("pilot")}
              className="flex items-center gap-2"
            >
              <UserIcon className="h-4 w-4" />
              Piloto
            </Button>
            <Button
              type="button"
              variant={userType === "company" ? "default" : "outline"}
              onClick={() => setUserType("company")}
              className="flex items-center gap-2"
            >
              <Building className="h-4 w-4" />
              Empresa
            </Button>
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creando cuenta..." : "Crear Cuenta"}
        </Button>
      </form>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size="xl" className="hover:scale-105 transition-transform duration-200" />
          </div>
          <p className="text-muted-foreground">Accede a tu cuenta profesional</p>
        </div>

        <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-sm">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
              <TabsTrigger value="signup">Crear Cuenta</TabsTrigger>
            </TabsList>

            <CardContent className="p-6 pt-0">
              <TabsContent value="login" className="mt-0">
                <div className="space-y-2 mb-6">
                  <CardTitle>Bienvenido de vuelta</CardTitle>
                  <CardDescription>
                    Ingresa tus credenciales para acceder
                  </CardDescription>
                </div>
                <LoginForm />
              </TabsContent>

              <TabsContent value="signup" className="mt-0">
                <div className="space-y-2 mb-6">
                  <CardTitle>Crear cuenta</CardTitle>
                  <CardDescription>
                    Únete a la plataforma profesional de drones
                  </CardDescription>
                </div>
                <SignUpForm />
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        <div className="text-center mt-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="text-muted-foreground hover:text-foreground"
          >
            ← Volver al inicio
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Auth;