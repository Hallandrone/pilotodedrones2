import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sunrise, Sunset, Sun, Loader2, MapPin } from 'lucide-react';
import { getSunTimes, getUserLocation, DEFAULT_LOCATION, type SunTimes } from '@/services/weatherService';

interface WeatherCardProps {
	hasActiveSubscription: boolean;
}

const formatTime = (date: Date) =>
	date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

const WeatherCard = ({ hasActiveSubscription }: WeatherCardProps) => {
	const [sunTimes, setSunTimes] = useState<SunTimes | null>(null);
	const [loading, setLoading] = useState(true);
	const [locationGranted, setLocationGranted] = useState(false);

	useEffect(() => {
		if (!hasActiveSubscription) {
			setLoading(false);
			return;
		}

		let mounted = true;
		const load = async () => {
			let location = DEFAULT_LOCATION;
			let granted = false;
			try {
				location = await getUserLocation();
				granted = true;
			} catch {
				location = DEFAULT_LOCATION;
			}
			if (!mounted) return;
			setLocationGranted(granted);
			// suncalc es instantáneo y local: no hay llamadas de red
			setSunTimes(getSunTimes(location.latitude, location.longitude));
			setLoading(false);
		};
		load();

		return () => {
			mounted = false;
		};
	}, [hasActiveSubscription]);

	// Teaser para usuarios sin plan pagado
	if (!hasActiveSubscription) {
		return (
			<div className="h-full group relative overflow-hidden bg-gradient-to-br from-[#00b3f3]/10 to-transparent rounded-xl sm:rounded-2xl p-4 sm:p-6 border-2 border-white/10 hover:border-[#00b3f3]/30 transition-all duration-300">
				<div className="flex items-center justify-between gap-4">
					<div className="flex items-center gap-3">
						<div className="h-10 w-10 sm:h-12 sm:w-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
							<Sun className="h-5 w-5 sm:h-6 sm:w-6 text-[#00b3f3]/60" />
						</div>
						<div>
							<h4 className="text-white text-sm sm:text-base font-bold">Horario Solar</h4>
							<p className="text-white/40 text-[10px] sm:text-xs">Amanecer y atardecer para tus vuelos</p>
						</div>
					</div>
					<Button
						size="sm"
						variant="ghost"
						className="bg-[#FF69B4]/10 hover:bg-[#FF69B4]/20 text-[#FF69B4] text-[10px] sm:text-xs h-8 px-3 rounded-lg border border-[#FF69B4]/20 transition-all"
						onClick={() => (window.location.href = '/pilot/membership')}
					>
						Activar Pro
					</Button>
				</div>
			</div>
		);
	}

	// Estado de carga (mientras se resuelve la geolocalización)
	if (loading) {
		return (
			<Card className="h-full bg-white/10 backdrop-blur-xl border-2 border-[#00b3f3]/30 shadow-xl rounded-xl sm:rounded-2xl overflow-hidden">
				<CardHeader className="pb-3">
					<CardTitle className="text-white text-base sm:text-lg flex items-center gap-2">
						<Sun className="h-5 w-5 text-[#00b3f3]" />
						Horario Solar
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-center py-6">
						<Loader2 className="h-8 w-8 text-[#00b3f3] mx-auto mb-3 animate-spin" />
						<p className="text-white/60 text-sm">Calculando horario solar...</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="h-full bg-white/10 backdrop-blur-xl border-2 border-[#00b3f3]/30 shadow-xl rounded-xl sm:rounded-2xl overflow-hidden hover:border-[#00b3f3]/50 transition-all duration-300">
			<CardHeader className="pb-3">
				<CardTitle className="text-white text-base sm:text-lg flex items-center gap-2">
					<Sun className="h-5 w-5 text-[#00b3f3]" />
					Horario Solar
				</CardTitle>
				<div className="flex items-center gap-2 mt-1">
					<MapPin className="h-3 w-3 text-white/60" />
					<span className="text-xs text-white/60">
						{locationGranted ? 'Según tu ubicación actual' : 'Santiago, Chile (ubicación por defecto)'}
					</span>
				</div>
			</CardHeader>
			<CardContent>
				{sunTimes && (
					<div className="grid grid-cols-3 gap-2 bg-white/5 rounded-lg p-3 border border-[#00b3f3]/20">
						<div className="text-center">
							<Sunrise className="h-5 w-5 text-orange-400 mx-auto mb-1" />
							<p className="text-white/60 text-xs mb-1">Amanecer</p>
							<p className="text-white font-semibold text-sm">{formatTime(sunTimes.sunrise)}</p>
						</div>
						<div className="text-center border-x border-white/10">
							<Sun className="h-5 w-5 text-yellow-400 mx-auto mb-1" />
							<p className="text-white/60 text-xs mb-1">Mediodía</p>
							<p className="text-white font-semibold text-sm">{formatTime(sunTimes.solarNoon)}</p>
						</div>
						<div className="text-center">
							<Sunset className="h-5 w-5 text-purple-400 mx-auto mb-1" />
							<p className="text-white/60 text-xs mb-1">Atardecer</p>
							<p className="text-white font-semibold text-sm">{formatTime(sunTimes.sunset)}</p>
						</div>
					</div>
				)}
				<p className="text-white/40 text-[11px] mt-3 text-center">
					Ideal para planificar la luz dorada en fotogrametría y tomas aéreas.
				</p>
			</CardContent>
		</Card>
	);
};

export default WeatherCard;
