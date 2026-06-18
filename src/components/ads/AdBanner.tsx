import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type BannerPosition = 'Superior' | 'Medio' | 'Inferior' | 'Lateral Derecho';

interface Banner {
	id: string;
	title: string;
	image_url: string;
	mobile_image_url: string | null;
	redirect_url: string | null;
	position: string;
	desktop_only: boolean;
}

/** Asegura que la URL de redirección tenga protocolo. */
const formatUrl = (url: string | null) => {
	if (!url) return '#';
	return !/^https?:\/\//.test(url) ? `https://${url}` : url;
};

interface AdBannerProps {
	/** Posición a renderizar (debe coincidir con la del panel de administración). */
	position: BannerPosition;
	className?: string;
}

/**
 * Renderiza los banners publicitarios activos de una posición.
 *
 * Responsive: en escritorio usa `image_url`; en móvil usa `mobile_image_url`
 * (con respaldo a `image_url`). El banner "Lateral Derecho" marcado como
 * `desktop_only` se oculta en móvil por ser vertical.
 */
export function AdBanner({ position, className = '' }: AdBannerProps) {
	const [banners, setBanners] = useState<Banner[]>([]);

	useEffect(() => {
		let mounted = true;
		(async () => {
			const { data } = await supabase
				.from('ad_banners')
				.select('*')
				.eq('active', true)
				.eq('position', position)
				.order('created_at', { ascending: false });
			if (mounted) setBanners(data || []);
		})();
		return () => {
			mounted = false;
		};
	}, [position]);

	if (banners.length === 0) return null;

	// Registra el clic sin bloquear la navegación (fire-and-forget).
	const registerClick = (bannerId: string) => {
		void supabase.from('banner_clicks').insert({ banner_id: bannerId });
	};

	return (
		<div className={className}>
			{banners.map((b) => {
				// Solo el lateral vertical marcado desktop_only se oculta en móvil.
				const hideOnMobile = b.position === 'Lateral Derecho' && b.desktop_only;
				return (
					<a
						key={b.id}
						href={formatUrl(b.redirect_url)}
						target="_blank"
						rel="noopener noreferrer"
						aria-label={b.title}
						onClick={() => registerClick(b.id)}
						className="block rounded-xl overflow-hidden shadow-lg hover:scale-[1.01] transition-transform"
					>
						{/* Escritorio */}
						<img
							src={b.image_url}
							alt={b.title}
							loading="lazy"
							className="hidden md:block w-full h-auto object-cover"
						/>
						{/* Móvil */}
						{!hideOnMobile && (
							<img
								src={b.mobile_image_url || b.image_url}
								alt={b.title}
								loading="lazy"
								className="block md:hidden w-full h-auto object-cover"
							/>
						)}
					</a>
				);
			})}
		</div>
	);
}

export default AdBanner;
