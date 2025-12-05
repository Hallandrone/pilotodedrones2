import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  ArrowLeft, 
  CreditCard, 
  Calendar, 
  Phone, 
  Mail, 
  MessageCircle,
  CheckCircle,
  AlertCircle,
  Star,
  HelpCircle,
  ExternalLink,
  Loader2
} from "lucide-react";
import { createSubscription as createFlowSubscription, cancelSubscription as cancelFlowSubscription, type FlowSubscriptionParams } from "@/integrations/flow/client";
import { getBaseUrl } from "@/lib/getBaseUrl";

interface Membership {
  plan_name: string;
  status: 'active' | 'pending' | 'expired' | 'cancelled' | 'inactive';
  renewal_date: string | null;
  payment_method: string | null;
  price: number;
  features: string[];
  reveniu_subscription_id?: string | null;
  flow_subscription_id?: string | null;
  flow_plan_id?: string | null;
}

interface AvailablePlan {
  id: string;
  name: string;
  price: number;
  reveniu_plan_id?: string;
  reveniu_checkout_link?: string; // Link directo de checkout de Reveniu
  flow_plan_id?: string; // ID del plan en Flow
  features: string[];
  description: string;
}

const PilotMembership = () => {
  const [membership, setMembership] = useState<Membership | null>(null);
  const [availablePlans, setAvailablePlans] = useState<AvailablePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [userType, setUserType] = useState<string | null>(null);
  const [showEmailWarning, setShowEmailWarning] = useState(false);
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);
  const [pendingFlowPlanId, setPendingFlowPlanId] = useState<string | undefined>(undefined);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Planes disponibles
  // IMPORTANTE: Agregar flow_plan_id de los planes creados en Flow
  // Flow está ACTIVO y configurado para usar sandbox por defecto
  const defaultPlans: AvailablePlan[] = [
    {
      id: 'profesional',
      name: 'Plan Profesional',
      price: 14990,
      flow_plan_id: '', // TODO: Agregar el ID del plan en Flow (sandbox)
      reveniu_checkout_link: 'https://sandbox.reveniu.com/checkout-custom-link/pk2JYEwJVEDUT5vXiFy4M6B9UNwjKxSD', // Link de Reveniu sandbox
      description: 'Ideal para: Pilotos individuales que buscan mostrar su experiencia certificada',
        features: [
          'Perfil público con nombre, foto, zona y tipo de trabajos',
          'Sello digital "Perfil Certificado" tras validación',
          'Subida ilimitada de certificados (PDF)',
          'Bitácora de vuelos y registro de horas acumuladas',
          'Enlace a perfil y código QR verificable',
          'Acceso al panel para editar datos y actualizar experiencia',
          'Atención estándar por correo'
        ]
    },
    {
      id: 'empresa',
      name: 'Plan Empresa',
      price: 39990,
      flow_plan_id: '', // TODO: Agregar el ID del plan en Flow (sandbox)
      description: 'Ideal para: Publicar Empresas para realizar servicios especializados con drones',
      features: [
        'Todo lo del Plan Profesional',
        'Panel multiusuario (para agregar hasta 3 pilotos)',
        'Sello digital "Empresa Certificada" tras validación',
        'Perfil destacado en "Empresas Recomendadas"',
        'Estadísticas de vistas y contacto de clientes',
        'Soporte técnico prioritario WhatsApp'
      ]
    }
  ];

  useEffect(() => {
    loadMembership();
    checkUserType();

    // Manejar parámetros de URL después del checkout
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
      toast({
        title: "¡Pago procesado!",
        description: "Verificando el estado de tu suscripción...",
      });
      // Limpiar URL
      window.history.replaceState({}, '', window.location.pathname);
      // Esperar un momento y recargar membresía (el webhook puede tardar)
      setTimeout(() => {
        loadMembership();
      }, 2000);
      // Recargar nuevamente después de 5 segundos por si el webhook tardó
      setTimeout(() => {
        loadMembership();
      }, 5000);
    } else if (urlParams.get('canceled') === 'true') {
      toast({
        title: "Pago cancelado",
        description: "El proceso de pago fue cancelado",
        variant: "default",
      });
      // Limpiar URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Filtrar planes según el tipo de usuario
  useEffect(() => {
    if (userType === 'company') {
      // Si es empresa, solo mostrar Plan Empresa
      setAvailablePlans(defaultPlans.filter(p => p.id === 'empresa'));
    } else {
      // Si es piloto (o no se ha determinado), solo mostrar Plan Profesional
      setAvailablePlans(defaultPlans.filter(p => p.id === 'profesional'));
    }
  }, [userType]);

  const checkUserType = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUserType(profile.user_type);
      }
    } catch (error) {
      console.error('Error checking user type:', error);
    }
  };

  const loadMembership = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Cargar suscripción desde Supabase
      const { data: subscription, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle(); // Usa maybeSingle() para evitar error 406 cuando no hay datos

      if (error) {
        console.error('Error loading subscription:', error);
        // No lanzar error si no hay suscripción, simplemente continuar
        if (error.code !== 'PGRST116') {
          throw error;
        }
      }

      if (subscription) {
        // Mapear plan_name de BD a detalles del plan
        // BD usa: 'basic', 'pro', 'premium'
        // Frontend usa: 'profesional', 'empresa'
        const planDetails = defaultPlans.find(p => {
          if (subscription.plan_name === 'pro') return p.id === 'profesional';
          if (subscription.plan_name === 'premium') return p.id === 'empresa';
          if (subscription.plan_name === 'basic') return p.id === 'profesional'; // fallback
          return p.id === subscription.plan_name;
        }) || defaultPlans[0];

        // Cast para acceder a propiedades que pueden no estar en el tipo
        const subscriptionWithExtras = subscription as any;

        setMembership({
          plan_name: planDetails.name,
          status: subscription.status as any,
          renewal_date: subscription.renewal_date,
          payment_method: subscription.payment_method,
          price: planDetails.price,
          features: planDetails.features,
          reveniu_subscription_id: subscriptionWithExtras.reveniu_subscription_id || null,
          flow_subscription_id: subscriptionWithExtras.flow_subscription_id || null,
          flow_plan_id: subscriptionWithExtras.flow_plan_id || null
        });
      } else {
        // Usuario sin suscripción
        setMembership(null);
      }
    } catch (error) {
      console.error('Error loading membership:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos de membresía",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId: string, flowPlanId?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "Debes iniciar sesión para suscribirte",
          variant: "destructive",
        });
        return;
      }

      // Verificar si ya tiene una suscripción activa
      if (membership && membership.status === 'active') {
        toast({
          title: "Ya tienes una suscripción activa",
          description: `Actualmente tienes el plan ${membership.plan_name} activo. Cancela tu suscripción actual antes de suscribirte a otro plan.`,
          variant: "default",
        });
        return;
      }

      // Obtener el plan seleccionado
      const selectedPlan = availablePlans.find(p => p.id === planId);
      
      // Si el plan tiene un link de checkout de Reveniu, mostrar advertencia primero
      if (selectedPlan?.reveniu_checkout_link) {
        setPendingPlanId(planId);
        setPendingFlowPlanId(flowPlanId);
        setShowEmailWarning(true);
        return;
      }

      // Si no hay link de Reveniu, continuar con Flow
      // Obtener email del usuario
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', user.id)
        .single();

      if (!profile?.email) {
        toast({
          title: "Error",
          description: "No se encontró el email del usuario",
          variant: "destructive",
        });
        return;
      }

      if (!flowPlanId) {
        toast({
          title: "Error de configuración",
          description: "El plan no tiene un ID de Flow configurado. Por favor, contacta al administrador para configurar los planes en Flow sandbox.",
          variant: "destructive",
        });
        setSubscribing(null);
        return;
      }

      // Crear suscripción en Flow
      const appUrl = getBaseUrl();
      // URL del webhook público de Supabase Edge Function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
      const webhookUrl = supabaseUrl 
        ? `${supabaseUrl}/functions/v1/flow-webhook`
        : `${appUrl}/api/flow-webhook`;
      const successUrl = `${appUrl}/pilot/membership?success=true`;
      const cancelUrl = `${appUrl}/pilot/membership?canceled=true`;

      const subscriptionResponse = await createFlowSubscription({
        planId: flowPlanId,
        customerEmail: profile.email,
        customerName: profile.full_name || undefined,
        urlConfirmation: webhookUrl,
        urlReturn: successUrl,
        optional: {
          urlCancel: cancelUrl,
        }
      });

      // Flow retorna el token o URL para redirigir al checkout
      const checkoutUrl = subscriptionResponse.url || subscriptionResponse.token;
      if (checkoutUrl) {
        // Si es un token, construir la URL de checkout
        if (subscriptionResponse.token && !subscriptionResponse.url) {
          const flowEnv = import.meta.env.VITE_FLOW_ENV || 'sandbox';
          const flowBaseUrl = flowEnv === 'production' 
            ? 'https://www.flow.cl/pagar'
            : 'https://sandbox.flow.cl/pagar';
          window.location.href = `${flowBaseUrl}/${subscriptionResponse.token}`;
        } else {
          window.location.href = checkoutUrl;
        }
      } else {
        throw new Error('No se recibió URL de checkout de Flow');
      }
    } catch (error: any) {
      console.error('Error creating subscription:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la suscripción. Intenta nuevamente.",
        variant: "destructive",
      });
      setSubscribing(null);
    }
  };

  const handleConfirmSubscribe = () => {
    setShowEmailWarning(false);
    const selectedPlan = availablePlans.find(p => p.id === pendingPlanId);
    if (selectedPlan?.reveniu_checkout_link) {
      window.location.href = selectedPlan.reveniu_checkout_link;
    }
    setPendingPlanId(null);
    setPendingFlowPlanId(undefined);
  };

  const handleCancelSubscription = async () => {
    if (!membership?.flow_subscription_id) {
      toast({
        title: "Error",
        description: "No se encontró información de la suscripción",
        variant: "destructive",
      });
      return;
    }

    // Confirmación antes de cancelar
    const confirmed = window.confirm(
      '¿Estás seguro de que deseas cancelar tu suscripción?\n\n' +
      'Tu acceso al plan continuará hasta la próxima fecha de cobro.\n' +
      'Después de esa fecha, perderás acceso a las funcionalidades premium.'
    );

    if (!confirmed) {
      return;
    }

    try {
      setSubscribing('cancelling');
      
      // Cancelar suscripción en Flow
      await cancelFlowSubscription(membership.flow_subscription_id);

      // Actualizar estado en la base de datos
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from('user_subscriptions')
          .update({
            status: 'cancelled',
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        if (error) throw error;
      }

      toast({
        title: "Suscripción cancelada",
        description: "Tu suscripción ha sido cancelada exitosamente. Mantendrás acceso hasta la próxima fecha de cobro.",
      });

      // Recargar membresía
      await loadMembership();
    } catch (error: any) {
      console.error('Error canceling subscription:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo cancelar la suscripción. Intenta nuevamente o contacta a soporte.",
        variant: "destructive",
      });
    } finally {
      setSubscribing(null);
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(price);
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
      <div className="bg-[#212121] border-b border-[#333333] shadow-sm sticky top-0 z-50">
        <div className="px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                // Detectar si viene de /company o /pilot basado en la ruta o user_type
                const isCompany = location.pathname.includes('/company') || userType === 'company';
                navigate(isCompany ? '/company' : '/pilot');
              }}
              className="h-10 w-10 rounded-full hover:bg-blue-50 hover:scale-105 transition-all duration-200"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-[#E0E0E0]">
                Membresía
              </h1>
              <p className="text-sm text-[#B0B0B0] font-medium">Gestiona tu plan y soporte</p>
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
                    <CreditCard className="h-5 w-5 text-white" />
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
                <p className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    {formatPrice(membership.price)}
                </p>
                <p className="text-[#B0B0B0] font-medium">por mes</p>
              </div>

              <div className="space-y-4">
                  {membership.renewal_date && (
                <div className="flex items-center justify-between p-3 bg-[#2C2C2C] border border-[#333333] rounded-xl">
                  <span className="text-[#B0B0B0] font-medium">Próxima renovación</span>
                  <span className="text-[#E0E0E0] font-semibold">
                        {formatDate(membership.renewal_date)}
                  </span>
                </div>
                  )}
                  {membership.payment_method && (
                <div className="flex items-center justify-between p-3 bg-[#2C2C2C] border border-[#333333] rounded-xl">
                  <span className="text-[#B0B0B0] font-medium">Método de pago</span>
                  <span className="text-[#E0E0E0] font-semibold">
                        {membership.payment_method}
                  </span>
                    </div>
                  )}
                </div>

                {/* Botón para verificar estado */}
                <div className="pt-4 border-t border-[#333333]">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setLoading(true);
                      loadMembership();
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
                        Verificar Estado de Suscripción
                      </>
                    )}
                  </Button>
                </div>

                {/* Botón de cancelar suscripción - solo si está activa y tiene flow_subscription_id */}
                {membership.status === 'active' && membership.flow_subscription_id && (
                  <div className="pt-4 border-t border-[#333333]">
                    <Button
                      variant="destructive"
                      onClick={handleCancelSubscription}
                      disabled={subscribing === 'cancelling'}
                      className="w-full bg-red-600 hover:bg-red-700 text-white"
                    >
                      {subscribing === 'cancelling' ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Cancelando...
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-4 w-4 mr-2" />
                          Cancelar Suscripción
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-[#B0B0B0] mt-2 text-center">
                      Tu acceso continuará hasta la próxima fecha de cobro
                    </p>
                  </div>
                )}
              </CardContent>
              </div>
          </Card>
        ) : (
          <Card className="bg-[#212121] border border-[#333333] shadow-xl rounded-2xl overflow-hidden">
            <CardContent className="p-6 bg-[#2C2C2C] rounded-xl text-center">
              <p className="text-[#E0E0E0] mb-4">No tienes una suscripción activa</p>
              <p className="text-[#B0B0B0] text-sm">Selecciona un plan para comenzar</p>
            </CardContent>
        </Card>
        )}

        {/* Available Plans */}
        <Card className="bg-[#212121] border border-[#333333] shadow-xl rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-[#FF69B4]/20 via-[#FF69B4]/10 to-[#FF69B4]/20 p-1">
            <CardHeader className="p-6 bg-[#2C2C2C] rounded-xl">
              <CardTitle className="text-xl font-bold text-[#E0E0E0]">
                Planes Disponibles
              </CardTitle>
              <CardDescription className="text-[#B0B0B0] font-medium">
                Actualiza tu plan para obtener más funcionalidades
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 bg-[#2C2C2C] rounded-xl space-y-6">
            {availablePlans.map((plan) => {
              const isCurrentPlan = membership?.plan_name === plan.name;
              const isSubscribing = subscribing === plan.id;
              
              return (
                <div 
                  key={plan.id} 
                  className={`border-2 rounded-2xl p-6 bg-[#2C2C2C] border-[#333333] ${
                    plan.id === 'profesional' 
                      ? 'border-blue-500/30' 
                      : 'border-purple-500/30'
                  }`}
                >
              <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xl font-bold text-[#E0E0E0]">{plan.name}</h4>
                    {isCurrentPlan && (
                      <div className={`px-3 py-1 text-white rounded-full text-sm font-semibold ${
                        plan.id === 'profesional' ? 'bg-blue-500' : 'bg-purple-500'
                      }`}>
                  Actual
                </div>
                    )}
              </div>
                  <p className={`text-3xl font-bold bg-clip-text text-transparent mb-2 ${
                    plan.id === 'profesional'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600'
                      : 'bg-gradient-to-r from-purple-600 to-pink-600'
                  }`}>
                    {formatPrice(plan.price)}
                  </p>
                  <p className="text-[#B0B0B0] font-medium mb-4">{plan.description}</p>
                  <ul className="text-[#E0E0E0] space-y-2 mb-4">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-3">
                        <div className={`h-2 w-2 rounded-full ${
                          plan.id === 'profesional' ? 'bg-blue-500' : 'bg-purple-500'
                        }`}></div>
                        {feature}
                </li>
                    ))}
              </ul>
                  {!isCurrentPlan && (
                    <>
                      {membership && membership.status === 'active' ? (
                        <div className="w-full mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center">
                          <p className="text-[#E0E0E0] font-medium mb-2">
                            Ya tienes un plan activo
                          </p>
                          <p className="text-sm text-[#B0B0B0]">
                            Cancela tu suscripción actual para cambiar de plan
                          </p>
                        </div>
                      ) : (
                        <Button 
                          className={`w-full mt-4 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 ${
                            plan.id === 'profesional'
                              ? 'bg-blue-600 hover:bg-blue-700 text-white'
                              : 'bg-[#FF69B4] hover:bg-[#FF69B4]/90 text-white'
                          }`}
                          onClick={() => handleSubscribe(plan.id, plan.flow_plan_id)}
                          disabled={isSubscribing || (membership && membership.status === 'active')}
                        >
                          {isSubscribing ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Procesando...
                            </>
                          ) : (
                            `Suscribirse a ${plan.name}`
                          )}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              );
            })}
            </CardContent>
          </div>
        </Card>

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
              onClick={() => window.open('mailto:soporte@pilotodedrones.cl')}
            >
              <Mail className="h-5 w-5 mr-4" />
              <div className="text-left">
                <div className="font-semibold text-[#E0E0E0]">Email de Soporte</div>
                <div className="text-sm text-[#B0B0B0]">soporte@pilotodedrones.cl</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start bg-[#2C2C2C] border-[#333333] hover:bg-green-500/10 hover:border-green-500 hover:text-green-500 transition-all duration-200 rounded-xl p-4 text-[#E0E0E0]"
              onClick={() => window.open('https://wa.me/569XXXXXXXX', '_blank')}
            >
              <MessageCircle className="h-5 w-5 mr-4" />
              <div className="text-left">
                <div className="font-semibold text-[#E0E0E0]">WhatsApp (Plan Empresa)</div>
                <div className="text-sm text-[#B0B0B0]">Soporte técnico prioritario</div>
              </div>
              <ExternalLink className="h-4 w-4 ml-auto" />
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start bg-[#2C2C2C] border-[#333333] hover:bg-[#FF69B4]/10 hover:border-[#FF69B4] hover:text-[#FF69B4] transition-all duration-200 rounded-xl p-4 text-[#E0E0E0]"
              onClick={() => window.open('https://help.pilotodedrones.cl', '_blank')}
            >
              <HelpCircle className="h-5 w-5 mr-4" />
              <div className="text-left">
                <div className="font-semibold text-[#E0E0E0]">Centro de Ayuda</div>
                <div className="text-sm text-[#B0B0B0]">Preguntas frecuentes</div>
              </div>
              <ExternalLink className="h-4 w-4 ml-auto" />
            </Button>
            </CardContent>
          </div>
        </Card>

        {/* Dialog de advertencia de email */}
        <Dialog open={showEmailWarning} onOpenChange={setShowEmailWarning}>
          <DialogContent className="bg-[#2C2C2C] border-[#333333] text-[#E0E0E0] max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold text-[#E0E0E0]">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                Importante: Email de Suscripción
              </DialogTitle>
              <DialogDescription className="text-[#B0B0B0] pt-2">
                Para que tu suscripción se active correctamente, es <strong className="text-amber-400">muy importante</strong> que uses el mismo email con el que estás registrado en Piloto de Drones.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                <p className="text-sm text-[#E0E0E0] mb-2">
                  <strong>⚠️ Aviso importante:</strong>
                </p>
                <p className="text-sm text-[#B0B0B0] leading-relaxed">
                  Si usas un email diferente al de tu cuenta, el sistema no podrá asociar automáticamente tu suscripción y tendrás que contactar a soporte para activarla manualmente.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowEmailWarning(false)}
                className="bg-[#2C2C2C] border-[#333333] text-[#E0E0E0] hover:bg-[#3C3C3C]"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmSubscribe}
                className="bg-[#FF69B4] hover:bg-[#FF69B4]/90 text-white"
              >
                Continuar con el Pago
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default PilotMembership;

