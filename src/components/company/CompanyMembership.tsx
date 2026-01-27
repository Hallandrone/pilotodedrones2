import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, CheckCircle, Sparkles, Zap, Building } from "lucide-react";

interface Membership {
	plan_name: string;
	status: string;
	renewal_date: string | null;
	price: number;
}

export const CompanyMembership = () => {
	const [membership, setMembership] = useState<Membership | null>(null);
	const [loading, setLoading] = useState(true);
	const { toast } = useToast();

	useEffect(() => {
		loadMembership();
	}, []);

	const loadMembership = async () => {
		try {
			const { data: { user } } = await supabase.auth.getUser();
			if (!user) return;

			const { data: sub } = await supabase.from('user_subscriptions').select('*').eq('user_id', user.id).maybeSingle();

			if (sub) {
				setMembership({
					plan_name: sub.plan_name === 'premium' || sub.plan_name === 'empresa' ? 'Plan Empresa' : sub.plan_name,
					status: sub.status,
					renewal_date: sub.renewal_date,
					price: sub.plan_name === 'premium' || sub.plan_name === 'empresa' ? 39990 : 0
				});
			}
		} catch (error) {
			console.error(error);
		} finally {
			setLoading(false);
		}
	};

	const formatPrice = (price: number) => {
		return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(price);
	};

	if (loading) return <div className="text-white p-8">Cargando...</div>;

	return (
		<div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-20">
			{/* Current Plan Card (Only if they have one) */}
			{membership && (
				<Card className="bg-[#0b485d] border-2 border-[#00b3f3]/30 shadow-2xl rounded-3xl overflow-hidden relative isolate">
					<div className="absolute top-0 right-0 p-6">
						<Badge className={membership?.status === 'active' ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"}>
							{membership?.status === 'active' ? "ACTIVA" : "INACTIVA"}
						</Badge>
					</div>
					<CardHeader className="pt-10">
						<CardTitle className="text-3xl font-bold text-white flex items-center gap-3">
							<CreditCard className="h-8 w-8 text-[#00b3f3]" />
							Tu Membresía Actual
						</CardTitle>
						<CardDescription className="text-white/60 text-lg">Resumen de tu suscripción empresarial activa.</CardDescription>
					</CardHeader>
					<CardContent className="space-y-8 pb-10">
						<div className="bg-[#083b4e]/50 rounded-3xl p-8 border border-white/10 text-center">
							<h3 className="text-4xl font-black text-white mb-2">{membership?.plan_name}</h3>
							<p className="text-[#00b3f3] text-2xl font-bold">{formatPrice(membership.price)} / mes</p>
							{membership?.renewal_date && (
								<p className="text-white/40 mt-4">Próxima renovación: {new Date(membership.renewal_date).toLocaleDateString()}</p>
							)}
						</div>
					</CardContent>
				</Card>
			)}

			{!membership && (
				<div className="text-center space-y-4 mb-12">
					<h2 className="text-4xl font-black text-white tracking-tight">Potencia tu <span className="text-[#00b3f3]">Empresa</span></h2>
					<p className="text-white/60 max-w-2xl mx-auto text-lg">
						Accede a las herramientas de gestión de flota más avanzadas y destaca tu marca ante miles de clientes en Chile.
					</p>
				</div>
			)}

			<div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
				{/* Plan Empresa Card (The one they buy) */}
				<Card className="bg-[#0b485d] border-2 border-[#00b3f3]/50 shadow-2xl rounded-3xl overflow-hidden flex flex-col hover:border-[#00b3f3] transition-all duration-500 group isolate">
					<div className="bg-[#00b3f3] py-2 px-6 text-center">
						<span className="text-white text-xs font-bold tracking-widest uppercase">EXCLUSIVO PARA EMPRESAS</span>
					</div>
					<CardHeader className="pb-4">
						<CardTitle className="text-2xl font-bold text-white flex items-center gap-2">
							<Building className="h-7 w-7 text-[#00b3f3]" />
							Plan Empresa
						</CardTitle>
						<CardDescription className="text-white/60">Posicionamiento y gestión profesional.</CardDescription>
					</CardHeader>
					<CardContent className="flex-1 space-y-6">
						<div className="text-center py-6 bg-white/5 rounded-2xl border border-white/10 ring-1 ring-white/5">
							<span className="text-4xl font-black text-white leading-none">$39.990</span>
							<span className="text-white/40 ml-2 font-medium">/ mes</span>
						</div>
						<ul className="space-y-4">
							{[
								"Sello 'Empresa Certificada' en el Perfil",
								"Panel de Gestión (Hasta 4 Pilotos)",
								"Aparición Destacada en Directorio",
								"Estadísticas de Perfil y Leads",
								"Validación Masiva de Certificados",
								"QR Profesional para el Portafolio",
								"Soporte Prioritario vía WhatsApp"
							].map(benefit => (
								<li key={benefit} className="text-white/80 flex items-center gap-3 text-sm">
									<CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0" /> {benefit}
								</li>
							))}
						</ul>
					</CardContent>
					<div className="p-6 pt-0 mt-auto">
						<Button className="w-full bg-[#00b3f3] hover:bg-[#0099cc] text-white font-black h-14 rounded-2xl shadow-lg shadow-[#00b3f3]/20 hover:scale-[1.02] transition-all">
							SUSCRIBIRME AHORA
						</Button>
					</div>
				</Card>

				{/* Plan Pro Info Card (For their pilots) */}
				<Card className="bg-[#0f172a]/40 border border-white/10 rounded-3xl overflow-hidden flex flex-col opacity-90 border-dashed isolate">
					<div className="bg-white/5 py-2 px-6 text-center">
						<span className="text-white/60 text-[10px] font-bold tracking-widest uppercase">CONOCE EL PLAN DE TUS PILOTOS</span>
					</div>
					<CardHeader className="pb-4">
						<CardTitle className="text-xl font-bold text-white flex items-center gap-2">
							<Zap className="h-6 w-6 text-amber-400" />
							Suscripción PRO (Individual)
						</CardTitle>
						<CardDescription className="text-white/60 text-xs text-balance">Los beneficios que desbloquean tus trabajadores al unirse.</CardDescription>
					</CardHeader>
					<CardContent className="flex-1 space-y-5">
						<div className="bg-white/5 p-4 rounded-xl border border-white/5">
							<p className="text-white/50 text-[11px] leading-relaxed italic">
								"Contratar o motivar a tus pilotos para que sean PRO les da acceso a herramientas técnicas avanzadas necesarias para la excelencia operacional."
							</p>
						</div>
						<ul className="space-y-3">
							{[
								"Meteorología Aeronáutica Avanzada",
								"Gestor Digital de Bitácora de Vuelo",
								"Validación Automática de Diplomas",
								"Perfiles Públicos con Alta Visibilidad",
								"Insignia de Seguridad 'Piloto PRO'"
							].map(benefit => (
								<li key={benefit} className="text-white/60 flex items-center gap-3 text-xs">
									<CheckCircle className="h-4 w-4 text-white/20 flex-shrink-0" /> {benefit}
								</li>
							))}
						</ul>
					</CardContent>
					<div className="p-6 pt-0 mt-auto border-t border-white/5">
						<p className="text-center text-[10px] text-white/40 font-medium">
							* Estas herramientas ayudan a la estandarización técnica de tu empresa.
						</p>
					</div>
				</Card>
			</div>
		</div>
	);
};
