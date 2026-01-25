import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, Upload, Trash2, Save, Globe } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface CompanyLogoBannerProps {
	company: any;
	formData: any;
	handleLogoSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
	uploadingLogo: boolean;
	DEFAULT_AVATAR_URL: string;
	publicProfileSlug: string;
	handleSlugChange: (val: string) => void;
	handleSlugVerification: () => void;
	checkingSlug: boolean;
	slugAvailable: boolean | null;
	slugFeedback: { type: 'success' | 'error'; text: string } | null;
	appBaseUrl: string;
	handleSave: () => void;
	saving: boolean;
}

export const CompanyLogoBanner = ({
	company,
	formData,
	handleLogoSelect,
	uploadingLogo,
	DEFAULT_AVATAR_URL,
	publicProfileSlug,
	handleSlugChange,
	handleSlugVerification,
	checkingSlug,
	slugAvailable,
	slugFeedback,
	appBaseUrl,
	handleSave,
	saving
}: CompanyLogoBannerProps) => {
	return (
		<div className="space-y-6">
			<Card className="bg-white/10 backdrop-blur-xl border-2 border-[#00b3f3]/30 shadow-2xl rounded-3xl overflow-hidden">
				<div className="h-48 bg-gradient-to-r from-[#083b4e] to-[#00b3f3]/20 relative">
					<div className="absolute -bottom-12 left-8 flex items-end gap-6">
						<div className="relative group">
							<Avatar className="h-32 w-32 ring-4 ring-[#083b4e] shadow-2xl">
								<AvatarImage src={company?.logo_url || DEFAULT_AVATAR_URL} />
								<AvatarFallback className="bg-[#083b4e] text-white">
									{company?.company_name?.[0] || 'E'}
								</AvatarFallback>
							</Avatar>
							<label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
								<Camera className="h-8 w-8 text-white" />
								<input type="file" className="hidden" onChange={handleLogoSelect} accept="image/*" />
							</label>
							{uploadingLogo && (
								<div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full">
									<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
								</div>
							)}
						</div>
					</div>
				</div>
				<CardContent className="pt-16 pb-8 px-8">
					<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
						<div>
							<h2 className="text-3xl font-bold text-white mb-1">{formData.company_name}</h2>
							<p className="text-white/60 flex items-center gap-2">
								<Globe className="h-4 w-4" />
								{formData.website || "Sitio web no configurado"}
							</p>
						</div>
						<div className="flex gap-3">
							<Button
								onClick={handleSave}
								disabled={saving}
								className="bg-gradient-to-r from-[#00b3f3] to-[#0099cc] text-white px-8 h-12 rounded-2xl hover:scale-105 transition-all"
							>
								{saving ? "Guardando..." : "Guardar Identidad"}
								<Save className="ml-2 h-4 w-4" />
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Public Profile Link Section */}
			<Card className="bg-white/10 backdrop-blur-xl border-2 border-emerald-500/30 shadow-2xl rounded-3xl overflow-hidden">
				<CardHeader>
					<CardTitle className="text-xl text-white">URL de tu Perfil Público</CardTitle>
					<CardDescription className="text-white/60">Este será el enlace que compartirás con tus clientes</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex flex-col sm:flex-row gap-3">
						<div className="flex-1 flex items-center bg-white/5 border border-white/10 h-12 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500/50 transition-all">
							<span className="pl-4 text-white/40 text-sm whitespace-nowrap bg-white/5 h-full flex items-center border-r border-white/10 px-3">
								{appBaseUrl}/
							</span>
							<Input
								value={publicProfileSlug}
								onChange={(e) => handleSlugChange(e.target.value)}
								className="bg-transparent border-none text-white h-full grow focus-visible:ring-0 focus-visible:ring-offset-0"
								placeholder="nombre-empresa"
							/>
						</div>
						<Button
							onClick={handleSlugVerification}
							disabled={checkingSlug}
							className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white border-2 border-emerald-500/30 h-12 rounded-xl px-6"
						>
							{checkingSlug ? "Verificando..." : "Verificar Disponibilidad"}
						</Button>
					</div>

					{slugFeedback && (
						<div className={`p-4 rounded-xl flex items-start gap-3 ${slugFeedback.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'
							}`}>
							<Badge className={slugFeedback.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}>
								{slugFeedback.type === 'success' ? 'Disponible' : 'No disponible'}
							</Badge>
							<p className={`text-sm ${slugFeedback.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
								{slugFeedback.text}
							</p>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
};
