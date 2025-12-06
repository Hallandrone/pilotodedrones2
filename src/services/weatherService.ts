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
			visibility: data.data_1h.visibility?.[currentIndex] ?? 10,
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
				visibility: data.data_1h.visibility?.[i] ?? 10,
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

/**
 * Interfaz para respuesta de Sunrise-Sunset API
 */
export interface SunriseSunsetData {
	sunrise: string;
	sunset: string;
	solar_noon: string;
	day_length: number;
}

/**
 * Obtiene datos de amanecer y atardecer
 */
export async function getSunriseSunset(
	latitude: number,
	longitude: number
): Promise<SunriseSunsetData | null> {
	try {
		const url = `https://api.sunrise-sunset.org/json?lat=${latitude}&lng=${longitude}&formatted=0`;
		const response = await fetch(url);

		if (!response.ok) {
			throw new Error(`API error: ${response.status}`);
		}

		const data = await response.json();

		if (data.status !== 'OK') {
			throw new Error(`API status: ${data.status}`);
		}

		return {
			sunrise: data.results.sunrise,
			sunset: data.results.sunset,
			solar_noon: data.results.solar_noon,
			day_length: data.results.day_length,
		};
	} catch (error) {
		console.error('Error fetching sunrise-sunset data:', error);
		return null;
	}
}

/**
 * Obtiene el nombre de la ubicación usando geocodificación inversa
 */
export async function getLocationName(
	latitude: number,
	longitude: number
): Promise<string> {
	try {
		// Usar Nominatim de OpenStreetMap para geocodificación inversa (gratis)
		const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`;
		const response = await fetch(url, {
			headers: {
				'User-Agent': 'PilotoDeDrones/1.0',
			},
		});

		if (!response.ok) {
			throw new Error(`Geocoding API error: ${response.status}`);
		}

		const data = await response.json();

		// Intentar obtener ciudad/comuna
		const address = data.address;
		const city = address.city || address.town || address.village || address.municipality;
		const state = address.state || address.region;

		if (city && state) {
			return `${city}, ${state}`;
		} else if (city) {
			return city;
		} else if (state) {
			return state;
		} else {
			return data.display_name.split(',').slice(0, 2).join(',');
		}
	} catch (error) {
		console.error('Error fetching location name:', error);
		return 'Ubicación desconocida';
	}
}
