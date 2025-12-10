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
			// ya que el usuario aún no está autenticado o no tiene permisos de lectura
			const { data: invitationData, error: invitationError } = await supabase.functions.invoke('send-invitation-email', {
				method: 'GET',
				headers: { 'Content-Type': 'application/json' },
				// Pasamos el ID como query param en la URL de la función
				// La librería supabase-js maneja la URL base, pero para GET con params es mejor construir la URL manualmente o usar body si fuera POST
				// Pero como modificamos la función para leer searchParams, necesitamos que lleguen en la URL.
				// supabase.functions.invoke no tiene una opción fácil para query params en GET, así que los pasamos manualmente si es necesario o usamos una llamada fetch si la librería lo complica.
				// Sin embargo, invoke permite pasar opciones de fetch.
			});

			// Intentamos una llamada directa con fetch si invoke no añade query params fácilmente en la URL base.
			// Pero mejor aún, vamos a probar pasando el ID en la URL de invoke si la librería lo permite
			// O más simple: Hacemos una llamada usando el cliente global de supabase que tiene la URL configurada.

			// Dado que invoke hace POST por defecto si hay body, y GET si no, pero pasar query params es la clave.
			// Vamos a construir la llamada manualmente con fetch para asegurar que los params lleguen.

			const projectUrl = import.meta.env.VITE_SUPABASE_URL;
			const functionUrl = `${projectUrl}/functions/v1/send-invitation-email?id=${token}`;
			const { data: { session: currentSession } } = await supabase.auth.getSession();

			const response = await fetch(functionUrl, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
					// Si hay sesión, también podríamos enviarla, pero la function usa service_role así que no importa
				}
			});

			if (!response.ok) {
				throw new Error('Error al obtener invitación');
			}

			const data = await response.json();

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
				navigate(`/auth?invitation=${token}`);
				return;
			}

			// Aceptar invitación
			const { data, error } = await supabase
				.rpc('accept_company_invitation_with_pro', {
					invitation_id_param: invitation.id
				});

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
			<div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
				<Card className="w-full max-w-md">
					<CardContent className="pt-6">
						<div className="text-center py-8">
							<Loader2 className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-spin" />
							<p className="text-gray-600">Cargando invitación...</p>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (error || !invitation) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
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
		<div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
			<Card className="w-full max-w-2xl border-0 shadow-2xl">
				{/* Header */}
				<CardHeader className="text-center space-y-4 pb-6 bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-t-lg">
					<div className="flex justify-center mb-4">
						<Logo size="lg" className="filter brightness-0 invert" />
					</div>
					<div className="flex justify-center">
						<div className="h-20 w-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
							<Building2 className="h-10 w-10 text-white" />
						</div>
					</div>
					<CardTitle className="text-3xl font-bold">
						¡Tienes una invitación!
					</CardTitle>
					<CardDescription className="text-white/90 text-lg">
						<strong>{invitation.company_name}</strong> te invita a unirte a su equipo
					</CardDescription>
				</CardHeader>

				<CardContent className="pt-8 space-y-6">
					{/* Mensaje personalizado */}
					{invitation.message && (
						<div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
							<p className="text-gray-700 italic">"{invitation.message}"</p>
						</div>
					)}

					{/* Información de la invitación */}
					<div className="space-y-3">
						<div className="flex items-center gap-3 text-gray-600">
							<Mail className="h-5 w-5 text-blue-600" />
							<span>Invitación enviada a: <strong>{invitation.pilot_email}</strong></span>
						</div>
						<div className="flex items-center gap-3 text-gray-600">
							<Calendar className="h-5 w-5 text-blue-600" />
							<span>Fecha: {new Date(invitation.invited_at).toLocaleDateString('es-ES', {
								day: 'numeric',
								month: 'long',
								year: 'numeric'
							})}</span>
						</div>
					</div>

					{/* Beneficios */}
					<div className="bg-gradient-to-br from-purple-50 to-blue-50 p-6 rounded-lg border-2 border-purple-200">
						<div className="flex items-center gap-2 mb-4">
							<Gift className="h-6 w-6 text-purple-600" />
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
									<CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
									<span className="text-gray-700">{benefit}</span>
								</li>
							))}
						</ul>
					</div>

					{/* Plan Pro Badge */}
					<div className="flex justify-center">
						<Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 text-base">
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
								className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-6 text-lg"
								size="lg"
							>
								{accepting ? (
									<>
										<Loader2 className="h-5 w-5 mr-2 animate-spin" />
										Aceptando invitación...
									</>
								) : (
									<>
										<CheckCircle className="h-5 w-5 mr-2" />
										Aceptar invitación y activar Plan Pro
										<ArrowRight className="h-5 w-5 ml-2" />
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
									className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-6 text-lg"
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
