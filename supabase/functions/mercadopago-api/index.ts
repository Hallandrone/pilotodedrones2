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

		const { planId, planName, price } = await req.json();

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
			external_reference: user.id, // Importante para identificar al usuario en el webhook
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

		if (!response.ok) {
			throw new Error(data.message || "Error al crear la preferencia");
		}

		return new Response(JSON.stringify({ id: data.id, init_point: data.init_point }), {
			headers: { ...corsHeaders, "Content-Type": "application/json" },
			status: 200,
		});
	} catch (error) {
		return new Response(JSON.stringify({ error: error.message }), {
			headers: { ...corsHeaders, "Content-Type": "application/json" },
			status: 400,
		});
	}
});
