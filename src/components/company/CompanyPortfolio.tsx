import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
	Upload,
	Image as ImageIcon,
	Video,
	Trash2,
	Plus,
	ExternalLink,
	Youtube,
	MonitorPlay,
	Loader2
} from "lucide-react";
import { useSubscriptionPlan } from "@/hooks/useSubscriptionPlan";
import { UpgradeModal } from "@/components/subscription/UpgradeModal";
import imageCompression from 'browser-image-compression';

interface PortfolioItem {
	id: string;
	type: 'image' | 'video';
	url: string;
	title: string;
	description: string;
	created_at: string;
}

export const CompanyPortfolio = () => {
	const [items, setItems] = useState<PortfolioItem[]>([]);
	const [uploading, setUploading] = useState(false);
	const [loading, setLoading] = useState(true);
	const [showUpgradeModal, setShowUpgradeModal] = useState(false);
	const [newItemType, setNewItemType] = useState<'image' | 'video'>('image');
	const [videoUrl, setVideoUrl] = useState('');
	const [title, setTitle] = useState('');
	const [description, setDescription] = useState('');
	const { toast } = useToast();
	const { plan } = useSubscriptionPlan();

	useEffect(() => {
		loadPortfolio();
	}, []);

	const loadPortfolio = async () => {
		try {
			const { data: { user } } = await supabase.auth.getUser();
			if (!user) return;
			const { data, error } = await supabase.from('pilot_portfolio').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
			if (error) throw error;
			setItems((data || []) as PortfolioItem[]);
		} catch (error) {
			toast({ title: "Error", description: "No se pudo cargar el portafolio", variant: "destructive" });
		} finally {
			setLoading(false);
		}
	};

	const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
		if (plan && plan.isFree) { setShowUpgradeModal(true); return; }
		const file = event.target.files?.[0];
		if (!file) return;
		try {
			setUploading(true);
			const { data: { user } } = await supabase.auth.getUser();
			if (!user) return;
			const compressedFile = await imageCompression(file, { maxSizeMB: 2, maxWidthOrHeight: 1920, useWebWorker: true, fileType: 'image/webp' });
			const fileName = `${user.id}/${Date.now()}.webp`;
			const { error: uploadError } = await supabase.storage.from('portfolio').upload(fileName, compressedFile);
			if (uploadError) throw uploadError;
			const { data: { publicUrl } } = supabase.storage.from('portfolio').getPublicUrl(fileName);
			const { error: dbError } = await supabase.from('pilot_portfolio').insert({ user_id: user.id, type: 'image', url: publicUrl, title: title || file.name, description });
			if (dbError) throw dbError;
			toast({ title: "Imagen subida", description: "Añadida al portafolio" });
			setTitle(''); setDescription(''); await loadPortfolio();
		} catch (error) {
			toast({ title: "Error", description: "No se pudo subir la imagen", variant: "destructive" });
		} finally {
			setUploading(false);
		}
	};

	const handleAddVideo = async () => {
		if (plan && plan.isFree) { setShowUpgradeModal(true); return; }
		if (!videoUrl) { toast({ title: "URL requerida", variant: "destructive" }); return; }
		try {
			const { data: { user } } = await supabase.auth.getUser();
			if (!user) return;
			const { error } = await supabase.from('pilot_portfolio').insert({ user_id: user.id, type: 'video', url: videoUrl, title: title || 'Video de trabajo', description });
			if (error) throw error;
			toast({ title: "Video añadido" });
			setVideoUrl(''); setTitle(''); setDescription(''); await loadPortfolio();
		} catch (error) {
			toast({ title: "Error", variant: "destructive" });
		}
	};

	const handleDelete = async (id: string) => {
		try {
			await supabase.from('pilot_portfolio').delete().eq('id', id);
			setItems(prev => prev.filter(i => i.id !== id));
			toast({ title: "Eliminado" });
		} catch (e) { toast({ title: "Error", variant: "destructive" }); }
	};

	const getYouTubeId = (url: string) => {
		const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
		const match = url.match(regExp);
		return (match && match[2].length === 11) ? match[2] : null;
	};

	if (loading) return <div className="text-white">Cargando...</div>;

	return (
		<div className="space-y-8 animate-fade-in">
		<Card className="bg-white/10 backdrop-blur-xl border-2 border-[#00b3f3]/30 shadow-2xl rounded-3xl overflow-hidden">
			<CardHeader className="p-4 md:p-6">
				<div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
					<div className="min-w-0">
						<CardTitle className="text-lg sm:text-2xl text-white">Portafolio Profesional</CardTitle>
						<CardDescription className="text-white/60 text-sm">Muestra tus mejores trabajos visuales.</CardDescription>
					</div>
					<div className="flex bg-white/5 p-1 rounded-xl border border-white/10 self-start sm:self-auto shrink-0">
						<Button variant={newItemType === 'image' ? 'default' : 'ghost'} size="sm" onClick={() => setNewItemType('image')} className={`text-xs sm:text-sm px-2 sm:px-3 ${newItemType === 'image' ? "bg-[#00b3f3] text-white" : "text-white/60"}`}>
							<ImageIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" /> Imagen
						</Button>
						<Button variant={newItemType === 'video' ? 'default' : 'ghost'} size="sm" onClick={() => setNewItemType('video')} className={`text-xs sm:text-sm px-2 sm:px-3 ${newItemType === 'video' ? "bg-[#00b3f3] text-white" : "text-white/60"}`}>
							<Video className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" /> Video
						</Button>
					</div>
				</div>
			</CardHeader>
				<CardContent className="space-y-6">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div className="space-y-4">
							<div>
								<Label className="text-white/70">Título</Label>
								<Input value={title} onChange={e => setTitle(e.target.value)} className="bg-white/5 border-white/10 text-white rounded-xl" placeholder="Ej: Inspección Industrial" />
							</div>
							<div>
								<Label className="text-white/70">Descripción</Label>
								<Textarea value={description} onChange={e => setDescription(e.target.value)} className="bg-white/5 border-white/10 text-white rounded-xl" placeholder="Describe brevemente el trabajo..." />
							</div>
						</div>
						<div className="flex flex-col justify-end">
							{newItemType === 'image' ? (
								<div className="border-2 border-dashed border-white/10 rounded-2xl p-6 text-center hover:border-[#00b3f3] transition-all h-full flex flex-col justify-center items-center">
									<label className="cursor-pointer">
										<Button asChild className="bg-[#00b3f3] text-white rounded-xl">
											<span>{uploading ? <Loader2 className="animate-spin mr-2" /> : <Upload className="mr-2" />} Subir Imagen</span>
										</Button>
										<input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
									</label>
								</div>
							) : (
								<div className="space-y-4">
									<div>
										<Label className="text-white/70">URL YouTube/Vimeo</Label>
										<Input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} className="bg-white/5 border-white/10 text-white rounded-xl" placeholder="https://youtube.com/..." />
									</div>
									<Button onClick={handleAddVideo} className="bg-[#00b3f3] text-white w-full rounded-xl">Añadir Video</Button>
								</div>
							)}
						</div>
					</div>
				</CardContent>
			</Card>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				{items.map(item => (
					<Card key={item.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden group">
						<div className="aspect-video relative bg-black/40">
							{item.type === 'image' ? (
								<img src={item.url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
							) : (
								<div className="w-full h-full flex items-center justify-center">
									{getYouTubeId(item.url) ? (
										<img src={`https://img.youtube.com/vi/${getYouTubeId(item.url)}/mqdefault.jpg`} className="w-full h-full object-cover opacity-60" />
									) : <MonitorPlay className="h-10 w-10 text-white/20" />}
									<div className="absolute inset-0 flex items-center justify-center">
										<Youtube className="h-8 w-8 text-red-500" />
									</div>
								</div>
							)}
							<Button size="icon" variant="destructive" className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDelete(item.id)}>
								<Trash2 className="h-4 w-4" />
							</Button>
						</div>
						<CardContent className="p-4">
							<h4 className="text-white font-bold truncate">{item.title}</h4>
							<p className="text-white/40 text-xs mt-1 line-clamp-1">{item.description}</p>
						</CardContent>
					</Card>
				))}
			</div>

			<UpgradeModal open={showUpgradeModal} onOpenChange={setShowUpgradeModal} requiredPlan="pro" feature="Portafolio" featureDescription="El portafolio profesional es para planes Pro y Empresa." />
		</div>
	);
};
