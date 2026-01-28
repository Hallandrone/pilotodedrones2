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
		const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
		const mpAccessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN")!;

		const supabase = createClient(supabaseUrl, supabaseServiceKey);

		const url = new URL(req.url);
		const id = url.searchParams.get("data.id") || url.searchParams.get("id");
		const type = url.searchParams.get("type");

		console.log(`Mercado Pago Webhook received: type=${type}, id=${id}`);

		// ========== NUEVO: MANEJAR EVENTOS DE SUSCRIPCIÓN ==========
		if (type === "subscription_preapproval" && id) {
			console.log("Processing subscription event...");

			// Consultar el estado de la suscripción en Mercado Pago
			const response = await fetch(`https://api.mercadopago.com/preapproval/${id}`, {
				headers: {
					Authorization: `Bearer ${mpAccessToken}`,
				},
			});

			if (!response.ok) {
				throw new Error("Error fetching subscription from Mercado Pago");
			}

			const subscription = await response.json();
			console.log(`Subscription status: ${subscription.status}, External Reference: ${subscription.external_reference}`);

			const userId = subscription.external_reference;
			const status = subscription.status;

			if (userId && (status === "authorized" || status === "paused" || status === "cancelled")) {
				// Determinar el nombre del plan basado en el precio
				const amount = subscription.auto_recurring?.transaction_amount || 0;
				let planName = "profesional";

				// Si el monto es mayor a 20000, es plan empresa
				if (amount > 20000) {
					planName = "empresa";
				}

				// Calcular fechas
				const now = new Date();
				const createdAt = now.toISOString();
				const renewalDate = new Date(now.setMonth(now.getMonth() + 1)).toISOString();
				const featuredUntil = new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString();

				// Mapear estado de MP a estado de BD
				let dbStatus = "active";
				if (status === "cancelled") {
					dbStatus = "cancelled";
				} else if (status === "paused") {
					dbStatus = "cancelled"; // Tratamos pausado como cancelado
				}

				// Actualizar la suscripción del usuario
				const { error: upsertError } = await supabase
					.from("user_subscriptions")
					.upsert({
						user_id: userId,
						plan_name: planName,
						status: dbStatus,
						payment_method: "Mercado Pago Subscription",
						created_at: createdAt,
						renewal_date: renewalDate,
						featured_until: featuredUntil,
						updated_at: createdAt,
						reveniu_subscription_id: id,
					}, {
						onConflict: "user_id",
					});

				if (upsertError) {
					console.error("Error updating subscription:", upsertError);
					throw upsertError;
				}

				console.log(`Subscription updated for user ${userId}`);
			}
		}

		// ========== MANTENER COMPATIBILIDAD: PAGOS ÚNICOS Y PAGOS RECURRENTES ==========
		if (type === "payment" && id) {
			console.log("Processing payment event...");

			// Consultar el estado del pago en Mercado Pago
			const response = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
				headers: {
					Authorization: `Bearer ${mpAccessToken}`,
				},
			});

			if (!response.ok) {
				throw new Error("Error fetching payment from Mercado Pago");
			}

			const payment = await response.json();
			console.log(`Payment status: ${payment.status}, External Reference: ${payment.external_reference}`);

			const userId = payment.external_reference;
			const status = payment.status;

			if (userId && (status === "approved" || status === "authorized")) {
				// Si el pago tiene preapproval_id, es un cobro recurrente
				const isRecurring = !!payment.preapproval_id;

				if (isRecurring) {
					// Es un pago recurrente - solo actualizar renewal_date
					console.log("Recurring payment detected - updating renewal_date");

					const now = new Date();
					const renewalDate = new Date(now.setMonth(now.getMonth() + 1)).toISOString();

					const { error } = await supabase
						.from("user_subscriptions")
						.update({
							renewal_date: renewalDate,
							updated_at: new Date().toISOString(),
						})
						.eq("user_id", userId);

					if (error) {
						console.error("Error updating renewal date:", error);
					} else {
						console.log(`Renewal date updated for user ${userId}`);
					}
				} else {
					// Es un pago único (legacy) - crear/actualizar suscripción completa
					const planItem = payment.additional_info?.items?.[0];
					const planId = planItem?.id;

					let planName = "profesional";
					if (planId === "empresa") {
						planName = "empresa";
					}

					const now = new Date();
					const createdAt = now.toISOString();
					const renewalDate = new Date(now.setMonth(now.getMonth() + 1)).toISOString();
					const featuredUntil = new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString();

					const { error: upsertError } = await supabase
						.from("user_subscriptions")
						.upsert({
							user_id: userId,
							plan_name: planName,
							status: "active",
							payment_method: "Mercado Pago",
							created_at: createdAt,
							renewal_date: renewalDate,
							featured_until: featuredUntil,
							updated_at: createdAt,
						}, {
							onConflict: "user_id",
						});

					if (upsertError) {
						console.error("Error updating subscription:", upsertError);
						throw upsertError;
					}

					console.log(`Subscription updated for user ${userId}`);
				}
			}
		}

		return new Response(JSON.stringify({ received: true }), {
			headers: { ...corsHeaders, "Content-Type": "application/json" },
			status: 200,
		});
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
		console.error("Webhook error:", errorMessage);
		return new Response(JSON.stringify({ error: errorMessage }), {
			headers: { ...corsHeaders, "Content-Type": "application/json" },
			status: 400,
		});
	}
});
