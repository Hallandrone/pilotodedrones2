/**
 * Configuración centralizada de características por plan
 * Define qué características están disponibles en cada plan de suscripción
 *
 * Planes vigentes:
 * - free: registrados sin código QR de la academia (solo funciones básicas)
 * - pro: "Plan Alumno Academia" (key interna `pro` para no romper user_subscriptions)
 */

export type PlanType = 'free' | 'pro';

export interface PlanFeatures {
	// Características básicas (plan free)
	publicProfile: boolean;
	qrCode: boolean;
	searchVisibility: boolean;

	// Características Plan Alumno Academia (pro)
	certificates: boolean;
	flightLogs: boolean;
	customUrl: boolean;
	featuredProfile: boolean;
	certifiedBadge: boolean;
	whatsappSupport: boolean;
}

// Límites por plan
export const PLAN_LIMITS = {
	MAX_CERTIFICATES_FREE: 0,
	MAX_CERTIFICATES_PRO: -1, // -1 = ilimitado
	MAX_FLIGHT_LOGS_FREE: 0,
	MAX_FLIGHT_LOGS_PRO: -1, // -1 = ilimitado
} as const;

// Características disponibles por plan
export const PLAN_FEATURES: Record<PlanType, PlanFeatures> = {
	free: {
		publicProfile: true,
		qrCode: true,
		searchVisibility: true,
		certificates: false,
		flightLogs: false,
		customUrl: false,
		featuredProfile: false,
		certifiedBadge: false,
		whatsappSupport: false,
	},
	pro: {
		publicProfile: true,
		qrCode: true,
		searchVisibility: true,
		certificates: true,
		flightLogs: true,
		customUrl: true,
		featuredProfile: true,
		certifiedBadge: true,
		whatsappSupport: true,
	},
};

/**
 * Verifica si un plan tiene acceso a una característica específica
 */
export function hasFeature(plan: PlanType, feature: keyof PlanFeatures): boolean {
	return PLAN_FEATURES[plan]?.[feature] ?? false;
}

/**
 * Verifica si un plan es de pago (Plan Alumno Academia)
 */
export function isPaidPlan(plan: PlanType): boolean {
	return plan === 'pro';
}

/**
 * Verifica si un plan es gratuito
 */
export function isFreePlan(plan: PlanType): boolean {
	return plan === 'free';
}

/**
 * Verifica si un plan es Pro / Alumno Academia
 */
export function isProPlan(plan: PlanType): boolean {
	return plan === 'pro';
}

/**
 * Obtiene el nombre display del plan
 */
export function getPlanDisplayName(plan: PlanType): string {
	const names: Record<PlanType, string> = {
		free: 'Plan Gratis',
		pro: 'Plan Alumno Academia',
	};
	return names[plan] ?? 'Plan Desconocido';
}

/**
 * Normaliza el nombre del plan (incluye valores legacy de la base de datos)
 * a la variante estándar vigente. Cualquier plan pagado legacy
 * (profesional, premium, empresa) se mapea a `pro`; el resto a `free`.
 */
export function normalizePlanName(plan: string): PlanType {
	const normalized = plan.toLowerCase();

	if (['pro', 'profesional', 'premium', 'empresa'].includes(normalized)) return 'pro';
	return 'free';
}
