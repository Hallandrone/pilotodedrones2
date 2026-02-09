/**
 * Configuración centralizada de características por plan
 * Define qué características están disponibles en cada plan de suscripción
 */

export type PlanType = 'free' | 'pro' | 'profesional' | 'empresa' | 'premium' | 'basic';

export interface PlanFeatures {
	// Características básicas
	publicProfile: boolean;
	qrCode: boolean;
	searchVisibility: boolean;

	// Características Pro
	certificates: boolean;
	flightLogs: boolean;
	weatherData: boolean;
	customUrl: boolean;
	featuredProfile: boolean;
	certifiedBadge: boolean;

	// Características Empresa
	companyPilots: boolean;
	companyBadge: boolean;
	featuredRecommendations: boolean;
	whatsappSupport: boolean;
	profileViews: boolean;
	contactLeads: boolean;
}

// Límites por plan
export const PLAN_LIMITS = {
	MAX_COMPANY_PILOTS: 4,
	MAX_CERTIFICATES_FREE: 0,
	MAX_CERTIFICATES_PRO: -1, // -1 = ilimitado
	MAX_FLIGHT_LOGS_FREE: 0,
	MAX_FLIGHT_LOGS_PRO: -1, // -1 = ilimitado
} as const;

// Precios originales (antes del lanzamiento)
export const ORIGINAL_PRICES = {
	pro: 14990,
	profesional: 14990,
} as const;

// Precios de lanzamiento
export const LAUNCH_PRICES = {
	pro: 8000,
	profesional: 8000,
} as const;

// Precios actuales por plan (en CLP)
export const PLAN_PRICES = {
	free: 0,
	pro: 8000,          // Precio de lanzamiento
	profesional: 8000,  // Precio de lanzamiento
	empresa: 39990,
	premium: 39990,
	basic: 0,
} as const;

// Características disponibles por plan
export const PLAN_FEATURES: Record<PlanType, PlanFeatures> = {
	free: {
		publicProfile: true,
		qrCode: true,
		searchVisibility: true,
		certificates: false,
		flightLogs: false,
		weatherData: false,
		customUrl: false,
		featuredProfile: false,
		certifiedBadge: false,
		companyPilots: false,
		companyBadge: false,
		featuredRecommendations: false,
		whatsappSupport: false,
		profileViews: false,
		contactLeads: false,
	},
	basic: {
		publicProfile: true,
		qrCode: true,
		searchVisibility: true,
		certificates: false,
		flightLogs: false,
		weatherData: false,
		customUrl: false,
		featuredProfile: false,
		certifiedBadge: false,
		companyPilots: false,
		companyBadge: false,
		featuredRecommendations: false,
		whatsappSupport: false,
		profileViews: false,
		contactLeads: false,
	},
	pro: {
		publicProfile: true,
		qrCode: true,
		searchVisibility: true,
		certificates: true,
		flightLogs: true,
		weatherData: true,
		customUrl: true,
		featuredProfile: true,
		certifiedBadge: true,
		companyPilots: false,
		companyBadge: false,
		featuredRecommendations: false,
		whatsappSupport: false,
		profileViews: false,
		contactLeads: false,
	},
	profesional: {
		publicProfile: true,
		qrCode: true,
		searchVisibility: true,
		certificates: true,
		flightLogs: true,
		weatherData: true,
		customUrl: true,
		featuredProfile: true,
		certifiedBadge: true,
		companyPilots: false,
		companyBadge: false,
		featuredRecommendations: false,
		whatsappSupport: false,
		profileViews: false,
		contactLeads: false,
	},
	empresa: {
		publicProfile: true,
		qrCode: true,
		searchVisibility: true,
		certificates: true,
		flightLogs: true,
		weatherData: true,
		customUrl: true,
		featuredProfile: true,
		certifiedBadge: true,
		companyPilots: true,
		companyBadge: true,
		featuredRecommendations: true,
		whatsappSupport: true,
		profileViews: true,
		contactLeads: true,
	},
	premium: {
		publicProfile: true,
		qrCode: true,
		searchVisibility: true,
		certificates: true,
		flightLogs: true,
		weatherData: true,
		customUrl: true,
		featuredProfile: true,
		certifiedBadge: true,
		companyPilots: true,
		companyBadge: true,
		featuredRecommendations: true,
		whatsappSupport: true,
		profileViews: true,
		contactLeads: true,
	},
};

/**
 * Verifica si un plan tiene acceso a una característica específica
 */
export function hasFeature(plan: PlanType, feature: keyof PlanFeatures): boolean {
	return PLAN_FEATURES[plan]?.[feature] ?? false;
}

/**
 * Verifica si un plan es de pago (Pro o Empresa)
 */
export function isPaidPlan(plan: PlanType): boolean {
	return ['pro', 'profesional', 'empresa', 'premium'].includes(plan);
}

/**
 * Verifica si un plan es gratuito
 */
export function isFreePlan(plan: PlanType): boolean {
	return ['free', 'basic'].includes(plan);
}

/**
 * Verifica si un plan es Pro (incluye variantes)
 */
export function isProPlan(plan: PlanType): boolean {
	return ['pro', 'profesional'].includes(plan);
}

/**
 * Verifica si un plan es Empresa (incluye variantes)
 */
export function isEnterprisePlan(plan: PlanType): boolean {
	return ['empresa', 'premium'].includes(plan);
}

/**
 * Obtiene el nombre display del plan
 */
export function getPlanDisplayName(plan: PlanType): string {
	const names: Record<PlanType, string> = {
		free: 'Plan Gratis',
		basic: 'Plan Gratis',
		pro: 'Plan Pro',
		profesional: 'Plan Pro',
		empresa: 'Plan Empresa',
		premium: 'Plan Empresa',
	};
	return names[plan] ?? 'Plan Desconocido';
}

/**
 * Obtiene el precio del plan
 */
export function getPlanPrice(plan: PlanType): number {
	return PLAN_PRICES[plan] ?? 0;
}

/**
 * Obtiene el precio original del plan (antes del lanzamiento)
 * Retorna null si el plan no tiene precio original
 */
export function getOriginalPrice(plan: PlanType): number | null {
	return ORIGINAL_PRICES[plan as keyof typeof ORIGINAL_PRICES] ?? null;
}

/**
 * Verifica si un plan tiene precio de lanzamiento
 */
export function hasLaunchPrice(plan: PlanType): boolean {
	return plan === 'pro' || plan === 'profesional';
}

/**
 * Normaliza el nombre del plan a la variante estándar
 */
export function normalizePlanName(plan: string): PlanType {
	const normalized = plan.toLowerCase();

	if (['pro', 'profesional'].includes(normalized)) return 'pro';
	if (['empresa', 'premium'].includes(normalized)) return 'empresa';
	if (['free', 'basic'].includes(normalized)) return 'free';

	return normalized as PlanType;
}
