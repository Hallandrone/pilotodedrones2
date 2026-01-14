import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, GraduationCap, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const QRRedirect = () => {
	const { token } = useParams<{ token: string }>();
	const navigate = useNavigate();
	const [status, setStatus] = useState<'loading' | 'error' | 'redirect'>('loading');
	const [errorMessage, setErrorMessage] = useState<string>('');
	const [showModal, setShowModal] = useState(false);

	useEffect(() => {
		const handleRedirect = async () => {
			if (!token) {
				navigate('/auth');
				return;
			}

			try {
				// Buscar el token en la base de datos (query simple sin JOIN)
				const { data, error } = await supabase
					.from('diploma_qr_tokens')
					.select('user_id, token')
					.eq('token', token)
					.maybeSingle();

				if (error) {
					console.error('Error fetching QR token:', error);
					setErrorMessage(error.message || 'Error al buscar el token en la base de datos');
					setStatus('error');
					setShowModal(true);
					return;
				}

				// Si el token no existe, mostrar mensaje y esperar acción del usuario
				if (!data) {
					console.log('Token no encontrado, mostrando modal');
					setStatus('redirect');
					setShowModal(true);
					return;
				}

				// Si el token ya está asociado a un usuario, buscar su perfil
				if (data.user_id) {
					// Segunda query para obtener el perfil del usuario
					const { data: profileData, error: profileError } = await supabase
						.from('profiles')
						.select('public_profile_slug, id')
						.eq('id', data.user_id)
						.maybeSingle();

					if (!profileError && profileData) {
						if (profileData.public_profile_slug) {
							navigate(`/${profileData.public_profile_slug}`);
						} else {
							navigate(`/pilot/${profileData.id}`);
						}
						return;
					}
				}

				// Si no está asociado, mostrar mensaje y esperar acción del usuario
				setStatus('redirect');
				setShowModal(true);
			} catch (err: any) {
				console.error('Error in QR redirect:', err);
				setErrorMessage(err.message || 'Error inesperado');
				setStatus('error');
				setShowModal(true);
			}
		};

		handleRedirect();
	}, [token, navigate]);

	const handleClose = () => {
		setShowModal(false);
		navigate(`/auth?qr_token=${token}`);
	};

	const handleBackdropClick = () => {
		handleClose();
	};

	if (status === 'redirect' && showModal) {
		return (
			<div
				className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
				onClick={handleBackdropClick}
			>
				<Card
					className="w-full max-w-md mx-auto shadow-2xl border-2 border-[#00b3f3]/30 bg-white/95 backdrop-blur-xl animate-scale-in relative"
					onClick={(e) => e.stopPropagation()}
				>
					<Button
						variant="ghost"
						size="icon"
						className="absolute top-3 right-3 h-8 w-8 rounded-full hover:bg-gray-100"
						onClick={handleClose}
					>
						<X className="h-5 w-5 text-gray-500" />
					</Button>
					<CardHeader className="text-center pb-4 pt-8">
						<div className="mx-auto mb-4 h-16 w-16 sm:h-20 sm:w-20 bg-gradient-to-br from-[#00b3f3] to-[#0099cc] rounded-full flex items-center justify-center shadow-lg">
							<GraduationCap className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
						</div>
						<CardTitle className="text-xl sm:text-2xl font-bold text-gray-900">
							Asociar Diploma
						</CardTitle>
						<CardDescription className="text-sm sm:text-base text-gray-600 mt-2">
							Inicia sesión o regístrate en nuestra plataforma para asociar este diploma a tu perfil
						</CardDescription>
					</CardHeader>
					<CardContent className="text-center pb-6">
						<Button
							onClick={handleClose}
							className="w-full bg-gradient-to-r from-[#00b3f3] to-[#0099cc] hover:from-[#0099cc] hover:to-[#00b3f3] text-white font-semibold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
						>
							Continuar
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (status === 'error' && showModal) {
		return (
			<div
				className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
				onClick={handleBackdropClick}
			>
				<Card
					className="w-full max-w-md mx-auto shadow-2xl border-2 border-red-500/30 bg-white/95 backdrop-blur-xl animate-scale-in relative"
					onClick={(e) => e.stopPropagation()}
				>
					<Button
						variant="ghost"
						size="icon"
						className="absolute top-3 right-3 h-8 w-8 rounded-full hover:bg-gray-100"
						onClick={handleClose}
					>
						<X className="h-5 w-5 text-gray-500" />
					</Button>
					<CardHeader className="text-center pb-4 pt-8">
						<CardTitle className="text-xl sm:text-2xl font-bold text-red-600">Error</CardTitle>
						<CardDescription className="text-sm sm:text-base text-gray-600 mt-2">
							No se pudo procesar el código QR
						</CardDescription>
					</CardHeader>
					<CardContent className="text-center pb-6">
						{errorMessage && (
							<p className="text-xs sm:text-sm text-red-600 mb-4 p-3 bg-red-50 rounded-lg">
								{errorMessage}
							</p>
						)}
						<Button
							onClick={handleClose}
							className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
						>
							Continuar a Inicio de Sesión
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#083b4e] to-[#0a4a61] p-4">
			<Card className="w-full max-w-md mx-auto shadow-2xl border-2 border-[#00b3f3]/30 bg-white/95 backdrop-blur-xl animate-fade-in">
				<CardContent className="text-center py-12">
					<Loader2 className="h-12 w-12 sm:h-16 sm:w-16 animate-spin text-[#00b3f3] mx-auto mb-4" />
					<p className="text-sm sm:text-base text-gray-600">Procesando código QR...</p>
				</CardContent>
			</Card>
		</div>
	);
};

export default QRRedirect;


