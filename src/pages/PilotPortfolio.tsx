import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
	ArrowLeft,
	Upload,
	Image as ImageIcon,
	Video,
	Trash2,
	Plus,
	ArrowRight,
	ExternalLink,
	Youtube,
	MonitorPlay,
	Loader2
} from "lucide-react";
import { useSubscriptionPlan } from "@/hooks/useSubscriptionPlan";
import { UpgradeModal } from "@/components/subscription/UpgradeModal";
import Logo from "@/components/ui/logo";
import imageCompression from 'browser-image-compression';

interface PortfolioItem {
	id: string;
	type: 'image' | 'video';
	url: string;
	thumbnail_url?: string;
	title: string;
	description: string;
	display_order: number;
	created_at: string;
}

const PilotPortfolio = () => {
	const [items, setItems] = useState<PortfolioItem[]>([]);
	const [uploading, setUploading] = useState(false);
	const [loading, setLoading] = useState(true);
	const [userType, setUserType] = useState<string | null>(null);
	const [showUpgradeModal, setShowUpgradeModal] = useState(false);
	const [newItemType, setNewItemType] = useState<'image' | 'video'>('image');
	const [videoUrl, setVideoUrl] = useState('');
	const [title, setTitle] = useState('');
	const [description, setDescription] = useState('');

	const navigate = useNavigate();
	const location = useLocation();
	const { toast } = useToast();
	const { plan, loading: planLoading } = useSubscriptionPlan();

	useEffect(() => {
		checkUserType();
		loadPortfolio();
	}, []);

	const checkUserType = async () => {
		try {
			const { data: { user } } = await supabase.auth.getUser();
			if (!user) return;

			const { data: profile } = await supabase
				.from('profiles')
				.select('user_type')
				.eq('id', user.id)
				.single();

			if (profile) {
				setUserType(profile.user_type);
			}
		} catch (error) {
			console.error('Error checking user type:', error);
		}
	};

	const loadPortfolio = async () => {
		try {
			const { data: { user } } = await supabase.auth.getUser();
			if (!user) return;

			const { data, error } = await supabase
				.from('pilot_portfolio')
				.select('*')
				.eq('user_id', user.id)
				.order('display_order', { ascending: true })
				.order('created_at', { ascending: false });

			if (error) throw error;

			setItems((data || []) as PortfolioItem[]);
		} catch (error) {
			console.error('Error loading portfolio:', error);
			toast({
				title: "Error",
				description: "No se pudo cargar el portafolio",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
		// Portafolio es solo para Pro/Empresa
		if (plan && plan.isFree) {
			setShowUpgradeModal(true);
			event.target.value = '';
			return;
		}

		const file = event.target.files?.[0];
		if (!file) return;

		// Validar tipo de archivo
		const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
		if (!allowedTypes.includes(file.type)) {
			toast({
				title: "Archivo no válido",
				description: "Solo se permiten imágenes JPG, PNG o WEBP",
				variant: "destructive",
			});
			return;
		}

		// Validar tamaño de archivo (5MB)
		if (file.size > 5 * 1024 * 1024) {
			toast({
				title: "Archivo demasiado grande",
				description: "El tamaño máximo permitido es de 5MB",
				variant: "destructive",
			});
			return;
		}

		try {
			setUploading(true);
			const { data: { user } } = await supabase.auth.getUser();
			if (!user) return;

			// Compresión de imagen
			const options = {
				maxSizeMB: 2, // Objetivo de compresión a ~2MB
				maxWidthOrHeight: 1920, // Aumentar resolución para mayor calidad
				useWebWorker: true,
				fileType: 'image/webp' // Convertir a WebP para máxima eficiencia
			};

			const compressedFile = await imageCompression(file, options);

			// Subir a Storage
			const fileExt = compressedFile.name.split('.').pop();
			const fileName = `${user.id}/${Date.now()}.${fileExt}`;
			const { error: uploadError } = await supabase.storage
				.from('portfolio')
				.upload(fileName, compressedFile);

			if (uploadError) throw uploadError;

			// URL pública
			const { data: { publicUrl } } = supabase.storage
				.from('portfolio')
				.getPublicUrl(fileName);

			// Guardar en BD
			const { error: dbError } = await supabase
				.from('pilot_portfolio')
				.insert({
					user_id: user.id,
					type: 'image',
					url: publicUrl,
					title: title || file.name,
					description: description
				});

			if (dbError) throw dbError;

			toast({
				title: "Imagen subida",
				description: "Tu trabajo ha sido añadido al portafolio",
			});

			setTitle('');
			setDescription('');
			await loadPortfolio();

		} catch (error: any) {
			console.error('Error uploading portfolio image:', error);
			toast({
				title: "Error",
				description: error.message || "No se pudo subir la imagen",
				variant: "destructive",
			});
		} finally {
			setUploading(false);
			event.target.value = '';
		}
	};

	const handleAddVideo = async () => {
		if (plan && plan.isFree) {
			setShowUpgradeModal(true);
			return;
		}

		if (!videoUrl) {
			toast({
				title: "URL requerida",
				description: "Ingresa el enlace del video",
				variant: "destructive",
			});
			return;
		}

		// Validar YouTube o Vimeo (simple)
		const isYoutube = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be');
		const isVimeo = videoUrl.includes('vimeo.com');

		if (!isYoutube && !isVimeo) {
			toast({
				title: "Enlace no válido",
				description: "Por ahora solo se permiten enlaces de YouTube o Vimeo",
				variant: "destructive",
			});
			return;
		}

		try {
			setUploading(true);
			const { data: { user } } = await supabase.auth.getUser();
			if (!user) return;

			const { error: dbError } = await supabase
				.from('pilot_portfolio')
				.insert({
					user_id: user.id,
					type: 'video',
					url: videoUrl,
					title: title || 'Video de trabajo',
					description: description
				});

			if (dbError) throw dbError;

			toast({
				title: "Video añadido",
				description: "El enlace ha sido guardado exitosamente",
			});

			setVideoUrl('');
			setTitle('');
			setDescription('');
			await loadPortfolio();

		} catch (error: any) {
			console.error('Error adding video:', error);
			toast({
				title: "Error",
				description: error.message || "No se pudo guardar el video",
				variant: "destructive",
			});
		} finally {
			setUploading(false);
		}
	};

	const handleDeleteItem = async (id: string, url: string, type: 'image' | 'video') => {
		try {
			// Si es imagen, intentar borrar del storage
			if (type === 'image') {
				const path = url.split('/').pop();
				if (path) {
					const { data: { user } } = await supabase.auth.getUser();
					if (user) {
						await supabase.storage
							.from('portfolio')
							.remove([`${user.id}/${path}`]);
					}
				}
			}

			const { error } = await supabase
				.from('pilot_portfolio')
				.delete()
				.eq('id', id);

			if (error) throw error;

			setItems(prev => prev.filter(item => item.id !== id));
			toast({
				title: "Eliminado",
				description: "El elemento ha sido quitado de tu portafolio",
			});
		} catch (error) {
			console.error('Error deleting portfolio item:', error);
			toast({
				title: "Error",
				description: "No se pudo eliminar el elemento",
				variant: "destructive",
			});
		}
	};

	const getYouTubeId = (url: string) => {
		const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
		const match = url.match(regExp);
		return (match && match[2].length === 11) ? match[2] : null;
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center">
				<div className="text-center">
					<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#00b3f3] mb-4"></div>
					<p className="text-[#B0B0B0]">Cargando portafolio...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-[#1A1A1A] text-[#E0E0E0]">
		{/* Header */}
		<div className="bg-white/95 backdrop-blur-xl border-b border-gray-200 shadow-2xl sticky top-0 z-50">
			<div className="px-3 sm:px-4 py-3 sm:py-4">
				<div className="flex items-center gap-2 sm:gap-4 max-w-7xl mx-auto">
					<Button
						variant="ghost"
						size="sm"
						onClick={() => {
							const isCompany = location.pathname.includes('/company') || userType === 'company';
							navigate(isCompany ? '/company' : '/pilot');
						}}
						className="h-10 w-10 sm:h-12 sm:w-12 rounded-full hover:bg-gray-100 transition-all duration-300 text-gray-900 shrink-0"
					>
						<ArrowLeft className="h-5 w-5 sm:h-7 sm:w-7" />
					</Button>

					<Logo
						size="lg"
						className="flex-shrink-0 [&>div]:h-10 [&>div]:w-10 sm:[&>div]:h-14 sm:[&>div]:w-14 transition-all duration-300"
						showText={false}
					/>

					<div className="flex flex-col min-w-0">
						<h1 className="text-lg sm:text-2xl font-bold text-gray-900 tracking-tight truncate">
							Portafolio
						</h1>
						<p className="text-[10px] sm:text-sm text-gray-600 font-medium uppercase tracking-wider truncate">
							Imágenes y Videos
						</p>
					</div>
				</div>
			</div>
		</div>

		{/* Content */}
		<div className="p-3 sm:p-4 space-y-4 sm:space-y-6 pb-20 max-w-7xl mx-auto">
			{/* Help Info */}
			<div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-3 sm:p-4 flex gap-3 sm:gap-4 items-start">
				<ImageIcon className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400 flex-shrink-0 mt-0.5" />
				<div className="text-xs sm:text-sm min-w-0">
					<p className="font-bold text-blue-300">Portafolio Profesional</p>
					<p className="text-blue-100/70">Muestra tus mejores tomas y videos editados para generar confianza en tus clientes.</p>
				</div>
			</div>

			{/* Action Tabs */}
			<Card className="bg-[#212121] border border-[#333333] shadow-xl rounded-2xl overflow-hidden">
				<div className="bg-gradient-to-r from-[#00b3f3]/20 via-[#00b3f3]/10 to-[#00b3f3]/20 p-1">
					<CardHeader className="p-4 sm:p-6 bg-[#2C2C2C] rounded-xl">
						<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
							<div className="flex items-center gap-3 min-w-0">
								<div className="h-8 w-8 sm:h-10 sm:w-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shrink-0">
									<Plus className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
								</div>
								<CardTitle className="text-base sm:text-xl font-bold text-[#E0E0E0] truncate">
									Añadir al Portafolio
								</CardTitle>
							</div>
							<div className="flex bg-[#1A1A1A] p-1 rounded-xl shrink-0 self-start sm:self-auto">
								<Button
									variant={newItemType === 'image' ? 'default' : 'ghost'}
									size="sm"
									onClick={() => setNewItemType('image')}
									className={`text-xs sm:text-sm px-2 sm:px-3 ${newItemType === 'image' ? "bg-[#00b3f3] text-white" : "text-white/60"}`}
								>
									<ImageIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
									Imagen
								</Button>
								<Button
									variant={newItemType === 'video' ? 'default' : 'ghost'}
									size="sm"
									onClick={() => setNewItemType('video')}
									className={`text-xs sm:text-sm px-2 sm:px-3 ${newItemType === 'video' ? "bg-[#00b3f3] text-white" : "text-white/60"}`}
								>
									<Video className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
									Video
								</Button>
							</div>
						</div>
					</CardHeader>
						<CardContent className="p-6 bg-[#2C2C2C] rounded-xl space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="space-y-4">
									<div>
										<Label className="text-white/70">Título del trabajo</Label>
										<Input
											placeholder="Ej: Inspección Solar, Boda en la Playa..."
											value={title}
											onChange={(e) => setTitle(e.target.value)}
											className="bg-[#1A1A1A] border-[#333333] mt-1 text-white"
										/>
									</div>
									<div>
										<Label className="text-white/70">Descripción (breve)</Label>
										<Textarea
											placeholder="Cuéntanos un poco sobre este trabajo..."
											value={description}
											onChange={(e) => setDescription(e.target.value)}
											className="bg-[#1A1A1A] border-[#333333] mt-1 text-white"
										/>
									</div>
								</div>

								<div className="flex flex-col justify-end">
									{newItemType === 'image' ? (
										<div className="border-2 border-dashed border-[#333333] rounded-2xl p-6 text-center hover:border-[#00b3f3] transition-all group h-full flex flex-col justify-center items-center">
											<ImageIcon className="h-10 w-10 text-white/20 group-hover:text-[#00b3f3] mb-3" />
											<label htmlFor="portfolio-upload" className="cursor-pointer">
												<Button asChild variant="outline" disabled={uploading}>
													<span>
														{uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
														Seleccionar Imagen
													</span>
												</Button>
												<input
													id="portfolio-upload"
													type="file"
													accept=".jpg,.jpeg,.png,.webp"
													className="hidden"
													onChange={handleImageUpload}
												/>
											</label>
											<p className="text-xs text-[#B0B0B0] mt-3">Máx 5MB - Las imágenes de alta calidad serán optimizadas automáticamente</p>
										</div>
									) : (
										<div className="space-y-4 h-full flex flex-col justify-end">
											<div>
												<Label className="text-white/70">Link de YouTube o Vimeo</Label>
												<Input
													placeholder="https://www.youtube.com/watch?v=..."
													value={videoUrl}
													onChange={(e) => setVideoUrl(e.target.value)}
													className="bg-[#1A1A1A] border-[#333333] mt-1 text-white"
												/>
											</div>
											<Button
												onClick={handleAddVideo}
												disabled={uploading}
												className="bg-[#00b3f3] hover:bg-[#0099cc] text-white w-full"
											>
												{uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
												Agregar Video
											</Button>
										</div>
									)}
								</div>
							</div>
						</CardContent>
					</div>
				</Card>

				{/* Portfolio List */}
				<div className="space-y-4">
					<h3 className="text-xl font-bold text-[#E0E0E0] flex items-center gap-2">
						Contenido Actual
						<Badge variant="secondary" className="bg-[#333333] text-white border-0">{items.length}</Badge>
					</h3>

					{items.length === 0 ? (
						<Card className="bg-[#212121] border border-[#333333] p-12 text-center">
							<div className="h-16 w-16 bg-[#2C2C2C] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#333333]">
								<MonitorPlay className="h-8 w-8 text-white/20" />
							</div>
							<p className="text-[#B0B0B0]">Aún no has añadido material a tu portafolio profesional.</p>
						</Card>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
							{items.map((item) => (
								<Card key={item.id} className="bg-[#212121] border border-[#333333] overflow-hidden group hover:border-[#00b3f3]/50 transition-all">
									<div className="aspect-video relative overflow-hidden bg-[#1A1A1A]">
										{item.type === 'image' ? (
											<img
												src={item.url}
												alt={item.title}
												className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
											/>
										) : (
											<div className="w-full h-full flex items-center justify-center relative">
												{getYouTubeId(item.url) ? (
													<>
														<img
															src={`https://img.youtube.com/vi/${getYouTubeId(item.url)}/mqdefault.jpg`}
															className="w-full h-full object-cover opacity-50"
														/>
														<div className="absolute inset-0 flex items-center justify-center">
															<div className="h-12 w-12 bg-[#FF0000] rounded-full flex items-center justify-center shadow-lg">
																<Youtube className="h-6 w-6 text-white" />
															</div>
														</div>
													</>
												) : (
													<Video className="h-10 w-10 text-white/20" />
												)}
											</div>
										)}

										<div className="absolute top-2 right-2 flex gap-2">
											<Button
												size="icon"
												variant="destructive"
												className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
												onClick={() => handleDeleteItem(item.id, item.url, item.type)}
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										</div>

										<div className="absolute bottom-2 left-2">
											<Badge className={item.type === 'image' ? "bg-blue-500" : "bg-red-500"}>
												{item.type === 'image' ? 'IMG' : 'VIDEO'}
											</Badge>
										</div>
									</div>
									<CardContent className="p-4">
										<h4 className="font-bold text-white truncate">{item.title}</h4>
										{item.description && <p className="text-xs text-[#B0B0B0] mt-1 line-clamp-2">{item.description}</p>}
										<div className="mt-3 flex items-center justify-between text-[10px] text-white/40 font-mono">
											<span>{new Date(item.created_at).toLocaleDateString()}</span>
											<a href={item.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-[#00b3f3] transition-colors">
												LINK <ExternalLink className="h-3 w-3" />
											</a>
										</div>
									</CardContent>
								</Card>
							))}
						</div>
					)}
				</div>
			</div>

			<UpgradeModal
				open={showUpgradeModal}
				onOpenChange={setShowUpgradeModal}
				requiredPlan="pro"
				feature="Portafolio Profesional"
				featureDescription="La galería de trabajos e integración de videos está disponible en Plan Pro y Plan Empresa. Sube tus mejores tomas para impresionar a tus clientes."
			/>
		</div>
	);
};

export default PilotPortfolio;
