import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	Upload,
	FileText,
	FileCheck,
	Download,
	Trash2,
	CheckCircle,
	Clock,
	XCircle,
	Eye,
	Plus,
	AlertCircle,
	Info
} from "lucide-react";
import { useSubscriptionPlan } from "@/hooks/useSubscriptionPlan";
import { UpgradeModal } from "@/components/subscription/UpgradeModal";

interface Certification {
	id: string;
	file_name: string;
	file_url: string;
	status: 'pending' | 'validated' | 'rejected';
	uploaded_at: string;
	validated_at: string | null;
	rejection_observations?: string | null;
}

export const CompanyCertificates = () => {
	const [certifications, setCertifications] = useState<Certification[]>([]);
	const [uploading, setUploading] = useState(false);
	const [loading, setLoading] = useState(true);
	const [showUpgradeModal, setShowUpgradeModal] = useState(false);
	const { toast } = useToast();
	const { plan } = useSubscriptionPlan();

	useEffect(() => {
		loadCertifications();
	}, []);

	const loadCertifications = async () => {
		try {
			const { data: { user } } = await supabase.auth.getUser();
			if (!user) return;

			const { data, error } = await supabase
				.from('user_certifications')
				.select('id, file_name, file_url, status, uploaded_at, validated_at, rejection_observations')
				.eq('user_id', user.id)
				.order('uploaded_at', { ascending: false });

			if (error) throw error;
			setCertifications((data || []) as Certification[]);
		} catch (error) {
			console.error('Error loading certifications:', error);
			toast({ title: "Error", description: "No se pudieron cargar las certificaciones", variant: "destructive" });
		} finally {
			setLoading(false);
		}
	};

	const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
		if (plan && plan.isFree) {
			setShowUpgradeModal(true);
			event.target.value = '';
			return;
		}

		const file = event.target.files?.[0];
		if (!file) return;

		try {
			setUploading(true);
			const { data: { user } } = await supabase.auth.getUser();
			if (!user) return;

			const fileName = `${user.id}/${Date.now()}_${file.name}`;
			const { error: uploadError } = await supabase.storage.from('certifications').upload(fileName, file);
			if (uploadError) throw uploadError;

			const { error: dbError } = await supabase.from('user_certifications').insert({
				user_id: user.id,
				file_name: file.name,
				file_url: fileName,
				status: 'pending'
			});
			if (dbError) throw dbError;

			// Notify admins
			const { sendNotification } = await import('@/lib/notification-service');
			await sendNotification({
				targetAdmins: true,
				type: 'new_certification',
				title: 'Nueva Certificación de Empresa',
				message: `${user.email} ha subido el documento: ${file.name}`,
				data: { certificateId: dbError }
			});

			toast({ title: "Certificación subida", description: "Enviada para revisión" });
			await loadCertifications();
		} catch (error) {
			toast({ title: "Error", description: "No se pudo subir el archivo", variant: "destructive" });
		} finally {
			setUploading(false);
			event.target.value = '';
		}
	};

	const getSignedUrl = async (filePath: string): Promise<string> => {
		if (filePath.startsWith('http')) return filePath;
		const { data, error } = await supabase.storage.from('certifications').createSignedUrl(filePath, 3600);
		if (error) throw error;
		return data.signedUrl;
	};

	const handleView = async (filePath: string) => {
		try {
			window.open(await getSignedUrl(filePath), '_blank');
		} catch (e) {
			toast({ title: "Error", description: "No se pudo abrir", variant: "destructive" });
		}
	};

	const handleDelete = async (id: string) => {
		try {
			const { error } = await supabase.from('user_certifications').delete().eq('id', id);
			if (error) throw error;
			setCertifications(prev => prev.filter(c => c.id !== id));
			toast({ title: "Eliminado", description: "Certificación eliminada" });
		} catch (e) {
			toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" });
		}
	};

	const getStatusBadge = (status: string) => {
		switch (status) {
			case 'validated': return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500">Validado</Badge>;
			case 'rejected': return <Badge className="bg-red-500/20 text-red-500 border-red-500">Rechazado</Badge>;
			default: return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500">Pendiente</Badge>;
		}
	};

	if (loading) return <div className="text-white">Cargando...</div>;

	return (
		<div className="space-y-6 animate-fade-in">
			<Card className="bg-white/10 backdrop-blur-xl border-2 border-[#00b3f3]/30 shadow-2xl rounded-3xl overflow-hidden">
				<CardHeader>
					<CardTitle className="text-2xl text-white flex items-center gap-2">
						<FileCheck className="h-6 w-6 text-[#00b3f3]" />
						Certificaciones y Documentos
					</CardTitle>
					<CardDescription className="text-white/60">Sube tu AOC, CEO y otros documentos para validar tu empresa.</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="border-2 border-dashed border-white/10 rounded-2xl p-8 text-center hover:border-[#00b3f3]/50 transition-all group">
						<Upload className="h-10 w-10 text-white/40 mx-auto mb-4 group-hover:text-[#00b3f3] transition-colors" />
						<p className="text-white mb-4">Arrastra o selecciona tus archivos (PDF, JPG, PNG)</p>
						<label className="cursor-pointer">
							<Button asChild className="bg-[#00b3f3] text-white rounded-xl">
								<span>{uploading ? "Subiendo..." : "Seleccionar Archivo"}</span>
							</Button>
							<input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileUpload} />
						</label>
					</div>
				</CardContent>
			</Card>

			<div className="grid grid-cols-1 gap-4">
				{certifications.map(cert => (
					<Card key={cert.id} className="bg-white/5 border border-white/10 p-6 flex flex-col md:flex-row justify-between items-center gap-4 rounded-2xl">
						<div className="flex items-center gap-4">
							<div className="h-12 w-12 bg-[#00b3f3]/20 rounded-xl flex items-center justify-center">
								<FileText className="h-6 w-6 text-[#00b3f3]" />
							</div>
							<div>
								<h4 className="text-white font-semibold">{cert.file_name}</h4>
								<p className="text-xs text-white/40">{new Date(cert.uploaded_at).toLocaleDateString()}</p>
							</div>
						</div>
						<div className="flex items-center gap-3">
							{getStatusBadge(cert.status)}
							<Button size="sm" variant="ghost" onClick={() => handleView(cert.file_url)} className="text-white/60 hover:text-white">
								<Eye className="h-4 w-4" />
							</Button>
							<Button size="sm" variant="ghost" onClick={() => handleDelete(cert.id)} className="text-red-400 hover:text-red-500">
								<Trash2 className="h-4 w-4" />
							</Button>
						</div>
					</Card>
				))}
			</div>

			<UpgradeModal open={showUpgradeModal} onOpenChange={setShowUpgradeModal} requiredPlan="pro" feature="Certificados" featureDescription="La subida de certificados es una función exclusiva para planes Pro y Empresa." />
		</div>
	);
};
