import type { MeteoblueResponse, WeatherConditions, FlightConditions } from '@/types/weather';
import { determineFlightStatus } from '@/utils/weatherHelpers';

const API_KEY = '9yqgP4r2suW7nNYT';
const BASE_URL = 'https://my.meteoblue.com/packages';

/**
 * Obtiene las condiciones meteorológicas actuales y pronóstico
 */
export async function getWeatherConditions(
	latitude: number,
	longitude: number
): Promise<FlightConditions> {
	try {
		// Usar el paquete basic-1h que incluye datos horarios
		const url = `${BASE_URL}/basic-1h?apikey=${API_KEY}&lat=${latitude}&lon=${longitude}&format=json`;

		const response = await fetch(url);

		if (!response.ok) {
			throw new Error(`API error: ${response.status}`);
		}

		const data: MeteoblueResponse = await response.json();

		// Extraer condiciones actuales (primera hora del pronóstico)
		const currentIndex = 0;
		const current: WeatherConditions = {
			temperature: data.data_1h.temperature[currentIndex],
			windSpeed: data.data_1h.windspeed[currentIndex],
			windDirection: data.data_1h.winddirection[currentIndex],
			precipitation: data.data_1h.precipitation[currentIndex],
			visibility: data.data_1h.visibility[currentIndex],
			humidity: data.data_1h.relativehumidity[currentIndex],
			pressure: data.data_1h.sealevelpressure[currentIndex],
			pictocode: data.data_1h.pictocode[currentIndex],
			timestamp: data.data_1h.time[currentIndex],
		};

		// Extraer pronóstico para las próximas 24 horas
		const forecast: WeatherConditions[] = [];
		for (let i = 1; i < Math.min(24, data.data_1h.time.length); i++) {
			forecast.push({
				temperature: data.data_1h.temperature[i],
				windSpeed: data.data_1h.windspeed[i],
				windDirection: data.data_1h.winddirection[i],
				precipitation: data.data_1h.precipitation[i],
				visibility: data.data_1h.visibility[i],
				humidity: data.data_1h.relativehumidity[i],
				pressure: data.data_1h.sealevelpressure[i],
				pictocode: data.data_1h.pictocode[i],
				timestamp: data.data_1h.time[i],
			});
		}

		// Determinar estado de vuelo
		const { status, message } = determineFlightStatus(current);

		return {
			status,
			current,
			forecast,
			message,
		};
	} catch (error) {
		console.error('Error fetching weather data:', error);
		throw error;
	}
}

/**
 * Obtiene la geolocalización del usuario
 */
export function getUserLocation(): Promise<{ latitude: number; longitude: number }> {
	return new Promise((resolve, reject) => {
		if (!navigator.geolocation) {
			reject(new Error('Geolocalización no soportada'));
			return;
		}

		navigator.geolocation.getCurrentPosition(
			(position) => {
				resolve({
					latitude: position.coords.latitude,
					longitude: position.coords.longitude,
				});
			},
			(error) => {
				reject(error);
			},
			{
				enableHighAccuracy: false,
				timeout: 10000,
				maximumAge: 300000, // Cache por 5 minutos
			}
		);
	});
}

/**
 * Ubicación por defecto (Santiago, Chile) si falla la geolocalización
 */
export const DEFAULT_LOCATION = {
	latitude: -33.4489,
	longitude: -70.6693,
};
