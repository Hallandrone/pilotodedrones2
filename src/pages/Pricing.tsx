import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  Crown,
  Building2,
  Zap,
  Shield,
  Users,
  BarChart3,
  HeadphonesIcon,
  QrCode,
  FileCheck,
  Globe,
  Star,
  ArrowRight,
  Home,
  Plane
} from "lucide-react";
import Logo from "@/components/ui/logo";

const Pricing = () => {
  const navigate = useNavigate();

  const plans = [
    {
      id: 'free',
      name: 'Plan Gratis',
      price: 0,
      description: 'Perfecto para comenzar y probar la plataforma',
      popular: false,
      features: [
        'Perfil público profesional',
        'Código QR personalizado para compartir perfil',
        'Panel de control intuitivo',
        'Aparición en búsquedas de servicios'
      ],
      icon: Plane,
      color: 'from-gray-400 to-gray-500'
    },
    {
      id: 'profesional',
      name: 'Plan Pro',
      price: 14990,
      description: 'Ideal para pilotos individuales que buscan destacar su experiencia certificada',
      popular: true,
      features: [
        'Todo lo del Plan Gratis',
        'Sello digital "Perfil Certificado"',
        'Subida ilimitada de certificados',
        'Bitácora de vuelos y horas acumuladas',
        'URL personalizada para tu perfil',
        'Perfil destacado en búsquedas',
        'Datos meteorológicos geolocalizados',
        'Horarios de amanecer/atardecer para fotogrametría',
        'Soporte por whatsapp'
      ],
      icon: Plane,
      color: 'from-blue-500 to-cyan-500'
    },
    {
      id: 'empresa',
      name: 'Plan Empresa',
      price: 39990,
      description: 'Solución completa para empresas que ofrecen servicios con drones',
      popular: false,
      features: [
        'Todo lo del Plan Pro',
        'Panel multiusuario (hasta 4 pilotos)',
        'Sello digital "Empresa Certificada"',
        'Perfil destacado en recomendaciones',
        'Gestión de múltiples certificaciones',
        'Soporte prioritario por WhatsApp'
      ],
      icon: Building2,
      color: 'from-purple-500 to-pink-500'
    }
  ];

  const benefits = [
    {
      icon: FileCheck,
      title: 'Certificaciones Verificadas',
      description: 'Sistema de validación por administradores para garantizar autenticidad'
    },
    {
      icon: Zap,
      title: 'Visibilidad Aumentada',
      description: 'Aparece en búsquedas y resultados destacados para más clientes'
    },
    {
      icon: QrCode,
      title: 'QR Personalizado',
      description: 'Comparte tu perfil profesional de forma rápida y moderna'
    },
    {
      icon: Globe,
      title: 'URL Personalizada',
      description: 'Crea tu propia dirección web fácil de recordar y compartir'
    },
    {
      icon: BarChart3,
      title: 'Estadísticas Detalladas',
      description: 'Conoce cuántas personas visitan tu perfil y te contactan'
    },
    {
      icon: HeadphonesIcon,
      title: 'Soporte Dedicado',
      description: 'Atención personalizada para resolver tus dudas rápidamente'
    }
  ];

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(price);
  };

  const handleRegister = (planId: string) => {
    navigate('/auth', { state: { plan: planId } });
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm shadow-sm sticky top-0 z-50 w-full">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-3 sm:py-5">
          <div className="flex items-center justify-between gap-2 sm:gap-4 w-full max-w-7xl mx-auto">
            <Logo size="md" className="sm:scale-125 hover:scale-110 sm:hover:scale-[1.3] transition-transform duration-200 flex-shrink-0" />

            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className="h-9 px-2 sm:px-4 hover:bg-accent/10 transition-all duration-200"
              >
                <Home className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Home</span>
              </Button>
              <Button
                size="sm"
                className="h-9 px-3 sm:px-4 bg-accent hover:bg-accent/90 text-accent-foreground transition-all duration-200 text-sm sm:text-base"
                onClick={() => navigate('/auth')}
              >
                Registrarse
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1">
        {/* Hero Section */}
        <motion.section
          className="py-16 lg:py-24 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, type: "tween", ease: "easeOut" }}
        >
          <div className="max-w-4xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, type: "tween", ease: "easeOut" }}
            >
              <Badge className="mb-4 bg-accent/10 text-accent border-accent/20">
                <Crown className="h-3 w-3 mr-1" />
                Planes de Suscripción
              </Badge>
              <h1 className="text-4xl md:text-6xl font-bold text-primary mb-6">
                Elige el Plan Perfecto para Ti
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                Potencia tu presencia profesional con nuestras herramientas diseñadas para pilotos y empresas
              </p>
            </motion.div>
          </div>
        </motion.section>

        {/* Pricing Cards */}
        <section className="py-12 lg:py-20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">{plans.map((plan, index) => {
              const Icon = plan.icon;
              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{
                    duration: 0.6,
                    delay: index * 0.1,
                    type: "tween",
                    ease: "easeOut"
                  }}
                >
                  <Card
                    className={`relative overflow-hidden border-2 transition-all duration-300 hover:shadow-2xl ${plan.popular
                      ? 'border-accent shadow-xl scale-105'
                      : 'border-border hover:border-accent/50'
                      }`}
                  >
                    {plan.popular && (
                      <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1 text-sm font-semibold rounded-bl-lg">
                        <Star className="h-3 w-3 inline mr-1" />
                        Más Popular
                      </div>
                    )}

                    <CardHeader className="pb-4">
                      <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${plan.color} mb-4`}>
                        <Icon className="h-8 w-8 text-white" />
                      </div>
                      <CardTitle className="text-2xl font-bold text-primary mb-2">
                        {plan.name}
                      </CardTitle>
                      <CardDescription className="text-base">
                        {plan.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6">
                      <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-bold text-primary">
                          {formatPrice(plan.price)}
                        </span>
                        <span className="text-muted-foreground">/mes</span>
                      </div>

                      <ul className="space-y-3">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-0.5">
                              <Check className="h-5 w-5 text-accent" />
                            </div>
                            <span className="text-muted-foreground">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <Button
                        className={`w-full h-12 text-base font-semibold transition-all duration-300 ${plan.popular
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl'
                          : 'bg-accent hover:bg-accent/90 text-accent-foreground'
                          }`}
                        onClick={() => handleRegister(plan.id)}
                      >
                        Comenzar Ahora
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>

                      <p className="text-xs text-center text-muted-foreground">
                        Sin compromiso. Cancela cuando quieras.
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-16 lg:py-24 bg-gradient-to-br from-accent/5 via-white to-secondary/10">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              className="text-center mb-16"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, type: "tween", ease: "easeOut" }}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
                Beneficios Incluidos en Todos los Planes
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Herramientas profesionales diseñadas para hacer crecer tu negocio
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{
                      duration: 0.5,
                      delay: index * 0.1,
                      type: "tween",
                      ease: "easeOut"
                    }}
                  >
                    <Card className="h-full hover:shadow-lg transition-all duration-300 border-border/50 hover:border-accent/50">
                      <CardContent className="p-6">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent/10 mb-4">
                          <Icon className="h-6 w-6 text-accent" />
                        </div>
                        <h3 className="text-lg font-semibold text-primary mb-2">
                          {benefit.title}
                        </h3>
                        <p className="text-muted-foreground text-sm">
                          {benefit.description}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 lg:py-24">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, type: "tween", ease: "easeOut" }}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
                ¿Listo para Comenzar?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Únete a nuestra comunidad de pilotos profesionales y empresas certificadas
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  className="bg-accent hover:bg-accent/90 text-accent-foreground text-base px-8"
                  onClick={() => navigate('/auth')}
                >
                  Crear Cuenta Gratis
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="text-base px-8"
                  onClick={() => navigate('/search')}
                >
                  Ver Pilotos Disponibles
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="mt-auto py-12 border-t-2 border-border bg-card/50 backdrop-blur-sm w-full">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
              {/* Logo y nombre */}
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <Logo size="sm" showText={false} />
                <span className="text-lg font-semibold text-foreground">
                  Piloto de Drones
                </span>
              </div>

              {/* Copyright */}
              <p className="text-sm text-foreground/70">
                © {new Date().getFullYear()} Piloto de Drones. Todos los derechos reservados.
              </p>

              {/* Enlaces mínimos */}
              <div className="flex items-center gap-4 text-sm text-foreground/80 flex-wrap justify-center">
                <button
                  onClick={() => navigate('/auth')}
                  className="hover:text-foreground transition-colors font-medium"
                >
                  Iniciar Sesión
                </button>
                <span className="text-foreground/30">•</span>
                <button
                  onClick={() => navigate('/search')}
                  className="hover:text-foreground transition-colors font-medium"
                >
                  Buscar Pilotos
                </button>
                <span className="text-foreground/30">•</span>
                <button
                  onClick={() => navigate('/terms')}
                  className="hover:text-foreground transition-colors font-medium"
                >
                  Términos y Condiciones
                </button>
                <span className="text-foreground/30">•</span>
                <button
                  onClick={() => navigate('/privacy')}
                  className="hover:text-foreground transition-colors font-medium"
                >
                  Política de Privacidad
                </button>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Pricing;

