import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Mail,
  MessageCircle,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  Loader2,
  GraduationCap,
  KeyRound
} from "lucide-react";
import Logo from "@/components/ui/logo";

const ACADEMY_URL = "https://www.academiadronchile.cl";

interface Membership {
  plan_name: string;
  status: 'active' | 'pending' | 'expired' | 'cancelled' | 'inactive' | 'pending_payment';
  renewal_date: string | null;
  created_at: string | null;
  payment_method: string | null;
  price: number;
  features: string[];
}

interface AvailablePlan {
  id: string;
  name: string;
  price: number;
  features: string[];
  description: string;
}

const PilotMembership = () => {
  const [membership, setMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);
  const [sponsoringCompany, setSponsoringCompany] = useState<string | null>(null);
  const [diplomaCode, setDiplomaCode] = useState("");
  const [claiming, setClaiming] = useState(false);
  // FIX #4: bandera para distinguir una activación originada por el propio usuario
  // en esta pantalla (handler) de una que llega por otra vía (Realtime), y así
  // evitar el doble toast + doble loadMembership.
  const selfActivationRef = useRef(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Plan aspiracional que ahora es EXCLUSIVO para alumnos de Academia Drone Chile.
  // Se activa únicamente con el código del diploma (RPC claim_diploma_code).
  const academyPlan: AvailablePlan = {
    id: 'profesional',
    name: 'Plan Alumno Academia',
    price: 0,
    description: 'Exclusivo para alumnos de Academia Drone Chile',
    features: [
      'Todo lo del Plan Gratis',
      'Sello digital "Perfil Certificado" tras validación',
      'Subida ilimitada de certificados (PDF)',
      'Bitácora de vuelos y registro de horas acumuladas',
      'URL personalizada para tu perfil',
      'Perfil destacado en búsquedas',
      'Badge de piloto certificado',
      'Formulario de contacto público',
      'Soporte por WhatsApp'
    ]
  };

  useEffect(() => {
    loadMembership(true);

    // SUSCRIPCIÓN EN TIEMPO REAL: refleja al instante la activación por código de diploma.
    // Guardamos la referencia del canal en el scope del effect para removerlo al desmontar
    // y usamos una bandera `cancelled` para no crear el canal si el componente ya se desmontó.
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      channel = supabase
        .channel(`subscription_updates_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_subscriptions',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('🔔 Suscripción actualizada en tiempo real:', payload);
            // FIX #4: si la activación la originó el usuario en ESTA pantalla, el
            // handler ya mostró el toast y refrescó. Consumimos la bandera y evitamos
            // el doble toast + doble loadMembership (y el parpadeo asociado).
            if (selfActivationRef.current) {
              selfActivationRef.current = false;
              return;
            }
            loadMembership(false);
            const newStatus = (payload.new as any)?.status;
            if (newStatus === 'active') {
              toast({
                title: "¡Plan Alumno Activado!",
                description: "Tu Plan Alumno Academia ya está activo.",
              });
            }
          }
        )
        .subscribe();
    };

    setupRealtime();

    return () => {
      cancelled = true;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const loadMembership = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Cargar suscripción activa (o estados legacy) desde Supabase.
      const { data: subscription, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .or('status.eq.active,status.eq.cancelled,status.eq.pending_payment,status.eq.expired')
        .maybeSingle();

      if (error) {
        console.error('Error loading subscription:', error);
      }

      if (subscription) {
        // Mapear plan_name de BD ('pro'/'basic'/'premium') al plan mostrado.
        const isPaidPlan =
          subscription.plan_name === 'pro' ||
          subscription.plan_name === 'profesional' ||
          subscription.plan_name === 'basic' ||
          subscription.plan_name === 'premium' ||
          subscription.plan_name === 'empresa';

        // Solo seteamos membresía si NO es free.
        if (isPaidPlan && subscription.status === 'active') {
          setMembership({
            plan_name: academyPlan.name,
            status: subscription.status as any,
            renewal_date: subscription.renewal_date,
            created_at: subscription.created_at,
            payment_method: subscription.payment_method,
            price: academyPlan.price,
            features: academyPlan.features
          });
        } else {
          setMembership(null);
        }
      } else {
        setMembership(null);
      }

      // ====== LÓGICA PRIORIZADA: PILOTO DE EMPRESA ======
      // Si el usuario pertenece a una empresa, forzamos vista "Patrocinado por {empresa}".
      console.log('🔍 Verificando si usuario es piloto de empresa...', user.id);

      const { data: pilotData } = await supabase
        .from('pilots')
        .select('id')
        .eq('user_id', user.id)
        .single();

      console.log('👤 Pilot record:', pilotData);

      let pilotCompanyData = null;
      let companyError = null;

      if (pilotData?.id) {
        const result = await supabase
          .from('company_pilots')
          .select('company_id')
          .eq('pilot_id', pilotData.id)
          .maybeSingle();

        pilotCompanyData = result.data;
        companyError = result.error;
      }

      console.log('📊 Resultado company_pilots:', { pilotCompanyData, companyError });

      if (pilotCompanyData?.company_id) {
        console.log('✅ ES PILOTO DE EMPRESA. Company ID:', pilotCompanyData.company_id);

        const { data: companyData } = await supabase
          .from('companies')
          .select('company_name')
          .eq('id', pilotCompanyData.company_id)
          .single();

        const companyName = (companyData as any)?.company_name || 'la empresa';
        console.log('🏢 Nombre de empresa:', companyName);
        setSponsoringCompany(companyName);

        // Si su plan actual no es el Pro empresarial, restaurarlo vía Edge Function.
        if (!subscription || subscription.plan_name !== 'pro' || !subscription.payment_method?.includes('company')) {
          console.log('⚠️ Piloto de empresa sin plan Pro correcto. Restaurando...');

          const { data: restoreData } = await supabase.functions.invoke('send-invitation-email', {
            body: { action: 'restore_pro_subscription' }
          });

          if (restoreData?.success) {
            toast({
              title: "Plan actualizado",
              description: `Tu Plan Pro de ${companyName} ha sido activado.`,
            });
            loadMembership(false);
            return;
          }
        }

        console.log('✅ Seteando membership como empresa');
        setMembership({
          plan_name: 'Plan Pro',
          price: 0,
          status: 'active',
          renewal_date: subscription?.renewal_date || null,
          created_at: subscription?.created_at || null,
          payment_method: 'company_sponsored',
          features: academyPlan.features
        });

      } else {
        console.log('❌ NO es piloto de empresa');
        setSponsoringCompany(null);
      }

    } catch (error) {
      console.error('Error loading membership:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos de membresía",
        variant: "destructive",
      });
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  const handleClaimDiploma = async () => {
    const code = diplomaCode.trim();
    if (!code) {
      toast({
        title: "Ingresa tu código",
        description: "Escribe el código que aparece en tu diploma.",
        variant: "destructive",
      });
      return;
    }

    try {
      setClaiming(true);
      // FIX #4: marcamos que esta activación la origina el usuario en esta pantalla,
      // para que el canal Realtime NO dispare un segundo toast ni recargue de más.
      selfActivationRef.current = true;
      // La activación se hace vía RPC controlada (SECURITY DEFINER).
      // El cliente NUNCA escribe plan_name/status directo en user_subscriptions.
      const { data, error } = await supabase.rpc('claim_diploma_code', { p_code: code });

      if (error) throw error;

      const result = data as any;

      if (result?.success) {
        if (result.already_claimed_by_me) {
          // No cambia el status → Realtime no dispara: liberamos la bandera.
          selfActivationRef.current = false;
          toast({
            title: "Ya tienes el Plan Alumno activo",
            description: "Este código ya está asociado a tu cuenta.",
          });
        } else {
          toast({
            title: "¡Plan Alumno activado!",
            description: "Ya tienes acceso a todos los beneficios del Plan Alumno Academia.",
          });
          // Safety: si el evento Realtime no llega, liberamos la bandera para no
          // suprimir toasts legítimos futuros.
          window.setTimeout(() => { selfActivationRef.current = false; }, 5000);
        }
        setDiplomaCode("");
        await loadMembership(false);
      } else {
        selfActivationRef.current = false;
        if (result?.error === 'invalid_code') {
          toast({
            title: "Código inválido",
            description: "Revisa el código de tu diploma e intenta nuevamente.",
            variant: "destructive",
          });
        } else if (result?.error === 'already_claimed') {
          toast({
            title: "Código ya utilizado",
            description: "Este código ya fue utilizado. Si crees que es un error, contáctanos.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "No se pudo activar",
            description: "Ocurrió un problema al validar tu código. Intenta nuevamente.",
            variant: "destructive",
          });
        }
      }
    } catch (error: any) {
      selfActivationRef.current = false;
      console.error('Error claiming diploma code:', error);
      toast({
        title: "Error",
        description: "No pudimos procesar tu código. Intenta más tarde o contacta a soporte.",
        variant: "destructive",
      });
    } finally {
      setClaiming(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Activa
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-500/20 text-yellow-500 border border-yellow-500">
            <AlertCircle className="h-3 w-3 mr-1" />
            Pendiente
          </Badge>
        );
      case 'expired':
        return (
          <Badge className="bg-red-500/20 text-red-500 border border-red-500">
            <AlertCircle className="h-3 w-3 mr-1" />
            Expirada
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge className="bg-gray-500/20 text-gray-500 border border-gray-500">
            <AlertCircle className="h-3 w-3 mr-1" />
            Cancelada
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-500/20 text-yellow-500 border border-yellow-500">
            <AlertCircle className="h-3 w-3 mr-1" />
            Inactiva
          </Badge>
        );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
          <p className="text-[#B0B0B0]">Cargando membresía...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-[#E0E0E0]">
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-xl border-b border-gray-200 shadow-2xl sticky top-0 z-50">
        <div className="px-4 py-4 sm:py-6">
          <div className="flex items-center gap-4 max-w-7xl mx-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/pilot')}
              className="h-12 w-12 rounded-full hover:bg-gray-100 hover:scale-110 transition-all duration-300 text-gray-900"
            >
              <ArrowLeft className="h-7 w-7" />
            </Button>
            <Logo
              size="xl"
              className="flex-shrink-0 [&>div]:h-14 [&>div]:w-14 sm:[&>div]:h-20 sm:[&>div]:w-20 hover:scale-110 transition-all duration-300"
              showText={false}
            />
            <div className="flex flex-col">
              <h1 className="text-xl sm:text-3xl font-bold text-gray-900 tracking-tight">Membresía</h1>
              <p className="text-xs sm:text-lg text-gray-600 font-medium uppercase tracking-wider">Gestión de Planes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 pb-20">
        {/* Current Plan */}
        {membership ? (
          <Card className="bg-[#212121] border border-[#333333] shadow-xl rounded-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-[#FF69B4]/20 via-[#FF69B4]/10 to-[#FF69B4]/20 p-1">
              <CardHeader className="p-6 bg-[#2C2C2C] rounded-xl">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                      <GraduationCap className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xl font-bold text-[#E0E0E0]">
                      Plan Actual
                    </span>
                  </div>
                  {getStatusBadge(membership.status)}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 bg-[#2C2C2C] rounded-xl space-y-6">
                <div className="text-center">
                  <h3 className="text-3xl font-bold text-[#E0E0E0] mb-2">
                    {membership.plan_name}
                  </h3>
                  {sponsoringCompany ? (
                    <p className="text-lg text-blue-400 font-semibold">
                      Patrocinado por {sponsoringCompany}
                    </p>
                  ) : (
                    <p className="text-lg text-green-400 font-semibold">
                      Plan Alumno Academia — Activo
                    </p>
                  )}
                </div>

                <div className="space-y-4">
                  {membership.created_at && (
                    <div className="flex items-center justify-between p-3 bg-[#2C2C2C] border border-[#333333] rounded-xl">
                      <span className="text-[#B0B0B0] font-medium">Activo desde</span>
                      <span className="text-[#E0E0E0] font-semibold text-sm">
                        {formatDate(membership.created_at)}
                      </span>
                    </div>
                  )}

                  <ul className="text-[#E0E0E0] space-y-2">
                    {membership.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-3">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Botón para verificar estado */}
                <div className="pt-4 border-t border-[#333333]">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setLoading(true);
                      loadMembership(true);
                    }}
                    disabled={loading}
                    className="w-full bg-[#2C2C2C] border-[#333333] hover:bg-[#3C3C3C] text-[#E0E0E0]"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Verificando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Verificar Estado del Plan
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </div>
          </Card>
        ) : (
          <Card className="bg-[#212121] border border-[#333333] shadow-xl rounded-2xl overflow-hidden">
            <CardContent className="p-6 bg-[#2C2C2C] rounded-xl text-center">
              <p className="text-[#E0E0E0] mb-2">Actualmente tienes el Plan Gratis</p>
              <p className="text-[#B0B0B0] text-sm">Perfil público, código QR y aparición en búsquedas</p>
            </CardContent>
          </Card>
        )}

        {/* Sponsored Message (empresa) */}
        {sponsoringCompany ? (
          <Card className="bg-[#0f172a] border border-blue-500/30 shadow-xl rounded-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600/20 via-blue-400/10 to-blue-600/20 p-1">
              <CardHeader className="p-6 bg-[#1e293b]/90 backdrop-blur rounded-xl">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-blue-100">
                      Membresía Empresarial Activa
                    </CardTitle>
                    <CardDescription className="text-blue-300">
                      Gestionada por <span className="font-bold text-white">{sponsoringCompany}</span>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 bg-[#1e293b]/90 backdrop-blur rounded-xl space-y-4">
                <p className="text-gray-300">
                  Tu cuenta está vinculada a una suscripción empresarial. Disfrutas de todos los beneficios del <span className="text-white font-semibold">Plan Pro</span> sin costo directo para ti.
                </p>
                <div className="p-4 bg-blue-900/20 border border-blue-500/20 rounded-lg">
                  <p className="text-sm text-blue-200">
                    <AlertCircle className="h-4 w-4 inline mr-2" />
                    Si la empresa cancela su suscripción, tu cuenta volverá automáticamente al Plan Gratis.
                  </p>
                </div>
              </CardContent>
            </div>
          </Card>
        ) : !membership ? (
          <>
            {/* Plan Alumno Academia — informativo / aspiracional */}
            <Card className="bg-[#212121] border border-[#333333] shadow-xl rounded-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500/20 via-blue-400/10 to-indigo-500/20 p-1">
                <CardHeader className="p-6 bg-[#2C2C2C] rounded-xl">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                      <GraduationCap className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold text-[#E0E0E0]">
                        Plan Alumno Academia
                      </CardTitle>
                      <CardDescription className="text-[#B0B0B0] font-medium">
                        Exclusivo para alumnos de Academia Drone Chile
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 bg-[#2C2C2C] rounded-xl space-y-6">
                  <ul className="text-[#E0E0E0] space-y-2">
                    {academyPlan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0"></div>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                    <p className="text-sm text-blue-200 leading-relaxed">
                      <AlertCircle className="h-4 w-4 inline mr-2 text-blue-400" />
                      Este plan es <span className="font-bold text-white">exclusivo para alumnos de Academia Drone Chile</span>. Se activa con el código que recibes en tu diploma al completar un curso.
                    </p>
                  </div>

                  <Button
                    className="w-full font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                    onClick={() => window.open(ACADEMY_URL, '_blank', 'noopener,noreferrer')}
                  >
                    Conoce los cursos
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </div>
            </Card>

            {/* ¿Ya eres alumno? — activar por código de diploma */}
            <Card className="bg-[#212121] border border-[#333333] shadow-xl rounded-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-green-500/20 via-green-400/10 to-emerald-500/20 p-1">
                <CardHeader className="p-6 bg-[#2C2C2C] rounded-xl">
                  <CardTitle className="flex items-center gap-3 text-xl font-bold text-[#E0E0E0]">
                    <div className="h-10 w-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                      <KeyRound className="h-5 w-5 text-white" />
                    </div>
                    ¿Ya eres alumno?
                  </CardTitle>
                  <CardDescription className="text-[#B0B0B0] font-medium">
                    Ingresa el código de tu diploma para activar tu Plan Alumno
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 bg-[#2C2C2C] rounded-xl space-y-4">
                  <Input
                    value={diplomaCode}
                    onChange={(e) => setDiplomaCode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !claiming) handleClaimDiploma();
                    }}
                    placeholder="Código del diploma"
                    disabled={claiming}
                    className="bg-[#1A1A1A] border-[#333333] text-[#E0E0E0] placeholder:text-[#707070] focus-visible:ring-green-500"
                  />
                  <Button
                    onClick={handleClaimDiploma}
                    disabled={claiming || !diplomaCode.trim()}
                    className="w-full font-semibold rounded-xl bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
                  >
                    {claiming ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Activando...
                      </>
                    ) : (
                      'Activar Plan Alumno'
                    )}
                  </Button>
                </CardContent>
              </div>
            </Card>
          </>
        ) : null}

        {/* Support Section */}
        <Card className="bg-[#212121] border border-[#333333] shadow-xl rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-[#FF69B4]/20 via-[#FF69B4]/10 to-[#FF69B4]/20 p-1">
            <CardHeader className="p-6 bg-[#2C2C2C] rounded-xl">
              <CardTitle className="flex items-center gap-3 text-xl font-bold text-white">
                <div className="h-10 w-10 bg-gradient-to-br from-slate-500 to-gray-600 rounded-xl flex items-center justify-center">
                  <HelpCircle className="h-5 w-5 text-white" />
                </div>
                Soporte y Ayuda
              </CardTitle>
              <CardDescription className="text-[#B0B0B0] font-medium">
                ¿Necesitas ayuda? Estamos aquí para asistirte
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 bg-[#2C2C2C] rounded-xl space-y-4">
              <Button
                variant="outline"
                className="w-full justify-start bg-[#2C2C2C] border-[#333333] hover:bg-blue-500/10 hover:border-blue-500 hover:text-blue-500 transition-all duration-200 rounded-xl p-4 text-[#E0E0E0]"
                onClick={() => window.open('mailto:info@pilotodedrones.cl')}
              >
                <Mail className="h-5 w-5 mr-4" />
                <div className="text-left">
                  <div className="font-semibold text-[#E0E0E0]">Email de Soporte</div>
                  <div className="text-sm text-[#B0B0B0]">info@pilotodedrones.cl</div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start bg-[#2C2C2C] border-[#333333] hover:bg-green-500/10 hover:border-green-500 hover:text-green-500 transition-all duration-200 rounded-xl p-4 text-[#E0E0E0]"
                onClick={() => window.open('https://wa.me/56954751380', '_blank')}
              >
                <MessageCircle className="h-5 w-5 mr-4" />
                <div className="text-left">
                  <div className="font-semibold text-[#E0E0E0]">Soporte Técnico WhatsApp</div>
                  <div className="text-sm text-[#B0B0B0]">Asistencia técnica inmediata</div>
                </div>
                <ExternalLink className="h-4 w-4 ml-auto" />
              </Button>
            </CardContent>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PilotMembership;
