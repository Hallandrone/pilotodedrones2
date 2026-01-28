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

		// ========== NUEVA ACCIÓN: CREAR SUSCRIPCIÓN ==========
		if (action === "create_subscription") {
			const { planId, price, cardTokenId } = body;

			// Determinar precio: si es qrescueid@gmail.com, usar precio de prueba
			let finalPrice = price;
			if (user.email === "qrescueid@gmail.com") {
				finalPrice = 1500; // Precio de prueba
				console.log("🧪 Test mode activated for qrescueid@gmail.com - Price: $1,500");
			}

			// Determinar nombre del plan
			let planName = "Plan Profesional";
			if (planId === "empresa") {
				planName = "Plan Empresa";
			}

			// Crear suscripción (preapproval) en Mercado Pago CON CARD TOKEN (sin redirección)
			const origin = req.headers.get("origin") || "https://pilotodedrones.cl";
			const preapprovalData: any = {
				reason: `Suscripción ${planName} - Piloto de Drones`,
				auto_recurring: {
					frequency: 1,
					frequency_type: "months",
					transaction_amount: finalPrice,
					currency_id: "CLP",
				},
				// NO enviamos payer_email para permitir flexibilidad
				// El usuario puede pagar con cualquier cuenta de Mercado Pago
				external_reference: user.id,
				// No ponemos status en la creación - MP lo maneja automáticamente
			};

			// Si se proporciona cardTokenId, añadirlo (flujo sin redirección)
			if (cardTokenId) {
				preapprovalData.card_token_id = cardTokenId;
				preapprovalData.status = "authorized"; // REQUERIDO cuando usas card_token
			} else {
				// Flujo de redirección - requiere back_url
				preapprovalData.back_url = `${origin}/pilot/membership`;
			}

			console.log("Creating preapproval:", JSON.stringify(preapprovalData, null, 2));

			const response = await fetch("https://api.mercadopago.com/preapproval", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${mpAccessToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(preapprovalData),
			});

			const data = await response.json();
			console.log("Mercado Pago response:", JSON.stringify(data, null, 2));

			if (!response.ok) {
				console.error("Mercado Pago Subscription Error:", JSON.stringify(data, null, 2));
				// Devolver el error detallado de Mercado Pago
				return new Response(JSON.stringify({
					error: "MP_ERROR",
					message: data.message || "Error al crear la suscripción en Mercado Pago",
					full_response: data,
				}), {
					headers: { ...corsHeaders, "Content-Type": "application/json" },
					status: 400,
				});
			}

			// Validar que la suscripción fue creada
			if (data.status === "authorized" || data.status === "pending") {
				console.log(`Subscription ${data.id} created successfully with status: ${data.status}`);

				// Retornar la respuesta exitosa con el preapproval_id correcto
				// El init_point ya incluye automáticamente el ID en la URL de retorno
				return new Response(JSON.stringify({
					success: true,
					preapproval_id: data.id,
					status: data.status,
					init_point: cardTokenId ? null : data.init_point,
				}), {
					headers: { ...corsHeaders, "Content-Type": "application/json" },
					status: 200,
				});
			} else {
				return new Response(JSON.stringify({
					error: true,
					message: `La suscripción no fue autorizada. Estado: ${data.status}`,
					details: data,
				}), {
					headers: { ...corsHeaders, "Content-Type": "application/json" },
					status: 400,
				});
			}
		}

		// ========== ACCIÓN: CANCELAR SUSCRIPCIÓN ==========
		if (action === "cancel_subscription") {
			const { preapprovalId } = body;

			if (!preapprovalId) {
				throw new Error("preapprovalId is required");
			}

			const response = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
				method: "PUT",
				headers: {
					Authorization: `Bearer ${mpAccessToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					status: "cancelled",
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				console.error("Error cancelling subscription:", data);
				throw new Error(data.message || "Error al cancelar la suscripción");
			}

			return new Response(JSON.stringify({
				success: true,
				status: data.status,
			}), {
				headers: { ...corsHeaders, "Content-Type": "application/json" },
				status: 200,
			});
		}

		// ========== MANTENER COMPATIBILIDAD CON PAGOS ÚNICOS (LEGACY) ==========
		if (action === "process_payment") {
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
							id: formData.planId || "profesional",
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

			if (data.status !== "approved") {
				console.log(`Payment not approved. Status: ${data.status}, Status Detail: ${data.status_detail}`);
				let errorMessage = "El pago no fue aprobado.";

				if (data.status === "rejected") {
					errorMessage = "El pago fue rechazado. Por favor verifica tus datos e intenta nuevamente.";
				} else if (data.status === "pending") {
					errorMessage = "El pago está pendiente de aprobación.";
				} else if (data.status === "in_process") {
					errorMessage = "El pago está en proceso de validación.";
				}

				throw new Error(errorMessage);
			}

			return new Response(JSON.stringify({
				...data,
				success: true,
				status: data.status,
				status_detail: data.status_detail
			}), {
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
