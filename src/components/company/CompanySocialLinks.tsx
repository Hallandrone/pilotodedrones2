import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Save, Instagram, Linkedin, Link as LinkIcon } from "lucide-react";

interface CompanySocialLinksProps {
	formData: any;
	handleInputChange: (field: string, value: any) => void;
	useInstagramUrl: boolean;
	setUseInstagramUrl: (val: boolean) => void;
	useLinkedInUrl: boolean;
	setUseLinkedInUrl: (val: boolean) => void;
	cleanSocialUsername: (val: string) => string;
	buildInstagramUrl: (val: string) => string;
	buildLinkedInUrl: (val: string) => string;
	handleSave: () => void;
	saving: boolean;
}

export const CompanySocialLinks = ({
	formData,
	handleInputChange,
	useInstagramUrl,
	setUseInstagramUrl,
	useLinkedInUrl,
	setUseLinkedInUrl,
	cleanSocialUsername,
	buildInstagramUrl,
	buildLinkedInUrl,
	handleSave,
	saving
}: CompanySocialLinksProps) => {
	return (
		<Card className="bg-white/10 backdrop-blur-xl border-2 border-[#00b3f3]/30 shadow-2xl rounded-3xl overflow-hidden">
			<CardHeader className="bg-gradient-to-r from-[#00b3f3]/10 to-transparent">
				<CardTitle className="text-2xl text-white">Redes Sociales</CardTitle>
				<CardDescription className="text-white/60">Conecta tu empresa con el mundo digital</CardDescription>
			</CardHeader>
			<CardContent className="p-8 space-y-8">
				{/* Instagram Section */}
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="h-10 w-10 rounded-xl bg-pink-500/20 flex items-center justify-center">
								<Instagram className="h-5 w-5 text-pink-400" />
							</div>
							<Label className="text-white font-semibold">Instagram</Label>
						</div>
						<div className="flex items-center gap-2">
							<Label className="text-xs text-white/40">Usar URL completa</Label>
							<Switch checked={useInstagramUrl} onCheckedChange={setUseInstagramUrl} />
						</div>
					</div>

					<div className="flex gap-3">
						{!useInstagramUrl && (
							<div className="bg-white/5 border border-white/10 rounded-xl flex items-center px-4 text-white/40 text-sm">
								@
							</div>
						)}
						<Input
							value={useInstagramUrl ? formData.instagram_url : formData.instagram_username}
							onChange={(e) => {
								const val = e.target.value;
								if (useInstagramUrl) {
									handleInputChange('instagram_url', val);
									handleInputChange('instagram_username', cleanSocialUsername(val));
								} else {
									handleInputChange('instagram_username', cleanSocialUsername(val));
									handleInputChange('instagram_url', buildInstagramUrl(val));
								}
							}}
							placeholder={useInstagramUrl ? "https://instagram.com/tu_empresa" : "tu_empresa"}
							className="bg-white/5 border-white/10 text-white rounded-xl h-12"
						/>
					</div>
				</div>

				{/* LinkedIn Section */}
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="h-10 w-10 rounded-xl bg-blue-600/20 flex items-center justify-center">
								<Linkedin className="h-5 w-5 text-blue-400" />
							</div>
							<Label className="text-white font-semibold">LinkedIn</Label>
						</div>
						<div className="flex items-center gap-2">
							<Label className="text-xs text-white/40">Usar URL completa</Label>
							<Switch checked={useLinkedInUrl} onCheckedChange={setUseLinkedInUrl} />
						</div>
					</div>

					<div className="flex gap-3">
						{!useLinkedInUrl && (
							<div className="bg-white/5 border border-white/10 rounded-xl flex items-center px-4 text-white/40 text-sm">
								/in/
							</div>
						)}
						<Input
							value={useLinkedInUrl ? formData.linkedin_url : formData.linkedin_username}
							onChange={(e) => {
								const val = e.target.value;
								if (useLinkedInUrl) {
									handleInputChange('linkedin_url', val);
									handleInputChange('linkedin_username', cleanSocialUsername(val));
								} else {
									handleInputChange('linkedin_username', cleanSocialUsername(val));
									handleInputChange('linkedin_url', buildLinkedInUrl(val));
								}
							}}
							placeholder={useLinkedInUrl ? "https://linkedin.com/company/tu_empresa" : "tu_empresa"}
							className="bg-white/5 border-white/10 text-white rounded-xl h-12"
						/>
					</div>
				</div>

				<div className="flex justify-end pt-4">
					<Button
						onClick={handleSave}
						disabled={saving}
						className="bg-gradient-to-r from-[#00b3f3] to-[#0099cc] text-white px-8 h-12 rounded-2xl hover:scale-105 transition-all"
					>
						{saving ? "Guardando..." : "Guardar Redes Sociales"}
						<Save className="ml-2 h-4 w-4" />
					</Button>
				</div>
			</CardContent>
		</Card>
	);
};
