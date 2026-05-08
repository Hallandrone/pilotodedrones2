import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ShieldCheck, Plane, AlertCircle, Home, FileText, Receipt, Shield } from "lucide-react";
import Logo from "@/components/ui/logo";
import { Button } from "@/components/ui/button";

interface DronePublicInfo {
	model: string;
	serial_number: string;
	rpa_registration_number: string | null;
	invoice_url: string | null;
	insurance_url: string | null;
	rpa_document_url: string | null;
}

const DronePublicView = () => {
	const { token } = useParams<{ token: string }>();
	const [drone, setDrone] = useState<DronePublicInfo | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(false);

	useEffect(() => {
		fetchDronePublicInfo();
	}, [token]);

	const fetchDronePublicInfo = async () => {
		try {
			setLoading(true);
			setError(false);

			if (!token) {
				setError(true);
				return;
			}

			const { data, error: dbError } = await supabase
				.from("drones")
				.select("model, serial_number, rpa_registration_number, invoice_url, insurance_url, rpa_document_url")
				.eq("qr_token", token)
				.single();

			if (dbError || !data) throw dbError;

			setDrone(data);
		} catch (err) {
			console.error("Error fetching drone info:", err);
			setError(true);
		} finally {
			setLoading(false);
		}
	};

	const openDocument = async (path: string) => {
		const { data } = await supabase.storage
			.from("drone_documents")
			.createSignedUrl(path, 60 * 5);
		if (data?.signedUrl) window.open(data.signedUrl, '_blank');
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
				<div className="text-center space-y-4">
					<Loader2 className="h-10 w-10 animate-spin text-[#00b3f3] mx-auto" />
					<p className="text-white/60 animate-pulse">Consultando registro DGAC...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-[#020617] relative overflow-hidden flex flex-col items-center justify-center p-4 font-inter">
			{/* Background decor */}
			<div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjAzIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20 pointer-events-none"></div>
			<div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#00b3f3]/10 rounded-full blur-[120px] pointer-events-none"></div>
			<div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#00b3f3]/5 rounded-full blur-[120px] pointer-events-none"></div>

			<div className="w-full max-w-md relative z-10 space-y-8 animate-fade-in">
				<div className="flex justify-center">
					<Logo size="xl" className="filter drop-shadow-[0_0_15px_rgba(0,179,243,0.3)]" />
				</div>

				{error ? (
					<Card className="bg-white/5 border-red-500/20 backdrop-blur-xl rounded-3xl overflow-hidden shadow-2xl">
						<CardContent className="p-8 text-center space-y-6">
							<div className="h-16 w-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
								<AlertCircle className="h-8 w-8 text-red-500" />
							</div>
							<div className="space-y-2">
								<h2 className="text-2xl font-bold text-white">Dron no encontrado</h2>
								<p className="text-white/60">El código escaneado no coincide con ningún registro activo en nuestra plataforma.</p>
							</div>
							<Button asChild className="w-full bg-white/10 hover:bg-white/20 text-white rounded-xl h-12">
								<Link to="/"><Home className="h-4 w-4 mr-2" /> Ir al Inicio</Link>
							</Button>
						</CardContent>
					</Card>
				) : (
					<div className="space-y-6">
						<Card className="bg-white/5 border-white/10 backdrop-blur-xl rounded-[2.5rem] overflow-hidden shadow-2xl relative border-t-[#00b3f3]/30">
							<div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-[#00b3f3] to-transparent"></div>
							<CardContent className="p-8 pt-10">
								<div className="flex flex-col items-center text-center space-y-6">
									<div className="h-20 w-20 bg-[#00b3f3]/10 rounded-3xl flex items-center justify-center transform rotate-3 shadow-inner">
										<Plane className="h-10 w-10 text-[#00b3f3]" />
									</div>

									<div className="space-y-1 w-full">
										<span className="text-[#00b3f3] text-xs font-bold tracking-widest uppercase opacity-70">Certificación Activa</span>
										<h1 className="text-3xl font-black text-white tracking-tight leading-none italic uppercase">
											Información del Dron
										</h1>
									</div>

									<div className="w-full grid gap-4 pt-4">
										<div className="bg-white/5 p-5 rounded-2xl border border-white/5 transition-all hover:bg-white/10 text-left">
											<p className="text-white/40 text-[10px] uppercase font-bold tracking-wider mb-1">Modelo de Aeronave</p>
											<p className="text-white text-xl font-bold">{drone?.model}</p>
										</div>

										<div className="bg-white/5 p-5 rounded-2xl border border-white/5 transition-all hover:bg-white/10 text-left">
											<p className="text-white/40 text-[10px] uppercase font-bold tracking-wider mb-1">Número de Serie</p>
											<p className="text-white text-xl font-mono font-bold tracking-wider">{drone?.serial_number}</p>
										</div>

										{drone?.rpa_registration_number && (
											<div className="bg-white/5 p-5 rounded-2xl border border-white/5 transition-all hover:bg-white/10 text-left">
												<p className="text-white/40 text-[10px] uppercase font-bold tracking-wider mb-1">Registro RPA DGAC</p>
												<p className="text-white text-xl font-mono font-bold tracking-wider">{drone.rpa_registration_number}</p>
											</div>
										)}
									</div>

									{(drone?.invoice_url || drone?.insurance_url || drone?.rpa_document_url) && (
										<div className="w-full pt-2 space-y-3">
											<p className="text-white/40 text-[10px] uppercase font-bold tracking-wider text-left">Documentación Certificada</p>
											<div className="grid gap-2">
												{drone?.rpa_document_url && (
													<button
														type="button"
														onClick={() => openDocument(drone.rpa_document_url!)}
														className="flex items-center gap-3 w-full p-3 bg-white/5 hover:bg-[#00b3f3]/10 border border-white/5 hover:border-[#00b3f3]/30 rounded-xl transition-all text-left"
													>
														<div className="h-9 w-9 rounded-lg bg-[#00b3f3]/10 flex items-center justify-center flex-shrink-0">
															<FileText className="h-4 w-4 text-[#00b3f3]" />
														</div>
														<span className="text-white text-sm font-medium">Tarjeta de Registro DGAC</span>
													</button>
												)}
												{drone?.insurance_url && (
													<button
														type="button"
														onClick={() => openDocument(drone.insurance_url!)}
														className="flex items-center gap-3 w-full p-3 bg-white/5 hover:bg-[#00b3f3]/10 border border-white/5 hover:border-[#00b3f3]/30 rounded-xl transition-all text-left"
													>
														<div className="h-9 w-9 rounded-lg bg-[#00b3f3]/10 flex items-center justify-center flex-shrink-0">
															<Shield className="h-4 w-4 text-[#00b3f3]" />
														</div>
														<span className="text-white text-sm font-medium">Póliza de Seguro</span>
													</button>
												)}
												{drone?.invoice_url && (
													<button
														type="button"
														onClick={() => openDocument(drone.invoice_url!)}
														className="flex items-center gap-3 w-full p-3 bg-white/5 hover:bg-[#00b3f3]/10 border border-white/5 hover:border-[#00b3f3]/30 rounded-xl transition-all text-left"
													>
														<div className="h-9 w-9 rounded-lg bg-[#00b3f3]/10 flex items-center justify-center flex-shrink-0">
															<Receipt className="h-4 w-4 text-[#00b3f3]" />
														</div>
														<span className="text-white text-sm font-medium">Factura de Compra</span>
													</button>
												)}
											</div>
										</div>
									)}

									<div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 rounded-full border border-green-500/20 mt-4">
										<ShieldCheck className="h-4 w-4 text-green-500" />
										<span className="text-green-500 text-xs font-bold">Registro Validado por Academia Drone Chile</span>
									</div>
								</div>
							</CardContent>
						</Card>

						<p className="text-center text-white/30 text-[10px] uppercase font-medium tracking-[0.2em] px-8">
							Este documento certifica la legalidad del equipo en concordancia con la normativa aeronáutica vigente.
						</p>
					</div>
				)}
			</div>

			<footer className="mt-12 text-white/20 text-[9px] uppercase tracking-widest font-black">
				Powered by Hallan Holding & PilotodeDrones.cl
			</footer>
		</div>
	);
};

export default DronePublicView;
