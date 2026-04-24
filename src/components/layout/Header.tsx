import { useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import Logo from "@/components/ui/logo";
import { LogIn, User, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser } from '@supabase/supabase-js';

const NAV_LINKS = [
	{ label: 'Home', href: 'https://www.pilotodedrones.cl', external: true },
	{ label: 'Explorar Pilotos', href: '/search', external: false },
	{ label: 'Precios', href: 'https://www.pilotodedrones.cl/precios', external: true },
	{ label: 'Contacto', href: 'https://www.pilotodedrones.cl/contacto', external: true },
	{ label: 'Blog', href: 'https://www.pilotodedrones.cl/blog', external: true },
];

const Header = () => {
	const navigate = useNavigate();
	const [user, setUser] = useState<SupabaseUser | null>(null);
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [scrolled, setScrolled] = useState(false);

	useEffect(() => {
		const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
			setUser(session?.user ?? null);
		});

		supabase.auth.getSession().then(({ data: { session } }) => {
			setUser(session?.user ?? null);
		});

		return () => subscription.unsubscribe();
	}, []);

	useEffect(() => {
		const handleScroll = () => setScrolled(window.scrollY > 50);
		window.addEventListener('scroll', handleScroll, { passive: true });
		return () => window.removeEventListener('scroll', handleScroll);
	}, []);

	useEffect(() => {
		document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
		return () => { document.body.style.overflow = ''; };
	}, [mobileMenuOpen]);

	const handleLogout = useCallback(async () => {
		await supabase.auth.signOut();
		setUser(null);
		navigate('/auth');
	}, [navigate]);

	const handleNavClick = useCallback((href: string, external: boolean) => {
		setMobileMenuOpen(false);
		if (external) {
			window.location.href = href;
		} else {
			navigate(href);
		}
	}, [navigate]);

	return (
		<>
			<header
				className={`sticky top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 transition-shadow duration-300 ${scrolled ? 'shadow-md' : ''}`}
			>
				<div className="w-[90%] max-w-[1200px] mx-auto">
					<div className="flex items-center justify-between h-16">
						<a
							href="https://www.pilotodedrones.cl"
							className="flex-shrink-0 hover:scale-105 transition-transform duration-200"
							aria-label="Piloto de Drones - Inicio"
						>
							<Logo size="lg" showText={false} />
						</a>

						{/* Desktop Navigation */}
						<nav className="hidden md:flex items-center gap-1" aria-label="Navegación principal">
							{NAV_LINKS.map(({ label, href, external }) => (
								<button
									key={label}
									onClick={() => handleNavClick(href, external)}
									className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
										label === 'Explorar Pilotos'
											? 'text-cyan-500 font-semibold hover:bg-slate-100'
											: 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
									}`}
								>
									{label}
								</button>
							))}

							{user ? (
								<>
									<button
										onClick={() => navigate('/dashboard')}
										className="ml-2 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border-2 border-slate-200 text-slate-700 hover:border-cyan-400 hover:text-cyan-600 transition-colors duration-200"
									>
										<User className="h-4 w-4" aria-hidden="true" />
										<span>Mi Cuenta</span>
									</button>
									<button
										onClick={handleLogout}
										className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors duration-200"
									>
										Cerrar Sesión
									</button>
								</>
							) : (
								<button
									onClick={() => navigate('/auth?tab=signup')}
									className="ml-2 flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold bg-cyan-500 text-white hover:bg-cyan-600 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-cyan-500/40 transition-all duration-200"
								>
									<LogIn className="h-4 w-4" aria-hidden="true" />
									Ingresar/Registrarse
								</button>
							)}
						</nav>

						{/* Mobile Hamburger */}
						<button
							className="md:hidden flex flex-col justify-center gap-[5px] w-11 h-11 p-2 rounded-lg hover:bg-slate-100 transition-colors"
							onClick={() => setMobileMenuOpen(true)}
							aria-label="Abrir menú de navegación"
							aria-expanded={mobileMenuOpen}
						>
							<span className="w-[22px] h-[2.5px] bg-slate-800 rounded-full block" />
							<span className="w-[22px] h-[2.5px] bg-slate-800 rounded-full block" />
							<span className="w-[22px] h-[2.5px] bg-slate-800 rounded-full block" />
						</button>
					</div>
				</div>
			</header>

			{/* Mobile Fullscreen Menu */}
			{mobileMenuOpen && (
				<div className="md:hidden fixed inset-0 z-[999] bg-[#0B1D35] flex flex-col justify-center items-center px-8">
					<button
						className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors"
						onClick={() => setMobileMenuOpen(false)}
						aria-label="Cerrar menú"
					>
						<X className="h-7 w-7" />
					</button>

					<nav className="w-full max-w-xs flex flex-col items-center">
						{NAV_LINKS.map(({ label, href, external }) => (
							<button
								key={label}
								onClick={() => handleNavClick(href, external)}
								className={`w-full py-5 text-center text-xl font-semibold border-b border-white/[0.06] transition-colors duration-200 ${
									label === 'Explorar Pilotos'
										? 'text-cyan-400'
										: 'text-white/70 hover:text-white'
								}`}
							>
								{label}
							</button>
						))}

						{user ? (
							<>
								<button
									onClick={() => { setMobileMenuOpen(false); navigate('/dashboard'); }}
									className="w-full py-5 flex items-center justify-center gap-2 text-xl font-semibold text-white/70 hover:text-white border-b border-white/[0.06] transition-colors duration-200"
								>
									<User className="h-5 w-5" aria-hidden="true" />
									Mi Cuenta
								</button>
								<button
									onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
									className="mt-9 w-full max-w-xs py-[18px] rounded-xl text-lg font-semibold bg-white/10 text-white hover:bg-white/20 transition-colors duration-200"
								>
									Cerrar Sesión
								</button>
							</>
						) : (
							<button
								onClick={() => { setMobileMenuOpen(false); navigate('/auth?tab=signup'); }}
								className="mt-9 w-full max-w-xs flex items-center justify-center gap-2 py-[18px] rounded-xl text-lg font-semibold bg-cyan-500 text-white hover:bg-cyan-600 transition-colors duration-200"
							>
								<LogIn className="h-5 w-5" aria-hidden="true" />
								Ingresar/Registrarse
							</button>
						)}
					</nav>
				</div>
			)}
		</>
	);
};

export default Header;
