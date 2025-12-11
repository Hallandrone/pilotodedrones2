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
import { createSubscription as createReveniuSubscription, cancelSubscription as cancelReveniuSubscription } from "@/integrations/reveniu/client";
import { getBaseUrl } from "@/lib/getBaseUrl";

interface Membership {
  plan_name: string;
  status: 'active' | 'pending' | 'expired' | 'cancelled' | 'inactive';
  renewal_date: string | null;
  payment_method: string | null;
  price: number;
  features: string[];
  reveniu_subscription_id?: string | null;
}

interface AvailablePlan {
  id: string;
  name: string;
  price: number;
  reveniu_plan_id?: string;
  reveniu_checkout_link?: string;
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
  const [sponsoringCompany, setSponsoringCompany] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Planes disponibles con Reveniu
  const defaultPlans: AvailablePlan[] = [
    {
      id: 'free',
      name: 'Plan Gratis',
      price: 0,
      description: 'Perfecto para comenzar y probar la plataforma',
      features: [
        'Perfil público profesional',
        'Código QR personalizado para compartir perfil',
        'Panel de control intuitivo',
        'Aparición en búsquedas de servicios'
      ]
    },
    {
      id: 'profesional',
      name: 'Plan Pro',
      price: 14990,
      reveniu_plan_id: '9604', // ✅ ID del Plan Piloto en Reveniu sandbox
      reveniu_checkout_link: 'https://sandbox.reveniu.com/checkout-custom-link/pk2JYEwJVEDUT5vXiFy4M6B9UNwjKxSD', // Link de Reveniu sandbox
      description: 'Ideal para: Pilotos individuales que buscan mostrar su experiencia certificada',
      features: [
        'Todo lo del Plan Gratis',
        'Sello digital "Perfil Certificado" tras validación',
        'Subida ilimitada de certificados (PDF)',
        'Bitácora de vuelos y registro de horas acumuladas',
        'URL personalizada para tu perfil',
        'Perfil destacado en búsquedas',
        'Datos meteorológicos geolocalizados',
        'Horarios de amanecer/atardecer para fotogrametría',
        'Soporte por correo electrónico'
      ]
    },
    {
      id: 'empresa',
      name: 'Plan Empresa',
      price: 39990,
      reveniu_plan_id: '9934', // ✅ ID del Plan Empresa en Reveniu sandbox
      reveniu_checkout_link: 'https://sandbox.reveniu.com/checkout-custom-link/faD3XBeyoHUNvsd9zOv4XJuGrv0ugdCG', // Link de Reveniu sandbox para Plan Empresa
      description: 'Ideal para: Publicar Empresas para realizar servicios especializados con drones',
      features: [
        'Todo lo del Plan Pro',
        'Panel multiusuario (hasta 4 pilotos)',
        'Sello digital "Empresa Certificada" tras validación',
        'Perfil destacado en "Empresas Recomendadas"',
        'Estadísticas de vistas y contacto de clientes',
        'Descuentos en asesoría de drones',
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

      // ====== LÓGICA PRIORIZADA: PILOTO DE EMPRESA ======
      // PRIMERO verificamos si el usuario pertenece a una empresa
      // Si es así, FORZAMOS que tenga Plan Pro, independientemente de lo que diga la DB

      console.log('🔍 Verificando si usuario es piloto de empresa...', user.id);
      const { data: pilotCompanyData, error: companyError } = await supabase
        .from('company_pilots')
        .select('company_id')
        .eq('pilot_id', user.id)
        .maybeSingle();

      console.log('📊 Resultado company_pilots:', { pilotCompanyData, companyError });

      if (pilotCompanyData?.company_id) {
        console.log('✅ ES PILOTO DE EMPRESA. Company ID:', pilotCompanyData.company_id);

        // ES PILOTO DE EMPRESA - Cargar nombre de empresa
        const { data: companyProfile } = await supabase
          .from('profiles')
          .select('company_name, full_name')
          .eq('id', pilotCompanyData.company_id)
          .single();

        const companyName = companyProfile?.company_name || companyProfile?.full_name || 'la empresa';
        console.log('🏢 Nombre de empresa:', companyName);
        setSponsoringCompany(companyName);

        // Verificar si su plan actual NO es Pro
        if (!subscription || subscription.plan_name !== 'pro' || !subscription.payment_method?.includes('company')) {
          console.log('⚠️ Piloto de empresa sin plan Pro correcto. Restaurando...');

          // Llamar a Edge Function para forzar el plan Pro
          const { data: restoreData } = await supabase.functions.invoke('send-invitation-email', {
            body: { action: 'restore_pro_subscription' }
          });

          if (restoreData?.success) {
            toast({
              title: "Plan actualizado",
              description: `Tu Plan Pro de ${companyName} ha sido activado.`,
            });
            // Recargar para obtener el estado actualizado
            loadMembership();
            return; // Salir para evitar continuar con el estado antiguo
          }
        }

        // El usuario tiene Pro correcto, mostrar el estado empresarial
        console.log('✅ Seteando membership como empresa');
        setMembership({
          plan_name: 'Plan Pro',
          price: 0,
          status: 'active',
          renewal_date: subscription?.renewal_date || null,
          payment_method: 'company_sponsored',
          features: defaultPlans.find(p => p.id === 'profesional')?.features || [],
          reveniu_subscription_id: (subscription as any)?.reveniu_subscription_id || null
        });

      } else {
        console.log('❌ NO es piloto de empresa');
        // NO es piloto de empresa - Lógica normal
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

      // Si el plan tiene un link de checkout de Reveniu, usar la API para crear la suscripción
      if (selectedPlan?.reveniu_checkout_link) {
        setSubscribing(planId);

        // Obtener email y nombre del usuario
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
          setSubscribing(null);
          return;
        }

        // Verificar que el plan tenga un ID de Reveniu configurado
        const reveniuPlanId = selectedPlan.reveniu_plan_id;
        if (!reveniuPlanId) {
          toast({
            title: "Error de configuración",
            description: "El plan no tiene un ID de Reveniu configurado. Contacta al administrador.",
            variant: "destructive",
          });
          setSubscribing(null);
          return;
        }

        try {
          // Crear suscripción usando la API de Reveniu con external_id
          console.log('Creating Reveniu subscription with:', {
            plan_id: reveniuPlanId,
            external_id: user.id,
            email: profile.email
          });

          const subscriptionResponse = await createReveniuSubscription({
            plan_id: reveniuPlanId,
            external_id: user.id,  // ✅ Este es el campo clave que permite identificar al usuario
            field_values: {
              email: profile.email,
              name: profile.full_name || undefined,
            }
          });

          console.log('Reveniu API response:', subscriptionResponse);

          // Reveniu retorna completion_url para redirigir al checkout
          const checkoutUrl = subscriptionResponse.completion_url || subscriptionResponse.link || subscriptionResponse.checkout_url;

          if (checkoutUrl) {
            // Redirigir al checkout de Reveniu
            window.location.href = checkoutUrl;
          } else {
            throw new Error('No se recibió URL de checkout de Reveniu. Respuesta: ' + JSON.stringify(subscriptionResponse));
          }
        } catch (error: any) {
          console.error('Error creating Reveniu subscription:', error);
          toast({
            title: "Error al crear suscripción",
            description: error.message || "No se pudo crear la suscripción con Reveniu. Intenta nuevamente.",
            variant: "destructive",
          });
          setSubscribing(null);
        }
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

  const handleConfirmSubscribe = async () => {
    setShowEmailWarning(false);
    const selectedPlan = availablePlans.find(p => p.id === pendingPlanId);
    if (selectedPlan?.reveniu_checkout_link) {
      // Obtener el user_id para enviarlo como external_id a Reveniu
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Agregar el user_id como parámetro external_id en la URL
        const checkoutUrl = `${selectedPlan.reveniu_checkout_link}?external_id=${user.id}`;
        window.location.href = checkoutUrl;
      } else {
        // Si no hay usuario, redirigir sin external_id (fallback)
        window.location.href = selectedPlan.reveniu_checkout_link;
      }
    }
    setPendingPlanId(null);
    setPendingFlowPlanId(undefined);
  };

  const handleCancelSubscription = async () => {
    if (!membership?.reveniu_subscription_id) {
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

      // Cancelar suscripción en Reveniu
      await cancelReveniuSubscription(membership.reveniu_subscription_id);

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

                {/* Botón de cancelar suscripción - solo si está activa y tiene flow_subscription_id o reveniu_subscription_id */}
                {membership.status === 'active' && (membership.flow_subscription_id || membership.reveniu_subscription_id) && (
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

        {/* Available Plans or Sponsored Message */}
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
                    Si la empresa cancela su suscripción, tu cuenta volverá automáticamente al Plan Gratis y podrás elegir suscribirte individualmente.
                  </p>
                </div>
              </CardContent>
            </div>
          </Card>
        ) : (
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
                      className={`border-2 rounded-2xl p-6 bg-[#2C2C2C] border-[#333333] ${plan.id === 'profesional'
                        ? 'border-blue-500/30'
                        : 'border-purple-500/30'
                        }`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-xl font-bold text-[#E0E0E0]">{plan.name}</h4>
                        {isCurrentPlan && (
                          <div className={`px-3 py-1 text-white rounded-full text-sm font-semibold ${plan.id === 'profesional' ? 'bg-blue-500' : 'bg-purple-500'
                            }`}>
                            Actual
                          </div>
                        )}
                      </div>
                      <p className={`text-3xl font-bold bg-clip-text text-transparent mb-2 ${plan.id === 'profesional'
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600'
                        : 'bg-gradient-to-r from-purple-600 to-pink-600'
                        }`}>
                        {formatPrice(plan.price)}
                      </p>
                      <p className="text-[#B0B0B0] font-medium mb-4">{plan.description}</p>
                      <ul className="text-[#E0E0E0] space-y-2 mb-4">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="flex items-center gap-3">
                            <div className={`h-2 w-2 rounded-full ${plan.id === 'profesional' ? 'bg-blue-500' : 'bg-purple-500'
                              }`}></div>
                            {feature}
                          </li>
                        ))}
                      </ul>
                      {!isCurrentPlan && (
                        <>
                          {membership && membership.status === 'active' && membership.plan_name !== 'Plan Gratis' ? (
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
                              className={`w-full mt-4 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 ${plan.id === 'profesional'
                                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                : 'bg-[#FF69B4] hover:bg-[#FF69B4]/90 text-white'
                                }`}
                              onClick={() => handleSubscribe(plan.id, plan.flow_plan_id)}
                              disabled={isSubscribing || (membership && membership.status === 'active' && membership.plan_name !== 'Plan Gratis')}
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
        )}

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

