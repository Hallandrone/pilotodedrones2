import React, { useState, useEffect } from 'react';
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
	pilot_email_masked?: string;
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
				pilot_email_masked: data.pilot_email_masked,
				message: data.message,
				invited_at: data.invited_at
			});
			setLoading(false);

			// AUTO-ACEPTACIÓN: Si el usuario acaba de registrarse y vuelve, aceptar automáticamente
			const pendingToken = localStorage.getItem('pendingInvitationToken');
			if (session?.user && pendingToken && pendingToken === token) {
				console.log('Auto-aceptando invitación después del registro...');
				// Limpiar el token pendiente ANTES de aceptar para evitar loops
				localStorage.removeItem('pendingInvitationToken');
				// Pequeño delay para que el usuario vea la pantalla
				setTimeout(() => {
					handleAcceptAutomatic(data.id);
				}, 1000);
			}

		} catch (err: any) {
			console.error('Error:', err);
			setError('Error al cargar la invitación');
			setLoading(false);
		}
	};

	// Función separada para auto-aceptación (evita problemas de closure)
	const handleAcceptAutomatic = async (invitationId: string) => {
		setAccepting(true);
		try {
			const { data, error } = await supabase.functions.invoke('send-invitation-email', {
				body: {
					action: 'accept_invitation',
					invitationId: invitationId
				}
			});

			console.log('Respuesta auto-accept:', data);

			if (data?.error && (data.error.includes('User from sub claim') || data.error.includes('Auth Error'))) {
				// JWT corrupto, pero ya no debería pasar aquí
				console.error('JWT corrupto en auto-accept');
				setAccepting(false);
				return;
			}

			if (error || !data?.success) {
				throw new Error(data?.error || 'Error al aceptar invitación');
			}

			toast({
				title: '¡Invitación aceptada!',
				description: 'Plan Alumno Academia activado. Bienvenido al equipo',
			});

			setTimeout(() => {
				navigate('/pilot');
			}, 2000);

		} catch (err: any) {
			console.error('Error en auto-accept:', err);
			toast({
				title: 'Error',
				description: err.message || 'No se pudo aceptar la invitación automáticamente. Intenta manualmente.',
				variant: 'destructive',
			});
			setAccepting(false);
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

			console.log('Respuesta API:', data);

			// Manejo específico para JWT corrupto (usuario eliminado pero token viejo en navegador)
			if (data?.error && (data.error.includes('User from sub claim') || data.error.includes('Auth Error') || data.error.includes('JWT'))) {
				console.log('Detectado JWT corrupto. Limpiando sesión completamente...');

				// Limpiar TODO el storage de Supabase
				const keysToRemove = Object.keys(localStorage).filter(key =>
					key.startsWith('sb-') || key.includes('supabase') || key === 'pendingInvitationToken'
				);
				keysToRemove.forEach(key => {
					if (key !== 'pendingInvitationToken') localStorage.removeItem(key);
				});

				// Forzar signOut
				await supabase.auth.signOut();

				// Guardar el token de invitación para después del registro
				if (token) localStorage.setItem('pendingInvitationToken', token);

				toast({
					title: 'Sesión expirada',
					description: 'Tu sesión anterior expiró. Por favor regístrate nuevamente.',
					variant: 'destructive'
				});

				// Redirigir al registro
				setTimeout(() => {
					navigate(`/auth?invitation=${token}&tab=signup`);
				}, 1500);
				return;
			}

			if (error || !data?.success) {
				throw new Error(data?.error || 'Error al aceptar invitación');
			}

			toast({
				title: '¡Invitación aceptada!',
				description: 'Plan Alumno Academia activado. Bienvenido al equipo',
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
							onClick={() => navigate('/auth')}
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
							<span>Invitación enviada a: <strong>{invitation.pilot_email_masked || 'tu correo'}</strong></span>
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
								'Plan Alumno Academia GRATIS mientras seas parte del equipo',
								'Perfil público destacado',
								'Horarios de amanecer y atardecer para tus vuelos',
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
							Plan Alumno Academia incluido
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
										<span className="hidden sm:inline">Aceptar invitación y activar Plan Alumno Academia</span>
										<span className="sm:hidden">Aceptar Invitación</span>
										<ArrowRight className="h-5 w-5 ml-2 flex-shrink-0" />
									</>
								)}
							</Button>
						) : (
							<div className="space-y-4 pt-4">
								<div className="bg-blue-50 border border-blue-100 p-4 rounded-lg mb-2">
									<p className="text-center text-blue-800 text-sm font-medium">
										¿Aún no tienes cuenta? ¡No te preocupes! Regístrate ahora para aceptar tu invitación y activar tu Plan Alumno Academia.
									</p>
								</div>

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
									<Button
										onClick={() => navigate(`/auth?invitation=${token}&tab=signup`)}
										className="w-full bg-[#00b3f3] hover:bg-[#0099cc] text-white font-semibold py-6 text-lg shadow-lg shadow-blue-500/20 order-1 sm:order-2"
										size="lg"
									>
										Crear mi Cuenta
										<ArrowRight className="h-5 w-5 ml-2" />
									</Button>

									<Button
										onClick={() => navigate(`/auth?invitation=${token}&tab=login`)}
										variant="outline"
										className="w-full border-gray-300 text-gray-700 py-6 text-lg order-2 sm:order-1 hover:bg-gray-50"
										size="lg"
									>
										Ya tengo cuenta
									</Button>
								</div>
							</div>
						)}

						<Button
							onClick={() => navigate('/auth')}
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
