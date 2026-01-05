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
		body: { action: "create_preference", planId, planName, price },
	});

	if (error) {
		console.error("Error invoking mercadopago-api:", error);
		throw error;
	}

	return data as MercadoPagoPreferenceResponse;
}

/**
 * Procesa un pago directo (Checkout Bricks) llamando a la Edge Function
 */
export async function processPayment(formData: any): Promise<any> {
	const { data, error } = await supabase.functions.invoke("mercadopago-api", {
		body: { action: "process_payment", formData },
	});

	if (error) {
		console.error("Error processing payment:", error);
		throw error;
	}

	return data;
}
