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

		if (type === "payment" && id) {
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
				// Mapear el item para obtener el nombre del plan
				const planItem = payment.additional_info?.items?.[0];
				const planId = planItem?.id;

				let planName = "profesional";
				if (planId === "empresa") {
					planName = "empresa";
				}

				// Actualizar la suscripción del usuario
				const { error: upsertError } = await supabase
					.from("user_subscriptions")
					.upsert({
						user_id: userId,
						plan_name: planName,
						status: "active",
						payment_method: "Mercado Pago",
						updated_at: new Date().toISOString(),
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

		return new Response(JSON.stringify({ received: true }), {
			headers: { ...corsHeaders, "Content-Type": "application/json" },
			status: 200,
		});
	} catch (error) {
		console.error("Webhook error:", error.message);
		return new Response(JSON.stringify({ error: error.message }), {
			headers: { ...corsHeaders, "Content-Type": "application/json" },
			status: 400,
		});
	}
});
