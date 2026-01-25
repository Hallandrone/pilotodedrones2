import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from 'qrcode.react';
import { QrCode as QrIcon, Download, Share2, Copy, Shield } from "lucide-react";

export const CompanyQR = () => {
	const [profileData, setProfileData] = useState<any>(null);
	const [qrCode, setQrCode] = useState<string>('');
	const [loading, setLoading] = useState(true);
	const [hasActiveSubscription, setHasActiveSubscription] = useState<boolean>(false);
	const qrRef = useRef<HTMLDivElement>(null);
	const { toast } = useToast();

	useEffect(() => {
		loadData();
	}, []);

	const loadData = async () => {
		try {
			const { data: { user } } = await supabase.auth.getUser();
			if (!user) return;

			const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
			const { data: sub } = await supabase.from('user_subscriptions').select('status').eq('user_id', user.id).eq('status', 'active').maybeSingle();

			setProfileData(profile);
			setHasActiveSubscription(!!sub);

			if (sub) {
				setQrCode(`${window.location.origin}/pilot/${user.id}`);
			}
		} catch (error) {
			console.error('Error loading QR data:', error);
		} finally {
			setLoading(false);
		}
	};

	const handleDownload = () => {
		const svg = qrRef.current?.querySelector('svg');
		if (!svg) return;
		const svgData = new XMLSerializer().serializeToString(svg);
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');
		const img = new Image();
		img.onload = () => {
			canvas.width = 512; canvas.height = 512;
			if (ctx) {
				ctx.fillStyle = 'white';
				ctx.fillRect(0, 0, 512, 512);
				ctx.drawImage(img, 0, 0, 512, 512);
			}
			canvas.toBlob((blob) => {
				if (blob) {
					const url = URL.createObjectURL(blob);
					const a = document.createElement('a');
					a.href = url;
					a.download = `qr-empresa-${profileData?.full_name}.png`;
					a.click();
					URL.revokeObjectURL(url);
				}
			});
		};
		img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
	};

	const handleCopy = () => {
		navigator.clipboard.writeText(qrCode);
		toast({ title: "Copiado", description: "Enlace copiado al portapapeles" });
	};

	if (loading) return <div className="text-white">Cargando...</div>;

	return (
		<div className="max-w-3xl mx-auto animate-fade-in space-y-6">
			<Card className="bg-white/10 backdrop-blur-xl border-2 border-[#00b3f3]/30 shadow-2xl rounded-3xl overflow-hidden">
				<CardHeader className="text-center">
					<CardTitle className="text-2xl text-white flex items-center justify-center gap-3">
						<QrIcon className="h-8 w-8 text-white" />
						Tu Código QR Profesional
					</CardTitle>
					<CardDescription className="text-white/60">Comparte tu perfil de empresa de forma rápida y profesional.</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col items-center py-8">
					{hasActiveSubscription ? (
						<>
							<div ref={qrRef} className="bg-white p-6 rounded-3xl shadow-2xl mb-8">
								<QRCodeSVG value={qrCode} size={240} level="H" />
							</div>
							<div className="flex flex-wrap gap-4 justify-center w-full">
								<Button onClick={handleDownload} className="bg-white/10 hover:bg-white/20 text-white rounded-xl px-6">
									<Download className="mr-2 h-4 w-4" /> Descargar PNG
								</Button>
								<Button variant="outline" onClick={handleCopy} className="border-white/10 text-white hover:bg-white/10 rounded-xl px-6">
									<Copy className="mr-2 h-4 w-4" /> Copiar Enlace
								</Button>
							</div>
						</>
					) : (
						<div className="text-center p-8 bg-amber-500/10 border-2 border-amber-500/30 rounded-3xl max-w-md">
							<Shield className="h-12 w-12 text-amber-500 mx-auto mb-4" />
							<h3 className="text-xl font-bold text-white mb-2">Suscripción Requerida</h3>
							<p className="text-white/60 mb-6">Necesitas un plan activo (Pro o Empresa) para generar tu código QR y hacer tu perfil visible.</p>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
};
