import { ReactNode } from 'react';
import { useSubscriptionPlan } from '@/hooks/useSubscriptionPlan';
import { PlanType } from '@/lib/planFeatures';
import type { PlanFeatures } from '@/lib/planFeatures';

interface PlanRestrictionProps {
	children: ReactNode;
	requiredPlan?: 'pro';
	feature?: keyof PlanFeatures;
	fallback?: ReactNode;
	userId?: string;
}

/**
 * Componente wrapper para restringir características según el plan
 * Muestra el contenido solo si el usuario tiene el plan requerido
 */
export function PlanRestriction({
	children,
	requiredPlan,
	feature,
	fallback = null,
	userId,
}: PlanRestrictionProps) {
	const { plan, loading } = useSubscriptionPlan(userId);

	if (loading) {
		return null;
	}

	// Si no hay plan, asumir gratis
	if (!plan) {
		return <>{fallback}</>;
	}

	// Verificar por característica específica
	if (feature) {
		const hasAccess = plan.hasFeature(feature);
		return hasAccess ? <>{children}</> : <>{fallback}</>;
	}

	// Verificar por plan requerido
	if (requiredPlan === 'pro') {
		return plan.isPro ? <>{children}</> : <>{fallback}</>;
	}

	// Si no se especifica restricción, mostrar contenido
	return <>{children}</>;
}

export default PlanRestriction;
