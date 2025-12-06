import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
	Cloud,
	Wind,
	Eye,
	Droplets,
	AlertCircle,
	CheckCircle,
	XCircle,
	Loader2,
	MapPin
} from 'lucide-react';
import { getWeatherConditions, getUserLocation, DEFAULT_LOCATION } from '@/services/weatherService';
import {
	getFlightStatusColor,
	getFlightStatusIcon,
	formatWindSpeed,
	formatPrecipitation,
	formatVisibility,
	getWindDirection,
} from '@/utils/weatherHelpers';
import type { FlightConditions } from '@/types/weather';
import { useToast } from '@/hooks/use-toast';
import WeatherDetailModal from '@/components/weather/WeatherDetailModal';

interface WeatherCardProps {
	hasActiveSubscription: boolean;
}

const WeatherCard = ({ hasActiveSubscription }: WeatherCardProps) => {
	const [conditions, setConditions] = useState<FlightConditions | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [locationGranted, setLocationGranted] = useState(false);
	const [showDetailModal, setShowDetailModal] = useState(false);
	const { toast } = useToast();

	useEffect(() => {
		if (hasActiveSubscription) {
			loadWeather();
		} else {
			setLoading(false);
		}
	}, [hasActiveSubscription]);

	const loadWeather = async () => {
		try {
			setLoading(true);
			setError(null);

			// Intentar obtener geolocalización
			let location;
			try {
				location = await getUserLocation();
				setLocationGranted(true);
			} catch (geoError) {
				console.log('Geolocalización no disponible, usando ubicación por defecto');
				location = DEFAULT_LOCATION;
				setLocationGranted(false);
			}

			// Obtener datos meteorológicos
			const weatherData = await getWeatherConditions(location.latitude, location.longitude);
			setConditions(weatherData);
		} catch (err) {
			console.error('Error loading weather:', err);
			setError('No se pudieron cargar las condiciones meteorológicas');
			toast({
				title: 'Error',
				description: 'No se pudieron cargar las condiciones meteorológicas',
				variant: 'destructive',
			});
		} finally {
			setLoading(false);
		}
	};

	// Si no tiene suscripción activa
	if (!hasActiveSubscription) {
		return (
			<Card className="bg-white/10 backdrop-blur-xl border-2 border-[#00b3f3]/30 shadow-xl rounded-xl sm:rounded-2xl overflow-hidden">
				<CardHeader className="pb-3">
					<CardTitle className="text-white text-base sm:text-lg flex items-center gap-2">
						<Cloud className="h-5 w-5 text-[#00b3f3]" />
						Condiciones para Volar
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-center py-6">
						<Cloud className="h-12 w-12 text-white/40 mx-auto mb-3" />
						<p className="text-white/60 text-sm mb-3">
							Esta función está disponible solo para usuarios con suscripción activa
						</p>
						<Button
							size="sm"
							className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white"
							onClick={() => window.location.href = '/pricing'}
						>
							Ver Planes
						</Button>
					</div>
				</CardContent>
			</Card>
		);
	}

	// Estado de carga
	if (loading) {
		return (
			<Card className="bg-white/10 backdrop-blur-xl border-2 border-[#00b3f3]/30 shadow-xl rounded-xl sm:rounded-2xl overflow-hidden">
				<CardHeader className="pb-3">
					<CardTitle className="text-white text-base sm:text-lg flex items-center gap-2">
						<Cloud className="h-5 w-5 text-[#00b3f3]" />
						Condiciones para Volar
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-center py-6">
						<Loader2 className="h-8 w-8 text-[#00b3f3] mx-auto mb-3 animate-spin" />
						<p className="text-white/60 text-sm">Cargando condiciones meteorológicas...</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	// Estado de error
	if (error || !conditions) {
		return (
			<Card className="bg-white/10 backdrop-blur-xl border-2 border-[#00b3f3]/30 shadow-xl rounded-xl sm:rounded-2xl overflow-hidden">
				<CardHeader className="pb-3">
					<CardTitle className="text-white text-base sm:text-lg flex items-center gap-2">
						<Cloud className="h-5 w-5 text-[#00b3f3]" />
						Condiciones para Volar
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-center py-6">
						<AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
						<p className="text-white/60 text-sm mb-3">{error || 'Error al cargar datos'}</p>
						<Button
							size="sm"
							variant="outline"
							className="border-[#00b3f3] text-white hover:bg-[#00b3f3]"
							onClick={loadWeather}
						>
							Reintentar
						</Button>
					</div>
				</CardContent>
			</Card>
		);
	}

	const statusColors = getFlightStatusColor(conditions.status);
	const statusIcon = getFlightStatusIcon(conditions.status);

	return (
		<>
			<Card className="bg-white/10 backdrop-blur-xl border-2 border-[#00b3f3]/30 shadow-xl rounded-xl sm:rounded-2xl overflow-hidden hover:border-[#00b3f3]/50 transition-all duration-300">
				<CardHeader className="pb-3">
					<div className="flex items-center justify-between">
						<CardTitle className="text-white text-base sm:text-lg flex items-center gap-2">
							<Cloud className="h-5 w-5 text-[#00b3f3]" />
							Condiciones para Volar
						</CardTitle>
						{!locationGranted && (
							<Badge variant="outline" className="text-xs text-white/60 border-white/30">
								<MapPin className="h-3 w-3 mr-1" />
								Santiago
							</Badge>
						)}
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					{/* Estado General */}
					<div className={`${statusColors.bg} border-2 ${statusColors.border} rounded-lg p-4`}>
						<div className="flex items-center justify-between mb-2">
							<span className={`text-lg font-bold ${statusColors.text}`}>
								{statusIcon} {conditions.status.toUpperCase()}
							</span>
							{conditions.status === 'apto' && <CheckCircle className={`h-6 w-6 ${statusColors.text}`} />}
							{conditions.status === 'riesgoso' && <AlertCircle className={`h-6 w-6 ${statusColors.text}`} />}
							{conditions.status === 'no-apto' && <XCircle className={`h-6 w-6 ${statusColors.text}`} />}
						</div>
						<p className="text-white/80 text-sm">{conditions.message}</p>
					</div>

					{/* Condiciones Clave */}
					<div className="grid grid-cols-2 gap-3">
						{/* Viento */}
						<div className="bg-white/5 rounded-lg p-3 border border-[#00b3f3]/20">
							<div className="flex items-center gap-2 mb-1">
								<Wind className="h-4 w-4 text-[#00b3f3]" />
								<span className="text-white/60 text-xs">Viento</span>
							</div>
							<p className="text-white font-semibold text-sm">
								{formatWindSpeed(conditions.current.windSpeed)}
							</p>
							<p className="text-white/50 text-xs">
								{getWindDirection(conditions.current.windDirection)}
							</p>
						</div>

						{/* Precipitación */}
						<div className="bg-white/5 rounded-lg p-3 border border-[#00b3f3]/20">
							<div className="flex items-center gap-2 mb-1">
								<Droplets className="h-4 w-4 text-[#00b3f3]" />
								<span className="text-white/60 text-xs">Precipitación</span>
							</div>
							<p className="text-white font-semibold text-sm">
								{formatPrecipitation(conditions.current.precipitation)}
							</p>
							<p className="text-white/50 text-xs">
								{conditions.current.precipitation.toFixed(1)} mm
							</p>
						</div>

						{/* Visibilidad */}
						<div className="bg-white/5 rounded-lg p-3 border border-[#00b3f3]/20">
							<div className="flex items-center gap-2 mb-1">
								<Eye className="h-4 w-4 text-[#00b3f3]" />
								<span className="text-white/60 text-xs">Visibilidad</span>
							</div>
							<p className="text-white font-semibold text-sm">
								{formatVisibility(conditions.current.visibility)}
							</p>
							<p className="text-white/50 text-xs">
								{conditions.current.visibility.toFixed(1)} km
							</p>
						</div>

						{/* Temperatura */}
						<div className="bg-white/5 rounded-lg p-3 border border-[#00b3f3]/20">
							<div className="flex items-center gap-2 mb-1">
								<Cloud className="h-4 w-4 text-[#00b3f3]" />
								<span className="text-white/60 text-xs">Temperatura</span>
							</div>
							<p className="text-white font-semibold text-sm">
								{Math.round(conditions.current.temperature)}°C
							</p>
							<p className="text-white/50 text-xs">
								{conditions.current.humidity}% humedad
							</p>
						</div>
					</div>

					{/* Botón Ver Detalles */}
					<Button
						className="w-full bg-gradient-to-r from-[#00b3f3] to-[#0099cc] hover:from-[#0099cc] hover:to-[#00b3f3] text-white"
						onClick={() => setShowDetailModal(true)}
					>
						Ver Meteo Detallado
					</Button>
				</CardContent>
			</Card>

			{/* Modal de Detalles */}
			<WeatherDetailModal
				open={showDetailModal}
				onClose={() => setShowDetailModal(false)}
				conditions={conditions}
			/>
		</>
	);
};

export default WeatherCard;
