import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
	"Access-Control-Allow-Origin": "https://app.pilotodedrones.cl",
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
		const mpWebhookSecret = Deno.env.get("MERCADOPAGO_WEBHOOK_SECRET");

		// Validar firma HMAC-SHA256 de MercadoPago
		if (mpWebhookSecret) {
			const xSignature = req.headers.get("x-signature");
			const xRequestId = req.headers.get("x-request-id") ?? "";
			const reqUrl = new URL(req.url);
			const dataId = reqUrl.searchParams.get("data.id") ?? reqUrl.searchParams.get("id") ?? "";

			if (!xSignature) {
				return new Response(JSON.stringify({ error: "Missing signature" }), {
					headers: { ...corsHeaders, "Content-Type": "application/json" },
					status: 401,
				});
			}

			const parts = Object.fromEntries(xSignature.split(",").map(p => p.split("=")));
			const ts = parts["ts"] ?? "";
			const v1 = parts["v1"] ?? "";
			const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
			const encoder = new TextEncoder();
			const key = await crypto.subtle.importKey(
				"raw", encoder.encode(mpWebhookSecret),
				{ name: "HMAC", hash: "SHA-256" }, false, ["sign"]
			);
			const sigBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(manifest));
			const computed = Array.from(new Uint8Array(sigBytes)).map(b => b.toString(16).padStart(2, "0")).join("");

			if (computed !== v1) {
				console.warn("[MP Webhook] Invalid signature rejected");
				return new Response(JSON.stringify({ error: "Invalid signature" }), {
					headers: { ...corsHeaders, "Content-Type": "application/json" },
					status: 401,
				});
			}
		}

		const supabase = createClient(supabaseUrl, supabaseServiceKey);

		// 1. Obtener datos del evento (IPN o Webhook JSON)
		const url = new URL(req.url);
		let id = url.searchParams.get("data.id") || url.searchParams.get("id");
		let type = url.searchParams.get("type") || url.searchParams.get("topic");

		if (!id || !type) {
			try {
				const body = await req.json();
				console.log(`[MP Webhook] JSON Body Received:`, JSON.stringify(body));
				if (body.data?.id) id = body.data.id;
				else if (body.id) id = body.id;
				if (body.type) type = body.type;
				else if (body.topic) type = body.topic;
			} catch (_) { /* No body or non-JSON */ }
		}

		console.log(`[MP Webhook] Processing Event -> Type: ${type}, ID: ${id}`);

		if (!id || !type) {
			return new Response(JSON.stringify({ received: true, skipped: true }), {
				headers: { ...corsHeaders, "Content-Type": "application/json" },
				status: 200,
			});
		}

		// ========== MANEJO DE SUSCRIPCIONES (PREAPPROVAL) ==========
		if (type === "subscription_preapproval" || type === "preapproval") {
			const response = await fetch(`https://api.mercadopago.com/preapproval/${id}`, {
				headers: { Authorization: `Bearer ${mpAccessToken}` },
			});

			if (!response.ok) throw new Error(`Error fetching preapproval ${id}: ${await response.text()}`);

			const sub = await response.json();
			const userId = sub.external_reference;
			const mpStatus = sub.status; // authorized, paused, cancelled, pending
			const nextPaymentDate = sub.next_payment_date;

			console.log(`[MP Webhook] Sub ${id} | MP Status: ${mpStatus} | User: ${userId}`);

			if (userId) {
				// Mapeo de estados para suscripción
				// Estricto: 'authorized' no es activo hasta que llegue el pago 'approved'
				let dbStatus = "inactive";
				if (mpStatus === "authorized") dbStatus = "pending_payment";
				else if (mpStatus === "paused") dbStatus = "paused";
				else if (mpStatus === "cancelled") dbStatus = "cancelled";
				else if (mpStatus === "pending") dbStatus = "pending_payment";

				const amount = sub.auto_recurring?.transaction_amount || 0;
				const planName = amount >= 30000 ? "empresa" : "profesional";

				const { error: upsertError } = await supabase
					.from("user_subscriptions")
					.upsert({
						user_id: userId,
						plan_name: planName,
						status: dbStatus,
						payment_method: "Mercado Pago Subscription",
						renewal_date: nextPaymentDate,
						updated_at: new Date().toISOString(),
						reveniu_subscription_id: id,
					}, { onConflict: "user_id" });

				if (upsertError) console.error("[MP Webhook] DB Error (Sub):", upsertError);
			}
		}

		// ========== MANEJO DE PAGOS (PAYMENT) ==========
		if (type === "payment") {
			const response = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
				headers: { Authorization: `Bearer ${mpAccessToken}` },
			});

			if (!response.ok) throw new Error(`Error fetching payment ${id}: ${await response.text()}`);

			const payment = await response.json();
			const userId = payment.external_reference;
			const mpStatus = payment.status;
			// approved, authorized, in_process, pending, rejected, cancelled, refunded, charged_back

			console.log(`[MP Webhook] Payment ${id} | MP Status: ${mpStatus} | User: ${userId}`);

			if (userId) {
				if (mpStatus === "approved") {
					// REGLA DE ORO: Solo activamos si el pago es 'approved'
					const planItem = payment.additional_info?.items?.[0];
					const planName = (planItem?.id === "empresa" || payment.transaction_amount >= 30000) ? "empresa" : "profesional";

					const updateData: any = {
						user_id: userId,
						status: "active",
						updated_at: new Date().toISOString(),
					};

					// Lógica de Pago Único (Débito) vs Suscripción (Crédito)
					if (!payment.preapproval_id) {
						// PAGO ÚNICO: Activar por 30 días exactos
						console.log(`[MP Webhook] Single payment detected for user ${userId}. Setting 30 days active period.`);
						updateData.plan_name = planName;
						updateData.payment_method = "Mercado Pago Single (Debit/Refill)";
						const expirationDate = new Date();
						expirationDate.setDate(expirationDate.getDate() + 30);
						updateData.renewal_date = expirationDate.toISOString();
					} else {
						// PAGO DE SUSCRIPCIÓN: Solo confirmar activación
						console.log(`[MP Webhook] Subscription payment approved for user ${userId}.`);
						updateData.payment_method = "Mercado Pago Subscription (Credit)";
						// La fecha de renovación ya la maneja el evento 'preapproval'
					}

					const { error } = await supabase
						.from("user_subscriptions")
						.upsert(updateData, { onConflict: "user_id" });

					if (error) console.error("[MP Webhook] DB Error (Payment Approved):", error);
					else console.log(`[MP Webhook] ACTIVATION SUCCESS -> User: ${userId} is now ACTIVE`);
				}
				else if (["rejected", "cancelled", "refunded", "charged_back"].includes(mpStatus)) {
					// Desactivación inmediata por pago fallido o devuelto
					console.warn(`[MP Webhook] Payment ${mpStatus}. Deactivating user ${userId}.`);

					const { error } = await supabase
						.from("user_subscriptions")
						.update({
							status: "inactive",
							updated_at: new Date().toISOString(),
						})
						.eq("user_id", userId);

					if (error) console.error("[MP Webhook] DB Error (Payment Negative):", error);
				}
				else if (["pending", "in_process", "authorized", "in_mediation"].includes(mpStatus)) {
					// Mantener como pendiente si aún no es approved. NUNCA activar aquí.
					console.log(`[MP Webhook] Payment ${mpStatus}. Keeping status as pending_payment for user ${userId}.`);
					await supabase
						.from("user_subscriptions")
						.update({
							status: "pending_payment",
							updated_at: new Date().toISOString(),
						})
						.eq("user_id", userId);
				}
			}
		}

		return new Response(JSON.stringify({ received: true }), {
			headers: { ...corsHeaders, "Content-Type": "application/json" },
			status: 200,
		});
	} catch (error) {
		const msg = error instanceof Error ? error.message : 'Unknown error';
		console.error("[MP Webhook] Fatal Error:", msg);
		return new Response(JSON.stringify({ error: msg }), {
			headers: { ...corsHeaders, "Content-Type": "application/json" },
			status: 400,
		});
	}
});
