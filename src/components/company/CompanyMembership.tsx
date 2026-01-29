import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { CreditCard, CheckCircle, Zap, Building, AlertCircle, Loader2, Shield } from "lucide-react";

declare global {
	interface Window {
		MercadoPago: any;
	}
}

interface Membership {
	plan_name: string;
	status: string;
	renewal_date: string | null;
	price: number;
}

export const CompanyMembership = () => {
	const [membership, setMembership] = useState<Membership | null>(null);
	const [loading, setLoading] = useState(true);
	const [showBricks, setShowBricks] = useState(false);
	const [showCancelDialog, setShowCancelDialog] = useState(false);
	const [cancelling, setCancelling] = useState(false);
	const [paymentMode, setPaymentMode] = useState<'subscription' | 'single' | null>(null);
	const [bricksController, setBricksController] = useState<any>(null);
	const { toast } = useToast();

	const planEmpresa = {
		id: 'empresa',
		name: 'Plan Empresa',
		price: 39990,
	};

	useEffect(() => {
		loadMembership(true);

		// SUSCRIPCIÓN REALTIME
		const setupRealtime = async () => {
			const { data: { user } } = await supabase.auth.getUser();
			if (!user) return;

			const channel = supabase
				.channel(`company_sub_updates_${user.id}`)
				.on('postgres_changes', {
					event: '*',
					schema: 'public',
					table: 'user_subscriptions',
					filter: `user_id=eq.${user.id}`
				}, () => {
					loadMembership(false);
				})
				.subscribe();

			return () => { supabase.removeChannel(channel); };
		};

		setupRealtime();

		if (!window.MercadoPago) {
			const script = document.createElement('script');
			script.src = 'https://sdk.mercadopago.com/js/v2';
			script.async = true;
			document.body.appendChild(script);
			return () => {
				if (document.body.contains(script)) {
					document.body.removeChild(script);
				}
			};
		}
	}, []);

	const loadMembership = async (isInitial = false) => {
		try {
			if (isInitial) setLoading(true);
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
			if (isInitial) setLoading(false);
		}
	};

	const handleSubscribe = () => {
		if (membership?.status === 'active') {
			toast({
				title: "Suscripción Activa",
				description: "Ya tienes una suscripción activa.",
			});
			return;
		}

		if (!window.MercadoPago) {
			toast({
				title: "Cargando sistema de pago",
				description: "Por favor espera un momento e intenta de nuevo.",
			});
			return;
		}
		setPaymentMode(null);
		setShowBricks(true);
	};

	const handleCancelSubscription = async () => {
		try {
			setCancelling(true);
			const { data: { user } } = await supabase.auth.getUser();
			if (!user) return;

			const { error } = await supabase
				.from('user_subscriptions')
				.update({
					status: 'cancelled',
					updated_at: new Date().toISOString()
				})
				.eq('user_id', user.id);

			if (error) throw error;

			toast({
				title: "Suscripción cancelada",
				description: "Tu plan se ha cancelado pero seguirá activo hasta el final del periodo.",
			});

			setShowCancelDialog(false);
			loadMembership();
		} catch (error: any) {
			console.error('Error cancelling subscription:', error);
			toast({
				title: "Error",
				description: "No se pudo cancelar la suscripción.",
				variant: "destructive",
			});
		} finally {
			setCancelling(false);
		}
	};

	useEffect(() => {
		let interval: any;

		if (showBricks && window.MercadoPago && paymentMode) {
			const checkAndInit = () => {
				const container = document.getElementById("cardPaymentBrick_container_company");
				if (container) {
					console.log("Company Brick container found, init mode:", paymentMode);
					clearInterval(interval);
					renderCardPaymentBrick(paymentMode);
				}
			};

			const renderCardPaymentBrick = async (mode: 'subscription' | 'single') => {
				if (bricksController) {
					try { bricksController.unmount(); } catch (e) { }
				}

				const mp = new window.MercadoPago(import.meta.env.VITE_MERCADOPAGO_PUBLISHABLE_KEY || 'APP_USR-08ad2fd4-0eb3-4231-89e0-76c03c3bff5c', {
					locale: 'es-CL'
				});
				const bricksBuilder = mp.bricks();
				const { data: { user } } = await supabase.auth.getUser();

				const settings = {
					initialization: {
						amount: planEmpresa.price,
						payer: {
							email: user?.email,
						},
					},
					customization: {
						visual: {
							style: {
								theme: "default",
							},
						},
						paymentMethods: {
							ticket: mode === 'single' ? "all" : undefined,
							bankTransfer: mode === 'single' ? "all" : undefined,
							creditCard: "all",
							debitCard: mode === 'single' ? "all" : undefined,
							mercadoPago: mode === 'single' ? "all" : undefined,
						}
					},
					callbacks: {
						onReady: () => {
							console.log("Brick ready");
						},
						onSubmit: ({ selectedPaymentMethod, formData }: any) => {
							return new Promise((resolve, reject) => {
								setLoading(true);

								const action = (mode === 'subscription' && (selectedPaymentMethod === 'credit_card' || selectedPaymentMethod === 'debit_card'))
									? 'create_subscription'
									: 'process_payment';

								const body: any = {
									action,
									planId: planEmpresa.id,
									price: planEmpresa.price,
									payerEmail: formData.payer.email
								};

								if (action === 'create_subscription') {
									body.cardTokenId = formData.token;
								} else {
									body.formData = formData;
								}

								supabase.functions.invoke('mercadopago-api', { body })
									.then(({ data, error }) => {
										if (error || data.error || !data.success) {
											const status = data?.status;
											let errorMsg = data?.message || error?.message || "No se pudo procesar el pago.";

											if (status === 'rejected') {
												errorMsg = "Pago rechazado. Por favor usa otro medio de pago.";
											}

											toast({
												title: "Error en el pago",
												description: errorMsg,
												variant: "destructive"
											});
											reject();
										} else {
											toast({
												title: "¡Solicitud Procesada!",
												description: mode === 'subscription'
													? "Tu suscripción ha sido creada. Se activará en cuanto se confirme el primer pago."
													: "Tu pago está siendo procesado. El plan empresa se activará en breve.",
											});
											setShowBricks(false);
											resolve(data);
										}
									})
									.catch((err) => {
										console.error("Payment error:", err);
										reject();
									})
									.finally(() => setLoading(false));
							});
						},
						onError: (error: any) => {
							console.error("Brick error:", error);
							toast({
								title: "Error",
								description: "Hubo un problema al cargar el formulario de pago",
								variant: "destructive"
							});
						},
					},
				};

				const controller = await bricksBuilder.create("payment", "cardPaymentBrick_container_company", settings);
				setBricksController(controller);
			};

			let attempts = 0;
			interval = setInterval(() => {
				attempts++;
				checkAndInit();
				if (attempts > 30) clearInterval(interval);
			}, 150);

			checkAndInit();
		} else if (!showBricks && bricksController) {
			console.log("Unmounting company brick...");
			try { bricksController.unmount(); } catch (e) { }
			setBricksController(null);
		}

		return () => {
			if (interval) clearInterval(interval);
		};
	}, [showBricks, paymentMode]);

	const formatPrice = (price: number) => {
		return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(price);
	};

	if (loading) return <div className="text-white p-8">Cargando...</div>;

	return (
		<div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-20">
			{/* Current Plan Card */}
			{membership && (
				<Card className="bg-[#0b485d] border-2 border-[#00b3f3]/30 shadow-2xl rounded-3xl overflow-hidden relative isolate">
					<div className="absolute top-0 right-0 p-6">
						<Badge className={
							membership?.status === 'active'
								? "bg-emerald-500 text-white"
								: membership?.status === 'pending_payment'
									? "bg-amber-500 text-white"
									: "bg-red-500 text-white"
						}>
							{membership?.status === 'active' ? "ACTIVA" : membership?.status === 'pending_payment' ? "PENDIENTE" : "INACTIVA"}
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
								<div className="mt-4 space-y-1">
									<p className="text-white/60">
										{membership.status === 'active' ? 'Próximo pago:' : 'Acceso hasta:'}
									</p>
									<p className="text-white font-medium text-lg">
										{new Date(membership.renewal_date).toLocaleDateString()}
									</p>
								</div>
							)}

							{membership.status === 'active' && (
								<div className="mt-8 pt-6 border-t border-white/10">
									<Button
										variant="ghost"
										className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
										onClick={() => setShowCancelDialog(true)}
									>
										Cancelar Suscripción
									</Button>
								</div>
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
				{/* Plan Empresa Card */}
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
								"Validación de Certificados",
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
						{membership && membership.status === 'active' ? (
							<Button disabled className="w-full bg-emerald-500/20 text-emerald-500 font-bold h-14 rounded-2xl border border-emerald-500/50 cursor-not-allowed">
								PLAN ACTIVO
							</Button>
						) : (
							<Button
								onClick={handleSubscribe}
								className="w-full bg-[#00b3f3] hover:bg-[#0099cc] text-white font-black h-14 rounded-2xl shadow-lg shadow-[#00b3f3]/20 hover:scale-[1.02] transition-all"
							>
								{membership?.status === 'cancelled' ? 'RENOVAR SUSCRIPCIÓN' : 'SUSCRIBIRME AHORA'}
							</Button>
						)}
					</div>
				</Card>

				{/* Info Card */}
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

			{/* Modal de Pago (Bricks) para Empresa */}
			<Dialog open={showBricks} onOpenChange={(open) => {
				if (!open) {
					if (bricksController) {
						try { bricksController.unmount(); } catch (e) { }
						setBricksController(null);
					}
					setPaymentMode(null);
				}
				setShowBricks(open);
			}}>
				<DialogContent className="bg-white text-black max-w-md p-0 overflow-hidden rounded-2xl shadow-2xl border-0">
					<div className="p-6 bg-[#00b3f3] text-white">
						<div className="flex justify-between items-center">
							<DialogHeader className="text-left">
								<DialogTitle className="text-xl font-bold text-white">
									Plan Empresa
								</DialogTitle>
								<DialogDescription className="text-blue-50 text-sm">
									Escoge la modalidad de pago
								</DialogDescription>
							</DialogHeader>
							<div className="text-right">
								<span className="text-2xl font-black">{formatPrice(planEmpresa.price)}</span>
								<p className="text-xs text-blue-50">/mes</p>
							</div>
						</div>
					</div>

					<div className="p-6 bg-gray-50 flex flex-col gap-4">
						{!paymentMode ? (
							<>
								<button
									onClick={() => setPaymentMode('subscription')}
									className="flex items-center gap-4 p-4 bg-white border-2 border-transparent hover:border-[#00b3f3] rounded-2xl shadow-sm transition-all group text-left w-full"
								>
									<div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center text-[#00b3f3] group-hover:bg-[#00b3f3] group-hover:text-white transition-colors">
										<Zap className="h-6 w-6" />
									</div>
									<div className="text-left flex-1">
										<p className="font-bold text-gray-900">Suscripción Recurrente</p>
										<p className="text-xs text-gray-500">Solo Crédito. Cobros automáticos mensuales.</p>
									</div>
								</button>

								<button
									onClick={() => setPaymentMode('single')}
									className="flex items-center gap-4 p-4 bg-white border-2 border-transparent hover:border-[#074b5b] rounded-2xl shadow-sm transition-all group text-left w-full"
								>
									<div className="h-12 w-12 rounded-xl bg-cyan-50 flex items-center justify-center text-[#074b5b] group-hover:bg-[#074b5b] group-hover:text-white transition-colors">
										<Building className="h-6 w-6" />
									</div>
									<div className="text-left flex-1">
										<p className="font-bold text-gray-900">Pago Único Mensual</p>
										<p className="text-xs text-gray-500">Débito, Prepago o Efectivo. Sin renovación auto.</p>
									</div>
								</button>

								<div className="mt-2 flex items-center gap-2 text-[10px] text-gray-400 justify-center uppercase tracking-widest font-semibold">
									<Shield className="h-3 w-3" />
									Pago Seguro Protegido por Mercado Pago
								</div>
							</>
						) : (
							<div className="min-h-[400px] flex flex-col">
								<div className="flex items-center justify-between mb-4">
									<button
										onClick={() => {
											if (bricksController) {
												try { bricksController.unmount(); } catch (e) { }
												setBricksController(null);
											}
											setPaymentMode(null);
										}}
										className="text-xs text-[#00b3f3] font-bold hover:underline flex items-center gap-1"
									>
										← Cambiar modalidad
									</button>
									<Badge variant="outline" className="text-[10px] uppercase border-blue-200 text-[#00b3f3]">
										{paymentMode === 'subscription' ? 'Suscripción' : 'Pago Único'}
									</Badge>
								</div>

								{!bricksController && (
									<div className="flex flex-col items-center justify-center flex-1 gap-2 text-gray-400">
										<Loader2 className="h-8 w-8 animate-spin text-[#00b3f3]" />
										<p className="text-sm font-medium text-gray-600">Conectando con pasarela...</p>
									</div>
								)}
								<div id="cardPaymentBrick_container_company" className="w-full"></div>
							</div>
						)}
					</div>
				</DialogContent>
			</Dialog>

			{/* Dialog de Cancelación */}
			<Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
				<DialogContent className="bg-[#212121] border-[#333333] text-white max-w-sm">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2 text-xl">
							<AlertCircle className="h-6 w-6 text-red-500" />
							¿Cancelar suscripción?
						</DialogTitle>
						<DialogDescription className="text-white/60 pt-2">
							Al cancelar, seguirás teniendo acceso a todos los beneficios hasta el final de tu ciclo de facturación actual.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter className="gap-2 sm:gap-0 mt-4">
						<Button
							variant="ghost"
							onClick={() => setShowCancelDialog(false)}
							className="hover:bg-white/10 text-white"
						>
							Volver
						</Button>
						<Button
							variant="destructive"
							onClick={handleCancelSubscription}
							disabled={cancelling}
							className="bg-red-600 hover:bg-red-700"
						>
							{cancelling ? 'Cancelando...' : 'Sí, cancelar'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
};
