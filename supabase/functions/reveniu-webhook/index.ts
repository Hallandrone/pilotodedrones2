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
    const reveniuApiKey = Deno.env.get('REVENIU_API_KEY');
    const reveniuEnv = (Deno.env.get('REVENIU_ENV') || 'sandbox').toLowerCase();

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
    const webhookSignature = req.headers.get('reveniu-secret-key') || req.headers.get('Reveniu-Secret-Key') || '';
    if (reveniuWebhookSecret && webhookSignature) {
      if (webhookSignature !== reveniuWebhookSecret) {
        return new Response(JSON.stringify({ error: 'Invalid webhook signature' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    console.log('Reveniu webhook received:', JSON.stringify(payload, null, 2));

    // Reveniu envía el payload en formato: { "data": { "event": "...", "data": { "subscription_id": ..., "subscription_external_id": ... } } }
    const eventData = payload.data?.data || payload.data || payload;
    const eventType = payload.data?.event || payload.event || 'unknown';
    const subscriptionId = eventData.subscription_id || eventData.id || eventData.sub_id;
    const externalId = eventData.subscription_external_id || eventData.external_id;

    console.log(`Event type: ${eventType}, Subscription ID: ${subscriptionId}, External ID: ${externalId || 'null'}`);

    if (!subscriptionId) {
      console.log('No subscription ID found in webhook payload');
      return new Response(JSON.stringify({ status: 'ok', message: 'No subscription ID' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Mapear eventos a estados de base de datos
    let dbStatus = 'pending';
    if (eventType === 'subscription_activated' || eventType === 'subscription_payment_succeeded') {
      dbStatus = 'active';
    } else if (eventType === 'subscription_deactivated' || eventType === 'subscription_cancelled') {
      dbStatus = 'cancelled';
    } else if (eventType === 'subscription_expired') {
      dbStatus = 'expired';
    } else if (eventType === 'subscription_payment_failed') {
      dbStatus = 'pending'; // Pago fallido, pero puede recuperarse
    }

    console.log(`Mapped status: ${dbStatus}`);

    // Buscar usuario
    let profile = null;
    let customerEmail = null;

    // Estrategia 1: Si hay external_id, usarlo directamente (debería ser el user_id)
    if (externalId) {
      console.log(`Using external_id to find user: ${externalId}`);
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('id', externalId)
        .single();
      
      if (profileData) {
        profile = profileData;
        customerEmail = profileData.email;
        console.log(`Found user by external_id: ${profile.id}`);
      }
    }

    // Estrategia 2: Buscar por subscription_id en user_subscriptions si ya existe
    if (!profile) {
      console.log('No external_id, trying to find by subscription_id');
      const { data: existingSubscription } = await supabase
        .from('user_subscriptions')
        .select('user_id')
        .eq('reveniu_subscription_id', String(subscriptionId))
        .maybeSingle();

      if (existingSubscription) {
        console.log(`Found existing subscription for user: ${existingSubscription.user_id}`);
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, email')
          .eq('id', existingSubscription.user_id)
          .single();
        
        if (profileData) {
          profile = profileData;
          customerEmail = profileData.email;
          console.log(`Found user by existing subscription: ${profile.id}`);
        }
      }
    }

    // Estrategia 3: Si no encontramos al usuario, intentar obtener datos de la API de Reveniu
    if (!profile && reveniuApiKey) {
      console.log('Trying to find user with pending subscription');
      try {
        const reveniuBaseUrl = reveniuEnv === 'production' 
          ? 'https://production.reveniu.com'
          : 'https://sandbox.reveniu.com';
        
        const apiUrl = `${reveniuBaseUrl}/api/v1/subscriptions/${subscriptionId}`;
        const apiResponse = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Reveniu-Secret-Key': reveniuApiKey,
          },
        });

        if (apiResponse.ok) {
          const subscriptionData = await apiResponse.json();
          const subscription = subscriptionData.subscription || subscriptionData;
          customerEmail = subscription.customer_email || subscription.email;
          
          console.log(`Got customer email from API: ${customerEmail}`);

          if (customerEmail) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('id, email')
              .eq('email', customerEmail)
              .single();

            if (profileData) {
              profile = profileData;
              console.log(`Found user by email from API: ${profile.id}`);
            }
          }
        }
      } catch (apiError) {
        console.error('Error calling Reveniu API:', apiError);
      }
    }

    if (!profile) {
      console.log('Could not find user to update subscription');
      return new Response(JSON.stringify({ 
        status: 'ok', 
        message: 'User not found',
        subscription_id: subscriptionId 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calcular fecha de renovación (si está disponible en el evento)
    const renewalDate = eventData.next_due_date || 
                       eventData.next_billing_date || 
                       eventData.due_date || 
                       null;

    // Determinar el nombre del plan
    // Por defecto, si es el plan de 14.990, es 'profesional'
    let planName = 'profesional'; // Default para el plan de 14.990
    if (eventData.plan_id || eventData.plan_name) {
      // Aquí podrías mapear plan_id a plan_name si tienes esa información
      planName = eventData.plan_name || 'profesional';
    }

    // Crear o actualizar suscripción
    const { error: upsertError } = await supabase
      .from('user_subscriptions')
      .upsert({
        user_id: profile.id,
        plan_name: planName,
        status: dbStatus,
        renewal_date: renewalDate,
        payment_method: eventData.payment_method || 'Tarjeta de Crédito',
        reveniu_subscription_id: String(subscriptionId),
        reveniu_plan_id: eventData.plan_id ? String(eventData.plan_id) : null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (upsertError) {
      console.error('Error updating subscription:', upsertError);
      return new Response(JSON.stringify({ 
        status: 'error', 
        message: upsertError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Subscription ${subscriptionId} updated with status: ${dbStatus} for user: ${profile.id}`);

    return new Response(JSON.stringify({ 
      status: 'ok', 
      received: true,
      subscription_id: subscriptionId,
      user_id: profile.id,
      status: dbStatus
    }), {
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
