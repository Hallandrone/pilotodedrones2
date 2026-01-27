import { useNavigate } from "react-router-dom";
import Logo from "@/components/ui/logo";

const Footer = () => {
	const navigate = useNavigate();
	const currentYear = new Date().getFullYear();

	return (
		<footer className="py-12 md:py-16 border-t border-border/50 bg-white">
			<div className="container mx-auto px-6 lg:px-8">
				<div className="max-w-7xl mx-auto">
					<div className="flex flex-col md:flex-row items-center justify-between gap-12 md:gap-6 mb-12 text-center">
						{/* Identidad */}
						<div className="flex flex-col items-center gap-8 max-w-sm w-full md:w-auto mx-auto md:mx-0">
							<Logo size="xl" showText={false} className="h-44 w-44 md:h-24 md:w-24 transition-all duration-300" />
							<p className="text-sm text-primary/80 font-medium leading-relaxed">
								La red profesional que conecta pilotos certificados con empresas y servicios aéreos en todo Chile.
							</p>
						</div>

						{/* Enlaces de Navegación - GRID EN MÓVIL */}
						<div className="grid grid-cols-2 md:flex gap-x-12 gap-y-10 w-full md:w-auto justify-center px-4 md:px-0">
							<div className="flex flex-col gap-4 items-center md:items-start">
								<h4 className="text-xs font-bold uppercase tracking-widest text-[#1A1A1A]/30 mb-1">Explorar</h4>
								<button onClick={() => navigate('/auth')} className="text-sm text-muted-foreground hover:text-accent transition-colors font-medium">Acceso Usuario</button>
								<button onClick={() => navigate('/search')} className="text-sm text-muted-foreground hover:text-accent transition-colors font-medium">Buscar Pilotos</button>
								<button onClick={() => navigate('/planes')} className="text-sm text-muted-foreground hover:text-accent transition-colors font-medium">Planes y Precios</button>
							</div>
							<div className="flex flex-col gap-4 items-center md:items-start">
								<h4 className="text-xs font-bold uppercase tracking-widest text-[#1A1A1A]/30 mb-1">Recursos</h4>
								<button onClick={() => navigate('/verificar-diploma')} className="text-sm text-muted-foreground hover:text-accent transition-colors font-medium">Verificar Diploma</button>
								<button onClick={() => navigate('/contacto')} className="text-sm text-muted-foreground hover:text-accent transition-colors font-medium">Contacto</button>
							</div>
						</div>
					</div>

					{/* Copyright bar & Privacy/Terms */}
					<div className="pt-8 border-t border-border/50 flex flex-col items-center gap-6">
						<div className="flex flex-col items-center justify-center gap-y-4 text-sm text-muted-foreground font-medium w-full text-center">
							<p>© {currentYear} Piloto de Drones. Todos los derechos reservados.</p>
							<div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2">
								<button onClick={() => navigate('/terms')} className="hover:text-accent transition-colors px-2 py-1">Términos y Condiciones</button>
								<button onClick={() => navigate('/privacy')} className="hover:text-accent transition-colors px-2 py-1">Política de Privacidad</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</footer>
	);
};

export default Footer;
