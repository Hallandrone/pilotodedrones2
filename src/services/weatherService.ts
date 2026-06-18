import SunCalc from 'suncalc';

/**
 * Horarios solares calculados localmente con la librería suncalc.
 * Cálculo 100% en el cliente: NO realiza llamadas a APIs externas.
 */
export interface SunTimes {
	sunrise: Date;
	solarNoon: Date;
	sunset: Date;
}

/**
 * Calcula amanecer, mediodía solar y atardecer para una ubicación y fecha.
 */
export function getSunTimes(
	latitude: number,
	longitude: number,
	date: Date = new Date()
): SunTimes {
	const times = SunCalc.getTimes(date, latitude, longitude);
	return {
		sunrise: times.sunrise,
		solarNoon: times.solarNoon,
		sunset: times.sunset,
	};
}

/**
 * Obtiene la geolocalización del usuario desde el navegador.
 * Es del dispositivo (no es una API de red); puede requerir permiso del usuario.
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
				maximumAge: 300000, // Cache de la posición por 5 minutos
			}
		);
	});
}

/**
 * Ubicación por defecto (Santiago, Chile) si falla o se rechaza la geolocalización.
 */
export const DEFAULT_LOCATION = {
	latitude: -33.4489,
	longitude: -70.6693,
};
