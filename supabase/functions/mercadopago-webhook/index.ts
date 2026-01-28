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

		// Obtener datos del webhook (puede venir en URL o en el Body)
		const url = new URL(req.url);
		let id = url.searchParams.get("data.id") || url.searchParams.get("id");
		let type = url.searchParams.get("type") || url.searchParams.get("topic");

		// Si no hay datos en la URL, intentar leer del BODY (formato Webhook JSON)
		if (!id || !type) {
			try {
				const body = await req.json();
				console.log("Webhook body received:", JSON.stringify(body));

				if (body.data?.id) id = body.data.id;
				else if (body.id) id = body.id;

				if (body.type) type = body.type;
				else if (body.topic) type = body.topic;
			} catch (e) {
				console.log("No JSON body found or error parsing it");
			}
		}

		console.log(`[MP Webhook] Processing: type=${type}, id=${id}`);

		if (!id || !type) {
			console.log("[MP Webhook] Missing id or type, skipping...");
			return new Response(JSON.stringify({ received: true, skipped: true }), {
				headers: { ...corsHeaders, "Content-Type": "application/json" },
				status: 200,
			});
		}

		// ========== MANEJAR EVENTOS DE SUSCRIPCIÓN (PREAPPROVAL) ==========
		if (type === "subscription_preapproval" || type === "preapproval") {
			console.log(`[MP Webhook] Processing preapproval: ${id}`);

			const response = await fetch(`https://api.mercadopago.com/preapproval/${id}`, {
				headers: { Authorization: `Bearer ${mpAccessToken}` },
			});

			if (!response.ok) {
				const errText = await response.text();
				console.error(`[MP Webhook] Error fetching subscription ${id}:`, errText);
				throw new Error("Error fetching subscription from Mercado Pago");
			}

			const subscription = await response.json();
			const userId = subscription.external_reference;
			const status = subscription.status;

			console.log(`[MP Webhook] Sub ID: ${id}, Status: ${status}, User: ${userId}`);

			if (userId && (status === "authorized" || status === "paused" || status === "cancelled")) {
				const amount = subscription.auto_recurring?.transaction_amount || 0;
				let planName = "profesional";
				if (amount > 30000) planName = "empresa";

				const now = new Date();
				const renewalDate = new Date();
				renewalDate.setMonth(renewalDate.getMonth() + 1);

				let dbStatus = "active";
				if (status === "cancelled" || status === "paused") dbStatus = "cancelled";

				const { error: upsertError } = await supabase
					.from("user_subscriptions")
					.upsert({
						user_id: userId,
						plan_name: planName,
						status: dbStatus,
						payment_method: "Mercado Pago Subscription",
						renewal_date: renewalDate.toISOString(),
						updated_at: new Date().toISOString(),
						reveniu_subscription_id: id,
					}, { onConflict: "user_id" });

				if (upsertError) {
					console.error("[MP Webhook] DB Error (preapproval):", upsertError);
					throw upsertError;
				}
				console.log(`[MP Webhook] Subscription successfully updated for user ${userId}`);
			}
		}

		// ========== MANEJAR EVENTOS DE PAGO (PAYMENT) ==========
		if (type === "payment") {
			console.log(`[MP Webhook] Processing payment: ${id}`);

			const response = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
				headers: { Authorization: `Bearer ${mpAccessToken}` },
			});

			if (!response.ok) {
				const errText = await response.text();
				console.error(`[MP Webhook] Error fetching payment ${id}:`, errText);
				throw new Error("Error fetching payment from Mercado Pago");
			}

			const payment = await response.json();
			const userId = payment.external_reference;
			const status = payment.status;

			console.log(`[MP Webhook] Payment ID: ${id}, Status: ${status}, Detail: ${payment.status_detail}, User: ${userId}`);

			if (userId && (status === "approved" || status === "authorized")) {
				const isRecurring = !!payment.preapproval_id;

				if (isRecurring) {
					console.log("[MP Webhook] Recurring payment detected - updating renewal date");
					const nextMonth = new Date();
					nextMonth.setMonth(nextMonth.getMonth() + 1);

					const { error } = await supabase
						.from("user_subscriptions")
						.update({
							status: "active",
							renewal_date: nextMonth.toISOString(),
							updated_at: new Date().toISOString(),
						})
						.eq("user_id", userId);

					if (error) console.error("[MP Webhook] DB Error (recurring):", error);
				} else {
					console.log("[MP Webhook] Single payment - activating/updating plan");

					// Intentar extraer plan del item o del monto
					const planItem = payment.additional_info?.items?.[0];
					let planName = planItem?.id === "empresa" || payment.transaction_amount > 30000 ? "empresa" : "profesional";

					const renewalDate = new Date();
					renewalDate.setMonth(renewalDate.getMonth() + 1);

					const { error: upsertError } = await supabase
						.from("user_subscriptions")
						.upsert({
							user_id: userId,
							plan_name: planName,
							status: "active",
							payment_method: "Mercado Pago",
							renewal_date: renewalDate.toISOString(),
							updated_at: new Date().toISOString(),
						}, { onConflict: "user_id" });

					if (upsertError) {
						console.error("[MP Webhook] DB Error (payment):", upsertError);
						throw upsertError;
					}
					console.log(`[MP Webhook] Plan active for user ${userId} via single payment`);
				}
			}
		}

		return new Response(JSON.stringify({ received: true }), {
			headers: { ...corsHeaders, "Content-Type": "application/json" },
			status: 200,
		});
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
		console.error("[MP Webhook] Fatal Error:", errorMessage);
		return new Response(JSON.stringify({ error: errorMessage }), {
			headers: { ...corsHeaders, "Content-Type": "application/json" },
			status: 400,
		});
	}
});
