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
  Loader2,
  RefreshCw,
  Info,
  Zap,
  Shield
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { createPreference, processPayment } from "@/integrations/mercadopago/client";
import { getBaseUrl } from "@/lib/getBaseUrl";
import Logo from "@/components/ui/logo";

// Declaración para el SDK de Mercado Pago
declare global {
  interface Window {
    MercadoPago: any;
  }
}

interface Membership {
  plan_name: string;
  status: 'active' | 'pending' | 'expired' | 'cancelled' | 'inactive' | 'pending_payment';
  renewal_date: string | null;
  created_at: string | null;
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
  const [sponsoringCompany, setSponsoringCompany] = useState<string | null>(null);
  const [showBricks, setShowBricks] = useState(false);
  const [selectedPlanForBrick, setSelectedPlanForBrick] = useState<AvailablePlan | null>(null);
  const [paymentMode, setPaymentMode] = useState<'subscription' | 'single' | null>(null);
  const [bricksController, setBricksController] = useState<any>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Planes actualizados para Mercado Pago
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
        'Soporte por Whatsapp'
      ]
    },
    {
      id: 'empresa',
      name: 'Plan Empresa',
      price: 39990,
      description: 'Ideal para: Publicar Empresas para realizar servicios especializados con drones',
      features: [
        'Todo lo del Plan Pro',
        'Panel multiusuario (hasta 4 pilotos)',
        'Agrega hasta 4 pilotos con Plan PRO incluido',
        'Sello digital "Empresa Certificada" tras validación',
        'Perfil destacado en "Empresas Recomendadas"',
        'Estadísticas de vistas y contacto de clientes',
        'Descuentos en asesoría de drones',
        'Soporte técnico prioritario WhatsApp'
      ]
    }
  ];

  useEffect(() => {
    // Inyectar SDK de Mercado Pago
    const script = document.createElement('script');
    script.src = 'https://sdk.mercadopago.com/js/v2';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    loadMembership();
    checkUserType();

    // SUSCRIPCIÓN EN TIEMPO REAL: Para activación inmediata cuando el webhook o la API actualizan la DB
    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
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
            loadMembership();
            const newStatus = (payload.new as any)?.status;
            if (newStatus === 'active') {
              toast({
                title: "¡Suscripción Activada!",
                description: "Tu pago fue aprobado y el plan ya está activo.",
              });
            } else if (newStatus === 'pending_payment') {
              toast({
                title: "Pago en proceso",
                description: "Estamos esperando la confirmación de Mercado Pago.",
              });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupRealtime();

    const urlParams = new URLSearchParams(window.location.search);
    const preapprovalId = urlParams.get('preapproval_id');
    const success = urlParams.get('success');

    if (preapprovalId && success === 'true') {
      toast({
        title: "¡Pago recibido!",
        description: "Activando tu plan ahora mismo...",
      });
      setLoading(true);
      supabase.functions.invoke('mercadopago-api', {
        body: { action: 'verify_subscription', preapproval_id: preapprovalId }
      }).then(async () => {
        window.history.replaceState({}, '', window.location.pathname);
        await loadMembership();
        setLoading(false);
      });
    }
  }, []);

  // Filtrar planes según el tipo de usuario Y aplicar precio de prueba
  useEffect(() => {
    const applyTestPricing = async () => {
      // Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser();

      let filteredPlans: AvailablePlan[] = [];

      if (userType === 'company') {
        // Si es empresa, solo mostrar Plan Empresa
        filteredPlans = defaultPlans.filter(p => p.id === 'empresa');
      } else {
        // Si es piloto (o no se ha determinado), solo mostrar Plan Profesional
        filteredPlans = defaultPlans.filter(p => p.id === 'profesional');
      }

      // 🧪 PRECIO DE PRUEBA: Si es qrescueid@gmail.com, cambiar precio a $1,500
      if (user?.email === 'qrescueid@gmail.com') {
        filteredPlans = filteredPlans.map(plan => ({
          ...plan,
          price: 1500 // Precio de prueba
        }));
        console.log('🧪 Test mode: Prices adjusted to $1,500 for qrescueid@gmail.com');
      }

      setAvailablePlans(filteredPlans);
    };

    applyTestPricing();
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

      // Cargar suscripción desde Supabase (Verificar si está activa o recientemente cancelada)
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
        // Mapear plan_name de BD a detalles del plan
        // BD usa: 'basic', 'pro', 'premium'
        // Frontend usa: 'profesional', 'empresa'
        const planDetails = defaultPlans.find(p => {
          if (subscription.plan_name === 'pro' || subscription.plan_name === 'profesional') return p.id === 'profesional';
          if (subscription.plan_name === 'premium' || subscription.plan_name === 'empresa') return p.id === 'empresa';
          if (subscription.plan_name === 'basic') return p.id === 'profesional';
          return p.id === subscription.plan_name;
        });

        // Solo seteamos membresía si es un plan de pago (pro o empresa)
        if (planDetails && planDetails.id !== 'free') {
          // Cast para acceder a propiedades que pueden no estar en el tipo
          const subscriptionWithExtras = subscription as any;

          setMembership({
            plan_name: planDetails.name,
            status: subscription.status as any,
            renewal_date: subscription.renewal_date,
            created_at: subscription.created_at,
            payment_method: subscription.payment_method,
            price: planDetails.price,
            features: planDetails.features,
            reveniu_subscription_id: subscriptionWithExtras.reveniu_subscription_id || null,
            flow_subscription_id: subscriptionWithExtras.flow_subscription_id || null,
            flow_plan_id: subscriptionWithExtras.flow_plan_id || null
          });
        } else {
          setMembership(null);
        }
      } else {
        // Usuario sin suscripción
        setMembership(null);
      }

      // ====== LÓGICA PRIORIZADA: PILOTO DE EMPRESA ======
      // PRIMERO verificamos si el usuario pertenece a una empresa
      // Si es así, FORZAMOS que tenga Plan Pro, independientemente de lo que diga la DB

      console.log('🔍 Verificando si usuario es piloto de empresa...', user.id);

      // Primero obtener el ID del piloto en la tabla pilots
      const { data: pilotData } = await supabase
        .from('pilots')
        .select('id')
        .eq('user_id', user.id)
        .single();

      console.log('👤 Pilot record:', pilotData);

      let pilotCompanyData = null;
      let companyError = null;

      if (pilotData?.id) {
        // Ahora sí buscar en company_pilots usando el pilot.id correcto
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

        // ES PILOTO DE EMPRESA - Cargar nombre de empresa
        const { data: companyData } = await supabase
          .from('companies')
          .select('company_name')
          .eq('id', pilotCompanyData.company_id)
          .single();

        const companyName = (companyData as any)?.company_name || 'la empresa';
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
          created_at: subscription?.created_at || null,
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

  const handleSubscribe = async (planId: string) => {
    try {
      setSubscribing(planId);
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
          description: `Actualmente tienes el plan ${membership.plan_name} activo.`,
          variant: "default",
        });
        return;
      }

      const selectedPlan = availablePlans.find(p => p.id === planId);
      if (!selectedPlan) return;

      // Determinar precio (con filtro de prueba)
      let finalPrice = selectedPlan.price;
      if (user.email === 'qrescueid@gmail.com') {
        finalPrice = 1500;
        console.log('🧪 Test mode: Price reduced to $1,500 for qrescueid@gmail.com');
      }

      toast({
        title: "Redirigiendo a Mercado Pago",
        description: "Serás redirigido para completar tu pago de forma segura e inmediata.",
      });

      // Llamar a create_subscription (sin cardTokenId para forzar redirección)
      const { data, error } = await supabase.functions.invoke('mercadopago-api', {
        body: {
          action: 'create_subscription',
          planId: selectedPlan.id,
          price: finalPrice,
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      console.log("Subscription created (Redirect Flow):", data);

      if (data.init_point) {
        // REDIRECCIÓN: Es la forma más rápida y segura de que se procese el pago altiro
        window.location.href = data.init_point;
      } else {
        throw new Error("No se recibió URL de pago");
      }

    } catch (error: any) {
      console.error('Error creating subscription:', error);
      toast({
        title: "Error al crear suscripción",
        description: error.message || "No se pudo crear la suscripción. Intenta nuevamente.",
        variant: "destructive",
      });
      setSubscribing(null);
    }
  };

  const handleConfirmSubscribe = async () => {
    setShowEmailWarning(false);
    if (pendingPlanId) {
      handleSubscribe(pendingPlanId);
    }
    setPendingPlanId(null);
  };

  const initBricks = async (plan: AvailablePlan, mode: 'subscription' | 'single') => {
    if (!window.MercadoPago) {
      console.error("Mercado Pago SDK not loaded");
      return;
    }

    const mp = new window.MercadoPago(import.meta.env.VITE_MERCADOPAGO_PUBLISHABLE_KEY || 'APP_USR-08ad2fd4-0eb3-4231-89e0-76c03c3bff5c', {
      locale: 'es-CL'
    });
    const bricksBuilder = mp.bricks();

    const { data: { user } } = await supabase.auth.getUser();

    const renderPaymentBrick = async (builder: any) => {
      const settings = {
        initialization: {
          amount: plan.price,
          payer: {
            email: user?.email,
          },
        },
        customization: {
          paymentMethods: {
            ticket: mode === 'single' ? "all" : undefined,
            bankTransfer: mode === 'single' ? "all" : undefined,
            creditCard: "all",
            debitCard: mode === 'single' ? "all" : undefined,
            mercadoPago: mode === 'single' ? "all" : undefined,
          },
        },
        callbacks: {
          onReady: () => {
            console.log("Brick ready");
          },
          onSubmit: ({ selectedPaymentMethod, formData }: any) => {
            return new Promise((resolve, reject) => {
              console.log("Submitting payment...", selectedPaymentMethod);
              setSubscribing(plan.id);

              const action = (mode === 'subscription' && (selectedPaymentMethod === 'credit_card' || selectedPaymentMethod === 'debit_card'))
                ? 'create_subscription'
                : 'process_payment';

              const body: any = {
                action,
                planId: plan.id,
                price: plan.price,
                payerEmail: formData.payer.email
              };

              if (action === 'create_subscription') {
                body.cardTokenId = formData.token;
              } else {
                body.formData = formData;
              }

              supabase.functions.invoke('mercadopago-api', { body })
                .then(({ data, error }) => {
                  if (error || data.error || !data.success) {
                    const status = data?.status;
                    let errorMsg = data?.message || error?.message || "Revisa tus datos e intenta nuevamente";

                    if (status === 'rejected') {
                      errorMsg = "Pago rechazado. Por favor usa otro medio de pago.";
                    }

                    toast({
                      title: "Error en el pago",
                      description: errorMsg,
                      variant: "destructive"
                    });
                    reject();
                  } else {
                    toast({
                      title: "¡Solicitud Procesada!",
                      description: mode === 'subscription'
                        ? "Tu suscripción ha sido creada. Se activará en cuanto se confirme el primer pago."
                        : "Tu pago está siendo procesado por Mercado Pago.",
                    });
                    setShowBricks(false);
                    resolve(data);
                  }
                })
                .catch((err) => {
                  console.error("Payment error:", err);
                  reject();
                })
                .finally(() => setSubscribing(null));
            });
          },
          onError: (error: any) => {
            console.error("Brick error:", error);
            toast({
              title: "Error",
              description: "Hubo un problema al cargar el formulario de pago",
              variant: "destructive"
            });
          },
        },
      };
      const controller = await builder.create("payment", "cardPaymentBrick_container", settings);
      setBricksController(controller);
    };

    renderPaymentBrick(bricksBuilder);
  };

  useEffect(() => {
    let interval: any;

    if (showBricks && selectedPlanForBrick && paymentMode) {
      // Función para verificar si el contenedor existe y es visible
      const checkAndInit = () => {
        const container = document.getElementById("cardPaymentBrick_container");
        if (container) {
          console.log("Container found, initializing brick for mode:", paymentMode);
          clearInterval(interval);
          initBricks(selectedPlanForBrick, paymentMode);
        }
      };

      let attempts = 0;
      interval = setInterval(() => {
        attempts++;
        checkAndInit();
        if (attempts > 30) {
          console.error("Brick container never became visible");
          clearInterval(interval);
        }
      }, 150);
    } else if (!showBricks && bricksController) {
      console.log("Unmounting brick controller...");
      try {
        bricksController.unmount();
      } catch (e) {
        console.warn("Unmount error (expected if already unmounted):", e);
      }
      setBricksController(null);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showBricks, selectedPlanForBrick, paymentMode]);

  const handleSubscribeRequest = (planId: string) => {
    const plan = availablePlans.find(p => p.id === planId);
    if (!plan) return;

    // Resetear controlador previo si existe (para seguridad adicional)
    if (bricksController) {
      try { bricksController.unmount(); } catch (e) { }
      setBricksController(null);
    }

    setSelectedPlanForBrick(plan);
    setShowBricks(true);
  };

  const handleCancelSubscription = async () => {
    try {
      setSubscribing('cancelling');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // LLAMAR AL BACKEND PARA CANCELAR EN MERCADO PAGO
      if (membership?.reveniu_subscription_id) {
        const { error: mpError } = await supabase.functions.invoke('mercadopago-api', {
          body: {
            action: 'cancel_subscription',
            preapprovalId: membership.reveniu_subscription_id
          }
        });
        if (mpError) {
          console.error("Error cancelling in MP:", mpError);
          // Continuamos de todas formas para marcar como cancelado en la BD
        }
      }

      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Suscripción cancelada",
        description: "Tu plan se ha cancelado. Seguirás teniendo acceso Pro/Empresa hasta que termine tu periodo actual.",
      });

      loadMembership();
    } catch (error: any) {
      console.error('Error cancelling subscription:', error);
      toast({
        title: "Error",
        description: "No se pudo cancelar la suscripción. Por favor contacta a soporte.",
        variant: "destructive",
      });
    } finally {
      setSubscribing(null);
    }
  };

  const handleResumeSubscription = async () => {
    try {
      setSubscribing('resuming');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Suscripción reanudada",
        description: "Tu plan se ha reactivado. Se cobrará en la fecha de renovación correspondiente.",
      });

      loadMembership();
    } catch (error: any) {
      console.error('Error resuming subscription:', error);
      toast({
        title: "Error",
        description: "No se pudo reanudar la suscripción. Por favor contacta a soporte.",
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
      <div className="bg-white/95 backdrop-blur-xl border-b border-gray-200 shadow-2xl sticky top-0 z-50">
        <div className="px-4 py-4 sm:py-6">
          <div className="flex items-center gap-4 max-w-7xl mx-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const isCompany = location.pathname.includes('/company') || userType === 'company';
                navigate(isCompany ? '/company' : '/pilot');
              }}
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
                  {sponsoringCompany ? (
                    <p className="text-lg text-blue-400 font-semibold">
                      Patrocinado por {sponsoringCompany}
                    </p>
                  ) : (
                    <>
                      <p className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        {formatPrice(membership.price)}
                      </p>
                      <p className="text-[#B0B0B0] font-medium">por mes</p>
                    </>
                  )}
                </div>

                <div className="space-y-4">
                  {membership.created_at && (
                    <div className="flex items-center justify-between p-3 bg-[#2C2C2C] border border-[#333333] rounded-xl">
                      <span className="text-[#B0B0B0] font-medium">Suscrito el</span>
                      <span className="text-[#E0E0E0] font-semibold text-sm">
                        {formatDate(membership.created_at)}
                      </span>
                    </div>
                  )}
                  {membership.status === 'active' && membership.renewal_date && (
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                      <Calendar className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="text-sm text-[#A0A0A0]">Próxima renovación</p>
                        <p className="text-[#E0E0E0] font-medium">{formatDate(membership.renewal_date)}</p>
                      </div>
                    </div>
                  )}

                  {membership.status === 'pending_payment' && (
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                      <Loader2 className="h-5 w-5 text-yellow-500 animate-spin" />
                      <div>
                        <p className="text-sm text-yellow-500 font-medium">Validando Pago</p>
                        <p className="text-xs text-[#A0A0A0]">Tu plan se activará automáticamente al confirmarse el cobro.</p>
                      </div>
                    </div>
                  )}
                  {membership.renewal_date && (membership.status === 'active' || (membership.status === 'cancelled' && new Date(membership.renewal_date) > new Date())) && (
                    <div className="flex items-center justify-between p-3 bg-[#2C2C2C] border border-[#333333] rounded-xl">
                      <span className="text-[#B0B0B0] font-medium">
                        {membership.status === 'active' ? 'Próximo pago' : 'Tu plan termina el'}
                      </span>
                      <span className={`${membership.status === 'active' ? 'text-purple-400' : 'text-amber-400'} font-bold text-sm`}>
                        {formatDate(membership.renewal_date)}
                      </span>
                    </div>
                  )}
                  {membership.payment_method && (
                    <div className="flex items-center justify-between p-3 bg-[#2C2C2C] border border-[#333333] rounded-xl">
                      <span className="text-[#B0B0B0] font-medium">Método de pago</span>
                      <span className="text-[#E0E0E0] font-semibold">
                        {membership.payment_method === 'company_sponsored' ? 'Patrocinado' : membership.payment_method}
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

                {/* Botón de cancelar suscripción - Visible para suscripciones activas */}
                {membership.status === 'active' && membership.plan_name !== 'Plan Gratis' && !sponsoringCompany && (
                  <div className="pt-4 border-t border-[#333333]">
                    <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                      <Button
                        variant="destructive"
                        onClick={() => setShowCancelDialog(true)}
                        disabled={subscribing === 'cancelling'}
                        className="w-full bg-red-600/10 border border-red-600/30 text-red-500 hover:bg-red-600 hover:text-white transition-all duration-200"
                      >
                        {subscribing === 'cancelling' ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Procesando...
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-4 w-4 mr-2" />
                            Cancelar Plan
                          </>
                        )}
                      </Button>

                      <DialogContent className="bg-[#212121] border border-[#333333] text-white max-w-sm sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <AlertCircle className="h-6 w-6 text-red-500" />
                            ¿Cancelar suscripción?
                          </DialogTitle>
                          <DialogDescription className="text-gray-400 py-4 text-base">
                            Tu suscripción {membership.plan_name} dejará de renovarse automáticamente.
                            <br /><br />
                            Seguirás teniendo acceso a <span className="text-blue-400 font-bold">todas las características Pro</span> hasta el <span className="text-white font-bold">{membership.renewal_date ? formatDate(membership.renewal_date) : 'final de tu ciclo'}</span>.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="flex flex-col sm:flex-row gap-3">
                          <Button
                            variant="ghost"
                            onClick={() => setShowCancelDialog(false)}
                            className="text-gray-400 hover:text-white hover:bg-white/5"
                          >
                            Mantener Plan
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={async () => {
                              setShowCancelDialog(false);
                              await handleCancelSubscription();
                            }}
                            className="bg-red-600 hover:bg-red-700 font-bold"
                          >
                            Confirmar Cancelación
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <div className="mt-3 p-3 bg-blue-500/5 border border-blue-500/10 rounded-lg">
                      <p className="text-[11px] text-[#B0B0B0] text-center leading-tight">
                        Al cancelar, tu suscripción no se renovará automáticamente, pero <span className="text-blue-400 font-medium">mantendrás tus beneficios Pro</span> hasta que finalice tu ciclo actual de facturación.
                      </p>
                    </div>
                  </div>
                )}

                {/* Botón de reanudar suscripción - Visible para suscripciones canceladas pero aún vigentes */}
                {membership.status === 'cancelled' && membership.renewal_date && new Date(membership.renewal_date) > new Date() && !sponsoringCompany && (
                  <div className="pt-4 border-t border-[#333333]">
                    <Dialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
                      <Button
                        variant="outline"
                        onClick={() => setShowResumeDialog(true)}
                        disabled={subscribing === 'resuming'}
                        className="w-full bg-green-600/10 border border-green-600/30 text-green-500 hover:bg-green-600 hover:text-white transition-all duration-200"
                      >
                        {subscribing === 'resuming' ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Procesando...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Reanudar Suscripción
                          </>
                        )}
                      </Button>

                      <DialogContent className="bg-[#212121] border border-[#333333] text-white max-w-sm sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <CheckCircle className="h-6 w-6 text-green-500" />
                            Reanudar Suscripción Pro
                          </DialogTitle>
                          <DialogDescription className="text-gray-400 py-4 text-base">
                            Al reanudar, tu plan se activará de nuevo para renovarse automáticamente.
                            <br /><br />
                            <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-xl">
                              <p className="text-blue-200 text-sm">
                                <AlertCircle className="h-4 w-4 inline mr-2 text-blue-400" />
                                <strong>¡No se cobrará nada ahora!</strong>
                                <br /> Tu suscripción simplemente continuará y el próximo cobro será el día <span className="text-white font-bold">{formatDate(membership.renewal_date)}</span>.
                              </p>
                            </div>
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="flex flex-col sm:flex-row gap-3">
                          <Button
                            variant="ghost"
                            onClick={() => setShowResumeDialog(false)}
                            className="text-gray-400 hover:text-white hover:bg-white/5"
                          >
                            Mantener como está
                          </Button>
                          <Button
                            onClick={async () => {
                              setShowResumeDialog(false);
                              await handleResumeSubscription();
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold"
                          >
                            Reanudar Ahora
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
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
                {/* Informative message about email editing */}
                <Alert className="bg-blue-500/10 border-blue-500/30 text-blue-100">
                  <Info className="h-4 w-4 text-blue-400" />
                  <AlertTitle className="text-blue-200 font-semibold">Verificación de Email</AlertTitle>
                  <AlertDescription className="text-blue-300/90">
                    Si tu email de Mercado Pago es diferente al de esta plataforma, podrás modificarlo en la siguiente pantalla de pago.
                  </AlertDescription>
                </Alert>

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
                          {membership && (membership.status === 'active' || (membership.status === 'cancelled' && membership.renewal_date && new Date(membership.renewal_date) > new Date())) ? (
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
                              onClick={() => handleSubscribeRequest(plan.id)}
                              disabled={isSubscribing || (membership && (membership.status === 'active' || (membership.status === 'cancelled' && membership.renewal_date && new Date(membership.renewal_date) > new Date())))}
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

        {/* Dialog de Checkout Bricks (Card Payment) */}
        <Dialog open={showBricks} onOpenChange={(open) => {
          if (!open) {
            if (bricksController) {
              try { bricksController.unmount(); } catch (e) { }
              setBricksController(null);
            }
            setPaymentMode(null);
          }
          setShowBricks(open);
        }}>
          <DialogContent className="bg-white text-black max-w-md p-0 overflow-hidden rounded-2xl shadow-2xl border-0">
            <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <div className="flex justify-between items-center">
                <DialogHeader className="text-left">
                  <DialogTitle className="text-xl font-bold text-white">
                    {selectedPlanForBrick?.name.toLowerCase().includes('plan')
                      ? selectedPlanForBrick?.name
                      : `Plan ${selectedPlanForBrick?.name}`}
                  </DialogTitle>
                  <DialogDescription className="text-blue-100/70 text-sm">
                    Selecciona modalidad de pago
                  </DialogDescription>
                </DialogHeader>
                <div className="text-right">
                  <span className="text-2xl font-black">
                    {selectedPlanForBrick ? formatPrice(selectedPlanForBrick.price) : ''}
                  </span>
                  <p className="text-xs text-blue-100">/mes</p>
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50 flex flex-col gap-4">
              {!paymentMode ? (
                <>
                  <button
                    onClick={() => setPaymentMode('subscription')}
                    className="flex items-center gap-4 p-4 bg-white border-2 border-transparent hover:border-blue-500 rounded-2xl shadow-sm transition-all group"
                  >
                    <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <Zap className="h-6 w-6" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-gray-900">Suscripción Automática</p>
                      <p className="text-xs text-gray-500">Solo Tarjeta de Crédito. Renovación mensual.</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setPaymentMode('single')}
                    className="flex items-center gap-4 p-4 bg-white border-2 border-transparent hover:border-indigo-500 rounded-2xl shadow-sm transition-all group"
                  >
                    <div className="h-12 w-12 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <CreditCard className="h-6 w-6" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-gray-900">Pago Único (30 días)</p>
                      <p className="text-xs text-gray-500">Débito, Prepago u Otros. Sin renovación auto.</p>
                    </div>
                  </button>

                  <div className="mt-2 flex items-center gap-2 text-[10px] text-gray-400 justify-center uppercase tracking-widest font-semibold">
                    <Shield className="h-3 w-3" />
                    Pagos seguros vía Mercado Pago
                  </div>
                </>
              ) : (
                <div className="min-h-[400px] flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={() => {
                        if (bricksController) {
                          try { bricksController.unmount(); } catch (e) { }
                          setBricksController(null);
                        }
                        setPaymentMode(null);
                      }}
                      className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1"
                    >
                      ← Cambiar método
                    </button>
                    <Badge variant="outline" className="text-[10px] uppercase border-blue-200 text-blue-600">
                      {paymentMode === 'subscription' ? 'Suscripción' : 'Pago Único'}
                    </Badge>
                  </div>

                  {!bricksController && (
                    <div className="flex flex-col items-center justify-center flex-1 gap-2 text-gray-400">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                      <p className="text-sm font-medium">Iniciando pasarela segura...</p>
                    </div>
                  )}
                  <div id="cardPaymentBrick_container" className="w-full"></div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default PilotMembership;

