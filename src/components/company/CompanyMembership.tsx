import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, CheckCircle, AlertCircle, Loader2, Sparkles, Zap } from "lucide-react";

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

	if (loading) return <div className="text-white">Cargando...</div>;

	return (
		<div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
			{/* Current Plan Card */}
			<Card className="bg-white/10 backdrop-blur-xl border-2 border-[#00b3f3]/30 shadow-2xl rounded-3xl overflow-hidden relative">
				<div className="absolute top-0 right-0 p-6">
					<Badge className={membership?.status === 'active' ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"}>
						{membership?.status === 'active' ? "ACTIVA" : "INACTIVA"}
					</Badge>
				</div>
				<CardHeader className="pt-10">
					<CardTitle className="text-3xl font-bold text-white flex items-center gap-3">
						<CreditCard className="h-8 w-8 text-[#00b3f3]" />
						Tu Membresía
					</CardTitle>
					<CardDescription className="text-white/60 text-lg">Estado actual de tu suscripción empresarial.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-8 pb-10">
					<div className="bg-white/5 rounded-3xl p-8 border border-white/10 text-center">
						<h3 className="text-4xl font-black text-white mb-2">{membership?.plan_name || "Plan Gratuito"}</h3>
						<p className="text-[#00b3f3] text-2xl font-bold">{membership ? formatPrice(membership.price) : "$0"} / mes</p>
						{membership?.renewal_date && (
							<p className="text-white/40 mt-4">Próxima renovación: {new Date(membership.renewal_date).toLocaleDateString()}</p>
						)}
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div className="space-y-4">
							<h4 className="text-white font-bold flex items-center gap-2 italic">
								<Sparkles className="h-5 w-5 text-amber-400" /> Beneficios Incluidos
							</h4>
							<ul className="space-y-3">
								{[
									"Sello 'Empresa Certificada'",
									"Panel Multiusuario (4 Pilotos)",
									"Perfil Destacado en Inicio",
									"Estadísticas Avanzadas",
									"Soporte Prioritario"
								].map(benefit => (
									<li key={benefit} className="text-white/70 flex items-center gap-2">
										<CheckCircle className="h-4 w-4 text-emerald-400" /> {benefit}
									</li>
								))}
							</ul>
						</div>
						<div className="flex flex-col justify-center items-center p-6 bg-[#00b3f3]/10 rounded-2xl border border-[#00b3f3]/20">
							<Zap className="h-12 w-12 text-[#00b3f3] mb-4" />
							<p className="text-white text-center font-medium">¿Necesitas ayuda con tu plan o facturación?</p>
							<Button variant="link" className="text-[#00b3f3] font-bold mt-2">Contactar Soporte</Button>
						</div>
					</div>
				</CardContent>
			</Card>

			{!membership && (
				<div className="text-center p-12 bg-white/5 rounded-3xl border border-white/10">
					<h3 className="text-2xl font-bold text-white mb-4">¿Aún no eres miembro PRO?</h3>
					<p className="text-white/60 mb-8 max-w-xl mx-auto">Únete al Plan Empresa para desbloquear todas las herramientas de gestión y aumentar tu visibilidad en el mercado chileno.</p>
					<Button className="bg-[#00b3f3] text-white h-14 px-10 text-lg rounded-2xl hover:scale-105 transition-all">Ver Planes de Suscripción</Button>
				</div>
			)}
		</div>
	);
};
