import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, MessageCircle, ArrowRight, ChevronRight } from "lucide-react";

const Contacto = () => {
	const navigate = useNavigate();

	useEffect(() => {
		window.scrollTo(0, 0);
	}, []);

	const handleWhatsApp = () => {
		window.open("https://wa.me/56994677613", "_blank");
	};

	const handleEmail = () => {
		window.location.href = "mailto:contacto@pilotodedrones.cl";
	};

	return (
		<div className="flex flex-col min-h-screen bg-background overflow-x-hidden">
			<Header />

			<main className="flex-1">
				{/* Hero Section Persuasiva */}
				<section className="relative py-20 lg:py-32 overflow-hidden">
					<div className="container mx-auto px-6 relative z-10">
						<div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
							<div
								className="flex-1 text-center lg:text-left"
							>
								<h1 className="text-4xl md:text-6xl font-extrabold text-primary leading-tight mb-6">
									Eleva tu Visión a <span className="text-accent underline decoration-accent/30">Nuevas Alturas</span>
								</h1>
								<p className="text-xl text-muted-foreground mb-8 leading-relaxed max-w-2xl mx-auto lg:mx-0">
									En Piloto de Drones, no solo conectamos personas; impulsamos industrias. Si buscas excelencia aérea o quieres posicionar tu carrera en lo más alto, estás a un mensaje de distancia.
								</p>
								<div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 inline-block">
									<p className="text-lg font-medium text-primary italic">
										"El futuro no se espera, se vuela. Conéctate con los mejores hoy mismo."
									</p>
								</div>
							</div>

							<div
								className="flex-1 relative"
							>
								<div className="relative z-10 rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
									<img
										src="/contact_drone_hero.png"
										alt="Perspectiva Aérea Profesional"
										className="w-full h-auto object-cover aspect-[4/3]"
									/>
									<div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end p-8 text-white">
										<p className="text-sm font-light tracking-widest uppercase mb-2">Tecnología & Precisión</p>
										<h3 className="text-2xl font-bold">Lleva tu proyecto al siguiente nivel</h3>
									</div>
								</div>
								{/* Decoración */}
								<div className="absolute -top-4 -right-4 w-24 h-24 bg-accent/20 rounded-full blur-2xl animate-pulse"></div>
								<div className="absolute -bottom-4 -left-4 w-32 h-32 bg-primary/10 rounded-full blur-3xl"></div>
							</div>
						</div>
					</div>
				</section>

				{/* Action Cards Section */}
				<section className="py-20 bg-secondary/30 backdrop-blur-sm relative border-y border-border/50">
					<div className="container mx-auto px-6">
						<div className="text-center mb-16 px-4">
							<h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">¿Hablamos?</h2>
							<p className="text-muted-foreground text-lg max-w-xl mx-auto">
								No hay intermediarios, solo oportunidades. Elige tu canal preferido y hablemos de cómo escalar tu negocio.
							</p>
						</div>

						<div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
							{/* WhatsApp Card */}
							<div>
								<Card className="h-full border-2 border-transparent hover:border-green-500/50 shadow-xl hover:shadow-green-500/10 transition-all duration-300 group overflow-hidden bg-card/50 backdrop-blur-md">
									<CardContent className="p-10 flex flex-col items-center text-center">
										<div className="w-20 h-20 rounded-2xl bg-green-500/10 flex items-center justify-center mb-8 group-hover:bg-green-500 group-hover:scale-110 transition-all duration-500">
											<MessageCircle className="h-10 w-10 text-green-600 group-hover:text-white transition-colors" />
										</div>
										<h3 className="text-2xl font-bold mb-4">WhatsApp Directo</h3>
										<p className="text-muted-foreground mb-8 text-lg">
											Respuesta inmediata. Ideal para consultas rápidas sobre membresías o búsqueda de pilotos.
										</p>
										<Button
											onClick={handleWhatsApp}
											className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-14 text-lg rounded-xl shadow-lg hover:shadow-green-700/30 gap-2 transition-all"
										>
											Iniciar Chat
											<ArrowRight className="h-5 w-5" />
										</Button>
									</CardContent>
								</Card>
							</div>

							{/* Email Card */}
							<div>
								<Card className="h-full border-2 border-transparent hover:border-accent/50 shadow-xl hover:shadow-accent/10 transition-all duration-300 group overflow-hidden bg-card/50 backdrop-blur-md">
									<CardContent className="p-10 flex flex-col items-center text-center">
										<div className="w-20 h-20 rounded-2xl bg-accent/10 flex items-center justify-center mb-8 group-hover:bg-accent group-hover:scale-110 transition-all duration-500">
											<Mail className="h-10 w-10 text-accent group-hover:text-white transition-colors" />
										</div>
										<h3 className="text-2xl font-bold mb-4">Correo Corporativo</h3>
										<p className="text-muted-foreground mb-8 text-lg">
											Envíanos tus propuestas formales o dudas técnicas detalladas. Respondemos en menos de 24h.
										</p>
										<Button
											onClick={handleEmail}
											className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold h-14 text-lg rounded-xl shadow-lg hover:shadow-accent/30 gap-2 transition-all"
										>
											Enviar Email
											<ChevronRight className="h-5 w-5" />
										</Button>
									</CardContent>
								</Card>
							</div>
						</div>
					</div>
				</section>

				{/* Final CTA Persuasivo */}
				<section className="py-24 text-center">
					<div className="container mx-auto px-6">
						<h2 className="text-3xl md:text-5xl font-bold text-primary mb-8 tracking-tight">
							Tu éxito profesional comienza con un <span className="text-accent italic">clic.</span>
						</h2>
						<p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
							Únete a la mayor red de expertos en drones de Chile y empieza a transformar la forma en que el mundo te ve.
						</p>
						<Button
							size="lg"
							className="px-12 py-8 text-xl h-auto rounded-2xl bg-primary hover:bg-primary/90 text-white shadow-2xl hover:scale-105 transition-all"
							onClick={() => navigate('/auth?tab=signup')}
						>
							Regístrate Ahora Gratis
						</Button>
					</div>
				</section>
			</main>

			<Footer />
		</div>
	);
};

export default Contacto;
