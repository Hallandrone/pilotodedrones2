import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Logo from '@/components/ui/logo';
import {
	Building2,
	CheckCircle,
	Loader2,
	AlertCircle,
	Mail,
	Calendar,
	Gift,
	Sparkles,
	ArrowRight
} from 'lucide-react';

interface InvitationData {
	id: string;
	company_name: string;
	pilot_email: string;
	pilot_name?: string;
	message?: string;
	invited_at: string;
}

const InvitationAcceptPage = () => {
	const { token } = useParams<{ token: string }>();
	const navigate = useNavigate();
	const { toast } = useToast();

	const [loading, setLoading] = useState(true);
	const [accepting, setAccepting] = useState(false);
	const [invitation, setInvitation] = useState<InvitationData | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [user, setUser] = useState<any>(null);

	useEffect(() => {
		checkAuthAndLoadInvitation();
	}, [token]);

	const checkAuthAndLoadInvitation = async () => {
		try {
			setLoading(true);

			// Verificar si el usuario está autenticado
			const { data: { session } } = await supabase.auth.getSession();
			setUser(session?.user || null);

			if (!token) {
				setError('Token de invitación no válido');
				setLoading(false);
				return;
			}

			// Obtener datos de la invitación usando la Edge Function para saltar RLS
			// Usamos POST con action='get_invitation' para simplificar la llamada y evitar problemas de headers
			const { data, error: functionError } = await supabase.functions.invoke('send-invitation-email', {
				body: {
					action: 'get_invitation',
					id: token
				}
			});

			if (functionError) {
				console.error('Error invoking function:', functionError);
				setError('Error al obtener invitación');
				setLoading(false);
				return;
			}

			if (!data || data.error) {
				setError(data?.error || 'Invitación no encontrada o ya procesada');
				setLoading(false);
				return;
			}

			setInvitation({
				id: data.id,
				company_name: data.company?.company_name || 'Una empresa',
				pilot_email: data.pilot_email,
				message: data.message,
				invited_at: data.invited_at
			});
			setLoading(false);

		} catch (err: any) {
			console.error('Error:', err);
			setError('Error al cargar la invitación');
			setLoading(false);
		}
	};

	const handleAccept = async () => {
		if (!invitation) return;

		try {
			setAccepting(true);

			// Verificar autenticación
			const { data: { session } } = await supabase.auth.getSession();

			if (!session) {
				// Redirigir a registro/login con el token
				toast({
					title: 'Inicia sesión o regístrate',
					description: 'Necesitas una cuenta para aceptar la invitación',
				});
				if (token) localStorage.setItem('pendingInvitationToken', token);
				navigate(`/auth?invitation=${token}&tab=register`);
				return;
			}

			// Aceptar invitación usando Edge Function (Logic robusta que maneja null pilot_id y plan pro)
			const { data, error } = await supabase.functions.invoke('send-invitation-email', {
				body: {
					action: 'accept_invitation',
					invitationId: invitation.id
				}
			});

			// Manejo específico para usuario eliminado o sesión inválida
			if (data?.error && (data.error.includes('User from sub claim') || data.error.includes('Auth Error'))) {
				console.log('Detectado usuario inválido/eliminado. Cerrando sesión...');
				await supabase.auth.signOut();
				toast({
					title: 'Sesión expirada',
					description: 'Tu usuario anterior fue eliminado. Por favor regístrate nuevamente.',
					variant: 'destructive'
				});
				// Esperar un poco para que el toast se vea
				setTimeout(() => {
					if (token) localStorage.setItem('pendingInvitationToken', token);
					navigate(`/auth?invitation=${token}&tab=signup`);
				}, 1500);
				return;
			}

			if (error || !data?.success) {
				throw new Error(data?.error || 'Error al aceptar invitación');
			}

			toast({
				title: '¡Invitación aceptada!',
				description: 'Plan Pro activado. Bienvenido al equipo',
			});

			// Redirigir al dashboard del piloto
			setTimeout(() => {
				navigate('/pilot');
			}, 2000);

		} catch (err: any) {
			console.error('Error:', err);
			toast({
				title: 'Error',
				description: err.message || 'No se pudo aceptar la invitación',
				variant: 'destructive',
			});
		} finally {
			setAccepting(false);
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-[#f5f8fa] flex items-center justify-center p-4">
				<Card className="w-full max-w-md">
					<CardContent className="pt-6">
						<div className="text-center py-8">
							<Loader2 className="h-12 w-12 text-[#00b3f3] mx-auto mb-4 animate-spin" />
							<p className="text-gray-600">Cargando invitación...</p>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (error || !invitation) {
		return (
			<div className="min-h-screen bg-[#f5f8fa] flex items-center justify-center p-4">
				<Card className="w-full max-w-md border-red-200">
					<CardHeader>
						<div className="mx-auto mb-4 h-16 w-16 bg-red-100 rounded-full flex items-center justify-center">
							<AlertCircle className="h-8 w-8 text-red-600" />
						</div>
						<CardTitle className="text-center text-red-900">Invitación no válida</CardTitle>
						<CardDescription className="text-center">
							{error || 'Esta invitación no existe o ya fue procesada'}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Button
							onClick={() => navigate('/')}
							variant="outline"
							className="w-full"
						>
							Volver al inicio
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-[#f5f8fa] flex items-center justify-center p-4">
			<Card className="w-full max-w-2xl border-0 shadow-2xl">
				{/* Header */}
				<CardHeader className="text-center space-y-4 pb-6 bg-[#083b4e] text-white rounded-t-lg">
					{/* Texto arriba centrado */}
					<div className="flex justify-center mb-2">
						<h2 className="text-2xl font-bold text-white tracking-wide">
							Piloto de Drones
						</h2>
					</div>

					{/* Logo grande centrado */}
					<div className="flex justify-center">
						<div className="h-24 w-24 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center p-5 shadow-lg ring-1 ring-white/30">
							<Logo
								showText={false}
								size="xl"
								className="filter brightness-0 invert justify-center"
							/>
						</div>
					</div>

					<CardTitle className="text-3xl font-bold mt-2">
						¡Tienes una invitación!
					</CardTitle>
					<CardDescription className="text-white/90 text-lg">
						<strong>{invitation.company_name}</strong> te invita a unirte a su equipo
					</CardDescription>
				</CardHeader>

				<CardContent className="pt-8 space-y-6">
					{/* Mensaje personalizado */}
					{invitation.message && (
						<div className="bg-[#f0f9ff] border-l-4 border-[#00b3f3] p-4 rounded-r-lg">
							<p className="text-gray-700 italic">"{invitation.message}"</p>
						</div>
					)}

					{/* Información de la invitación */}
					<div className="space-y-3">
						<div className="flex items-center gap-3 text-gray-600">
							<Mail className="h-5 w-5 text-[#00b3f3]" />
							<span>Invitación enviada a: <strong>{invitation.pilot_email}</strong></span>
						</div>
						<div className="flex items-center gap-3 text-gray-600">
							<Calendar className="h-5 w-5 text-[#00b3f3]" />
							<span>Fecha: {new Date(invitation.invited_at).toLocaleDateString('es-ES', {
								day: 'numeric',
								month: 'long',
								year: 'numeric'
							})}</span>
						</div>
					</div>

					{/* Beneficios */}
					<div className="bg-[#e8f4f8] p-6 rounded-lg border-2 border-[#b3e5fadd]">
						<div className="flex items-center gap-2 mb-4">
							<Gift className="h-6 w-6 text-[#00b3f3]" />
							<h3 className="text-xl font-semibold text-gray-900">
								Beneficios al unirte
							</h3>
						</div>
						<ul className="space-y-3">
							{[
								'Plan Pro GRATIS mientras seas parte del equipo',
								'Perfil público destacado',
								'Acceso a condiciones meteorológicas en tiempo real',
								'Certificados y documentación profesional',
								'Código QR personalizado',
								'Visibilidad prioritaria en búsquedas'
							].map((benefit, index) => (
								<li key={index} className="flex items-start gap-3">
									<CheckCircle className="h-5 w-5 text-[#00b3f3] mt-0.5 flex-shrink-0" />
									<span className="text-gray-700">{benefit}</span>
								</li>
							))}
						</ul>
					</div>

					{/* Plan Pro Badge */}
					<div className="flex justify-center">
						<Badge className="bg-[#00b3f3] hover:bg-[#0099cc] text-white px-6 py-2 text-base">
							<Sparkles className="h-4 w-4 mr-2" />
							Plan Pro incluido
						</Badge>
					</div>

					{/* Botones de acción */}
					<div className="space-y-3 pt-4">
						{user ? (
							<Button
								onClick={handleAccept}
								disabled={accepting}
								className="w-full bg-[#00b3f3] hover:bg-[#0099cc] text-white font-semibold py-6 text-lg shadow-lg shadow-blue-500/20"
								size="lg"
							>
								{accepting ? (
									<>
										<Loader2 className="h-5 w-5 mr-2 animate-spin" />
										Aceptando invitación...
									</>
								) : (
									<>
										<CheckCircle className="h-5 w-5 mr-2 flex-shrink-0" />
										<span className="hidden sm:inline">Aceptar invitación y activar Plan Pro</span>
										<span className="sm:hidden">Aceptar Invitación</span>
										<ArrowRight className="h-5 w-5 ml-2 flex-shrink-0" />
									</>
								)}
							</Button>
						) : (
							<div className="space-y-3">
								<p className="text-center text-gray-600 text-sm">
									Para aceptar esta invitación, primero debes iniciar sesión o crear una cuenta
								</p>
								<Button
									onClick={() => navigate(`/auth?invitation=${token}`)}
									className="w-full bg-[#00b3f3] hover:bg-[#0099cc] text-white font-semibold py-6 text-lg shadow-lg shadow-blue-500/20"
									size="lg"
								>
									Iniciar sesión / Registrarse
									<ArrowRight className="h-5 w-5 ml-2" />
								</Button>
							</div>
						)}

						<Button
							onClick={() => navigate('/')}
							variant="ghost"
							className="w-full"
						>
							Volver al inicio
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
};

export default InvitationAcceptPage;
