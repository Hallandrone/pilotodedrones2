import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

const QRRedirect = () => {
	const { token } = useParams<{ token: string }>();
	const navigate = useNavigate();
	const [status, setStatus] = useState<'loading' | 'error'>('loading');
	const [errorMessage, setErrorMessage] = useState<string>('');

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
					setTimeout(() => navigate(`/auth?qr_token=${token}`), 3000);
					return;
				}

				// Si el token no existe, redirigir a autenticación
				if (!data) {
					console.log('Token no encontrado, redirigiendo a auth');
					navigate(`/auth?qr_token=${token}`);
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

				// Si no está asociado, redirigir a autenticación con el token
				navigate(`/auth?qr_token=${token}`);
			} catch (err: any) {
				console.error('Error in QR redirect:', err);
				setErrorMessage(err.message || 'Error inesperado');
				setStatus('error');
				setTimeout(() => navigate(`/auth?qr_token=${token}`), 3000);
			}
		};

		handleRedirect();
	}, [token, navigate]);

	if (status === 'error') {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50">
				<div className="text-center max-w-md px-4">
					<h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
					<p className="text-gray-600 mb-4">No se pudo procesar el código QR</p>
					{errorMessage && (
						<p className="text-sm text-red-600 mb-4 p-3 bg-red-50 rounded-lg">
							{errorMessage}
						</p>
					)}
					<p className="text-sm text-gray-500">Redirigiendo a página de autenticación...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50">
			<div className="text-center">
				<Loader2 className="h-12 w-12 animate-spin text-[#00b3f3] mx-auto mb-4" />
				<p className="text-gray-600">Procesando código QR...</p>
			</div>
		</div>
	);
};

export default QRRedirect;
