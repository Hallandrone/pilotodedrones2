import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PlanType, hasFeature, normalizePlanName, getPlanDisplayName, isPaidPlan, isFreePlan, isProPlan, isEnterprisePlan } from '@/lib/planFeatures';
import type { PlanFeatures } from '@/lib/planFeatures';

interface SubscriptionPlan {
	plan: PlanType;
	displayName: string;
	status: 'active' | 'pending' | 'expired' | 'cancelled' | 'inactive';
	renewalDate: string | null;
	isPaid: boolean;
	isFree: boolean;
	isPro: boolean;
	isEnterprise: boolean;
	hasFeature: (feature: keyof PlanFeatures) => boolean;
}

/**
 * Hook para obtener y gestionar el plan de suscripción del usuario
 * Incluye cache para evitar consultas repetidas
 */
export function useSubscriptionPlan(userId?: string) {
	const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);

	useEffect(() => {
		let mounted = true;

		const loadPlan = async () => {
			try {
				setLoading(true);
				setError(null);

				// Obtener usuario actual si no se proporciona userId
				let targetUserId = userId;
				if (!targetUserId) {
					const { data: { user } } = await supabase.auth.getUser();
					if (!user) {
						if (mounted) {
							setPlan(null);
							setLoading(false);
						}
						return;
					}
					targetUserId = user.id;
				}

				// Buscar suscripción activa o cancelada con fecha futura
				const { data: subscription, error: subError } = await supabase
					.from('user_subscriptions')
					.select('plan_name, status, renewal_date')
					.eq('user_id', targetUserId)
					.or('status.eq.active,and(status.eq.cancelled,renewal_date.gt.now())')
					.order('created_at', { ascending: false })
					.limit(1)
					.maybeSingle();

				if (subError && subError.code !== 'PGRST116') {
					throw subError;
				}

				// Si no hay suscripción activa, el usuario tiene plan gratis
				const planName = subscription?.plan_name || 'free';
				const normalizedPlan = normalizePlanName(planName);

				if (mounted) {
					setPlan({
						plan: normalizedPlan,
						displayName: getPlanDisplayName(normalizedPlan),
						status: (subscription?.status as 'active' | 'pending' | 'expired' | 'cancelled' | 'inactive') || 'active',
						renewalDate: subscription?.renewal_date || null,
						isPaid: isPaidPlan(normalizedPlan),
						isFree: isFreePlan(normalizedPlan),
						isPro: isProPlan(normalizedPlan),
						isEnterprise: isEnterprisePlan(normalizedPlan),
						hasFeature: (feature: keyof PlanFeatures) => hasFeature(normalizedPlan, feature),
					});
				}
			} catch (err) {
				console.error('Error loading subscription plan:', err);
				if (mounted) {
					setError(err as Error);
					// En caso de error, asumir plan gratis
					setPlan({
						plan: 'free',
						displayName: 'Plan Gratis',
						status: 'active',
						renewalDate: null,
						isPaid: false,
						isFree: true,
						isPro: false,
						isEnterprise: false,
						hasFeature: (feature: keyof PlanFeatures) => hasFeature('free', feature),
					});
				}
			} finally {
				if (mounted) {
					setLoading(false);
				}
			}
		};

		loadPlan();

		// Suscribirse a cambios en user_subscriptions
		const channel = supabase
			.channel('subscription-changes')
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'user_subscriptions',
					filter: userId ? `user_id=eq.${userId}` : undefined,
				},
				() => {
					// Recargar plan cuando cambie la suscripción
					loadPlan();
				}
			)
			.subscribe();

		return () => {
			mounted = false;
			channel.unsubscribe();
		};
	}, [userId]);

	return { plan, loading, error };
}

/**
 * Hook simplificado para solo verificar si el usuario tiene acceso a una característica
 */
export function useHasFeature(feature: keyof PlanFeatures, userId?: string): boolean {
	const { plan } = useSubscriptionPlan(userId);
	return plan?.hasFeature(feature) ?? false;
}

/**
 * Hook para verificar si el usuario tiene un plan de pago
 */
export function useIsPaidPlan(userId?: string): boolean {
	const { plan } = useSubscriptionPlan(userId);
	return plan?.isPaid ?? false;
}
