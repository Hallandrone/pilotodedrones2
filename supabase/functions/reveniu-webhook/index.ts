import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const reveniuWebhookSecret = Deno.env.get('REVENIU_WEBHOOK_SECRET');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: 'Supabase environment misconfigured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Crear cliente con service role key para poder actualizar cualquier registro
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Obtener el webhook payload
    const payload = await req.json();
    
    // Validar webhook secret si está configurado
    // Reveniu envía el secret en el header 'Reveniu-Secret-Key'
    const webhookSignature = req.headers.get('reveniu-secret-key') || req.headers.get('Reveniu-Secret-Key') || '';
    if (reveniuWebhookSecret && webhookSignature) {
      if (webhookSignature !== reveniuWebhookSecret) {
        return new Response(JSON.stringify({ error: 'Invalid webhook signature' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Reveniu envía el objeto de suscripción directamente en el payload
    // Según documentación: el webhook contiene el objeto subscription completo
    const subscriptionData = payload.subscription || payload;
    const subscriptionId = subscriptionData.id || subscriptionData.sub_id;
    const status = subscriptionData.status; // Estado numérico según documentación de Reveniu

    console.log('Reveniu webhook received:', payload);

    if (!subscriptionId) {
      console.log('No subscription ID found in webhook payload');
      return new Response(JSON.stringify({ status: 'ok', message: 'No subscription ID' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Mapear estados de Reveniu a estados de nuestra base de datos
    // Estados según documentación: "Abandonada", "No iniciada", "On time", "Failed 1 time", "Failed 2 time", "Failed 3 time", "Failed", "Expired"
    let dbStatus = 'pending';
    if (status === 1 || status === 'On time' || subscriptionData.status_text === 'On time') {
      dbStatus = 'active';
    } else if (status === 2 || status === 'Failed' || subscriptionData.status_text?.includes('Failed')) {
      dbStatus = 'pending'; // Pago fallido, pero puede recuperarse
    } else if (status === 3 || status === 'Expired' || subscriptionData.status_text === 'Expired') {
      dbStatus = 'expired';
    } else if (status === 4 || status === 'Cancelled' || subscriptionData.status_text === 'Cancelled') {
      dbStatus = 'cancelled';
    }

    // Buscar usuario por email del cliente
    const customerEmail = subscriptionData.customer_email || subscriptionData.email;
    if (customerEmail) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', customerEmail)
        .single();

      if (profile) {
        // Calcular fecha de renovación (next_due_date o next_billing_date)
        const renewalDate = subscriptionData.next_due_date || 
                           subscriptionData.next_billing_date || 
                           subscriptionData.due_date || 
                           null;

        // Crear o actualizar suscripción
        const { error: upsertError } = await supabase
          .from('user_subscriptions')
          .upsert({
            user_id: profile.id,
            plan_name: subscriptionData.plan_name || 'basic',
            status: dbStatus,
            renewal_date: renewalDate,
            payment_method: subscriptionData.payment_method || 'Tarjeta de Crédito',
            reveniu_subscription_id: String(subscriptionId),
            reveniu_plan_id: subscriptionData.plan_id ? String(subscriptionData.plan_id) : null,
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

    return new Response(JSON.stringify({ status: 'ok', received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Webhook error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

