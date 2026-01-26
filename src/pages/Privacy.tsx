import { useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Shield } from "lucide-react";
import Logo from "@/components/ui/logo";

const Privacy = () => {
  const navigate = useNavigate();
  const titleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll al título cuando se carga la página
    if (titleRef.current) {
      const headerHeight = 80; // Altura aproximada del header sticky
      const titlePosition = titleRef.current.offsetTop - headerHeight;
      window.scrollTo({
        top: titlePosition,
        behavior: 'smooth'
      });
    }
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm shadow-sm sticky top-0 z-50 w-full">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-3 sm:py-5">
          <div className="flex items-center justify-between gap-4 w-full max-w-7xl mx-auto">
            <Logo size="xl" showText={false} className="hover:scale-105 transition-transform duration-200 flex-shrink-0 ml-4 sm:ml-12" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="hover:bg-accent/10 transition-all duration-200"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1">
        {/* Content */}
        <div className="max-w-4xl mx-auto px-6 lg:px-8 py-12 lg:py-16">
          <Card className="shadow-lg">
            <CardContent className="p-8 lg:p-12">
              <div ref={titleRef} className="flex items-center gap-3 mb-8 scroll-mt-20">
                <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h1 className="text-3xl lg:text-4xl font-bold text-primary">
                    Política de Privacidad
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    Pilotodedrones.cl
                  </p>
                </div>
              </div>

              <div className="prose prose-slate max-w-none space-y-8">
                <div className="bg-accent/5 border-l-4 border-accent p-4 rounded-r-lg">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Pilotodedrones.cl (RUT 77.188.923-9, Hallan Ahumada) protege tus datos personales conforme a Ley 21.719 (Protección de Datos Personales) y Ley 19.628, recolectando solo información esencial para publicar servicios de drones y gestionar suscripciones Reveniu. Datos sensibles (ubicación vuelos, bitácora horas) requieren consentimiento expreso. Contacto: contacto@pilotodedrones.cl.
                  </p>
                </div>

                <section>
                  <h2 className="text-2xl font-bold text-primary mb-4 mt-8">
                    1. Datos Recolectados
                  </h2>
                  <div className="space-y-3">
                    <div className="bg-card border border-border rounded-lg p-4">
                      <h3 className="font-semibold text-primary mb-2">Registro:</h3>
                      <p className="text-muted-foreground text-sm">
                        Nombre, RUT, email, foto, teléfono (opcional WhatsApp soporte Pro).
                      </p>
                    </div>
                    <div className="bg-card border border-border rounded-lg p-4">
                      <h3 className="font-semibold text-primary mb-2">Perfil/Profesional:</h3>
                      <p className="text-muted-foreground text-sm">
                        Certificados PDF DGAC, bitácora vuelos/horas, zonas operación, tipos trabajos.
                      </p>
                    </div>
                    <div className="bg-card border border-border rounded-lg p-4">
                      <h3 className="font-semibold text-primary mb-2">Suscripciones:</h3>
                      <p className="text-muted-foreground text-sm">
                        Datos pago (Reveniu: tarjeta/token), estadísticas vistas/contactos (Plan Empresa).
                      </p>
                    </div>
                    <div className="bg-card border border-border rounded-lg p-4">
                      <h3 className="font-semibold text-primary mb-2">Técnicos:</h3>
                      <p className="text-muted-foreground text-sm">
                        IP, dispositivo, cookies (Google Analytics opcional), logs acceso.
                      </p>
                    </div>
                    <p className="text-muted-foreground text-sm mt-4">
                      No recolectamos datos biométricos ni financieros directos (Reveniu los maneja).
                    </p>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-primary mb-4 mt-8">
                    2. Finalidad del Tratamiento
                  </h2>
                  <ul className="space-y-3 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-1">•</span>
                      <span>Validar perfiles ("Certificado"/"Empresa Certificada"), mostrar servicios marketplace.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-1">•</span>
                      <span>Gestionar planes ($14.990/$39.990 mensual), soporte correo/WhatsApp, QR enlaces.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-1">•</span>
                      <span>Cumplir DGAC (verificación credenciales), mejorar plataforma (estadísticas agregadas).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-1">•</span>
                      <span>Envío notificaciones (emails Resend: confirmaciones, actualizaciones).</span>
                    </li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-primary mb-4 mt-8">
                    3. Compartición de Datos
                  </h2>
                  <ul className="space-y-3 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-1">•</span>
                      <span><strong>Reveniu:</strong> Solo para pagos recurrentes/suscripciones (no almacenamos tarjetas).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-1">•</span>
                      <span><strong>DGAC/Autoridades:</strong> Si requerido legalmente (validaciones, incidentes aéreos).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-1">•</span>
                      <span><strong>Proveedores:</strong> Supabase (DB segura), Vercel (hosting), Resend (emails); todos cumplen Ley 21.719.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-1">•</span>
                      <span>No vendemos/compartimos con terceros publicitarios. Datos multiusuario Plan Empresa accesibles solo administradores.</span>
                    </li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-primary mb-4 mt-8">
                    4. Tus Derechos ARCO+ (Ley 21.719)
                  </h2>
                  <ul className="space-y-3 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-1">•</span>
                      <span><strong>Acceso:</strong> Descarga datos vía panel perfil.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-1">•</span>
                      <span><strong>Rectificación:</strong> Edita directamente o solicita contacto@pilotodedrones.cl (48h).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-1">•</span>
                      <span><strong>Cancelación/Eliminación:</strong> Baja cuenta/pausar perfil; datos borrados 30 días (salvo obligaciones legales).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-1">•</span>
                      <span><strong>Oposición/Portabilidad:</strong> Revoca consentimiento; exporta datos JSON.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-1">•</span>
                      <span>Reclamos ante Agencia Protección Datos (futuro 2026) o SERNAC.</span>
                    </li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-primary mb-4 mt-8">
                    5. Seguridad y Retención
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Encriptación AES-256 (Supabase), accesos RLS, backups diarios. Retención: 5 años obligaciones fiscales/DGAC; luego eliminación automática.
                  </p>
                  <p className="text-muted-foreground leading-relaxed mt-3">
                    Brechas notificadas en 72h a afectados/autoridades per Ley 21.719.
                  </p>
                  <p className="text-muted-foreground leading-relaxed mt-3">
                    Cookies: Funcionales (sesión); rechaza/elimina vía navegador. No tracking invasivo.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-primary mb-4 mt-8">
                    6. Menores y Cookies Internacionales
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Prohibido menores 18; verifica edad registro. Transferencias internacionales (Supabase/Vercel EE.UU.) con cláusulas contractuales estándar.
                  </p>
                </section>

                <div className="pt-8 border-t border-border mt-12">
                  <Button
                    onClick={() => navigate(-1)}
                    className="w-full sm:w-auto"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Volver
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-auto py-12 border-t-2 border-border bg-card/50 backdrop-blur-sm w-full">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              {/* Logo y nombre */}
              <div className="flex items-center gap-2">
                <Logo size="xl" showText={false} />
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

export default Privacy;

