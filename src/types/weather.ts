// Types for Meteoblue API response
export interface MeteoblueMetadata {
	name: string;
	latitude: number;
	longitude: number;
	height: number;
	timezone_abbrevation: string;
	utc_timeoffset: number;
	modelrun_utc: string;
	modelrun_updatetime_utc: string;
}

export interface MeteoblueUnits {
	time: string;
	temperature: string;
	windspeed: string;
	precipitation: string;
	visibility: string;
}

export interface MeteoblueData1h {
	time: string[];
	temperature: number[];
	windspeed: number[];
	winddirection: number[];
	precipitation: number[];
	visibility?: number[];
	relativehumidity: number[];
	sealevelpressure: number[];
	pictocode: number[];
}

export interface MeteoblueResponse {
	metadata: MeteoblueMetadata;
	units: MeteoblueUnits;
	data_1h: MeteoblueData1h;
}

export interface WeatherConditions {
	temperature: number;
	windSpeed: number;
	windDirection: number;
	precipitation: number;
	visibility: number;
	humidity: number;
	pressure: number;
	pictocode: number;
	timestamp: string;
}

export type FlightStatus = 'apto' | 'riesgoso' | 'no-apto';

export interface FlightConditions {
	status: FlightStatus;
	current: WeatherConditions;
	forecast: WeatherConditions[];
	message: string;
}
