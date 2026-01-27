import { useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Shield } from "lucide-react";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";

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
                  <Shield className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h1 className="text-3xl lg:text-4xl font-bold text-primary">
                    Política de Privacidad
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    pilotodedrones.cl • Última actualización: {today}
                  </p>
                </div>
              </div>

              <div className="prose prose-slate max-w-none space-y-8 text-muted-foreground leading-relaxed">
                <p>
                  Gracias por visitar pilotodedrones.cl (en adelante, el “Sitio”), plataforma dedicada a la formación, capacitación y servicios asociados a la operación profesional de drones en Chile.
                </p>
                <p>
                  En pilotodedrones.cl respetamos y protegemos la privacidad de nuestros usuarios. Esta Política de Privacidad explica cómo recopilamos, utilizamos, almacenamos y protegemos tus datos personales, de conformidad con la Ley Nº 19.628 sobre Protección de la Vida Privada, la normativa vigente y las buenas prácticas en materia de protección de datos.
                </p>

                <section>
                  <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm">1</span>
                    Marco legal aplicable
                  </h2>
                  <p>El tratamiento de los datos personales realizado a través de este Sitio se rige por:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Ley Nº 19.628 sobre Protección de la Vida Privada (Chile)</li>
                    <li>Normativa complementaria vigente</li>
                    <li>Principios de licitud, finalidad, proporcionalidad, calidad, seguridad y confidencialidad de los datos</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm">2</span>
                    Datos personales que recopilamos
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-bold text-primary mb-2">2.1 Información recopilada automáticamente (Información del Dispositivo)</h3>
                      <p>Cuando navegas por el Sitio, recopilamos de forma automática cierta información técnica, tales como:</p>
                      <ul className="list-disc pl-6 space-y-1 mt-2">
                        <li>Dirección IP</li>
                        <li>Tipo de navegador y sistema operativo</li>
                        <li>Zona horaria</li>
                        <li>Páginas visitadas y tiempo de navegación</li>
                        <li>Sitios o términos de búsqueda que te derivan al Sitio</li>
                      </ul>
                      <p className="mt-2 text-sm italic">Esta información se recopila exclusivamente para fines estadísticos, de seguridad y mejora del Sitio, y no permite identificarte directamente.</p>
                    </div>
                    <div>
                      <h3 className="font-bold text-primary mb-2">2.2 Información proporcionada por el usuario (Información del Perfil)</h3>
                      <p>Recopilamos datos personales cuando tú los proporcionas voluntariamente, por ejemplo, al:</p>
                      <ul className="list-disc pl-6 space-y-1 mt-2">
                        <li>Registrarte en el Sitio</li>
                        <li>Solicitar información sobre cursos o servicios</li>
                        <li>Inscribirte en capacitaciones o programas formativos</li>
                        <li>Realizar pagos</li>
                        <li>Completar formularios de contacto</li>
                      </ul>
                      <p className="mt-2">Estos datos pueden incluir: Nombre y apellido, RUT, dirección de correo electrónico, número de teléfono, información de facturación y pago, y otros datos necesarios para la correcta prestación de nuestros servicios.</p>
                    </div>
                  </div>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm">3</span>
                    Finalidad del tratamiento de los datos
                  </h2>
                  <p>De acuerdo con el artículo 4 de la Ley 19.628, los datos personales recopilados serán utilizados únicamente para los siguientes fines:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Prestación de servicios y capacitaciones relacionadas con drones</li>
                    <li>Gestión administrativa, académica y contractual</li>
                    <li>Comunicación directa contigo, incluyendo información relevante sobre cursos, cambios normativos, certificaciones y servicios</li>
                    <li>Procesamiento de pagos y facturación</li>
                    <li>Prevención de fraudes y resguardo de la seguridad del Sitio</li>
                    <li>Análisis estadístico y mejora continua del Sitio</li>
                    <li>Marketing y difusión de servicios, siempre relacionado con el giro de pilotodedrones.cl</li>
                  </ul>
                  <p className="font-semibold text-primary mt-2">En ningún caso utilizaremos tus datos para fines distintos a los informados sin tu consentimiento previo.</p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm">4</span>
                    Base legal y consentimiento
                  </h2>
                  <p>El tratamiento de tus datos personales se fundamenta en:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Tu consentimiento expreso o tácito, otorgado al proporcionar tus datos</li>
                    <li>La ejecución de una relación contractual o precontractual</li>
                    <li>El cumplimiento de obligaciones legales</li>
                  </ul>
                  <p>Al utilizar este Sitio y entregar tu información, aceptas esta Política de Privacidad.</p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm">5</span>
                    Comunicación y cesión de datos a terceros
                  </h2>
                  <p>pilotodedrones.cl no vende ni comercializa datos personales.</p>
                  <p>No obstante, tus datos podrán ser comunicados a terceros únicamente en los siguientes casos:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Proveedores tecnológicos (hosting, plataformas de pago, herramientas analíticas como Google Analytics)</li>
                    <li>Plataformas de publicidad digital (Google, Meta) para campañas informativas</li>
                    <li>Autoridades administrativas o judiciales, cuando sea requerido por ley</li>
                    <li>Empresas o colaboradores estratégicos, solo cuando sea estrictamente necesario para la correcta prestación de servicios formativos o técnicos</li>
                  </ul>
                  <p className="text-sm">Todos los terceros están obligados a respetar la confidencialidad y seguridad de la información.</p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm">6</span>
                    Derechos del titular de los datos (Derechos ARCO)
                  </h2>
                  <p>De conformidad con la Ley 19.628, como titular de los datos personales tienes derecho a:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li><strong>Acceso:</strong> Conocer qué datos tuyos mantenemos</li>
                    <li><strong>Rectificación:</strong> Solicitar la corrección de datos inexactos</li>
                    <li><strong>Cancelación:</strong> Solicitar la eliminación de tus datos cuando proceda</li>
                    <li><strong>Oposición:</strong> Oponerte al tratamiento de tus datos en ciertos casos</li>
                  </ul>
                  <p className="mt-4">Para ejercer estos derechos, puedes escribir a: <a href="mailto:info@pilotodedrones.cl" className="text-accent font-semibold">info@pilotodedrones.cl</a></p>
                  <p className="text-sm">La solicitud será atendida dentro de los plazos legales.</p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm">7</span>
                    Seguridad de la información
                  </h2>
                  <p>Adoptamos medidas técnicas, organizativas y administrativas razonables para proteger tus datos personales contra accesos no autorizados, pérdida, uso indebido, alteración o divulgación no autorizada.</p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm">8</span>
                    Conservación de los datos
                  </h2>
                  <p>Los datos personales se conservarán únicamente durante el tiempo necesario para cumplir con la finalidad para la cual fueron recopilados, o mientras exista una relación contractual, académica o legal que lo justifique.</p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm">9</span>
                    Menores de edad
                  </h2>
                  <p>Este Sitio no está dirigido a menores de 18 años. No recopilamos conscientemente datos personales de menores.</p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm">10</span>
                    Modificaciones a esta Política
                  </h2>
                  <p>pilotodedrones.cl se reserva el derecho de modificar esta Política de Privacidad en cualquier momento para adaptarla a cambios legales, técnicos u operativos. Las modificaciones serán publicadas en el Sitio y entrarán en vigencia desde su publicación.</p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm">11</span>
                    Contacto
                  </h2>
                  <p>Si tienes dudas, consultas o reclamos relacionados con esta Política de Privacidad o el tratamiento de tus datos personales, puedes contactarnos en:</p>
                  <div className="bg-secondary/10 p-4 rounded-lg mt-2">
                    <p className="flex items-center gap-2">📧 <a href="mailto:info@pilotodedrones.cl" className="text-accent font-semibold">info@pilotodedrones.cl</a></p>
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

export default Privacy;
