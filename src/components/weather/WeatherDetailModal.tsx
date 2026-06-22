import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
	Cloud,
	Wind,
	Droplets,
	Eye,
	Thermometer,
	Gauge,
	Clock,
	X,
} from 'lucide-react';
import type { FlightConditions } from '@/types/weather';
import {
	formatWindSpeed,
	formatPrecipitation,
	formatVisibility,
	getWindDirection,
	getFlightStatusColor,
} from '@/utils/weatherHelpers';

interface WeatherDetailModalProps {
	open: boolean;
	onClose: () => void;
	conditions: FlightConditions;
}

const WeatherDetailModal = ({ open, onClose, conditions }: WeatherDetailModalProps) => {
	const statusColors = getFlightStatusColor(conditions.status);

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-[#083b4e] border-[#00b3f3]/30 w-[95vw] sm:w-full">
				<DialogHeader className="relative">
					<DialogTitle className="text-lg sm:text-2xl text-white flex items-center gap-2 pr-10">
						<Cloud className="h-5 w-5 sm:h-6 sm:w-6 text-[#00b3f3]" />
						Pronóstico Meteorológico
					</DialogTitle>
					<DialogDescription className="text-white/60 text-xs sm:text-sm">
						Condiciones actuales y pronóstico
					</DialogDescription>
					<button
						onClick={onClose}
						className="absolute right-0 top-0 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/20 hover:border-white/40"
						aria-label="Cerrar"
					>
						<X className="h-5 w-5" />
					</button>
				</DialogHeader>

				<div className="space-y-4 sm:space-y-6 mt-4">
					{/* Estado Actual */}
					<div className={`${statusColors.bg} border-2 ${statusColors.border} rounded-lg p-3 sm:p-4`}>
						<h3 className={`text-base sm:text-lg font-bold ${statusColors.text} mb-2`}>
							Estado Actual: {conditions.status.toUpperCase()}
						</h3>
						<p className="text-white/80 text-sm sm:text-base">{conditions.message}</p>
					</div>

					{/* Condiciones Actuales Detalladas */}
					<Card className="bg-white/10 border-[#00b3f3]/30">
						<CardContent className="p-4 sm:p-6">
							<h3 className="text-white font-semibold text-base sm:text-lg mb-3 sm:mb-4">Condiciones Actuales</h3>
							<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
								{/* Temperatura */}
								<div className="bg-white/5 rounded-lg p-3 sm:p-4 border border-[#00b3f3]/20">
									<div className="flex items-center gap-2 mb-2">
										<Thermometer className="h-5 w-5 text-[#00b3f3]" />
										<span className="text-white/60 text-sm">Temperatura</span>
									</div>
									<p className="text-white text-xl sm:text-2xl font-bold">
										{Math.round(conditions.current.temperature)}°C
									</p>
								</div>

								{/* Viento */}
								<div className="bg-white/5 rounded-lg p-4 border border-[#00b3f3]/20">
									<div className="flex items-center gap-2 mb-2">
										<Wind className="h-5 w-5 text-[#00b3f3]" />
										<span className="text-white/60 text-sm">Viento</span>
									</div>
									<p className="text-white text-2xl font-bold">
										{formatWindSpeed(conditions.current.windSpeed)}
									</p>
									<p className="text-white/50 text-xs mt-1">
										{getWindDirection(conditions.current.windDirection)}
									</p>
								</div>

								{/* Precipitación */}
								<div className="bg-white/5 rounded-lg p-4 border border-[#00b3f3]/20">
									<div className="flex items-center gap-2 mb-2">
										<Droplets className="h-5 w-5 text-[#00b3f3]" />
										<span className="text-white/60 text-sm">Precipitación</span>
									</div>
									<p className="text-white text-2xl font-bold">
										{conditions.current.precipitation.toFixed(1)} mm
									</p>
									<p className="text-white/50 text-xs mt-1">
										{formatPrecipitation(conditions.current.precipitation)}
									</p>
								</div>

								{/* Visibilidad */}
								<div className="bg-white/5 rounded-lg p-4 border border-[#00b3f3]/20">
									<div className="flex items-center gap-2 mb-2">
										<Eye className="h-5 w-5 text-[#00b3f3]" />
										<span className="text-white/60 text-sm">Visibilidad</span>
									</div>
									<p className="text-white text-2xl font-bold">
										{conditions.current.visibility.toFixed(1)} km
									</p>
									<p className="text-white/50 text-xs mt-1">
										{formatVisibility(conditions.current.visibility)}
									</p>
								</div>

								{/* Humedad */}
								<div className="bg-white/5 rounded-lg p-4 border border-[#00b3f3]/20">
									<div className="flex items-center gap-2 mb-2">
										<Droplets className="h-5 w-5 text-[#00b3f3]" />
										<span className="text-white/60 text-sm">Humedad</span>
									</div>
									<p className="text-white text-2xl font-bold">
										{conditions.current.humidity}%
									</p>
								</div>

								{/* Presión */}
								<div className="bg-white/5 rounded-lg p-4 border border-[#00b3f3]/20">
									<div className="flex items-center gap-2 mb-2">
										<Gauge className="h-5 w-5 text-[#00b3f3]" />
										<span className="text-white/60 text-sm">Presión</span>
									</div>
									<p className="text-white text-2xl font-bold">
										{Math.round(conditions.current.pressure)} hPa
									</p>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Pronóstico por Horas */}
					<Card className="bg-white/10 border-[#00b3f3]/30">
						<CardContent className="p-4 sm:p-6">
							<h3 className="text-white font-semibold text-base sm:text-lg mb-3 sm:mb-4 flex items-center gap-2">
								<Clock className="h-5 w-5 text-[#00b3f3]" />
								Pronóstico Próximas Horas
							</h3>
							<div className="space-y-2 max-h-96 overflow-y-auto">
								{conditions.forecast.slice(0, 12).map((hour, index) => {
									const windKmh = Math.round(hour.windSpeed * 3.6);
									const isGoodCondition = windKmh < 25 && hour.precipitation < 2 && hour.visibility > 5;

									return (
										<div
											key={index}
											className={`flex items-center justify-between p-3 rounded-lg border ${isGoodCondition
												? 'bg-emerald-500/10 border-emerald-500/30'
												: 'bg-white/5 border-[#00b3f3]/20'
												}`}
										>
											<div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 flex-1">
												<div className="text-white/60 text-xs sm:text-sm w-full sm:w-24">
													{new Date(hour.timestamp).toLocaleTimeString('es-CL', {
														hour: '2-digit',
														minute: '2-digit',
													})}
												</div>
												<div className="flex flex-wrap items-center gap-3 sm:gap-6 flex-1">
													<div className="flex items-center gap-2">
														<Thermometer className="h-4 w-4 text-[#00b3f3]" />
														<span className="text-white text-xs sm:text-sm">{Math.round(hour.temperature)}°C</span>
													</div>
													<div className="flex items-center gap-2">
														<Wind className="h-4 w-4 text-[#00b3f3]" />
														<span className="text-white text-sm">{windKmh} km/h</span>
													</div>
													<div className="flex items-center gap-2">
														<Droplets className="h-4 w-4 text-[#00b3f3]" />
														<span className="text-white text-sm">{hour.precipitation.toFixed(1)} mm</span>
													</div>
													<div className="flex items-center gap-2">
														<Eye className="h-4 w-4 text-[#00b3f3]" />
														<span className="text-white text-sm">{hour.visibility.toFixed(1)} km</span>
													</div>
												</div>
											</div>
											{isGoodCondition && (
												<Badge className="bg-emerald-500 text-white text-xs">Apto</Badge>
											)}
										</div>
									);
								})}
							</div>
						</CardContent>
					</Card>

					{/* Información Adicional */}
					<Card className="bg-white/10 border-[#00b3f3]/30">
						<CardContent className="p-4 sm:p-6">
							<h3 className="text-white font-semibold text-base sm:text-lg mb-3">Criterios de Vuelo</h3>
							<div className="space-y-2 text-xs sm:text-sm text-white/70">
								<p>✅ <strong className="text-emerald-400">Apto:</strong> Viento {'<'} 25 km/h, sin lluvia, visibilidad {'>'} 5km</p>
								<p>⚠️ <strong className="text-yellow-400">Riesgoso:</strong> Viento 25-40 km/h, lluvia ligera, visibilidad 2-5km</p>
								<p>❌ <strong className="text-red-400">No Apto:</strong> Viento {'>'} 40 km/h, lluvia fuerte, visibilidad {'<'} 2km</p>
							</div>
						</CardContent>
					</Card>

					{/* Botón Cerrar Inferior */}
					<div className="flex justify-center pt-2 pb-4">
						<Button
							onClick={onClose}
							variant="outline"
							className="w-full sm:w-auto min-w-[200px] border-[#00b3f3] text-[#00b3f3] hover:bg-[#00b3f3] hover:text-white transition-all"
						>
							Cerrar
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};

export default WeatherDetailModal;
