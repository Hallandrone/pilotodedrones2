const fs = require('fs');
const path = 'c:/Users/Alvaro/Documents/GitHub/pilotodedrones2hallan/src/pages/Index.tsx';
let content = fs.readFileSync(path, 'utf8');

const ctaSection = `              {/* Pilotos Destacados CTA Section */}
              <motion.section
                className="py-12 md:py-16 bg-gradient-to-br from-secondary/30 to-background"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
              >
                <div className="max-w-4xl mx-auto px-6 text-center">
                  <h3 className="text-4xl md:text-5xl font-bold text-primary mb-8">
                    Pilotos Destacados
                  </h3>
                  <Button
                    size="lg"
                    onClick={() => navigate('/search')}
                    className="bg-white text-primary hover:bg-white/90 shadow-lg hover:shadow-xl transition-all duration-200 text-lg px-10 py-6 h-auto border border-border/50"
                  >
                    Ver Todos los Pilotos
                  </Button>
                </div>
              </motion.section>`;

// Replace both occurrences of the "Resultados / Destacados" section
const sectionRegex = /\{\/\* Resultados \/ Destacados \*\/\}[\s\S]*?<motion\.section[\s\S]*?className="py-20 lg:py-28 bg-secondary"[\s\S]*?<\/motion\.section>/g;

content = content.replace(sectionRegex, ctaSection);

fs.writeFileSync(path, content);
console.log('Successfully updated Index.tsx');
