import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
	if (req.method === "OPTIONS") {
		return new Response("ok", { headers: corsHeaders });
	}

	try {
		const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
		const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
		const mpAccessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN")!;

		const supabase = createClient(supabaseUrl, supabaseAnonKey, {
			global: { headers: { Authorization: req.headers.get("Authorization")! } },
		});

		const { data: { user }, error: authError } = await supabase.auth.getUser();
		if (authError || !user) throw new Error("Unauthorized");

		const body = await req.json();
		const { action } = body;

		if (action === "create_preference") {
			const { planId, planName, price } = body;
			const preference = {
				items: [
					{
						id: planId,
						title: `Suscripción Piloto de Drones - ${planName}`,
						quantity: 1,
						unit_price: price,
						currency_id: "CLP",
					},
				],
				payer: {
					email: user.email,
					name: user.user_metadata?.full_name,
				},
				back_urls: {
					success: `${req.headers.get("origin")}/pilot/membership?success=true`,
					failure: `${req.headers.get("origin")}/pilot/membership?error=true`,
					pending: `${req.headers.get("origin")}/pilot/membership?pending=true`,
				},
				auto_return: "approved",
				notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook`,
				external_reference: user.id,
			};

			const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${mpAccessToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(preference),
			});

			const data = await response.json();
			if (!response.ok) throw new Error(data.message || "Error al crear la preferencia");

			return new Response(JSON.stringify({ id: data.id, init_point: data.init_point }), {
				headers: { ...corsHeaders, "Content-Type": "application/json" },
				status: 200,
			});

		} else if (action === "process_payment") {
			const { formData } = body;

			// Preparar el objeto de pago para Mercado Pago
			const paymentData = {
				token: formData.token,
				issuer_id: formData.issuer_id,
				payment_method_id: formData.payment_method_id,
				transaction_amount: formData.transaction_amount,
				installments: formData.installments,
				description: formData.description,
				payer: {
					email: formData.payer.email,
					identification: {
						type: formData.payer.identification.type,
						number: formData.payer.identification.number,
					},
				},
				additional_info: {
					items: [
						{
							id: formData.planId || "profesional", // Usamos el ID del plan para el webhook
							title: formData.description,
							quantity: 1,
							unit_price: formData.transaction_amount,
						}
					],
					payer: {
						first_name: user.user_metadata?.full_name?.split(' ')[0] || "Usuario",
						last_name: user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || "",
					}
				},
				notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook`,
				external_reference: user.id,
			};

			const response = await fetch("https://api.mercadopago.com/v1/payments", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${mpAccessToken}`,
					"Content-Type": "application/json",
					"X-Idempotency-Key": crypto.randomUUID(),
				},
				body: JSON.stringify(paymentData),
			});

			const data = await response.json();

			if (!response.ok) {
				console.error("Mercado Pago Payment Error:", data);
				throw new Error(data.message || "Error al procesar el pago");
			}

			return new Response(JSON.stringify(data), {
				headers: { ...corsHeaders, "Content-Type": "application/json" },
				status: 200,
			});
		}

		throw new Error("Acción no válida");

	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
		console.error("Edge Function Error:", errorMessage);
		return new Response(JSON.stringify({ error: errorMessage }), {
			headers: { ...corsHeaders, "Content-Type": "application/json" },
			status: 400,
		});
	}
});
