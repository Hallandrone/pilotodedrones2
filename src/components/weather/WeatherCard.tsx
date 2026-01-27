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
	MapPin,
	RefreshCw,
	Sunrise,
	Sunset,
	Sun
} from 'lucide-react';
import { getWeatherConditions, getUserLocation, DEFAULT_LOCATION, getSunriseSunset, getLocationName, type SunriseSunsetData } from '@/services/weatherService';
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
	const [locationName, setLocationName] = useState<string>('Santiago, Chile');
	const [currentLocation, setCurrentLocation] = useState<{ latitude: number, longitude: number }>(DEFAULT_LOCATION);
	const [sunData, setSunData] = useState<SunriseSunsetData | null>(null);
	const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
	const [isActivated, setIsActivated] = useState(false);
	const { toast } = useToast();

	const CACHE_KEY = 'weather_cache';
	const CACHE_DURATION = 30 * 60 * 1000; // 30 minutos en milisegundos

	useEffect(() => {
		if (hasActiveSubscription && isActivated) {
			loadWeatherWithCache();
		} else {
			setLoading(false);
		}
	}, [hasActiveSubscription, isActivated]);

	const handleActivate = () => {
		setIsActivated(true);
		setLoading(true);
	};

	const loadWeatherWithCache = async () => {
		try {
			// Intentar cargar desde caché
			const cachedData = localStorage.getItem(CACHE_KEY);
			if (cachedData) {
				const { data, timestamp } = JSON.parse(cachedData);
				const now = new Date().getTime();
				const cacheAge = now - timestamp;

				// Si el caché tiene menos de 30 minutos, usarlo
				if (cacheAge < CACHE_DURATION) {
					setConditions(data.conditions);
					setLocationName(data.locationName);
					setCurrentLocation(data.currentLocation);
					setSunData(data.sunData);
					setLocationGranted(data.locationGranted);
					setLastUpdate(new Date(timestamp));
					setLoading(false);
					return;
				}
			}

			// Si no hay caché válido, cargar datos frescos
			await loadWeather();
		} catch (err) {
			console.error('Error loading weather with cache:', err);
			await loadWeather();
		}
	};

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

			setCurrentLocation(location);

			// Obtener nombre de ubicación
			const locName = await getLocationName(location.latitude, location.longitude);
			setLocationName(locName);

			// Obtener datos de sunrise/sunset
			const sunriseSunsetData = await getSunriseSunset(location.latitude, location.longitude);
			setSunData(sunriseSunsetData);

			// Obtener datos meteorológicos
			const weatherData = await getWeatherConditions(location.latitude, location.longitude);
			setConditions(weatherData);

			// Guardar en caché
			const cacheData = {
				data: {
					conditions: weatherData,
					locationName: locName,
					currentLocation: location,
					sunData: sunriseSunsetData,
					locationGranted: location === DEFAULT_LOCATION ? false : true
				},
				timestamp: new Date().getTime()
			};
			localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
			setLastUpdate(new Date());

			toast({
				title: 'Condiciones actualizadas',
				description: 'Datos meteorológicos actualizados correctamente',
			});
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
			<div className="h-full group relative overflow-hidden bg-gradient-to-br from-[#00b3f3]/10 to-transparent rounded-xl sm:rounded-2xl p-4 sm:p-6 border-2 border-white/10 hover:border-[#00b3f3]/30 transition-all duration-300">
				<div className="flex items-center justify-between gap-4">
					<div className="flex items-center gap-3">
						<div className="h-10 w-10 sm:h-12 sm:w-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
							<Cloud className="h-5 w-5 sm:h-6 sm:w-6 text-[#00b3f3]/60" />
						</div>
						<div>
							<h4 className="text-white text-sm sm:text-base font-bold">Clima Pro</h4>
							<p className="text-white/40 text-[10px] sm:text-xs">Ubicación real y ráfagas de viento</p>
						</div>
					</div>
					<Button
						size="sm"
						variant="ghost"
						className="bg-[#FF69B4]/10 hover:bg-[#FF69B4]/20 text-[#FF69B4] text-[10px] sm:text-xs h-8 px-3 rounded-lg border border-[#FF69B4]/20 transition-all"
						onClick={() => window.location.href = '/pilot/membership'}
					>
						Activar Pro
					</Button>
				</div>
			</div>
		);
	}

	// Si no está activado manualmente
	if (!isActivated) {
		return (
			<Card className="h-full bg-white/10 backdrop-blur-xl border-2 border-[#00b3f3]/30 shadow-xl rounded-xl sm:rounded-2xl overflow-hidden hover:border-[#00b3f3]/50 transition-all duration-300">
				<CardHeader className="pb-3">
					<CardTitle className="text-white text-base sm:text-lg flex items-center gap-2">
						<Cloud className="h-5 w-5 text-[#00b3f3]" />
						Condiciones para Volar
					</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col items-center justify-center py-6 text-center space-y-4">
					<div className="h-16 w-16 bg-[#00b3f3]/10 rounded-full flex items-center justify-center">
						<Cloud className="h-8 w-8 text-[#00b3f3] animate-pulse" />
					</div>
					<div>
						<p className="text-white font-medium mb-1">Ver condiciones meteorológicas</p>
						<p className="text-white/60 text-sm max-w-xs mx-auto">
							Haz clic para cargar los datos de clima, viento y visibilidad en tu ubicación actual.
						</p>
					</div>
					<Button
						onClick={handleActivate}
						className="bg-gradient-to-r from-[#00b3f3] to-[#0099cc] hover:from-[#0099cc] hover:to-[#00b3f3] text-white shadow-lg hover:shadow-[#00b3f3]/25 transition-all duration-300"
					>
						<RefreshCw className="h-4 w-4 mr-2" />
						Ver condiciones actuales
					</Button>
				</CardContent>
			</Card>
		);
	}

	// Estado de carga
	if (loading) {
		return (
			<Card className="h-full bg-white/10 backdrop-blur-xl border-2 border-[#00b3f3]/30 shadow-xl rounded-xl sm:rounded-2xl overflow-hidden">
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
			<Card className="h-full bg-white/10 backdrop-blur-xl border-2 border-[#00b3f3]/30 shadow-xl rounded-xl sm:rounded-2xl overflow-hidden">
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
			<Card className="h-full bg-white/10 backdrop-blur-xl border-2 border-[#00b3f3]/30 shadow-xl rounded-xl sm:rounded-2xl overflow-hidden hover:border-[#00b3f3]/50 transition-all duration-300">
				<CardHeader className="pb-3">
					<div className="flex items-start justify-between">
						<div className="flex-1">
							<CardTitle className="text-white text-base sm:text-lg flex items-center gap-2">
								<Cloud className="h-5 w-5 text-[#00b3f3]" />
								Condiciones para Volar
							</CardTitle>
							<div className="flex items-center gap-2 mt-1 flex-wrap">
								<MapPin className="h-3 w-3 text-white/60" />
								<span className="text-xs text-white/60">{locationName}</span>
								{lastUpdate && (
									<span className="text-xs text-white/40">
										• Actualizado hace {Math.floor((new Date().getTime() - lastUpdate.getTime()) / 60000)} min
									</span>
								)}
							</div>
						</div>
						<Button
							size="sm"
							variant="outline"
							className="border-[#00b3f3]/50 text-white hover:bg-[#00b3f3] hover:text-white hover:border-[#00b3f3] transition-all"
							onClick={loadWeather}
							disabled={loading}
						>
							<RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
							Actualizar
						</Button>
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

					{/* Sunrise/Sunset Data */}
					{sunData && (
						<div className="grid grid-cols-3 gap-2 bg-white/5 rounded-lg p-3 border border-[#00b3f3]/20">
							<div className="text-center">
								<Sunrise className="h-4 w-4 text-orange-400 mx-auto mb-1" />
								<p className="text-white/60 text-xs mb-1">Amanecer</p>
								<p className="text-white font-semibold text-xs">
									{new Date(sunData.sunrise).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
								</p>
							</div>
							<div className="text-center border-x border-white/10">
								<Sun className="h-4 w-4 text-yellow-400 mx-auto mb-1" />
								<p className="text-white/60 text-xs mb-1">Mediodía</p>
								<p className="text-white font-semibold text-xs">
									{new Date(sunData.solar_noon).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
								</p>
							</div>
							<div className="text-center">
								<Sunset className="h-4 w-4 text-purple-400 mx-auto mb-1" />
								<p className="text-white/60 text-xs mb-1">Atardecer</p>
								<p className="text-white font-semibold text-xs">
									{new Date(sunData.sunset).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
								</p>
							</div>
						</div>
					)}

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
