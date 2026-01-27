import { useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, FileText } from "lucide-react";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";

const Terms = () => {
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

  const today = new Date().toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />

      <div className="flex-1">
        {/* Content */}
        <div className="max-w-4xl mx-auto px-6 lg:px-8 py-12 lg:py-16">
          <Card className="shadow-lg border-none">
            <CardContent className="p-8 lg:p-12">
              <div ref={titleRef} className="flex items-center gap-3 mb-8 scroll-mt-20">
                <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h1 className="text-3xl lg:text-4xl font-bold text-primary">
                    Términos y Condiciones
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    pilotodedrones.cl • Última actualización: {today}
                  </p>
                </div>
              </div>

              <div className="prose prose-slate max-w-none space-y-8 text-muted-foreground leading-relaxed">
                <p>
                  Bienvenido a pilotodedrones.cl (en adelante, el “Sitio”). Al acceder, navegar y utilizar este Sitio, aceptas y te obligas al cumplimiento de los presentes Términos y Condiciones de Uso (en adelante, los “Términos”).
                </p>
                <p>
                  Estos Términos rigen el uso de la plataforma pilotodedrones.cl, propiedad de sus respectivos titulares legales en Chile, y cualquier servicio o producto ofrecido a través de la misma. Te recomendamos leer atentamente este documento antes de utilizar nuestros servicios.
                </p>

                <section>
                  <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm">1</span>
                    Aceptación de los Términos
                  </h2>
                  <p>
                    El uso de este Sitio atribuye la condición de “Usuario” e implica la aceptación total de todas las disposiciones incluidas en estos Términos y en nuestra <a href="/politica-de-privacidad" className="text-accent underline">Política de Privacidad</a>. Si no estás de acuerdo con alguna de las estipulaciones aquí contenidas, deberás abstenerte de utilizar el Sitio.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm">2</span>
                    Descripción del servicio
                  </h2>
                  <p>
                    pilotodedrones.cl es un ecosistema digital dedicado a la comunidad de drones en Chile, que ofrece:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Directorios de pilotos y empresas del sector.</li>
                    <li>Información sobre cursos, formación y certificaciones.</li>
                    <li>Venta de servicios relacionados con la operación de aeronaves pilotadas a distancia (RPA/Drones).</li>
                    <li>Noticias y herramientas para profesionales del área.</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm">3</span>
                    Capacidad legal
                  </h2>
                  <p>
                    Para utilizar nuestros servicios y contratar a través del Sitio, deberás ser mayor de 18 años y tener capacidad legal suficiente. Los menores de edad sólo podrán utilizar el Sitio bajo supervisión de sus padres o tutores legales.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm">4</span>
                    Obligaciones del Usuario
                  </h2>
                  <p>Al utilizar pilotodedrones.cl te comprometes a:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Proporcionar información veraz y actualizada.</li>
                    <li>Hacer un uso lícito del Sitio. No realizar actos que dañen la plataforma, afecten su seguridad o infrinjan derechos de terceros.</li>
                    <li>No utilizar el contenido del Sitio para fines comerciales propios sin autorización expresa.</li>
                    <li>Cumplir con la normativa de aviación civil vigente en Chile (normativa DGAC) en caso de promocionar o prestar servicios como piloto.</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm">5</span>
                    Registro y seguridad
                  </h2>
                  <p>
                    Algunas funcionalidades pueden requerir la creación de una cuenta de usuario. Eres responsable de mantener la confidencialidad de tu contraseña y de todas las actividades realizadas bajo tu cuenta. En caso de detectar un uso no autorizado, deberás informarnos de inmediato.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm">6</span>
                    Propiedad Intelectual
                  </h2>
                  <p>
                    Todo el contenido, diseños, logotipos, textos, gráficos, software y demás elementos del Sitio son propiedad exclusiva de pilotodedrones.cl o cuentan con las licencias correspondientes. Queda prohibida su reproducción, distribución o modificación sin autorización previa.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm">7</span>
                    Limitación de responsabilidad
                  </h2>
                  <p>Aunque nos esforzamos por ofrecer información precisa y un servicio ininterrumpido:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>No garantizamos la ausencia de errores o virus en el Sitio.</li>
                    <li>No somos responsables por las acciones de terceros (pilotos o empresas) que utilicen nuestra plataforma para ofrecer sus servicios de forma independiente.</li>
                    <li>No nos hacemos responsables por daños derivados de una mala conexión de internet del usuario.</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm">8</span>
                    Modificaciones
                  </h2>
                  <p>
                    pilotodedrones.cl se reserva el derecho de modificar estos Términos en cualquier momento. Los cambios entrarán en vigencia inmediatamente después de su publicación en el Sitio. El uso continuado de la plataforma implica la aceptación de los nuevos Términos.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm">9</span>
                    Ley aplicable y jurisdicción
                  </h2>
                  <p>
                    Estos Términos se rigen por las leyes de la República de Chile. Cualquier controversia será sometida a la jurisdicción de los tribunales competentes de la ciudad de Santiago.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm">10</span>
                    Contacto
                  </h2>
                  <p>
                    Para cualquier consulta sobre estos Términos, comunícate con nosotros:
                  </p>
                  <div className="bg-secondary/10 p-4 rounded-lg mt-2">
                    <p className="flex items-center gap-2">📧 <a href="mailto:contacto@pilotodedrones.cl" className="text-accent font-semibold">contacto@pilotodedrones.cl</a></p>
                    <p className="flex items-center gap-2">🌐 <a href="https://www.pilotodedrones.cl" target="_blank" rel="noopener noreferrer" className="text-accent font-semibold">www.pilotodedrones.cl</a></p>
                  </div>
                </section>

                <div className="pt-8 border-t border-border mt-12">
                  <Button
                    onClick={() => navigate(-1)}
                    className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white"
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

      <Footer />
    </div>
  );
};

export default Terms;
