import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, GraduationCap, X, UserCheck, UserPlus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const QRRedirect = () => {
	const { token } = useParams<{ token: string }>();
	const navigate = useNavigate();
	const [status, setStatus] = useState<'loading' | 'error' | 'ask_association'>('loading');
	const [errorMessage, setErrorMessage] = useState<string>('');
	const [showModal, setShowModal] = useState(false);

	const [user, setUser] = useState<any>(null);

	useEffect(() => {
		const handleRedirect = async () => {
			const { data: { session } } = await supabase.auth.getSession();
			setUser(session?.user ?? null);

			if (!token) {
				navigate('/auth');
				return;
			}

			try {
				// Buscar el token en la base de datos
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

				// Si el token no existe, mostrar error
				if (!data) {
					console.log('Token no encontrado');
					setErrorMessage('El código del diploma no es válido o no existe.');
					setStatus('error');
					setShowModal(true);
					return;
				}

				// Si el token ya está asociado a un usuario, redirigir a VERIFICACIÓN
				if (data.user_id) {
					console.log('🔗 Token ya está asociado, redirigiendo a verificación');
					navigate(`/verificar-diploma?codigo=${token}`);
					return;
				}

				// Si no está asociado, preguntar al usuario
				setStatus('ask_association');
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

	const handleGoToAuth = (tab: 'login' | 'signup') => {
		setShowModal(false);
		navigate(`/auth?tab=${tab}&qr_token=${token}`);
	};

	const handleClose = () => {
		setShowModal(false);
		navigate('/auth');
	};

	if (status === 'loading') {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#083b4e] to-[#0a4a61] p-4">
				<Card className="w-full max-w-md mx-auto shadow-2xl border-2 border-[#00b3f3]/30 bg-white/95 backdrop-blur-xl animate-fade-in">
					<CardContent className="text-center py-12">
						<Loader2 className="h-12 w-12 sm:h-16 sm:w-16 animate-spin text-[#00b3f3] mx-auto mb-4" />
						<p className="text-sm sm:text-base text-gray-600 font-medium">Procesando código QR...</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (status === 'ask_association' && showModal) {
		return (
			<div
				className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in"
			>
				<Card
					className="w-full max-w-md mx-auto shadow-2xl border-2 border-[#00b3f3]/40 bg-white/95 backdrop-blur-xl animate-scale-in relative overflow-hidden"
					onClick={(e) => e.stopPropagation()}
				>
					<div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#00b3f3] via-[#00d4ff] to-[#00b3f3]"></div>

					<Button
						variant="ghost"
						size="icon"
						className="absolute top-3 right-3 h-8 w-8 rounded-full hover:bg-gray-100 transition-colors"
						onClick={handleClose}
					>
						<X className="h-5 w-5 text-gray-500" />
					</Button>

					<CardHeader className="text-center pb-4 pt-10">
						<div className="mx-auto mb-6 h-20 w-20 bg-gradient-to-br from-[#00b3f3] to-[#0099cc] rounded-2xl flex items-center justify-center shadow-xl rotate-3">
							<GraduationCap className="h-10 w-10 text-white" />
						</div>
						<CardTitle className="text-2xl font-bold text-gray-900 tracking-tight">
							Validar tu Diploma
						</CardTitle>
						<CardDescription className="text-base text-gray-600 mt-2 px-4 leading-relaxed">
							Para asociar este diploma a tu perfil profesional, primero necesitamos saber:
						</CardDescription>
					</CardHeader>

					<CardContent className="space-y-4 pb-10 pt-4 px-8">
						<div className="grid gap-4">
							{user ? (
								<Button
									onClick={() => navigate(`/auth?qr_token=${token}`)}
									className="w-full h-16 flex items-center justify-between px-6 bg-gradient-to-r from-[#00b3f3] to-[#0099cc] hover:from-[#0099cc] hover:to-[#00b3f3] text-white shadow-lg hover:shadow-[#00b3f3]/30 transition-all duration-300 rounded-xl group"
								>
									<div className="flex items-center gap-4 text-left">
										<div className="h-10 w-10 bg-white/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
											<UserCheck className="h-5 w-5 text-white" />
										</div>
										<div>
											<span className="font-bold block text-white">Asociar a mi Perfil</span>
											<span className="text-xs text-white/80">Sesión iniciada como {user.email}</span>
										</div>
									</div>
									<div className="h-2 w-2 rounded-full bg-white/40 animate-pulse"></div>
								</Button>
							) : (
								<>
									<Button
										onClick={() => handleGoToAuth('login')}
										className="w-full h-16 flex items-center justify-between px-6 bg-white border-2 border-[#00b3f3]/20 hover:border-[#00b3f3] text-gray-900 hover:bg-[#00b3f3]/5 transition-all duration-300 rounded-xl group"
									>
										<div className="flex items-center gap-4 text-left">
											<div className="h-10 w-10 bg-[#00b3f3]/10 rounded-lg flex items-center justify-center group-hover:bg-[#00b3f3] transition-colors">
												<UserCheck className="h-5 w-5 text-[#00b3f3] group-hover:text-white" />
											</div>
											<div>
												<span className="font-bold block">Ya tengo cuenta</span>
												<span className="text-xs text-gray-500">Inicia sesión y asocia</span>
											</div>
										</div>
										<div className="h-2 w-2 rounded-full bg-[#00b3f3]/30"></div>
									</Button>

									<Button
										onClick={() => handleGoToAuth('signup')}
										className="w-full h-16 flex items-center justify-between px-6 bg-gradient-to-r from-[#00b3f3] to-[#0099cc] hover:from-[#0099cc] hover:to-[#00b3f3] text-white shadow-lg hover:shadow-[#00b3f3]/30 transition-all duration-300 rounded-xl group"
									>
										<div className="flex items-center gap-4 text-left">
											<div className="h-10 w-10 bg-white/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
												<UserPlus className="h-5 w-5 text-white" />
											</div>
											<div>
												<span className="font-bold block text-white">Soy nuevo</span>
												<span className="text-xs text-white/80">Crea tu perfil profesional</span>
											</div>
										</div>
										<div className="h-2 w-2 rounded-full bg-white/40 animate-pulse"></div>
									</Button>
								</>
							)}
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (status === 'error' && showModal) {
		return (
			<div
				className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in"
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
							{errorMessage || 'No se pudo procesar el código QR'}
						</CardDescription>
					</CardHeader>
					<CardContent className="text-center pb-8 pt-4">
						<Button
							onClick={handleClose}
							className="w-full bg-gray-900 hover:bg-black text-white font-semibold py-4 rounded-xl shadow-lg transition-all duration-300"
						>
							Volver al Inicio
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return null;
};

export default QRRedirect;
