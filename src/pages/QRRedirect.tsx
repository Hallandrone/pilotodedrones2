import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

const QRRedirect = () => {
	const { token } = useParams<{ token: string }>();
	const navigate = useNavigate();
	const [status, setStatus] = useState<'loading' | 'error'>('loading');

	useEffect(() => {
		const handleRedirect = async () => {
			if (!token) {
				navigate('/auth');
				return;
			}

			try {
				// Buscar el token en la base de datos
				const { data, error } = await supabase
					.from('diploma_qr_tokens')
					.select(`
            user_id,
            profiles:user_id (
              public_profile_slug,
              id
            )
          `)
					.eq('token', token)
					.maybeSingle();

				if (error) {
					console.error('Error fetching QR token:', error);
					setStatus('error');
					setTimeout(() => navigate('/auth'), 3000);
					return;
				}

				// Si el token no existe, redirigir a autenticación
				if (!data) {
					navigate(`/auth?qr_token=${token}`);
					return;
				}

				// Si el token ya está asociado a un usuario, redirigir a su perfil público
				if (data.user_id && data.profiles) {
					const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;

					if (profile?.public_profile_slug) {
						navigate(`/${profile.public_profile_slug}`);
					} else if (profile?.id) {
						navigate(`/pilot/${profile.id}`);
					} else {
						navigate(`/auth?qr_token=${token}`);
					}
					return;
				}

				// Si no está asociado, redirigir a autenticación con el token
				navigate(`/auth?qr_token=${token}`);
			} catch (err) {
				console.error('Error in QR redirect:', err);
				setStatus('error');
				setTimeout(() => navigate('/auth'), 3000);
			}
		};

		handleRedirect();
	}, [token, navigate]);

	if (status === 'error') {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50">
				<div className="text-center">
					<h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
					<p className="text-gray-600 mb-4">No se pudo procesar el código QR</p>
					<p className="text-sm text-gray-500">Redirigiendo...</p>
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
