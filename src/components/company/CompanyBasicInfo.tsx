import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";

interface CompanyBasicInfoProps {
	formData: any;
	handleInputChange: (field: string, value: any) => void;
	regions: string[];
	handleSave: () => void;
	saving: boolean;
}

export const CompanyBasicInfo = ({
	formData,
	handleInputChange,
	regions,
	handleSave,
	saving
}: CompanyBasicInfoProps) => {
	return (
		<Card className="bg-white/10 backdrop-blur-xl border-2 border-[#00b3f3]/30 shadow-2xl rounded-3xl overflow-hidden">
			<CardHeader className="bg-gradient-to-r from-[#00b3f3]/10 to-transparent">
				<CardTitle className="text-2xl text-white">Información Básica</CardTitle>
				<CardDescription className="text-white/60">Gestiona los datos principales de tu empresa</CardDescription>
			</CardHeader>
			<CardContent className="p-8 space-y-6">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div className="space-y-2">
						<Label className="text-white">Nombre de la Empresa</Label>
						<Input
							value={formData.company_name}
							onChange={(e) => handleInputChange('company_name', e.target.value)}
							className="bg-white/5 border-white/10 text-white"
						/>
					</div>
					<div className="space-y-2">
						<Label className="text-white">Años de Experiencia</Label>
						<Input
							type="number"
							value={formData.experience_years}
							onChange={(e) => handleInputChange('experience_years', parseInt(e.target.value))}
							className="bg-white/5 border-white/10 text-white"
						/>
					</div>
				</div>

				<div className="space-y-2">
					<Label className="text-white">Descripción / Bio</Label>
					<Textarea
						value={formData.description}
						onChange={(e) => handleInputChange('description', e.target.value)}
						className="bg-white/5 border-white/10 text-white min-h-[100px]"
						placeholder="Describe los servicios y trayectoria de tu empresa..."
					/>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div className="space-y-2">
						<Label className="text-white">Región</Label>
						<Select
							value={formData.region}
							onValueChange={(value) => handleInputChange('region', value)}
						>
							<SelectTrigger className="bg-white/5 border-white/10 text-white">
								<SelectValue placeholder="Selecciona una región" />
							</SelectTrigger>
							<SelectContent>
								{regions.map((region) => (
									<SelectItem key={region} value={region}>{region}</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2">
						<Label className="text-white">Ciudad / Ubicación</Label>
						<Input
							value={formData.location}
							onChange={(e) => handleInputChange('location', e.target.value)}
							className="bg-white/5 border-white/10 text-white"
						/>
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div className="space-y-2">
						<Label className="text-white">Teléfono de Contacto</Label>
						<Input
							value={formData.phone}
							onChange={(e) => handleInputChange('phone', e.target.value)}
							className="bg-white/5 border-white/10 text-white"
						/>
					</div>
					<div className="space-y-2">
						<Label className="text-white">Email Corporativo</Label>
						<Input
							value={formData.email}
							onChange={(e) => handleInputChange('email', e.target.value)}
							className="bg-white/5 border-white/10 text-white"
						/>
					</div>
				</div>

				<div className="space-y-2">
					<Label className="text-white">Sitio Web</Label>
					<Input
						value={formData.website}
						onChange={(e) => handleInputChange('website', e.target.value)}
						className="bg-white/5 border-white/10 text-white"
						placeholder="https://www.tuempresa.cl"
					/>
				</div>

				<div className="flex justify-end pt-4">
					<Button
						onClick={handleSave}
						disabled={saving}
						className="bg-gradient-to-r from-[#00b3f3] to-[#0099cc] text-white px-8 h-12 rounded-2xl hover:scale-105 transition-all"
					>
						{saving ? "Guardando..." : "Guardar Cambios"}
						<Save className="ml-2 h-4 w-4" />
					</Button>
				</div>
			</CardContent>
		</Card>
	);
};
