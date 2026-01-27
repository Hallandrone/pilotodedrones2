import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Logo from "@/components/ui/logo";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu, LogIn, User, Home } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser } from '@supabase/supabase-js';

const Header = () => {
	const navigate = useNavigate();
	const [user, setUser] = useState<SupabaseUser | null>(null);
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

	useEffect(() => {
		const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
			setUser(session?.user ?? null);
		});

		checkAuth();

		return () => {
			subscription.unsubscribe();
		};
	}, []);

	const checkAuth = async () => {
		const { data: { session } } = await supabase.auth.getSession();
		setUser(session?.user ?? null);
	};

	const handleLogout = async () => {
		await supabase.auth.signOut();
		setUser(null);
		navigate('/');
	};

	return (
		<header className="border-b border-border bg-card shadow-sm sticky top-0 z-50 w-full transition-all duration-300">
			<div className="w-full px-4 sm:px-6 lg:px-8 py-2 sm:py-3">
				<div className="flex items-center justify-between gap-4 w-full">
					<Logo
						size="lg"
						showText={false}
						className="hover:scale-105 transition-transform duration-200 flex-shrink-0 ml-4 sm:ml-8"
					/>

					{/* Desktop Navigation */}
					<div className="hidden md:flex items-center gap-2 sm:gap-3 flex-shrink-0 min-w-0">
						<Button variant="ghost" size="sm" onClick={() => navigate('/')} className="sm:h-10 sm:px-6">Home</Button>
						<Button variant="ghost" size="sm" onClick={() => navigate('/search')} className="sm:h-10 sm:px-6 text-accent font-bold">Explorar Pilotos</Button>
						<Button variant="ghost" size="sm" onClick={() => navigate('/planes')} className="sm:h-10 sm:px-6">Precios</Button>
						<Button variant="ghost" size="sm" onClick={() => navigate('/contacto')} className="sm:h-10 sm:px-6">Contacto</Button>

						{user ? (
							<>
								<Button variant="outline" size="sm" className="sm:h-10 sm:px-8 border-2" onClick={() => navigate('/dashboard')}>
									<User className="h-4 w-4 mr-2" /><span className="hidden md:inline">Mi Cuenta</span>
								</Button>
								<Button variant="ghost" size="sm" className="sm:h-10 sm:px-8" onClick={handleLogout}>Cerrar Sesión</Button>
							</>
						) : (
							<Button size="sm" className="sm:h-10 sm:px-8 bg-accent text-accent-foreground" onClick={() => navigate('/auth?tab=signup')}>
								<LogIn className="h-4 w-4 mr-2" /><span>Ingresar/Registrarse</span>
							</Button>
						)}
					</div>

					{/* Mobile Menu */}
					<div className="md:hidden">
						<Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
							<SheetTrigger asChild>
								<Button variant="ghost" size="sm"><Menu className="h-6 w-6" /></Button>
							</SheetTrigger>
							<SheetContent side="right">
								<SheetHeader>
									<SheetTitle>Menú</SheetTitle>
								</SheetHeader>
								<div className="mt-6 space-y-3">
									<Button variant="ghost" className="w-full justify-start" onClick={() => { setMobileMenuOpen(false); navigate('/'); }}>
										<Home className="h-5 w-5 mr-3" />Home
									</Button>
									<Button variant="ghost" className="w-full justify-start font-bold text-accent" onClick={() => { setMobileMenuOpen(false); navigate('/search'); }}>
										Explorar Pilotos
									</Button>
									<Button variant="ghost" className="w-full justify-start" onClick={() => { setMobileMenuOpen(false); navigate('/planes'); }}>
										Precios
									</Button>
									<Button variant="ghost" className="w-full justify-start" onClick={() => { setMobileMenuOpen(false); navigate('/contacto'); }}>
										Contacto
									</Button>
									{user ? (
										<Button variant="outline" className="w-full justify-start" onClick={() => { setMobileMenuOpen(false); navigate('/dashboard'); }}>
											<User className="h-5 w-5 mr-3" />Mi Cuenta
										</Button>
									) : (
										<Button className="w-full justify-start bg-accent" onClick={() => { setMobileMenuOpen(false); navigate('/auth?tab=signup'); }}>
											<LogIn className="h-5 w-5 mr-3" />Ingresar/Registrarse
										</Button>
									)}
								</div>
							</SheetContent>
						</Sheet>
					</div>
				</div>
			</div>
		</header>
	);
};

export default Header;
