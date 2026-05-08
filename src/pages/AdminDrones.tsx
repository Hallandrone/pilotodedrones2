import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
	Plus,
	Search,
	FileText,
	Trash2,
	Edit2,
	QrCode,
	Loader2,
	ExternalLink,
	Shield,
	Plane,
	FileSearch,
	Eye
} from "lucide-react";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

const sanitizeFilename = (name: string): string => {
	const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')).toLowerCase() : '';
	const base = name.slice(0, name.lastIndexOf('.') === -1 ? name.length : name.lastIndexOf('.'))
		.normalize('NFD').replace(/[̀-ͯ]/g, '')
		.replace(/[^a-zA-Z0-9-_]/g, '_')
		.slice(0, 60);
	return `${base || 'file'}${ext}`;
};
import { QRCodeSVG } from "qrcode.react";

interface Drone {
	id: string;
	serial_number: string;
	model: string;
	rpa_registration_number: string | null;
	invoice_url: string | null;
	insurance_url: string | null;
	rpa_document_url: string | null;
	qr_token: string;
	created_at: string;
}

const AdminDrones = () => {
	const [drones, setDrones] = useState<Drone[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isQRModalOpen, setIsQRModalOpen] = useState(false);
	const [selectedDrone, setSelectedDrone] = useState<Drone | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const { toast } = useToast();

	// Form state
	const [formData, setFormData] = useState({
		serial_number: "",
		model: "",
		rpa_registration_number: "",
	});
	const [files, setFiles] = useState<{ [key: string]: File | null }>({
		invoice: null,
		insurance: null,
		rpa: null,
	});

	useEffect(() => {
		fetchDrones();
	}, []);

	const fetchDrones = async () => {
		try {
			setLoading(true);
			const { data, error } = await supabase
				.from("drones")
				.select("*")
				.order("created_at", { ascending: false });

			if (error) throw error;
			setDrones(data || []);
		} catch (error: any) {
			toast({
				title: "Error",
				description: "No se pudieron cargar los drones",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	const handleOpenModal = (drone: Drone | null = null) => {
		if (drone) {
			setSelectedDrone(drone);
			setFormData({
				serial_number: drone.serial_number,
				model: drone.model,
				rpa_registration_number: drone.rpa_registration_number || "",
			});
		} else {
			setSelectedDrone(null);
			setFormData({
				serial_number: "",
				model: "",
				rpa_registration_number: "",
			});
		}
		setFiles({ invoice: null, insurance: null, rpa: null });
		setIsModalOpen(true);
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
		const file = e.target.files?.[0];
		if (!file) return;

		if (file.size > MAX_FILE_SIZE) {
			toast({
				title: "Archivo muy grande",
				description: `${file.name} supera los 5 MB`,
				variant: "destructive",
			});
			e.target.value = '';
			return;
		}
		if (!ACCEPTED_TYPES.includes(file.type)) {
			toast({
				title: "Tipo no permitido",
				description: "Solo se aceptan PDF, JPG, PNG o WEBP",
				variant: "destructive",
			});
			e.target.value = '';
			return;
		}
		setFiles(prev => ({ ...prev, [type]: file }));
	};

	const uploadFile = async (file: File, path: string) => {
		const { error } = await supabase.storage
			.from("drone_documents")
			.upload(path, file, { upsert: true, contentType: file.type });

		if (error) throw error;
		return path;
	};

	const openDocument = async (path: string) => {
		const { data, error } = await supabase.storage
			.from("drone_documents")
			.createSignedUrl(path, 60 * 5); // 5 min
		if (error || !data) {
			toast({
				title: "Error",
				description: "No se pudo abrir el documento",
				variant: "destructive",
			});
			return;
		}
		window.open(data.signedUrl, '_blank');
	};

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSaving(true);

		const newUploads: string[] = [];

		try {
			let invoiceUrl = selectedDrone?.invoice_url;
			let insuranceUrl = selectedDrone?.insurance_url;
			let rpaUrl = selectedDrone?.rpa_document_url;

			const droneId = selectedDrone?.id || crypto.randomUUID();
			const ts = Date.now();

			if (files.invoice) {
				const path = `${droneId}/invoice_${ts}_${sanitizeFilename(files.invoice.name)}`;
				invoiceUrl = await uploadFile(files.invoice, path);
				newUploads.push(path);
			}
			if (files.insurance) {
				const path = `${droneId}/insurance_${ts}_${sanitizeFilename(files.insurance.name)}`;
				insuranceUrl = await uploadFile(files.insurance, path);
				newUploads.push(path);
			}
			if (files.rpa) {
				const path = `${droneId}/rpa_${ts}_${sanitizeFilename(files.rpa.name)}`;
				rpaUrl = await uploadFile(files.rpa, path);
				newUploads.push(path);
			}

			const droneData = {
				serial_number: formData.serial_number,
				model: formData.model,
				rpa_registration_number: formData.rpa_registration_number || null,
				invoice_url: invoiceUrl,
				insurance_url: insuranceUrl,
				rpa_document_url: rpaUrl,
			};

			if (selectedDrone) {
				const { error } = await supabase
					.from("drones")
					.update(droneData)
					.eq("id", selectedDrone.id);
				if (error) throw error;
			} else {
				const { error } = await supabase
					.from("drones")
					.insert([{
						...droneData,
						id: droneId,
						qr_token: crypto.randomUUID()
					}]);
				if (error) throw error;
			}

			toast({
				title: "Éxito",
				description: `Dron ${selectedDrone ? "actualizado" : "registrado"} correctamente`,
			});
			setIsModalOpen(false);
			fetchDrones();
		} catch (error: any) {
			// Rollback: si falla la BD, borrar los archivos recién subidos
			if (newUploads.length > 0) {
				await supabase.storage.from("drone_documents").remove(newUploads);
			}
			toast({
				title: "Error",
				description: error.message || "No se pudo guardar el dron",
				variant: "destructive",
			});
		} finally {
			setIsSaving(false);
		}
	};

	const handleDelete = async (droneId: string) => {
		if (!confirm("¿Estás seguro de que quieres eliminar este dron? Se eliminarán también todos sus documentos.")) return;

		try {
			// Listar y eliminar todos los archivos del dron en el bucket
			const { data: filesInFolder } = await supabase.storage
				.from("drone_documents")
				.list(droneId);

			if (filesInFolder && filesInFolder.length > 0) {
				const paths = filesInFolder.map(f => `${droneId}/${f.name}`);
				await supabase.storage.from("drone_documents").remove(paths);
			}

			const { error } = await supabase.from("drones").delete().eq("id", droneId);
			if (error) throw error;

			toast({
				title: "Eliminado",
				description: "Dron y documentos eliminados correctamente",
			});
			fetchDrones();
		} catch (error: any) {
			toast({
				title: "Error",
				description: "No se pudo eliminar el dron",
				variant: "destructive",
			});
		}
	};

	const handleViewQR = (drone: Drone) => {
		setSelectedDrone(drone);
		setIsQRModalOpen(true);
	};

	const filteredDrones = drones.filter(
		(drone) =>
			drone.serial_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
			drone.model.toLowerCase().includes(searchQuery.toLowerCase())
	);

	const publicUrl = `${window.location.origin}/drone/${selectedDrone?.qr_token}`;

	return (
		<div className="space-y-6 animate-fade-in">
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div className="space-y-1">
					<h1 className="text-3xl font-bold text-white flex items-center gap-3">
						<Plane className="h-8 w-8 text-[#00b3f3]" />
						Gestión de Drones
					</h1>
					<p className="text-white/60">Administra la flota y documentación técnica</p>
				</div>
				<Button
					onClick={() => handleOpenModal()}
					className="bg-[#00b3f3] hover:bg-[#0099cc] text-white rounded-xl h-12 px-6 font-bold shadow-lg shadow-[#00b3f3]/20"
				>
					<Plus className="h-5 w-5 mr-2" />
					Nuevo Dron
				</Button>
			</div>

			<Card className="bg-white/5 border-white/10 backdrop-blur-sm overflow-hidden rounded-3xl">
				<CardHeader className="p-6 border-b border-white/10">
					<div className="relative">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 h-5 w-5" />
						<Input
							placeholder="Buscar por serie o modelo..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-10 h-12 bg-white/5 border-white/10 text-white rounded-xl focus:border-[#00b3f3] transition-all"
						/>
					</div>
				</CardHeader>
				<CardContent className="p-0">
					<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow className="border-white/10 hover:bg-transparent">
									<TableHead className="text-white/60">Dron / Modelo</TableHead>
									<TableHead className="text-white/60">Nº Serie</TableHead>
									<TableHead className="text-white/60">Registro RPA</TableHead>
									<TableHead className="text-white/60">Documentos</TableHead>
									<TableHead className="text-white/60 text-right">Acciones</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{loading ? (
									<TableRow>
										<TableCell colSpan={5} className="h-40 text-center">
											<Loader2 className="h-8 w-8 animate-spin text-[#00b3f3] mx-auto" />
											<p className="mt-2 text-white/40">Cargando drones...</p>
										</TableCell>
									</TableRow>
								) : filteredDrones.length === 0 ? (
									<TableRow>
										<TableCell colSpan={5} className="h-40 text-center">
											<FileSearch className="h-12 w-12 text-white/10 mx-auto mb-2" />
											<p className="text-white/40 font-medium">No se encontraron drones</p>
										</TableCell>
									</TableRow>
								) : (
									filteredDrones.map((drone) => (
										<TableRow key={drone.id} className="border-white/5 hover:bg-white/5">
											<TableCell className="font-medium text-white py-4">
												<div className="flex items-center gap-3">
													<div className="h-10 w-10 rounded-lg bg-[#00b3f3]/10 flex items-center justify-center">
														<Plane className="h-5 w-5 text-[#00b3f3]" />
													</div>
													{drone.model}
												</div>
											</TableCell>
											<TableCell className="text-white/80">{drone.serial_number}</TableCell>
											<TableCell className="text-white/80">{drone.rpa_registration_number || "N/A"}</TableCell>
											<TableCell>
												<div className="flex flex-wrap gap-2">
													{drone.invoice_url && (
														<button
															type="button"
															onClick={() => openDocument(drone.invoice_url!)}
															className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/5 text-[#00b3f3] border border-[#00b3f3]/20 text-xs font-medium hover:bg-[#00b3f3]/10 transition"
														>
															<Eye className="h-3 w-3" /> Factura
														</button>
													)}
													{drone.insurance_url && (
														<button
															type="button"
															onClick={() => openDocument(drone.insurance_url!)}
															className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/5 text-[#00b3f3] border border-[#00b3f3]/20 text-xs font-medium hover:bg-[#00b3f3]/10 transition"
														>
															<Eye className="h-3 w-3" /> Seguro
														</button>
													)}
													{drone.rpa_document_url && (
														<button
															type="button"
															onClick={() => openDocument(drone.rpa_document_url!)}
															className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/5 text-[#00b3f3] border border-[#00b3f3]/20 text-xs font-medium hover:bg-[#00b3f3]/10 transition"
														>
															<Eye className="h-3 w-3" /> DGAC
														</button>
													)}
													{!drone.invoice_url && !drone.insurance_url && !drone.rpa_document_url && (
														<span className="text-white/30 text-xs italic">Sin documentos</span>
													)}
												</div>
											</TableCell>
											<TableCell className="text-right">
												<div className="flex items-center justify-end gap-2">
													<Button
														variant="ghost"
														size="icon"
														onClick={() => handleViewQR(drone)}
														className="text-white/60 hover:text-[#00b3f3] hover:bg-[#00b3f3]/10"
														title="Ver Código QR"
													>
														<QrCode className="h-5 w-5" />
													</Button>
													<Button
														variant="ghost"
														size="icon"
														onClick={() => handleOpenModal(drone)}
														className="text-white/60 hover:text-white hover:bg-white/10"
													>
														<Edit2 className="h-5 w-5" />
													</Button>
													<Button
														variant="ghost"
														size="icon"
														onClick={() => handleDelete(drone.id)}
														className="text-white/60 hover:text-red-500 hover:bg-red-500/10"
													>
														<Trash2 className="h-5 w-5" />
													</Button>
												</div>
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</div>
				</CardContent>
			</Card>

			{/* Form Modal */}
			<Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
				<DialogContent className="bg-[#0f172a] border-white/10 text-white max-w-2xl overflow-y-auto max-h-[90vh]">
					<DialogHeader>
						<DialogTitle className="text-2xl font-bold flex items-center gap-2">
							{selectedDrone ? "Editar Dron" : "Nuevo Dron"}
						</DialogTitle>
						<DialogDescription className="text-white/60">
							Registra los datos técnicos y carga los documentos correspondientes.
						</DialogDescription>
					</DialogHeader>

					<form onSubmit={handleSave} className="space-y-6 py-4">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="model">Modelo</Label>
								<Input
									id="model"
									required
									value={formData.model}
									onChange={(e) => setFormData({ ...formData, model: e.target.value })}
									className="bg-white/5 border-white/10 rounded-xl h-12"
									placeholder="Ej: DJI Mavic 3 Enterprise"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="serial">Número de Serie</Label>
								<Input
									id="serial"
									required
									value={formData.serial_number}
									onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
									className="bg-white/5 border-white/10 rounded-xl h-12"
									placeholder="Ej: 1581F5GBA22..."
								/>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="rpa">Nº Registro RPA DGAC</Label>
							<Input
								id="rpa"
								value={formData.rpa_registration_number}
								onChange={(e) => setFormData({ ...formData, rpa_registration_number: e.target.value })}
								className="bg-white/5 border-white/10 rounded-xl h-12"
								placeholder="Ej: DAN-151-0123"
							/>
						</div>

						<div className="space-y-4 pt-4 border-t border-white/10">
							<h3 className="font-semibold text-lg flex items-center gap-2">
								<FileText className="h-5 w-5 text-[#00b3f3]" />
								Documentación Certificada
							</h3>

							<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
								<div className="space-y-3">
									<Label className="text-white/80">Factura de Compra</Label>
									<label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-white/10 rounded-2xl hover:border-[#00b3f3]/50 cursor-pointer transition-all bg-white/5">
										<Plus className="h-6 w-6 text-[#00b3f3] mb-2" />
										<span className="text-xs text-center text-white/40 font-medium">
											{files.invoice ? files.invoice.name : "Subir archivo"}
										</span>
										<input type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => handleFileChange(e, "invoice")} />
									</label>
								</div>

								<div className="space-y-3">
									<Label className="text-white/80">Póliza de Seguro</Label>
									<label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-white/10 rounded-2xl hover:border-[#00b3f3]/50 cursor-pointer transition-all bg-white/5">
										<Plus className="h-6 w-6 text-[#00b3f3] mb-2" />
										<span className="text-xs text-center text-white/40 font-medium">
											{files.insurance ? files.insurance.name : "Subir archivo"}
										</span>
										<input type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => handleFileChange(e, "insurance")} />
									</label>
								</div>

								<div className="space-y-3">
									<Label className="text-white/80">Tarjeta Registro RPA</Label>
									<label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-white/10 rounded-2xl hover:border-[#00b3f3]/50 cursor-pointer transition-all bg-white/5">
										<Plus className="h-6 w-6 text-[#00b3f3] mb-2" />
										<span className="text-xs text-center text-white/40 font-medium">
											{files.rpa ? files.rpa.name : "Subir archivo"}
										</span>
										<input type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => handleFileChange(e, "rpa")} />
									</label>
								</div>
							</div>
						</div>

						<DialogFooter className="pt-6">
							<Button
								type="button"
								variant="ghost"
								onClick={() => setIsModalOpen(false)}
								className="text-white/60 hover:text-white hover:bg-white/5 rounded-xl h-12"
							>
								Cancelar
							</Button>
							<Button
								type="submit"
								disabled={isSaving}
								className="bg-[#00b3f3] hover:bg-[#0099cc] text-white rounded-xl h-12 px-8 font-bold shadow-lg shadow-[#00b3f3]/20"
							>
								{isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
								{selectedDrone ? "Guardar Cambios" : "Registrar Dron"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			{/* QR Modal */}
			<Dialog open={isQRModalOpen} onOpenChange={setIsQRModalOpen}>
				<DialogContent className="bg-[#0f172a] border-white/10 text-white max-w-sm">
					<DialogHeader>
						<DialogTitle className="text-center font-bold text-xl">Código QR del Escaneo</DialogTitle>
					</DialogHeader>
					<div className="flex flex-col items-center justify-center gap-6 py-8">
						<div className="p-6 bg-white rounded-3xl shadow-2xl shadow-[#00b3f3]/20">
							<QRCodeSVG
								value={publicUrl}
								size={220}
								level="H"
								includeMargin={false}
							/>
						</div>
						<div className="text-center space-y-2">
							<p className="font-bold text-lg">{selectedDrone?.model}</p>
							<p className="text-white/60 text-sm font-mono">{selectedDrone?.serial_number}</p>
						</div>
						<Button
							className="w-full bg-white/10 hover:bg-white/20 text-white rounded-xl h-12 gap-2"
							onClick={() => window.open(publicUrl, '_blank')}
						>
							<ExternalLink className="h-4 w-4" />
							Ver Vista Pública
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
};

export default AdminDrones;
