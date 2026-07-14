// ============================================================================
// mercadopago-api — Edge Function
// ----------------------------------------------------------------------------
// CAMBIO DE MODELO (2026): el "Plan Alumno Academia" (ex Plan Profesional /
// Plan Empresa) ya NO se vende. Es exclusivo para alumnos de Academia Drone
// Chile y se activa únicamente con el código de diploma vía la RPC
// claim_diploma_code. Toda la venta por Mercado Pago fue eliminada del
// frontend.
//
// Por seguridad, las acciones que creaban cobros reales (create_subscription,
// process_payment) o que activaban el plan por polling (verify_subscription)
// quedan NEUTRALIZADAS: responden HTTP 410 (Gone) sin llamar a Mercado Pago ni
// escribir en la base de datos. Antes, al recibir price/formData desde el
// cliente, cualquier usuario autenticado podía autoactivarse el plan pagando
// un monto arbitrario directo a esta API; eso ya no es posible.
//
// Se mantiene cancel_subscription porque es inofensiva: solo cancela
// preapprovals en Mercado Pago y no activa ningún plan.
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
	"Access-Control-Allow-Origin": "https://app.pilotodedrones.cl",
	"Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SALES_DISABLED_BODY = {
	error: "SALES_DISABLED",
	message: "La venta de planes fue descontinuada. El Plan Alumno Academia se activa con el código de tu diploma.",
};

Deno.serve(async (req) => {
	if (req.method === "OPTIONS") {
		return new Response("ok", { headers: corsHeaders });
	}

	try {
		const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
		const mpAccessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN")!;

		const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
			global: { headers: { Authorization: req.headers.get("Authorization")! } },
		});

		const { data: { user }, error: authError } = await supabase.auth.getUser();
		if (authError || !user) throw new Error("Unauthorized");

		const body = await req.json();
		const { action } = body;

		// ========== ACCIONES DE VENTA NEUTRALIZADAS ==========
		// create_subscription / process_payment / verify_subscription ya no
		// crean cobros ni activan planes. Ver comentario de cabecera.
		if (
			action === "create_subscription" ||
			action === "process_payment" ||
			action === "verify_subscription"
		) {
			return new Response(JSON.stringify(SALES_DISABLED_BODY), {
				headers: { ...corsHeaders, "Content-Type": "application/json" },
				status: 410,
			});
		}

		// ========== ACCIÓN: CANCELAR SUSCRIPCIÓN ==========
		// Inofensiva: solo cancela un preapproval en Mercado Pago.
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
