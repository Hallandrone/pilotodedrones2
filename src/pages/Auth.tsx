import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Logo from "@/components/ui/logo";
import Footer from "@/components/layout/Footer";
import { Plane, Mail, Lock, User as UserIcon, Building } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getUserRole } from "@/lib/auth-utils";
import { getBaseUrl } from "@/lib/getBaseUrl";
import { signInWithGoogle, getAuthUser, isAuthenticated, saveSession, loadGoogleScript, initGoogleAuth, renderGoogleButton } from "@/lib/google-auth";
import type { User, Session } from '@supabase/supabase-js';

const Auth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const [invitationToken, setInvitationToken] = useState<string | null>(null);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [initialEmail, setInitialEmail] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    const tokenParam = params.get('invitation');
    const qrTokenParam = params.get('qr_token');
    const emailParam = params.get('email');

    if (emailParam) {
      setInitialEmail(emailParam);
    }

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
      console.log('🎯 QR token detectado en URL:', qrTokenParam);
      setQrToken(qrTokenParam);
      localStorage.setItem('pendingQrToken', qrTokenParam);
      console.log('💾 QR token guardado en localStorage:', localStorage.getItem('pendingQrToken'));
    } else {
      // Verificar si hay un token pendiente en localStorage
      const storedQrToken = localStorage.getItem('pendingQrToken');
      if (storedQrToken) {
        console.log('📦 QR token encontrado en localStorage (de visita anterior):', storedQrToken);
      }
    }

    // Asegurar que la página comience arriba al cargar
    window.scrollTo(0, 0);
  }, [location]);

  useEffect(() => {
    // Cargar Google GSI y configurar el botón invisible
    loadGoogleScript().then(() => {
      initGoogleAuth((result) => {
        if (result.success) {
          handleGoogleAuthCompleted(result);
        } else {
          toast({
            title: "Error",
            description: result.error || "Error al iniciar sesión con Google",
            variant: "destructive",
          });
        }
      });

      // Renderizar botones (con un pequeño delay para asegurar que el DOM de la pestaña esté listo)
      setTimeout(() => {
        renderGoogleButton("google-login-btn-overlay");
        renderGoogleButton("google-signup-btn-overlay");
      }, 500);
    });
  }, [activeTab]); // Ejecutar cuando cambie la pestaña

  const handleGoogleAuthCompleted = async (result: any) => {
    setLoading(true);

    // Obtener perfil real de la base de datos para decidir a dónde ir
    // (Ignoramos el userType visual porque el usuario ya puede tener cuenta)
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', result.user.id)
      .single();

    const roleData = await getUserRole(result.user.id);
    const finalRole = roleData?.role || profile?.user_type || result.user.role;

    toast({
      title: result.isNewUser ? "¡Bienvenido!" : "¡Hola de nuevo!",
      description: result.isNewUser
        ? "Tu cuenta ha sido creada exitosamente"
        : "Has iniciado sesión correctamente",
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    if (finalRole === 'company') {
      window.location.href = '/company';
    } else if (finalRole === 'admin' || finalRole === 'super_admin') {
      window.location.href = '/dashboard';
    } else {
      const storedToken = localStorage.getItem('pendingInvitationToken');
      window.location.href = storedToken ? `/invitation/${storedToken}` : '/pilot';
    }
    setLoading(false);
  };

  useEffect(() => {
    let mounted = true;
    const isRedirecting = { current: false };

    const handleRedirect = async (user: User) => {
      if (isRedirecting.current) return;
      isRedirecting.current = true;
      try {
        // PRIORIDAD 0: Asociar QR token PRIMERO si existe
        const storedQrToken = localStorage.getItem('pendingQrToken');
        if (storedQrToken) {
          console.log('🔍 Intentando asociar QR token:', storedQrToken);
          try {
            const { data: existingToken } = await supabase
              .from('diploma_qr_tokens')
              .select('*')
              .eq('token', storedQrToken)
              .maybeSingle();

            if (existingToken && (!existingToken.user_id || existingToken.user_id === user.id)) {
              await supabase
                .from('diploma_qr_tokens')
                .update({
                  user_id: user.id,
                  associated_at: new Date().toISOString()
                })
                .eq('token', storedQrToken);

              localStorage.removeItem('pendingQrToken');
              toast({
                title: "¡Diploma asociado!",
                description: "Tu diploma ha sido asociado a tu perfil exitosamente",
              });

              // Redirigir a la página de verificación para ver el diploma recién asociado
              navigate(`/verificar-diploma?codigo=${storedQrToken}`);
              return;
            }
          } catch (error) {
            console.error('Error in QR association:', error);
          }
        }

        // Obtener rol y perfil
        console.log('Checking role for redirect:', user.id);
        const roleData = await getUserRole(user.id);

        if (!roleData) {
          console.log('No role data found, staying on auth page to allow profile creation');
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('id', user.id)
          .maybeSingle();

        // PRIORIDAD 1: Invitaciones pendientes
        const storedToken = localStorage.getItem('pendingInvitationToken');
        if (storedToken) {
          navigate(`/invitation/${storedToken}`);
          return;
        }

        // Redirección basada en ROL
        console.log('Redirecting based on role:', roleData.role);
        if (roleData.role === 'admin' || roleData.role === 'super_admin') {
          navigate('/dashboard');
        } else if (roleData.role === 'company' || profile?.user_type === 'company') {
          navigate('/company');
        } else {
          navigate('/pilot');
        }
      } catch (error) {
        console.error('Error during redirection logic:', error);
        isRedirecting.current = false;
      }
    };

    // Listener de cambios de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (event === 'PASSWORD_RECOVERY') {
          setIsRecovery(true);
          setActiveTab("login");
          setShowForgotPassword(false);
          return;
        }

        if (session?.user && event === 'SIGNED_IN' && !isRecovery) {
          handleRedirect(session.user);
        }
      }
    );

    // Verificación inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted || !session?.user) return;

      setSession(session);
      setUser(session.user);

      // Solo redirigir automáticamente si ya hay una sesión y NO estamos en recovery
      if (!isRecovery) {
        handleRedirect(session.user);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, isRecovery]);

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
          // Intentar aceptar invitaciones por email automáticamente
          try {
            console.log('Verificando invitaciones por email...');
            const { data: invData, error: invError } = await supabase.functions.invoke('send-invitation-email', {
              body: {
                action: 'check_and_accept_by_email'
              }
            });

            if (!invError && invData?.success && invData?.found) {
              console.log('Invitación por email aceptada automáticamente:', invData);
              toast({
                title: "¡Invitación Aceptada!",
                description: `Has sido añadido automáticamente a ${invData.companyName || 'tu empresa'} y tu Plan Pro está activo.`,
                duration: 5000
              });
              // Pequeño delay para que vean el toast antes de redirigir (si aplica)
              await new Promise(resolve => setTimeout(resolve, 1500));
            }
          } catch (e) {
            console.error('Error verificando invitaciones por email:', e);
          }

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
        // Si no hay perfil, redirigir a login
        toast({
          title: "Configurando cuenta",
          description: "Completando tu registro...",
        });
        navigate('/auth');
        setLoading(false);
        return;
      }

      // Obtener rol (se crea automáticamente si no existe)
      const roleData = await getUserRole(data.user.id);

      if (!roleData) {
        // Si no se pudo obtener/crear el rol, ir a login
        toast({
          title: "Configurando cuenta",
          description: "Completando tu registro...",
        });
        navigate('/auth');
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
        // Por defecto, redirigir a pilot
        navigate('/pilot');
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

  const handleGoogleAuth = async (userType: 'pilot' | 'company' = 'pilot') => {
    setLoading(true);

    try {
      const result = await signInWithGoogle(userType);

      console.log('Google Auth Result:', result);

      if (result.success && result.user) {
        toast({
          title: result.isNewUser ? "¡Bienvenido!" : "¡Hola de nuevo!",
          description: result.isNewUser
            ? "Tu cuenta ha sido creada exitosamente"
            : "Has iniciado sesión correctamente",
        });

        // Pequeña pausa para que el toast se muestre
        await new Promise(resolve => setTimeout(resolve, 500));

        // Obtener el rol real de la base de datos
        const dbRoleData = await getUserRole(result.user.id);
        const userRole = dbRoleData?.role || result.user.role;

        console.log('Redirigiendo usuario con rol real:', userRole);

        if (userRole === 'company') {
          window.location.href = '/company';
        } else if (userRole === 'admin' || userRole === 'super_admin') {
          window.location.href = '/dashboard';
        } else {
          // Verificar si hay invitación pendiente
          const storedToken = localStorage.getItem('pendingInvitationToken');
          if (storedToken) {
            window.location.href = `/invitation/${storedToken}`;
          } else {
            // Pilotos van a /pilot
            window.location.href = '/pilot';
          }
        }
      } else {
        toast({
          title: "Error",
          description: result.error || "No se pudo iniciar sesión con Google",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error en Google Auth:', error);
      toast({
        title: "Error",
        description: "Ocurrió un error al iniciar sesión con Google",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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
    const [email, setEmail] = useState(initialEmail);
    const [password, setPassword] = useState("");

    useEffect(() => {
      if (initialEmail) {
        setEmail(initialEmail);
      }
    }, [initialEmail]);

    const onSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      handleSignIn(email, password);
    };

    return (
      <div className="space-y-4">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="relative">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={loading}
            >
              <GoogleIcon />
              Continuar con Google
            </Button>
            <div
              id="google-login-btn-overlay"
              className="absolute inset-0 opacity-0 overflow-hidden cursor-pointer"
              style={{ zIndex: 10, minHeight: '44px', width: '100%' }}
            />
          </div>

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
                autoComplete="email"
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="login-password">Contraseña</Label>
              <Button
                variant="link"
                className="px-0 font-normal text-xs text-muted-foreground hover:text-accent"
                onClick={() => setShowForgotPassword(true)}
                type="button"
              >
                ¿Olvidaste tu contraseña?
              </Button>
            </div>
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
                autoComplete="current-password"
              />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
          </Button>
        </form>
      </div>
    );
  };

  const ForgotPasswordForm = () => {
    const [email, setEmail] = useState("");
    const [sending, setSending] = useState(false);

    const handleReset = async (e: React.FormEvent) => {
      e.preventDefault();
      setSending(true);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${getBaseUrl()}/auth?tab=login`,
        });

        if (error) throw error;

        toast({
          title: "Email enviado",
          description: "Revisa tu bandeja de entrada para restablecer tu contraseña",
        });
        setShowForgotPassword(false);
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "No se pudo enviar el email de recuperación",
        });
      } finally {
        setSending(false);
      }
    };

    return (
      <form onSubmit={handleReset} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="reset-email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="reset-email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10"
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={sending}>
          {sending ? "Enviando..." : "Enviar instrucciones"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={() => setShowForgotPassword(false)}
        >
          Volver al inicio de sesión
        </Button>
      </form>
    );
  };

  const UpdatePasswordForm = () => {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [updating, setUpdating] = useState(false);

    const handleUpdate = async (e: React.FormEvent) => {
      e.preventDefault();
      if (password !== confirmPassword) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Las contraseñas no coinciden",
        });
        return;
      }

      setUpdating(true);
      try {
        const { error } = await supabase.auth.updateUser({ password });

        if (error) throw error;

        toast({
          title: "Contraseña actualizada",
          description: "Tu contraseña ha sido actualizada exitosamente",
        });
        setIsRecovery(false);
        navigate('/dashboard');
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "No se pudo actualizar la contraseña",
        });
      } finally {
        setUpdating(false);
      }
    };

    return (
      <form onSubmit={handleUpdate} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="update-password">Nueva Contraseña</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="update-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirmar Contraseña</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="confirm-password"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10"
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={updating}>
          {updating ? "Actualizando..." : "Actualizar Contraseña"}
        </Button>
      </form>
    );
  };

  const SignUpForm = () => {
    const [email, setEmail] = useState(initialEmail);
    const [password, setPassword] = useState("");

    useEffect(() => {
      if (initialEmail) {
        setEmail(initialEmail);
      }
    }, [initialEmail]);
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
        <div className="relative">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={loading}
          >
            <GoogleIcon />
            Registrarse con Google
          </Button>
          <div
            id="google-signup-btn-overlay"
            className="absolute inset-0 opacity-0 overflow-hidden cursor-pointer"
            style={{ zIndex: 10, minHeight: '44px', width: '100%' }}
          />
        </div>

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
              autoComplete="name"
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
              autoComplete="email"
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
              autoComplete="new-password"
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
          <div className="flex justify-center mb-6">
            <Logo size="xl" showText={false} className="hover:scale-105 transition-transform duration-200 scale-150 mb-4" />
          </div>
          <p className="text-muted-foreground">Accede a tu cuenta profesional</p>
        </div>

        <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-sm">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {!isRecovery && !showForgotPassword && (
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
                <TabsTrigger value="signup">Crear Cuenta</TabsTrigger>
              </TabsList>
            )}

            <CardContent className="p-6 pt-0">
              <TabsContent value="login" className="mt-0">
                {isRecovery ? (
                  <>
                    <div className="space-y-2 mb-6">
                      <CardTitle>Nueva contraseña</CardTitle>
                      <CardDescription>
                        Ingresa tu nueva contraseña para acceder a tu cuenta
                      </CardDescription>
                    </div>
                    <UpdatePasswordForm />
                  </>
                ) : showForgotPassword ? (
                  <>
                    <div className="space-y-2 mb-6">
                      <CardTitle>Recuperar contraseña</CardTitle>
                      <CardDescription>
                        Ingresa tu email para recibir instrucciones
                      </CardDescription>
                    </div>
                    <ForgotPasswordForm />
                  </>
                ) : (
                  <>
                    <div className="space-y-2 mb-6">
                      <CardTitle>Bienvenido de vuelta</CardTitle>
                      <CardDescription>
                        Ingresa tus credenciales para acceder
                      </CardDescription>
                    </div>
                    <LoginForm />
                  </>
                )}
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

        {!isRecovery && !showForgotPassword && (
          <div className="text-center mt-6">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="text-muted-foreground hover:text-foreground"
            >
              ← Volver al inicio
            </Button>
          </div>
        )}
        <Footer />
      </div>
    </div>
  );
};

export default Auth;
