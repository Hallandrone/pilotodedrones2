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
		const mpAccessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN")!;
		const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

		const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
			global: { headers: { Authorization: req.headers.get("Authorization")! } },
		});

		const { data: { user }, error: authError } = await supabase.auth.getUser();
		if (authError || !user) throw new Error("Unauthorized");

		const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
			auth: { persistSession: false }
		});

		const body = await req.json();
		const { action } = body;

		// ========== ACCIÓN: CREAR SUSCRIPCIÓN (Redirect o Bricks) ==========
		if (action === "create_subscription") {
			const { planId, price, cardTokenId, payerEmail } = body;
			const finalPrice = user.email === "qrescueid@gmail.com" ? 1500 : price;
			const planName = planId === "empresa" ? "Plan Empresa" : "Plan Profesional";
			const origin = req.headers.get("origin") || "https://pilotodedrones.cl";

			const preapprovalData: any = {
				reason: `Suscripción ${planName} - Piloto de Drones`,
				auto_recurring: {
					frequency: 1,
					frequency_type: "months",
					transaction_amount: finalPrice,
					currency_id: "CLP",
				},
				payer_email: payerEmail || user.email,
				external_reference: user.id,
				back_url: `${origin}/pilot/membership?success=true`,
				notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook`,
			};

			// Si viene un cardTokenId (desde Bricks), intentamos procesamiento directo
			if (cardTokenId) {
				preapprovalData.card_token_id = cardTokenId;
				preapprovalData.status = "authorized";
			}

			console.log(`[MP API] Creating preapproval for ${user.email} (${planId})`);

			const response = await fetch("https://api.mercadopago.com/preapproval", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${mpAccessToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(preapprovalData),
			});

			const data = await response.json();

			if (!response.ok) {
				console.error("[MP API] MP Subscription Error:", data);
				return new Response(JSON.stringify({ error: "MP_ERROR", message: data.message, details: data }), {
					headers: { ...corsHeaders, "Content-Type": "application/json" },
					status: 400,
				});
			}

			// Si fue exitoso e inicialmente autorizado, marcamos como PENDING_PAYMENT
			// La activación real (status: active) SOLO la hará el webhook al ver el pago aprobado.
			if (data.status === "authorized" || data.status === "pending") {
				await supabaseAdmin
					.from("user_subscriptions")
					.upsert({
						user_id: user.id,
						status: "pending_payment",
						plan_name: planId === "empresa" ? "empresa" : "profesional",
						updated_at: new Date().toISOString(),
						reveniu_subscription_id: data.id,
						payment_method: "Mercado Pago Bricks"
					}, { onConflict: "user_id" });

				return new Response(JSON.stringify({
					success: true,
					preapproval_id: data.id,
					status: data.status,
				}), {
					headers: { ...corsHeaders, "Content-Type": "application/json" },
					status: 200,
				});
			}

			return new Response(JSON.stringify({
				success: data.status === "pending" || data.status === "authorized",
				preapproval_id: data.id,
				status: data.status,
				init_point: data.init_point,
			}), {
				headers: { ...corsHeaders, "Content-Type": "application/json" },
				status: 200,
			});
		}

		// ========== ACCIÓN: PROCESAR PAGO MANUAL (Vía Bricks Payment) ==========
		if (action === "process_payment") {
			const { formData, planId } = body;

			const paymentData = {
				...formData,
				external_reference: user.id,
				notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook`,
			};

			console.log(`[MP API] Processing payment for ${user.email} - Plan: ${planId}`);

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
				throw new Error(data.message || "Error al procesar el pago");
			}

			// NO ACTIVAR AQUÍ. Solo marcar como pendiente si el pago está en proceso.
			// La activación real la hará el webhook al confirmar 'approved'.
			if ((data.status === "approved" || data.status === "in_process" || data.status === "pending") && planId) {
				console.log(`[MP API] Payment initiated (${data.status}), setting status to pending_payment`);
				await supabaseAdmin
					.from("user_subscriptions")
					.upsert({
						user_id: user.id,
						status: "pending_payment",
						plan_name: planId === "empresa" ? "empresa" : "profesional",
						updated_at: new Date().toISOString(),
						payment_method: "Mercado Pago Bricks"
					}, { onConflict: "user_id" });
			}

			const isSuccessful = data.status === "approved" || data.status === "authorized" || data.status === "in_process";

			return new Response(JSON.stringify({
				success: isSuccessful && !data.error,
				status: data.status,
				status_detail: data.status_detail,
				id: data.id,
				message: data.message || (data.status === 'rejected' ? 'Pago rechazado por el banco' : null)
			}), {
				headers: { ...corsHeaders, "Content-Type": "application/json" },
				status: 200,
			});
		}

		// ========== ACCIÓN: VERIFICAR SUSCRIPCIÓN (Polling Fallback) ==========
		if (action === "verify_subscription") {
			const { preapproval_id } = body;
			const response = await fetch(`https://api.mercadopago.com/preapproval/${preapproval_id}`, {
				headers: { Authorization: `Bearer ${mpAccessToken}` },
			});
			const data = await response.json();

			if (data.status === "authorized" || data.status === "active") {
				const planName = data.auto_recurring.transaction_amount >= 30000 ? "empresa" : "profesional";
				const renewalDate = new Date();
				renewalDate.setMonth(renewalDate.getMonth() + 1);

				await supabaseAdmin
					.from("user_subscriptions")
					.upsert({
						user_id: user.id,
						status: "active",
						plan_name: planName,
						renewal_date: renewalDate.toISOString(),
						updated_at: new Date().toISOString(),
						reveniu_subscription_id: preapproval_id
					}, { onConflict: "user_id" });

				return new Response(JSON.stringify({ success: true, status: data.status }), {
					headers: { ...corsHeaders, "Content-Type": "application/json" }
				});
			}

			return new Response(JSON.stringify({ success: false, status: data.status }), {
				headers: { ...corsHeaders, "Content-Type": "application/json" }
			});
		}

		// ========== ACCIÓN: CANCELAR SUSCRIPCIÓN ==========
		if (action === "cancel_subscription") {
			const { preapprovalId } = body;
			const response = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
				method: "PUT",
				headers: {
					Authorization: `Bearer ${mpAccessToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ status: "cancelled" }),
			});

			const data = await response.json();
			if (!response.ok) throw new Error(data.message || "Error al cancelar");

			return new Response(JSON.stringify({ success: true, status: data.status }), {
				headers: { ...corsHeaders, "Content-Type": "application/json" }
			});
		}

		throw new Error("Acción no válida");

	} catch (error) {
		console.error("[MP API] Error:", error.message);
		return new Response(JSON.stringify({ error: error.message }), {
			headers: { ...corsHeaders, "Content-Type": "application/json" },
			status: 400,
		});
	}
});
