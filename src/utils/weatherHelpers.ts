import type { FlightStatus, WeatherConditions } from '@/types/weather';

/**
 * Determina si las condiciones son aptas para volar un drone
 * Basado en viento, precipitación y visibilidad
 */
export function determineFlightStatus(conditions: WeatherConditions): {
	status: FlightStatus;
	message: string;
} {
	const { windSpeed, precipitation, visibility } = conditions;

	// Convertir windSpeed de m/s a km/h
	const windKmh = windSpeed * 3.6;

	// Criterios para NO APTO
	if (windKmh > 40 || precipitation > 5 || visibility < 2) {
		return {
			status: 'no-apto',
			message: 'Condiciones peligrosas para volar. No se recomienda operar drones.',
		};
	}

	// Criterios para RIESGOSO
	if (
		(windKmh >= 25 && windKmh <= 40) ||
		(precipitation > 0 && precipitation <= 5) ||
		(visibility >= 2 && visibility < 5)
	) {
		return {
			status: 'riesgoso',
			message: 'Condiciones marginales. Volar con precaución y experiencia.',
		};
	}

	// APTO
	return {
		status: 'apto',
		message: 'Condiciones óptimas para volar. Buen vuelo!',
	};
}

/**
 * Obtiene el color asociado al estado de vuelo
 */
export function getFlightStatusColor(status: FlightStatus): {
	bg: string;
	text: string;
	border: string;
} {
	switch (status) {
		case 'apto':
			return {
				bg: 'bg-emerald-500/20',
				text: 'text-emerald-400',
				border: 'border-emerald-400',
			};
		case 'riesgoso':
			return {
				bg: 'bg-yellow-500/20',
				text: 'text-yellow-400',
				border: 'border-yellow-400',
			};
		case 'no-apto':
			return {
				bg: 'bg-red-500/20',
				text: 'text-red-400',
				border: 'border-red-400',
			};
	}
}

/**
 * Obtiene el icono asociado al estado de vuelo
 */
export function getFlightStatusIcon(status: FlightStatus): string {
	switch (status) {
		case 'apto':
			return '✓';
		case 'riesgoso':
			return '⚠';
		case 'no-apto':
			return '✗';
	}
}

/**
 * Formatea la velocidad del viento de m/s a km/h
 */
export function formatWindSpeed(speedMs: number): string {
	const speedKmh = Math.round(speedMs * 3.6);
	return `${speedKmh} km/h`;
}

/**
 * Formatea la precipitación
 */
export function formatPrecipitation(mm: number): string {
	if (mm === 0) return 'Sin lluvia';
	if (mm < 2) return 'Lluvia ligera';
	if (mm < 5) return 'Lluvia moderada';
	return 'Lluvia fuerte';
}

/**
 * Formatea la visibilidad
 */
export function formatVisibility(km: number): string {
	if (km >= 10) return 'Excelente';
	if (km >= 5) return 'Buena';
	if (km >= 2) return 'Moderada';
	return 'Pobre';
}

/**
 * Obtiene la dirección del viento en texto
 */
export function getWindDirection(degrees: number): string {
	const directions = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
	const index = Math.round(degrees / 45) % 8;
	return directions[index];
}
