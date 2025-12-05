import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, FileText } from "lucide-react";
import Logo from "@/components/ui/logo";

const Terms = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm shadow-sm sticky top-0 z-50 w-full">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-3 sm:py-5">
          <div className="flex items-center justify-between gap-4 w-full max-w-7xl mx-auto">
            <Logo size="xl" className="hover:scale-105 transition-transform duration-200 flex-shrink-0" />
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

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 lg:px-8 py-12 lg:py-16">
        <Card className="shadow-lg">
          <CardContent className="p-8 lg:p-12">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-accent" />
              </div>
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold text-primary">
                  Términos y Condiciones
                </h1>
                <p className="text-muted-foreground mt-1">
                  Pilotodedrones.cl
                </p>
              </div>
            </div>

            <div className="prose prose-slate max-w-none space-y-8">
              <div className="bg-accent/5 border-l-4 border-accent p-4 rounded-r-lg">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Estos Términos y Condiciones regulan el uso de la plataforma pilotodedrones.cl, un marketplace donde pilotos de drones (RUT 77.188.923-9, Hallan Ahumada) y empresas publican servicios aéreos certificados, con suscripciones mensuales vía Reveniu. La plataforma actúa como intermediario digital, no como operador de drones ni garante de servicios, conforme a Ley 19.496 (protección consumidor), Ley 21.719 (datos personales) y DAN 151 DGAC. Aceptas estos términos al registrarte, suscribirte o publicar servicios; reclamos/sugerencias a contacto@pilotodedrones.cl.
                </p>
              </div>

              <section>
                <h2 className="text-2xl font-bold text-primary mb-4 mt-8">
                  1. Registro y Obligaciones de Usuarios
                </h2>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-accent mt-1">•</span>
                    <span>Debes ser mayor de 18 años, residente Chile con RUT válido, y poseer credencial DGAC vigente para publicar servicios.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent mt-1">•</span>
                    <span><strong>Pilotos individuales/empresas:</strong> Declaras cumplir regulaciones DGAC (registro drones &gt;750g MTOW, RCA RPAS, seguros operación). Publicas datos veraces: certificados PDF, bitácora vuelos, zonas/tipo trabajos.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent mt-1">•</span>
                    <span>Plataforma valida perfiles para sellos "Certificado"/"Empresa Certificada" (revisión manual documentos). Prohibido contenido falso/ilegal; violaciones causan suspensión inmediata.</span>
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-primary mb-4 mt-8">
                  2. Planes de Suscripción y Pagos
                </h2>
                <div className="space-y-4">
                  <div className="bg-card border border-border rounded-lg p-4">
                    <h3 className="font-semibold text-primary mb-2">Plan Profesional ($14.990/mes):</h3>
                    <p className="text-muted-foreground text-sm">
                      Perfil público (nombre, foto, zona, trabajos), sello "Perfil Certificado", subida ilimitada certificados PDF, bitácora vuelos/horas, enlace/QR verificable, panel edición, atención correo.
                    </p>
                  </div>
                  <div className="bg-card border border-border rounded-lg p-4">
                    <h3 className="font-semibold text-primary mb-2">Plan Empresa ($39.990/mes):</h3>
                    <p className="text-muted-foreground text-sm">
                      Todo Profesional + panel multiusuario (hasta 3 pilotos), sello "Empresa Certificada", perfil destacado "Empresas Recomendadas", soporte WhatsApp prioritario.
                    </p>
                  </div>
                  <p className="text-muted-foreground mt-4">
                    Pagos recurrentes automáticos vía Reveniu (sandbox/producción); cancelación por email Reveniu al fin ciclo. No reembolsos salvo ley; disputas vía contacto@pilotodedrones.cl en 48h.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-primary mb-4 mt-8">
                  3. Funcionamiento del Marketplace
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Conectamos oferentes (pilotos/empresas) con clientes; contratos/negociaciones/pagos servicios directos entre partes. Plataforma no interviene ejecuciones ni retiene fondos.
                </p>
                <p className="text-muted-foreground leading-relaxed mt-3">
                  Usuarios responden por daños, incumplimientos DGAC o leyes aplicables (multas aéreas, responsabilidad civil).
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-primary mb-4 mt-8">
                  4. Propiedad Intelectual y Contenido
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Retienes derechos sobre tu perfil/certificados/bitácora; licencia no exclusiva a plataforma para mostrarlos/publicar QR/enlaces.
                </p>
                <p className="text-muted-foreground leading-relaxed mt-3">
                  Prohibido spam, PI ajena o datos falsos. Plataforma remueve contenido sin aviso y suspende cuentas.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-primary mb-4 mt-8">
                  5. Protección de Datos y Privacidad
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Tratamos datos (RUT, ubicación vuelos, contactos) con consentimiento expreso per Ley 21.719. Accede/rectifica/elimina vía panel o contacto@pilotodedrones.cl.
                </p>
                <p className="text-muted-foreground leading-relaxed mt-3">
                  Compartimos mínimos con Reveniu (pagos) y DGAC (validaciones si aplica); no vendemos datos.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-primary mb-4 mt-8">
                  6. Limitación de Responsabilidad y Terminación
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Plataforma no liable por servicios terceros, fallos técnicos, pérdidas indirectas o regulaciones DGAC. Máxima responsabilidad: valor suscripción pagada.
                </p>
                <p className="text-muted-foreground leading-relaxed mt-3">
                  Terminamos acceso por violaciones (inmediato si riesgo seguridad aérea). Fuerza mayor: fallos Reveniu/DGAC.
                </p>
                <p className="text-muted-foreground leading-relaxed mt-3">
                  Leyes Chile aplican; jurisdicción tribunales Santiago. Actualizaciones notificadas email; uso continuo = aceptación.
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

      {/* Footer */}
      <footer className="mt-auto py-12 border-t border-border/50 bg-background">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              {/* Logo y nombre */}
              <div className="flex items-center gap-2">
                <Logo size="sm" showText={false} />
                <span className="text-lg font-semibold text-muted-foreground">
                  Piloto de Drones
                </span>
              </div>

              {/* Copyright */}
              <p className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} Piloto de Drones. Todos los derechos reservados.
              </p>

              {/* Enlaces mínimos */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap justify-center">
                <button
                  onClick={() => navigate('/auth')}
                  className="hover:text-foreground transition-colors"
                >
                  Iniciar Sesión
                </button>
                <span className="text-border">•</span>
                <button
                  onClick={() => navigate('/search')}
                  className="hover:text-foreground transition-colors"
                >
                  Buscar Pilotos
                </button>
                <span className="text-border">•</span>
                <button
                  onClick={() => navigate('/terms')}
                  className="hover:text-foreground transition-colors"
                >
                  Términos y Condiciones
                </button>
                <span className="text-border">•</span>
                <button
                  onClick={() => navigate('/privacy')}
                  className="hover:text-foreground transition-colors"
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

export default Terms;

