import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Search, CheckCircle2, XCircle, Award, Calendar, User, FileText, ArrowLeft, Loader2, ExternalLink } from "lucide-react";
import Logo from "@/components/ui/logo";

interface DiplomaDetails {
	student_name: string;
	course_title: string;
	course_date: string;
	certificate_number: string;
	instructor_name: string;
	city: string;
	id: string;
}

interface AssociatedProfile {
	id: string;
	full_name: string | null;
	public_profile_slug: string | null;
}

const DiplomaVerification = () => {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const [code, setCode] = useState(searchParams.get("codigo") || "");
	const [loading, setLoading] = useState(false);
	const [result, setResult] = useState<"initial" | "valid" | "invalid">("initial");
	const [diploma, setDiploma] = useState<DiplomaDetails | null>(null);
	const [profile, setProfile] = useState<AssociatedProfile | null>(null);

	useEffect(() => {
		const urlCode = searchParams.get("codigo");
		if (urlCode) {
			setCode(urlCode);
			handleVerify(urlCode);
		}
	}, [searchParams]);

	const handleVerify = async (verificationCode: string = code) => {
		if (!verificationCode.trim()) return;

		setLoading(true);
		setResult("initial");
		setDiploma(null);
		setProfile(null);

		try {
			// 1. Buscar el token y ver si tiene usuario asociado
			const { data: tokenData, error: tokenError } = await supabase
				.from("diploma_qr_tokens")
				.select("diploma_id, user_id")
				.eq("token", verificationCode.trim())
				.maybeSingle();

			if (tokenError || !tokenData) {
				setResult("invalid");
				setLoading(false);
				return;
			}

			// 2. Si NO tiene usuario asociado, redirigir al flujo de reclamo (QR)
			if (!tokenData.user_id) {
				console.log('⚠️ Token no asociado, redirigiendo al flujo de reclamo');
				navigate(`/qr/${verificationCode.trim()}`);
				return;
			}

			// 3. Si tiene usuario, buscar su perfil público
			if (tokenData.user_id) {
				const { data: profileData } = await supabase
					.from("profiles")
					.select("id, full_name, public_profile_slug")
					.eq("id", tokenData.user_id)
					.maybeSingle();

				if (profileData) {
					setProfile(profileData);
				}
			}

			// 3. Buscar datos del diploma
			const { data: diplomaData, error: diplomaError } = await supabase
				.from("diplomas")
				.select("*")
				.eq("id", tokenData.diploma_id)
				.single();

			if (diplomaError || !diplomaData) {
				setResult("invalid");
			} else {
				setDiploma(diplomaData);
				setResult("valid");
			}
		} catch (error) {
			console.error("Error verifying diploma:", error);
			setResult("invalid");
		} finally {
			setLoading(false);
		}
	};

	const formatDate = (dateString: string) => {
		if (!dateString) return "";
		return new Date(dateString + 'T00:00:00').toLocaleDateString('es-CL', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	};

	const goToProfile = () => {
		if (!profile) return;
		if (profile.public_profile_slug) {
			navigate(`/${profile.public_profile_slug}`);
		} else {
			navigate(`/pilot/${profile.id}`);
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-white flex flex-col items-center p-4 sm:p-8 font-sans">
			<div className="w-full max-w-3xl mx-auto space-y-8">

				{/* Header simple */}
				<div className="flex flex-col items-center justify-center space-y-4 pt-8 animate-fade-in text-center">
					<Logo size="xl" showText={false} className="scale-125" />
					<div className="space-y-2 mt-4">
						<h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
							Verificador de diplomas
						</h1>
						<p className="text-slate-500 text-lg max-w-md mx-auto">
							Ingrese el código alfanumérico de 8 caracteres que aparece en el diploma
						</p>
					</div>
				</div>

				{/* Buscador */}
				<Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-xl border-white/40 overflow-hidden ring-1 ring-black/5">
					<CardContent className="p-6 sm:p-10">
						<div className="flex flex-col sm:flex-row gap-4">
							<Input
								placeholder="Ej: A1B2C3D4"
								value={code}
								onChange={(e) => setCode(e.target.value.toUpperCase())}
								className="h-14 text-center sm:text-left text-xl tracking-widest uppercase font-mono bg-white border-slate-200 text-slate-900 placeholder:text-slate-300 focus:border-[#00b3f3] focus:ring-[#00b3f3]/20 rounded-xl transition-all shadow-sm"
								maxLength={8}
								onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
							/>
							<Button
								onClick={() => handleVerify()}
								disabled={loading || !code}
								className="h-14 px-8 text-lg font-semibold bg-[#00b3f3] hover:bg-[#0099cc] text-white rounded-xl shadow-[0_4px_14px_0_rgba(0,179,243,0.39)] hover:shadow-[0_6px_20px_rgba(0,179,243,0.23)] transition-all duration-300 min-w-[160px]"
							>
								{loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Search className="mr-2 h-5 w-5" />}
								Verificar
							</Button>
						</div>
					</CardContent>
				</Card>

				{/* Resultados */}
				{result === "valid" && diploma && (
					<Card className="border border-emerald-100 bg-white shadow-xl animate-in fade-in slide-in-from-bottom-8 duration-500 rounded-3xl overflow-hidden ring-1 ring-emerald-500/10">
						<CardHeader className="bg-emerald-50/50 border-b border-emerald-100 pb-6 pt-8">
							<div className="flex flex-col items-center text-center gap-3">
								<CheckCircle2 className="h-20 w-20 text-emerald-500 drop-shadow-sm" />
								<div>
									<CardTitle className="text-3xl font-bold text-slate-900 mb-2">Certificado Auténtico</CardTitle>
									<CardDescription className="text-emerald-700 font-medium text-lg">
										Este documento ha sido emitido oficialmente por Academia de Drones de Chile
									</CardDescription>
								</div>
							</div>
						</CardHeader>
						<CardContent className="p-8 space-y-6">
							<div className="grid gap-6 sm:grid-cols-2">
								<div className="space-y-4">
									<div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 hover:border-blue-100 transition-colors">
										<Label title="ESTUDIANTE" icon={<User className="h-4 w-4 text-[#00b3f3]" />} />
										<p className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 leading-tight">{diploma.student_name}</p>
									</div>
									<div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 hover:border-blue-100 transition-colors">
										<Label title="FECHA DE EMISIÓN" icon={<Calendar className="h-4 w-4 text-[#00b3f3]" />} />
										<p className="text-lg font-medium text-slate-700 mt-1 capitalize">{formatDate(diploma.course_date)}</p>
									</div>
								</div>
								<div className="space-y-4">
									<div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 h-full hover:border-blue-100 transition-colors">
										<Label title="CURSO CERTIFICADO" icon={<Award className="h-4 w-4 text-[#00b3f3]" />} />
										<p className="text-lg sm:text-xl font-bold text-[#00b3f3] mt-2 mb-1">{diploma.course_title}</p>
										<div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200">
											<FileText className="h-4 w-4 text-slate-400" />
											<span className="text-sm text-slate-500 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">N° {diploma.certificate_number}</span>
										</div>
									</div>
								</div>
							</div>

							{profile && (
								<div className="mt-4 animate-in fade-in zoom-in duration-500">
									<Button
										onClick={goToProfile}
										className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-lg flex items-center justify-between px-6 group transition-all"
									>
										<div className="flex items-center gap-4">
											<div className="h-10 w-10 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors">
												<User className="h-5 w-5" />
											</div>
											<div className="text-left">
												<span className="text-xs opacity-80 block">Ver perfil profesional de</span>
												<span className="font-bold text-lg">{profile.full_name || 'Piloto'}</span>
											</div>
										</div>
										<ExternalLink className="h-5 w-5 opacity-50 group-hover:opacity-100 transition-opacity" />
									</Button>
								</div>
							)}

							<div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100 text-center">
								<p className="text-blue-700 text-sm">
									Ciudad: <span className="font-semibold text-slate-900">{diploma.city}</span>
								</p>
							</div>
						</CardContent>
					</Card>
				)}

				{result === "invalid" && (
					<Card className="border border-red-100 bg-red-50/30 shadow-xl animate-in shake duration-500 rounded-3xl">
						<CardContent className="flex flex-col items-center justify-center p-12 text-center space-y-4">
							<XCircle className="h-24 w-24 text-red-500 drop-shadow-sm" />
							<div>
								<h3 className="text-2xl font-bold text-slate-900 mb-2">Documento No Encontrado</h3>
								<p className="text-slate-600 text-lg max-w-md">
									El código ingresado no corresponde a un certificado válido en nuestros registros. Verifique los caracteres e intente nuevamente.
								</p>
							</div>
						</CardContent>
					</Card>
				)}

				<div className="pt-8 flex justify-center pb-8 border-t border-slate-200/50">
					<Button
						variant="ghost"
						onClick={() => window.location.href = "https://www.pilotodedrones.cl"}
						className="text-slate-500 hover:text-slate-900 hover:bg-slate-100 gap-2 transition-all px-8 py-6 h-auto rounded-2xl"
					>
						<ArrowLeft className="h-4 w-4" />
						Volver al Inicio
					</Button>
				</div>
			</div>
		</div>
	);
};

const Label = ({ title, icon }: { title: string, icon: React.ReactNode }) => (
	<div className="flex items-center gap-2 text-slate-500 text-xs font-bold tracking-wider mb-1">
		{icon}
		{title}
	</div>
);

export default DiplomaVerification;
