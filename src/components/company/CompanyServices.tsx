import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Save, Plus, X } from "lucide-react";

interface CompanyServicesProps {
	formData: any;
	serviceOptions: string[];
	basicDrones: string[];
	intermediateDrones: string[];
	professionalDrones: string[];
	toggleService: (service: string) => void;
	toggleDroneType: (drone: string) => void;
	customService: string;
	setCustomService: (val: string) => void;
	addCustomService: () => void;
	customDrone: string;
	setCustomDrone: (val: string) => void;
	addCustomDrone: () => void;
	handleSave: () => void;
	saving: boolean;
	isCustomService: (service: string) => boolean;
	isCustomDrone: (drone: string) => boolean;
}

export const CompanyServices = ({
	formData,
	serviceOptions,
	basicDrones,
	intermediateDrones,
	professionalDrones,
	toggleService,
	toggleDroneType,
	customService,
	setCustomService,
	addCustomService,
	customDrone,
	setCustomDrone,
	addCustomDrone,
	handleSave,
	saving,
	isCustomService,
	isCustomDrone
}: CompanyServicesProps) => {
	return (
		<Card className="bg-white/10 backdrop-blur-xl border-2 border-[#00b3f3]/30 shadow-2xl rounded-3xl overflow-hidden">
			<CardHeader className="bg-gradient-to-r from-[#00b3f3]/10 to-transparent">
				<CardTitle className="text-2xl text-white">Servicios y Equipamiento</CardTitle>
				<CardDescription className="text-white/60">Define las capacidades aéreas de tu empresa</CardDescription>
			</CardHeader>
			<CardContent className="p-8 space-y-8">
				{/* Services Section */}
				<div className="space-y-4">
					<Label className="text-xl font-bold text-white">Servicios de Drones</Label>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
						{serviceOptions.map((service) => (
							<Button
								key={service}
								variant="outline"
								className={`justify-start h-auto py-3 px-4 border-2 transition-all rounded-xl ${formData.services.includes(service)
										? 'bg-[#00b3f3] border-[#00b3f3] text-white shadow-[0_0_15px_rgba(0,179,243,0.4)]'
										: 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
									}`}
								onClick={() => toggleService(service)}
							>
								{service}
							</Button>
						))}
					</div>

					<div className="flex gap-2 pt-2">
						<Input
							value={customService}
							onChange={(e) => setCustomService(e.target.value)}
							placeholder="Agregar otro servicio..."
							className="bg-white/5 border-white/10 text-white"
						/>
						<Button onClick={addCustomService} className="bg-[#00b3f3] hover:bg-[#0099cc] text-white">
							<Plus className="h-4 w-4" />
						</Button>
					</div>

					<div className="flex flex-wrap gap-2 pt-2">
						{formData.services.filter(isCustomService).map((service: string) => (
							<Badge key={service} variant="secondary" className="bg-[#00b3f3]/20 text-[#00b3f3] border-[#00b3f3]/30 py-1.5 px-3 gap-2">
								{service}
								<X className="h-3 w-3 cursor-pointer" onClick={() => toggleService(service)} />
							</Badge>
						))}
					</div>
				</div>

				{/* Drone Types Section */}
				<div className="space-y-4">
					<Label className="text-xl font-bold text-white">Tipos de Drones Disponibles</Label>
					<Accordion type="multiple" className="w-full space-y-4">
						<AccordionItem value="basic" className="border-2 border-white/10 rounded-2xl overflow-hidden bg-white/5">
							<AccordionTrigger className="px-6 hover:no-underline">
								<div className="flex items-center gap-4 text-white">
									<span className="font-semibold">Nivel Básico / Principiante</span>
									<Badge variant="outline" className="text-white/60 border-white/20">
										{formData.drone_types.filter((d: string) => basicDrones.includes(d)).length} seleccionados
									</Badge>
								</div>
							</AccordionTrigger>
							<AccordionContent className="px-6 pb-6 border-t border-white/5 pt-4">
								<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
									{basicDrones.map((drone) => (
										<Button
											key={drone}
											variant="outline"
											className={`justify-start h-auto py-3 px-4 border-2 transition-all rounded-xl ${formData.drone_types.includes(drone)
													? 'bg-[#00b3f3] border-[#00b3f3] text-white shadow-[0_0_15px_rgba(0,179,243,0.4)]'
													: 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
												}`}
											onClick={() => toggleDroneType(drone)}
										>
											{drone}
										</Button>
									))}
								</div>
							</AccordionContent>
						</AccordionItem>

						<AccordionItem value="intermediate" className="border-2 border-white/10 rounded-2xl overflow-hidden bg-white/5">
							<AccordionTrigger className="px-6 hover:no-underline">
								<div className="flex items-center gap-4 text-white">
									<span className="font-semibold">Nivel Intermedio / Avanzado</span>
									<Badge variant="outline" className="text-white/60 border-white/20">
										{formData.drone_types.filter((d: string) => intermediateDrones.includes(d)).length} seleccionados
									</Badge>
								</div>
							</AccordionTrigger>
							<AccordionContent className="px-6 pb-6 border-t border-white/5 pt-4">
								<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
									{intermediateDrones.map((drone) => (
										<Button
											key={drone}
											variant="outline"
											className={`justify-start h-auto py-3 px-4 border-2 transition-all rounded-xl ${formData.drone_types.includes(drone)
													? 'bg-[#00b3f3] border-[#00b3f3] text-white shadow-[0_0_15px_rgba(0,179,243,0.4)]'
													: 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
												}`}
											onClick={() => toggleDroneType(drone)}
										>
											{drone}
										</Button>
									))}
								</div>
							</AccordionContent>
						</AccordionItem>

						<AccordionItem value="professional" className="border-2 border-white/10 rounded-2xl overflow-hidden bg-white/5">
							<AccordionTrigger className="px-6 hover:no-underline">
								<div className="flex items-center gap-4 text-white">
									<span className="font-semibold">Nivel Profesional / Industrial</span>
									<Badge variant="outline" className="text-white/60 border-white/20">
										{formData.drone_types.filter((d: string) => professionalDrones.includes(d)).length} seleccionados
									</Badge>
								</div>
							</AccordionTrigger>
							<AccordionContent className="px-6 pb-6 border-t border-white/5 pt-4">
								<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
									{professionalDrones.map((drone) => (
										<Button
											key={drone}
											variant="outline"
											className={`justify-start h-auto py-3 px-4 border-2 transition-all rounded-xl ${formData.drone_types.includes(drone)
													? 'bg-[#00b3f3] border-[#00b3f3] text-white shadow-[0_0_15px_rgba(0,179,243,0.4)]'
													: 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
												}`}
											onClick={() => toggleDroneType(drone)}
										>
											{drone}
										</Button>
									))}
								</div>
							</AccordionContent>
						</AccordionItem>
					</Accordion>

					<div className="flex gap-2 pt-2">
						<Input
							value={customDrone}
							onChange={(e) => setCustomDrone(e.target.value)}
							placeholder="Agregar otro modelo..."
							className="bg-white/5 border-white/10 text-white"
						/>
						<Button onClick={addCustomDrone} className="bg-[#00b3f3] hover:bg-[#0099cc] text-white">
							<Plus className="h-4 w-4" />
						</Button>
					</div>

					<div className="flex flex-wrap gap-2 pt-2">
						{formData.drone_types.filter(isCustomDrone).map((drone: string) => (
							<Badge key={drone} variant="secondary" className="bg-[#00b3f3]/20 text-[#00b3f3] border-[#00b3f3]/30 py-1.5 px-3 gap-2">
								{drone}
								<X className="h-3 w-3 cursor-pointer" onClick={() => toggleDroneType(drone)} />
							</Badge>
						))}
					</div>
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
