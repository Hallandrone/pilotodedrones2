import { supabase } from "@/integrations/supabase/client";

export interface MercadoPagoPreferenceResponse {
	id: string;
	init_point: string;
	error?: string;
}

/**
 * Crea una preferencia de pago en Mercado Pago llamando a la Edge Function
 */
export async function createPreference(planId: string, planName: string, price: number): Promise<MercadoPagoPreferenceResponse> {
	const { data, error } = await supabase.functions.invoke("mercadopago-api", {
		body: { planId, planName, price },
	});

	if (error) {
		console.error("Error invoking mercadopago-api:", error);
		throw error;
	}

	return data as MercadoPagoPreferenceResponse;
}
