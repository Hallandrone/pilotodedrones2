/**
 * Webhook de Flow Payments - ACTIVO
 * Recibe notificaciones de Flow sobre cambios en suscripciones y pagos
 * Valida las firmas HMAC SHA-256 para asegurar la autenticidad de las notificaciones
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function toHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function signParams(secret: string, params: Record<string, string>): Promise<string> {
  // Según documentación de Flow: ordenar alfabéticamente y concatenar como "nombreParametro valor nombreParametro valor"
  const sortedEntries = Object.entries(params)
    .filter(([key]) => key !== 's')
    .sort(([a], [b]) => a.localeCompare(b));
  
  // Concatenar en formato: nombreParametro valor nombreParametro valor (sin separadores)
  const baseString = sortedEntries.map(([k, v]) => `${k}${v}`).join('');
  
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(baseString));
  return toHex(signature);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const flowSecretKey = Deno.env.get('FLOW_SECRET_KEY');
    if (!flowSecretKey) {
      return new Response(JSON.stringify({ error: 'Server missing FLOW_SECRET_KEY' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const contentType = req.headers.get('content-type') || '';
    let params: Record<string, string> = {};

    if (contentType.includes('application/json')) {
      const json = await req.json();
      params = Object.fromEntries(Object.entries(json).map(([k, v]) => [k, String(v)]));
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const text = await req.text();
      const usp = new URLSearchParams(text);
      usp.forEach((v, k) => { params[k] = v; });
    } else {
      // Default: try query params
      const url = new URL(req.url);
      url.searchParams.forEach((v, k) => { params[k] = v; });
    }

    const receivedSignature = params['s'] || '';
    const expectedSignature = await signParams(flowSecretKey, params);

    const valid = receivedSignature && receivedSignature.toLowerCase() === expectedSignature.toLowerCase();

    if (!valid) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Procesar eventos de suscripción
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      // Flow envía diferentes tipos de eventos
      const eventType = params['type'] || params['event'] || '';
      const subscriptionId = params['subscriptionId'] || params['subscription_id'] || '';
      const customerEmail = params['customerEmail'] || params['customer_email'] || '';
      const status = params['status'] || '';
      const planId = params['planId'] || params['plan_id'] || '';

      console.log('Flow webhook received:', { eventType, subscriptionId, customerEmail, status, planId });

      // Si es un evento de suscripción y tenemos el email del cliente
      if (subscriptionId && customerEmail && (eventType.includes('subscription') || subscriptionId)) {
        // Buscar usuario por email
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', customerEmail)
          .single();

        if (profile) {
          // Mapear estados de Flow a estados internos
          let dbStatus = 'pending';
          if (status === 'active' || status === 'Activa' || eventType.includes('activated')) {
            dbStatus = 'active';
          } else if (status === 'cancelled' || status === 'Cancelada' || eventType.includes('cancelled')) {
            dbStatus = 'cancelled';
          } else if (status === 'expired' || status === 'Expirada' || eventType.includes('expired')) {
            dbStatus = 'expired';
          }

          // Calcular fecha de renovación (si está disponible)
          const renewalDate = params['nextBillingDate'] || params['next_billing_date'] || null;

          // Actualizar o crear suscripción
          const { error: upsertError } = await supabase
            .from('user_subscriptions')
            .upsert({
              user_id: profile.id,
              plan_name: 'pro', // Por defecto, debería venir del planId
              status: dbStatus,
              renewal_date: renewalDate,
              payment_method: params['paymentMethod'] || params['payment_method'] || 'Tarjeta de Crédito',
              flow_subscription_id: subscriptionId,
              flow_plan_id: planId || null,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'user_id',
            });

          if (upsertError) {
            console.error('Error updating subscription:', upsertError);
          } else {
            console.log(`Subscription ${subscriptionId} updated with status: ${dbStatus}`);
          }
        } else {
          console.log(`Profile not found for email: ${customerEmail}`);
        }
      }
    }

    return new Response(JSON.stringify({ status: 'ok', received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});



