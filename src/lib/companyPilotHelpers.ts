import { supabase } from '@/integrations/supabase/client';

/**
 * Helpers para gestión de pilotos en empresas
 */

/**
 * Verifica si una empresa puede agregar más pilotos
 */
export async function canAddPilot(companyId: string): Promise<boolean> {
	try {
		// Obtener información de la empresa
		const { data: company, error: companyError } = await supabase
			.from('companies')
			.select('user_id, max_company_pilots')
			.eq('id', companyId)
			.single();

		if (companyError || !company) {
			console.error('Error fetching company:', companyError);
			return false;
		}

		// Verificar que la empresa tenga plan Empresa activo
		const { data: subscription } = await supabase
			.from('user_subscriptions')
			.select('plan_name, status')
			.eq('user_id', company.user_id)
			.eq('status', 'active')
			.in('plan_name', ['empresa', 'premium'])
			.maybeSingle();

		if (!subscription) {
			return false;
		}

		// Contar pilotos actuales
		const { count, error: countError } = await supabase
			.from('company_pilots')
			.select('*', { count: 'exact', head: true })
			.eq('company_id', companyId);

		if (countError) {
			console.error('Error counting pilots:', countError);
			return false;
		}

		const maxPilots = company.max_company_pilots || 4;
		const currentCount = count || 0;

		return currentCount < maxPilots;
	} catch (error) {
		console.error('Error in canAddPilot:', error);
		return false;
	}
}

/**
 * Obtiene la cantidad actual de pilotos de una empresa
 */
export async function getPilotCount(companyId: string): Promise<number> {
	try {
		const { count, error } = await supabase
			.from('company_pilots')
			.select('*', { count: 'exact', head: true })
			.eq('company_id', companyId);

		if (error) {
			console.error('Error counting pilots:', error);
			return 0;
		}

		return count || 0;
	} catch (error) {
		console.error('Error in getPilotCount:', error);
		return 0;
	}
}

/**
 * Valida que un email corresponda a un usuario con plan gratis
 */
export async function validatePilotEmail(email: string): Promise<{
	valid: boolean;
	userId?: string;
	pilotId?: string;
	message?: string;
}> {
	try {
		// Buscar perfil por email
		const { data: profile, error: profileError } = await supabase
			.from('profiles')
			.select('id, user_type')
			.eq('email', email)
			.maybeSingle();

		if (profileError || !profile) {
			return {
				valid: false,
				message: 'No se encontró un usuario con ese email',
			};
		}

		// Verificar que sea un piloto
		if (profile.user_type !== 'pilot') {
			return {
				valid: false,
				message: 'El usuario no es un piloto',
			};
		}

		// Buscar registro de piloto
		const { data: pilot, error: pilotError } = await supabase
			.from('pilots')
			.select('id')
			.eq('user_id', profile.id)
			.maybeSingle();

		if (pilotError || !pilot) {
			return {
				valid: false,
				message: 'No se encontró el perfil de piloto',
			};
		}

		// Verificar que tenga plan gratis
		const { data: subscription } = await supabase
			.from('user_subscriptions')
			.select('plan_name, status')
			.eq('user_id', profile.id)
			.eq('status', 'active')
			.order('created_at', { ascending: false })
			.limit(1)
			.maybeSingle();

		const planName = subscription?.plan_name || 'free';

		if (!['free', 'basic'].includes(planName.toLowerCase())) {
			return {
				valid: false,
				message: 'El piloto ya tiene un plan de pago activo',
			};
		}

		// Verificar que no esté ya en otra empresa
		const { data: existingCompany } = await supabase
			.from('company_pilots')
			.select('company_id')
			.eq('pilot_id', pilot.id)
			.maybeSingle();

		if (existingCompany) {
			return {
				valid: false,
				message: 'El piloto ya pertenece a otra empresa',
			};
		}

		return {
			valid: true,
			userId: profile.id,
			pilotId: pilot.id,
		};
	} catch (error) {
		console.error('Error in validatePilotEmail:', error);
		return {
			valid: false,
			message: 'Error al validar el email',
		};
	}
}

/**
 * Activa características Pro para un piloto que se une a una empresa
 * Nota: Las características Pro se activan automáticamente cuando el piloto
 * pertenece a una empresa con plan Empresa activo
 */
export async function activateProFeaturesForPilot(pilotId: string): Promise<boolean> {
	try {
		// Verificar que el piloto pertenece a una empresa
		const { data: companyPilot } = await supabase
			.from('company_pilots')
			.select('company_id, companies:company_id(user_id)')
			.eq('pilot_id', pilotId)
			.maybeSingle();

		if (!companyPilot || !companyPilot.companies) {
			return false;
		}

		// Verificar que la empresa tenga plan activo
		const { data: subscription } = await supabase
			.from('user_subscriptions')
			.select('status, plan_name')
			.eq('user_id', (companyPilot.companies as any).user_id)
			.eq('status', 'active')
			.in('plan_name', ['empresa', 'premium'])
			.maybeSingle();

		return !!subscription;
	} catch (error) {
		console.error('Error in activateProFeaturesForPilot:', error);
		return false;
	}
}

/**
 * Verifica si un piloto tiene acceso a características Pro
 * (ya sea por tener plan Pro o por pertenecer a una empresa)
 */
export async function pilotHasProAccess(userId: string): Promise<boolean> {
	try {
		// Verificar plan directo del usuario
		const { data: subscription } = await supabase
			.from('user_subscriptions')
			.select('plan_name, status')
			.eq('user_id', userId)
			.eq('status', 'active')
			.in('plan_name', ['pro', 'profesional', 'empresa', 'premium'])
			.maybeSingle();

		if (subscription) {
			return true;
		}

		// Verificar si pertenece a una empresa con plan activo
		const { data: pilot } = await supabase
			.from('pilots')
			.select('id')
			.eq('user_id', userId)
			.maybeSingle();

		if (!pilot) {
			return false;
		}

		const hasProThroughCompany = await activateProFeaturesForPilot(pilot.id);
		return hasProThroughCompany;
	} catch (error) {
		console.error('Error in pilotHasProAccess:', error);
		return false;
	}
}
