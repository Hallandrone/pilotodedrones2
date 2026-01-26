import { useNavigate } from "react-router-dom";
import Logo from "@/components/ui/logo";

const Footer = () => {
	const navigate = useNavigate();
	const currentYear = new Date().getFullYear();

	return (
		<footer className="py-12 md:py-16 border-t border-border/50 bg-white">
			<div className="container mx-auto px-6 lg:px-8">
				<div className="max-w-7xl mx-auto">
					<div className="flex flex-col md:flex-row items-start justify-between gap-12 md:gap-6 mb-12">
						{/* Identidad */}
						<div className="flex flex-col items-center md:items-start gap-4 max-w-xs w-full md:w-auto text-center md:text-left mx-auto md:mx-0">
							<div className="flex items-center gap-3">
								<Logo size="xl" showText={false} className="h-12 w-12" />
								<span className="text-2xl font-bold text-[#1A1A1A] tracking-tighter">Piloto de Drones</span>
							</div>
							<p className="text-sm text-muted-foreground leading-relaxed">
								La red profesional que conecta pilotos certificados con empresas y servicios aéreos en todo Chile.
							</p>
						</div>

						{/* Enlaces de Navegación - GRID EN MÓVIL */}
						<div className="grid grid-cols-2 sm:grid-cols-2 md:flex gap-x-12 gap-y-10 w-full md:w-auto px-4 md:px-0">
							<div className="flex flex-col gap-4">
								<h4 className="text-xs font-bold uppercase tracking-widest text-[#1A1A1A]/30 mb-1">Explorar</h4>
								<button onClick={() => navigate('/auth')} className="text-sm text-muted-foreground hover:text-accent transition-colors text-left font-medium">Acceso Usuario</button>
								<button onClick={() => navigate('/search')} className="text-sm text-muted-foreground hover:text-accent transition-colors text-left font-medium">Buscar Pilotos</button>
								<button onClick={() => navigate('/planes')} className="text-sm text-muted-foreground hover:text-accent transition-colors text-left font-medium">Planes y Precios</button>
							</div>
							<div className="flex flex-col gap-4">
								<h4 className="text-xs font-bold uppercase tracking-widest text-[#1A1A1A]/30 mb-1">Recursos</h4>
								<button onClick={() => navigate('/verificar-diploma')} className="text-sm text-muted-foreground hover:text-accent transition-colors text-left font-medium">Verificar Diploma</button>
								<button onClick={() => navigate('/contacto')} className="text-sm text-muted-foreground hover:text-accent transition-colors text-left font-medium">Contacto</button>
								<button onClick={() => navigate('/terms')} className="text-sm text-muted-foreground hover:text-accent transition-colors text-left font-medium">Términos</button>
								<button onClick={() => navigate('/privacy')} className="text-sm text-muted-foreground hover:text-accent transition-colors text-left font-medium">Privacidad</button>
							</div>
						</div>
					</div>

					{/* Copyright bar */}
					<div className="pt-8 border-t border-border/50 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
						<p className="text-sm text-muted-foreground font-medium">
							© {currentYear} Piloto de Drones. Todos los derechos reservados.
						</p>
						<div className="flex items-center gap-2">
							<div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
							<span className="text-[10px] text-[#1A1A1A]/50 uppercase tracking-[0.2em] font-bold">Servicio Operativo • Chile</span>
						</div>
					</div>
				</div>
			</div>
		</footer>
	);
};

export default Footer;
