import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, MessageCircle, ArrowRight, ChevronRight } from "lucide-react";
import { ContactForm } from "@/components/ui/ContactForm";

const Contacto = () => {
	const navigate = useNavigate();

	useEffect(() => {
		window.scrollTo(0, 0);
	}, []);

	const handleWhatsApp = () => {
		window.open("https://wa.me/56994677613", "_blank");
	};

	const handleEmail = () => {
		window.location.href = "mailto:info@pilotodedrones.cl";
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

				{/* Formulario de Contacto */}
				<section className="py-20 relative">
					<div className="container mx-auto px-6">
						<div className="max-w-4xl mx-auto">
							<div className="text-center mb-12">
								<h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">Solicita tu servicio con drones</h2>
								<div className="w-24 h-1 bg-accent mx-auto rounded-full"></div>
							</div>

							<Card className="border shadow-2xl bg-card/50 backdrop-blur-md overflow-hidden">
								<div className="grid md:grid-cols-5 h-full">
									{/* Sidebar Informativo - Visible en todos los tamaños pero arriba en móvil */}
									<div className="md:col-span-2 bg-primary p-8 text-white flex flex-col justify-between relative overflow-hidden order-2 md:order-1">
										<div className="relative z-10">
											<h3 className="text-2xl font-bold mb-6">Información de Contacto</h3>
											<p className="text-primary-foreground/80 mb-8 leading-relaxed">
												Nosotros nos encargamos de conectar tu proyecto con nuestra Red de Pilotos Certificados en Chile.
											</p>

											<div className="space-y-6">
												<div className="flex items-start gap-4">
													<Mail className="w-6 h-6 mt-1 text-accent" />
													<div>
														<p className="font-semibold text-sm opacity-70 mb-1">Email</p>
														<p className="text-lg">info@pilotodedrones.cl</p>
													</div>
												</div>
												<div className="flex items-start gap-4">
													<div className="w-6 h-6 mt-1 text-accent flex items-center justify-center">
														<span className="text-lg font-bold">@</span>
													</div>
													<div>
														<p className="font-semibold text-sm opacity-70 mb-1">Redes Sociales</p>
														<p className="text-lg">@pilotodedrones.cl</p>
													</div>
												</div>
											</div>
										</div>

										{/* Decoración */}
										<div className="absolute -bottom-20 -right-20 w-64 h-64 bg-accent/20 rounded-full blur-3xl"></div>
										<div className="absolute top-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
									</div>

									{/* Formulario - Primero en móvil */}
									<div className="md:col-span-3 p-8 md:p-12 order-1 md:order-2">
										<ContactForm />
									</div>
								</div>
							</Card>

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

						<div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
							{/* WhatsApp Contacto Card */}
							<div>
								<Card className="h-full border-2 border-transparent hover:border-green-500/50 shadow-xl hover:shadow-green-500/10 transition-all duration-300 group overflow-hidden bg-card/50 backdrop-blur-md">
									<CardContent className="p-8 flex flex-col items-center text-center">
										<div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center mb-6 group-hover:bg-green-500 group-hover:scale-110 transition-all duration-500">
											<MessageCircle className="h-8 w-8 text-green-600 group-hover:text-white transition-colors" />
										</div>
										<h3 className="text-xl font-bold mb-3">Ventas y Alianzas</h3>
										<p className="text-muted-foreground mb-6 text-sm">
											Contacto directo para convenios, publicidad y membresías corporativas.
										</p>
										<Button
											onClick={() => window.open("https://wa.me/56994677613", "_blank")}
											className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-12 text-base rounded-xl shadow-lg hover:shadow-green-700/30 gap-2 transition-all mt-auto"
										>
											Contacto
											<ArrowRight className="h-4 w-4" />
										</Button>
									</CardContent>
								</Card>
							</div>

							{/* WhatsApp Soporte Card */}
							<div>
								<Card className="h-full border-2 border-transparent hover:border-emerald-500/50 shadow-xl hover:shadow-emerald-500/10 transition-all duration-300 group overflow-hidden bg-card/50 backdrop-blur-md">
									<CardContent className="p-8 flex flex-col items-center text-center">
										<div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6 group-hover:bg-emerald-500 group-hover:scale-110 transition-all duration-500">
											<MessageCircle className="h-8 w-8 text-emerald-600 group-hover:text-white transition-colors" />
										</div>
										<h3 className="text-xl font-bold mb-3">Soporte Técnico</h3>
										<p className="text-muted-foreground mb-6 text-sm">
											¿Problemas con la plataforma? Escríbenos para una solución rápida.
										</p>
										<Button
											onClick={() => window.open("https://wa.me/56954751380", "_blank")}
											className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 text-base rounded-xl shadow-lg hover:shadow-emerald-700/30 gap-2 transition-all mt-auto"
										>
											Centro de Ayuda
											<ArrowRight className="h-4 w-4" />
										</Button>
									</CardContent>
								</Card>
							</div>

							{/* Email Card */}
							<div>
								<Card className="h-full border-2 border-transparent hover:border-accent/50 shadow-xl hover:shadow-accent/10 transition-all duration-300 group overflow-hidden bg-card/50 backdrop-blur-md">
									<CardContent className="p-8 flex flex-col items-center text-center">
										<div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-6 group-hover:bg-accent group-hover:scale-110 transition-all duration-500">
											<Mail className="h-8 w-8 text-accent group-hover:text-white transition-colors" />
										</div>
										<h3 className="text-xl font-bold mb-3">Correo Oficial</h3>
										<p className="text-muted-foreground mb-6 text-sm">
											Propuestas formales y consultas administrativas extensas.
										</p>
										<Button
											onClick={handleEmail}
											className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold h-12 text-base rounded-xl shadow-lg hover:shadow-accent/30 gap-2 transition-all mt-auto"
										>
											info@pilotodedrones.cl
											<ChevronRight className="h-4 w-4" />
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
